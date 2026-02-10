import { useState, useEffect, useRef } from "react"
import { ChatWindow } from './ChatWindow'
import { InputForm } from './InputForm'

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

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Amadeus</h1>
      <ChatWindow messages={messages} />
      <InputForm
        setMessages={setMessages}
        formRef={formRef} />
    </div>
  )
}
