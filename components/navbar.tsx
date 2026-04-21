"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const supabase = createClient();

      // Get the initial user from the browser client
      supabase.auth
        .getUser()
        .then(({ data }) => {
          setUser(data?.user ?? null);
        })
        .catch(() => {
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });

      // Subscribe to auth state changes so the navbar always stays in sync
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      });
      subscription = data.subscription;
    } catch {
      // If createClient fails (e.g. missing env vars), show logged-out state
      setUser(null);
      setIsLoading(false);
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          Repurpose AI
        </Link>
        <div className="flex items-center gap-2">
          {isLoading ? (
            // Render nothing for auth buttons while loading to avoid flash
            <div className="w-[120px]" />
          ) : user ? (
            <>
              <span className="mr-2 text-sm text-muted-foreground hidden sm:inline-block">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/new">New</Link>
              </Button>
              <form action={logout}>
                <Button variant="outline" size="sm" type="submit">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
