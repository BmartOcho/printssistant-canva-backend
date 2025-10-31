// api/create_design.js
import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { design_type, primary_text, color_palette, style, additional_notes } = req.body;

    // Call your Canva MCP endpoint (the one that successfully generated designs)
    const response = await axios.post(
      "https://v0-bmart-ocho-printssistant-canva-b.vercel.app/create_design",
      { design_type, primary_text, color_palette, style, additional_notes }
    );

    return res.status(200).json({ design_url: response.data.design_url });
  } catch (error) {
    console.error("❌ Canva creation failed:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
