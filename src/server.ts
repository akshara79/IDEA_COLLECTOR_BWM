import express from "express";
import bodyParser from "body-parser";
import campaignsRouter from "./routes/campaigns";
import ideasRouter from "./routes/ideas";

const app = express();
app.use(bodyParser.json());

// API routes
app.use("/api/campaigns", campaignsRouter);
app.use("/api/ideas", ideasRouter);

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});