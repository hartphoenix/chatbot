import { describe, it, expect } from "vitest"
import type { Message } from '../storage.ts'
import { InMemoryStorage } from '../storage.ts'
import { randomUUID } from "node:crypto"

describe('createConversation', () => {
  it('returns a new empty conversation with all fields populated', async () => {
    const inMemory = new InMemoryStorage()
    const newConvo = await inMemory.createConversation()

    expect(newConvo.messages).toEqual([])
    expect(typeof newConvo.id).toEqual('string')
    expect(typeof newConvo.created).toEqual('number')
    expect(typeof newConvo.latest).toEqual('number')
  })

  it('creates a unique ID on each call', async () => {
    const inMemory = new InMemoryStorage()

    const newConvo1 = await inMemory.createConversation()
    const newConvo2 = await inMemory.createConversation()

    expect(newConvo1.id).not.toEqual(newConvo2.id)
  })
})

describe('getConversation', () => {
  it('returns the correct conversation', async () => {
    const inMemory = new InMemoryStorage()

    const newConvo1 = await inMemory.createConversation()
    const newConvo2 = await inMemory.createConversation()

    const id1 = newConvo1.id
    const id2 = newConvo2.id

    const retrievedConvo1 = await inMemory.getConversation(id1)
    const retrievedConvo2 = await inMemory.getConversation(id2)

    expect(newConvo1).toEqual(retrievedConvo1)
    expect(newConvo2).toEqual(retrievedConvo2)
    expect(newConvo1).not.toEqual(retrievedConvo2)
    expect(newConvo2).not.toEqual(retrievedConvo1)
  })

  it('returns "null" on nonexistent ID', async () => {
    const inMemory = new InMemoryStorage()
    const getByBadID = await inMemory.getConversation(randomUUID())
    expect(getByBadID).toEqual(null)
  })
})

describe('getConversations', () => {
  it('returns all conversations in the storage object', async () => {
    const inMemory = new InMemoryStorage()
    for (let i = 0; i < 5; i++) {
      await inMemory.createConversation()
    }
    const allConvos = await inMemory.getConversations()
    expect(allConvos.length).toEqual(5)
  })

  it('returns an empty array when no conversations exist', async () => {
    const inMemory = new InMemoryStorage()
    const allConvos = await inMemory.getConversations()
    expect(allConvos.length).toEqual(0)
  })
})

describe('addMessageToConversation', () => {
  it('returns null with nonexistent ID', async () => {
    const inMemory = new InMemoryStorage()
    const newConvo = await inMemory.createConversation()
    const badID = newConvo.id + "x"
    const message: Message = { role: 'user', content: 'hi Claude' }
    const addMessageToBadID = await inMemory.addMessageToConversation(message, badID)

    expect(addMessageToBadID).toEqual(null)
  })

  it('appends the message without mutating other messages', async () => {
    const inMemory = new InMemoryStorage()
    const newConvo = await inMemory.createConversation()

    const message1: Message = { role: 'user', content: 'hi Claude' }
    const message2: Message = { role: 'assistant', content: 'hi User' }
    const message3: Message = { role: 'user', content: 'what is up' }

    await inMemory.addMessageToConversation(message1, newConvo.id)
    await inMemory.addMessageToConversation(message2, newConvo.id)
    await inMemory.addMessageToConversation(message3, newConvo.id)

    const convoAfter = await inMemory.getConversation(newConvo.id)
    expect(convoAfter?.messages).toEqual([message1, message2, message3])
  })

  it('updates the latest timestamp with the call time', async () => {
    const inMemory = new InMemoryStorage()
    const newConvo = await inMemory.createConversation()
    const originalLatest = newConvo.latest
    await new Promise(resolve => setTimeout(resolve, 1))
    const updatedConvo = await inMemory.addMessageToConversation({
      role: 'user', content: 'hi'
    }, newConvo.id)
    expect(originalLatest).not.toEqual(updatedConvo?.latest)
  })

  it('leaves other conversations unchanged', async () => {
    const inMemory = new InMemoryStorage()

    const convo1 = await inMemory.createConversation()
    const convo2before = await inMemory.createConversation()
    const messagesBefore = [...convo2before.messages]

    await inMemory.addMessageToConversation({
      role: 'user', content: 'hi'
    }, convo1.id)

    const convo2after = await inMemory.getConversation(convo2before.id)
    expect(convo2after?.messages).toEqual(messagesBefore)
  })
})