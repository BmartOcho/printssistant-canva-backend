// server.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

// ---------- Config helpers ----------
const CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID;
const CANVA_CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET;
const CANVA_API_BASE = process.env.CANVA_API_BASE || "https://api.canva.com";

// Support BOTH local & Vercel
// Local dev redirect we already used:
const REDIRECT_LOCAL = process.env.CANVA_REDIRECT_URI || "http://127.0.0.1:4000/callback";
// Production (Vercel) redirect (add this in Canva Dev Console too)
const REDIRECT_PROD = process.env.CANVA_REDIRECT_URI_PROD || "https://printssistant-canva-backend.vercel.app/callback";

// Choose redirect by host
function chooseRedirectUri(req) {
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString().toLowerCase();
  // If we're on vercel.app (or your custom domain), use PROD; else LOCAL
  if (host.includes("vercel.app") || host.includes("printssistant")) return REDIRECT_PROD;
  return REDIRECT_LOCAL;
}

// Tokens file (local dev only). On Vercel this is read-only, so we guard writes.
const TOKENS_PATH = path.join(process.cwd(), "tokens.json");
function canWriteTokens() {
  // Vercel serverless FS is read-only at runtime
  return !process.env.VERCEL;
}
function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      return JSON.parse(fs.readFileSync(TOKENS_PATH, "utf-8"));
    }
  } catch {}
  return null;
}
function saveTokens(tokens) {
  if (!canWriteTokens()) return; // skip on Vercel
  try {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  } catch {}
}

// ---------- PKCE helpers ----------
function base64URLEncode(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest();
}

// store verifier in memory (OK for local dev)
let lastCodeVerifier = null;

// ---------- AUTH ----------
app.get("/auth", (req, res) => {
  const redirectUri = chooseRedirectUri(req);

  // PKCE
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(codeVerifier));
  lastCodeVerifier = codeVerifier;

  const authUrl = new URL("https://www.canva.com/api/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CANVA_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set(
    "scope",
    [
      "design:content:read",
      "design:content:write",
      "asset:read",
      "asset:write",
      "folder:read",
      "app:read",
      "app:write" // optional, include only if your app needs it
    ].join(" ")
  );
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("code_challenge", codeChallenge);

  console.log("\n🔍 Canva Authorization URL:", decodeURIComponent(authUrl.toString()));
  console.log("↪ redirect_uri chosen:", redirectUri, "\n");

  res.redirect(authUrl.toString());
});

app.get(["/callback", "/"], async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send("✅ Canva backend is up. (No ?code present)");

  if (!lastCodeVerifier) {
    return res.status(400).send("Missing PKCE code_verifier. Start again at /auth.");
  }

  const redirectUri = chooseRedirectUri(req);
  console.log("🧠 DEBUG Canva token request:", {
    CANVA_CLIENT_ID,
    CANVA_CLIENT_SECRET_LENGTH: CANVA_CLIENT_SECRET?.length,
    redirectUri,
    CANVA_API_BASE
  });

  try {
    console.log("🔁 Exchanging auth code for tokens…");
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: String(code),
      redirect_uri: redirectUri,
      client_id: CANVA_CLIENT_ID,
      client_secret: CANVA_CLIENT_SECRET,
      code_verifier: lastCodeVerifier,
    });

    const tokenRes = await axios.post(`${CANVA_API_BASE}/rest/v1/oauth/token`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    console.log("✅ Token response received.");

    saveTokens({
      access_token,
      refresh_token,
      expires_at: Date.now() + (expires_in || 0) * 1000,
    });

    // Friendly success page
    res.send(
      `<pre>✅ Tokens acquired!
access_token: ${access_token.slice(0, 12)}… 
refresh_token: ${refresh_token ? refresh_token.slice(0, 12) + "…" : "(none)"}
expires_in: ${expires_in}s

You can now call:
- GET /me
- GET /refresh
- POST /agent/command  (see body below)

Example POST /agent/command body:
{
  "action": "generate_template",
  "payload": { "name": "My Banner", "width": 1200, "height": 600 }
}
</pre>`
    );
  } catch (err) {
    console.error("❌ Token exchange failed");
    console.error(err.response?.status, err.response?.data || err.message);
    res.status(500).send("OAuth token exchange failed – see logs.");
  }
});

// ---------- Test identity ----------
app.get("/me", async (req, res) => {
  try {
    const tokens = loadTokens();
    if (!tokens?.access_token) return res.status(401).send("No access token. Visit /auth first.");
    const meRes = await axios.get(`${CANVA_API_BASE}/rest/v1/users/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    res.json(meRes.data);
  } catch (err) {
    console.error("❌ /me failed:", err.response?.data || err.message);
    res.status(500).send("Failed to fetch Canva user info");
  }
});

// ---------- Refresh ----------
app.get("/refresh", async (req, res) => {
  try {
    const tokens = loadTokens();
    if (!tokens?.refresh_token) return res.status(400).send("No refresh_token stored.");

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: CANVA_CLIENT_ID,
      client_secret: CANVA_CLIENT_SECRET,
    });

    const tokenRes = await axios.post(`${CANVA_API_BASE}/rest/v1/oauth/token`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, refresh_token: newRefresh, expires_in } = tokenRes.data;
    saveTokens({
      access_token,
      refresh_token: newRefresh || tokens.refresh_token,
      expires_at: Date.now() + (expires_in || 0) * 1000,
    });

    res.json({ access_token, expires_in });
  } catch (err) {
    console.error("❌ refresh failed:", err.response?.data || err.message);
    res.status(500).send("Failed to refresh token");
  }
});

// ---------- Agent entry (what your 3000 backend calls) ----------
app.post("/agent/command", async (req, res) => {
  const { action, payload } = req.body || {};
  if (action !== "generate_template") {
    return res.status(400).json({ error: "Unsupported action" });
  }

  const { name, width, height } = payload || {};
  if (!name || !width || !height) {
    return res.status(400).json({ error: "Missing name, width or height" });
  }

  try {
    const tokens = loadTokens();
    const accessToken = tokens?.access_token || process.env.CANVA_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(401).json({ error: "Missing access token. Visit /auth first." });
    }

    // Create the design
    const createBody = {
      design: {
        design_type: { type: "custom", width: Number(width), height: Number(height) },
        title: String(name),
      },
    };

    const createRes = await axios.post(`${CANVA_API_BASE}/rest/v1/designs`, createBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    // Canva returns { design: { id, urls: { edit_url, view_url }, ... } }
    const design = createRes.data?.design || {};
    const id = design.id;
    const view_url = design.urls?.view_url;
    const edit_url = design.urls?.edit_url;

    if (!id) {
      return res.status(500).json({
        error: "Design ID missing from Canva response",
        details: createRes.data,
      });
    }

    // Normalize to a single url (prefer view_url, fallback to pretty URL)
    const prettyUrl = `https://www.canva.com/design/${id}/view`;
    const url = view_url || edit_url || prettyUrl;

    return res.status(200).json({
      status: "ok",
      design_id: id,
      url,
      message: "Design created in Canva",
    });
  } catch (err) {
    console.error("❌ create design failed:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Failed to create design",
      details: err.response?.data || err.message,
    });
  }
});

// ---------- Start (local only) ----------
const PORT = process.env.PORT || 4000;
if (!process.env.VERCEL) {
  app.listen(PORT, "127.0.0.1", () => {
    console.log(`🚀 Canva backend running on http://127.0.0.1:${PORT}`);
  });
}

// Vercel: export default for serverless
export default app;
