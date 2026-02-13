
export type Message = { role: "assistant" | "user", content: string }

export type Conversation = {
  messages: Array<Message>
  id: string
  created: number
  latest: number
}

export interface Storage {
  createConversation(userId: string): Promise<Conversation | null>
  getConversation(conversationId: string, userId: string): Promise<Conversation | null>
  getConversations(userId: string): Promise<Array<Conversation>>
  addMessageToConversation(message: Message, id: string, userId: string): Promise<Conversation | null>
  deleteConversation(id: string, userId: string): Promise<boolean>
}