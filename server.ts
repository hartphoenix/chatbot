import express from 'express'
import type { Express, Request, Response } from 'express'
import ViteExpress from 'vite-express'
import Anthropic from '@anthropic-ai/sdk';
import { toNodeHandler } from 'better-auth/node'
import 'dotenv/config'
import type { Conversation, Message } from './storage/storage'
import { SupabaseStorage } from './storage/SupabaseStorage'
import { auth } from './src/lib/auth'
import { requireAuth } from './middleware/requireAuth'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './storage/database.types'


const app: Express = express()

// Better-Auth handles its own body parsing — register before express.json()
app.all('/api/auth/{*any}', toNodeHandler(auth))
app.use('/chats', requireAuth)
app.use(express.json())

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // This is the default and can be omitted
})

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

const db = new SupabaseStorage(supabase)

app.get('/chats', async (req, res) => {
  const allChats = await db.getConversations(req.userId)
  res.json(allChats)
})

app.get('/chats/:id', async (req, res) => {
  const chatId = req.params.id
  const conversation = await db.getConversation(chatId, req.userId)
  if (!conversation) { return res.sendStatus(404) }
  res.json(conversation)
})

app.post('/chats', async (req, res) => {
  if (!req.body.content) return res.status(400).json("Message had no content")
  const newConvo = await db.createConversation(req.userId)
  if (!newConvo) return res.status(500).json("Server error, try again")

  const convo = await handleUserMessage(newConvo, req.body.content, req.userId)
  if (!convo) return res.status(500).json("Server error, try again")

  res.json(convo)
})

const handleUserMessage = async (convo: Conversation, content: string, userId: string)
  : Promise<Conversation | null> => {
  const userMessage: Message = { role: 'user', content: content }

  const userMessageAdded = await db.addMessageToConversation(userMessage, convo.id, userId)
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
      .addMessageToConversation({ role: 'assistant', content: block.text }, convo.id, userId)
    if (!aiMessageAdded) return null
    return aiMessageAdded
  }
  return null
}

app.post('/chats/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string
  if (!req.body.content) return res.status(400).json("Message had no content")

  const convoToUpdate = await db.getConversation(id, req.userId)
  if (!convoToUpdate) return res.status(404).json("No chat found with that ID")

  const convoToSend = await handleUserMessage(convoToUpdate, req.body.content, req.userId)
  if (!convoToSend) return res.status(500).json("Server error, try again")

  res.json(convoToSend)
})

app.delete('/chats/:id', async (req, res) => {
  const deleted = await db.deleteConversation(req.params.id, req.userId)
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
