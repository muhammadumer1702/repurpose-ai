import { redirect } from "next/navigation";

import { NewRepurposeClient } from "@/app/new/repurpose-client";
import { createClient } from "@/lib/supabase/server";

export default async function NewRepurposePage() {
  const supabase = await createClient();

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login?next=/new");
    }
  } catch {
    // If auth checking fails completely (e.g. malformed JWT), redirect to login
    redirect("/login");
  }

  return <NewRepurposeClient />;
}
