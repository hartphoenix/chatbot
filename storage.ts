import { randomUUID } from "node:crypto"

// import Anthropic from '@anthropic-ai/sdk';
export type Message = { role: "assistant" | "user", content: string }

export type Conversation = {
  messages: Array<Message>
  id: string
  created: number
  latest: number
}

export interface Storage {
  createConversation(): Promise<Conversation>
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