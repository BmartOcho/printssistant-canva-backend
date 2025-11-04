// api/create_design.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const CANVA_API_BASE = process.env.CANVA_API_BASE || "https://api.canva.com";
const ACCESS_TOKEN = process.env.CANVA_ACCESS_TOKEN;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!ACCESS_TOKEN) {
      return res.status(401).json({ error: "Missing Canva access token" });
    }

    const { design_type, primary_text, color_palette, style } = req.body;

    // Create a simple title using what the user provided
    const titleText = `${design_type || "Design"} - ${primary_text || "Untitled"}`;
    const description =
      `Auto-generated design via Printssistant.\n` +
      (color_palette ? `Colors: ${color_palette}. ` : "") +
      (style ? `Style: ${style}.` : "");

    // Canva requires a top-level design_type object
    const createBody = {
      design_type: { type: "custom", width: 1200, height: 800 },
      title: titleText,
      description,
    };

    const createRes = await axios.post(`${CANVA_API_BASE}/rest/v1/designs`, createBody, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN.trim()}`,
        "Content-Type": "application/json",
      },
    });

    const design = createRes.data?.design || {};
    const designId = design.id;

    // Build friendly, publicly accessible URLs
    const viewUrl = designId
      ? `https://www.canva.com/design/${designId}/view`
      : null;
    const editUrl = designId
      ? `https://www.canva.com/design/${designId}/edit`
      : null;

    return res.status(200).json({
      design_id: designId,
      view_url: viewUrl,
      edit_url: editUrl,
      message: "✅ Canva design created successfully",
    });
  } catch (error) {
    console.error("❌ Canva API error:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Canva API call failed",
      details: error.response?.data || error.message,
    });
  }
}
