import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { products, query } = await request.json();
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'No listings available to analyze bro' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing environment key' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
      You are ChoiceBro, a legendary, price-savvy Kiwi grocery expert who loves saving dollars on supermarket shops.
      You are reviewing a list of live scraped supermarket prices for grocery items in New Zealand.
      
      Your goal is to write a highly conversational summary of the results using clean, witty, lighthearted New Zealand slang (words like: sweet-as, suss, bro, mate, champion, paknsave, woolworths, new world, massive rip-off, sorted).
      
      Compare Woolworths, New World, and PAK'nSAVE. Be strictly honest. If one supermarket is way more expensive, call it out in a humorous Kiwi style.
    `;

    const formattedProducts = products.map(p => ({
      store: p.site || p.store || 'Unknown Store',
      title: p.title || 'Grocery Listing',
      price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0
    }));

    const inputContext = `
      The user searched for: "${query || 'Grocery Item'}"
      Here are the current live store listings found:
      ${JSON.stringify(formattedProducts)}
      
      Give your expert breakdown following the exact JSON schema requested.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: inputContext,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { 
              type: Type.STRING, 
              description: 'A 2-3 sentence overview of the grocery price spread written in a legendary Kiwi tone.' 
            },
            bestStore: { 
              type: Type.STRING, 
              description: 'The short name of the specific supermarket providing the absolute best value.' 
            },
            dealRating: { 
              type: Type.STRING, 
              description: 'A funny grocery rating out of 5, e.g., "5/5 Sweet As Savings", "2/5 Woolworths Tax".' 
            },
            broAdvice: { 
              type: Type.STRING, 
              description: 'One punchy, direct piece of tactical buying advice for this grocery item.' 
            }
          },
          required: ['summary', 'bestStore', 'dealRating', 'broAdvice'],
        },
      },
    });

    const aiText = response.text;
    if (!aiText) throw new Error('Verdict text returned completely empty');

    return NextResponse.json(JSON.parse(aiText));

  } catch (error: any) {   
    console.error('GROCERY VERDICT GENERATION FAILURE:', error);
    
    return NextResponse.json({ 
      error: 'Failed to generate Bro verdict logic',
      details: error.message || error.toString()
    }, { status: 500 });
  }
}
