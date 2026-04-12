import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();

  // Mongike Webhook
  app.post("/api/mongike-webhook", async (req, res) => {
    const data = req.body;
    // Verify Mongike signature here if they provide one
    console.log("Mongike Webhook received:", data);
    
    if (data.status === "SUCCESS") {
      // Update database to grant access
      console.log(`Payment successful for transaction: ${data.transaction_id}`);
    }
    
    res.json({ status: "ok" });
  });

  app.use(express.json());

  // API routes FIRST
  app.get("/api/config", (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY || 
                   process.env.VITE_GEMINI_API_KEY || 
                   process.env.PAKUA_AI_KEY ||
                   process.env.API_KEY || '';
                   
    res.json({ apiKey });
  });

  app.post("/api/create-mongike-payment", async (req, res) => {
    const { amount, phoneNumber, email } = req.body;
    
    try {
      // This is a placeholder for the actual Mongike API call
      // Based on common patterns for mobile money gateways
      const response = await axios.post("https://api.mongike.com/v1/payments", {
        amount: amount || 320, // Updated to 320 TZS
        currency: "TZS",
        phone: phoneNumber,
        email: email,
        callback_url: `${process.env.APP_URL}/api/mongike-webhook`,
        return_url: `${process.env.APP_URL}/payment-success`,
        app_id: process.env.MONGIKE_APP_ID,
        api_key: process.env.MONGIKE_API_KEY
      }, {
        headers: {
          "Authorization": `Bearer ${process.env.MONGIKE_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Mongike Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to initiate Mongike payment" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

// Export the app for Vercel
export const appPromise = createServer();

// Listen on port 3000 for Cloud Run / Local development
const PORT = 3000;
appPromise.then(app => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
