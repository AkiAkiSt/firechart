import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { hrefFor, navigate } from '../../router'
import { account, useAccount } from '../../sync'
import { Button } from '../../ui/controls'
import { TopBar } from '../common'

function TextField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <input
        {...props}
        className="h-12 rounded-xl border border-control bg-well px-3.5 text-base text-ink placeholder:text-muted"
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

function Problem({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p role="alert" className="text-sm text-danger">
      {text}
    </p>
  )
}

/** Where to go once signing in has got as far as it can. */
function continueAfterSignIn(): void {
  const { kind } = account.getSnapshot().account
  navigate(kind === 'needs-invite' ? { name: 'invite' } : { name: 'today' }, { replace: true })
}

export function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await account.signIn(email, password)
      continueAfterSignIn()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto flex w-full max-w-[420px] flex-col gap-4">
      <TopBar back={{ name: 'settings' }} backLabel="Back to Settings" title="Sign in" />
      <TextField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Problem text={error} />
      <Button variant="primary" type="submit" disabled={busy} className="h-12">
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-sm text-ink-2">
        New here?{' '}
        <a href={hrefFor({ name: 'signup' })} className="font-medium text-ink underline underline-offset-2">
          Create an account
        </a>{' '}
        with an invite code.
      </p>
      <p className="text-xs text-muted">
        Forgot your password? There are no reset emails yet; ask the person who runs your circle.
      </p>
    </form>
  )
}

export function SignUpScreen({ code }: { code?: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState(code ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 8) return setError('Use a password of at least 8 characters.')
    setBusy(true)
    setError(null)
    try {
      await account.signUp(name, email, password, invite)
      continueAfterSignIn()
    } catch (cause) {
      // The account may exist by now with only the invite step left.
      if (account.getSnapshot().account.kind === 'needs-invite') return continueAfterSignIn()
      setError(cause instanceof Error ? cause.message : 'Could not create the account.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto flex w-full max-w-[420px] flex-col gap-4">
      <TopBar back={{ name: 'settings' }} backLabel="Back to Settings" title="Create an account" />
      <p className="text-sm text-ink-2">
        An account keeps your charts in step between your devices. You need an invite code from someone already
        using Firechart.
      </p>
      <TextField
        label="Your name"
        name="name"
        autoComplete="nickname"
        required
        maxLength={40}
        hint="Shown to the friends in your circle."
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        hint="Only used to sign in. Nothing is emailed to you."
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        name="new-password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <TextField
        label="Invite code"
        name="invite"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={invite}
        onChange={(event) => setInvite(event.target.value)}
      />
      <Problem text={error} />
      <Button variant="primary" type="submit" disabled={busy} className="h-12">
        {busy ? 'Creating…' : 'Create account'}
      </Button>
      <p className="text-sm text-ink-2">
        Already have one?{' '}
        <a href={hrefFor({ name: 'signin' })} className="font-medium text-ink underline underline-offset-2">
          Sign in
        </a>
        .
      </p>
    </form>
  )
}

/** For someone whose account exists but who has not joined a circle yet. */
export function InviteScreen() {
  const { account: state } = useAccount()
  const [name, setName] = useState('')
  const [invite, setInvite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await account.redeem(invite, name)
      navigate({ name: 'today' }, { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not use that code.')
      setBusy(false)
    }
  }

  if (state.kind !== 'needs-invite') {
    return (
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-4">
        <TopBar back={{ name: 'settings' }} backLabel="Back to Settings" title="Invite code" />
        <p className="text-sm text-ink-2">
          {state.kind === 'ready' ? 'You are already in a circle.' : 'Sign in first, then enter your invite code.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto flex w-full max-w-[420px] flex-col gap-4">
      <TopBar back={{ name: 'settings' }} backLabel="Back to Settings" title="One more step" />
      <p className="text-sm text-ink-2">
        You are signed in as {state.email}, but your account is not in a circle yet. Enter an invite code from
        someone already using Firechart.
      </p>
      <TextField
        label="Your name"
        name="name"
        autoComplete="nickname"
        required
        maxLength={40}
        hint="Shown to the friends in your circle."
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label="Invite code"
        name="invite"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={invite}
        onChange={(event) => setInvite(event.target.value)}
      />
      <Problem text={error} />
      <Button variant="primary" type="submit" disabled={busy} className="h-12">
        {busy ? 'Joining…' : 'Join'}
      </Button>
    </form>
  )
}
