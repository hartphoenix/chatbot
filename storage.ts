import { randomUUID } from "node:crypto"
import Database from 'better-sqlite3'

// import Anthropic from '@anthropic-ai/sdk';
export type Message = { role: "assistant" | "user", content: string }

export type Conversation = {
  messages: Array<Message>
  id: string
  created: number
  latest: number
}

export interface Storage {
  createConversation(): Promise<Conversation | null>
  getConversation(conversationId: string): Promise<Conversation | null>
  getConversations(): Promise<Array<Conversation>>
  addMessageToConversation(message: Message, id: string): Promise<Conversation | null>
}

export class InMemoryStorage implements Storage {
  private convos: Map<string, Conversation>

  constructor() {
    this.convos = new Map()
  }

  async createConversation(): Promise<Conversation> {
    const newConversation: Conversation = {
      messages: [],
      id: randomUUID(),
      created: Date.now(),
      latest: Date.now()
    }
    this.convos.set(newConversation.id, newConversation)
    return newConversation
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const foundConvo = this.convos.get(conversationId)
    if (!foundConvo) return null
    return foundConvo
  }

  async getConversations(): Promise<Array<Conversation>> {
    return [...this.convos.values()]
  }

  async addMessageToConversation(message: Message, id: string): Promise<Conversation | null> {
    const toUpdate = this.convos.get(id)
    if (!toUpdate) { return null }
    toUpdate.messages.push(message)
    toUpdate.latest = Date.now()
    return toUpdate
  }
}


export class SqlLiteStorage implements Storage {
  private db

  constructor(path: string) {
    this.db = new Database(path, { verbose: console.log })
    this.db.pragma('journal_mode = WAL')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        created INTEGER,
        latest INTEGER
      );
    `)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversationId TEXT,
        role TEXT,
        content TEXT,
        created INTEGER
      );
    `)
  }

  async createConversation(): Promise<Conversation | null> {
    const newConversation: Conversation = {
      messages: [],
      id: randomUUID(),
      created: Date.now(),
      latest: Date.now()
    }
    try {
      this.db.prepare(`INSERT INTO conversations (id, created, latest)
          VALUES (?, ?, ?)`)
        .run(newConversation.id,
          newConversation.created,
          newConversation.latest)
    } catch { return null }
    return newConversation
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const foundConvo = this.db.prepare(`
      SELECT * FROM conversations WHERE id = ?;
      `).get(conversationId) as {
      id: string, created: number, latest: number
    } | undefined
    if (!foundConvo) return null

    const foundMessages = this.db.prepare(`
      SELECT * FROM messages WHERE conversationId = ?;
      `).all(conversationId) as Array<{
      role: Message["role"], content: string
    }>

    const messages = foundMessages.map(obj => {
      return { role: obj.role, content: obj.content }
    })

    const combined: Conversation = {
      messages: messages,
      id: conversationId,
      created: foundConvo.created,
      latest: foundConvo.latest
    }

    return combined
  }

  async getConversations(): Promise<Array<Conversation>> {
    const response = this.db
      .prepare(`SELECT * FROM conversations;`)
      .all() as {
        id: string, created: number, latest: number
      }[]
    const responseMap = await Promise.all(response.map(row => {
      return this.getConversation(row.id)
    }))
    const allConvos = responseMap.filter(res => res !== null)
    return allConvos
  }

  async addMessageToConversation(message: Message, id: string): Promise<Conversation | null> {
    try {
      this.db.prepare(`INSERT INTO messages 
        (id, conversationId, role, content, created)
          VALUES (?, ?, ?, ?, ?)`)
        .run(
          randomUUID(),
          id,
          message.role,
          message.content,
          Date.now()
        )
    } catch { return null }
    this.db
      .prepare(`UPDATE conversations SET latest = ? WHERE id = ?;`)
      .run(Date.now(), id)
    return this.getConversation(id)
  }

}