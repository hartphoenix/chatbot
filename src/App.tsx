import { useState, useEffect, useRef, useCallback } from "react"
import { ChatWindow } from './ChatWindow'
import { InputForm } from './InputForm'
import { ApprovalCard } from './ApprovalCard'
import { ChatDrawer } from './ChatDrawer'

export type DisplayMessage =
  | { type: 'user'; content: string }
  | { type: 'assistant'; content: string; parentId?: string | null }
  | { type: 'tool_use'; toolName: string; toolUseId: string; input: string; parentId?: string | null }
  | { type: 'tool_result'; toolUseId: string; result: string }
  | { type: 'loading' }

export type ApprovalRequest = {
  toolUseID: string
  toolName: string
  input: Record<string, unknown>
}

export default function App() {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const textBufferRef = useRef('')
  const toolInputBufferRef = useRef<Map<string, string>>(new Map())
  const activeToolRef = useRef<string | null>(null)

  // Flush accumulated text into a message
  const flushText = useCallback(() => {
    if (textBufferRef.current) {
      const text = textBufferRef.current
      textBufferRef.current = ''
      setMessages(prev => {
        // If last message is assistant text, append to it
        const last = prev[prev.length - 1]
        if (last?.type === 'assistant') {
          return [...prev.slice(0, -1), { ...last, content: last.content + text }]
        }
        return [...prev, { type: 'assistant', content: text }]
      })
    }
  }, [])

  // Load session state on mount
  const loadSession = useCallback(async (sessionId?: string) => {
    const url = sessionId ? `/api/sessions/${sessionId}/messages` : '/api/session'
    const res = await fetch(url)
    const data = await res.json()
    setMessages(data.messages?.length ? data.messages as DisplayMessage[] : [])
    if (data.sessionId) setActiveSessionId(data.sessionId)
  }, [])

  useEffect(() => { loadSession() }, [loadSession])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'status':
          if (data.status === 'started') {
            setIsStreaming(true)
            // Remove loading indicator
            setMessages(prev => prev.filter(m => m.type !== 'loading'))
          } else if (data.status === 'done') {
            setIsStreaming(false)
            flushText()
          }
          break

        case 'text_delta': {
          const pid = data.parentId ?? null
          textBufferRef.current += data.text
          // Debounced flush via requestAnimationFrame for smooth rendering
          requestAnimationFrame(() => {
            if (textBufferRef.current) {
              const text = textBufferRef.current
              textBufferRef.current = ''
              setMessages(prev => {
                const last = prev[prev.length - 1]
                if (last?.type === 'assistant' && (last.parentId ?? null) === pid) {
                  return [...prev.slice(0, -1), { ...last, content: last.content + text }]
                }
                return [...prev, { type: 'assistant', content: text, parentId: pid }]
              })
            }
          })
          break
        }

        case 'assistant_text':
          flushText()
          setMessages(prev => [...prev, { type: 'assistant', content: data.text }])
          break

        case 'tool_start':
          flushText()
          activeToolRef.current = data.toolUseId
          toolInputBufferRef.current.set(data.toolUseId, '')
          setMessages(prev => [...prev, {
            type: 'tool_use',
            toolName: data.toolName,
            toolUseId: data.toolUseId,
            input: '',
            parentId: data.parentId ?? null,
          }])
          break

        case 'tool_input_delta': {
          const activeId = activeToolRef.current
          if (activeId) {
            const buf = toolInputBufferRef.current
            buf.set(activeId, (buf.get(activeId) || '') + data.json)
            const currentInput = buf.get(activeId) || ''
            setMessages(prev => prev.map(m =>
              m.type === 'tool_use' && m.toolUseId === activeId
                ? { ...m, input: currentInput }
                : m
            ))
          }
          break
        }

        case 'tool_use':
          flushText()
          activeToolRef.current = null
          setMessages(prev => [...prev, {
            type: 'tool_use',
            toolName: data.toolName,
            toolUseId: data.toolUseId,
            input: JSON.stringify(data.input, null, 2),
          }])
          break

        case 'tool_result':
          activeToolRef.current = null
          setMessages(prev => [...prev, {
            type: 'tool_result',
            toolUseId: data.toolUseId,
            result: typeof data.result === 'string'
              ? data.result
              : JSON.stringify(data.result, null, 2),
          }])
          break

        case 'approval_request':
          setApprovals(prev => [...prev, {
            toolUseID: data.toolUseID,
            toolName: data.toolName,
            input: data.input,
          }])
          break

        case 'session_registered':
          setActiveSessionId(data.sessionId)
          break

        case 'result':
          flushText()
          break

        case 'error':
          setIsStreaming(false)
          setMessages(prev => [...prev, {
            type: 'assistant',
            content: `**Error:** ${data.message}`,
          }])
          break
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setIsStreaming(false)
    }

    return () => ws.close()
  }, [flushText])

  const sendMessage = (content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    setMessages(prev => [...prev, { type: 'user', content }, { type: 'loading' }])
    wsRef.current.send(JSON.stringify({ type: 'user_message', content }))
  }

  const switchSession = async (sessionId: string) => {
    await fetch(`/api/sessions/${sessionId}/activate`, { method: 'POST' })
    setActiveSessionId(sessionId)
    setApprovals([])
    await loadSession(sessionId)
    // Notify server via WS
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'switch_session', sessionId }))
    }
  }

  const newSession = async () => {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'new session' }),
    })
    const entry = await res.json()
    setActiveSessionId(entry.sessionId || null)
    setMessages([])
    setApprovals([])
  }

  const handleApproval = (toolUseID: string, approved: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    const req = approvals.find(a => a.toolUseID === toolUseID)
    wsRef.current.send(JSON.stringify({
      type: 'approval_response',
      toolUseID,
      approved,
      input: req?.input,
    }))
    setApprovals(prev => prev.filter(a => a.toolUseID !== toolUseID))
  }

  return (
    <div className="h-screen relative max-w-3xl mx-auto">
      <header className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-[oklch(0.25_0.04_265_/_0.7)] backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChatDrawer
            activeSessionId={activeSessionId}
            onSwitchSession={switchSession}
            onNewSession={newSession}
          />
          <h1 className="text-2xl text-foreground/80" style={{ fontFamily: "'Itim', cursive" }}>mAIstro</h1>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${isStreaming ? 'bg-green-900/50 text-green-400' : 'text-muted-foreground'}`}>
          {isStreaming ? 'streaming' : 'idle'}
        </span>
      </header>
      <ChatWindow messages={messages} />
      {approvals.length > 0 && (
        <div className="absolute bottom-20 left-0 right-0 z-50 px-4 flex flex-col gap-2">
          {approvals.map(a => (
            <ApprovalCard
              key={a.toolUseID}
              toolName={a.toolName}
              input={a.input}
              onApprove={() => handleApproval(a.toolUseID, true)}
              onDeny={() => handleApproval(a.toolUseID, false)}
            />
          ))}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <InputForm sendMessage={sendMessage} isStreaming={isStreaming} />
      </div>
    </div>
  )
}
