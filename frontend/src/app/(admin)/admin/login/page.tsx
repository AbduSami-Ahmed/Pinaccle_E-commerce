'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchCurrentUser, loginUser } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Check if already authenticated; if so, redirect directly to dashboard
  React.useEffect(() => {
    let mounted = true;
    void fetchCurrentUser().then((user) => {
      if (mounted && user?.isStaff) {
        router.replace('/admin/dashboard');
      }
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleFillDemoAdmin = () => {
    setEmail('zayd@gmail.com');
    setPassword('password123');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your staff email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await loginUser(email.trim(), password);

      if (!res.success) {
        setErrorMsg(res.error || 'Invalid credentials. Please verify your staff email and password.');
        setIsLoading(false);
        return;
      }

      // Successful login -> Redirect to Admin Dashboard
      router.push('/admin/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while logging in.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Decorative backdrop elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 text-white mb-2">
            <Wrench className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Pinnacle Auto Parts
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Staff & Operational Administration Portal
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Badge variant="outline" className="border-blue-500/40 text-blue-300 text-[10px] uppercase font-mono">
              Penrose Auckland Depot
            </Badge>
            <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px] font-mono">
              NZST / NZDT
            </Badge>
          </div>
        </div>

        {/* Demo Credentials Quick Fill Banner */}
        <div className="bg-blue-950/60 border border-blue-500/30 rounded-xl p-3 shadow-lg backdrop-blur-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-200">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                Default Administrator Account
              </div>
              <p className="text-[11px] text-blue-300/80 font-mono">
                Email: <span className="text-white font-bold">zayd@gmail.com</span>
                <br />
                Password: <span className="text-white font-bold">password123</span>
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleFillDemoAdmin}
              className="text-xs h-7 border-blue-400/40 text-blue-200 hover:bg-blue-600 hover:text-white transition-all shrink-0"
            >
              Autofill
            </Button>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              Staff Authentication
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Sign in with your verified staff credentials to access orders, stock, and fitment controls.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between" htmlFor="staff-email">
                  <span>Staff Work Email</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="staff-email"
                    type="email"
                    placeholder="e.g. zayd@gmail.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 text-xs h-10 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between" htmlFor="staff-password">
                  <span>Password</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="staff-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter staff password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 text-xs h-10 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-2.5 flex items-center gap-2 text-[11px] text-slate-400">
                <KeyRound className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Sessions are encrypted with HTTP-only tokens and strictly audited.</span>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <span>Sign In to Staff Portal</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/"
                  className="text-xs text-slate-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                >
                  ← Return to Public Storefront
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500">
          Pinnacle Automotive Trading Ltd &copy; {new Date().getFullYear()}. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}

