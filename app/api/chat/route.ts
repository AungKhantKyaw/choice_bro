import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required bro' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing env variable! Check that GEMINI_API_KEY exists in .env.local");
      return NextResponse.json({ error: 'Server environment variable setup is broken' }, { status: 500 });
    }

    // Initialize inside the request scope to guarantee env availability in Next.js
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
      You are ChoiceBro, a sharp, tech-savvy Kiwi shopping assistant. 
      Your single job is to analyze casual shopping queries and extract structured search parameters.
      
      Examples:
      - "Find me a cheap monitor under 300 bucks" -> product: "monitor", maxPrice: 300
      - "Looking for an iPad at PB Tech" -> product: "iPad", storePreference: "pbtech"
      - "Suss out a Nintendo Switch" -> product: "Nintendo Switch"
    `;

    // Request text generation with structural configuration adjustments
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using updated stable model identifier
      contents: message,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            product: { 
              type: Type.STRING, 
              description: 'The clean generic name or model of the item to search for (e.g., "Logitech G502").' 
            },
            maxPrice: { 
              type: Type.INTEGER, 
              description: 'The maximum budget specified by the user in New Zealand Dollars, or null if not stated.' 
            },
            storePreference: { 
              type: Type.STRING, 
              description: 'Target store if explicitly mentioned: "pbtech", "jbhifi", "harveynorman", "noelleeming", "mightyape". Otherwise null.' 
            },
          },
          required: ['product'],
        },
      },
    });

    const aiText = response.text;
    if (!aiText) {
      throw new Error('Gemini API parsed correctly but returned an empty text layer');
    }

    const searchParameters = JSON.parse(aiText);
    return NextResponse.json(searchParameters);

  } catch (error: any) {
    console.error('CRITICAL GEMINI FAILURE:', error);
    
    return NextResponse.json({ 
      error: 'Failed to process AI query',
      details: error.message || error.toString() 
    }, { status: 500 });
  }
}