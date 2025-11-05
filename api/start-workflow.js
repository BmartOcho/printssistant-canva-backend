export default async function handler(req, res) {
  console.log("🧠 Checking token validity...");

  try {
    const response = await fetch("https://api.vercel.com/v2/user", {
      headers: {
        Authorization: `Bearer ${process.env.WORKFLOW_VERCEL_AUTH_TOKEN}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Token invalid:", data);
      return res.status(401).json({ error: "Token invalid", details: data });
    }

    res.status(200).json({ message: "✅ Token is valid!", user: data.user });
  } catch (err) {
    res.status(500).json({ error: "Unexpected failure", details: err.message });
  }
}
