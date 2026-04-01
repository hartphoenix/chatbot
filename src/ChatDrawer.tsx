import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer'

type SessionEntry = {
  sessionId: string
  title: string
  cwd: string
  branch: string
  status: 'idle' | 'streaming' | 'needs_input'
  createdAt: number
}

type ChatDrawerProps = {
  activeSessionId: string | null
  onSwitchSession: (sessionId: string) => void
  onNewSession: () => void
}

export const ChatDrawer = ({ activeSessionId, onSwitchSession, onNewSession }: ChatDrawerProps) => {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [drawerWidth, setDrawerWidth] = useState(300)
  const dragging = useRef(false)

  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/sessions')
    const data = await res.json()
    setSessions(data.sessions)
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    const startX = e.clientX
    const startW = drawerWidth
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setDrawerWidth(Math.max(220, Math.min(500, startW + (e.clientX - startX))))
    }
    const onUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [drawerWidth])

  const statusDot = (s: string) => (
    <span className={`session-dot ${s === 'streaming' ? 'streaming' : s === 'needs_input' ? 'needs-input' : 'idle'}`} />
  )
  const statusText = (s: string) => s === 'streaming' ? 'Running' : s === 'needs_input' ? 'Needs input' : 'Idle'
  const dirName = (cwd: string) => cwd.split('/').pop() || cwd

  return (
    <Drawer direction="left" handleOnly={true} onOpenChange={(open) => { if (open) fetchSessions() }}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm">sessions</Button>
      </DrawerTrigger>
      <DrawerContent style={{ width: drawerWidth, maxWidth: drawerWidth }}>
        <DrawerHeader>
          <DrawerTitle className="text-foreground/70 text-xl" style={{ fontFamily: "'Itim', cursive" }}>
            workspaces
          </DrawerTitle>
          <DrawerDescription className="sr-only">Agent sessions</DrawerDescription>
        </DrawerHeader>

        <div className="drawer-list">
          <DrawerClose asChild>
            <Button variant="default" className="w-full bg-primary/70 hover:bg-primary/80 mb-1" onClick={onNewSession}>
              + new session
            </Button>
          </DrawerClose>

          {sessions.map(s => (
            <DrawerClose key={s.sessionId || s.createdAt} asChild>
              <button
                className={`s-chip ${s.sessionId === activeSessionId ? 'active' : ''}`}
                onClick={() => s.sessionId && onSwitchSession(s.sessionId)}
              >
                <div className="s-chip-title">{s.title || '(untitled)'}</div>
                <div className="s-chip-row">{statusDot(s.status)} <span className={`s-chip-status ${s.status}`}>{statusText(s.status)}</span></div>
                <div className="s-chip-row"><span className="s-chip-icon">⑂</span> {s.branch}</div>
                <div className="s-chip-row"><span className="s-chip-icon">📁</span> {dirName(s.cwd)}</div>
              </button>
            </DrawerClose>
          ))}
        </div>

        {/* Resize handle on right edge */}
        <div className="drawer-resize" onMouseDown={onMouseDown} />
      </DrawerContent>
    </Drawer>
  )
}
