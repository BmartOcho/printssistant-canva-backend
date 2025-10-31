// api/create_design.js
import app from "../server.js";
import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { design_type, primary_text, color_palette, style, additional_notes } = req.body;

    // Combine everything into a simple descriptive name/title
    const name = `${design_type || "Design"} - ${primary_text?.slice(0, 40) || "Untitled"}`;

    // Estimate reasonable canvas size (in px)
    const width = design_type?.toLowerCase().includes("business") ? 1050 : 1200;
    const height = design_type?.toLowerCase().includes("card") ? 600 : 800;

    // Call your existing Canva handler
    const response = await axios.post(
      `${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://127.0.0.1:4000"}/agent/command`,
      {
        action: "generate_template",
        payload: { name, width, height }
      }
    );

    // Normalize return
    const data = response.data || {};
    return res.status(200).json({
      design_url: data.url || data.design_url || null,
      design_id: data.design_id || null,
      message: "✅ Canva design created successfully"
    });
  } catch (error) {
    console.error("❌ Error in /api/create_design:", error.message);
    res.status(500).json({
      error: "Failed to create design",
      details: error.response?.data || error.message
    });
  }
}
