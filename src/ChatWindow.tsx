import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import { ScrollArea } from "@/components/ui/scroll-area"
import { LinkPreview } from './LinkPreview'

export const ChatWindow = ({ messages }: {
  messages: { role: string, content: string }[]
}): JSX.Element => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [displayMessages, setDisplayMessages] = useState(messages)
  const [visible, setVisible] = useState(messages.length > 0)

  useEffect(() => {
    if (messages.length > 0) {
      setDisplayMessages(messages)
      setVisible(true)
    } else if (displayMessages.length > 0) {
      setVisible(false)
      const timer = setTimeout(() => setDisplayMessages([]), 300)
      return () => clearTimeout(timer)
    }
  }, [messages])

  // Scroll to bottom only on optimistic render (loading indicator present)
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last?.role === 'loading') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Group into turns: each starts with a user message, followed by responses
  const turns: { role: string; content: string }[][] = []
  for (const message of displayMessages) {
    if (message.role === 'user' || turns.length === 0) {
      turns.push([message])
    } else {
      turns[turns.length - 1].push(message)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className={`px-4 pt-16 pb-24 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {turns.map((turn, ti) => (
          <div key={ti} className="chat-turn">
            <ul className="chat-messages">
              {turn.map((message, mi) => (
                <li key={mi} className={message.role}>
                  <ReactMarkdown components={{
                    a: ({ href, children }) => href
                      ? <LinkPreview href={href}>{children}</LinkPreview>
                      : <>{children}</>
                  }}>{message.content.toString()}</ReactMarkdown>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
