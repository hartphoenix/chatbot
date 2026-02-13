import type { Chat } from './App'
import type { JSX } from 'react'
import { LoginForm } from './LoginForm'
import { signOut, useSession } from './lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer'

type ChatDrawerProps = {
  activeChat: Chat
  setActiveChat: (chat: Chat) => void
  emptyChat: Chat
  chats: Chat[]
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>
}

export const ChatDrawer = ({ activeChat, setActiveChat, emptyChat, chats, setChats }: ChatDrawerProps) => {
  const session = useSession()

  const fetchChats = async () => {
    if (!session.data) return
    const response = await fetch('/chats')
    const allChats: Chat[] = await response.json()
    console.log(allChats)
    setChats(allChats)
  }

  const startNewChat = () => {
    setActiveChat(emptyChat)
  }

  const handleLogout = async () => {
    await signOut()
    setChats([])
    setActiveChat(emptyChat)
  }

  const getDrawerContent = (): JSX.Element => {
    if (session.data) return (
      <div className="animate-in fade-in duration-300">
        <DrawerHeader>
          <DrawerTitle className="text-foreground/70 text-2xl" style={{ fontFamily: "'Itim', cursive" }}>chats</DrawerTitle>
          <DrawerDescription className="sr-only">Your saved conversations</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-1 p-4 overflow-y-auto text-foreground/70">
          <div className="flex gap-2">
            <DrawerClose asChild>
              <Button variant="default" className="flex-1 bg-primary/70 hover:bg-primary/80 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]" onClick={startNewChat}>new chat</Button>
            </DrawerClose>
            <Button variant="outline" className="flex-1" onClick={handleLogout}>logout</Button>
          </div>
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
      </div>
    )
    return (
      <div className="animate-in fade-in duration-300">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Account</DrawerTitle>
          <DrawerDescription>Sign in or create an account</DrawerDescription>
        </DrawerHeader>
        <LoginForm />
      </div>
    )
  }

  return (
    <Drawer direction="right" onOpenChange={(open) => { if (open) fetchChats() }}>
      <DrawerTrigger asChild>
        {/* TODO: style/position this trigger however you want */}
        <Button variant="outline">{session.data ? "chats" : "login"}</Button>
      </DrawerTrigger>
      <DrawerContent>
        {getDrawerContent()}
      </DrawerContent>
    </Drawer>
  )
}
