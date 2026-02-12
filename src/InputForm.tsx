import { useState } from "react"
import type { JSX } from "react"
import type { Chat } from './App'
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

type InputFormProps = {
  id: string
  formRef: React.RefObject<HTMLFormElement | null>
  setActiveChat: React.Dispatch<React.SetStateAction<Chat>>
  reset: () => void
}

export const InputForm = ({ id, formRef, setActiveChat, reset }: InputFormProps): JSX.Element => {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const submitMessage = (formData: FormData) => {
    const newMessage = formData.get("input")
    if (!newMessage) return
    setActiveChat(prev => ({
      ...prev,
      messages: [...prev.messages,
      { role: 'user', content: newMessage as string },
      { role: 'loading', content: '(cogitating...)' }
      ]
    }))
    formRef.current?.reset()
    const msgBody = JSON.stringify({ content: newMessage })
    const url = id ? `/chats/${id}` : '/chats'
    const sendChat = async () => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: msgBody
      })
      const fullChat = await response.json() as Chat
      setActiveChat(fullChat)
    }
    sendChat()
  }

  const resetChat = () => {
    reset()
    setConfirmOpen(false)
  }

  return (
    <div className="p-4 bg-[oklch(0.25_0.04_265_/_0.7)] backdrop-blur-md">
      <form ref={formRef} action={submitMessage} className="flex gap-2 items-center">
        <Textarea
          placeholder="Hey Amadeus,"
          name="input"
          className="resize-none min-h-[44px] max-h-32 flex-1"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              formRef.current?.requestSubmit()
            }
          }} />
        <Button type="submit" size="sm">send</Button>
        <Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm"
              className="text-muted-foreground border border-muted-foreground/30">reset</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" side="top" align="end">
            <p className="text-sm mb-2">Erase chat history?</p>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(false)}>cancel</Button>
              <Button size="sm" variant="destructive" onClick={resetChat}>erase</Button>
            </div>
          </PopoverContent>
        </Popover>
      </form>
    </div>
  )
}
