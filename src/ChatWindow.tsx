import type { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import { ScrollArea } from "@/components/ui/scroll-area"

export const ChatWindow = ({ messages }: {
  messages: { role: string, content: string }[]
}): JSX.Element => {
  const messageElements = messages.map((message, index) => {
    const isUser = message.role === 'user'
    const isLoading = message.role === 'loading'
    return (
      <li key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : isLoading
              ? 'bg-muted text-muted-foreground italic'
              : 'bg-secondary text-secondary-foreground'
        }`}>
          <ReactMarkdown>{message.content.toString()}</ReactMarkdown>
        </div>
      </li>
    )
  })
  return (
    <ScrollArea className="flex-1 rounded-md border p-4">
      <ul className="flex flex-col gap-3">{messageElements}</ul>
    </ScrollArea>
  )
}
