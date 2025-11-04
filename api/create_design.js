// api/create_design.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const CANVA_API_BASE = process.env.CANVA_API_BASE || "https://api.canva.com";
const ACCESS_TOKEN = process.env.CANVA_ACCESS_TOKEN;

// Standard print resolution
const PPI = 300; // pixels per inch

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!ACCESS_TOKEN) {
      return res.status(401).json({ error: "Missing Canva access token" });
    }

    const {
      design_type,
      primary_text,
      color_palette,
      style,
      additional_notes,
      width,
      height,
      units,
      sides
    } = req.body;

    // 🧮 Convert inches → pixels if needed
    const widthPx = units === "in" ? Math.round(width * PPI) : width;
    const heightPx = units === "in" ? Math.round(height * PPI) : height;

    const titleText = `${design_type || "Design"} - ${primary_text || "Untitled"}`;
    const descriptionLines = [
      "Auto-generated via Printssistant.",
      color_palette ? `Colors: ${color_palette}.` : null,
      style ? `Style: ${style}.` : null,
      `Size: ${width}${units || "px"} × ${height}${units || "px"} (${widthPx}×${heightPx}px).`,
      sides ? `Sides: ${sides}.` : null,
      additional_notes ? `Notes: ${additional_notes}` : null
    ].filter(Boolean);

    const description = descriptionLines.join(" ");

    // Canva payload — must be in pixels
    const createBody = {
      design_type: { type: "custom", width: widthPx, height: heightPx },
      title: titleText,
      description
    };

    const createRes = await axios.post(`${CANVA_API_BASE}/rest/v1/designs`, createBody, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN.trim()}`,
        "Content-Type": "application/json"
      }
    });

    const design = createRes.data?.design || {};
    const designId = design.id;

    const viewUrl = designId ? `https://www.canva.com/design/${designId}/view` : null;
    const editUrl = designId ? `https://www.canva.com/design/${designId}/edit` : null;

    return res.status(200).json({
      design_id: designId,
      view_url: viewUrl,
      edit_url: editUrl,
      width_in: width,
      height_in: height,
      width_px: widthPx,
      height_px: heightPx,
      sides,
      message: "✅ Canva design created successfully"
    });
  } catch (error) {
    console.error("❌ Canva API error:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Canva API call failed",
      details: error.response?.data || error.message
    });
  }
}
