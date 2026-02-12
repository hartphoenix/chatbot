import type { Chat } from "@/App"
import { useCallback, useEffect, useState } from "react"

export const emptyChat: Chat = {
  id: "",
  created: 0,
  latest: 0,
  messages: []
}

// networking layer
async function getChats(): Promise<Chat[]> {
  const res = await fetch('/chats')
  return await res.json()
}

export function useChat() {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<Chat>(emptyChat)

  // remember that useCallback just exists to give me a stable reference to
  // the updateChats function
  const updateChats = useCallback(() => {
    getChats().then((newChats) => setChats(newChats))
  }, [])

  // on mount, initializing chat data
  useEffect(() => {
    updateChats()
  })

  // could use some documentation for intent
  // okay, this deletes my current chat?
  const reset = async () => {
    await fetch(`/chats/${activeChat.id}`, { method: 'DELETE' })
    setActiveChat(emptyChat)
    updateChats()
  }

  return { chats, activeChat, setActiveChat, reset, updateChats }
}