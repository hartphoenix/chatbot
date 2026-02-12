import express from 'express'
import type { Express, Request, Response } from 'express'
import ViteExpress from 'vite-express'
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config'
import { SqlLiteStorage, type Conversation, type Message } from './storage'

const app: Express = express()
app.use(express.json())

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // This is the default and can be omitted
})

const db = new SqlLiteStorage(":memory:")

app.get('/chats', async (req, res) => {
  const allChats = await db.getConversations()
  res.json(allChats)
})

app.get('/chats/:id', async (req, res) => {
  const id = req.params.id
  const conversation = await db.getConversation(id)
  if (!conversation) { return res.sendStatus(404) }
  res.json(conversation)
})

app.post('/chats', async (req, res) => {
  if (!req.body.content) return res.status(400).json("Message had no content")
  const newConvo = await db.createConversation()
  if (!newConvo) return res.status(500).json("Server error, try again")

  const convo = await handleUserMessage(newConvo, req.body.content)
  if (!convo) return res.status(500).json("Server error, try again")

  res.json(convo)
})

const handleUserMessage = async (convo: Conversation, content: string)
  : Promise<Conversation | null> => {
  const userMessage: Message = { role: 'user', content: content }

  const userMessageAdded = await db.addMessageToConversation(userMessage, convo.id)
  if (!userMessageAdded) return null

  const params: Anthropic.MessageCreateParams = {
    max_tokens: 1024,
    messages: userMessageAdded.messages,
    model: 'claude-haiku-4-5-20251001',
  }

  const aiMessage: Anthropic.Message = await client.messages.create(params)

  const block = aiMessage.content[0]

  if (block.type === 'text') {
    const aiMessageAdded = await db
      .addMessageToConversation({ role: 'assistant', content: block.text }, convo.id)
    if (!aiMessageAdded) return null
    return aiMessageAdded
  }
  return null
}

app.post('/chats/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string
  if (!req.body.content) return res.status(400).json("Message had no content")

  const convoToUpdate = await db.getConversation(id)
  if (!convoToUpdate) return res.status(404).json("No chat found with that ID")

  const convoToSend = await handleUserMessage(convoToUpdate, req.body.content)
  if (!convoToSend) return res.status(500).json("Server error, try again")

  res.json(convoToSend)
})

app.delete('/chats/:id', async (req, res) => {
  const deleted = await db.deleteConversation(req.params.id)
  if (deleted) { res.sendStatus(204) }
  else { res.status(404).json("No chat found with that ID") }
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

const port = 3000
ViteExpress.listen(app, port, () => {
  console.log(`Server listening on port ${port}`)
})
