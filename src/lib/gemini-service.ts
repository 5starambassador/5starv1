import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export interface GeminiContext {
    userName: string;
    role: string;
    referralCount: number;
    campus?: string;
    relatedData?: string; // This will hold the RAG results (Program info, Fees, etc.)
}

/**
 * Service to interact with Google Gemini AI for WhatsApp Engagement
 */
export class GeminiService {
    private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    /**
     * Generates a contextually aware response for a user message
     */
    async generateResponse(userMessage: string, context: GeminiContext): Promise<string> {
        const currentKey = process.env.GEMINI_API_KEY || "";
        console.log(`[GeminiService] Generating response for ${context.userName}. KEY: ${currentKey.substring(0, 6)}...${currentKey.substring(currentKey.length - 4)}`);
        
        if (!currentKey) {
            return "I apologize, but my AI brain is currently being configured. Please check back in a moment! 🤖";
        }

        const systemPrompt = `
You are the "5 Star Ambassador" AI Assistant for Achariya Group of Institutions.
Your goal is to be helpful, professional, and encouraging.

CONTEXT ABOUT THE USER YOU ARE TALKING TO:
- Name: ${context.userName}
- Role: ${context.role}
- Campus: ${context.campus || "Global"}
- Current Referrals: ${context.referralCount}

SPECIFIC KNOWLEDGE FOR THIS QUERY:
${context.relatedData || "No specific program data provided. Use general school knowledge."}

GUIDELINES:
1. Keep responses concise (WhatsApp friendly).
2. Use emojis to be friendly 🚀.
3. If asked about fees or programs, use ONLY the facts provided in the "SPECIFIC KNOWLEDGE" section.
4. If you don't know the answer, politely suggest they type "HELP" to speak to a human admin.
5. Always encourage them to share their referral link to earn rewards.
6. Do not mention that you are an AI unless specifically asked.

USER MESSAGE: "${userMessage}"
`;

        const tryGenerate = async (attempt: number = 0): Promise<string> => {
            try {
                const currentKey = process.env.GEMINI_API_KEY || "";
                const client = new GoogleGenerativeAI(currentKey);
                // Using gemini-1.5-flash for the highest speed and lowest cost (Free Tier)
                const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(systemPrompt);
                const response = await result.response;
                return response.text().trim();
            } catch (error: any) {
                // Handle 429 Rate Limit Errors with Exponential Backoff
                if (attempt < 3 && error?.status === 429) {
                    const backoff = (attempt + 1) * 2000; // 2s, 4s, 6s
                    console.log(`[GeminiService] Rate limit hit. Attempt ${attempt + 1}/3. Retrying in ${backoff/1000}s...`);
                    await new Promise(r => setTimeout(r, backoff));
                    return tryGenerate(attempt + 1);
                }
                console.error("Gemini Generation Error:", error?.status, error?.statusText || error?.message);
                return "I'm having a bit of trouble thinking right now. Type HELP for manual assistance! 🤖";
            }
        };

        return tryGenerate();
    }
}

export const geminiService = new GeminiService();
