import { useRef } from "react"
import type { JSX } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

type InputFormProps = {
  sendMessage: (content: string) => void
  isStreaming: boolean
}

export const InputForm = ({ sendMessage, isStreaming }: InputFormProps): JSX.Element => {
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (formData: FormData) => {
    const content = formData.get("input") as string
    if (!content?.trim()) return
    sendMessage(content)
    formRef.current?.reset()
  }

  return (
    <div className="p-4 bg-[oklch(0.25_0.04_265_/_0.7)] backdrop-blur-md">
      <form ref={formRef} action={handleSubmit} className="flex gap-2 items-center">
        <Textarea
          placeholder="Ask the agent something..."
          name="input"
          className="resize-none min-h-[44px] max-h-32 flex-1"
          rows={1}
          disabled={isStreaming}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              formRef.current?.requestSubmit()
            }
          }} />
        <Button type="submit" size="sm" disabled={isStreaming}>
          {isStreaming ? '...' : 'send'}
        </Button>
      </form>
    </div>
  )
}
