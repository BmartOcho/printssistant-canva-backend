// /workflows/canva-template-generator.js
import { sleep } from "workflow";

/**
 * Durable Workflow: creates a Canva design via your existing API.
 * This will show up in the Vercel “Workflows” dashboard after deploy.
 */
export async function canvaTemplateGenerator(input) {
  "use workflow"; // 👈 required by DevKit

  const { name, width, height } = input || {};
  if (!name || !width || !height) {
    throw new Error("Missing name, width, or height");
  }

  // (Optional) small delay so you can see it progress in the UI
  await sleep("2s");

  // Call your existing create_design serverless function
  const resp = await fetch(`${process.env.BASE_URL || "https://printssistant-canva-backend.vercel.app"}/api/create_design`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, width, height })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`create_design failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return {
    message: "Design created via Canva API",
    design: data
  };
}
