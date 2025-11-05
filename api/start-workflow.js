// api/start-workflow.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST supported" });
  }

  const { name, width, height } = req.body || {};
  if (!name || !width || !height) {
    return res.status(400).json({ error: "Missing name, width, or height" });
  }

  console.log("🔍 ENV CHECK", {
    env: process.env.WORKFLOW_VERCEL_ENV,
    project: process.env.WORKFLOW_VERCEL_PROJECT,
    team: process.env.WORKFLOW_VERCEL_TEAM,
  });

  try {
    const url = `https://api.vercel.com/v1/workflow/runs`;
    const body = {
      workflowName: "canva-template-generator",
      input: { name, width, height },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WORKFLOW_VERCEL_AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "x-vercel-environment": process.env.WORKFLOW_VERCEL_ENV || "production",
        "x-vercel-project-id": process.env.WORKFLOW_VERCEL_PROJECT,
        "x-vercel-team-id": process.env.WORKFLOW_VERCEL_TEAM,
      },
      body: JSON.stringify(body),
    });

    // ✅ Safer JSON parsing
    let text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.warn("⚠️ Non-JSON response:", text);
      data = { raw: text };
    }

    if (!response.ok) {
      console.error("❌ Workflow creation failed:", data);
      return res.status(response.status).json({
        error: "Workflow creation failed",
        details: data,
      });
    }

    res.status(200).json({
      message: "✅ Workflow started successfully",
      run: data,
    });
  } catch (err) {
    console.error("💥 Fatal error:", err);
    res.status(500).json({ error: "Server crash", details: err.message });
  }
}
