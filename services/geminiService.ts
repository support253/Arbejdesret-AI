import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TerminationRequest, TerminationResponse } from "../types";

/**
 * SECURITY NOTE:
 * The API key is accessed via process.env.API_KEY.
 * This ensures the key is NOT hardcoded in the source code.
 * Do not log the apiKey or the process.env object to the console in production.
 */
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // We log a generic error to the console, but never the key itself (even if it was malformed)
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API nøgle mangler. Tjek venligst dine indstillinger.");
  }
  return new GoogleGenAI({ apiKey });
};

// NOTE: In a production app, these constants might come from a more complex config
const SYSTEM_INSTRUCTION_BASE = `
Du er "Arbejdsret-Eksperten", en avanceret AI-agent specialiseret i dansk arbejdsret.
Din viden omfatter Funktionærloven, Ferieloven, GDPR og standard overenskomster.

Dine svar skal være:
1. Juridisk korrekte i henhold til gældende dansk lovgivning.
2. Formuleret i et professionelt, formelt dansk sprog.
3. Konservative i vurderinger (advar brugeren hvis en opsigelse virker usaglig).

Når du genererer dokumenter, skal du følge standard dansk forretningsformat.
`;

// Schema for structured termination response
const terminationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isValidReason: { type: Type.BOOLEAN, description: "Whether the provided reason is legally valid for termination." },
    calculatedNoticePeriod: { type: Type.STRING, description: "The calculated notice period (e.g. '3 måneder') based on hire date." },
    lastWorkingDay: { type: Type.STRING, description: "The specific date for the last working day." },
    legalReference: { type: Type.STRING, description: "Reference to specific paragraphs in Funktionærloven." },
    letterContent: { type: Type.STRING, description: "The full text of the termination letter in Markdown format." },
    explanation: { type: Type.STRING, description: "A brief explanation of the calculation and advice." },
  },
  required: ["isValidReason", "calculatedNoticePeriod", "lastWorkingDay", "legalReference", "letterContent", "explanation"],
};

export const generateTerminationPackage = async (request: TerminationRequest): Promise<TerminationResponse> => {
  const client = getClient();
  
  const prompt = `
    Generer en opsigelsespakke for følgende medarbejder:
    Navn: ${request.employee.name}
    Titel: ${request.employee.title}
    Adresse: ${request.employee.address}
    Ansat dato: ${request.employee.hireDate}
    Er funktionær: ${request.employee.isFunktionaer ? 'Ja' : 'Nej'}
    
    Dato for opsigelse (dags dato): ${request.terminationDate}
    Årsag: ${request.reason}
    Noter: ${request.notes || "Ingen"}

    Opgave:
    1. Beregn det korrekte opsigelsesvarsel iht. Funktionærloven baseret på anciennitet.
    2. Beregn fratrædelsesdatoen (typisk udgangen af en måned).
    3. Vurder om årsagen er saglig.
    4. Skriv selve opsigelsesbrevet. Det skal være venligt men formelt.
  `;

  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_BASE,
      responseMimeType: "application/json",
      responseSchema: terminationSchema,
    }
  });

  if (!response.text) {
    throw new Error("Intet svar modtaget fra AI.");
  }

  return JSON.parse(response.text) as TerminationResponse;
};

export const analyzeLegalDocument = async (data: string, mimeType: string): Promise<string> => {
  const client = getClient();

  const parts = [];

  // Handle text-based formats specifically
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    parts.push({
      text: `Her er indholdet af et juridisk dokument:\n\n${data}`
    });
  } else {
    // Handle binary formats (Images, PDF) via InlineData
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: data // Base64 string without prefix
      }
    });
  }

  parts.push({
    text: "Analyser dette dokument (som kan være en kontrakt, overenskomst eller klausul). 1) Identificer dokumentets type. 2) Resumer hovedpunkterne. 3) Forklar på almindeligt dansk, hvad indholdet betyder for arbejdsgiver og medarbejder. 4) Fremhæv eventuelle juridiske risici eller usædvanlige vilkår."
  });

  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_BASE,
    }
  });

  return response.text || "Kunne ikke analysere dokumentet.";
};

export const sendChatMessage = async (
  history: {role: 'user' | 'model', text: string}[],
  message: string,
  topic?: string
): Promise<{ text: string, sources?: { title: string; uri: string }[] }> => {
  const client = getClient();
  
  // Convert history to Gemini format
  const chatHistory = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  // Add context-specific instruction based on the selected topic
  let systemInstruction = SYSTEM_INSTRUCTION_BASE;
  systemInstruction += `\n\nDu har adgang til Google Search. BRUG DETTE VÆRKTØJ aktivt til at finde opdaterede lovtekster, satser (f.eks. godtgørelser) og nyere domstolsafgørelser, når det er relevant for brugerens spørgsmål. Sørg for at svaret er baseret på gældende dansk ret.`;

  if (topic && topic !== 'Generelt') {
    systemInstruction += `\n\nBRUGERENS VALGTE EMNE: ${topic}.\nDu skal nu fokusere din rådgivning specifikt på love, regler og præcedens inden for "${topic}". Ignorer regler der ikke er relevante for dette emne, medmindre de er nødvendige for konteksten.`;
  }

  const chat = client.chats.create({
    model: 'gemini-3-flash-preview',
    history: chatHistory,
    config: {
      systemInstruction: systemInstruction,
      tools: [{ googleSearch: {} }],
    }
  });

  const response = await chat.sendMessage({ message });
  const text = response.text || "Beklager, jeg kunne ikke generere et svar.";

  // Extract grounding metadata for sources
  const sources: { title: string; uri: string }[] = [];
  const candidates = response.candidates;
  
  if (candidates && candidates[0]) {
    const groundingMetadata = candidates[0].groundingMetadata;
    if (groundingMetadata && groundingMetadata.groundingChunks) {
      groundingMetadata.groundingChunks.forEach(chunk => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || "Kilde",
            uri: chunk.web.uri || "#"
          });
        }
      });
    }
  }

  // Deduplicate sources based on URI
  const uniqueSources = sources.filter((v,i,a)=>a.findIndex(v2=>(v2.uri===v.uri))===i);

  return { text, sources: uniqueSources };
};

// Interface for News Item
export interface LegalNewsItem {
  date: string;
  title: string;
  tag: string;
  summary: string;
}

export const fetchLegalNews = async (): Promise<LegalNewsItem[]> => {
  const client = getClient();
  
  const newsSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Date of the news/event (e.g. '15. okt')" },
        title: { type: Type.STRING, description: "Headline of the legal update" },
        tag: { type: Type.STRING, description: "Category: 'Lovgivning', 'Domstol', 'Overenskomst', 'EU' etc." },
        summary: { type: Type.STRING, description: "Very short summary (max 10 words)" }
      },
      required: ["date", "title", "tag"]
    }
  };

  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "Find de seneste 3 vigtige nyheder eller ændringer inden for dansk arbejdsret, ferieloven, GDPR eller overenskomster fra de sidste 6 måneder. Returner dem som JSON.",
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: newsSchema,
      systemInstruction: "Du er en nyhedsagent. Find faktiske, nylige lovændringer eller juridiske nyheder i Danmark."
    }
  });

  if (!response.text) return [];
  
  try {
    return JSON.parse(response.text) as LegalNewsItem[];
  } catch (e) {
    console.error("Failed to parse news json", e);
    return [];
  }
};
