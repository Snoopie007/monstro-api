import { ChatOpenAI } from "@langchain/openai";
// Temporarily disabled Anthropic and Google GenAI due to version compatibility issues
// import { ChatAnthropic } from "@langchain/anthropic";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function getModel(model: "anthropic" | "gpt" | "gemini") {
  // Temporarily using only OpenAI until we resolve LangChain version conflicts
  console.warn(
    `Requested model: ${model}, using GPT-4 due to compatibility issues`
  );

  return new ChatOpenAI({
    modelName: "gpt-4.1",
    apiKey: process.env.OPENAI_API_KEY,
    streaming: true,
  });
}
