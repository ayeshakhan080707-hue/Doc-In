import Groq from 'groq-sdk';

export interface ParsedMedicalDocument {
  licenseNumber?: string;
  doctorNameFound?: string;
  issuingAuthority?: string;
  degreeFound?: string;
  issueDate?: string;
  expiryDate?: string;
  confidenceScore: number;
  rawText: string;
}

// ── Groq Vision Prompt — specific for medical credentials with JSON mode ──────
const GROQ_PROMPT = `You are an expert medical document analyzer. Analyze this medical credential/license image and extract information.

Return a JSON object with EXACTLY these fields (use null for any field not found):
{
  "licenseNumber": "the registration/license number (look for Reg No, Registration No, License No fields)",
  "doctorName": "the doctor's own full name only (NOT father name, NOT address)",
  "issuingAuthority": "the medical council or regulatory body name",
  "degree": "medical qualification (MBBS, MD, BDS, FCPS, etc.)",
  "issueDate": "issue date in dd/mm/yyyy",
  "expiryDate": "expiry or valid-until date",
  "documentType": "type of document",
  "confidence": 90
}

Rules:
- licenseNumber: Find registration or license number field specifically
- doctorName: Only the practitioner's own name, never father's name or address  
- confidence: integer 0-100 based on image clarity and data completeness`;

/**
 * Primary: Groq Vision AI to analyze medical credential images
 * Falls back to regex-based text parsing if Groq is unavailable
 */
export const extractTextFromImage = async (
  imageBuffer: Buffer,
  mimeType: string
): Promise<ParsedMedicalDocument> => {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey || groqApiKey === 'your_groq_api_key_here') {
    console.warn('[DocIn AI] GROQ_API_KEY not configured — returning empty result.');
    return {
      licenseNumber: undefined,
      doctorNameFound: undefined,
      issuingAuthority: undefined,
      degreeFound: undefined,
      expiryDate: undefined,
      confidenceScore: 0,
      rawText: '',
    };
  }

  try {
    const groq = new Groq({ apiKey: groqApiKey });

    // Convert buffer to base64 data URL
    const base64 = imageBuffer.toString('base64');
    const imageUrl = `data:${mimeType || 'image/jpeg'};base64,${base64}`;

    console.log('[DocIn AI] Sending image to Groq Vision...');

    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl } as any,
            },
            {
              type: 'text',
              text: GROQ_PROMPT,
            },
          ],
        },
      ],
      max_tokens: 600,
      temperature: 0.05,
      // @ts-ignore — Groq SDK supports json_object response_format
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '';
    console.log('[DocIn AI] Groq response:', content.substring(0, 300));

    // Extract JSON from response (handle markdown code blocks)
    let parsed: any = {};
    try {
      // Remove ```json ... ``` wrappers if present
      const cleaned = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(cleaned);
      }
    } catch (parseErr) {
      console.warn('[DocIn AI] Could not parse JSON, using raw text:', parseErr);
      // Try to extract partial info from raw text
      return OcrParserService.parseExtractedText(content);
    }

    // Sanitize extracted fields
    const sanitize = (val: any): string | undefined => {
      if (!val || val === 'null' || val === 'N/A' || val === 'not visible') return undefined;
      return String(val).trim() || undefined;
    };

    const confidence = Math.min(
      Math.max(typeof parsed.confidence === 'number' ? parsed.confidence : 80, 40),
      98
    );

    return {
      licenseNumber: sanitize(parsed.licenseNumber),
      doctorNameFound: sanitize(parsed.doctorName),
      issuingAuthority: sanitize(parsed.issuingAuthority),
      degreeFound: sanitize(parsed.degree),
      issueDate: sanitize(parsed.issueDate),
      expiryDate: sanitize(parsed.expiryDate),
      confidenceScore: confidence,
      rawText: content,
    };

  } catch (error: any) {
    console.error('[DocIn AI] Groq Vision error:', error.message);
    // Return empty rather than crash
    return {
      licenseNumber: undefined,
      doctorNameFound: undefined,
      issuingAuthority: undefined,
      degreeFound: undefined,
      expiryDate: undefined,
      confidenceScore: 0,
      rawText: '',
    };
  }
};

// ── Fallback text parser (used when raw text is available) ────────────────────
export class OcrParserService {
  public static parseExtractedText(rawText: string): ParsedMedicalDocument {
    const cleanText = rawText.replace(/\r\n/g, '\n');
    let confidence = rawText.trim().length > 20 ? 45 : 15;

    const licensePatterns = [
      /(?:REG(?:ISTRATION)?\.?\s*(?:NO|NUMBER)?|LIC(?:ENSE)?|PMC|GMC)[:\s.#-]*([A-Z0-9]{2,8}[-\/][0-9]{4,10}[-\/]?[A-Z]?)/i,
      /\b([A-Z]{2,5}[-\/][0-9]{4,8})\b/,
      /\b([0-9]{6,10})\b/,
    ];
    let licenseNumber: string | undefined;
    for (const pat of licensePatterns) {
      const m = cleanText.match(pat);
      if (m?.[1]) { licenseNumber = m[1].trim(); confidence += 15; break; }
    }

    const authorities = [
      'Pakistan Medical & Dental Council', 'PMDC',
      'Pakistan Medical Commission', 'PMC',
      'General Medical Council', 'GMC',
      'State Medical Board', 'Royal College of Physicians',
    ];
    let issuingAuthority: string | undefined;
    for (const auth of authorities) {
      if (cleanText.toLowerCase().includes(auth.toLowerCase())) {
        issuingAuthority = auth; confidence += 10; break;
      }
    }

    const degrees = ['MBBS', 'MD', 'FCPS', 'FRCS', 'MRCP', 'MS', 'BDS', 'DNB', 'DO', 'FRCR'];
    let degreeFound: string | undefined;
    for (const deg of degrees) {
      if (new RegExp(`\\b${deg}\\b`, 'i').test(cleanText)) {
        degreeFound = deg; confidence += 8; break;
      }
    }

    const datePattern = /(?:EXPIRY|VALID\s+(?:THRU|UNTIL|TO)|EXPIRES)[:\s-]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i;
    const dateMatch = cleanText.match(datePattern);
    const expiryDate = dateMatch?.[1]?.trim();
    if (expiryDate) confidence += 8;

    const namePattern = /\bDR\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/;
    const nameMatch = cleanText.match(namePattern);
    const doctorNameFound = nameMatch?.[1]?.trim();

    return {
      licenseNumber,
      doctorNameFound,
      issuingAuthority,
      degreeFound,
      expiryDate,
      confidenceScore: Math.min(confidence, 90),
      rawText: cleanText,
    };
  }
}
