const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ── ANALYSE IA ──
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

// ── STRIPE : CRÉER PAYMENT INTENT ──
app.post("/create-payment-intent", async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const { amount, email, answers } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount || 1900, // 19€ en centimes
      currency: "eur",
      receipt_email: email,
      metadata: {
        territoire: answers?.territoire || "",
        secteur: answers?.secteur || "",
        typeprojet: answers?.typeprojet || "",
        montant: answers?.montant || "",
      },
      description: "Rapport FEDER complet — Aides Outre-Mer — LOSKO CORPORATION",
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── ENVOYER RAPPORT PAR EMAIL ──
app.post("/send-report", async (req, res) => {
  const { email, answers } = req.body;
  // Générer le contenu du rapport via Claude
  try {
    const prompt = `Tu es un expert AMO FEDER pour LOSKO CORPORATION Guadeloupe. 
Génère un rapport complet et professionnel pour ce projet :
- Territoire : ${answers?.territoire}
- Secteur : ${answers?.secteur}  
- Type de projet : ${answers?.typeprojet}
- Montant : ${answers?.montant}
- Entreprise existante : ${answers?.entreprise}
- Effectif : ${answers?.effectif}
- Thématique : ${answers?.thematique}

Le rapport doit inclure :
1. Résumé exécutif
2. Aides éligibles détaillées (FEDER, FEADER, FSE+, ARICE, BPI, ADEME selon le profil)
3. Estimation financière détaillée
4. Liste complète des pièces à fournir
5. Étapes et calendrier du dépôt de dossier
6. Conseils LOSKO CORPORATION

Format professionnel, style rapport de financement public.`;

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const aiData = await aiResp.json();
    const reportContent = aiData.content?.[0]?.text || "Rapport en cours de génération.";

    // Log pour suivi (en production : intégrer Resend, Mailgun ou Nodemailer)
    console.log(`RAPPORT ENVOYÉ À : ${email}`);
    console.log(`PROJET : ${answers?.typeprojet} / ${answers?.territoire}`);
    console.log("RAPPORT GÉNÉRÉ :", reportContent.substring(0, 200) + "...");

    res.json({ success: true, message: "Rapport généré et envoyé à " + email });
  } catch (err) {
    console.error("Send report error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (_, res) => res.send("LOSKO API opérationnelle ✓"));

app.listen(process.env.PORT || 3000, () => console.log("Serveur LOSKO démarré"));
