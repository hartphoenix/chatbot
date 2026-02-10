import { useState } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

type PreviewData = { title: string; description: string; image: string }

export const LinkPreview = ({ href, children }: {
  href: string
  children: React.ReactNode
}) => {
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchPreview = async () => {
    if (preview || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/preview?url=${encodeURIComponent(href)}`)
      if (res.ok) setPreview(await res.json())
    } catch { /* silent */ }
    setLoading(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => { fetchPreview(); setOpen(true) }}
          onMouseLeave={() => setOpen(false)}
          onClick={(e) => { e.stopPropagation(); setOpen(false) }}
        >
          {children}
        </a>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 overflow-hidden"
        side="top"
        align="start"
        onPointerDownOutside={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {loading && <p className="p-3 text-xs text-muted-foreground">Loading...</p>}
        {preview && (
          <>
            {preview.image && (
              <img src={preview.image} alt="" className="w-full h-32 object-cover" />
            )}
            <div className="p-3">
              {preview.title && (
                <p className="text-sm font-medium leading-tight">{preview.title}</p>
              )}
              {preview.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preview.description}</p>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
