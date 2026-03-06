import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { CVData, CoverLetterData, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function improveCV(rawInfo: string, jobType: string, language: Language = 'English'): Promise<CVData> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Transform the following raw career information into a professional, structured CV tailored for a ${jobType} role. 
    The CV MUST be written in ${language}.
    Follow a standard Tanzanian professional CV format which is clean, simple, and includes referees.
    Focus on improving the language, making it more impactful, and highlighting skills relevant to ${jobType}.
    
    Raw Info:
    ${rawInfo}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          location: { type: Type.STRING },
          summary: { type: Type.STRING, description: "Professional career objective or summary" },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                company: { type: Type.STRING },
                role: { type: Type.STRING },
                period: { type: Type.STRING },
                description: { type: Type.STRING, description: "Detailed bullet points of achievements" }
              },
              required: ["company", "role", "period", "description"]
            }
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                school: { type: Type.STRING },
                degree: { type: Type.STRING },
                year: { type: Type.STRING }
              },
              required: ["school", "degree", "year"]
            }
          },
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          certifications: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          referees: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                position: { type: Type.STRING },
                organization: { type: Type.STRING },
                contact: { type: Type.STRING }
              },
              required: ["name", "position", "organization", "contact"]
            }
          }
        },
        required: ["fullName", "email", "phone", "location", "summary", "experience", "education", "skills", "certifications", "referees"]
      },
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as CVData;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("Failed to generate structured CV");
  }
}

export async function generateCoverLetter(
  personalInfo: string,
  jobDescription: string,
  companyInfo: string,
  cvBackground?: string,
  language: Language = 'English'
): Promise<CoverLetterData> {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a professional cover letter based on the following information.
    The cover letter MUST be written in ${language}.
    The cover letter should be persuasive, professional, and tailored to the job description.
    
    IMPORTANT: Use today's date: ${today}
    
    Personal Details:
    ${personalInfo}
    
    CV Background (Experience, Education, Skills):
    ${cvBackground || 'Not provided'}
    
    Job Description:
    ${jobDescription}
    
    Company Information:
    ${companyInfo}
    
    Return the response in a structured JSON format.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          location: { type: Type.STRING },
          date: { type: Type.STRING, description: `The date to use, which should be ${today}` },
          recipientName: { type: Type.STRING, description: "Hiring Manager or specific name if provided" },
          recipientTitle: { type: Type.STRING },
          companyName: { type: Type.STRING },
          companyAddress: { type: Type.STRING },
          subject: { type: Type.STRING, description: "Formal subject line for the cover letter" },
          content: { type: Type.STRING, description: "The full body of the cover letter with professional salutation and closing" }
        },
        required: ["fullName", "email", "phone", "location", "date", "recipientName", "recipientTitle", "companyName", "companyAddress", "subject", "content"]
      },
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as CoverLetterData;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("Failed to generate cover letter");
  }
}

export async function analyzeDocument(
  fileData: string,
  mimeType: string,
  type: 'cv' | 'cover_letter'
): Promise<any> {
  const prompt = type === 'cv' 
    ? `Extract professional info from this CV. JSON: {fullName, email, phone, location, summary, education: [{school, degree, year}], experience: [{company, role, period, description}], skills: [], certifications: [], referees: [{name, position, organization, contact}]}`
    : `Extract info from this Cover Letter. JSON: {fullName, email, phone, location, date, recipientName, recipientTitle, companyName, companyAddress, subject, content}`;

  const parts: any[] = [{ text: prompt }];

  if (mimeType === 'text/plain') {
    parts.push({ text: `Document Content:\n${fileData}` });
  } else {
    // For images or PDFs sent as binary
    parts.push({ 
      inlineData: { 
        data: fileData.includes(',') ? fileData.split(',')[1] : fileData, 
        mimeType 
      } 
    });
  }

  const cvSchema = {
    type: Type.OBJECT,
    properties: {
      fullName: { type: Type.STRING },
      email: { type: Type.STRING },
      phone: { type: Type.STRING },
      location: { type: Type.STRING },
      summary: { type: Type.STRING },
      education: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            school: { type: Type.STRING },
            degree: { type: Type.STRING },
            year: { type: Type.STRING }
          }
        }
      },
      experience: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            company: { type: Type.STRING },
            role: { type: Type.STRING },
            period: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      },
      skills: { type: Type.ARRAY, items: { type: Type.STRING } },
      certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
      referees: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            position: { type: Type.STRING },
            organization: { type: Type.STRING },
            contact: { type: Type.STRING }
          }
        }
      }
    }
  };

  const clSchema = {
    type: Type.OBJECT,
    properties: {
      fullName: { type: Type.STRING },
      email: { type: Type.STRING },
      phone: { type: Type.STRING },
      location: { type: Type.STRING },
      date: { type: Type.STRING },
      recipientName: { type: Type.STRING },
      recipientTitle: { type: Type.STRING },
      companyName: { type: Type.STRING },
      companyAddress: { type: Type.STRING },
      subject: { type: Type.STRING },
      content: { type: Type.STRING }
    }
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: type === 'cv' ? cvSchema : clSchema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse AI document analysis", e);
    throw new Error("Failed to analyze document");
  }
}
