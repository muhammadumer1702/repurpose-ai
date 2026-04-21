import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

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
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-20 sm:py-28">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-50 dark:opacity-35"
          aria-hidden
        >
          <div className="absolute left-1/2 top-1/4 h-[min(560px,90vw)] w-[min(560px,90vw)] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Trusted by teams who ship content every week
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl md:leading-[1.1]">
            Turn one webinar, podcast, or report into 10+ platform-ready posts — in seconds
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            Repurpose AI turns long-form source material into LinkedIn carousels, threads, email sequences,
            and more — with a workflow built for serious operators, not gimmicks.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="min-w-[200px] shadow-md" asChild>
              <Link href="/login">
                Get Started for Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="min-w-[200px]" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-muted/20 py-10">
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
