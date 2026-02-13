import { error } from 'better-auth/api'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { signIn, signUp } from './lib/auth-client'
import { useRef, useState, type JSX } from 'react'

export const LoginForm = (): JSX.Element => {
  const [returningUser, setReturningUser] = useState(true)
  const formRef = useRef<HTMLFormElement>(null)
  const [errorMessage, setErrorMessage] = useState("")
  // TODO: get error messages working in a popup or something
  const toggleMode = () => {
    setReturningUser(prev => !prev)
  }

  const handleSignIn = async (formData: FormData) => {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const { data, error } = await signIn.email({ email, password })
    if (error) setErrorMessage(error.message!)
  }

  const handleSignUp = async (formData: FormData) => {
    const email = formData.get("email") as string
    const name = formData.get("name") as string
    const password = formData.get("password") as string
    const { data, error } = await signUp.email({ email, password, name })
    if (error) setErrorMessage(error.message!)
  }

  if (returningUser) {
    return ( // SIGN IN
      <div className="flex flex-col gap-1 p-4 overflow-y-auto">
        <form ref={formRef} action={handleSignIn} className="flex flex-col gap-3">
          <Input
            type="email"
            name="email"
            placeholder="email@site.com"
          />

          <Input
            type="password"
            name="password"
            placeholder="password"
          />

          <div className="flex gap-2">
            <Button type="submit" className="flex-1 bg-primary/70 hover:bg-primary/80 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]">sign in</Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={toggleMode}>sign up</Button>
          </div>
        </form >
        {errorMessage}
      </div>
    )
  }
  return ( // SIGN UP
    <div className="flex flex-col gap-1 p-4 overflow-y-auto">
      <form ref={formRef} action={handleSignUp} className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          placeholder="email@site.com"
          className="border rounded px-3 py-2 w-full bg-background text-foreground"
        />

        <Input
          placeholder="John Doe"
          name="name"
        />

        <input
          type="password"
          name="password"
          placeholder="password"
          className="border rounded px-3 py-2 w-full bg-background text-foreground"
        />

        <div className="flex gap-2">
          <Button type="submit" className="flex-1 bg-primary/70 hover:bg-primary/80 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]">sign up</Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={toggleMode}>sign in</Button>
        </div>
      </form >
      {errorMessage}
    </div>
  )

}