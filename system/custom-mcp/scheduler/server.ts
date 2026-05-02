#!/usr/bin/env bun
/**
 * Scheduler HTTP MCP daemon
 *
 * Persistent singleton process (launchd-managed) that:
 * 1. Maintains a persistent on-disk job store (jobs.json) — cron + one-shot schedules
 * 2. Exposes a Streamable HTTP MCP endpoint at /mcp for job CRUD tools
 * 3. Fires jobs on schedule and delivers them via either:
 *      - "notify" — pushes notifications/claude/channel into subscribed Claude Code sessions
 *      - "spawn"  — runs `claude -p "<prompt>"` as a fresh, unattended one-shot
 *
 * Modeled after the BlueBubbles channel daemon — same MCP transport, same notification
 * shape, same launchd lifecycle. The only architectural differences:
 *   - No external webhook; the cron loop is the event source.
 *   - Filtering is by tag (job.tags vs session subscribe=tag,tag) rather than chat GUID.
 *
 * Endpoints (all on 127.0.0.1:SCHEDULER_HTTP_PORT):
 *   /mcp                Streamable HTTP MCP — session subscription via query params:
 *                          ?subscribe=tag1,tag2   only receive notify-jobs tagged with
 *                                                 at least one of these tags
 *                          (no param = subscribe to all notify-jobs)
 *   /health             JSON health: { jobs, tickIntervalMs, sessions, ... }
 *
 * Config (env vars):
 *   SCHEDULER_HTTP_PORT      HTTP listen port           (default: 47240)
 *   SCHEDULER_TICK_MS        Tick interval ms           (default: 1000)
 *   SCHEDULER_DEFAULT_TZ     Default timezone for cron  (default: BRAIN_DEFAULT_TIMEZONE or America/Vancouver)
 *   BRAIN_DEFAULT_TIMEZONE   Shared fallback timezone   (default: America/Vancouver)
 *   BRAIN_ROOT               Brain repo root            (default: $HOME/Developer/brain)
 *   CLAUDE_BIN               Path to claude CLI binary  (default: $HOME/.local/bin/claude)
 *   SCHEDULER_DEFAULT_CWD    Default cwd for spawn jobs (default: BRAIN_ROOT)
 *
 * MCP registration (Claude Code) — in claude.json mcpServers:
 *   "scheduler": { "type": "http", "url": "http://127.0.0.1:47240/mcp" }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from 'crypto'
import { spawn } from 'child_process'
import { readFileSync, writeFileSync, renameSync, mkdirSync, appendFileSync, statSync, readdirSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import http from 'node:http'
import cronParser from 'cron-parser'

// --- Config ------------------------------------------------------------------

const SCHEDULER_HTTP_PORT = parseInt(process.env.SCHEDULER_HTTP_PORT ?? '47240')
const SCHEDULER_TICK_MS = parseInt(process.env.SCHEDULER_TICK_MS ?? '1000')
const SCHEDULER_DEFAULT_TZ = process.env.SCHEDULER_DEFAULT_TZ ?? process.env.BRAIN_DEFAULT_TIMEZONE ?? 'America/Vancouver'
const BRAIN_ROOT = process.env.BRAIN_ROOT ?? join(homedir(), 'Developer/brain')
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? join(homedir(), '.local/bin/claude')
const SCHEDULER_DEFAULT_CWD = process.env.SCHEDULER_DEFAULT_CWD ?? BRAIN_ROOT

const JOBS_FILE = join(import.meta.dirname, 'jobs.json')
const RUNS_DIR = join(import.meta.dirname, 'runs')
mkdirSync(RUNS_DIR, { recursive: true })

// --- Logger ------------------------------------------------------------------

const LOG_DIR = join(import.meta.dirname, 'logs')
const LOG_FILE = join(LOG_DIR, 'server.log')
const LOG_MAX_BYTES = 5 * 1024 * 1024

mkdirSync(LOG_DIR, { recursive: true })

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...data })
  try {
    if (statSync(LOG_FILE).size > LOG_MAX_BYTES) {
      renameSync(LOG_FILE, LOG_FILE.replace('.log', '.old.log'))
    }
  } catch { /* file not yet created */ }
  try { appendFileSync(LOG_FILE, line + '\n') } catch { /* disk full / permissions */ }
  process.stderr.write(`[${level.toUpperCase()}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}\n`)
}

const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
  info:  (msg: string, data?: Record<string, unknown>) => log('info',  msg, data),
  warn:  (msg: string, data?: Record<string, unknown>) => log('warn',  msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
}

process.on('unhandledRejection', err =>
  logger.error('unhandled rejection', { err: String(err) }))
process.on('uncaughtException', err =>
  logger.error('uncaught exception', { err: String(err) }))

// --- Runtime PATH augmentation -----------------------------------------------
// launchd doesn't source .zshrc; ensure spawned `claude` can find node, brain, etc.
try {
  const nvmVersionsDir = join(homedir(), '.nvm/versions/node')
  const versions = readdirSync(nvmVersionsDir)
    .filter(v => v.startsWith('v'))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))
  if (versions.length > 0) {
    const nodeBinDir = join(nvmVersionsDir, versions[0], 'bin')
    process.env.PATH = `${nodeBinDir}:${process.env.PATH ?? ''}`
  }
} catch { /* nvm not present — fine */ }

const EXTRA_PATHS = [
  join(homedir(), '.local/bin'),
  join(homedir(), '.bun/bin'),
  join(BRAIN_ROOT, 'cli/bin'),
  '/opt/homebrew/bin',
  '/usr/local/bin',
]
for (const p of EXTRA_PATHS) {
  if (!process.env.PATH?.split(':').includes(p)) {
    process.env.PATH = `${p}:${process.env.PATH ?? ''}`
  }
}

// --- Job schema --------------------------------------------------------------

interface CronSchedule {
  kind: 'cron'
  expr: string         // standard 5-field cron: "min hr dom mon dow"
  tz?: string          // IANA TZ; defaults to SCHEDULER_DEFAULT_TZ
}

interface OnceSchedule {
  kind: 'once'
  at: string           // ISO 8601 timestamp; deleted on success, disabled on failure
}

type ScheduleSpec = CronSchedule | OnceSchedule

interface JobState {
  lastRunAtMs?: number
  lastRunStatus?: 'ok' | 'error' | 'timeout'
  lastRunDurationMs?: number
  lastError?: string
  nextRunAtMs?: number
  runCount: number
}

interface Job {
  id: string
  name: string
  description?: string
  enabled: boolean
  schedule: ScheduleSpec
  prompt: string
  delivery: 'notify' | 'spawn'
  spawnArgs?: string[]      // extra CLI flags appended to `claude -p <prompt>`
  spawnCwd?: string         // working dir for spawn mode
  spawnModel?: string       // --model <name>; required when delivery==='spawn' (validated at create/update time)
  spawnTimeoutMs?: number   // kill after this long (default 600_000 = 10min)
  spawnMcpConfig?: string   // optional --mcp-config value (JSON string or path). When set, paired with --strict-mcp-config and overrides the user's normal MCP config.
  tags?: string[]           // for notify-mode session filtering + listing
  state: JobState
  createdAtMs: number
  updatedAtMs: number
}

interface JobsFile {
  version: 1
  jobs: Job[]
}

// --- Job store (atomic load/save) --------------------------------------------

function loadJobs(): Job[] {
  try {
    if (!existsSync(JOBS_FILE)) {
      writeJobs([])
      return []
    }
    const raw = readFileSync(JOBS_FILE, 'utf8')
    const parsed = JSON.parse(raw) as JobsFile
    if (parsed.version !== 1) {
      logger.warn('jobs.json version mismatch — starting fresh', { found: parsed.version })
      return []
    }
    return parsed.jobs ?? []
  } catch (err) {
    logger.error('failed to load jobs.json', { err: String(err) })
    return []
  }
}

function writeJobs(jobs: Job[]): void {
  const tmp = JOBS_FILE + '.tmp'
  const body: JobsFile = { version: 1, jobs }
  writeFileSync(tmp, JSON.stringify(body, null, 2) + '\n', { mode: 0o600 })
  renameSync(tmp, JOBS_FILE)
}

let JOBS: Job[] = loadJobs()

function persist(): void {
  writeJobs(JOBS)
}

function findJob(id: string): Job | undefined {
  return JOBS.find(j => j.id === id)
}

// --- Cron / schedule helpers -------------------------------------------------

function computeNextRunMs(schedule: ScheduleSpec, fromMs: number): number | null {
  if (schedule.kind === 'once') {
    const t = Date.parse(schedule.at)
    if (isNaN(t)) return null
    return t > fromMs ? t : null  // already past → no future run
  }
  try {
    const it = cronParser.parseExpression(schedule.expr, {
      currentDate: new Date(fromMs),
      tz: schedule.tz ?? SCHEDULER_DEFAULT_TZ,
    })
    return it.next().getTime()
  } catch (err) {
    logger.warn('cron parse failed', { expr: schedule.expr, err: String(err) })
    return null
  }
}

function refreshNextRun(job: Job, fromMs: number = Date.now()): void {
  if (!job.enabled) {
    job.state.nextRunAtMs = undefined
    return
  }
  const next = computeNextRunMs(job.schedule, fromMs)
  job.state.nextRunAtMs = next ?? undefined
}

// --- Tag filter parsing ------------------------------------------------------

interface SessionFilter {
  subscribeTags: Set<string> | null  // null = subscribe to everything
}

function parseRawQueryParams(search: string): Record<string, string> {
  const params: Record<string, string> = {}
  if (!search || search === '?') return params
  const qs = search.startsWith('?') ? search.slice(1) : search
  for (const pair of qs.split('&')) {
    const eq = pair.indexOf('=')
    if (eq < 0) continue
    const key = decodeURIComponent(pair.slice(0, eq))
    const value = decodeURIComponent(pair.slice(eq + 1))
    params[key] = value
  }
  return params
}

function parseFilter(url: URL): SessionFilter {
  const params = parseRawQueryParams(url.search)
  const sub = params['subscribe']
  if (!sub) return { subscribeTags: null }
  const tags = sub.split(',').map(s => s.trim()).filter(Boolean)
  return { subscribeTags: tags.length > 0 ? new Set(tags) : null }
}

function jobMatchesFilter(job: Job, filter: SessionFilter): boolean {
  if (filter.subscribeTags === null) return true
  const tags = job.tags ?? []
  if (tags.length === 0) return true  // untagged jobs broadcast to all subscribers
  return tags.some(t => filter.subscribeTags!.has(t))
}

// --- Per-session tracking + notification routing -----------------------------

interface SessionState {
  transport: StreamableHTTPServerTransport
  server: Server
  filter: SessionFilter
  filterDesc: string
}
const sessions = new Map<string, SessionState>()

function notifyJob(job: Job, firedAtMs: number): number {
  let delivered = 0
  for (const [sid, session] of sessions) {
    if (!jobMatchesFilter(job, session.filter)) continue
    const meta: Record<string, string> = {
      source: 'scheduler',
      job_id: job.id,
      job_name: job.name,
      kind: job.schedule.kind,
      fired_at: new Date(firedAtMs).toISOString(),
    }
    if (job.tags?.length) meta.tags = job.tags.join(',')
    session.transport.send({
      jsonrpc: '2.0',
      method: 'notifications/claude/channel',
      params: { content: job.prompt, meta },
    } as any).catch(err => {
      logger.error('notify error', { sid, jobId: job.id, err: String(err) })
    })
    delivered++
  }
  return delivered
}

function closeSession(sid: string, reason: string): void {
  const session = sessions.get(sid)
  if (!session) return
  sessions.delete(sid)
  try { session.transport.close() } catch {}
  logger.info('session closed', { sid, filter: session.filterDesc, reason, activeSessions: sessions.size })
}

// --- Spawn-mode delivery -----------------------------------------------------

function spawnJob(job: Job, firedAtMs: number): Promise<{ status: 'ok' | 'error' | 'timeout'; durationMs: number; error?: string }> {
  return new Promise(resolve => {
    const startMs = Date.now()
    if (!job.spawnModel) {
      const durationMs = Date.now() - startMs
      const error = 'spawnModel is required for delivery="spawn"'
      logger.error('spawn missing model', { jobId: job.id })
      resolve({ status: 'error', durationMs, error })
      return
    }

    const args = ['-p', job.prompt, '--dangerously-skip-permissions', '--model', job.spawnModel]
    // Use the user's normal MCP config by default (so spawned jobs see the same servers
    // an interactive session would). Override only when the job explicitly pins a config.
    if (job.spawnMcpConfig) {
      args.push('--strict-mcp-config', '--mcp-config', job.spawnMcpConfig)
    }
    if (job.spawnArgs?.length) args.push(...job.spawnArgs)

    const cwd = job.spawnCwd ?? SCHEDULER_DEFAULT_CWD
    const runLog = join(RUNS_DIR, `${job.id}-${firedAtMs}.log`)
    const timeoutMs = job.spawnTimeoutMs ?? 600_000

    let child
    try {
      child = spawn(CLAUDE_BIN, args, {
        cwd,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (err) {
      const durationMs = Date.now() - startMs
      logger.error('spawn launch failed', { jobId: job.id, err: String(err) })
      resolve({ status: 'error', durationMs, error: String(err) })
      return
    }

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      try { child.kill('SIGTERM') } catch {}
      setTimeout(() => { try { child.kill('SIGKILL') } catch {} }, 5_000)
    }, timeoutMs)

    let stdoutBuf = ''
    let stderrBuf = ''
    const MAX_BUF = 256 * 1024
    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdoutBuf.length < MAX_BUF) stdoutBuf += chunk.toString('utf8').slice(0, MAX_BUF - stdoutBuf.length)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderrBuf.length < MAX_BUF) stderrBuf += chunk.toString('utf8').slice(0, MAX_BUF - stderrBuf.length)
    })

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      const durationMs = Date.now() - startMs
      try {
        appendFileSync(runLog, `=== Job ${job.name} (${job.id}) at ${new Date(firedAtMs).toISOString()} ===\n` +
          `Exit: code=${code} signal=${signal} duration=${durationMs}ms\n` +
          `--- STDOUT ---\n${stdoutBuf}\n--- STDERR ---\n${stderrBuf}\n`)
      } catch {}

      if (timedOut) {
        resolve({ status: 'timeout', durationMs, error: `killed after ${timeoutMs}ms` })
      } else if (code === 0) {
        resolve({ status: 'ok', durationMs })
      } else {
        const errPreview = (stderrBuf || stdoutBuf || '').slice(0, 500)
        resolve({ status: 'error', durationMs, error: `exit=${code} signal=${signal} ${errPreview}` })
      }
    })

    child.on('error', err => {
      clearTimeout(timer)
      const durationMs = Date.now() - startMs
      resolve({ status: 'error', durationMs, error: String(err) })
    })
  })
}

// --- Fire dispatcher ---------------------------------------------------------

async function fireJob(job: Job, firedAtMs: number): Promise<void> {
  job.state.lastRunAtMs = firedAtMs
  job.state.runCount = (job.state.runCount ?? 0) + 1

  // Claim the job synchronously *before* any await — otherwise the 1s tick loop
  // re-fires it every interval until the in-flight spawn finally completes.
  // For cron: advance nextRunAtMs to the next occurrence.
  // For once: nextRunAtMs becomes undefined (firedAtMs is now in the past).
  refreshNextRun(job, firedAtMs + 1)
  persist()

  if (job.delivery === 'notify') {
    const delivered = notifyJob(job, firedAtMs)
    job.state.lastRunStatus = 'ok'
    job.state.lastRunDurationMs = 0
    job.state.lastError = undefined
    logger.info('job notified', { jobId: job.id, name: job.name, sessionsDelivered: delivered, activeSessions: sessions.size })
  } else {
    logger.info('job spawn start', { jobId: job.id, name: job.name })
    const res = await spawnJob(job, firedAtMs)
    job.state.lastRunStatus = res.status
    job.state.lastRunDurationMs = res.durationMs
    job.state.lastError = res.error
    logger.info('job spawn done', { jobId: job.id, name: job.name, status: res.status, durationMs: res.durationMs, error: res.error })
  }

  // One-shots: delete on success, disable on failure (preserve for inspection)
  if (job.schedule.kind === 'once') {
    if (job.state.lastRunStatus === 'ok') {
      const idx = JOBS.indexOf(job)
      if (idx >= 0) JOBS.splice(idx, 1)
      logger.info('one-shot deleted after success', { jobId: job.id, name: job.name })
      persist()
      return
    }
    job.enabled = false
  }

  refreshNextRun(job, Date.now())
  persist()
}

// --- Tick loop ---------------------------------------------------------------

let isShuttingDown = false

async function tick(): Promise<void> {
  if (isShuttingDown) return
  const now = Date.now()
  const due = JOBS.filter(j =>
    j.enabled &&
    j.state.nextRunAtMs !== undefined &&
    j.state.nextRunAtMs <= now,
  )
  if (due.length === 0) return

  // Fire concurrently, but await persistence after each
  await Promise.all(due.map(async job => {
    try {
      await fireJob(job, now)
    } catch (err) {
      logger.error('fire error', { jobId: job.id, err: String(err) })
      job.state.lastRunStatus = 'error'
      job.state.lastError = String(err)
      refreshNextRun(job, Date.now())
      persist()
    }
  }))
}

// --- Tools (job CRUD) --------------------------------------------------------

const TOOL_LIST = [
  {
    name: 'list_jobs',
    description: 'List all scheduled jobs. Filter by enabled state or tag.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        enabled: { type: 'boolean', description: 'If set, only return jobs with this enabled state' },
        tag: { type: 'string', description: 'If set, only return jobs whose tags include this value' },
      },
    },
  },
  {
    name: 'get_job',
    description: 'Get a single job by id, including state (lastRun, nextRun, runCount).',
    inputSchema: {
      type: 'object' as const,
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'create_job',
    description: 'Create a new scheduled job. Returns the new job.id. Schedule is either a cron expression (5-field, e.g. "0 6 * * *") with optional tz, or a one-shot ISO timestamp. Delivery is "notify" (push into subscribed Claude Code sessions) or "spawn" (run `claude -p` headless).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Short identifier, e.g. "ring-light-on"' },
        description: { type: 'string' },
        enabled: { type: 'boolean', description: 'Default true' },
        schedule: {
          type: 'object',
          oneOf: [
            {
              properties: {
                kind: { const: 'cron' },
                expr: { type: 'string', description: '5-field cron, e.g. "0 6 * * *"' },
                tz: { type: 'string', description: 'IANA timezone, defaults to BRAIN_DEFAULT_TIMEZONE or America/Vancouver' },
              },
              required: ['kind', 'expr'],
            },
            {
              properties: {
                kind: { const: 'once' },
                at: { type: 'string', description: 'ISO 8601 timestamp' },
              },
              required: ['kind', 'at'],
            },
          ],
        },
        prompt: { type: 'string', description: 'Prompt/payload delivered when the job fires' },
        delivery: { enum: ['notify', 'spawn'], description: '"notify" pushes to live sessions; "spawn" runs `claude -p` headless' },
        spawnArgs: { type: 'array', items: { type: 'string' }, description: 'Extra CLI args appended to `claude -p <prompt>`' },
        spawnCwd: { type: 'string', description: 'Working directory for spawn mode' },
        spawnModel: { type: 'string', description: 'Model passed to `claude --model`. REQUIRED when delivery is "spawn". Examples: "claude-sonnet-4-6", "claude-haiku-4-5", "claude-opus-4-7-1m".' },
        spawnTimeoutMs: { type: 'number', description: 'Kill after this many ms (default 600000)' },
        spawnMcpConfig: { type: 'string', description: 'Optional --mcp-config value (JSON string or file path). When set, paired with --strict-mcp-config so the spawned session ignores the user\'s normal MCP config. Leave unset to inherit the user\'s normal MCPs.' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'schedule', 'prompt', 'delivery'],
    },
  },
  {
    name: 'update_job',
    description: 'Partially update an existing job. Pass id plus any fields to change.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        enabled: { type: 'boolean' },
        schedule: { type: 'object' },
        prompt: { type: 'string' },
        delivery: { enum: ['notify', 'spawn'] },
        spawnArgs: { type: 'array', items: { type: 'string' } },
        spawnCwd: { type: 'string' },
        spawnModel: { type: 'string' },
        spawnTimeoutMs: { type: 'number' },
        spawnMcpConfig: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    },
  },
  {
    name: 'cancel_job',
    description: 'Permanently delete a job by id.',
    inputSchema: {
      type: 'object' as const,
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'run_now',
    description: 'Fire a job immediately, regardless of schedule. Does not affect future scheduled runs.',
    inputSchema: {
      type: 'object' as const,
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
]

const INSTRUCTIONS = [
  'Scheduler events arrive as <channel source="scheduler" job_id="..." job_name="..." kind="cron|once">.',
  'When you receive a scheduler notification, treat the content as your prompt for this turn — execute it, then stop.',
  'Tools (this server): list_jobs, get_job, create_job, update_job, cancel_job, run_now.',
  'Schedule shape: cron uses 5-field expressions ("min hr dom mon dow") with optional IANA tz; one-shots use an ISO 8601 timestamp and are deleted on successful firing (or disabled if the run errored).',
  'Delivery modes: "notify" pushes the prompt into any live Claude Code session subscribed to the scheduler MCP (filtered by tags). "spawn" runs `claude -p <prompt> --dangerously-skip-permissions --model <spawnModel>` as a fresh headless process — use this for unattended cron-style automation. spawnModel is required for spawn jobs (no implicit default). Spawn jobs inherit the user\'s normal MCP config; if claude exits with "Prompt is too long", trim the user\'s `~/.claude.json` mcpServers (or this project\'s `disabledMcpServers`) or pass `spawnMcpConfig` to pin a smaller MCP set.',
  'Tag filtering: jobs with no tags broadcast to every subscriber; tagged jobs only reach sessions whose ?subscribe= query param includes at least one matching tag.',
].join('\n')

function jobView(job: Job): Record<string, unknown> {
  return {
    id: job.id,
    name: job.name,
    description: job.description,
    enabled: job.enabled,
    schedule: job.schedule,
    prompt: job.prompt,
    delivery: job.delivery,
    spawnArgs: job.spawnArgs,
    spawnCwd: job.spawnCwd,
    spawnModel: job.spawnModel,
    spawnTimeoutMs: job.spawnTimeoutMs,
    spawnMcpConfig: job.spawnMcpConfig,
    tags: job.tags,
    state: {
      ...job.state,
      lastRunAt: job.state.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
      nextRunAt: job.state.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
    },
    createdAt: new Date(job.createdAtMs).toISOString(),
    updatedAt: new Date(job.updatedAtMs).toISOString(),
  }
}

function createMcpServer(): Server {
  const server = new Server(
    { name: 'scheduler', version: '0.1.0' },
    {
      capabilities: {
        experimental: { 'claude/channel': {} },
        tools: {},
      },
      instructions: INSTRUCTIONS,
    },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_LIST }))

  server.setRequestHandler(CallToolRequestSchema, async req => {
    const args = req.params.arguments ?? {}

    if (req.params.name === 'list_jobs') {
      const { enabled, tag } = args as { enabled?: boolean; tag?: string }
      let out = JOBS
      if (typeof enabled === 'boolean') out = out.filter(j => j.enabled === enabled)
      if (tag) out = out.filter(j => (j.tags ?? []).includes(tag))
      return { content: [{ type: 'text', text: JSON.stringify(out.map(jobView), null, 2) }] }
    }

    if (req.params.name === 'get_job') {
      const { id } = args as { id: string }
      const job = findJob(id)
      if (!job) throw new Error(`no job with id ${id}`)
      return { content: [{ type: 'text', text: JSON.stringify(jobView(job), null, 2) }] }
    }

    if (req.params.name === 'create_job') {
      const a = args as Partial<Job> & { schedule: ScheduleSpec; prompt: string; delivery: 'notify' | 'spawn'; name: string }
      // Validate schedule by computing a next run
      const probe = computeNextRunMs(a.schedule, Date.now())
      if (a.schedule.kind === 'cron' && probe === null) {
        throw new Error(`invalid cron expression: ${(a.schedule as CronSchedule).expr}`)
      }
      if (a.schedule.kind === 'once' && probe === null) {
        throw new Error(`invalid or already-past one-shot timestamp: ${(a.schedule as OnceSchedule).at}`)
      }
      if (a.delivery === 'spawn' && !a.spawnModel) {
        throw new Error('spawnModel is required when delivery is "spawn" — pick an explicit model (e.g. "claude-sonnet-4-6", "claude-haiku-4-5")')
      }
      const now = Date.now()
      const job: Job = {
        id: randomUUID(),
        name: a.name,
        description: a.description,
        enabled: a.enabled ?? true,
        schedule: a.schedule,
        prompt: a.prompt,
        delivery: a.delivery,
        spawnArgs: a.spawnArgs,
        spawnCwd: a.spawnCwd,
        spawnModel: a.spawnModel,
        spawnTimeoutMs: a.spawnTimeoutMs,
        spawnMcpConfig: a.spawnMcpConfig,
        tags: a.tags,
        state: { runCount: 0 },
        createdAtMs: now,
        updatedAtMs: now,
      }
      refreshNextRun(job, now)
      JOBS.push(job)
      persist()
      logger.info('job created', { jobId: job.id, name: job.name, delivery: job.delivery })
      return { content: [{ type: 'text', text: JSON.stringify(jobView(job), null, 2) }] }
    }

    if (req.params.name === 'update_job') {
      const a = args as Partial<Job> & { id: string }
      const job = findJob(a.id)
      if (!job) throw new Error(`no job with id ${a.id}`)
      if (a.name !== undefined) job.name = a.name
      if (a.description !== undefined) job.description = a.description
      if (a.enabled !== undefined) job.enabled = a.enabled
      if (a.schedule !== undefined) {
        const probe = computeNextRunMs(a.schedule, Date.now())
        if (a.schedule.kind === 'cron' && probe === null) {
          throw new Error(`invalid cron expression: ${(a.schedule as CronSchedule).expr}`)
        }
        job.schedule = a.schedule
      }
      if (a.prompt !== undefined) job.prompt = a.prompt
      if (a.delivery !== undefined) job.delivery = a.delivery
      if (a.spawnArgs !== undefined) job.spawnArgs = a.spawnArgs
      if (a.spawnCwd !== undefined) job.spawnCwd = a.spawnCwd
      if (a.spawnModel !== undefined) job.spawnModel = a.spawnModel
      if (a.spawnTimeoutMs !== undefined) job.spawnTimeoutMs = a.spawnTimeoutMs
      if (a.spawnMcpConfig !== undefined) job.spawnMcpConfig = a.spawnMcpConfig
      if (a.tags !== undefined) job.tags = a.tags
      if (job.delivery === 'spawn' && !job.spawnModel) {
        throw new Error('spawnModel is required when delivery is "spawn" — set spawnModel to an explicit model name')
      }
      job.updatedAtMs = Date.now()
      refreshNextRun(job, Date.now())
      persist()
      logger.info('job updated', { jobId: job.id })
      return { content: [{ type: 'text', text: JSON.stringify(jobView(job), null, 2) }] }
    }

    if (req.params.name === 'cancel_job') {
      const { id } = args as { id: string }
      const idx = JOBS.findIndex(j => j.id === id)
      if (idx < 0) throw new Error(`no job with id ${id}`)
      const removed = JOBS.splice(idx, 1)[0]
      persist()
      logger.info('job cancelled', { jobId: id, name: removed.name })
      return { content: [{ type: 'text', text: `cancelled ${removed.name} (${id})` }] }
    }

    if (req.params.name === 'run_now') {
      const { id } = args as { id: string }
      const job = findJob(id)
      if (!job) throw new Error(`no job with id ${id}`)
      logger.info('run_now triggered', { jobId: id, name: job.name })
      // Fire async; don't block tool response on long spawns
      fireJob(job, Date.now()).catch(err => logger.error('run_now error', { jobId: id, err: String(err) }))
      return { content: [{ type: 'text', text: `fired ${job.name} (${id})` }] }
    }

    throw new Error(`unknown tool: ${req.params.name}`)
  })

  return server
}

// --- HTTP server -------------------------------------------------------------

const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${SCHEDULER_HTTP_PORT}`)

  if (url.pathname === '/health') {
    const body = {
      ok: true,
      pid: process.pid,
      port: SCHEDULER_HTTP_PORT,
      tickIntervalMs: SCHEDULER_TICK_MS,
      jobs: JOBS.length,
      enabledJobs: JOBS.filter(j => j.enabled).length,
      activeSessions: sessions.size,
      uptimeS: Math.floor(process.uptime()),
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body, null, 2))
    return
  }

  if (url.pathname !== '/mcp') {
    res.writeHead(404)
    res.end('not found')
    return
  }

  // MCP transport handles per-request session routing via Mcp-Session-Id header.
  // GET (initial) / DELETE — find existing session by header, or create a new one on init POST.
  const sidHeader = req.headers['mcp-session-id']
  const sid = Array.isArray(sidHeader) ? sidHeader[0] : sidHeader

  if (sid && sessions.has(sid)) {
    const { transport } = sessions.get(sid)!
    await transport.handleRequest(req, res)
    return
  }

  // No existing session — must be a POST initialize. Create a new transport+server.
  const filter = parseFilter(url)
  const filterDesc = filter.subscribeTags ? `subscribe:${[...filter.subscribeTags].join(',')}` : 'subscribe:*'
  const newSid = randomUUID()
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => newSid,
    onsessioninitialized: () => {
      logger.info('session opened', { sid: newSid, filter: filterDesc, activeSessions: sessions.size + 1 })
    },
  })
  const server = createMcpServer()
  await server.connect(transport)

  sessions.set(newSid, { transport, server, filter, filterDesc })
  transport.onclose = () => closeSession(newSid, 'transport closed')

  await transport.handleRequest(req, res)
})

httpServer.on('error', err => {
  logger.error('http server error', { err: String(err) })
  process.exit(1)
})

// --- Startup -----------------------------------------------------------------

// Refresh nextRunAtMs on all jobs from current time (don't fire stale missed runs).
const startupNow = Date.now()
for (const job of JOBS) {
  refreshNextRun(job, startupNow)
}
persist()

httpServer.listen(SCHEDULER_HTTP_PORT, '127.0.0.1', () => {
  logger.info('scheduler listening', {
    port: SCHEDULER_HTTP_PORT,
    jobs: JOBS.length,
    enabledJobs: JOBS.filter(j => j.enabled).length,
    tickMs: SCHEDULER_TICK_MS,
    defaultTz: SCHEDULER_DEFAULT_TZ,
    claudeBin: CLAUDE_BIN,
    defaultCwd: SCHEDULER_DEFAULT_CWD,
  })
})

const tickHandle = setInterval(() => {
  tick().catch(err => logger.error('tick error', { err: String(err) }))
}, SCHEDULER_TICK_MS)

function shutdown(signal: string): void {
  if (isShuttingDown) return
  isShuttingDown = true
  logger.info('shutdown', { signal })
  clearInterval(tickHandle)
  for (const sid of [...sessions.keys()]) closeSession(sid, `shutdown ${signal}`)
  httpServer.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
