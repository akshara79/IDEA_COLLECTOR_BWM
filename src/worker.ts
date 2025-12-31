import { Worker, Queue, QueueScheduler } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "./lib/prisma";
import { makeEmbeddingForIdea } from "./lib/embeddings";
import { runKMeans, clusterRepresentatives } from "./lib/clustering";
import { summarizeClusterPrompt, executiveSummaryPrompt } from "./lib/openai";

const connection = new IORedis(process.env.REDIS_URL || "redis://redis:6379");
const queueName = "ideas";

new QueueScheduler(queueName, { connection });
const queue = new Queue(queueName, { connection });

console.log("Worker starting...");

const worker = new Worker(
  queueName,
  async job => {
    if (job.name === "process-idea") {
      const { ideaId } = job.data as { ideaId: string };
      console.log("Processing idea:", ideaId);
      const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
      if (!idea) return;

      const vector = await makeEmbeddingForIdea(idea.title, idea.description);

      await prisma.ideaEmbedding.upsert({
        where: { ideaId },
        create: { ideaId, vector },
        update: { vector, updatedAt: new Date() }
      });

      return;
    }

    if (job.name === "cluster-campaign") {
      const { campaignId } = job.data as { campaignId: string };
      console.log("Clustering campaign:", campaignId);

      const ideas = await prisma.idea.findMany({
        where: { campaignId, status: "active" },
        include: { embedding: true }
      });

      const valid = ideas.map((i, idx) => ({ idea: i, idx })).filter(x => x.idea.embedding && x.idea.embedding.vector && x.idea.embedding.vector.length > 0);

      if (valid.length === 0) {
        console.log("No embeddings available, skipping clustering");
        return;
      }

      const matrix = valid.map(x => x.idea.embedding!.vector);
      const n = matrix.length;
      const k = Math.min(Math.max(2, Math.floor(Math.sqrt(n))), 8);

      const { assignments, centroids } = runKMeans(matrix, k);
      const reps = clusterRepresentatives(matrix, assignments, centroids, 3);

      // remove existing clusters for this campaign
      await prisma.cluster.deleteMany({ where: { campaignId } });

      for (let c = 0; c < centroids.length; c++) {
        const memberIndexes = assignments.map((a, i) => (a === c ? i : -1)).filter(i => i >= 0);
        if (memberIndexes.length === 0) continue;

        // map back to original idea object indices
        const memberIdeas = memberIndexes.map(i => valid[i].idea);
        const repIdxs = reps[c] || [];
        const representativeIdeas = repIdxs.map(idx => {
          const idea = valid[idx].idea;
          return { title: idea.title, description: idea.description };
        });

        const summaryText = await summarizeClusterPrompt(representativeIdeas);

        const cluster = await prisma.cluster.create({
          data: { campaignId, label: null, summary: summaryText }
        });

        for (const mi of memberIdeas) {
          await prisma.clusterMember.create({ data: { clusterId: cluster.id, ideaId: mi.id } });
        }
      }

      // executive summary
      const clusters = await prisma.cluster.findMany({ where: { campaignId } });
      const clusterSummaries = clusters.map(c => {
        const firstLine = (c.summary || "").split("\n")[0];
        return { title: firstLine.slice(0, 60), description: firstLine.slice(0, 200) };
      });

      const exec = await executiveSummaryPrompt(clusterSummaries);
      await prisma.cluster.create({ data: { campaignId, label: "EXECUTIVE_SUMMARY", summary: exec } });

      console.log("Clustering complete");
      return;
    }

    return;
  },
  { connection }
);

worker.on("completed", job => {
  console.log(`Job ${job.id} (${job.name}) completed`);
});
worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});