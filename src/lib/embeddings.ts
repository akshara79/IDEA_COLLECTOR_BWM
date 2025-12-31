import { embedText } from "./openai";

export async function makeEmbeddingForIdea(title: string, description: string) {
  const text = `${title}. ${description}`;
  const vector = await embedText(text);
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let A = 0;
  let B = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    A += a[i] * a[i];
    B += b[i] * b[i];
  }
  if (A === 0 || B === 0) return 0;
  return dot / (Math.sqrt(A) * Math.sqrt(B));
}