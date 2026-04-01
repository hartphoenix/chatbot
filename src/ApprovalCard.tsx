import { Button } from "@/components/ui/button"

type ApprovalCardProps = {
  toolName: string
  input: Record<string, unknown>
  onApprove: () => void
  onDeny: () => void
}

export const ApprovalCard = ({ toolName, input, onApprove, onDeny }: ApprovalCardProps) => {
  const description = input.description as string | undefined
  const command = toolName === 'Bash' ? (input.command as string) : undefined
  const filePath = (toolName === 'Write' || toolName === 'Edit') ? (input.file_path as string) : undefined
  const fallback = !command && !filePath ? JSON.stringify(input, null, 2).slice(0, 200) : undefined

  return (
    <div className="approval-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-400 text-sm font-mono">&#9888;</span>
        <span className="text-sm font-semibold text-foreground/90">
          Approve <code className="text-yellow-300">{toolName}</code>?
        </span>
      </div>
      {description && (
        <p className="text-xs text-foreground/70 mb-2">{description}</p>
      )}
      <pre className="text-xs text-muted-foreground bg-black/30 rounded p-2 mb-3 max-h-24 overflow-auto whitespace-pre-wrap">
        {command || filePath || fallback}
      </pre>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onDeny}
          className="text-red-400 hover:text-red-300 hover:bg-red-900/30">
          deny
        </Button>
        <Button size="sm" onClick={onApprove}
          className="bg-green-800 hover:bg-green-700 text-green-100">
          approve
        </Button>
      </div>
    </div>
  )
}
