
export enum PhaseStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type VisualizationType = 'svg' | 'plot' | 'latex' | 'table' | 'interactive' | 'smart-chart' | 'nanobanan_image';

export interface NanoBananVisualizationData {
  prompt: string;
  imageUrl?: string;
  status?: 'pending' | 'completed' | 'failed';
  altText?: string;
}

export interface Subject {
  id: string;
  name: string;
  category: 'GSAT' | 'AST';
}

export interface LinguisticAudit {
  technical_proficiency_score: number;
  grammatical_observations: string[];
  word_count: number;
  basic_syntax_check: string;
}

export interface SubjectExpertAnalysis {
  qualitative_merit_score: number;
  reasoning_critique: string;
  critical_thinking_level: string;
}

export type MathStepType = 'definition' | 'process' | 'result';

export interface MathStep {
  label: string;
  type: MathStepType;
  maxPoints: number;
  pointsAchieved: number;
  isAchieved: boolean;
  feedback?: string;
}

export interface ParsedMathSegment {
  text: string;
  is_error: boolean;
  error_reason?: string;
  correction?: string;
}

/** 結構化一題多解（與 JSON Schema alternative_methods 對齊） */
export interface AlternativeMethod {
  method_name: string;
  description: string;
  steps: string[];
}

/** 零跳步詳解：已知 → 公式 → 代入 → 推導 → 解答（與 API zero_compression 對齊） */
export interface ZeroCompressionSteps {
  given: string;
  formula: string;
  substitute: string;
  derive: string;
  answer: string;
}

/** 大考擬真作答區：選擇題規格（API 欄位 snake_case） */
export interface CeecMcqSpec {
  mode: 'single' | 'multi';
  options: string[];
  correct_indices: number[];
}

/** 作圖題：底圖 URL 與 AI 產生之 SVG 疊加（選填） */
export interface CeecDrawingOverlaySpec {
  base_image_url?: string;
  overlay_svg?: string;
}

/** 學測式列×欄勾選表（題本矩陣完整重現；正解以欄 index 標示） */
export interface CeecAnswerGridSpec {
  row_labels: string[];
  col_labels: string[];
  /** 每列標準答案所勾欄位（0-based）；null 該列不示範勾選 */
  solution_checks_per_row?: (number | null)[];
}

/** 擬真 CEEC 作答紙區塊（可選；化學策略可不回傳） */
export interface CeecAnswerSheetSpec {
  mode: 'mcq' | 'fill' | 'short' | 'mixed';
  mcq?: CeecMcqSpec;
  /** 學測自然科等多為矩陣勾選：優先於單純 options 列表呈現 */
  answer_grid?: CeecAnswerGridSpec;
  /** 申論／混合題：題本印製之作答欄位標題（由上而下） */
  response_field_labels?: string[];
  /** 各申論欄位下擬真虛線列數（預設 3） */
  lines_per_response_field?: number;
  /** 填空／簡答虛線列數 */
  line_count?: number;
  /** 作圖題預覽（選填） */
  drawing?: CeecDrawingOverlaySpec | null;
  /** 填空列提示（與 line_count 對齊時顯示） */
  line_placeholders?: string[];
}

/** Phase 3：visualization_code 專用型別（與模型 JSON 欄位對齊，允許 snake_case） */
export type Phase3StemXYChartKind = 'line' | 'scatter';

export interface Phase3ChemAromaticPayload {
  ring: 'benzene' | 'pyridine';
  lone_pair_on_vertices?: number[];
}

export interface Phase3WaveInterferencePayload {
  phase_offset_rad?: number;
  amplitude?: number;
  label?: string;
}

export interface Phase3SnellPayload {
  n1?: number;
  n2?: number;
  incident_deg?: number;
  refracted_deg?: number;
}

export interface Phase3StemXYChartPayload {
  chart_kind: Phase3StemXYChartKind;
  x: number[];
  y: number[];
  x_axis_title?: string;
  y_axis_title?: string;
}

/** Phase 2：一般受力向量（free_body_diagram，非斜面專用） */
export interface Phase2FreeBodyForcesPayload {
  forces: { name: string; magnitude: number; angle: number }[];
  objectShape?: 'box' | 'circle' | 'dot';
}

export type Phase2CircuitElementKind = 'battery' | 'resistor' | 'ammeter';

export interface Phase2CircuitSchematicPayload {
  elements: Array<{ kind: Phase2CircuitElementKind; label?: string; value?: string }>;
}

/** SMILES 2D + 孤對電子提示（獨立於內文 SmilesRenderer） */
export interface Phase2ChemSmiles2DPayload {
  smiles: string;
  lone_pair_atom_indices?: number[];
  lone_pair_markers?: Array<{ x: number; y: number; count?: 1 | 2 }>;
}

export interface Phase2PunnettPayload {
  parent1_gametes: string[];
  parent2_gametes: string[];
}

export interface Phase2PedigreePayload {
  nodes: Array<{ id: string; gender?: 'male' | 'female' | 'unknown'; affected?: boolean }>;
  edges: Array<{ from: string; to: string }>;
}

export interface Phase2MermaidPayload {
  definition: string;
}

export type Phase2MoonPhase =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export interface Phase2EarthCelestialPayload {
  moon_phase?: Phase2MoonPhase;
  caption?: string;
}

export interface Phase2EarthContourPayload {
  isolines: Array<{ points: [number, number][]; value?: number }>;
  x_range?: [number, number];
  y_range?: [number, number];
}

/** 原子／電子能階示意（化學／物理） */
export interface Phase2EnergyLevelPayload {
  levels: Array<{ label: string; energy?: number }>;
  transitions?: Array<{ from_index: number; to_index: number; label?: string }>;
  /** 若為 true（預設）且有 energy，則由高到低排列 */
  sort_by_energy?: boolean;
}

/** 週期表重點標示（地科／跨科元素題） */
export interface Phase2PeriodicHighlightPayload {
  highlight_symbols: string[];
  title?: string;
}

/** Phase 4：圖像式微課程（stem_sub_results[].micro_lesson） */
export type MicroLessonVariant = 'oxidation_timeline' | 'color_oscillation' | 'coordination_multiply';

export interface MicroLessonStep {
  label: string;
  species?: string;
  oxidation_state: number;
}

export interface MicroLessonArrow {
  from_index: number;
  to_index: number;
  label?: string;
}

export type MicroLessonSpec =
  | {
      variant: 'oxidation_timeline';
      title?: string;
      caption?: string;
      steps: MicroLessonStep[];
      arrows?: MicroLessonArrow[];
    }
  | {
      variant: 'color_oscillation';
      title?: string;
      caption?: string;
      color_from: string;
      color_to: string;
    }
  | {
      variant: 'coordination_multiply';
      title?: string;
      caption?: string;
      bidentate_count: number;
      teeth_per_ligand?: number;
      result_coordination?: number;
    };

/** 學測自然科：每個子題對應之學門（供 UI 提示；英語或繁中關鍵字皆可） */
export type StemSubStemDisciplineHint = 'physics' | 'chemistry' | 'biology' | 'earth' | 'integrated';

export interface StemSubScore {
  sub_id: string;
  /** 僅自然科／跨科：本子題歸屬學門（例 physics、earth 或「物理」「地科」） */
  sub_stem_discipline?: StemSubStemDisciplineHint | string;
  key_molecules_smiles?: string[]; // 新增：該題重要分子的SMILES
  setup: number;
  process: number;
  result: number;
  logic: number;
  max_points: number;
  feedback: string;
  // Optional: Populated by the strategy layer
  steps?: MathStep[];
  // New fields for Stem Subjects
  concept_correction?: string;     // 觀念辯正
  alternative_solutions?: string | string[];  // 一題多解（文字或字串陣列，相容舊版）
  /** 結構化多解法（數理優先） */
  alternative_methods?: AlternativeMethod[];
  knowledge_tags?: string[];       // 知識點標註
  // NEW: For Error Highlighting & Correction
  correct_calculation?: string;    // 正確算式建議
  annotations?: TextAnnotation[];  // Legacy: 錯誤圈選 (Substring match)
  student_input_parsing?: {        // New: Segment-based parsing
    segments: ParsedMathSegment[];
  };
  visualization_code?: any;        // UPDATED: Can be string or JSON Object
  // NEW: For Science Subjects
  scientific_notation_and_units?: string;
  internal_verification?: string;
  /** 五段式結構化詳解（非化學策略優先填寫；化學科可省略） */
  zero_compression?: ZeroCompressionSteps;
  /** Phase 2：擬真大考作答區（選擇題／虛線作答列） */
  ceec_answer_sheet?: CeecAnswerSheetSpec | null;
  /** Phase 4：圖像式微課程；不適用則省略或 null */
  micro_lesson?: MicroLessonSpec | null;
}

export interface VocabularyUpgrade {
  original: string;
  advanced: string;
  level: string; // e.g., "A2 -> C1"
  example: string;
}

export interface StructureCheck {
  introduction: string;
  thesis_statement: string;
  body_paragraphs: string;
  conclusion: string;
  logical_flow: string;
}

export interface MasterpieceAlignment {
  publication: string; // e.g., "The Economist" or "New York Times", or Author Name for Chinese
  quote: string; // The rewritten sentence or example
  analysis: string; // Why this is better
}

export interface Compound {
  name: string;
  formula?: string;
  /** 標準 SMILES，供 PubChem／3D 查詢（優先於純中文名） */
  smiles?: string;
  /** 精確英文學名或 IUPAC，供 PubChem name API */
  english_name?: string;
}

export interface ModeratorSynthesis {
  final_score: number;
  max_score: number;
  ceec_results: {
    total_score: number;
    breakdown: Record<string, number>;
  };
  stem_sub_results?: StemSubScore[];
  corrected_article?: string;
  vocabulary_upgrades?: VocabularyUpgrade[];
  topic_relevance_analysis?: string;
  structure_check?: StructureCheck;
  masterpiece_alignment?: MasterpieceAlignment; // Added for English Composition
  micro_practice?: string[]; // Added for English Composition
  strengths: string[];
  detailed_fixes: DetailedFix[];
  remarks_zh: string;
  growth_roadmap: string[];
  compounds?: Compound[];
}

export interface PolishedSentence {
  type: string;
  original: string;
  refined: string;
  logic: string;
}

export interface ParagraphDiagnosis {
  paragraph_id: string; // e.g. "第一段"
  main_idea: string;    // 段落大意
  critique: string;     // 優缺點評析
  suggestion: string;   // 修改建議
}

export interface TextAnnotation {
  text: string;       // The exact segment from the student text
  type: string;       // e.g., "解析", "優點", "建議", "計算錯誤"
  explanation: string; // The content of the tooltip
}

export interface ImprovementSuggestion {
  title: string;      // e.g., "加強細節描寫"
  content: string;    // e.g., "具體描寫..."
}

export interface RevisionModule {
  content: string;
  structure: string;
  polished_sentences: PolishedSentence[];
  ideology: string;
  topic_relevance?: string;
  structure_matrix?: StructureCheck;
  paragraph_diagnostics?: ParagraphDiagnosis[];
  annotations?: TextAnnotation[];         // For interactive highlighting
  optimized_rewrite?: string;             // For the high-level rewrite example
  overall_suggestions?: ImprovementSuggestion[]; // For the 3 summary cards
  masterpiece_alignment?: MasterpieceAlignment; // For Chinese Masterpiece comparison
}

export interface SubQuestionResult {
  sub_id: string;
  score: number;
  max_points: number;
  feedback: string;
  revision_suite: RevisionModule;
  student_response?: string; // Carries the original student text for display
  /** 模型閱卷思路（國寫 API 常回傳） */
  grading_rationale?: string;
  /** 配分與得分白話說明 */
  score_breakdown?: string;
}

export interface SectionResult {
  section_title: string;
  total_section_score: number;
  sub_results: SubQuestionResult[];
  originalText?: string;
}

export interface ChineseWritingResults {
  sections: SectionResult[];
  overall_remarks: string;
  timestamp: number;
  id: string;
  isSolutionOnly?: boolean; // New flag
}

export interface GradingResults {
  phase1: LinguisticAudit;
  phase2: SubjectExpertAnalysis;
  phase3: ModeratorSynthesis;
  timestamp: number;
  subjectName: string;
  id: string;
  originalContent?: string; // Added to store the original input text for highlighting
  isSolutionOnly?: boolean; // New flag to indicate "Solution Generation Mode"
}

export type ActivityType = 'grading' | 'theme' | 'subject' | 'settings';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: number;
  data?: any;
}

export interface DetailedFix {
  type: string;
  original: string;
  corrected: string;
  refined: string;
  logic: string;
}

export interface ChineseTaskContent {
  question: string;
  reference: string;
  student: string;
}

// 統一管理每個小題的狀態
export interface QuestionSet {
  q: string[];       // 題目圖片
  r: string[];       // 詳解圖片
  s: string[];       // 學生作答圖片
  text: string;      // 學生作答文字
  mode: 'image' | 'text';
}
