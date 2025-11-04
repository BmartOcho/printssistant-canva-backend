// workflow/world.js
import { createVercelWorld } from "@workflow/world-vercel";

export const world = createVercelWorld({
  token: process.env.WORKFLOW_VERCEL_AUTH_TOKEN,
  headers: {
    "x-vercel-environment": process.env.WORKFLOW_VERCEL_ENV || "production",
    "x-vercel-project-id": process.env.WORKFLOW_VERCEL_PROJECT,
    "x-vercel-team-id": process.env.WORKFLOW_VERCEL_TEAM,
  },
});
