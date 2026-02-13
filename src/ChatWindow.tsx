import { useEffect, useRef } from 'react'
import type { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import { ScrollArea } from "@/components/ui/scroll-area"

export const ChatWindow = ({ messages }: {
  messages: { role: string, content: string }[]
}): JSX.Element => {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom only on optimistic render (loading indicator present)
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last?.role === 'loading') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Group into turns: each starts with a user message, followed by responses
  const turns: { role: string; content: string }[][] = []
  for (const message of messages) {
    if (message.role === 'user' || turns.length === 0) {
      turns.push([message])
    } else {
      turns[turns.length - 1].push(message)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="px-4 pt-16 pb-24">
        {turns.map((turn, ti) => (
          <div key={ti} className="chat-turn">
            <ul className="chat-messages">
              {turn.map((message, mi) => (
                <li key={mi} className={message.role}>
                  <ReactMarkdown>{message.content.toString()}</ReactMarkdown>
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
