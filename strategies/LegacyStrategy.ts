
import { GradingStrategy } from './GradingStrategy';
import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

export class LegacyStrategy implements GradingStrategy {
  generatePrompt(content: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): string {
    return `
    Role: Chief Moderator (Phase 3 - Synthesis)
    Subject: Essay / Language / General
    User Preferences: ${instructions || 'Standard Grading'}

    Inputs:
    1. Content: ${content}
    2. Phase 1 Audit: ${JSON.stringify(audit)}
    3. Phase 2 Expert Analysis: ${JSON.stringify(expert)}

    Task: Synthesize a final score and detailed feedback.
    
    Since this is a Language/Humanities subject (e.g., English Composition):
    - Provide "ceec_results" object: { total_score, breakdown: { content, organization, grammar, vocabulary } }.
    - Do NOT provide "stem_sub_results".
    
    Requirements:
    - "final_score" (number)
    - "max_score" (default 20 for single question, 100 for full paper)
    - "strengths" (string array)
    - "detailed_fixes": Array of { type, original, corrected, refined, logic }.
    - "remarks_zh": Final comment in Traditional Chinese.
    - "growth_roadmap": Array of strings (steps to improve).

    Output JSON (ModeratorSynthesis) ONLY.
    **IMPORTANT: Double escape backslashes. Do NOT use markdown code blocks inside string values.**
    `;
  }
}
