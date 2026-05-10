import OpenAI from "openai";
import { NextResponse } from "next/server";
import { YoutubeTranscript } from 'youtube-transcript';

import { createClient } from "@/lib/supabase/server";

type CarouselSlide = {
  slideNumber: number;
  title: string;
  body: string;
  cta: string | null;
};

type EmailSequenceEmail = {
  emailNumber: number;
  subject: string;
  body: string;
};

type RepurposeOutputs = {
  internalSummary?: string;
  linkedinCarousel: CarouselSlide[];
  twitterThread: string;
  emailSequence: EmailSequenceEmail[];
  shortVideoScript: string;
  seoBlogPost: string;
  instagramThreadsCaptions: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function isAudioFile(file: File) {
  return file.type.startsWith("audio/") || file.name.toLowerCase().endsWith(".mp3") || file.name.toLowerCase().endsWith(".wav");
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function extractTextFromFile(file: File): Promise<string> {
  if (isAudioFile(file)) {
    const transcript = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1"
    });
    return transcript.text.trim();
  }

  if (isPdfFile(file)) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Extract all readable text from this PDF. Return plain text only and keep structure where possible."
            },
            {
              type: "input_file",
              filename: file.name,
              file_data: `data:application/pdf;base64,${base64}`
            }
          ]
        }
      ]
    });
    return response.output_text.trim();
  }

  return (await file.text()).trim();
}

async function buildVoiceProfile(sampleText: string): Promise<string> {
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content:
          "You are a brand voice strategist. Build concise, actionable voice profiles from writing samples."
      },
      {
        role: "user",
        content: `Analyze the following voice samples and produce a brand voice profile with:
- Tone descriptors
- Vocabulary preferences
- Sentence rhythm and formatting style
- Banned patterns
- CTA style
- Platform adaptation notes

Voice samples:
${sampleText}`
      }
    ]
  });

  return response.output_text.trim();
}

async function generateRepurposedOutputs(transcript: string, voiceProfile: string): Promise<RepurposeOutputs> {
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content: `You are an elite, world-class copywriter who commands top rates. Your mission is to generate the absolute highest-converting, premium, market-ready content.

*** ABSOLUTE RULE (TOP PRIORITY) ***
First, transcribe and deeply understand the source content (especially YouTube videos). The main topic and key messages from the source MUST be the foundation of ALL outputs. Never override the source topic. If the video is about sleep science, all outputs must be about sleep science. Do not turn it into general motivation, consulting, or high-ticket sales content.

*** BRAND VOICE LIMITATIONS ***
Brand voice should ONLY influence tone, phrasing, and style — NEVER the core subject or key points.

CORE STYLE & STANDARDS (APPLY TO ALL OUTPUTS):
- Tone: Bold, authoritative, insightful, and slightly provocative.
- Hooks & Titles: Extremely magnetic, curiosity-driven, and designed to stop the scroll immediately.
- Structure: Zero generic bullets. Use powerful, flowing paragraphs and natural storytelling.
- Language: 100% human, expert-crafted feel. ZERO generic AI language. Banned words: "In today's digital age", "Unlock your potential", "Game-changer", "Delve", "Supercharge", "Elevate", "Landscape".
- CTAs: Strong, natural, benefit-rich, and emotional. Create intense, undeniable desire.

You MUST return a valid JSON object with this exact structure:
{
  "internalSummary": "First, deeply analyze and write a short summary of the source content. Identify the core topic, key messages, and exact tone. Base ALL subsequent outputs STRICTLY on this summary.",
  "linkedinCarousel": [
    {
      "slideNumber": 1,
      "title": "Highly compelling, unique, curiosity-driven title (Max 6 words)",
      "body": "Smooth narrative flow using powerful paragraphs. Weave deep insights and authority with practical advice. NO instructional language. NO generic lists.",
      "cta": "Powerful, emotional, varied CTA or null"
    },
    ... exactly 10 slides
  ],
  "twitterThread": "Full thread as string",
  "emailSequence": [
    {
      "emailNumber": 1,
      "subject": "Highly clickable, irresistible subject line",
      "body": "Full email body. Unbelievably clear, persuasive, and warm. Reads like a personal, high-value note from a top consultant."
    },
    ... exactly 5 emails
  ],
  "shortVideoScript": "string",
  "seoBlogPost": "string",
  "instagramThreadsCaptions": "string"
}

CRITICAL RULES FOR EACH FORMAT:
1. linkedinCarousel (Most Important):
   - MUST be exactly 10 slides.
   - EVERY single slide title must be highly compelling and unique.
   - Create a smooth, unbroken storytelling narrative across all 10 slides. Connect them seamlessly.
   - Radically reduce instructional, "how-to" language. Replace it with deep insight and commanding authority.
   - CTAs must be powerful, varied, and completely natural.
   - No markdown formatting inside the slides.
2. instagramThreadsCaptions:
   - Generate exactly 10 high-quality, varied, emotionally engaging captions.
   - Mix short, punchy captions with longer, value-packed stories.
   - Make them highly shareable, ready to post immediately. Use emojis strategically for rhythm. Present as a numbered list.
3. twitterThread:
   - Extremely hooky, engaging, and highly shareable. Clear, persuasive, and premium.
4. emailSequence:
   - Exactly 5 emails.
   - Subject lines must be impossible to ignore.
   - Deeply persuasive, warm tone with crystal clarity.
5. seoBlogPost:
   - Much longer and richer, with exceptional structure, depth, and clarity. Avoid sounding like a generic article.
6. shortVideoScript:
   - Highly vivid, premium feel. Clear pacing and visual/B-roll cues in brackets.
7. Technical formatting:
   - Ensure clean, valid JSON. Avoid markdown formatting where plain text is requested.`
      },
      {
        role: "user",
        content: `Using the transcript/content below and the brand voice profile, generate all 6 content outputs.

Brand voice profile:
${voiceProfile}

Source transcript/content:
${transcript}`
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "repurpose_outputs",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            internalSummary: { type: "string" },
            linkedinCarousel: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  slideNumber: { type: "integer" },
                  title: { type: "string" },
                  body: { type: "string" },
                  cta: { type: ["string", "null"] }
                },
                required: ["slideNumber", "title", "body", "cta"]
              }
            },
            twitterThread: { type: "string" },
            emailSequence: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  emailNumber: { type: "integer" },
                  subject: { type: "string" },
                  body: { type: "string" }
                },
                required: ["emailNumber", "subject", "body"]
              }
            },
            shortVideoScript: { type: "string" },
            seoBlogPost: { type: "string" },
            instagramThreadsCaptions: { type: "string" }
          },
          required: [
            "internalSummary",
            "linkedinCarousel",
            "twitterThread",
            "emailSequence",
            "shortVideoScript",
            "seoBlogPost",
            "instagramThreadsCaptions"
          ]
        }
      }
    }
  });

  const parsed = JSON.parse(response.output_text);

  // Ensure linkedinCarousel and emailSequence are always arrays
  const outputs: RepurposeOutputs = {
    internalSummary: parsed.internalSummary ?? "",
    linkedinCarousel: Array.isArray(parsed.linkedinCarousel) ? parsed.linkedinCarousel : [],
    twitterThread: parsed.twitterThread ?? "",
    emailSequence: Array.isArray(parsed.emailSequence) ? parsed.emailSequence : [],
    shortVideoScript: parsed.shortVideoScript ?? "",
    seoBlogPost: parsed.seoBlogPost ?? "",
    instagramThreadsCaptions: parsed.instagramThreadsCaptions ?? ""
  };

  return outputs;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("generations_used, tier, last_reset_date")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // Ignore row not found error
      console.error("Error fetching profile:", profileError.message);
    }

    const tier = profile?.tier || "beta_free";
    let generationsUsed = profile?.generations_used || 0;

    if (profile?.last_reset_date) {
      const lastResetDate = new Date(profile.last_reset_date);
      const now = new Date();
      if (lastResetDate.getMonth() !== now.getMonth() || lastResetDate.getFullYear() !== now.getFullYear()) {
        generationsUsed = 0;
      }
    }

    if (tier === "beta_free" && generationsUsed >= 10) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      const refreshDate = nextMonth.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

      return NextResponse.json(
        { error: `You've reached your free limit of 10 generations this month. Your limit will refresh on ${refreshDate}.` },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const youtubeLink = String(formData.get("youtubeLink") ?? "").trim();
    const rawText = String(formData.get("rawText") ?? "").trim();
    const voiceText = String(formData.get("voiceText") ?? "").trim();
    const sourceFile = formData.get("sourceFile");
    const voiceFiles = formData.getAll("voiceFiles");

    let sourceTranscript = "";
    let sourceType = "text";

    if (sourceFile instanceof File && sourceFile.size > 0) {
      sourceTranscript = await extractTextFromFile(sourceFile);
      sourceType = isAudioFile(sourceFile) ? "audio" : isPdfFile(sourceFile) ? "pdf" : "file";
    } else if (rawText) {
      sourceTranscript = rawText;
      sourceType = "raw_text";
    } else if (youtubeLink) {
      try {
        const transcriptArr = await YoutubeTranscript.fetchTranscript(youtubeLink);
        const text = transcriptArr.map(t => t.text).join(' ');
        sourceTranscript = `Source URL: ${youtubeLink}\n\nTranscript: ${text}`;
        sourceType = "youtube_link";
      } catch (err) {
        console.error("Failed to fetch YouTube transcript:", err);
        sourceTranscript = `Source URL: ${youtubeLink}\n\n(Transcript could not be fetched. Do your best to infer from the title/URL, but stick strictly to the topic.)`;
        sourceType = "youtube_link";
      }
    } else {
      return NextResponse.json(
        { error: "Provide at least one source input: YouTube link, file upload, or raw text." },
        { status: 400 }
      );
    }

    const voiceChunks: string[] = [];
    if (voiceText) {
      voiceChunks.push(voiceText);
    }

    for (const fileEntry of voiceFiles) {
      if (fileEntry instanceof File && fileEntry.size > 0) {
        const parsed = await extractTextFromFile(fileEntry);
        if (parsed) {
          voiceChunks.push(parsed);
        }
      }
    }

    if (voiceChunks.length < 3) {
      return NextResponse.json(
        { error: "Upload or paste at least 3 voice samples to build your brand voice profile." },
        { status: 400 }
      );
    }

    const voiceProfile = await buildVoiceProfile(voiceChunks.join("\n\n---\n\n"));
    const outputs = await generateRepurposedOutputs(sourceTranscript, voiceProfile);

    const { error: insertError } = await supabase.from("repurpose_history").insert({
      user_id: user.id,
      source_type: sourceType,
      source_input: sourceTranscript,
      voice_profile: voiceProfile,
      outputs
    });

    if (insertError) {
      console.error("Failed to save repurpose history:", insertError.message);
    }

    // Increment usage
    const { error: updateError } = await supabase
      .rpc("increment_generations_used", { user_id: user.id });

    if (updateError) {
      console.error("Failed to update generations_used:", updateError.message);
    }

    return NextResponse.json({
      outputs
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
