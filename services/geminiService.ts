import { GoogleGenAI, Type } from "@google/genai";
import { DocField } from "../types";

export const extractDataFromText = async (
  promptText: string,
  currentFields: DocField[]
): Promise<Partial<Record<string, string>>> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Create a dynamic schema based on the current fields
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    currentFields.forEach(field => {
      properties[field.key] = {
        type: Type.STRING,
        description: `Value for field '${field.label}' (key: ${field.key}). Context: ${field.placeholder || 'No context'}`
      };
      required.push(field.key);
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract contract information from the following text description. 
      Text: "${promptText}"
      
      Map the information to the provided JSON schema. If information is missing, leave it as an empty string.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: properties,
          required: required // Use a subset if strict requirement fails, but here we want best effort
        }
      }
    });

    const resultText = response.text;
    if (!resultText) return {};

    try {
        const json = JSON.parse(resultText);
        return json;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response", e);
        return {};
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
