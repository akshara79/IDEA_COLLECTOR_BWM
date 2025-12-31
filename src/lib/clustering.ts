import kmeans from "kmeans-ts";
import { cosineSimilarity } from "./embeddings";

/**
 * Run k-means on vector array.
 */
export function runKMeans(vectors: number[][], k = 5) {
  if (!vectors || vectors.length === 0) return { assignments: [], centroids: [] };
  const km = kmeans(vectors, { k });
  return { assignments: km.clusters, centroids: km.centroids };
}

/**
 * For each cluster find top-K representatives closest to centroid using cosine similarity
 */
export function clusterRepresentatives(vectors: number[][], assignments: number[], centroids: number[][], topK = 3) {
  const clusters: Record<number, number[]> = {};
  assignments.forEach((c, idx) => {
    clusters[c] = clusters[c] || [];
    clusters[c].push(idx);
  });

  const reps: Record<number, number[]> = {};
  for (const cStr of Object.keys(clusters)) {
    const c = Number(cStr);
    const idxs = clusters[c];
    const centroid = centroids[c];
    const scored = idxs.map(idx => ({ idx, score: cosineSimilarity(vectors[idx], centroid) }));
    scored.sort((a, b) => b.score - a.score);
    reps[c] = scored.slice(0, topK).map(s => s.idx);
  }
  return reps;
}