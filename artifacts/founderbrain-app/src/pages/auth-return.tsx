import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@workspace/founderbrain-design-system/components/ui/alert';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/founderbrain-design-system/components/ui/card';
import { Input } from '@workspace/founderbrain-design-system/components/ui/input';
import { useAuth } from '@/contexts/auth-context';

type LinkState = 'loading' | 'expired' | 'invalid' | 'unconfigured' | 'ready';

function readLinkError() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const code = hash.get('error_code') ?? query.get('error_code');
  const error = hash.get('error') ?? query.get('error');
  if (!code && !error) return null;

  window.history.replaceState(null, document.title, window.location.pathname);
  return code === 'otp_expired'
    ? 'expired' as const
    : 'invalid' as const;
}

function AuthReturnLayout({
  icon,
  title,
  description,
  children,
}: {
  icon: 'email' | 'password';
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary">
            {icon === 'email' ? <Mail className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </div>
          <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}

export function EmailVerificationCallbackPage() {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const linkError = useRef<LinkState | null>(null);
  const linkErrorChecked = useRef(false);
  const [state, setState] = useState<LinkState>('loading');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!linkErrorChecked.current) {
      linkErrorChecked.current = true;
      linkError.current = readLinkError();
    }
    if (!auth.isConfigured) {
      setState('unconfigured');
      return;
    }
    if (linkError.current) {
      setState(linkError.current);
      return;
    }
    if (auth.isLoading) {
      setState('loading');
      return;
    }
    if (auth.user) {
      navigate('/dashboard');
      return;
    }
    setState('invalid');
  }, [auth.isConfigured, auth.isLoading, auth.user, navigate]);

  const resend = async (event: FormEvent) => {
    event.preventDefault();
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

  if (state === 'loading') {
    return (
      <AuthReturnLayout icon="email" title="Verifying your email" description="We’re checking the secure link from your email.">
        <p className="text-sm text-muted-foreground" role="status">Please wait…</p>
      </AuthReturnLayout>
    );
  }

  if (state === 'unconfigured') {
    return (
      <AuthReturnLayout icon="email" title="Authentication isn’t configured" description="This email link can’t be checked until the Supabase project is connected.">
        <Alert>
          <LockKeyhole className="h-4 w-4" />
          <AlertTitle>Supabase setup required</AlertTitle>
          <AlertDescription className="mt-1">{auth.setupMessage}</AlertDescription>
        </Alert>
      </AuthReturnLayout>
    );
  }

  return (
    <AuthReturnLayout
      icon="email"
      title={state === 'expired' ? 'This verification link has expired' : 'We couldn’t verify this link'}
      description={state === 'expired'
        ? 'Request a new verification email, then open its link from the same browser.'
        : 'The link may be invalid, already used, or missing its session. You can request a fresh link below.'}
    >
      {message && <Alert className="mb-4"><ShieldCheck className="h-4 w-4" /><AlertTitle>Request received</AlertTitle><AlertDescription className="mt-1">{message}</AlertDescription></Alert>}
      {error && <Alert variant="destructive" className="mb-4"><AlertTitle>Could not resend the email</AlertTitle><AlertDescription className="mt-1">{error}</AlertDescription></Alert>}
      <form onSubmit={(event) => void resend(event)} className="space-y-4">
        <label className="block space-y-2 text-sm font-medium">
          Email address
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
            disabled={busy || !auth.isConfigured}
            data-testid="input-verification-email"
          />
        </label>
        <Button className="w-full" type="submit" disabled={busy || !auth.isConfigured} data-testid="button-resend-expired-verification">
          {busy ? 'Please wait…' : 'Resend verification email'}
        </Button>
      </form>
      <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </AuthReturnLayout>
  );
}

export function PasswordUpdatePage() {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const linkError = useRef<LinkState | null>(null);
  const linkErrorChecked = useRef(false);
  const [state, setState] = useState<LinkState>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!linkErrorChecked.current) {
      linkErrorChecked.current = true;
      linkError.current = readLinkError();
    }
    if (!auth.isConfigured) {
      setState('unconfigured');
      return;
    }
    if (linkError.current) {
      setState(linkError.current);
      return;
    }
    if (auth.isLoading) {
      setState('loading');
      return;
    }
    setState(auth.user ? 'ready' : 'invalid');
  }, [auth.isConfigured, auth.isLoading, auth.user]);

  const submitNewPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await auth.updatePassword(password);
      navigate('/dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not update your password. Request a new reset link and try again.');
    } finally {
      setBusy(false);
    }
  };

  const requestAnotherReset = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await auth.requestPasswordReset(email.trim());
      setMessage('If an account exists for this address, a new password reset email is on its way.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not send a reset email. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return (
      <AuthReturnLayout icon="password" title="Checking your reset link" description="We’re validating the secure link from your email.">
        <p className="text-sm text-muted-foreground" role="status">Please wait…</p>
      </AuthReturnLayout>
    );
  }

  if (state === 'unconfigured') {
    return (
      <AuthReturnLayout icon="password" title="Authentication isn’t configured" description="This reset link can’t be checked until the Supabase project is connected.">
        <Alert>
          <LockKeyhole className="h-4 w-4" />
          <AlertTitle>Supabase setup required</AlertTitle>
          <AlertDescription className="mt-1">{auth.setupMessage}</AlertDescription>
        </Alert>
      </AuthReturnLayout>
    );
  }

  if (state !== 'ready') {
    return (
      <AuthReturnLayout
        icon="password"
        title={state === 'expired' ? 'This reset link has expired' : 'We couldn’t verify this reset link'}
        description="Request a fresh password reset email to continue."
      >
        {message && <Alert className="mb-4"><ShieldCheck className="h-4 w-4" /><AlertTitle>Request received</AlertTitle><AlertDescription className="mt-1">{message}</AlertDescription></Alert>}
        {error && <Alert variant="destructive" className="mb-4"><AlertTitle>Could not send the reset email</AlertTitle><AlertDescription className="mt-1">{error}</AlertDescription></Alert>}
        <form onSubmit={(event) => void requestAnotherReset(event)} className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">
            Email address
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              disabled={busy || !auth.isConfigured}
              data-testid="input-reset-email"
            />
          </label>
          <Button className="w-full" type="submit" disabled={busy || !auth.isConfigured} data-testid="button-resend-reset">
            {busy ? 'Please wait…' : 'Send a new reset link'}
          </Button>
        </form>
        <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </AuthReturnLayout>
    );
  }

  return (
    <AuthReturnLayout icon="password" title="Choose a new password" description="Use at least eight characters for your new password.">
      {error && <Alert variant="destructive" className="mb-4"><AlertTitle>Password wasn’t changed</AlertTitle><AlertDescription className="mt-1">{error}</AlertDescription></Alert>}
      {message && <Alert className="mb-4"><AlertTitle>Password updated</AlertTitle><AlertDescription className="mt-1">{message}</AlertDescription></Alert>}
      <form onSubmit={(event) => void submitNewPassword(event)} className="space-y-4">
        <label className="block space-y-2 text-sm font-medium">
          New password
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
            disabled={busy}
            data-testid="input-new-password"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Confirm new password
          <Input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
            disabled={busy}
            data-testid="input-confirm-new-password"
          />
        </label>
        <Button className="w-full" type="submit" disabled={busy} data-testid="button-update-password">
          {busy ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthReturnLayout>
  );
}
