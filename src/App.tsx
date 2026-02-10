import { useState, useEffect, useRef } from "react"
import { ChatWindow } from './ChatWindow'

export default function App() {
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([])
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const getHistory = async () => {
      const response = await fetch('/history')
      const history: { role: string, content: string }[] = await response.json()
      setMessages(history)
    }
    getHistory()
  }, [])

  const chat = (formData: FormData) => {
    const newMessage = formData.get("input")
    if (!newMessage) return
    setMessages(prev => [...prev,
    { role: 'user', content: newMessage as string },
    { role: 'loading', content: '(cogitating...)' }
    ])
    formRef.current?.reset()
    const msgBody = JSON.stringify({ content: newMessage })
    console.log("input: ", newMessage)
    const sendChat = async () => {
      const response = await fetch('/chat', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: msgBody
      })
      const fullChat = await response.json()
      setMessages(fullChat)
    }
    sendChat()
  }

  const reset = async () => {
    const conf = confirm("Erase chat history and start over?")
    if (conf) {
      await fetch('/reset', { method: 'DELETE' })
      setMessages([])
    } else { console.log("User canceled reset request") }
  }

  return (
    <>
      <h1>Amadeus</h1>
      <ChatWindow messages={messages} />

      <form ref={formRef} action={chat}>
        <input type="text" placeholder="Hey Amadeus," name="input" />
        <button type="submit">say it</button><button type="reset" onClick={reset} >erase all</button>
      </form>
    </>
  )
}
