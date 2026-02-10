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
