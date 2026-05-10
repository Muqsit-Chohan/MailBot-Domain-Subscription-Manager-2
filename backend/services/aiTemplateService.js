const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert email template designer.
Generate a useful HTML email template based on the user's simple request.

Reply ONLY with a valid JSON object. No markdown, no extra text.
JSON structure: { "name": "...", "subject": "...", "htmlBody": "...", "textBody": "...", "type": "..." }
- name: short label (e.g., "7-Day Expiry Reminder")
- subject: compelling subject line
- htmlBody: responsive HTML, inline CSS only, use {{domain}}, {{owner}}, {{expiryDate}}, {{days}}, {{registrar}}
- textBody: plain text version
- type: one of reminder_30, reminder_15, reminder_7, reminder_1, expired, custom
If no timeframe given, pick a reasonable one.`;

async function generateTemplateFromPrompt(userPrompt) {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',   // or 'llama3-8b-8192' for faster/cheaper
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },   // Groq supports JSON mode
    });

    const responseText = completion.choices[0].message.content;

    let templateData;
    try {
      templateData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Groq returned invalid JSON:', responseText);
      throw new Error('AI returned an invalid format. Raw: ' + responseText.substring(0, 200));
    }

    const required = ['name', 'subject', 'htmlBody', 'textBody', 'type'];
    const missing = required.filter(k => !(k in templateData));
    if (missing.length > 0) {
      throw new Error(`AI response missing: ${missing.join(', ')}`);
    }

    return templateData;
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error(error.message || 'Failed to generate template');
  }
}

module.exports = { generateTemplateFromPrompt };