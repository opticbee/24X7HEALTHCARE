const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const docx = require('docx-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');


const router = express.Router();

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.AI_KEY);


// File Upload Setup
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});


router.post('/report/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded or file too large" });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let textContent = '';

    try {
      // Extract text content based on file type
      if (fileExt === '.txt') {
        textContent = fs.readFileSync(filePath, 'utf-8');
      } else if (fileExt === '.pdf') {
        const data = await pdfParse(fs.readFileSync(filePath));
        textContent = data.text;
      } else if (fileExt === '.docx') {
        textContent = await new Promise((resolve, reject) => {
          docx.parseDocx(filePath, (data, err) => {
            if (err) return reject(err);
            resolve(data);
          });
        });
      } else {
        fs.unlinkSync(filePath); // Clean up uploaded file
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      // --- UPDATED PROMPT ---
      // This new, detailed prompt instructs the AI to generate a response
      // in the specific format you requested for your patients.
      const prompt = `
        You are an AI medical assistant. Your task is to analyze the following text from a user-uploaded document and explain it to them in a clear, structured, and caring manner using Markdown.

        **Instructions:**

        1.  **Analyze the Text:** First, carefully read the text provided below to determine if it is a medical report.

        2.  **Generate the Response:**
            * **If the document IS a medical report (specifically a food intolerance report):**
                * Structure your entire response using Markdown for clear formatting.
                * Start with a title: "### Understanding Your Report"
                * Explain what the test measures (e.g., IgG antibodies for food intolerance vs. IgE for allergies) and the meaning of the result categories (e.g., Elevated, Borderline, Normal).
                * Create a section titled "### Key Findings from Your Report".
                * Under "Key Findings," create two sub-sections using Markdown subheadings: "#### Foods with Elevated (Strong) Intolerance" and "#### Foods with Borderline (Moderate) Intolerance".
                * In these sub-sections, list the specific foods and their corresponding values as found in the report.
                * Create a final section titled "### Care Suggestions Based on the Report".
                * Begin this section with this exact disclaimer: "❗️ **Important Disclaimer:** I am an AI assistant and not a medical professional. These suggestions are based directly on the interpretation provided in your lab report. It is **essential** to discuss these results with your doctor or a registered dietitian to create a personalized plan that is safe and effective for you."
                * Provide numbered care suggestions based on the report's recommendations (e.g., Elimination, Rotation/Reduction, focusing on "Normal" foods).
                * Conclude with a point about the importance of clinical correlation with a doctor.
                * it should be not as essay it with section wise heading info and not in paragraph form.

            * **If the document IS NOT a medical report:**
                * Your entire response should be: "This does not appear to be a medical report. It seems to be a [briefly describe what the document is]."

        **Document Text to Analyze:**
        ---
        ${textContent}
        ---
      `;

      const result = await model.generateContent(prompt);
      const responseText = await result.response.text();

      res.json({ response: responseText });

    } catch (error) {
      console.error("Upload processing error:", error);
      res.status(500).json({ error: "Error analyzing report" });
    } finally {
      // Ensure the uploaded file is deleted after processing
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });
});


module.exports = router;
