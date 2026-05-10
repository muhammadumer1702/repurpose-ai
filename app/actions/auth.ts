"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

async function getOrigin(fallback = "http://localhost:3000") {
  const headerList = await headers();
  return headerList.get("origin") ?? fallback;
}

export async function loginWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/dashboard");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(nextPath);
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "login");
  const errorPath = returnTo === "signup" ? "/signup" : "/login";

  if (password.length < 8) {
    redirect(`${errorPath}?error=${encodeURIComponent("Password must be at least 8 characters long.")}`);
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    redirect(`${errorPath}?error=${encodeURIComponent("Password must contain at least one uppercase letter, one lowercase letter, and one number.")}`);
  }

  if (password !== confirmPassword) {
    redirect(`${errorPath}?error=${encodeURIComponent("Passwords do not match.")}`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await getOrigin()}/auth/callback`
    }
  });

  if (error) {
    if (error.message.toLowerCase().includes("user already registered")) {
      redirect(`${errorPath}?error=UserAlreadyExists`);
    }
    redirect(`${errorPath}?error=${encodeURIComponent(error.message)}`);
  }

  if (data?.user && data.user.identities && data.user.identities.length === 0) {
    redirect(`${errorPath}?error=UserAlreadyExists`);
  }

  redirect("/login?message=Check your inbox to confirm your account.");
}

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${await getOrigin()}/auth/callback`
    }
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Magic link sent. Check your inbox.");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
