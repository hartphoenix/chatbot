import { useState } from 'react'

type ToolCardProps = {
  toolName: string
  input: string
  parentId?: string | null
  variant: 'use' | 'result'
}

export const ToolCard = ({ toolName, input, parentId, variant }: ToolCardProps) => {
  const [expanded, setExpanded] = useState(false)

  const isResult = variant === 'result'
  const parsed = tryParseJson(input)

  // Human-readable summary for common tools
  const summary = isResult ? getResultPreview(input, parsed) : getSummary(toolName, input, parsed)

  return (
    <div
      className={`tool-card ${isResult ? 'tool-card-result' : ''} ${parentId ? 'subagent' : ''} ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="tool-card-header">
        <div className="tool-card-left">
          {parentId && <span className="subagent-badge">sub</span>}
          <span className={`tool-card-icon ${isResult ? 'result' : ''}`}>
            {isResult ? '✓' : '⚙'}
          </span>
          <span className="tool-card-name">{isResult ? 'result' : toolName}</span>
        </div>
        <span className="tool-card-expand">{expanded ? '▾' : '▸'}</span>
      </div>

      {summary && !expanded && (
        <div className="tool-card-summary">{summary}</div>
      )}

      {!summary && !expanded && input && (
        <div className="tool-card-preview">
          {input.length < 5 && !parsed ? '…' : input.slice(0, 120) + (input.length > 120 ? '…' : '')}
        </div>
      )}

      {expanded && (
        <div className="tool-card-body" onClick={(e) => e.stopPropagation()}>
          {parsed ? <JsonView data={parsed} /> : <pre className="tool-card-raw">{input}</pre>}
        </div>
      )}
    </div>
  )
}

// Extract a human-readable one-liner from known tool inputs
function getSummary(toolName: string, raw: string, parsed: Record<string, unknown> | null): string | null {
  // If JSON parsed cleanly, use structured fields
  if (parsed) {
    switch (toolName) {
      case 'Bash':
        return (parsed.description as string) || (parsed.command as string) || null
      case 'Read':
        return shortPath(parsed.file_path as string)
      case 'Write':
        return shortPath(parsed.file_path as string)
      case 'Edit':
        return shortPath(parsed.file_path as string)
      case 'Glob':
        return parsed.pattern as string || null
      case 'Grep':
        return `/${parsed.pattern}/${parsed.path ? ' in ' + shortPath(parsed.path as string) : ''}`
      case 'Agent': {
        const desc = parsed.description as string
        return desc || (parsed.prompt as string)?.slice(0, 60) || null
      }
      case 'WebSearch':
        return parsed.query as string || null
      case 'WebFetch':
        return parsed.url as string || null
      default:
        return null
    }
  }

  // Partial JSON during streaming — extract values with regex
  if (raw && raw.length > 2) {
    return extractPartialValue(toolName, raw)
  }

  return null
}

// Pull a meaningful value from incomplete JSON being streamed
function extractPartialValue(toolName: string, raw: string): string | null {
  const key = toolName === 'Bash' ? 'description'
    : toolName === 'Read' || toolName === 'Write' || toolName === 'Edit' ? 'file_path'
    : toolName === 'Glob' ? 'pattern'
    : toolName === 'Grep' ? 'pattern'
    : toolName === 'Agent' ? 'description'
    : null
  if (!key) return null

  // Match "key": "value... (value may be incomplete/unterminated)
  const re = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"?`)
  const m = raw.match(re)
  if (m?.[1]) return m[1].length > 80 ? m[1].slice(0, 80) + '…' : m[1]
  return null
}

// Extract a preview from tool result data — looks for text fields
function getResultPreview(raw: string, parsed: Record<string, unknown> | null): string | null {
  // Result is often an array of content blocks: [{ type: "text", text: "..." }]
  if (parsed && Array.isArray(parsed)) {
    for (const item of parsed) {
      if (typeof item === 'object' && item !== null && 'text' in item) {
        const text = (item as { text: string }).text
        return text.slice(0, 120)
      }
    }
  }
  // Or a single object with a text field
  if (parsed && typeof parsed.text === 'string') {
    return (parsed.text as string).slice(0, 120)
  }
  // Try parsing the raw string as an array (result often comes as JSON string of array)
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === 'object' && item !== null && 'text' in item) {
          return (item.text as string).slice(0, 120)
        }
      }
    }
  } catch { /* not JSON array */ }
  return null
}

function shortPath(p: string | undefined): string | null {
  if (!p) return null
  const parts = p.split('/')
  if (parts.length <= 3) return p
  return '…/' + parts.slice(-2).join('/')
}

function tryParseJson(s: string): Record<string, unknown> | null {
  try {
    const obj = JSON.parse(s)
    return typeof obj === 'object' && obj !== null ? obj : null
  } catch {
    return null
  }
}

// Simple recursive JSON renderer with labels
function JsonView({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined) return <span className="jv-null">null</span>
  if (typeof data === 'boolean') return <span className="jv-bool">{String(data)}</span>
  if (typeof data === 'number') return <span className="jv-num">{data}</span>

  if (typeof data === 'string') {
    if (data.includes('\n')) {
      return <pre className="jv-str-block">{data}</pre>
    }
    return <span className="jv-str">{data}</span>
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="jv-null">[]</span>
    return (
      <div className="jv-array">
        {data.map((item, i) => (
          <div key={i} className="jv-item">
            <JsonView data={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
    if (entries.length === 0) return <span className="jv-null">{'{}'}</span>
    return (
      <div className="jv-obj">
        {entries.map(([key, val]) => (
          <div key={key} className="jv-field">
            <span className="jv-key">{key}</span>
            <JsonView data={val} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }

  return <span>{String(data)}</span>
}
