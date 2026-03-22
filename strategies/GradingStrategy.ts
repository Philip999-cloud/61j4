import { LinguisticAudit, SubjectExpertAnalysis } from '../types';

export interface GradingStrategy {
  /**
   * Generates the specific System Prompt and Task Prompt for the Phase 3 Moderator.
   * This allows each subject to define its own scoring criteria, key scoring elements (KSEs),
   * and JSON output mapping instructions.
   */
  generatePrompt?(
    content: string, 
    audit: LinguisticAudit, 
    expert: SubjectExpertAnalysis, 
    instructions: string
  ): string;

  getSystemPrompt?(): string;
  parseResponse?(response: string): any;
}