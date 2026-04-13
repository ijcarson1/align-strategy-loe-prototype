import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { DEMO_USERS } from '../constants/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field';

export default function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const ok = login(email, password);
    setLoading(false);
    if (ok) navigate('/dashboard');
    else setError('Invalid email or password.');
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M3 14L8 9L11 12L17 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="17" cy="6" r="2" fill="white"/>
              </svg>
            </div>
            Align Strategy
          </a>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Sign in to your forecasting workspace
                  </p>
                </div>

                <Field data-invalid={!!error || undefined}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    aria-invalid={!!error || undefined}
                    className="bg-background"
                  />
                </Field>

                <Field data-invalid={!!error || undefined}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    aria-invalid={!!error || undefined}
                    className="bg-background"
                  />
                  {error && <FieldError>{error}</FieldError>}
                </Field>

                <Field>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Signing in…' : 'Sign in'}
                  </Button>
                </Field>
              </FieldGroup>

              <div className="rounded-lg border border-primary/20 bg-accent/30 p-3 text-xs space-y-2">
                <p className="font-semibold text-primary">Demo credentials</p>
                {DEMO_USERS.map(u => (
                  <div key={u.email} className="space-y-0.5">
                    <p className="text-muted-foreground font-mono text-[11px]">{u.email}</p>
                    <p className="text-muted-foreground">
                      <span className="font-mono text-foreground">{u.password}</span>
                      <span className="ml-2 text-muted-foreground/70">
                        {u.user.role === 'global' ? '· Global' : `· ${u.user.company}`}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right: Brand panel */}
      <div className="relative hidden bg-sidebar lg:flex flex-col justify-between p-12 text-sidebar-foreground overflow-hidden">
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-primary opacity-10" />
        <div className="absolute top-24 -right-16 size-64 rounded-full bg-primary opacity-5" />

        <div className="relative" />

        <div className="flex flex-col gap-6 relative">
          <div className="flex flex-col gap-3">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
              Aligning Futures,<br />
              <span className="text-primary">Guiding Strategy.</span>
            </h2>
            <p className="text-lg text-sidebar-foreground/60 leading-relaxed">
              Superior strategy development in the pharmaceutical industry through precise, data-driven LOE forecasting.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              'Momentum-based volume forecasting',
              'Multi-segment market modelling',
              'Scenario comparison & sensitivity analysis',
            ].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="size-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-sm text-sidebar-foreground/70">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/30 relative">
          © 2026 Align Strategy Ltd. · London · Boston · New York
        </p>
      </div>
    </div>
  );
}
