// api/create_design.js
// This endpoint wraps the /agent/command endpoint for backward compatibility
// with the workflow files

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method supported" });
  }

  const { name, width, height } = req.body || {};
  
  if (!name || !width || !height) {
    return res.status(400).json({ 
      error: "Missing required fields: name, width, height" 
    });
  }

  try {
    // Call the existing /agent/command endpoint
    const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
    const response = await fetch(`${baseUrl}/agent/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "generate_template",
        payload: { name, width, height }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: "Failed to create design",
        details: text
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("❌ create_design error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message
    });
  }
}
