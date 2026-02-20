import { config } from '../config/index.js';

export interface VerificationResult {
  approved: boolean;
  cheated: boolean;
  feedback: string;
}

class VerificationService {
  private apiKey: string;
  private model: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.model = config.gemini.model;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  async verifySubmission(
    jobDescription: string,
    jobFiles: string[],
    submissionText: string,
    submissionFiles: string[]
  ): Promise<VerificationResult> {
    const prompt = this.buildVerificationPrompt(jobDescription, jobFiles, submissionText, submissionFiles);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.verification.timeoutMs);

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return this.parseVerificationResponse(text);
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === 'AbortError') {
        return {
          approved: false,
          cheated: false,
          feedback: 'Verification timed out. Please try again.',
        };
      }
      throw err;
    }
  }

  private buildVerificationPrompt(
    jobDescription: string,
    jobFiles: string[],
    submissionText: string,
    submissionFiles: string[]
  ): string {
    return `You are an AI verification agent for a job marketplace platform. Your task is to verify if a submission meets the job requirements.

## Job Requirements
${jobDescription}

${jobFiles.length > 0 ? `## Job Attachments\n${jobFiles.join('\n')}` : ''}

## Submission
${submissionText}

${submissionFiles.length > 0 ? `## Submission Files\n${submissionFiles.join('\n')}` : ''}

## Verification Instructions
1. Compare the submission against the job requirements
2. Check if the submission genuinely attempts to complete the job
3. Look for signs of cheating (copy-paste nonsense, irrelevant content, malicious content)

## Response Format
Respond ONLY in this JSON format:
{
  "approved": true/false,
  "cheated": true/false,
  "feedback": "2-3 sentences explaining your decision"
}

Rules:
- "approved": true if submission meets requirements satisfactorily
- "cheated": true ONLY if submission shows clear malicious intent, is completely irrelevant, or contains harmful content
- "feedback": concise explanation for the decision

Respond with JSON only, no additional text.`;
  }

  private parseVerificationResponse(text: string): VerificationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          approved: false,
          cheated: false,
          feedback: 'Unable to parse verification response.',
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        approved: Boolean(parsed.approved),
        cheated: Boolean(parsed.cheated),
        feedback: String(parsed.feedback || 'No feedback provided.'),
      };
    } catch {
      return {
        approved: false,
        cheated: false,
        feedback: 'Verification response parsing failed.',
      };
    }
  }
}

export const verificationService = new VerificationService();
