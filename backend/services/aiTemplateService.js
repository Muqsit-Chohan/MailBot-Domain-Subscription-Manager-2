// backend/services/aiTemplateService.js
const { GoogleGenerativeAI, GoogleGenerativeAIAbortError } = require('@google/generative-ai');

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
    const model = genAI.getGenerativeModel(
      { model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest' },
      { timeout: 18000 }
    );

    // Full prompt: system + user
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${userPrompt}`;

    let result;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await model.generateContent(fullPrompt);
        break;
      } catch (error) {
        if (attempt === 1 || ![429, 500, 502, 503, 504].includes(error.status)) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
      }
    }
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
    console.error('Gemini generation failed:', error.status || error.name);
    const unavailable = [429, 500, 502, 503, 504].includes(error.status)
      || error instanceof GoogleGenerativeAIAbortError;
    const publicError = new Error(unavailable
      ? 'AI generation is temporarily busy or unavailable. Please try again shortly.'
      : 'AI generation failed. Please try again or contact support if the problem persists.');
    publicError.status = unavailable ? 503 : 502;
    throw publicError;
  }
}

module.exports = { generateTemplateFromPrompt };
