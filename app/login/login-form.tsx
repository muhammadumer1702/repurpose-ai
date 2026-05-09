"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

import { loginWithPassword, sendMagicLink } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next: string }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <form action={showPassword ? loginWithPassword : sendMagicLink} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              className="pl-9"
            />
          </div>
        </div>
        
        {showPassword && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          {!showPassword ? (
            <>
              <Button className="w-full" type="submit">
                <Mail className="mr-2 h-4 w-4" />
                Send Magic Link
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={() => setShowPassword(true)}
              >
                Sign in with Password
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" type="submit">
                Sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full text-xs text-muted-foreground" 
                onClick={() => setShowPassword(false)}
              >
                ← Back to Magic Link
              </Button>
            </>
          )}
        </div>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
