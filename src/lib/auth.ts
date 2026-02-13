import { betterAuth } from "better-auth"
import { database } from '../../db'

export const auth = betterAuth({
  database,
  emailAndPassword: {
    enabled: true,
  },
})