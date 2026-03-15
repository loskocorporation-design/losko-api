const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/analyze", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt manquant" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    res.json({ result: data.content?.[0]?.text || "" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/", (_, res) => res.send("LOSKO API opérationnelle"));

app.listen(process.env.PORT || 3000, () => console.log("Serveur démarré"));
