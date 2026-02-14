import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TerminationRequest, TerminationResponse } from "../types";

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

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API nøgle mangler. Tjek venligst dine indstillinger.");
  }
  return new GoogleGenAI({ apiKey });
};

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

export const analyzeLegalClauseImage = async (base64Image: string): Promise<string> => {
  const client = getClient();

  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        },
        {
          text: "Analyser dette billede af en juridisk tekst (f.eks. fra en overenskomst eller kontrakt). 1) Transkriber teksten nøjagtigt. 2) Forklar på almindeligt dansk, hvad denne klausul betyder for arbejdsgiver og medarbejder. Fremhæv eventuelle risici."
        }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_BASE,
    }
  });

  return response.text || "Kunne ikke analysere billedet.";
};

export const sendChatMessage = async (
  history: {role: 'user' | 'model', text: string}[],
  message: string,
  topic?: string
) => {
  const client = getClient();
  
  // Convert history to Gemini format
  const chatHistory = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  // Add context-specific instruction based on the selected topic
  let systemInstruction = SYSTEM_INSTRUCTION_BASE;
  if (topic && topic !== 'Generelt') {
    systemInstruction += `\n\nBRUGERENS VALGTE EMNE: ${topic}.\nDu skal nu fokusere din rådgivning specifikt på love, regler og præcedens inden for "${topic}". Ignorer regler der ikke er relevante for dette emne, medmindre de er nødvendige for konteksten.`;
  }

  const chat = client.chats.create({
    model: 'gemini-3-flash-preview',
    history: chatHistory,
    config: {
      systemInstruction: systemInstruction,
    }
  });

  const response = await chat.sendMessage({ message });
  return response.text || "Beklager, jeg kunne ikke generere et svar.";
};
