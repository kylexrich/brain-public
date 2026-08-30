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
 *                          ?subscribe=            (explicit empty) subscribe to NOTHING —
 *                                                 use this when a session needs scheduler
 *                                                 tool access but no notify spam
 *                          ?exclude=tag1,tag2     receive everything EXCEPT notify-jobs
 *                                                 tagged with these tags. Exclude takes
 *                                                 priority over subscribe and is the right
 *                                                 way to say "everything except this one
 *                                                 chat-specific tag." Combinable with
 *                                                 ?subscribe=.
 *                          (no param = subscribe to all notify-jobs, back-compat default)
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
 *   SCHEDULER_MODEL_PREFLIGHT             "0" disables spawnModel preflight (default: enabled)
 *   SCHEDULER_MODEL_PREFLIGHT_TIMEOUT_MS  Preflight timeout ms       (default: 30000)
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
import { z } from 'zod'

// --- Config ------------------------------------------------------------------

const SCHEDULER_HTTP_PORT = parseInt(process.env.SCHEDULER_HTTP_PORT ?? '47240')
const SCHEDULER_TICK_MS = parseInt(process.env.SCHEDULER_TICK_MS ?? '1000')
const SCHEDULER_DEFAULT_TZ = process.env.SCHEDULER_DEFAULT_TZ ?? process.env.BRAIN_DEFAULT_TIMEZONE ?? 'America/Vancouver'
const BRAIN_ROOT = process.env.BRAIN_ROOT ?? join(homedir(), 'Developer/brain')
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? join(homedir(), '.local/bin/claude')
const SCHEDULER_DEFAULT_CWD = process.env.SCHEDULER_DEFAULT_CWD ?? BRAIN_ROOT
const SCHEDULER_MODEL_PREFLIGHT = process.env.SCHEDULER_MODEL_PREFLIGHT !== '0'
const SCHEDULER_MODEL_PREFLIGHT_TIMEOUT_MS = parseInt(process.env.SCHEDULER_MODEL_PREFLIGHT_TIMEOUT_MS ?? '30000')

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

// --- Tag allowlist -----------------------------------------------------------

const TAGS_FILE = join(import.meta.dirname, 'tags.json')
const TagsFileSchema = z.object({
  version: z.literal(1),
  tags: z.array(z.object({
    name: z.string().min(1),
    description: z.string().min(1),
  })),
})
type TagEntry = z.infer<typeof TagsFileSchema>['tags'][number]

function loadAllowlist(): { entries: TagEntry[]; set: Set<string> } | null {
  if (!existsSync(TAGS_FILE)) {
    logger.warn('tags.json missing — allowlist disabled')
    return null
  }
  try {
    const parsed = TagsFileSchema.parse(JSON.parse(readFileSync(TAGS_FILE, 'utf8')))
    return { entries: parsed.tags, set: new Set(parsed.tags.map(t => t.name)) }
  } catch (err) {
    logger.error('tags.json parse failed — allowlist disabled', { err: String(err) })
    return null
  }
}

const ALLOWLIST = loadAllowlist()

function validateTags(tags: string[] | undefined): void {
  if (!tags || tags.length === 0) return
  if (ALLOWLIST === null) return
  const unknown = tags.filter(t => !ALLOWLIST.set.has(t))
  if (unknown.length > 0) {
    const known = [...ALLOWLIST.set].sort().join(', ')
    throw new Error(`unknown tag(s): ${unknown.join(', ')} — known tags: ${known}. Use list_tags or edit tags.json.`)
  }
}

// --- spawnModel preflight ----------------------------------------------------
//
// spawnModel is free text handed straight to `claude --model`. A typo or a
// retired model id used to persist happily and surface only at fire time, as a
// dead job in a run log nobody watches. A hardcoded allowlist is the wrong fix:
// it goes stale exactly the way stale docs do, and a stale allowlist is worse
// than stale docs because it blocks *valid* new models. So ask the CLI itself —
// it is the only source of truth that stays current with the installed version.
//
// Fails OPEN. Only a definitive "not a recognized model" verdict rejects; a
// timeout, a missing binary, or an offline box warns and allows. Validation must
// never be the reason a job cannot be created — same philosophy as tags.json.

const MODEL_EXAMPLES = '"claude-sonnet-5", "claude-haiku-4-5", "claude-opus-5"'

// Substrings that mean the CLI positively rejected the model (vs. any other failure).
const MODEL_REJECT_MARKERS = ['unrecognized_model', 'is not a model', 'issue with the selected model']

const VERIFIED_MODELS = new Set<string>()

type ModelProbe = { recognized: boolean; inconclusive: boolean; detail: string }

function probeModel(model: string): Promise<ModelProbe> {
  return new Promise(resolve => {
    // Empty MCP set: the probe only asks "is this model real?", so the user's
    // servers are irrelevant and would just make it slow (or blow the prompt limit).
    const args = ['-p', 'ok', '--model', model, '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}']

    let child
    try {
      child = spawn(CLAUDE_BIN, args, {
        cwd: SCHEDULER_DEFAULT_CWD,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (err) {
      resolve({ recognized: false, inconclusive: true, detail: String(err) })
      return
    }

    let buf = ''
    const capture = (chunk: Buffer) => { if (buf.length < 16_384) buf += chunk.toString() }
    child.stdout?.on('data', capture)
    child.stderr?.on('data', capture)

    let settled = false
    const finish = (v: ModelProbe) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(v)
    }

    const timer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch {}
      finish({ recognized: false, inconclusive: true, detail: 'preflight timed out' })
    }, SCHEDULER_MODEL_PREFLIGHT_TIMEOUT_MS)

    child.on('error', err => finish({ recognized: false, inconclusive: true, detail: String(err) }))
    child.on('close', code => {
      const haystack = buf.toLowerCase()
      const marker = MODEL_REJECT_MARKERS.find(m => haystack.includes(m))
      if (marker) {
        finish({ recognized: false, inconclusive: false, detail: `CLI reported: ${marker}` })
      } else if (code === 0) {
        finish({ recognized: true, inconclusive: false, detail: '' })
      } else {
        // Non-zero without a rejection marker: transient/API/auth trouble, not a verdict.
        finish({ recognized: false, inconclusive: true, detail: `exit ${code}` })
      }
    })
  })
}

async function validateSpawnModel(model: string | undefined): Promise<void> {
  if (!model) {
    throw new Error(`spawnModel is required when delivery is "spawn" — pick an explicit model (e.g. ${MODEL_EXAMPLES})`)
  }
  if (!SCHEDULER_MODEL_PREFLIGHT || VERIFIED_MODELS.has(model)) return

  const probe = await probeModel(model)
  if (probe.recognized) {
    VERIFIED_MODELS.add(model)
    return
  }
  if (probe.inconclusive) {
    logger.warn('spawnModel preflight inconclusive — allowing', { model, detail: probe.detail })
    return
  }
  throw new Error(
    `spawnModel "${model}" is not a model this Claude Code install recognizes (${probe.detail}). ` +
    `Use a current model id (e.g. ${MODEL_EXAMPLES}), or set SCHEDULER_MODEL_PREFLIGHT=0 to skip this check.`,
  )
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
  subscribeTags: Set<string> | null  // null = subscribe to everything (subject to excludeTags)
  excludeTags: Set<string> | null    // null = exclude nothing; if set, jobs whose tags intersect are dropped before subscribe is checked
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
  const excl = params['exclude']

  // Exclude: if param is present and non-empty, build the set; otherwise null (no exclusions).
  let excludeTags: Set<string> | null = null
  if (excl !== undefined && excl !== '') {
    const tags = excl.split(',').map(s => s.trim()).filter(Boolean)
    if (tags.length > 0) excludeTags = new Set(tags)
  }

  // Subscribe: distinguish "no param at all" (back-compat: subscribe to all) from "explicit
  // empty" (subscribe to nothing). The empty case is what lets a session connect for tool
  // access without receiving notify spam from every untagged job that fires.
  let subscribeTags: Set<string> | null
  if (sub === undefined) subscribeTags = null
  else if (sub === '') subscribeTags = new Set()
  else {
    const tags = sub.split(',').map(s => s.trim()).filter(Boolean)
    subscribeTags = tags.length > 0 ? new Set(tags) : new Set()
  }

  return { subscribeTags, excludeTags }
}

function jobMatchesFilter(job: Job, filter: SessionFilter): boolean {
  const jobTags = job.tags ?? []
  // Exclude takes priority — if any of the job's tags is in the exclude list, drop the job.
  // Untagged jobs can never match an exclude filter (nothing to intersect against), so they
  // continue to broadcast under back-compat.
  if (filter.excludeTags !== null && jobTags.some(t => filter.excludeTags!.has(t))) {
    return false
  }
  if (filter.subscribeTags === null) return true
  if (jobTags.length === 0) return true  // untagged jobs broadcast to all subscribers
  return jobTags.some(t => filter.subscribeTags!.has(t))
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

function runLogDirectoryName(job: Job): string {
  const safeName = job.name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return safeName || job.id
}

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
    const jobRunsDir = join(RUNS_DIR, runLogDirectoryName(job))
    const runLog = join(jobRunsDir, `${job.id}-${firedAtMs}.log`)
    const timeoutMs = job.spawnTimeoutMs ?? 600_000

    try {
      mkdirSync(jobRunsDir, { recursive: true })
    } catch (err) {
      logger.warn('failed to prepare job run log directory', { jobId: job.id, err: String(err) })
    }

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
        name: { type: 'string', description: 'Short identifier, e.g. "stream-lights-on"' },
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
        spawnModel: { type: 'string', description: 'Model passed to `claude --model`. REQUIRED when delivery is "spawn". Examples: ' + MODEL_EXAMPLES + '. Verified against the local Claude Code install at create/update time.' },
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
  {
    name: 'list_tags',
    description: 'List the canonical tag allowlist. Use to discover valid tags for create_job/update_job and ?subscribe= filtering.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
]

const INSTRUCTIONS = [
  'Scheduler events arrive as <channel source="scheduler" job_id="..." job_name="..." kind="cron|once">.',
  'When you receive a scheduler notification, treat the content as your prompt for this turn — execute it, then stop.',
  'Tools (this server): list_jobs, get_job, create_job, update_job, cancel_job, run_now, list_tags.',
  'Schedule shape: cron uses 5-field expressions ("min hr dom mon dow") with optional IANA tz; one-shots use an ISO 8601 timestamp and are deleted on successful firing (or disabled if the run errored).',
  'Delivery modes: "notify" pushes the prompt into any live Claude Code session subscribed to the scheduler MCP (filtered by tags). "spawn" runs `claude -p <prompt> --dangerously-skip-permissions --model <spawnModel>` as a fresh headless process — use this for unattended cron-style automation. spawnModel is required for spawn jobs (no implicit default) and is verified against the local Claude Code install when a job is created or updated, so a stale or mistyped model id fails immediately instead of silently killing the run. Spawn jobs inherit the user\'s normal MCP config; if claude exits with "Prompt is too long", trim the user\'s `~/.claude.json` mcpServers (or this project\'s `disabledMcpServers`) or pass `spawnMcpConfig` to pin a smaller MCP set.',
  'Tag filtering: sessions can opt in with ?subscribe=tag1,tag2 (only matching tags) and/or opt out with ?exclude=tag1,tag2 (drop matching tags). Untagged jobs broadcast to all subscribers. Exclude takes priority over subscribe — use ?exclude= to keep a session listening to everything except a specific chat-targeted tag.',
  'Use list_tags to see the canonical tag allowlist; create_job/update_job reject unknown tags when the allowlist is enabled.',
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
      if (a.delivery === 'spawn') await validateSpawnModel(a.spawnModel)
      validateTags(a.tags)
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
      if (a.tags !== undefined) {
        validateTags(a.tags)
        job.tags = a.tags
      }
      if (job.delivery === 'spawn') await validateSpawnModel(job.spawnModel)
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

    if (req.params.name === 'list_tags') {
      const payload = ALLOWLIST === null
        ? { allowlistEnabled: false, tags: [] }
        : { allowlistEnabled: true, tags: ALLOWLIST.entries }
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] }
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
      allowlistEnabled: ALLOWLIST !== null,
      allowlistSize: ALLOWLIST?.entries.length ?? 0,
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
  const subscribePart = filter.subscribeTags ? `subscribe:${[...filter.subscribeTags].join(',')}` : 'subscribe:*'
  const excludePart = filter.excludeTags ? ` exclude:${[...filter.excludeTags].join(',')}` : ''
  const filterDesc = subscribePart + excludePart
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
  if (ALLOWLIST !== null && job.tags?.length) {
    const unknown = job.tags.filter(t => !ALLOWLIST.set.has(t))
    if (unknown.length) logger.warn('persisted job has unknown tags', { jobId: job.id, name: job.name, unknown })
  }
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
