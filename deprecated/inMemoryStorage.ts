// initialized during the first version of the Storage type, which lacked a
// userId. as the contract evolved, this class was deprecated to make room for
// work on the Supabase implementation. Kept for reference.

import type { Storage, Conversation, Message } from '../storage/storage'
export class InMemoryStorage implements Storage {
  private convos: Map<string, Conversation>

  constructor() {
    this.convos = new Map()
  }

  async createConversation(): Promise<Conversation> {
    const newConversation: Conversation = {
      messages: [],
      id: crypto.randomUUID(),
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

  async deleteConversation(id: string): Promise<boolean> {
    console.log("requested to delete ID:", id)
    return false // stubbed for later fix! always returns false for now
  }
}
