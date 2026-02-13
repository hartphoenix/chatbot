import { Database } from 'bun:sqlite'

export const database = new Database('./chatbot.db')
database.exec('PRAGMA journal_mode = WAL')
