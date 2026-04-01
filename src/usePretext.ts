import { useMemo, useCallback } from 'react'
import { prepare, layout, type Prepared } from '@chenglou/pretext'

// Default font matching the app's body text
const DEFAULT_FONT = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const DEFAULT_LINE_HEIGHT = 1.65

type PretextResult = {
  prepared: Prepared
  getHeight: (maxWidth: number) => number
  lineCount: (maxWidth: number) => number
}

/**
 * Measures text dimensions without DOM reads.
 * prepare() runs once per text change (cached internally by Pretext).
 * layout() is pure arithmetic — safe to call on every render/resize.
 */
export function usePretext(text: string, font = DEFAULT_FONT): PretextResult {
  const prepared = useMemo(() => prepare(text, font), [text, font])

  const getHeight = useCallback(
    (maxWidth: number) => {
      const result = layout(prepared, maxWidth, DEFAULT_LINE_HEIGHT)
      return result.height
    },
    [prepared],
  )

  const lineCount = useCallback(
    (maxWidth: number) => {
      const result = layout(prepared, maxWidth, DEFAULT_LINE_HEIGHT)
      return result.lineCount
    },
    [prepared],
  )

  return { prepared, getHeight, lineCount }
}

/**
 * Batch measure multiple texts. Useful for virtualized lists.
 */
export function measureTexts(
  texts: string[],
  maxWidth: number,
  font = DEFAULT_FONT,
  lineHeight = DEFAULT_LINE_HEIGHT,
): { height: number; lineCount: number }[] {
  return texts.map((text) => {
    const p = prepare(text, font)
    return layout(p, maxWidth, lineHeight)
  })
}
