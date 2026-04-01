import express from 'express'
import type { Express } from 'express'
import ViteExpress from 'vite-express'
import { query, listSessions, getSessionMessages, getSessionInfo } from '@anthropic-ai/claude-agent-sdk'
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import 'dotenv/config'

// --- Session registry (persisted to disk) ---

type SessionEntry = {
  sessionId: string
  title: string
  cwd: string
  branch: string
  status: 'idle' | 'streaming' | 'needs_input'
  createdAt: number
}

const SESSIONS_FILE = path.join(process.cwd(), '.app-sessions.json')

function loadSessions(): SessionEntry[] {
  try { return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')) }
  catch { return [] }
}

function saveSessions(sessions: SessionEntry[]) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8')
}

function getGitBranch(cwd: string): string {
  try { return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim() }
  catch { return '—' }
}

let sessions = loadSessions()
let activeSessionId: string | null = sessions[0]?.sessionId ?? null

// Backfill registry from SDK sessions on disk (catches sessions created before the registry)
async function backfillSessions() {
  try {
    const dir = process.cwd()
    const sdkSessions = await listSessions({ dir, limit: 20 })
    const knownIds = new Set(sessions.map(s => s.sessionId))
    let added = false

    for (const s of sdkSessions) {
      if (knownIds.has(s.sessionId)) continue
      const ts = s.createdAt || s.lastModified || Date.now()
      const timeStr = new Date(ts).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
      const snippet = s.firstPrompt?.slice(0, 30).replace(/\s+/g, ' ').trim() || ''
      sessions.push({
        sessionId: s.sessionId,
        title: s.customTitle || (snippet ? `${timeStr} — ${snippet}` : timeStr),
        cwd: s.cwd || dir,
        branch: s.gitBranch || getGitBranch(dir),
        status: 'idle',
        createdAt: ts,
      })
      added = true
    }

    if (added) {
      sessions.sort((a, b) => b.createdAt - a.createdAt)
      saveSessions(sessions)
      if (!activeSessionId && sessions.length) {
        activeSessionId = sessions[0].sessionId
      }
      console.log(`Backfilled ${sdkSessions.length - knownIds.size} sessions from disk`)
    }
  } catch (err) {
    console.error('Session backfill error:', err)
  }
}

backfillSessions()

// --- Express setup ---

const app: Express = express()
app.use(express.json())

// List all app sessions (for drawer)
app.get('/api/sessions', (_req, res) => {
  res.json({ sessions, activeSessionId })
})

// Create a new session
app.post('/api/sessions', (req, res) => {
  const title = (req.body.title as string) || 'new session'
  const cwd = process.cwd()
  // Session ID will be assigned by the SDK on first query — use a placeholder
  const entry: SessionEntry = {
    sessionId: '',  // filled on first query
    title,
    cwd,
    branch: getGitBranch(cwd),
    status: 'idle',
    createdAt: Date.now(),
  }
  sessions.unshift(entry)
  saveSessions(sessions)
  activeSessionId = ''  // will be filled on first message
  res.json(entry)
})

// Switch active session
app.post('/api/sessions/:id/activate', (req, res) => {
  const target = sessions.find(s => s.sessionId === req.params.id)
  if (!target) return res.status(404).json({ error: 'Session not found' })
  activeSessionId = target.sessionId
  res.json({ activeSessionId })
})

// Load messages for a specific session
app.get('/api/sessions/:id/messages', async (req, res) => {
  try {
    const dir = process.cwd()
    const raw = await getSessionMessages(req.params.id, { dir })
    const messages = convertMessages(raw)
    res.json({ messages })
  } catch (err) {
    console.error('Session messages error:', err)
    res.json({ messages: [] })
  }
})

// Load active session's messages
app.get('/api/session', async (_req, res) => {
  try {
    if (!activeSessionId) {
      return res.json({ messages: [], sessionId: null })
    }
    const dir = process.cwd()
    const raw = await getSessionMessages(activeSessionId, { dir })
    const messages = convertMessages(raw)
    res.json({ messages, sessionId: activeSessionId })
  } catch (err) {
    console.error('Session load error:', err)
    res.json({ messages: [], sessionId: null })
  }
})

type RawSessionMessage = { type: string; parent_tool_use_id?: string | null; message?: unknown; tool_use_result?: unknown }

function convertMessages(raw: RawSessionMessage[]) {
  const messages: Array<{ type: string; content?: string; toolName?: string; toolUseId?: string; input?: string; result?: string; parentId?: string | null }> = []

  for (const msg of raw) {
    const parentId = msg.parent_tool_use_id ?? null
    if (msg.type === 'assistant') {
      const content = (msg.message as { content?: unknown[] })?.content
      if (!content) continue
      for (const block of content as Array<{ type: string; text?: string; name?: string; id?: string; input?: unknown }>) {
        if (block.type === 'text' && block.text) {
          messages.push({ type: 'assistant', content: block.text, parentId })
        } else if (block.type === 'tool_use') {
          messages.push({
            type: 'tool_use',
            toolName: block.name,
            toolUseId: block.id,
            input: JSON.stringify(block.input, null, 2),
            parentId,
          })
        }
      }
    } else if (msg.type === 'user') {
      const content = (msg.message as { content?: unknown })?.content
      if (typeof content === 'string') {
        messages.push({ type: 'user', content })
      } else if (Array.isArray(content)) {
        for (const block of content as Array<{ type: string; text?: string; tool_use_id?: string; content?: unknown }>) {
          if (block.type === 'text' && block.text) {
            messages.push({ type: 'user', content: block.text })
          } else if (block.type === 'tool_result') {
            const resultText = typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content, null, 2)
            messages.push({
              type: 'tool_result',
              toolUseId: block.tool_use_id,
              result: resultText,
            })
          }
        }
      }
    }
  }

  return messages
}

// --- WebSocket ---

const server = http.createServer(app)
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  }
})

type PendingApproval = {
  resolve: (result: { behavior: 'allow' | 'deny'; updatedInput?: Record<string, unknown>; message?: string }) => void
}
const pendingApprovals = new Map<string, PendingApproval>()

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected')

  const send = (data: unknown) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  ws.on('message', async (raw: Buffer) => {
    let msg: { type: string; [key: string]: unknown }
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    // Handle approval responses
    if (msg.type === 'approval_response') {
      const id = msg.toolUseID as string
      const pending = pendingApprovals.get(id)
      if (pending) {
        pendingApprovals.delete(id)
        if (msg.approved) {
          pending.resolve({ behavior: 'allow', updatedInput: msg.input as Record<string, unknown> })
        } else {
          pending.resolve({ behavior: 'deny', message: 'User denied this action' })
        }
      }
      return
    }

    // Handle session switch
    if (msg.type === 'switch_session') {
      activeSessionId = msg.sessionId as string
      send({ type: 'session_switched', sessionId: activeSessionId })
      return
    }

    // Handle user messages
    if (msg.type === 'user_message') {
      const prompt = msg.content as string
      if (!prompt) return

      // Update session status
      const entry = sessions.find(s => s.sessionId === activeSessionId || s.sessionId === '')
      if (entry) {
        entry.status = 'streaming'
        saveSessions(sessions)
      }

      send({ type: 'status', status: 'started' })

      try {
        for await (const message of query({
          prompt,
          options: {
            tools: { type: 'preset', preset: 'claude_code' },
            systemPrompt: { type: 'preset', preset: 'claude_code' },
            settingSources: ['user', 'project', 'local'],
            permissionMode: 'default',
            model: 'claude-sonnet-4-6',
            maxTurns: 30,
            includePartialMessages: true,
            cwd: process.cwd(),
            resume: activeSessionId || undefined,

            canUseTool: async (toolName, input, options) => {
              // Update status to needs_input
              const e = sessions.find(s => s.sessionId === activeSessionId)
              if (e) { e.status = 'needs_input'; saveSessions(sessions) }

              const toolUseID = options.toolUseID
              send({
                type: 'approval_request',
                toolUseID,
                toolName,
                input,
              })

              return new Promise((resolve) => {
                pendingApprovals.set(toolUseID, { resolve })
                setTimeout(() => {
                  if (pendingApprovals.has(toolUseID)) {
                    pendingApprovals.delete(toolUseID)
                    resolve({ behavior: 'deny', message: 'Approval timed out' })
                  }
                }, 5 * 60 * 1000)
              })
            },
          },
        })) {
          const parentId = (message as { parent_tool_use_id?: string | null }).parent_tool_use_id ?? null

          if (message.type === 'stream_event') {
            const event = (message as { event?: { type: string; delta?: { type: string; text?: string; partial_json?: string }; content_block?: { type: string; name?: string; id?: string } } }).event
            if (!event) continue

            if (event.type === 'content_block_start') {
              const cb = event.content_block
              if (cb?.type === 'tool_use') {
                send({ type: 'tool_start', toolName: cb.name, toolUseId: cb.id, parentId })
              }
            } else if (event.type === 'content_block_delta') {
              const delta = event.delta
              if (delta?.type === 'text_delta' && delta.text) {
                send({ type: 'text_delta', text: delta.text, parentId })
              } else if (delta?.type === 'input_json_delta' && delta.partial_json) {
                send({ type: 'tool_input_delta', json: delta.partial_json, parentId })
              }
            }
          } else if (message.type === 'user') {
            const m = message as { tool_use_result?: unknown; message?: { content?: unknown[] } }
            if (m.tool_use_result !== undefined) {
              const content = m.message?.content
              if (content) {
                for (const block of content) {
                  const b = block as { type: string; tool_use_id?: string; content?: unknown }
                  if (b.type === 'tool_result') {
                    send({ type: 'tool_result', toolUseId: b.tool_use_id, result: b.content })
                  }
                }
              }
            }
          } else if (message.type === 'system' && (message as { subtype?: string }).subtype === 'init') {
            const newId = (message as { session_id: string }).session_id
            // Update existing entry or auto-create one
            let entry = sessions.find(s => s.sessionId === activeSessionId || s.sessionId === '')
            const makeTitle = (p: string) => {
              const timeStr = new Date().toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })
              const snippet = p.slice(0, 30).replace(/\s+/g, ' ').trim()
              return snippet ? `${timeStr} — ${snippet}` : timeStr
            }

            if (entry) {
              entry.sessionId = newId
              entry.status = 'streaming'
              entry.branch = getGitBranch(entry.cwd)
              if (entry.title === 'new session') {
                entry.title = makeTitle(prompt)
              }
            } else {
              const cwd = process.cwd()
              entry = {
                sessionId: newId,
                title: makeTitle(prompt),
                cwd,
                branch: getGitBranch(cwd),
                status: 'streaming',
                createdAt: Date.now(),
              }
              sessions.unshift(entry)
            }
            saveSessions(sessions)
            activeSessionId = newId
            send({ type: 'session_registered', sessionId: newId })
          } else if (message.type === 'result') {
            const result = message as { subtype?: string; result?: string; total_cost_usd?: number; session_id?: string }
            if (result.session_id) activeSessionId = result.session_id
            send({
              type: 'result',
              subtype: result.subtype,
              result: result.result,
              cost: result.total_cost_usd,
            })
          }
        }
      } catch (err) {
        send({ type: 'error', message: String(err) })
      }

      // Update status back to idle
      const doneEntry = sessions.find(s => s.sessionId === activeSessionId)
      if (doneEntry) { doneEntry.status = 'idle'; saveSessions(sessions) }

      send({ type: 'status', status: 'done' })
    }
  })

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

const port = process.env.PORT || 3000
ViteExpress.bind(app, server)
server.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
