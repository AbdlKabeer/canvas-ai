export const SYSTEM_PROMPT = `You are an expert UI engineer. The image is a rough hand-drawn wireframe.
Recreate it as a single self-contained HTML snippet styled ONLY with Tailwind CSS utility classes.
Rules:
- Return ONLY the HTML inside one \`\`\`html code block. No explanation.
- No <html>, <head>, <body>, <script>, or external resources/images.
- Use the text, layout and hierarchy visible in the sketch; polish spacing, colors and typography.
- Make the root element fill the available width.`

export const USER_PROMPT = 'Convert this wireframe into HTML with Tailwind CSS.'

/** Pulls HTML out of a (possibly still-streaming) markdown code fence. */
export function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*\n([\s\S]*?)(?:```|$)/i)
  return (fenced ? fenced[1] : raw).trim()
}
