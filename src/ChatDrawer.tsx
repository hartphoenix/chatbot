import { useState } from 'react'
import type { Chat } from './App'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer'

type ChatDrawerProps = {
  activeChat: Chat
  setActiveChat: (chat: Chat) => void
  emptyChat: Chat
}

export const ChatDrawer = ({ chats, activeChat, setActiveChat, emptyChat }: ChatDrawerProps) => {
  const startNewChat = () => {
    setActiveChat(emptyChat)
  }

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        {/* TODO: style/position this trigger however you want */}
        <Button variant="ghost" size="sm">chats</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Conversations</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-1 p-4 overflow-y-auto">
          <DrawerClose asChild>
            <Button variant="outline" onClick={startNewChat}>+ new chat</Button>
          </DrawerClose>
          {chats.map(chat => (
            <DrawerClose key={chat.id} asChild>
              <Button
                variant={chat.id === activeChat.id ? "secondary" : "ghost"}
                className="justify-start text-left"
                onClick={() => setActiveChat(chat)}
              >
                {/* TODO: replace with a better preview — first message snippet, timestamp, etc. */}
                {chat.messages[0]?.content.slice(0, 40) || 'Empty chat'}
              </Button>
            </DrawerClose>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
