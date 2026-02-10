import type { JSX } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

type InputFormProps = {
  setMessages: React.Dispatch<React.SetStateAction<{
    role: string;
    content: string;
  }[]>>
  formRef: React.RefObject<HTMLFormElement | null>
}
export const InputForm = ({ setMessages, formRef }: InputFormProps): JSX.Element => {

  const chat = (formData: FormData) => {
    const newMessage = formData.get("input")
    if (!newMessage) return
    setMessages(prev => [...prev,
    { role: 'user', content: newMessage as string },
    { role: 'loading', content: '(cogitating...)' }
    ])
    formRef.current?.reset()
    const msgBody = JSON.stringify({ content: newMessage })
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
    <form ref={formRef} action={chat} className="mt-4 flex flex-col gap-2">
      <Textarea placeholder="Hey Amadeus," name="input" className="resize-none" />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">say it</Button>
        <Button type="reset" variant="outline" onClick={reset}>erase all</Button>
      </div>
    </form>
  )
}
