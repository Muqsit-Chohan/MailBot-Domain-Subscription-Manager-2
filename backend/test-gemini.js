require('dotenv').config();
const { generateTemplateFromPrompt } = require('./services/aiTemplateService');

async function test() {
  try {
    const result = await generateTemplateFromPrompt('A friendly domain renewal reminder 7 days before expiry');
    console.log('Template generation succeeded:', { name: result.name, type: result.type, fields: Object.keys(result) });
  } catch (err) {
    console.error("Gemini Error:", err.message);
    process.exitCode = 1;
  }
}
test();
