import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import Groq from 'groq-sdk';

// ── Clinical Case Analysis System Prompt ─────────────────────────────────────
const CLINICAL_SYSTEM_PROMPT = `You are DocIn AI — an expert clinical decision support system designed exclusively for licensed physicians and healthcare professionals on the DocIn platform.

Your role is to assist clinicians with:
1. Differential diagnosis generation
2. ICD-10 code suggestions
3. Relevant clinical literature references
4. Diagnostic workup recommendations
5. Treatment considerations

CRITICAL RULES:
- Always present differentials ranked by probability (Most likely → Least likely)
- Always include ICD-10 codes with descriptions
- Use precise medical terminology
- Flag any RED FLAGS or emergency conditions prominently
- Include key distinguishing features between differentials
- Suggest specific investigations (labs, imaging, procedures)
- Reference evidence-based guidelines (AHA, NICE, WHO, UpToDate)
- ALWAYS add disclaimer: "This is for clinical decision support only — final diagnosis is the responsibility of the treating physician"
- Never diagnose definitively — always present differentials
- Consider patient safety above all

RESPONSE FORMAT (strict JSON):
{
  "patientSummary": "Brief 1-line summary of the case",
  "redFlags": ["list of red flags if any, empty array if none"],
  "differentials": [
    {
      "rank": 1,
      "diagnosis": "Diagnosis name",
      "icd10Code": "X00.0",
      "icd10Description": "Full ICD-10 description",
      "probability": "High/Moderate/Low",
      "supportingFeatures": ["feature 1", "feature 2"],
      "againstFeatures": ["feature against if any"],
      "keyDistinguisher": "What distinguishes this from others"
    }
  ],
  "recommendedWorkup": {
    "urgentTests": ["tests needed immediately if any"],
    "laboratoryTests": ["CBC", "etc"],
    "imaging": ["CXR", "etc"],
    "specialTests": ["specific tests"]
  },
  "treatmentConsiderations": ["key treatment points"],
  "relevantGuidelines": [
    {
      "name": "Guideline name",
      "organization": "AHA/WHO/NICE/etc",
      "year": "2023",
      "keyRecommendation": "Relevant recommendation"
    }
  ],
  "followUpRecommendations": ["follow up points"],
  "disclaimer": "This analysis is for clinical decision support only and does not replace clinical judgment. Final diagnosis and treatment decisions are the responsibility of the treating physician."
}`;

export class AIController {
  public static async analyzeClinicalCase(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { caseDescription, patientAge, patientGender, vitalSigns, labResults, specialty } = req.body;

      if (!caseDescription || typeof caseDescription !== 'string' || caseDescription.trim().length < 20) {
        res.status(400).json({
          success: false,
          message: 'Please provide a detailed case description (minimum 20 characters).',
        });
        return;
      }

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        res.status(503).json({ success: false, message: 'AI service not configured.' });
        return;
      }

      // Build comprehensive case prompt
      const casePrompt = buildCasePrompt({
        caseDescription: caseDescription.trim().substring(0, 3000),
        patientAge,
        patientGender,
        vitalSigns,
        labResults,
        specialty,
      });

      const groq = new Groq({ apiKey: groqApiKey });

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: CLINICAL_SYSTEM_PROMPT },
          { role: 'user', content: casePrompt },
        ],
        max_tokens: 2000,
        temperature: 0.2,
        response_format: { type: 'json_object' } as any,
      });

      const content = response.choices[0]?.message?.content || '';

      let analysis: any;
      try {
        const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleaned);
      } catch {
        // If JSON parsing fails, return raw content wrapped
        analysis = {
          patientSummary: 'Analysis complete',
          redFlags: [],
          differentials: [],
          rawAnalysis: content,
          disclaimer: 'This analysis is for clinical decision support only.',
        };
      }

      res.json({
        success: true,
        data: analysis,
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        tokensUsed: response.usage?.total_tokens,
      });
    } catch (error: any) {
      console.error('[AI Controller]', error.message);
      res.status(500).json({
        success: false,
        message: error.message?.includes('rate limit')
          ? 'AI service is temporarily busy. Please try again in a moment.'
          : 'Failed to analyze case. Please try again.',
      });
    }
  }
}

// ── Case prompt builder ───────────────────────────────────────────────────────
function buildCasePrompt(data: {
  caseDescription: string;
  patientAge?: string;
  patientGender?: string;
  vitalSigns?: string;
  labResults?: string;
  specialty?: string;
}): string {
  const parts: string[] = ['CLINICAL CASE FOR ANALYSIS:\n'];

  if (data.patientAge || data.patientGender) {
    const demo = [data.patientAge && `Age: ${data.patientAge}`, data.patientGender && `Gender: ${data.patientGender}`]
      .filter(Boolean).join(', ');
    parts.push(`PATIENT DEMOGRAPHICS: ${demo}`);
  }

  if (data.specialty) {
    parts.push(`SPECIALTY CONTEXT: ${data.specialty}`);
  }

  parts.push(`\nCLINICAL PRESENTATION:\n${data.caseDescription}`);

  if (data.vitalSigns?.trim()) {
    parts.push(`\nVITAL SIGNS:\n${data.vitalSigns}`);
  }

  if (data.labResults?.trim()) {
    parts.push(`\nLABORATORY / INVESTIGATION RESULTS:\n${data.labResults}`);
  }

  parts.push('\nPlease provide a comprehensive differential diagnosis with ICD-10 codes, recommended workup, and relevant clinical guidelines in the specified JSON format.');

  return parts.join('\n');
}
