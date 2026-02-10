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
    <div className="h-screen relative max-w-3xl mx-auto">
      <header className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-[oklch(0.25_0.04_265_/_0.7)] backdrop-blur-md">
        <h1 className="text-lg font-medium text-foreground/80">mAIstro</h1>
      </header>
      <ChatWindow messages={messages} />
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <InputForm
          setMessages={setMessages}
          formRef={formRef} />
      </div>
    </div>
  )
}
