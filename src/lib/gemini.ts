import { GoogleGenAI, Type } from "@google/genai";
import { ProductAnalysis, BrandIntelligence, ChemicalInfo } from "../types";

const GEMINI_API_KEY = process.env.USER_GEMINI_KEY || process.env.GEMINI_API_KEY;

if (GEMINI_API_KEY) {
  console.log("Gemini API: Key detected (from " + (process.env.USER_GEMINI_KEY ? "USER_GEMINI_KEY" : "GEMINI_API_KEY") + "), initializing engine...");
} else {
  console.warn("Gemini API: No key detected. Intelligence engine will be unavailable.");
}

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// Error categorization helper
function handleAiError(error: any): never {
  console.error("Gemini API Error:", error);
  
  const message = error?.message || String(error);
  
  // Categorize based on common GenAI error patterns
  if (message.includes("API_KEY_INVALID") || message.includes("401") || message.includes("403")) {
    throw new Error("Invalid Gemini API Key. Please check your AI Studio secrets configuration.");
  }
  
  if (message.includes("429") || message.includes("quota") || message.includes("Rate limit")) {
    throw new Error("AI capacity reached. Please wait a moment before trying again (Rate limited).");
  }

  if (message.includes("500") || message.includes("503") || message.includes("overloaded")) {
    throw new Error("AI services are currently overloaded. Our chemical intelligence engine is busy, please try again soon.");
  }

  if (message.includes("SAFETY") || message.includes("blocked")) {
    throw new Error("This request was blocked by safety filters. Please ensure you are scanning consumer product labels only.");
  }

  if (message.includes("JSON") || message.includes("parse")) {
    throw new Error("The AI returned an unreadable format. This can happen with very complex labels; please try a clearer photo.");
  }

  if (message.includes("fetch") || message.includes("network")) {
    throw new Error("Connection failed. Please check your internet and ensure you're not behind a restrictive firewall.");
  }

  throw new Error(`AI Intelligence Error: ${message.slice(0, 100)}...`);
}

// Exponential backoff helper
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, initialDelay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Don't retry on certain fatal errors
    if (error?.message?.includes("401") || error?.message?.includes("403") || error?.message?.includes("SAFETY")) {
      handleAiError(error);
    }

    if (retries === 0) handleAiError(error);
    
    await new Promise(resolve => setTimeout(resolve, initialDelay));
    return retryWithBackoff(fn, retries - 1, initialDelay * 2);
  }
}

export async function analyzeIngredients(base64Image: string): Promise<ProductAnalysis> {
  if (!ai) throw new Error("GEMINI_API_KEY is missing");

  const prompt = `
    Analyze the following ingredient label from a product image. 
    1. Perform OCR to extract all ingredients.
    2. Analyze each ingredient for safety (SAFE, CAUTION, or UNSAFE).
    3. Provide an overall safety verdict.
    4. Reference global regulatory standards (FSSAI, EU REACH, FDA).
    
    Return the response in JSON format matching this structure:
    {
      "productName": "string",
      "brandName": "string",
      "overallStatus": "SAFE" | "CAUTION" | "UNSAFE",
      "summary": "string summary of the product safety",
      "ingredients": [
        {
          "name": "string",
          "status": "SAFE" | "CAUTION" | "UNSAFE",
          "explanation": "why this status was assigned",
          "healthHazards": ["array", "of", "strings", "if", "any"],
          "benefits": ["array", "of", "strings", "if", "any"]
        }
      ],
      "regulatoryNotes": "string details about regulatory compliance"
    }
  `;

  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    if (!response.text) throw new Error("AI returned empty response");
    return JSON.parse(response.text) as ProductAnalysis;
  });
}

export async function searchChemical(query: string): Promise<ChemicalInfo> {
  if (!ai) throw new Error("GEMINI_API_KEY is missing");

  const prompt = `
    Provide detailed chemical safety intelligence for the compound: "${query}".
    Return a JSON object with:
    {
      "name": "string",
      "formula": "string",
      "commonUses": ["array", "of", "strings"],
      "hazards": ["array", "of", "strings"],
      "benefits": ["array", "of", "strings", "if", "any"],
      "regulations": "string detailing global regulatory standing",
      "safetyVerdict": "SAFE" | "CAUTION" | "UNSAFE"
    }
  `;

  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text!) as ChemicalInfo;
  });
}

export async function getBrandIntelligence(brand: string): Promise<BrandIntelligence> {
  if (!ai) throw new Error("GEMINI_API_KEY is missing");

  const prompt = `
    Provide brand intelligence for: "${brand}".
    Analyze their safety reputation, recall history, and manufacturing standards.
    Return a JSON object with:
    {
      "brandName": "string",
      "reputationStatus": "SAFE" | "CAUTION" | "UNSAFE",
      "summary": "string",
      "recallHistory": ["array", "of", "recall", "events"],
      "manufacturingStandards": "string"
    }
  `;

  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text!) as BrandIntelligence;
  });
}
