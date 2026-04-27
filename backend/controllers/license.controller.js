import { extractTextFromBuffer } from "../services/pdf.service.js";
import { llamaClient } from "../config/groq.js";

export const analyzeLicense = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const buffer = req.file.buffer;

        const pdfText = await extractTextFromBuffer(buffer);
        console.log(pdfText);

        const response = await llamaClient.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: "You extract structured data from driving licenses."
                },
                {
                    role: "user",
                    content: `
Extract the following fields from the driving license.

Return STRICT JSON only.

{
  "NAME": null,
  "LICENSE_NUMBER": null,
  "DATE_OF_BIRTH": null,
  "ISSUE_DATE": null,
  "EXPIRY_DATE": null,
  "ADDRESS": null,
  "VEHICLE_CLASS": null,
  "ISSUING_AUTHORITY": null
}

Rules:
- No extra text
- Dates in YYYY-MM-DD
- If missing → null

Text:
${pdfText}
                    `
                }
            ]
        });

        const output = response.choices[0].message.content;
        const cleaned = output.replace(/```/g, '').trim();

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (err) {
            return res.status(500).json({ error: "Invalid JSON from AI" });
        }

        res.json(parsed);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Processing failed" });
    }
};