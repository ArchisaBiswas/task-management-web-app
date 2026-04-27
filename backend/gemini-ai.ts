import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Sends a single prompt to Gemini and prints the response — used for smoke-testing the API key.
async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: "Provide a professional and concise E-Mail body with the Task details.",
  });
  console.log(response.text);
}

main();