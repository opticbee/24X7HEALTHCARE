// This file should be inside a 'routes' directory if it isn't already.
const { TranslationServiceClient } = require('@google-cloud/translate');

// These should be defined in your environment (.env file)
const projectId = process.env.GOOGLE_PROJECT_ID;
const location = 'global';

// Creates a client
const translationClient = new TranslationServiceClient();

module.exports = function(app) {
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLang } = req.body;

      if (!text || !targetLang) {
        return res.status(400).json({ error: "Missing 'text' or 'targetLang' in request body." });
      }

      const parts = text.split("|||");

      const [response] = await translationClient.translateText({
        parent: `projects/${projectId}/locations/${location}`,
        contents: parts,
        mimeType: "text/plain",
        targetLanguageCode: targetLang,
      });

      const translations = response.translations.map(t => t.translatedText);
      res.json({ translatedText: translations.join("|||") });

    } catch (err) {
      console.error("Error in /api/translate:", err);
      res.status(500).json({ error: "Translation failed" });
    }
  });
};
