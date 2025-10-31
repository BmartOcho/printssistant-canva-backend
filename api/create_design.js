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
      return res.status(401).json({
        error: "Missing Canva access token. Go to /auth first and store one.",
      });
    }

    const { design_type, primary_text } = req.body;

    // Create a simple design directly through Canva REST API
    const createRes = await axios.post(
      `${CANVA_API_BASE}/rest/v1/designs`,
      {
        design: {
          title: `${design_type || "Design"} - ${primary_text || "Untitled"}`,
          design_type: { type: "custom", width: 1200, height: 800 },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const design = createRes.data?.design || {};
    const design_url =
      design.urls?.view_url ||
      `https://www.canva.com/design/${design.id}/view`;

    return res.status(200).json({
      design_id: design.id,
      design_url,
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
