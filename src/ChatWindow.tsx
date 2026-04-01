import { useEffect, useRef, useCallback, useState } from 'react'
import type { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import type { DisplayMessage } from './App'
import { ShrinkwrapBubble } from './ShrinkwrapBubble'
import { ToolCard } from './ToolCard'

// Font specs matching CSS — Pretext needs these to match the rendered font
const USER_FONT = '500 15.2px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const ASSISTANT_FONT = '14.4px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

export const ChatWindow = ({ messages }: {
  messages: DisplayMessage[]
}): JSX.Element => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const userIsNearBottom = useRef(true)
  const [containerWidth, setContainerWidth] = useState(600)

  // Observe container width for Pretext calculations
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 600
      setContainerWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 120
    userIsNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }, [])

  useEffect(() => {
    if (userIsNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Max bubble width: 85% of container minus padding
  const bubbleMax = Math.floor((containerWidth - 32) * 0.85)

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto"
      onScroll={onScroll}
    >
      <div ref={contentRef} className="px-4 pt-16 pb-24">
        {messages.map((message, i) => {
          switch (message.type) {
            case 'user':
              return (
                <div key={i} className="chat-turn">
                  <ul className="chat-messages">
                    <ShrinkwrapBubble
                      text={message.content}
                      font={USER_FONT}
                      lineHeight={1.5}
                      maxWidth={bubbleMax}
                      className="user-bubble"
                    >
                      <li className="user">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </li>
                    </ShrinkwrapBubble>
                  </ul>
                </div>
              )
            case 'assistant':
              return (
                <div key={i} className={`chat-turn ${message.parentId ? 'subagent' : ''}`}>
                  {message.parentId && <div className="subagent-label">subagent</div>}
                  <ul className="chat-messages">
                    <ShrinkwrapBubble
                      text={plainTextFromMarkdown(message.content)}
                      font={ASSISTANT_FONT}
                      lineHeight={1.65}
                      maxWidth={bubbleMax}
                      className="assistant-bubble"
                    >
                      <li className="assistant">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </li>
                    </ShrinkwrapBubble>
                  </ul>
                </div>
              )
            case 'tool_use':
              return (
                <ToolCard
                  key={i}
                  toolName={message.toolName}
                  input={message.input}
                  parentId={message.parentId}
                  variant="use"
                />
              )
            case 'tool_result':
              return (
                <ToolCard
                  key={i}
                  toolName=""
                  input={message.result}
                  variant="result"
                />
              )
            case 'loading':
              return (
                <div key={i} className="chat-turn">
                  <ul className="chat-messages">
                    <li className="loading">(thinking...)</li>
                  </ul>
                </div>
              )
          }
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// Strip markdown syntax to get approximate plain text for measurement.
// Pretext measures raw text; markdown formatting adds DOM elements
// but the text content is what determines line breaks.
function plainTextFromMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, '')        // headers
    .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
    .replace(/\*(.+?)\*/g, '$1')      // italic
    .replace(/`(.+?)`/g, '$1')        // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/^[-*+]\s+/gm, '')       // list bullets
    .replace(/^\d+\.\s+/gm, '')       // numbered lists
}

