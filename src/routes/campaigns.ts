import express from "express";
import { prisma } from "../lib/prisma";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { createObjectCsvStringifier } from "csv-writer";

const router = express.Router();
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
const queue = new Queue("ideas", { connection });

// GET /api/campaigns
router.get("/", async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });
  res.json(campaigns);
});

// POST /api/campaigns
router.post("/", async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const campaign = await prisma.campaign.create({ data: { title, description } });
  res.status(201).json(campaign);
});

// POST /api/campaigns/:id/cluster
router.post("/:id/cluster", async (req, res) => {
  const campaignId = req.params.id;
  await queue.add("cluster-campaign", { campaignId });
  res.json({ ok: true, message: "Clustering queued" });
});

// GET /api/campaigns/:id/ideas
// Note: ideas listing is in ideas route; keep simple for frontend expectations
router.get("/:id/ideas", async (req, res) => {
  const campaignId = req.params.id;
  const ideas = await prisma.idea.findMany({
    where: { campaignId, status: "active" },
    orderBy: { createdAt: "desc" }
  });
  res.json(ideas);
});

// GET /api/campaigns/:id/export
router.get("/:id/export", async (req, res) => {
  const campaignId = req.params.id;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  const ideas = await prisma.idea.findMany({ where: { campaignId } });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="campaign-${campaignId}.csv"`);

  res.write("id,title,description,isAnonymous,createdAt\n");
  for (const it of ideas) {
    const line = `${it.id},"${(it.title || "").replace(/"/g, '""')}","${(it.description || "").replace(/"/g, '""')}",${it.isAnonymous},${it.createdAt.toISOString()}\n`;
    res.write(line);
  }
  res.end();
});

// GET /api/campaigns/:id/clusters
router.get("/:id/clusters", async (req, res) => {
  const campaignId = req.params.id;
  const clusters = await prisma.cluster.findMany({
    where: { campaignId },
    include: { members: { include: { idea: true } } },
    orderBy: { createdAt: "asc" }
  });
  res.json(clusters);
});

export default router;