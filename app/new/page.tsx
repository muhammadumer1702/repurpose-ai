import { redirect } from "next/navigation";

import { NewRepurposeClient } from "@/app/new/repurpose-client";
import { createClient } from "@/lib/supabase/server";

export default async function NewRepurposePage() {
  const supabase = await createClient();
  let user = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (!user) {
      redirect("/login?next=/new");
    }
  } catch {
    // If auth checking fails completely (e.g. malformed JWT), redirect to login
    redirect("/login");
  }

  let generationsUsed = 0;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("generations_used")
      .eq("id", user.id)
      .single();
    
    if (profile) {
      generationsUsed = profile.generations_used;
    }
  }

  return <NewRepurposeClient generationsUsed={generationsUsed} />;
}
