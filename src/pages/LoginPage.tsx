import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { DEMO_CREDENTIALS } from '../constants/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
    await new Promise(r => setTimeout(r, 500));
    const ok = login(email, password);
    setLoading(false);
    if (ok) navigate('/dashboard');
    else setError('Invalid email or password.');
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 bg-sidebar text-sidebar-foreground relative overflow-hidden">
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-primary opacity-10" />
        <div className="absolute top-24 -right-16 size-64 rounded-full bg-primary opacity-5" />

        <div className="flex items-center gap-3 relative">
          <div className="size-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M3 14L8 9L11 12L17 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="17" cy="6" r="2" fill="white"/>
            </svg>
          </div>
          <span className="text-xl font-semibold tracking-tight">Align Strategy</span>
        </div>

        <div className="space-y-6 relative">
          <Badge variant="secondary" className="bg-primary/20 text-primary-foreground border-0 text-xs uppercase tracking-wider">
            LOE Forecasting Platform
          </Badge>
          <div className="space-y-3">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              Aligning Futures,<br />
              <span className="text-primary">Guiding Strategy.</span>
            </h1>
            <p className="text-lg text-sidebar-foreground/60 leading-relaxed">
              Superior strategy development in the pharmaceutical industry through precise, data-driven LOE forecasting.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { icon: '📊', text: 'Momentum-based volume forecasting' },
              { icon: '⚗️', text: 'Multi-segment market modelling' },
              { icon: '🔀', text: 'Scenario comparison & sensitivity analysis' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm flex-shrink-0">{f.icon}</div>
                <span className="text-sm text-sidebar-foreground/70">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/30 relative">
          © 2026 Align Strategy Ltd. · London · Boston · New York
        </p>
      </div>

      {/* Login panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M3 14L8 9L11 12L17 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="17" cy="6" r="2" fill="white"/>
            </svg>
          </div>
          <span className="text-lg font-semibold">Align Strategy</span>
        </div>

        <Card className="w-full max-w-sm shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your forecasting workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  aria-invalid={!!error || undefined}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  aria-invalid={!!error || undefined}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin size-4" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2"/>
                      <path d="M14 8A6 6 0 0 0 8 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign in'}
              </Button>
            </form>

            <Separator className="my-4" />

            <div className={cn(
              'rounded-lg border p-3 text-xs',
              'bg-accent/30 border-primary/20'
            )}>
              <p className="font-semibold text-primary mb-1">Demo credentials</p>
              <p className="text-muted-foreground">Email: <span className="font-mono text-foreground">{DEMO_CREDENTIALS.email}</span></p>
              <p className="text-muted-foreground">Password: <span className="font-mono text-foreground">{DEMO_CREDENTIALS.password}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
