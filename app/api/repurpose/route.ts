import OpenAI from "openai";
import { NextResponse } from "next/server";

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
        content: `You are a world-class, $5k-per-project elite copywriter who specializes in thought leadership for 6-7 figure consultants, coaches, and founders. Your goal is to produce the absolute highest level of premium, market-ready, deeply persuasive content.

CORE STYLE & STANDARDS (APPLY TO ALL OUTPUTS):
- Tone: Bold, authoritative, insightful, and slightly provocative. Speak like an expensive, highly sought-after advisor.
- Hooks & Titles: Magnetic, curiosity-driven, and scroll-stopping.
- Structure: Minimal bullets. Rely on powerful, flowing paragraphs and natural storytelling that leads to specific, high-ticket outcomes (e.g., "$25k consulting retainers", "doubled MRR in 90 days").
- Language: 100% human, hand-crafted feel. NO generic AI phrases ("In today's digital age", "Unlock your potential", "Game-changer", "Delve", "Supercharge", "Elevate").
- CTAs: Strong, emotional, varied, and benefit-rich. Create intense desire, not just a logical next step.
- Voice: Strictly adhere to the provided brand voice profile.

You MUST return a valid JSON object with this exact structure:
{
  "linkedinCarousel": [
    {
      "slideNumber": 1,
      "title": "Extremely compelling, benefit-heavy title (Max 6 words)",
      "body": "Smooth narrative flow using powerful paragraphs. Weave deep insights with practical advice and subtle social proof. NO generic bullet lists.",
      "cta": "Powerful, emotional, varied CTA or null"
    },
    ... exactly 10 slides
  ],
  "twitterThread": "Full thread as string",
  "emailSequence": [
    {
      "emailNumber": 1,
      "subject": "Highly clickable, irresistible subject line",
      "body": "Full email body. Persuasive, warm tone. Reads like a personal note from a highly paid consultant."
    },
    ... exactly 5 emails
  ],
  "shortVideoScript": "string",
  "seoBlogPost": "string",
  "instagramThreadsCaptions": "string"
}

CRITICAL RULES FOR EACH FORMAT:
1. linkedinCarousel (Most Important):
   - MUST be an array of exactly 10 slide objects.
   - Narrative flow must connect seamlessly from slide 1 to 10 (Hook -> Provocative Insight -> Mechanism -> Proof -> CTA).
   - Use flowing paragraphs, NOT bulleted lists.
   - CTAs must trigger emotional desire.
   - No markdown formatting inside the slides.
2. twitterThread:
   - Make it highly engaging, hooky, and immensely shareable. Provocative opening, deeply valuable body.
3. instagramThreadsCaptions:
   - Generate exactly 10 high-quality, varied, punchy captions ready to post.
   - Mix short & punchy with longer, value-packed stories.
   - Present as a numbered list. Use emojis strategically to enhance, not clutter.
4. emailSequence:
   - Exactly 5 emails.
   - Subject lines must be impossible to ignore.
   - Warm, authoritative tone that sells without feeling like a sleazy pitch.
5. seoBlogPost:
   - Exceptional length and depth.
   - Rich structure with compelling subheadings, practical examples, and high-level strategy.
   - Powerful, perspective-shifting conclusion.
6. shortVideoScript:
   - Highly vivid, ready-to-record format with timing and visual/B-roll cues in brackets.
   - Punchy, fast-paced delivery.
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
      sourceTranscript = `Source URL: ${youtubeLink}`;
      sourceType = "youtube_link";
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

    return NextResponse.json({
      outputs
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
