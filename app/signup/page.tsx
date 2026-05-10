import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

type SignupPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const error = readParam(params.error);

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 dark:opacity-30"
        aria-hidden
      >
        <div className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="mb-8 text-center">
        <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
          Repurpose AI
        </Link>
      </div>

      <Card className="w-full max-w-[420px] border-border/60 shadow-lg shadow-black/5 dark:shadow-black/20">
        <CardHeader className="space-y-1 pb-6 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">Create your account</CardTitle>
          <CardDescription className="text-base">
            Start repurposing webinars, podcasts, and reports in minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error === "UserAlreadyExists" ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>
                An account with this email already exists.{" "}
                <Link href="/login" className="font-medium underline underline-offset-4">
                  Please sign in instead.
                </Link>
              </p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <SignupForm />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
