import type { Database } from 'bun:sqlite'
import type { Storage, Message, Conversation } from './storage'

export class SqlLiteStorage implements Storage {
  private db

  constructor(db: Database) {
    this.db = db
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
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

  async createConversation(userId: string): Promise<Conversation | null> {
    const newConversation: Conversation = {
      messages: [],
      id: crypto.randomUUID(),
      created: Date.now(),
      latest: Date.now()
    }
    try {
      this.db.prepare(`INSERT INTO conversations (id, userId, created, latest)
          VALUES (?, ?, ?, ?)`)
        .run(newConversation.id,
          userId,
          newConversation.created,
          newConversation.latest)
    } catch { return null }
    return newConversation
  }

  async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const foundConvo = this.db.prepare(`
      SELECT * FROM conversations WHERE id = ? AND userId = ?;
      `).get(conversationId, userId) as {
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

  async getConversations(userId: string): Promise<Array<Conversation>> {
    const response = this.db
      .prepare(`SELECT * FROM conversations WHERE userId = ?;`)
      .all(userId) as {
        id: string, created: number, latest: number
      }[]
    const responseMap = await Promise.all(response.map(row => {
      return this.getConversation(row.id, userId)
    }))
    const allConvos = responseMap.filter(res => res !== null)
    return allConvos
  }

  async addMessageToConversation(message: Message, id: string, userId: string): Promise<Conversation | null> {
    const owns = this.db.prepare(`SELECT id FROM conversations WHERE id = ? AND userId = ?;`)
      .get(id, userId)
    if (!owns) return null
    try {
      this.db.prepare(`INSERT INTO messages
        (id, conversationId, role, content, created)
          VALUES (?, ?, ?, ?, ?)`)
        .run(
          crypto.randomUUID(),
          id,
          message.role,
          message.content,
          Date.now()
        )
    } catch { return null }
    this.db
      .prepare(`UPDATE conversations SET latest = ? WHERE id = ?;`)
      .run(Date.now(), id)
    return this.getConversation(id, userId)
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    try {
      this.db
        .prepare(`DELETE FROM messages WHERE conversationId = ?;`)
        .run(id)
      const resultConvos = this.db
        .prepare(`DELETE FROM conversations WHERE id = ? AND userId = ?;`)
        .run(id, userId)
      if (resultConvos.changes === 1) {
        return true
      } else return false
    } catch { return false }
  }

}