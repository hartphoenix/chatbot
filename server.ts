import express from 'express'
import ViteExpress from 'vite-express'

const app = express()
app.use(express.json())

// API routes will go here

const port = 3000
ViteExpress.listen(app, port, () => {
  console.log(`Server listening on port ${port}`)
})
