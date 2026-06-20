// backend/services/aiTemplateService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are an expert email template designer for a subscription management system.
Your job is to generate HTML email templates based on user prompts.

Reply ONLY with a valid JSON object. No markdown, no extra text.
JSON structure: { "name": "...", "subject": "...", "htmlBody": "...", "textBody": "...", "type": "..." }

Rules:
- name: A short label.
- subject: Compelling subject line.
- htmlBody: Responsive HTML email, inline CSS, use variables {{domain}}, {{owner}}, {{expiryDate}}, {{days}}, {{registrar}}.
- textBody: Plain text version.
- type: One of reminder_30, reminder_15, reminder_7, reminder_1, expired, custom.
If no timeframe mentioned, choose a reasonable type.`;

async function generateTemplateFromPrompt(userPrompt) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // Full prompt: system + user
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${userPrompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    // Clean possible markdown code fences
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let templateData;
    try {
      templateData = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', cleaned);
      throw new Error('AI returned invalid format');
    }

    const requiredKeys = ['name', 'subject', 'htmlBody', 'textBody', 'type'];
    const missingKeys = requiredKeys.filter(k => !(k in templateData));
    if (missingKeys.length > 0) {
      throw new Error(`AI response missing fields: ${missingKeys.join(', ')}`);
    }

    return templateData;
  } catch (error) {
    console.error('Gemini Error:', error);
    throw new Error(error.message || 'AI generation failed');
  }
}

module.exports = { generateTemplateFromPrompt };