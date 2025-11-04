// api/start-workflow.js
import { canvaWorkflow } from "../workflow/canva-workflow.js";

export default async function handler(req, res) {
  try {
    const input = req.body; // expects { name, width, height }
    const run = await canvaWorkflow.run(input);

    res.status(200).json({
      message: "Workflow started successfully",
      runId: run.id,
    });
  } catch (error) {
    console.error("❌ Error starting workflow:", error.message);
    res.status(500).json({ error: error.message });
  }
}
