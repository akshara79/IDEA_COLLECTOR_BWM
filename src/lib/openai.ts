import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function embedText(text: string) {
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return response.data[0].embedding as number[];
}

export async function summarizeClusterPrompt(representativeIdeas: { title: string; description: string }[]) {
  const system = `You are a neutral academic reviewer. Produce a short cluster title (<=5 words), one-sentence description of the theme, and three short bullets: Benefit, Challenge, Next step. Keep reply under 140 words.`;
  const examples = representativeIdeas
    .slice(0, 6)
    .map((it, i) => `${i + 1}) ${it.title} — ${it.description}`)
    .join("\n");

  const prompt = `${system}\n\nRepresentative ideas:\n${examples}\n\nFormat:\nTitle: <one-line title>\nDescription: <one-sentence>\nBullets:\n- Benefit: <short>\n- Challenge: <short>\n- Next step: <short>`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 400
  });

  const text = completion.choices[0].message?.content ?? "";
  return text;
}

export async function executiveSummaryPrompt(clusterSummaries: { title: string; description: string }[]) {
  const system = `You are the campaign summary writer. Using the cluster titles and one-line descriptions provided, write a 4-line executive summary for campus leadership: top 3 themes, estimated participation if provided, summary of strong opportunities, and one recommended next step. Keep concise.`;
  const lines = clusterSummaries.map((c, i) => `${i + 1}) ${c.title}: ${c.description}`).join("\n");
  const prompt = `${system}\n\nClusters:\n${lines}\n\nOutput four lines as described.`;
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 300
  });
  return completion.choices[0].message?.content ?? "";
}