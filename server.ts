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
import { supabase } from './storage/db'


const app: Express = express()

// Better-Auth handles its own body parsing — register before express.json()
app.all('/api/auth/{*any}', toNodeHandler(auth))
app.use('/chats', requireAuth)
app.use(express.json())

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // This is the default and can be omitted
})

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

const port = process.env.PORT || 3000
ViteExpress.listen(app, port as number, () => {
  console.log(`Server listening on port ${port}`)
})