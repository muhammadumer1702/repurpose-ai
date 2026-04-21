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
        content: `You are a senior content repurposing strategist. Always follow the user's brand voice profile and keep outputs production-ready.

You MUST return a valid JSON object with this exact structure:
{
  "linkedinCarousel": [
    {
      "slideNumber": 1,
      "title": "short catchy title",
      "body": "main content - 2 to 4 short bullet points or paragraphs, professional tone",
      "cta": "optional short call to action or null"
    },
    ... exactly 10 slides
  ],
  "twitterThread": "full thread as string",
  "emailSequence": [
    {
      "emailNumber": 1,
      "subject": "Short, compelling subject line",
      "body": "Full email body text. Professional, authoritative consultant tone. Use [Name] as placeholder for recipient name."
    },
    ... exactly 5 emails
  ],
  "shortVideoScript": "string",
  "seoBlogPost": "string",
  "instagramThreadsCaptions": "string"
}

CRITICAL RULES:
1. linkedinCarousel MUST be an array of exactly 10 slide objects.
   - Each slide object MUST have slideNumber (1-10), title, body, and cta (string or null).
   - "cta" fields MUST be strong, varied (not repetitive), and compel action.
   - Never put markdown formatting inside the slide.
2. emailSequence MUST be exactly 5 email objects (1: Hook+value, 2: Social proof/insight, 3: Simple strategy, 4: Result/benefit, 5: CTA).
3. twitterThread MUST be a highly engaging numbered list with relevant emojis. Substantially improve the first tweet (the hook) and the last tweet (the CTA/wrap-up).
4. instagramThreadsCaptions MUST be formatted as a numbered list with context-appropriate emojis and strong hooks.
5. shortVideoScript MUST be clearly structured as a script containing narrator timing hints, visual cues, and clear speaker lines.
6. seoBlogPost MUST include rich, optimized subheadings and a strong concluding section.
7. Return clean representations avoiding markdown header tags where plain text formatting is requested (like inside JSON arrays).`
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
