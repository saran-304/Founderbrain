import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Command, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Input } from '@workspace/founderbrain-design-system/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@workspace/founderbrain-design-system/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/founderbrain-design-system/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { toast } from '@workspace/founderbrain-design-system/hooks/use-toast';

type AuthMode = 'login' | 'signup' | 'forgot';

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmationPending, setConfirmationPending] = useState(false);
  const title = mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password';
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setConfirmationPending(false);
    try {
      if (mode === 'login') {
        await auth.signIn(email.trim(), password);
        toast({
          title: 'Welcome back',
          description: 'You have been signed in successfully.',
        });
        navigate('/dashboard');
      } else if (mode === 'signup') {
        const result = await auth.signUp(email.trim(), password, name.trim());
        if (result.confirmationRequired) {
          setConfirmationPending(true);
          setMessage('Check your inbox to confirm your email. You can sign in once your account is confirmed.');
        }
        else {
          toast({
            title: 'Account created',
            description: 'Your account has been created successfully.',
          });
          navigate('/dashboard');
        }
      } else {
        await auth.requestPasswordReset(email.trim());
        setMessage('If an account exists for this address, a password reset link is on its way.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not complete that request. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const resendConfirmation = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await auth.resendSignupConfirmation(email.trim());
      setMessage('If an unconfirmed account exists for this address, a new verification email is on its way.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not resend the verification email. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const unavailable = !auth.isConfigured;
  return <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">
    <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex xl:p-16">
      <div className="absolute -right-28 -top-24 h-96 w-96 rounded-full border border-sidebar-border/70" />
      <div className="absolute -right-14 -top-10 h-64 w-64 rounded-full border border-sidebar-border/60" />
      <Link href="/login" className="relative z-10 flex w-fit items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Command className="h-5 w-5" /></span>
        <span className="text-lg font-semibold tracking-tight">Founderbrain</span>
      </Link>
      <div className="relative z-10 max-w-xl">
        <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-primary"><span className="h-px w-8 bg-sidebar-primary" />The founder’s operating space</div>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">Turn the big picture into <span className="text-sidebar-primary">your next clear move.</span></h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-sidebar-foreground/70">A calm, private workspace to keep projects moving, goals in view, and the right work close at hand.</p>
        <div className="mt-10 flex gap-3">
          {['Projects with purpose', 'Progress you can see', 'One focused workspace'].map((label) => <div className="rounded-full border border-sidebar-border px-3 py-2 text-xs text-sidebar-foreground/80" key={label}>{label}</div>)}
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between border-t border-sidebar-border pt-5 text-xs text-sidebar-foreground/50"><span>Thoughtful work compounds.</span><span>FOUNDERBRAIN · PRIVATE BY DESIGN</span></div>
    </section>
    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-md">
        <Link href={mode === 'forgot' ? '/login' : '/'} className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{mode === 'forgot' ? 'Back to sign in' : 'Back to home'}</Link>
        <div className="mb-8 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Command className="h-5 w-5" /></span><span className="text-lg font-semibold">Founderbrain</span></div>
        <Card className="border-0 bg-transparent shadow-none sm:border sm:bg-card sm:shadow-sm">
          <CardHeader className="px-0 pt-0 sm:px-6 sm:pt-6">
            <div className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary">{mode === 'forgot' ? <Mail className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}</div>
            <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
            <CardDescription>{mode === 'login' ? 'Sign in to pick up where your best work left off.' : mode === 'signup' ? 'Start with a private space for the work that matters.' : 'We’ll send a secure reset link to your email.'}</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-6 sm:pb-6">
            {!auth.isLoading && unavailable && <Alert className="mb-5"><LockKeyhole className="h-4 w-4" /><AlertTitle>Authentication isn’t configured</AlertTitle><AlertDescription className="mt-1">{auth.setupMessage}</AlertDescription></Alert>}
            {error && <Alert variant="destructive" className="mb-5"><AlertTitle>Could not continue</AlertTitle><AlertDescription className="mt-1">{error}</AlertDescription></Alert>}
            {message && <Alert className="mb-5"><ShieldCheck className="h-4 w-4" /><AlertTitle>Check your email</AlertTitle><AlertDescription className="mt-1">{message}</AlertDescription></Alert>}
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              {mode === 'signup' && <label className="block space-y-2 text-sm font-medium">Your name<Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Alex Morgan" required data-testid="input-display-name" /></label>}
              <label className="block space-y-2 text-sm font-medium">Email address<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" required data-testid="input-email" /></label>
              {mode !== 'forgot' && <label className="block space-y-2 text-sm font-medium">Password<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} placeholder="At least 8 characters" required data-testid="input-password" /></label>}
              {mode === 'login' && <div className="flex justify-end"><Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline" data-testid="link-forgot-password">Forgot password?</Link></div>}
              <Button className="w-full" type="submit" disabled={busy || unavailable || auth.isLoading} data-testid="button-auth-submit">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}<ArrowRight className="h-4 w-4" /></Button>
            </form>
            {mode === 'signup' && confirmationPending && <div className="mt-4 text-center"><Button variant="outline" type="button" onClick={() => void resendConfirmation()} disabled={busy || unavailable} data-testid="button-resend-verification">{busy ? 'Please wait…' : 'Resend verification email'}</Button></div>}
            {mode !== 'forgot' && <p className="mt-6 text-center text-sm text-muted-foreground">{mode === 'login' ? 'New to Founderbrain?' : 'Already have an account?'}{' '}<Link href={mode === 'login' ? '/signup' : '/login'} className="font-semibold text-primary hover:underline">{mode === 'login' ? 'Create an account' : 'Sign in'}</Link></p>}
            {mode === 'forgot' && message && <div className="mt-4 text-center"><Button variant="outline" onClick={() => { setMessage(''); toast({ title: 'Ready to sign in' }); navigate('/login'); }}>Return to sign in</Button></div>}
          </CardContent>
        </Card>
        <p className="mt-7 text-center text-xs leading-relaxed text-muted-foreground">Your workspace is private to you. Your plans, progress, and next steps stay in your control.</p>
      </div>
    </section>
  </main>;
}
