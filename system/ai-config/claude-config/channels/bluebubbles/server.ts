#!/usr/bin/env bun
/**
 * BlueBubbles HTTP MCP daemon
 *
 * Persistent singleton process (launchd-managed) that:
 * 1. Receives iMessage events via BlueBubbles webhooks (push-based, no polling)
 * 2. Exposes a Streamable HTTP MCP endpoint per chat-filter path
 * 3. Routes inbound messages as notifications/claude/channel to matching sessions
 * 4. Handles tool calls (reply, send_attachment, set_tts) from any connected session
 *
 * Claude Code connects directly via HTTP — no stdio, no child process, no shim.
 * Each session gets its own Server+Transport; webhook events are shared.
 *
 * Endpoints (all on 127.0.0.1:BB_HTTP_PORT):
 *   /mcp                 Streamable HTTP MCP — chat filter via query params:
 *                           ?allow=guid1,guid2   allowlist (if absent, allow all)
 *                           ?deny=guid1,guid2    denylist
 *                         Example: /mcp?allow=any;-;+16043684730
 *   /webhook             Receives BlueBubbles webhook POST events
 *   /health              JSON health check
 *
 * Config (env vars):
 *   BB_URL                      BlueBubbles server URL          (default: http://127.0.0.1:1234)
 *   BB_PASSWORD                 BB server password              (fallback: OPENCLAW_BLUEBUBBLES_PASSWORD)
 *   BB_HTTP_PORT                HTTP listen port                (default: 47239)
 *   BB_FETCH_TIMEOUT_MS         Default fetch timeout           (default: 5000)
 *   BB_ATTACHMENT_TIMEOUT_MS    Attachment upload timeout ms    (default: 180000)
 *   BB_DEBOUNCE_MS              Debounce window ms              (default: 6000, 0 = disabled)
 *   BB_MAX_ATTACHMENT_BYTES     Max inbound attachment size     (default: 104857600 = 100 MB)
 *   ATTACHMENTS_MAX_TOTAL_BYTES Total attachments disk budget   (default: 524288000 = 500 MB)
 *
 * Webhook setup (one-time, in BlueBubbles UI on claw user):
 *   API & Webhooks → Manage → Add Webhook
 *   URL: http://127.0.0.1:47239/webhook
 *   Events: new-message
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from 'crypto'
import { spawnSync } from 'child_process'
import { readFileSync, writeFileSync, renameSync, rmSync, mkdirSync, appendFileSync, statSync, readdirSync, createWriteStream } from 'fs'
import { homedir, tmpdir } from 'os'
import { join } from 'path'
import http from 'node:http'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

// --- Config ------------------------------------------------------------------

const BB_URL = (process.env.BB_URL ?? 'http://127.0.0.1:1234').replace(/\/$/, '')
const BB_PASSWORD = process.env.BB_PASSWORD ?? process.env.OPENCLAW_BLUEBUBBLES_PASSWORD ?? ''
const BB_HTTP_PORT = parseInt(process.env.BB_HTTP_PORT ?? '47239')
const BB_FETCH_TIMEOUT_MS = parseInt(process.env.BB_FETCH_TIMEOUT_MS ?? '5000')
const BB_ATTACHMENT_TIMEOUT_MS = parseInt(process.env.BB_ATTACHMENT_TIMEOUT_MS ?? '180000')
const BB_DEBOUNCE_MS = parseInt(process.env.BB_DEBOUNCE_MS ?? '6000')
const BB_MAX_ATTACHMENT_BYTES = parseInt(process.env.BB_MAX_ATTACHMENT_BYTES ?? String(100 * 1024 * 1024))
const ATTACHMENTS_MAX_TOTAL_BYTES = parseInt(process.env.ATTACHMENTS_MAX_TOTAL_BYTES ?? String(500 * 1024 * 1024))
const TTS_FILE = join(import.meta.dirname, 'tts-settings.json')
const ATTACHMENTS_DIR = join(import.meta.dirname, 'attachments')
mkdirSync(ATTACHMENTS_DIR, { recursive: true })

// --- Logger ------------------------------------------------------------------

const LOG_DIR = join(import.meta.dirname, 'logs')
const LOG_FILE = join(LOG_DIR, 'server.log')
const LOG_MAX_BYTES = 5 * 1024 * 1024 // rotate at 5 MB

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

// --- Startup guards ----------------------------------------------------------

if (!BB_PASSWORD) {
  logger.error('BB_PASSWORD / OPENCLAW_BLUEBUBBLES_PASSWORD not set — exiting')
  process.exit(1)
}
process.on('unhandledRejection', err =>
  logger.error('unhandled rejection', { err: String(err) }))
process.on('uncaughtException', err =>
  logger.error('uncaught exception', { err: String(err) }))

// --- Runtime PATH augmentation -----------------------------------------------
// launchd doesn't source .zshrc, so NVM's node is not on PATH. Find it and prepend.
// This ensures subprocesses that invoke `brain` (which uses tsx → node) can resolve it.
try {
  const nvmVersionsDir = join(homedir(), '.nvm/versions/node')
  const versions = readdirSync(nvmVersionsDir)
    .filter(v => v.startsWith('v'))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))
  if (versions.length > 0) {
    const nodeBinDir = join(nvmVersionsDir, versions[0], 'bin')
    process.env.PATH = `${nodeBinDir}:${process.env.PATH ?? ''}`
    logger.info('NVM node path prepended', { nodeBinDir })
  }
} catch (err) {
  logger.warn('could not find NVM node — subprocess calls requiring node may fail', { err: String(err) })
}

// --- Attachment cleanup on startup -------------------------------------------

try {
  const now = Date.now()
  const TTL_24H = 24 * 60 * 60 * 1000
  let cleaned = 0

  // Pass 1: delete files older than 24h
  for (const file of readdirSync(ATTACHMENTS_DIR)) {
    const filePath = join(ATTACHMENTS_DIR, file)
    try {
      const stat = statSync(filePath)
      if (now - stat.mtimeMs > TTL_24H) {
        rmSync(filePath, { force: true })
        cleaned++
      }
    } catch { /* skip unreadable files */ }
  }
  if (cleaned > 0) logger.info('attachment TTL cleanup', { deleted: cleaned })

  // Pass 2: enforce total disk budget — delete oldest files if over limit
  const remaining = readdirSync(ATTACHMENTS_DIR)
    .map(f => {
      const p = join(ATTACHMENTS_DIR, f)
      try { return { path: p, stat: statSync(p) } } catch { return null }
    })
    .filter((f): f is { path: string; stat: ReturnType<typeof statSync> } => f !== null)

  const totalBytes = remaining.reduce((sum, f) => sum + f.stat.size, 0)
  if (totalBytes > ATTACHMENTS_MAX_TOTAL_BYTES) {
    const sorted = remaining.sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs)
    let currentTotal = totalBytes
    let budgetCleaned = 0
    for (const f of sorted) {
      if (currentTotal <= ATTACHMENTS_MAX_TOTAL_BYTES) break
      try {
        rmSync(f.path, { force: true })
        currentTotal -= f.stat.size
        budgetCleaned++
      } catch { /* skip */ }
    }
    logger.info('attachment budget cleanup', { deletedFiles: budgetCleaned, bytesBefore: totalBytes, bytesAfter: currentTotal })
  }
} catch (err) {
  logger.warn('attachment cleanup failed', { err: String(err) })
}

// --- Chat filter parsing from URL query params -------------------------------
// Filters are passed as query params on /mcp:
//   ?allow=guid1,guid2  → only deliver messages from these chats
//   ?deny=guid1,guid2   → deliver all messages except from these chats
// If neither is set, all messages are delivered.
// NOTE: We parse the raw query string with decodeURIComponent, NOT URLSearchParams,
// because URLSearchParams decodes '+' as space (breaking phone numbers like +16043684730).

interface ChatFilter {
  allowChats: string[] | null  // null = no allowlist (all pass)
  denyChats: Set<string>
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

function parseFilter(url: URL): ChatFilter {
  const params = parseRawQueryParams(url.search)
  const allow = params['allow']
  const deny = params['deny']
  return {
    allowChats: allow ? allow.split(',').map(s => s.trim()).filter(Boolean) : null,
    denyChats: new Set(deny ? deny.split(',').map(s => s.trim()).filter(Boolean) : []),
  }
}

// --- Contact resolution -------------------------------------------------------

const BRAIN_BIN = join(homedir(), 'Developer/brain/cli/bin/brain')
const contactCache = new Map<string, string>()

function resolveContact(identifier: string): string {
  const cached = contactCache.get(identifier)
  if (cached) return cached
  try {
    const res = spawnSync(BRAIN_BIN, ['contact', 'resolve', '--identifier', identifier, '--mode', 'report'], {
      encoding: 'utf8',
      timeout: 15_000,  // cold-start tsx→node compile can exceed 5s under launchd
      env: { ...process.env },
    })
    if (res.status === 0 && res.stdout) {
      const data = JSON.parse(res.stdout.trim()) as { label: string | null }
      const name = data.label ?? identifier
      contactCache.set(identifier, name)
      return name
    }
    // Non-zero exit or empty stdout — log and DO NOT poison the cache.
    // Returning raw identifier lets future calls retry (e.g. once brain is warm).
    logger.warn('contact resolve non-ok', {
      identifier,
      status: res.status,
      stderrPreview: (res.stderr ?? '').toString().slice(0, 200),
      stdoutPreview: (res.stdout ?? '').toString().slice(0, 200),
    })
  } catch (err) {
    logger.warn('contact resolve threw', { identifier, err: String(err) })
  }
  // Fallthrough: transient failure. Return raw identifier but skip caching
  // so the next call can retry once brain CLI warms up.
  return identifier
}

// --- BlueBubbles REST helpers ------------------------------------------------

function bbPath(path: string, params: Record<string, string> = {}): string {
  const q = new URLSearchParams({ password: BB_PASSWORD, ...params })
  return `${BB_URL}${path}?${q}`
}

function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs: number = BB_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer))
}

async function bbPost(path: string, body: unknown): Promise<any> {
  const res = await fetchWithTimeout(bbPath(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status} ${await res.text().catch(() => '')}`)
  return res.json()
}

const HEIC_TYPES = new Set(['image/heic', 'image/heif'])

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  aac: 'audio/aac',
  caf: 'audio/x-caf',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  pdf: 'application/pdf',
  txt: 'text/plain',
  vcf: 'text/vcard',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

function mimeTypeForFilename(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot < 0 || dot === filename.length - 1) return 'application/octet-stream'
  const ext = filename.slice(dot + 1).toLowerCase()
  return MIME_BY_EXT[ext] ?? 'application/octet-stream'
}

// --- Attachment types --------------------------------------------------------

type AttachmentCategory = 'image' | 'video' | 'audio' | 'file'

function categorizeAttachment(mime: string): AttachmentCategory {
  const m = mime.toLowerCase()
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  return 'file'
}

type Attachment =
  | { kind: AttachmentCategory; path: string; mime: string }
  | { kind: 'too_large'; name: string; sizeBytes: number }

// --- Attachment download -----------------------------------------------------

type DownloadResult =
  | { ok: true; path: string; mime: string }
  | { ok: false; tooLarge: true; name: string; sizeBytes: number }
  | { ok: false; tooLarge?: false }

async function downloadAttachment(guid: string, transferName: string, mimeType?: string): Promise<DownloadResult> {
  try {
    logger.info('attachment download start', { guid, transferName, mimeType: mimeType ?? 'unknown' })
    const res = await fetchWithTimeout(bbPath(`/api/v1/attachment/${encodeURIComponent(guid)}/download`))
    if (!res.ok) {
      logger.error('attachment download HTTP error', { guid, status: res.status })
      return { ok: false }
    }

    // Pre-check Content-Length if available
    const contentLength = parseInt(res.headers.get('content-length') ?? '0')
    if (contentLength > BB_MAX_ATTACHMENT_BYTES) {
      logger.warn('attachment too large (Content-Length)', { guid, transferName, sizeBytes: contentLength })
      await res.body?.cancel()
      return { ok: false, tooLarge: true, name: transferName, sizeBytes: contentLength }
    }

    const ext = transferName.includes('.') ? transferName.split('.').pop()! : 'bin'
    const rawPath = join(ATTACHMENTS_DIR, `bb-att-${randomUUID()}.${ext}`)

    // Stream directly to disk — no intermediate ArrayBuffer in heap
    if (!res.body) {
      logger.error('attachment download missing body', { guid, transferName })
      return { ok: false }
    }
    await pipeline(Readable.fromWeb(res.body as any), createWriteStream(rawPath))

    // Post-download size check (Content-Length may be absent or wrong)
    const actualSize = statSync(rawPath).size
    if (actualSize > BB_MAX_ATTACHMENT_BYTES) {
      logger.warn('attachment too large (post-download)', { guid, transferName, sizeBytes: actualSize })
      try { rmSync(rawPath, { force: true }) } catch {}
      return { ok: false, tooLarge: true, name: transferName, sizeBytes: actualSize }
    }

    // HEIC → JPEG conversion
    const resolvedMime = mimeType ?? mimeTypeForFilename(transferName)
    if (HEIC_TYPES.has(resolvedMime.toLowerCase()) || ext.toLowerCase() === 'heic' || ext.toLowerCase() === 'heif') {
      const jpegPath = rawPath.replace(/\.[^.]+$/, '.jpg')
      const conv = spawnSync('sips', ['-s', 'format', 'jpeg', rawPath, '--out', jpegPath], { timeout: 15_000 })
      if (conv.status === 0) {
        try { rmSync(rawPath, { force: true }) } catch {}
        logger.info('HEIC → JPEG conversion', { jpegPath })
        return { ok: true, path: jpegPath, mime: 'image/jpeg' }
      }
      logger.warn('HEIC conversion failed, using raw', { rawPath })
    }

    logger.info('attachment saved', { path: rawPath, sizeBytes: actualSize, mime: resolvedMime })
    return { ok: true, path: rawPath, mime: resolvedMime }
  } catch (err) {
    logger.error('attachment download error', { guid, err: String(err) })
    return { ok: false }
  }
}

// --- Recent-message cache (for reply/thread lookups) ------------------------
// BlueBubbles webhooks include `threadOriginatorGuid` (top-of-thread root) on
// every message — BB's MessageSerializer intentionally STRIPS `replyToGuid`
// (the immediate parent) from webhook payloads as a "non-essential" field and
// only includes it in REST responses. So we use `threadOriginatorGuid` as the
// thread-link identifier: it anchors the sub-conversation and, for most
// threaded replies, is exactly what we need for context. Resolution cost: one
// cache lookup; falls back to BB REST for that specific GUID only, not per
// message.
//
// The cache is scoped per chat GUID for two reasons:
//   1. Isolation — a burst in one chat can't evict entries from a quieter chat.
//   2. Defensive scoping — iMessage only allows thread-replies within the same
//      chat, so lookups must also be chat-scoped. A cross-chat hit is always
//      a bug or upstream malformation and should miss-as-null, never leak
//      (e.g. a DM parent into a group-chat context event).

interface CachedMsg { text: string; senderName: string; rowid: number }
const MSG_CACHE_PER_CHAT_MAX = 500
const msgCache = new Map<string, Map<string, CachedMsg>>()  // chatGuid → msgGuid → entry

function cacheMessage(chatGuid: string, msgGuid: string, entry: CachedMsg): void {
  if (!chatGuid || !msgGuid) return
  let chatMap = msgCache.get(chatGuid)
  if (!chatMap) {
    chatMap = new Map()
    msgCache.set(chatGuid, chatMap)
  }
  chatMap.set(msgGuid, entry)
  // Map iteration is insertion-ordered — evict oldest within this chat only
  while (chatMap.size > MSG_CACHE_PER_CHAT_MAX) {
    const first = chatMap.keys().next().value
    if (first === undefined) break
    chatMap.delete(first)
  }
}

async function lookupParent(
  chatGuid: string,
  msgGuid: string,
): Promise<{ senderName: string; text: string } | null> {
  if (!chatGuid || !msgGuid) return null

  // In-process cache (chat-scoped)
  const cached = msgCache.get(chatGuid)?.get(msgGuid)
  if (cached) return { senderName: cached.senderName, text: cached.text }

  // BB REST fallback — verify the fetched message actually belongs to chatGuid
  // before trusting it, so a malformed/forged replyToGuid pointing at a message
  // in another chat can't leak that other chat's content here.
  try {
    const res = await fetchWithTimeout(
      bbPath(`/api/v1/message/${encodeURIComponent(msgGuid)}`, { with: 'handle,chat' }),
    )
    if (!res.ok) {
      logger.debug('parent lookup HTTP error', { chatGuid, msgGuid, status: res.status })
      return null
    }
    const body = await res.json() as any
    const data = body?.data
    if (!data) return null

    const fetchedChatGuids: string[] = ((data.chats ?? []) as any[])
      .map((c: any) => c?.guid as string)
      .filter(Boolean)
    if (!fetchedChatGuids.includes(chatGuid)) {
      logger.warn('parent lookup cross-chat mismatch (ignored)', {
        chatGuid, msgGuid, fetchedChatGuids,
      })
      return null
    }

    const rawSender: string = data.isFromMe ? '' : ((data.handle?.address ?? '') as string).toLowerCase()
    const senderName = data.isFromMe ? 'Marvin' : (rawSender ? resolveContact(rawSender) : 'someone')
    const text = ((data.text ?? '') as string).trim()
    const rowid: number = data.originalROWID ?? 0
    cacheMessage(chatGuid, msgGuid, { text, senderName, rowid })
    return { senderName, text }
  } catch (err) {
    logger.debug('parent lookup error', { chatGuid, msgGuid, err: String(err) })
    return null
  }
}

// Cap parent text at a length that preserves the full semantic content of
// any real iMessage (almost all messages are <500 chars) while still guarding
// against pathological cases like someone replying to a pasted article.
const REPLY_TEXT_MAX = 800

function truncateForReply(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= REPLY_TEXT_MAX) return collapsed
  return collapsed.slice(0, REPLY_TEXT_MAX - 1) + '…'
}

function formatReplyPrefix(reply: { senderName: string; text: string }): string {
  const body = reply.text ? `"${truncateForReply(reply.text)}"` : '(no text)'
  return `[↪ in reply to ${reply.senderName}: ${body}]`
}

// --- Per-session tracking + notification routing -----------------------------

interface SessionState {
  transport: StreamableHTTPServerTransport
  server: Server
  filter: ChatFilter
  filterDesc: string  // for logging/health (e.g. "allow:any;-;+16043684730")
}
const sessions = new Map<string, SessionState>()

// No idle timeout, no max-session cap. BlueBubbles sessions are long-lived agents
// (marv-imsg-*) that subscribe overnight to webhook events — silently reaping idle
// ones drops messages. Sessions are removed only when the transport actually closes
// (explicit DELETE or our own .close() call via transport.onclose).

function routeEvent(guid: string, content: string, meta: Record<string, string>): void {
  for (const [sid, session] of sessions) {
    const { filter, transport } = session
    if (filter.denyChats.has(guid)) continue
    if (filter.allowChats !== null && !filter.allowChats.includes(guid)) continue

    transport.send({
      jsonrpc: '2.0',
      method: 'notifications/claude/channel',
      params: { content, meta },
    } as any).catch(err => {
      logger.error('notify error', { filter: session.filterDesc, sid, err: String(err) })
    })
  }
}

// --- Session lifecycle management --------------------------------------------

function closeSession(sid: string, reason: string): void {
  const session = sessions.get(sid)
  if (!session) return
  sessions.delete(sid)
  // transport.close() is async (returns a Promise); swallow rejections so a single
  // bad transport can't take down the caller.
  try {
    const result = session.transport.close() as unknown as Promise<void> | void
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch(err => logger.warn('transport close rejected', { sid, err: String(err) }))
    }
  } catch (err) {
    logger.warn('transport close threw', { sid, err: String(err) })
  }
  logger.info('session closed', { sid, filter: session.filterDesc, reason, activeSessions: sessions.size })
}

// --- Debounce / delivery -----------------------------------------------------

type ReplyContext = { guid: string; senderName: string; text: string }
type PendingMsg = {
  text: string
  sender: string
  rowid: number
  attachments: Attachment[]
  replyTo?: ReplyContext
}
const pending = new Map<string, { msgs: PendingMsg[]; timer: ReturnType<typeof setTimeout> }>()

function formatAttachment(att: Attachment, prefix = ''): string {
  if (att.kind === 'too_large') {
    const mb = Math.round(att.sizeBytes / (1024 * 1024))
    return `${prefix}[AttachmentTooLarge: ${att.name} (${mb} MB) — could not download]`
  }
  const tag = att.kind.charAt(0).toUpperCase() + att.kind.slice(1)  // 'image' → 'Image'
  return `${prefix}[${tag}: ${att.path}]`
}

function replyMeta(reply: ReplyContext | undefined): Record<string, string> {
  if (!reply) return {}
  return {
    reply_to_guid: reply.guid,
    reply_to_sender: reply.senderName,
    reply_to_text: truncateForReply(reply.text),
  }
}

function flushPending(guid: string): void {
  const entry = pending.get(guid)
  if (!entry || entry.msgs.length === 0) { pending.delete(guid); return }
  const msgs = entry.msgs
  pending.delete(guid)

  const maxRowid = Math.max(...msgs.map(m => m.rowid))
  const lastSender = resolveContact(msgs[msgs.length - 1].sender)

  function msgContent(m: PendingMsg, prefix = ''): string {
    const parts: string[] = []
    if (m.replyTo) parts.push(`${prefix}${formatReplyPrefix(m.replyTo)}`)
    if (m.text) parts.push(`${prefix}${m.text}`)
    for (const att of m.attachments) parts.push(formatAttachment(att, prefix))
    return parts.join('\n')
  }

  const content = msgs.length === 1
    ? msgContent(msgs[0])
    : msgs.map(m => msgContent(m, `[${resolveContact(m.sender)}]: `)).join('\n')

  // Only surface reply meta on single-message batches — on multi-msg batches the
  // per-message prefix lives in content, and a single meta would mis-describe
  // the batch.
  const meta: Record<string, string> = {
    chat_id: guid,
    sender: lastSender,
    rowid: String(maxRowid),
    event_type: 'message',
  }
  if (msgs.length === 1) Object.assign(meta, replyMeta(msgs[0].replyTo))
  routeEvent(guid, content, meta)
}

function scheduleDelivery(guid: string, msg: PendingMsg): void {
  if (BB_DEBOUNCE_MS === 0) {
    const parts: string[] = []
    if (msg.replyTo) parts.push(formatReplyPrefix(msg.replyTo))
    if (msg.text) parts.push(msg.text)
    for (const att of msg.attachments) parts.push(formatAttachment(att))
    routeEvent(guid, parts.join('\n'), {
      chat_id: guid,
      sender: resolveContact(msg.sender),
      rowid: String(msg.rowid),
      event_type: 'message',
      ...replyMeta(msg.replyTo),
    })
    return
  }

  const existing = pending.get(guid)
  if (existing) {
    clearTimeout(existing.timer)
    // Deduplicate by ROWID — replace earlier version of same message (handles BB webhook race
    // where first webhook lacks attachments and second webhook ~350ms later includes them)
    const idx = existing.msgs.findIndex(m => m.rowid === msg.rowid)
    if (idx >= 0) {
      existing.msgs[idx] = msg
    } else {
      existing.msgs.push(msg)
    }
    existing.timer = setTimeout(() => flushPending(guid), BB_DEBOUNCE_MS)
  } else {
    pending.set(guid, {
      msgs: [msg],
      timer: setTimeout(() => flushPending(guid), BB_DEBOUNCE_MS),
    })
  }
}

// --- TTS ---------------------------------------------------------------------

function loadTtsSettings(): Record<string, boolean> {
  try {
    return JSON.parse(readFileSync(TTS_FILE, 'utf8')) as Record<string, boolean>
  } catch {
    return {}
  }
}

function saveTtsSettings(s: Record<string, boolean>): void {
  const tmp = TTS_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(s, null, 2) + '\n', { mode: 0o600 })
  renameSync(tmp, TTS_FILE)
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function sendTts(chatId: string, text: string): Promise<void> {
  const clean = stripMarkdown(text).trim()
  if (clean.length < 10) return

  logger.info('TTS start', { chatId, textLength: clean.length })
  const outPath = join(tmpdir(), `bb-tts-${randomUUID()}.mp3`)
  try {
    const res = spawnSync(BRAIN_BIN, ['tts', 'synthesize', clean, '--out', outPath], {
      encoding: 'utf8',
      timeout: 60_000,
      env: { ...process.env },
    })
    if (res.status !== 0) {
      logger.error('TTS synthesis failed', { chatId, exitCode: res.status, stderr: res.stderr, stdout: res.stdout })
      return
    }
    logger.info('TTS synthesis complete', { chatId, outPath })

    const bytes = readFileSync(outPath)
    const form = new FormData()
    form.append('chatGuid', chatId)
    form.append('tempGuid', randomUUID())
    form.append('name', 'message.mp3')
    form.append('attachment', new Blob([bytes], { type: 'audio/mpeg' }), 'message.mp3')
    const attachRes = await fetchWithTimeout(
      bbPath('/api/v1/message/attachment'),
      { method: 'POST', body: form },
      BB_ATTACHMENT_TIMEOUT_MS,
    )
    if (!attachRes.ok) {
      logger.error('TTS upload failed', { chatId, status: attachRes.status })
    } else {
      logger.info('TTS sent', { chatId })
    }
  } finally {
    try { rmSync(outPath, { force: true }) } catch {}
  }
}

// --- MCP server factory (one per session) ------------------------------------

const TOOL_LIST = [
  {
    name: 'reply',
    description: 'Send an iMessage reply via BlueBubbles (from kyledvrich@gmail.com)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        chat_id: { type: 'string', description: 'The chat_id from the channel tag (iMessage chat GUID)' },
        text: { type: 'string', description: 'Message text to send' },
      },
      required: ['chat_id', 'text'],
    },
  },
  {
    name: 'send_attachment',
    description: 'Send a file attachment via BlueBubbles iMessage (from kyledvrich@gmail.com). Provide exactly one of: file_path or buffer.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        chat_id: { type: 'string', description: 'The chat_id from the channel tag (iMessage chat GUID)' },
        filename: { type: 'string', description: 'Original filename for the attachment (used for MIME detection)' },
        file_path: { type: 'string', description: 'Absolute path to a local file to send (use instead of buffer for large files)' },
        buffer: { type: 'string', description: 'Base64-encoded file content' },
      },
      required: ['chat_id', 'filename'],
    },
  },
  {
    name: 'set_tts',
    description: 'Enable or disable text-to-speech audio for a chat. When enabled, every reply also sends an audio file of the message text.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        chat_id: { type: 'string', description: 'The chat GUID to configure' },
        enabled: { type: 'boolean', description: 'true to enable TTS, false to disable' },
      },
      required: ['chat_id', 'enabled'],
    },
  },
]

const INSTRUCTIONS = [
  'iMessages and chat events arrive as <channel source="bluebubbles" chat_id="..." sender="..." event_type="...">.',
  'Event types: "message" (new iMessage), "message-edited" (someone edited a prior message), "message-unsent" (someone unsent/retracted a prior message), "group-name-change", "group-icon-change" (chat avatar changed — arrives with the new image as [Image: /path]), "participant-added", "participant-removed", "participant-left", "send-error" (your reply failed).',
  'ONLY messages typically warrant a response. Other events are context — use them to understand the conversation state, but do not respond to them unless the situation clearly calls for it.',
  'The sender reads iMessage on their phone — your session transcript never reaches them.',
  'Anything you want the sender to see must go through the BlueBubbles tools.',
  'Available tools: reply (text), send_attachment (files), set_tts (toggle TTS per chat).',
  'Do not mention "BlueBubbles" to the sender; from their perspective this is a normal iMessage conversation.',
  'Threaded replies: when a sender long-presses a message in iMessage and replies to it, the event content is prefixed with [↪ in reply to <sender>: "<thread-root text, truncated>"]. The channel meta carries reply_to_guid, reply_to_sender, reply_to_text. NOTE: this is the THREAD ROOT (the original message that started the sub-conversation), not necessarily the immediate message they replied to — BlueBubbles only exposes the root in webhook payloads. Treat it as the thread anchor: the sender is continuing that specific sub-conversation, not addressing the most recent top-level message in the chat. This matters most when the reply text is short ("lol", "ofc", "yeah"), ambiguous, or delayed — without the thread anchor it reads as a non-sequitur.',
  'Attachments arrive inline with messages using type-tagged paths — process them BEFORE composing any response:',
  '  [Image: /path] — use the Read tool to view it (vision). ALWAYS read before responding.',
  '  [Video: /path] — invoke the understand-video skill. Read its SKILL.md first.',
  '  [Audio: /path] — invoke the speech-to-text skill. Read its SKILL.md first.',
  '  [File: /path] — use the Read tool for text/PDF content. For binaries (zip, doc, etc.), acknowledge receipt and ask what the sender needs.',
  '  [AttachmentTooLarge: name (N MB)] — file was too large to download; tell the sender and ask them to resend at lower quality.',
  'Read the channel events guide at system/ai-config/claude-config/agent-helpers/CHANNEL_EVENTS_GUIDE.md for detailed interpretation rules.',
].join('\n')

function createMcpServer(): Server {
  const server = new Server(
    { name: 'bluebubbles', version: '0.5.0' },
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
    if (req.params.name === 'reply') {
      const { chat_id, text } = req.params.arguments as { chat_id: string; text: string }
      const sendRes = await bbPost('/api/v1/message/text', {
        chatGuid: chat_id,
        message: text,
        method: 'apple-script',
        tempGuid: randomUUID(),
      })
      // Cache our own sent message (scoped to the chat we sent it in) so future
      // threaded replies to it resolve from cache without a BB REST round-trip.
      // BB's /message/text response shape is
      //   `{ status, message, data: { guid, originalROWID, ... } }`.
      const sentGuid: string | undefined = sendRes?.data?.guid
      const sentRowid: number = sendRes?.data?.originalROWID ?? 0
      if (sentGuid) {
        cacheMessage(chat_id, sentGuid, { text, senderName: 'Marvin', rowid: sentRowid })
      }
      const ttsSettings = loadTtsSettings()
      const ttsEnabled = !!ttsSettings[chat_id]
      logger.info('reply sent', { chatId: chat_id, textLength: text.length, tts: ttsEnabled, guid: sentGuid })
      if (ttsEnabled) {
        await sendTts(chat_id, text)
      }
      return { content: [{ type: 'text', text: 'sent' }] }
    }

    if (req.params.name === 'set_tts') {
      const { chat_id, enabled } = req.params.arguments as { chat_id: string; enabled: boolean }
      const settings = loadTtsSettings()
      settings[chat_id] = enabled
      saveTtsSettings(settings)
      logger.info('TTS setting changed', { chatId: chat_id, enabled })
      return { content: [{ type: 'text', text: `TTS ${enabled ? 'enabled' : 'disabled'} for ${chat_id}` }] }
    }

    if (req.params.name === 'send_attachment') {
      const { chat_id, filename, file_path, buffer } = req.params.arguments as {
        chat_id: string; filename: string; file_path?: string; buffer?: string
      }

      let bytes: Buffer
      if (file_path) {
        bytes = readFileSync(file_path)
      } else if (buffer) {
        bytes = Buffer.from(buffer, 'base64')
      } else {
        throw new Error('send_attachment requires either file_path or buffer')
      }

      const form = new FormData()
      form.append('chatGuid', chat_id)
      form.append('tempGuid', randomUUID())
      form.append('name', filename)
      const mimeType = mimeTypeForFilename(filename)
      form.append('attachment', new Blob([bytes], { type: mimeType }), filename)

      const res = await fetchWithTimeout(
        bbPath('/api/v1/message/attachment'),
        { method: 'POST', body: form },
        BB_ATTACHMENT_TIMEOUT_MS,
      )
      if (!res.ok) throw new Error(`POST /api/v1/message/attachment → ${res.status} ${await res.text().catch(() => '')}`)
      logger.info('attachment sent', { chatId: chat_id, filename })
      return { content: [{ type: 'text', text: 'sent' }] }
    }

    throw new Error(`unknown tool: ${req.params.name}`)
  })

  return server
}

// --- Webhook handler ---------------------------------------------------------

let webhookReceived = false

function routeContextEvent(chatGuids: string[], content: string, eventType: string, sender?: string): void {
  const meta: Record<string, string> = { event_type: eventType }
  if (sender) meta.sender = resolveContact(sender)
  for (const guid of chatGuids) {
    meta.chat_id = guid
    routeEvent(guid, content, meta)
  }
}

function extractChatGuids(data: any): string[] {
  return ((data?.chats ?? []) as any[]).map((c: any) => c.guid as string).filter(Boolean)
}

// Handled event types (others are silently dropped):
//   new-message          → core message delivery (with debounce + ROWID dedup)
//   updated-message      → edits (dateEdited) and unsends (dateRetracted /
//                          messageSummaryInfo.retractedParts). BB also fires this
//                          for read-receipt/delivery-status changes, so we filter
//                          and route only actual edits/unsends as
//                          event_type='message-edited' or 'message-unsent'.
//   group-name-change    → context: chat was renamed
//   group-icon-changed   → context: chat avatar changed (BB always pairs this with a
//                          companion new-message whose attachment transferName is
//                          "GroupPhotoImage" — that carries the actual PNG bytes,
//                          detected and re-routed as event_type='group-icon-change'
//                          inside handleNewMessage. The bare group-icon-changed
//                          event is logged for observability; no route fires here.)
//   participant-added    → context: someone joined
//   participant-removed  → context: someone was removed
//   participant-left     → context: someone left
//   message-send-error   → operational: your reply failed to send

async function handleWebhook(body: any): Promise<void> {
  webhookReceived = true
  const type: string = body.type ?? ''
  const data: any = body.data

  if (!data && type !== 'hello-world') {
    logger.warn('webhook missing data field', { type })
    return
  }

  switch (type) {
    case 'new-message':
      return handleNewMessage(data)

    case 'updated-message':
      return handleUpdatedMessage(data)

    case 'group-name-change': {
      // BlueBubbles fires this with the group-event message as `data`. The new
      // name lives on `data.groupTitle` (BB message field). Older/alt payloads
      // may expose it via `newGroupName` or the chat's `displayName`.
      const chatGuids = extractChatGuids(data)
      const chatDisplayName = (data?.chats?.[0]?.displayName as string | undefined) ?? undefined
      const newName = data.groupTitle ?? data.newGroupName ?? data.displayName ?? chatDisplayName ?? 'unknown'
      const sender = (data.handle?.address ?? '').toLowerCase()
      const name = sender ? resolveContact(sender) : 'Someone'
      routeContextEvent(chatGuids, `Group renamed to "${newName}" by ${name}`, 'group-name-change', sender)
      logger.info('group name change', { newName, by: name, chats: chatGuids, rawPayload: data })
      return
    }

    case 'group-icon-changed': {
      // Companion `new-message` (with attachment transferName "GroupPhotoImage")
      // carries the actual PNG payload and is where we fire the user-visible
      // event. Log this at info for observability — if we ever see it without a
      // companion, we'll know BB's behavior changed.
      const chatGuids = extractChatGuids(data)
      const sender = (data.handle?.address ?? '').toLowerCase()
      logger.info('group icon change', { by: sender ? resolveContact(sender) : 'Someone', chats: chatGuids })
      return
    }

    case 'participant-added':
    case 'participant-removed':
    case 'participant-left': {
      // BB fires these with the group-event message as `data`. The affected
      // participant is on `data.otherHandle` (address); `data.handle` is the
      // actor who made the change.
      const chatGuids = extractChatGuids(data)
      const participant = (data.otherHandle?.address ?? data.address ?? '').toLowerCase()
      const actor = (data.handle?.address ?? '').toLowerCase()
      const participantName = participant ? resolveContact(participant) : 'Someone'
      const verb = type === 'participant-added' ? 'joined' : type === 'participant-removed' ? 'was removed from' : 'left'
      routeContextEvent(chatGuids, `${participantName} ${verb} the chat`, type, actor || participant)
      logger.info('participant change', { type, participant: participantName, actor, chats: chatGuids, rawPayload: data })
      return
    }

    case 'message-send-error': {
      const chatGuids = extractChatGuids(data)
      const errorMsg = data.message ?? data.error ?? 'Unknown error'
      const text = data.text ?? ''
      const content = text
        ? `Failed to send message "${text.slice(0, 100)}": ${errorMsg}`
        : `Message send failed: ${errorMsg}`
      routeContextEvent(chatGuids, content, 'send-error')
      logger.error('message send error', { error: errorMsg, chats: chatGuids })
      return
    }

    // Silently drop unhandled events
    case 'typing-indicator':
    case 'chat-read-status-changed':
    case 'hello-world':
      logger.debug('webhook ignored', { type })
      return

    default:
      logger.debug('webhook unknown type', { type })
      return
  }
}

async function handleNewMessage(msg: any): Promise<void> {
  // Skip messages sent by us
  if (msg.isFromMe) return

  const chats = extractChatGuids(msg)
  if (chats.length === 0) {
    logger.warn('webhook message has no chat GUIDs', { rowid: msg.originalROWID })
    return
  }

  const text: string = (msg.text ?? '').trim()
  const sender: string = (msg.handle?.address ?? '').toLowerCase()
  const rowid: number = msg.originalROWID ?? 0

  const allAtts: any[] = msg.attachments ?? []
  const hasText = text.length > 0
  const hasAttachments = allAtts.length > 0

  // Drop messages with no usable content
  if (!hasText && !hasAttachments) return

  // Group-photo-change detection:
  // BB fires a dedicated `group-icon-changed` event AND a companion new-message
  // whose only attachment has transferName="GroupPhotoImage" and no MIME type.
  // Re-route the companion as a first-class 'group-icon-change' context event so
  // downstream sessions see a proper [Image: ...] attachment instead of [File: ...bin].
  const isGroupIconChange =
    !hasText &&
    allAtts.length === 1 &&
    allAtts[0]?.transferName === 'GroupPhotoImage'

  if (isGroupIconChange) {
    const att = allAtts[0]
    if (!att.guid) {
      logger.warn('group icon change message has no attachment guid', { rowid, chats })
      return
    }
    // Force .png extension + image/png MIME so the attachment is saved
    // with the right extension and categorized as 'image' downstream.
    const result = await downloadAttachment(att.guid as string, 'GroupPhotoImage.png', 'image/png')
    if (!result.ok) {
      logger.warn('group icon change download failed', { rowid, guid: att.guid })
      return
    }
    const senderName = sender ? resolveContact(sender) : 'Someone'
    const content = `Group photo changed by ${senderName}\n[Image: ${result.path}]`
    for (const guid of chats) {
      routeEvent(guid, content, {
        chat_id: guid,
        sender: senderName,
        rowid: String(rowid),
        event_type: 'group-icon-change',
      })
    }
    logger.info('group icon change routed', { rowid, by: senderName, path: result.path, chats })
    return
  }

  // Download all attachments (all types)
  const attachments: Attachment[] = []
  if (allAtts.length > 0) {
    logger.debug('webhook attachments', {
      rowid,
      count: allAtts.length,
      types: allAtts.map((a: any) => `${a.mimeType ?? 'unknown'}:${a.transferName ?? a.guid}`),
    })
  }
  for (const att of allAtts) {
    if (!att.guid) continue
    const transferName: string = att.transferName ?? att.guid
    const resolvedMime: string = att.mimeType ?? mimeTypeForFilename(transferName)
    const result = await downloadAttachment(att.guid as string, transferName, resolvedMime)
    if (result.ok) {
      attachments.push({ kind: categorizeAttachment(result.mime), path: result.path, mime: result.mime })
    } else if (result.tooLarge) {
      attachments.push({ kind: 'too_large', name: result.name, sizeBytes: result.sizeBytes })
    }
    // Network errors already logged inside downloadAttachment — silently skip
  }

  // Thread context: BB's webhook payload includes `threadOriginatorGuid` (the
  // top-of-thread root GUID) but deliberately strips `replyToGuid` (immediate
  // parent). We use the thread-originator as the anchor — one cache lookup, no
  // per-message REST call. Resolution is chat-scoped so the same GUID in two
  // chats does a separate lookup in each.
  const threadRootGuid: string | null = (msg.threadOriginatorGuid as string | undefined) ?? null
  const selfGuid: string | null = (msg.guid as string | undefined) ?? null
  const selfSenderName = sender ? resolveContact(sender) : 'someone'

  const resolvedReplies = new Map<string, ReplyContext | undefined>()  // chatGuid → replyTo
  for (const chatGuid of chats) {
    // Cache THIS message under each chat it belongs to, so future threaded
    // replies rooted at it can resolve from cache (zero REST calls).
    if (selfGuid) cacheMessage(chatGuid, selfGuid, { text, senderName: selfSenderName, rowid })

    if (threadRootGuid) {
      const root = await lookupParent(chatGuid, threadRootGuid)
      if (root) {
        resolvedReplies.set(chatGuid, {
          guid: threadRootGuid, senderName: root.senderName, text: root.text,
        })
      } else {
        resolvedReplies.set(chatGuid, undefined)
      }
    }
  }

  // Route to each chat the message belongs to
  for (const chatGuid of chats) {
    scheduleDelivery(chatGuid, {
      text, sender, rowid, attachments,
      replyTo: resolvedReplies.get(chatGuid),
    })
  }

  logger.debug('webhook processed', {
    rowid,
    sender,
    chats,
    hasText,
    hasAttachments,
    attachmentCount: attachments.length,
    threadRootGuid: threadRootGuid ?? undefined,
    threadResolved: threadRootGuid ? [...resolvedReplies.values()].some(r => r !== undefined) : undefined,
  })
}

// Handle iOS 16+ edits and unsends. BlueBubbles emits `updated-message` for
// many things besides edits — it also fires for read-receipt / delivery-status
// changes on existing messages — so we filter on the presence of `dateEdited`,
// `dateRetracted`, or `messageSummaryInfo[0].retractedParts`.
//
// Payload shape is identical to `new-message` (same MessageSerializer). Key
// fields:
//   dateEdited                                 (ms epoch, set when user edited)
//   dateRetracted                              (ms epoch, set when fully unsent)
//   messageSummaryInfo[0].retractedParts[]     (per-part retraction, iOS 16+)
//   partCount                                  (current part count; 0 = fully
//                                               retracted on older payloads)
//   text                                       (reflects CURRENT/edited content)
//
// Note: reactions/tapbacks come through `new-message` (via
// `associatedMessageGuid`), not `updated-message`.
async function handleUpdatedMessage(msg: any): Promise<void> {
  if (msg.isFromMe) return

  const chats = extractChatGuids(msg)
  if (chats.length === 0) {
    logger.warn('updated-message has no chat GUIDs', { rowid: msg.originalROWID })
    return
  }

  const dateEdited: number | null = msg.dateEdited ?? null
  const dateRetracted: number | null = msg.dateRetracted ?? null
  const summaryInfo: any = Array.isArray(msg.messageSummaryInfo) ? msg.messageSummaryInfo[0] : null
  const retractedParts: any[] = Array.isArray(summaryInfo?.retractedParts) ? summaryInfo.retractedParts : []
  const hasRetractedParts = retractedParts.length > 0
  const partCount: number = typeof msg.partCount === 'number' ? msg.partCount : 1

  // Bail if this is a read-receipt / delivery-status update, not an actual edit/unsend
  if (!dateEdited && !dateRetracted && !hasRetractedParts) {
    logger.debug('updated-message skipped (no edit/unsend markers)', { rowid: msg.originalROWID })
    return
  }

  const sender = (msg.handle?.address ?? '').toLowerCase()
  const senderName = sender ? resolveContact(sender) : 'Someone'
  const rowid: number = msg.originalROWID ?? 0
  const text: string = (msg.text ?? '').trim()

  const isFullUnsent = dateRetracted !== null || (hasRetractedParts && partCount === 0)
  const isPartialUnsent = hasRetractedParts && partCount > 0 && !isFullUnsent
  const isEdit = dateEdited !== null && !isFullUnsent

  let content: string
  let eventType: 'message-edited' | 'message-unsent'

  if (isFullUnsent) {
    content = `${senderName} unsent a message`
    eventType = 'message-unsent'
  } else if (isEdit && isPartialUnsent) {
    content = text
      ? `${senderName} edited a message and unsent part of it — current text: "${text}"`
      : `${senderName} edited and partially unsent a message`
    eventType = 'message-edited'
  } else if (isEdit) {
    content = text
      ? `${senderName} edited their message to: "${text}"`
      : `${senderName} edited a message`
    eventType = 'message-edited'
  } else if (isPartialUnsent) {
    content = text
      ? `${senderName} unsent part of a message (remaining: "${text}")`
      : `${senderName} unsent part of a message`
    eventType = 'message-unsent'
  } else {
    return
  }

  // Thread context for edits/unsends: if the edited message itself was in a
  // thread, surface the thread-root context. Same reason as handleNewMessage:
  // BB webhooks include threadOriginatorGuid, not replyToGuid.
  const threadRootGuid: string | null = (msg.threadOriginatorGuid as string | undefined) ?? null

  for (const chatGuid of chats) {
    let replyTo: ReplyContext | undefined
    if (threadRootGuid) {
      const root = await lookupParent(chatGuid, threadRootGuid)
      if (root) replyTo = { guid: threadRootGuid, senderName: root.senderName, text: root.text }
    }
    const finalContent = replyTo ? `${formatReplyPrefix(replyTo)}\n${content}` : content
    routeEvent(chatGuid, finalContent, {
      chat_id: chatGuid,
      sender: senderName,
      rowid: String(rowid),
      event_type: eventType,
      ...replyMeta(replyTo),
    })
  }

  logger.info('message update routed', { rowid, by: senderName, eventType, chats, threadRootGuid: threadRootGuid ?? undefined })
}

// Warn if no webhook received within 60s of startup
setTimeout(() => {
  if (!webhookReceived) {
    logger.warn('no webhook received after 60s — is the BlueBubbles webhook configured? URL should be http://127.0.0.1:' + BB_HTTP_PORT + '/webhook')
  }
}, 60_000)

// --- HTTP server -------------------------------------------------------------

const httpServer = http.createServer(async (req, res) => {
  if (!req.url) { res.writeHead(400); res.end(); return }
  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname

  // Health check
  if (pathname === '/health' && req.method === 'GET') {
    const sessionList = [...sessions.entries()].map(([sid, s]) => ({ sid, filter: s.filterDesc }))
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      ok: true,
      mode: 'webhook',
      webhookReceived,
      sessions: sessions.size,
      sessionList,
    }) + '\n')
    return
  }

  // Webhook endpoint — receives BlueBubbles POST events
  if (pathname === '/webhook' && req.method === 'POST') {
    let rawBody = ''
    req.on('data', (chunk: Buffer) => { rawBody += chunk.toString() })
    req.on('end', async () => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}\n')
      try {
        const body = JSON.parse(rawBody)
        await handleWebhook(body)
      } catch (err) {
        logger.error('webhook parse/handle error', { err: String(err) })
      }
    })
    return
  }

  // MCP endpoint — filter derived from query params
  if (pathname === '/mcp') {
    const existingSid = req.headers['mcp-session-id'] as string | undefined
    const existing = existingSid ? sessions.get(existingSid) : undefined
    let transport = existing?.transport

    if (!transport) {
      const filter = parseFilter(url)
      const filterDesc = [
        filter.allowChats ? `allow:${filter.allowChats.join(',')}` : null,
        filter.denyChats.size > 0 ? `deny:${[...filter.denyChats].join(',')}` : null,
      ].filter(Boolean).join(' ') || 'all'

      // New session — create transport + server, connect them, track state
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid: string) => {
          sessions.set(sid, { transport: transport!, server, filter, filterDesc })
          logger.info('session init', { sid, filter: filterDesc, activeSessions: sessions.size })
        },
      })
      transport.onclose = () => {
        if (transport!.sessionId) {
          sessions.delete(transport!.sessionId)
          logger.info('session closed', { sid: transport!.sessionId, filter: filterDesc, reason: 'transport close', activeSessions: sessions.size })
        }
      }
      const server = createMcpServer()
      await server.connect(transport)
    }

    await transport.handleRequest(req, res)
    return
  }

  res.writeHead(404)
  res.end('not found\n')
})

httpServer.listen(BB_HTTP_PORT, '127.0.0.1', () => {
  logger.info('listening', {
    port: BB_HTTP_PORT,
    mode: 'webhook',
    debounceMs: BB_DEBOUNCE_MS === 0 ? 'disabled' : BB_DEBOUNCE_MS,
    maxAttachmentMb: Math.round(BB_MAX_ATTACHMENT_BYTES / (1024 * 1024)),
    attachmentsBudgetMb: Math.round(ATTACHMENTS_MAX_TOTAL_BYTES / (1024 * 1024)),
    mcpEndpoint: `http://127.0.0.1:${BB_HTTP_PORT}/mcp`,
    webhookEndpoint: `http://127.0.0.1:${BB_HTTP_PORT}/webhook`,
    logFile: LOG_FILE,
  })
})

// --- Shutdown ----------------------------------------------------------------

const shutdown = (signal: string): void => {
  logger.info('shutdown', { signal })
  for (const entry of pending.values()) clearTimeout(entry.timer)
  pending.clear()
  for (const [sid] of sessions) closeSession(sid, 'shutdown')
  httpServer.close()
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
