import type { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
export const ChatWindow = ({ messages }: {
  messages: { role: string, content: string }[]
}): JSX.Element => {
  console.log('ChatWindow component rendered')
  const messageElements = messages.map((message, index) => {
    return <li key={index} className={message.role}>
      <ReactMarkdown>
        {message.content.toString()}
      </ReactMarkdown>
    </li>
  })
  return (
    <div className="chat-window"><ul>{messageElements}</ul></div>
  )
}