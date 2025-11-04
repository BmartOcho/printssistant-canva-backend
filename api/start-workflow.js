// api/start-workflow.js
import { createVercelWorld } from "@workflow/world-vercel";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST supported" });
    return;
  }

  const { name, width, height } = req.body || {};
  if (!name || !width || !height) {
    res.status(400).json({ error: "Missing name, width, or height" });
    return;
  }

  // Connect to Vercel World
  const world = createVercelWorld({
    token: process.env.WORKFLOW_VERCEL_AUTH_TOKEN,
    headers: {
      "x-vercel-environment": process.env.WORKFLOW_VERCEL_ENV,
      "x-vercel-project-id": process.env.WORKFLOW_VERCEL_PROJECT,
      "x-vercel-team-id": process.env.WORKFLOW_VERCEL_TEAM,
    },
  });

  try {
    // ✅ Fixed API call
    const run = await world.runs.create({
      name: "Canva workflow trigger",
      input: { name, width, height },
    });

    res.status(200).json({
      message: "Workflow started successfully",
      runId: run.id || "(no id returned)",
    });
  } catch (err) {
    console.error("❌ Workflow creation failed:", err);
    res.status(500).json({
      error: "Workflow creation failed",
      details: err.message || err.toString(),
    });
  }
}
