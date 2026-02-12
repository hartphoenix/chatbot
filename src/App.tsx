import { useState, useEffect, useRef } from "react"
import { ChatWindow } from './ChatWindow'
import { InputForm } from './InputForm'
import { ChatDrawer } from './ChatDrawer'
import type { Conversation } from '../storage'

export type DisplayMessage = { role: 'user' | 'assistant' | 'loading', content: string }
export type Chat = Omit<Conversation, 'messages'> & { messages: DisplayMessage[] }

const emptyChat: Chat = {
  id: "",
  created: 0,
  latest: 0,
  messages: []
}

export default function App() {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<Chat>(emptyChat)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const getAllChats = async () => {
      const response = await fetch('/chats')
      const allChats: Chat[] = await response.json()
      setChats(allChats)
    }
    getAllChats()
  }, [])

  const reset = async () => {
    await fetch(`/chats/${activeChat.id}`, { method: 'DELETE' })
    setActiveChat(emptyChat)
    const getAllChats = async () => {
      const response = await fetch('/chats')
      const allChats: Chat[] = await response.json()
      setChats(allChats)
    }
    getAllChats()
  }

  return (
    <div className="h-screen relative max-w-3xl mx-auto">
      <header className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-[oklch(0.25_0.04_265_/_0.7)] backdrop-blur-md">
        <h1 className="text-lg font-medium text-foreground/80">mAIstro</h1>
        <ChatDrawer
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          emptyChat={emptyChat}
        />
      </header>
      <ChatWindow messages={activeChat?.messages || []} />
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <InputForm
          id={activeChat.id}
          formRef={formRef}
          setActiveChat={setActiveChat}
          reset={reset}
        />
      </div>
    </div>
  )
}
