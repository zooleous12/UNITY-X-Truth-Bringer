import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ConversationData } from "../types";

// Initialize the client
// API Key is injected via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A short, descriptive title for the conversation." },
    summary: { type: Type.STRING, description: "A concise summary of the entire conversation." },
    participants: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of names of people involved in the conversation."
    },
    overallTone: { type: Type.STRING, description: "The general emotional atmosphere of the conversation." },
    turns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER, description: "Sequential ID of the message." },
          speaker: { type: Type.STRING, description: "Name of the speaker." },
          text: { type: Type.STRING, description: "The exact original text content of the message." },
          analysis: {
            type: Type.OBJECT,
            properties: {
              emotion: { 
                type: Type.STRING, 
                description: "Primary emotion detected (e.g., Joy, Anger, Sadness, Surprise, Fear, Disgust, Trust, Anticipation)." 
              },
              sentiment: { 
                type: Type.STRING, 
                enum: ["Positive", "Negative", "Neutral", "Mixed"],
                description: "General sentiment polarity." 
              },
              intensity: { 
                type: Type.INTEGER, 
                description: "Intensity of the emotion on a scale of 1 to 10." 
              },
              reasoning: { 
                type: Type.STRING, 
                description: "A brief AI reasoning explaining why this emotion and sentiment were selected based on context and subtext." 
              }
            },
            required: ["emotion", "sentiment", "intensity", "reasoning"]
          }
        },
        required: ["id", "speaker", "text", "analysis"]
      }
    }
  },
  required: ["title", "summary", "participants", "overallTone", "turns"]
};

export const analyzeText = async (text: string): Promise<ConversationData> => {
  try {
    const modelId = 'gemini-2.5-flash'; // High context window, fast, efficient for large text
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Analyze the following text conversation. Preserve the context entirely. 
      Identify speakers, messages, and perform a deep psychological analysis of the emotion and sentiment for each turn.
      
      Conversation Text:
      """
      ${text}
      """`,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        systemInstruction: "You are an expert linguist and psychologist AI. Your task is to parse unstructured conversation logs into structured JSON data without losing any context. You must accurately identify speakers and provide deep reasoning for the emotional state of each message.",
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as ConversationData;
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};