import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Plus } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  let user = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Fail silently on token error and allow redirect
  }

  if (!user) {
    redirect("/login");
  }

  let generationsUsed = 0;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("generations_used, last_reset_date")
      .eq("id", user.id)
      .single();
    
    if (profile) {
      generationsUsed = profile.generations_used;
      
      if (profile.last_reset_date) {
        const lastResetDate = new Date(profile.last_reset_date);
        const now = new Date();
        if (lastResetDate.getMonth() !== now.getMonth() || lastResetDate.getFullYear() !== now.getFullYear()) {
          generationsUsed = 0;
        }
      }
    }
  }

  const email = user?.email ?? "there";

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  const refreshDate = nextMonth.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <section className="container max-w-3xl py-12 md:py-16">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-2 pb-2">
          <CardTitle className="text-2xl font-semibold tracking-tight md:text-3xl">
            Welcome to Beta! 🎉
          </CardTitle>
          <CardDescription>
            {email} · Dashboard
            <br />
            You have used {generationsUsed} out of 10 free generations this month.
            {generationsUsed >= 10 && (
              <span className="mt-2 block font-medium text-destructive">
                You've reached your free limit of 10 generations this month.<br />
                Your limit will refresh on {refreshDate}.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <p className="text-muted-foreground">
            Ready when you are. Start a new repurposing run to turn your source content into posts your
            audience will actually read.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" className="h-12 gap-2 px-8 text-base shadow-md" asChild>
              <Link href="/new">
                <Plus className="h-5 w-5" />
                Create New Repurpose
              </Link>
            </Button>
            <form action={logout}>
              <Button type="submit" variant="outline" size="lg" className="h-12 w-full gap-2 px-8 sm:w-auto">
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
