import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import type { Storage, Message, Conversation } from './storage'

// Queries:

// select with filter
const { data, error } = await supabase
  .from('conversations')
  .select('*')
  .eq('userid', userid)

// insert
const { data, error } = await supabase
  .from('conversations')
  .insert({ id, userid, created, latest })
  .select()          // returns the inserted row(s)
  .single()          // unwraps array to single object

// delete
const { count } = await supabase
  .from('conversations')
  .delete()
  .eq('id', id)
  .eq('userId', userid)

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
    if (error) { return null }
    const newConversation = {
      messages: [],
      id: data.id,
      created: data.created as number,
      latest: data.latest as number,
    }
    return newConversation
  }

  getConversation(conversationId: string, userId: string): Promise<Conversation | null> {

  }

  getConversations(userId: string): Promise<Array<Conversation>> {

  }

  addMessageToConversation(message: Message, id: string, userId: string): Promise<Conversation | null> {

  }

  deleteConversation(id: string, userId: string): Promise<boolean> {

  }

}