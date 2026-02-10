import type { JSX } from 'react'
export const ChatWindow = ({ messages }: {
  messages: { role: string, content: string }[]
}): JSX.Element => {
  let keys = 0
  const messageElements = messages.map(message => {
    return <li key={keys++} className={message.role}>{message.content.toString()}</li>
  })
  return (
    <div className="chat-window"><ul>{messageElements}</ul></div>
  )
}