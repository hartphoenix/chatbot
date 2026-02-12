import { useRef, useState } from "react"
import { ChatWindow } from './ChatWindow'
import { InputForm } from './InputForm'
import { ChatDrawer } from './ChatDrawer'
import type { Conversation } from '../storage'
import { emptyChat, useChat } from "./lib/hooks/useChat"

export type DisplayMessage = { role: 'user' | 'assistant' | 'loading', content: string }
export type Chat = Omit<Conversation, 'messages'> & { messages: DisplayMessage[] }


// overall, consider this:
// the "App" might not want to "deal with" the logic and networking of chats
// perhaps consider encapsulating or factoring chat logic and networking into a
// useChat hook (for logic) and a chatClient (for networking)
// so, in total, you would have 3 concerns:
// 1. Rendering (App.tsx)
// 2. Logic of correctly managing chat state (useChat.ts)
// 3. Correctly calling foreign servers/apis, networking (chatClient.ts)


export default function App() {
  const { activeChat, setActiveChat, reset, chats, refetchChats } = useChat()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="h-screen relative max-w-3xl mx-auto">
      <header className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-[oklch(0.25_0.04_265_/_0.7)] backdrop-blur-md">
        <h1 className="text-lg font-medium text-foreground/80">mAIstro</h1>
        <ChatDrawer
          chats={chats}
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
