"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

import { signUpWithPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Validation rules
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Frontend validation
    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      e.preventDefault();
      setError("Please meet all password requirements.");
      return;
    }
    if (password !== confirmPassword) {
      e.preventDefault();
      setError("Passwords do not match.");
      return;
    }
    
    setError(null);
    // Let the form submit to the server action naturally
  };

  const getFeedbackIcon = (isValid: boolean) => {
    if (password.length === 0) return <span className="ml-1 mr-1 text-lg leading-none">•</span>;
    if (isValid) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const getFeedbackColor = (isValid: boolean) => {
    if (password.length === 0) return "text-muted-foreground";
    if (isValid) return "text-emerald-500";
    return "text-destructive";
  };

  return (
    <form action={signUpWithPassword} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="returnTo" value="signup" />
      
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        
        {(passwordFocused || password.length > 0) && (
          <div className="rounded-md border border-border/50 bg-muted/30 p-4 text-sm animate-in fade-in slide-in-from-top-1">
            <p className="font-medium mb-3">Password Requirements:</p>
            <ul className="space-y-2">
              <li className={`flex items-center gap-2 ${getFeedbackColor(hasMinLength)}`}>
                <span className="text-lg leading-none">•</span>
                <span>At least 8 characters</span>
              </li>
              <li className={`flex items-center gap-2 ${getFeedbackColor(hasUppercase)}`}>
                <span className="text-lg leading-none">•</span>
                <span>At least 1 uppercase letter (A-Z)</span>
              </li>
              <li className={`flex items-center gap-2 ${getFeedbackColor(hasLowercase)}`}>
                <span className="text-lg leading-none">•</span>
                <span>At least 1 lowercase letter (a-z)</span>
              </li>
              <li className={`flex items-center gap-2 ${getFeedbackColor(hasNumber)}`}>
                <span className="text-lg leading-none">•</span>
                <span>At least 1 number (0-9)</span>
              </li>
            </ul>
          </div>
        )}

        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Enter a strong password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError(null);
          }}
        />
      </div>
      <Button className="w-full" type="submit">
        Create account
      </Button>
    </form>
  );
}
