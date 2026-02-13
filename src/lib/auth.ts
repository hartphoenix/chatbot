import { betterAuth } from "better-auth"
import { database } from '../../storage/db'

export const auth = betterAuth({
  database,
  emailAndPassword: {
    enabled: true,
  },
})