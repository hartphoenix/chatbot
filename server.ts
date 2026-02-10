import express from 'express'
import type { Express, Request, Response } from 'express'
import ViteExpress from 'vite-express'
import 'dotenv/config'

const app: Express = express()
app.use(express.json())

app.post('/chat', async (req: Request, res: Response) => {
  const postData = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: req.body.content }
      ]
    })
  }
  const chatResponse = await fetch('https://api.anthropic.com/v1/messages', postData)
  const data = await chatResponse.json()
  res.send(data)
}
)

const port = 3000
ViteExpress.listen(app, port, () => {
  console.log(`Server listening on port ${port}`)
})
