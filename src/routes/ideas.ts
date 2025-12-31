import express from "express";
import { prisma } from "../lib/prisma";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const router = express.Router();
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
const queue = new Queue("ideas", { connection });

// POST /api/campaigns/:id/ideas  (Note: kept here for frontend compatibility)
router.post("/campaigns/:id/ideas", async (req, res) => {
  const campaignId = req.params.id;
  const { title, description, isAnonymous } = req.body;
  if (!title || !description) return res.status(400).json({ error: "title & description required" });

  const idea = await prisma.idea.create({
    data: {
      campaignId,
      title,
      description,
      isAnonymous: !!isAnonymous
    }
  });

  await queue.add("process-idea", { ideaId: idea.id, campaignId });

  res.status(201).json(idea);
});

// GET /api/campaigns/:id/ideas  (alternative route)
router.get("/campaigns/:id/ideas", async (req, res) => {
  const campaignId = req.params.id;
  const ideas = await prisma.idea.findMany({
    where: { campaignId, status: "active" },
    orderBy: { createdAt: "desc" }
  });
  res.json(ideas);
});

// POST /api/ideas/:id/vote
router.post("/:id/vote", async (req, res) => {
  const ideaId = req.params.id;
  const { userId } = req.body;
  try {
    const v = await prisma.vote.create({ data: { ideaId, userId } });
    res.status(201).json(v);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;