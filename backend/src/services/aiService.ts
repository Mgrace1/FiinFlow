import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

// For debugging purposes: log the API key to see if it's loaded
console.log("GEMINI_API_KEY loaded:", process.env.GEMINI_API_KEY ? "Exists" : "Not Found");

// Get Gemini API key from environment variables
const geminiApiKey = process.env.GEMINI_API_KEY;

// Check if the API key is available
if (!geminiApiKey) {
  console.error("Gemini API key is not available. Please set the GEMINI_API_KEY environment variable.");
  // You might want to throw an error here or handle it in a way that doesn't block the application from starting
  // For now, we will proceed, but AI features will not work.
}

// Initialize the GoogleGenerativeAI instance
// We are checking for geminiApiKey's existence before this, so we can assert that it is a string.
const genAI = new GoogleGenerativeAI(geminiApiKey!);

// Function to convert a file to a GenerativePart
function fileToGenerativePart(path: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

// Function to extract information from a receipt image
export async function extractReceiptData(imagePath: string, mimeType: string) {
  if (!geminiApiKey) {
    throw new Error("Cannot process image without Gemini API key.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

  const prompt = `
    Analyze the following receipt image and extract the following information in a valid JSON format:
    1. vendor: The name of the vendor or store.
    2. date: The date of the transaction (YYYY-MM-DD).
    3. total: The total amount of the transaction as a number.

    If any of this information is not clearly visible, use null for that field.
    Do not include any text other than the JSON object in your response.
  `;

  const imagePart = fileToGenerativePart(imagePath, mimeType);

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Clean the response to get only the JSON part
    const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Parse the JSON string into an object
    const data = JSON.parse(jsonText);
    return data;
  } catch (error) {
    console.error("Error processing receipt image:", error);
    throw new Error("Failed to extract data from receipt.");
  }
}
