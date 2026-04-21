import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type VoiceProfilePayload = {
  voiceSamples?: unknown;
};

function normalizeVoiceSamples(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 5);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_voices")
      .select("voice_samples")
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "No saved voice profile found." }, { status: 404 });
      }

      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        return NextResponse.json(
          { error: "The user_voices table is missing. Run the latest migration and try again." },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      voiceSamples: normalizeVoiceSamples(data?.voice_samples)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = (await request.json()) as VoiceProfilePayload;
    const voiceSamples = normalizeVoiceSamples(payload.voiceSamples);

    if (voiceSamples.length < 3) {
      return NextResponse.json({ error: "At least 3 voice samples are required." }, { status: 400 });
    }

    const { error } = await supabase.from("user_voices").upsert(
      {
        user_id: user.id,
        voice_samples: voiceSamples
      },
      {
        onConflict: "user_id"
      }
    );

    if (error) {
      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        return NextResponse.json(
          { error: "The user_voices table is missing. Run the latest migration and try again." },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ voiceSamples });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
