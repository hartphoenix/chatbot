import { useState, useEffect } from "react"
import { ChatWindow } from './ChatWindow'

export default function App() {
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([])

  useEffect(() => {
    const getHistory = async () => {
      const response = await fetch('/history')
      const history: { role: string, content: string }[] = await response.json()
      setMessages(history)
    }
    getHistory()
  }, [])

  const chat = async (formData: FormData) => {
    const newMessage = formData.get("input")
    const msgBody = JSON.stringify({ content: newMessage })
    console.log("input: ", newMessage)
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
  return (
    <>
      <h1>Amadeus</h1>
      <ChatWindow messages={messages} />

      <form action={chat}>
        <input type="text" placeholder="Hey Amadeus," name="input" />
        <button type="submit">say it</button>
      </form>
    </>
  )
}
