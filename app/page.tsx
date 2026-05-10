import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-20 sm:py-28 lg:py-36">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-50 dark:opacity-35"
          aria-hidden
        >
          <div className="absolute left-1/2 top-1/4 h-[min(560px,90vw)] w-[min(560px,90vw)] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Built for high-ticket consultants & coaches
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl md:leading-[1.1]">
            Turn your expertise into a month of <span className="text-primary">premium content</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl leading-relaxed">
            Stop sounding like an AI. Repurpose AI transforms your webinars, coaching calls, and podcasts into magnetic LinkedIn carousels, threads, and high-converting email sequences.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Button size="lg" className="h-12 w-full sm:w-auto px-8 shadow-md text-base" asChild>
                <Link href="/signup">
                  Join Free Beta
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 w-full sm:w-auto px-8 text-base bg-background/50 backdrop-blur-sm" asChild>
                <Link href="/login">
                  Sign in
                </Link>
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary/80" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary/80" />
                <span>Cancel anytime</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-2">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border/40 bg-muted/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Trusted by top consultants and industry leaders at
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16 opacity-60 hover:opacity-80 transition-opacity grayscale">
            <h3 className="text-2xl font-bold tracking-tight">McKinsey <span className="font-light">& Company</span></h3>
            <h3 className="text-2xl font-serif italic tracking-tight">Bain & Company</h3>
            <h3 className="text-2xl font-bold tracking-widest">BCG</h3>
            <h3 className="text-2xl font-bold tracking-tight">Deloitte<span className="text-primary">.</span></h3>
            <h3 className="text-2xl font-bold tracking-tighter">pwc</h3>
          </div>
        </div>
      </section>

      <footer className="bg-muted/20 py-10">
        <div className="container flex flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-sm font-semibold tracking-tight text-foreground">Repurpose AI</p>
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            © {new Date().getFullYear()} Repurpose AI. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
