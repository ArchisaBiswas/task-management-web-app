import "dotenv/config";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Entry point — runs a test prompt and prints the LLM reply to stdout.
async function main() {
  const chatCompletion = await getGroqChatCompletion();
  console.log(chatCompletion.choices[0]?.message?.content || "");
}

// Sends a single user message to Groq using the llama3-8b-8192 model and returns the completion.
async function getGroqChatCompletion() {
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: "Provide a professional and concise E-Mail body with the Task details.",
      },
    ],
    model: "llama3-8b-8192",
  });
}

main();