import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import type { Storage, Message, Conversation } from './storage'

export class SupabaseStorage implements Storage {
  private db

  constructor(db: SupabaseClient<Database>) {
    this.db = db
  }

  async createConversation(userId: string): Promise<Conversation | null> {
    const id = crypto.randomUUID()
    const created = Date.now()
    const latest = Date.now()
    const { data, error } = await this.db
      .from('conversations')
      .insert({ id, userid: userId, created, latest })
      .select()          // returns the inserted row(s)
      .single()          // unwraps array to single object
    if (error) {
      console.log(error)
      return null
    }
    const newConversation = {
      messages: [],
      id: data.id,
      created: data.created as number,
      latest: data.latest as number,
    }
    return newConversation
  }

  async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const { data: convoData, error: convoError } = await this.db
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('userid', userId)
      .single()
    if (convoError) { return null }
    const { data: msgData, error: msgError } = await this.db
      .from('messages')
      .select('*')
      .eq('conversationid', conversationId)
    if (msgError) { return null }
    const messages = msgData.map(msg => ({
      role: msg.role,
      content: msg.content
    })) as Message[]
    const conversation = {
      messages: messages,
      id: conversationId,
      created: convoData.created as number,
      latest: convoData.latest as number
    }
    return conversation
  }

  async getConversations(userId: string): Promise<Array<Conversation> | null> {
    const { data: convoData, error: convoError } = await this.db
      .from('conversations')
      .select('*')
      .eq('userid', userId)
    if (convoError) { return null }
    const arrayOfIds = convoData.map(convo => convo.id)
    const conversations = await Promise.all(arrayOfIds.map(id =>
      this.getConversation(id, userId)
    ))
    return conversations.filter(convo => convo !== null)
  }

  async addMessageToConversation(message: Message, id: string, userId: string): Promise<Conversation | null> {
    const owns = await this.getConversation(id, userId)
    if (!owns) { return null }

    // insert message
    const now = Date.now()
    const { data, error } = await this.db
      .from('messages')
      .insert({
        id: crypto.randomUUID(),
        conversationid: id,
        role: message.role,
        content: message.content,
        created: now
      })
      .select()
      .single()
    if (error) { return null }

    await this.db
      .from('conversations')
      .update({ latest: now })
      .eq('id', id)
    // no check for updateError since the message insertion succeeded;
    // possibly a future version of the interface would return specific errors
    // rather than 'null' but this is sufficient for the current implementation.
    const conversation = await this.getConversation(id, userId)
    return conversation
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    await this.db
      .from('messages')
      .delete()
      .eq('conversationid', id)

    const { count } = await this.db
      .from('conversations')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('userid', userId)
    if (!count) return false
    else return true
  }

}