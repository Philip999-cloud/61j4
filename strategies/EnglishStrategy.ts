
import { GradingStrategy } from './GradingStrategy';
import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

export class EnglishStrategy implements GradingStrategy {
  generatePrompt(content: string, audit: LinguisticAudit, expert: SubjectExpertAnalysis, instructions: string): string {
    return `
    Role: Senior English Composition Grader for GSAT/AST.
    Subject: English Writing (英文作文)
    User Preferences: ${instructions || 'Standard Grading'}

    # Grading Criteria (CEEC Standards - Total 20 pts)
    1. **Content (5 pts)**: Relevance to prompt, development of ideas, clarity.
    2. **Organization (5 pts)**: Coherence, cohesion, paragraphing, logical flow.
    3. **Grammar (5 pts)**: Sentence structure, tense consistency, agreement, variety.
    4. **Vocabulary (5 pts)**: Word choice, spelling, collocations, idiomatic usage.

    # Task
    1. Analyze the student's essay deeply.
    2. Score it rigorously out of 20 based on the breakdown above.
    3. **CRITICAL: Generate a "corrected_article"**.
       - Rewrite the student's full essay to fix ALL grammar, spelling, punctuation, and awkward phrasing errors.
       - **Highlighting**: You MUST wrap ANY word, phrase, or punctuation mark that you changed, added, or corrected in double asterisks (e.g., **went** instead of go, or **an** interesting).
       - Maintain the student's original voice but make it sound natural and native-like.
    
    4. **VOCABULARY UPGRADE (Major Feature)**:
       - Identify **at least 10** simple, repetitive, or basic words/phrases in the student's essay (e.g., "good", "bad", "think", "happy", "important", "say", "very", "problem", "idea").
       - If the essay is short, select even slightly basic words to ensure you reach the **minimum of 10 items**.
       - Provide an advanced, academic, or more precise alternative (**C1/C2 level**) that fits the SPECIFIC CONTEXT.
       - Show the CEFR level progression (e.g., "A1 -> C1" or "B1 -> C2").
       - Provide a short example fragment using the new word in the essay's context.

    5. **TOPIC RELEVANCE & STRUCTURE ANALYSIS**:
       - **topic_relevance_analysis**: Concise analysis in Traditional Chinese.
       - **structure_check**: Specific feedback for intro, thesis, body, conclusion, flow (Traditional Chinese).

    6. **MASTERPIECE ALIGNMENT (名家對標)**:
       - Compare the student's topic to a high-quality publication like "The Economist" or "New York Times".
       - Rewrite ONE key sentence or paragraph from the student's essay in the style of that publication.
       - Explain *why* it sounds more professional (e.g., "Uses inversion for emphasis", "Advanced collocation").

    7. **CORRECTION PLAN (Detailed Roadmap - 7+ Items)**:
       - Provide **at least 7** specific, detailed, and actionable improvement steps (in Traditional Chinese).
       - Each step should be rich in detail, explaining *what* to fix, *why* it matters, and *how* to practice it.
       - **Coverage**:
         - Specific grammar patterns to review (e.g., "Review Subjunctive Mood", "Fix Comma Splices").
         - Vocabulary expansion strategies.
         - Sentence variety techniques.
         - Logic and cohesion improvements.
         - Recommended reading materials or methods.
       - Example of detail: "每週練習將 3 個簡單句合併為一個包含關係子句的複句，以增強句型多樣性。" (Instead of just "Practice sentences").

    8. **DETAILED FIXES (Crucial for Interactive Tooltip)**:
       - List specific errors. **IMPORTANT**: The 'original' field MUST match a string found in the student's raw text EXACTLY so the UI can highlight it.

    Inputs:
    1. Content: ${content}
    2. Phase 1 Audit: ${JSON.stringify(audit)}
    3. Phase 2 Expert Analysis: ${JSON.stringify(expert)}

    Output JSON (ModeratorSynthesis) ONLY:
    **IMPORTANT JSON RULES:**
    1. **Double escape backslashes** (e.g., use \\\\n for newline).
    2. **Do NOT use markdown code blocks** (\`\`\`) inside the JSON string values.
    
    {
      "final_score": number,
      "max_score": 20,
      "ceec_results": {
         "total_score": number,
         "breakdown": { "content": number, "organization": number, "grammar": number, "vocabulary": number }
      },
      "corrected_article": "The full revised essay string with **bold markdown** for corrected parts.",
      "vocabulary_upgrades": [
         { 
           "original": "good", 
           "advanced": "exemplary", 
           "level": "A1 -> C2", 
           "example": "His behavior was exemplary..." 
         }
      ],
      "topic_relevance_analysis": "String in Traditional Chinese...",
      "structure_check": {
         "introduction": "...", "thesis_statement": "...", "body_paragraphs": "...", "conclusion": "...", "logical_flow": "..."
      },
      "masterpiece_alignment": {
         "publication": "The Economist / New York Times",
         "quote": "The rewritten sentence in high-level style.",
         "analysis": "Explanation in Traditional Chinese."
      },
      "strengths": ["string"],
      "detailed_fixes": [
         { "type": "Grammar/Vocab", "original": "Exact phrase from student text", "corrected": "Correction", "refined": "Refined version", "logic": "Explanation in Traditional Chinese" }
      ],
      "remarks_zh": "Overall feedback in Traditional Chinese",
      "growth_roadmap": [
         "1. Detailed Step 1...", 
         "2. Detailed Step 2...", 
         "3. Detailed Step 3...", 
         "4. Detailed Step 4...", 
         "5. Detailed Step 5...", 
         "6. Detailed Step 6...", 
         "7. Detailed Step 7..."
      ]
    }
    `;
  }
}
