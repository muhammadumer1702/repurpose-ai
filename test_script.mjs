import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
  apiKey: "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",
});

const transcript = `A lot of coaches and consultants hit a ceiling at $10k a month because they're relying entirely on organic hustle. They're posting 5 times a day on LinkedIn, sending 100 cold DMs, and burning out. What they don't realize is that true authority isn't about being everywhere; it's about being undeniably valuable to a specific group of people. If you want to scale to $50k or $100k months, you need to transition from the 'hustler' archetype to the 'authority' archetype. This means productizing your knowledge into a high-ticket offer, building an automated acquisition system, and focusing your content on paradigm-shifting insights rather than 'how-to' tutorials. When you shift from 'how-to' to 'how-to-think', you stop competing on price and start competing on value.`;

const voiceProfile = `Tone: Bold, direct, authoritative, premium, concise.
Vocabulary: Paradigm-shifting, high-ticket, acquisition system, undeniable, authority.
Format: Punchy sentences, no fluff, zero generic 'cheerleader' AI tones. Professional yet sharp consultant tone.`;

async function testPrompt() {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an elite, top-tier copywriter and brand strategist who specializes in high-end consultants, coaches, and 7-figure founders. Your singular goal is to produce premium, authoritative, insightful, and deeply persuasive content that feels 100% human-written, engaging, and directly drives action. 

You are strictly forbidden from using generic, weak AI language. NEVER use phrases like: "In today's digital age", "Unlock your potential", "Dive in", "Supercharge", "Elevate", "Game-changer", "Revolutionize", "Whether you are a... or a...", "At the end of the day", or "Bustling landscape". 
Instead, write with the conviction, punch, and clarity of a high-paid consultant. Every word must earn its place. Always strictly follow the user's brand voice profile.

You MUST return a valid JSON object with this exact structure:
{
  "linkedinCarousel": [
    {
      "slideNumber": 1,
      "title": "Short, punchy, magnetic title (Max 6 words)",
      "body": "Highly scannable content: short sentences, bullet points, zero fluff. Professional, bold consultant tone.",
      "cta": "Optional powerful, non-repetitive CTA or null"
    },
    ... exactly 10 slides
  ],
  "twitterThread": "Full thread as string",
  "emailSequence": [
    {
      "emailNumber": 1,
      "subject": "High open-rate style subject line (short, curiosity-driven, lowercase if appropriate)",
      "body": "Full email body text. Natural, conversational, persuasive flow. Progressive value building. Use [Name] as placeholder for recipient name."
    },
    ... exactly 5 emails
  ],
  "shortVideoScript": "string",
  "seoBlogPost": "string",
  "instagramThreadsCaptions": "string"
}

CRITICAL RULES FOR QUALITY & FORMATTING:
1. linkedinCarousel (Most Important):
   - MUST be an array of exactly 10 slide objects.
   - Titles must be magnetic, counter-intuitive, or call out a specific pain point to stop the scroll.
   - Storytelling must flow logically: Hook -> Agitate Problem -> Introduce Paradigm Shift -> Explain Mechanism -> CTA.
   - Body copy must be highly scannable. Use 1-2 sentence paragraphs and impactful bullet points.
   - Provide strong hooks, valuable insights, and powerful CTAs.
   - Never put markdown formatting inside the slide.
2. emailSequence:
   - MUST be exactly 5 email objects (1: Hook+value, 2: Social proof/insight, 3: Simple strategy, 4: Result/benefit, 5: Hard CTA).
   - Subject lines must read like a personal email from a friend or trusted advisor (e.g., "The $10k ceiling", "A harsh truth about organic hustle").
   - Flow must be natural, human, and persuasive. Avoid sounding like a marketer; sound like an advisor.
   - End with strong, clear call-to-actions.
3. twitterThread:
   - Must be highly engaging, thread-worthy tweets with powerful hooks.
   - Use strategic formatting, ample whitespace, and minimal emojis. Focus on profound insights and readability.
4. Other Outputs (Video Script, Blog Post, Captions):
   - Produce highly detailed, ready-to-use content.
   - shortVideoScript: fast-paced structure with narrator timing hints, visual cues, and hook-driven speaker lines.
   - seoBlogPost: rich, optimized subheadings, deeply insightful content, actionable takeaways, and a strong concluding section. DO NOT use generic conclusions like "In conclusion" or "To sum up".
   - instagramThreadsCaptions: formatted as a punchy, numbered list with context-appropriate emojis and strong, engaging hooks.
5. Overall Tone:
   - Write at a premium level: authoritative, insightful, bold, and direct.
   - It MUST feel like a $10,000/month consultant wrote it.
   - Return clean representations avoiding markdown header tags where plain text formatting is requested (like inside JSON arrays).`
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
    response_format: { type: "json_object" }
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");
  fs.writeFileSync("output_test.json", JSON.stringify(parsed, null, 2));
  console.log("Written to output_test.json");
}

testPrompt().catch(console.error);
