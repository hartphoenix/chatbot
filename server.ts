import express from 'express'
import type { Express, Request, Response } from 'express'
import ViteExpress from 'vite-express'
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config'

const app: Express = express()
app.use(express.json())

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // This is the default and can be omitted
})

const messageHistory: Anthropic.Messages.MessageParam[] = []
app.get('/history', (req, res) => {
  res.json(messageHistory)
})

app.delete('/reset', (req, res) => {
  messageHistory.length = 0
  res.sendStatus(204)
})

app.get('/preview', async (req: Request, res: Response) => {
  // SSRF vulnerability: no URL validation. Dev-only guard until hardened.
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'preview disabled outside dev mode' })
  }
  const url = req.query.url as string
  if (!url) return res.status(400).json({ error: 'url required' })
  try {
    const response = await fetch(url)
    const html = await response.text()

    const og = (name: string) =>
      html.match(new RegExp(`<meta[^>]*property=["']og:${name}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1]
      ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${name}["']`, 'i'))?.[1]

    const decode = (s: string) => s
      .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

    const title = decode(og('title') ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '')

    const description = decode(og('description')
      ?? html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? '')

    const image = og('image') ?? ''
    res.json({ title, description, image })
  } catch {
    res.status(502).json({ error: 'could not fetch preview' })
  }
})

app.post('/chat', async (req: Request, res: Response) => {
  const newMessage = req.body.content
  if (newMessage) {
    messageHistory.push({ role: 'user', content: newMessage })
  } else return res.status(400).json("Message had no content")

  const params: Anthropic.MessageCreateParams = {
    max_tokens: 1024,
    messages: messageHistory,
    model: 'claude-haiku-4-5-20251001',
  }

  const message: Anthropic.Message = await client.messages.create(params)

  const block = message.content[0]

  if (block.type === 'text') {
    messageHistory.push({ role: 'assistant', content: block.text })
    console.log(messageHistory)
    res.json(messageHistory)
    return
  }

  res.status(500).json("...something went wrong. Try again.")
})

const port = 3000
ViteExpress.listen(app, port, () => {
  console.log(`Server listening on port ${port}`)
})
