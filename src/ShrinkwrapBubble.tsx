import { useMemo } from 'react'
import { prepare, layout } from '@chenglou/pretext'

type Props = {
  text: string
  font: string
  lineHeight: number
  maxWidth: number
  className?: string
  children: React.ReactNode
}

/**
 * Wraps children in a container whose width is shrinkwrapped
 * to the tightest fit that doesn't increase line count.
 * Uses Pretext for measurement — no DOM reads.
 */
export const ShrinkwrapBubble = ({
  text, font, lineHeight, maxWidth, className, children,
}: Props) => {
  const tightWidth = useMemo(() => {
    if (!text || maxWidth <= 0) return undefined

    const prepared = prepare(text, font)
    const full = layout(prepared, maxWidth, lineHeight)

    if (full.lineCount <= 1) {
      // Single line: shrink to content width
      // Use a small min to avoid degenerate widths
      return findTightWidth(prepared, font, lineHeight, maxWidth, full.lineCount)
    }

    // Multi-line: binary search for smallest width preserving line count
    return findTightWidth(prepared, font, lineHeight, maxWidth, full.lineCount)
  }, [text, font, lineHeight, maxWidth])

  return (
    <div
      className={className}
      style={tightWidth ? { width: tightWidth + 1 } : undefined}
    >
      {children}
    </div>
  )
}

function findTightWidth(
  prepared: ReturnType<typeof prepare>,
  _font: string,
  lineHeight: number,
  maxWidth: number,
  targetLines: number,
): number {
  // Binary search: find smallest width that keeps lineCount == targetLines
  let lo = 40 // minimum reasonable bubble width
  let hi = maxWidth
  let best = maxWidth

  for (let i = 0; i < 20; i++) {
    const mid = Math.floor((lo + hi) / 2)
    const result = layout(prepared, mid, lineHeight)

    if (result.lineCount <= targetLines) {
      best = mid
      hi = mid - 1
    } else {
      lo = mid + 1
    }
  }

  return best
}
