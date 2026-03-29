import { Type } from '@google/genai';

export type Phase3ModeratorSchemaParams = {
  stemSubItemStemGradeRequired: boolean;
  phase3ForceViz: boolean;
  stemSchemaIncludesCompounds: boolean;
  visualizationCodeDescription: string;
};

/**
 * Phase3 主席綜評／標準詳解共用 JSON Schema（stem_sub_results + 可選 compounds）。
 * 數學（無 compounds）與化學／物理等（含 compounds）共用同一套子題欄位定義。
 */
export function buildPhase3ModeratorResponseSchema(params: Phase3ModeratorSchemaParams) {
  const {
    stemSubItemStemGradeRequired,
    phase3ForceViz,
    stemSchemaIncludesCompounds,
    visualizationCodeDescription,
  } = params;

  const stemSubItemShape =
    stemSubItemStemGradeRequired || phase3ForceViz
      ? {
          required: [
            ...(stemSubItemStemGradeRequired
              ? ([
                  'sub_id',
                  'setup',
                  'process',
                  'result',
                  'logic',
                  'max_points',
                  'feedback',
                ] as const)
              : []),
            ...(phase3ForceViz ? (['visualization_code'] as const) : []),
          ],
        }
      : {};

  return {
    type: Type.OBJECT,
    properties: {
      final_score: { type: Type.NUMBER },
      max_score: { type: Type.NUMBER },
      remarks_zh: { type: Type.STRING },
      growth_roadmap: { type: Type.ARRAY, items: { type: Type.STRING } },
      detailed_fixes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            original: { type: Type.STRING },
            corrected: { type: Type.STRING },
            refined: { type: Type.STRING },
            logic: { type: Type.STRING },
          },
        },
      },
      stem_sub_results: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          ...stemSubItemShape,
          properties: {
            sub_id: { type: Type.STRING },
            sub_stem_discipline: {
              type: Type.STRING,
              nullable: true,
              description:
                '學測自然科專用：本子題學門 physics|chemistry|biology|earth|integrated',
            },
            key_molecules_smiles: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '該小題重要分子之 SMILES；無則 []',
            },
            setup: { type: Type.NUMBER },
            process: { type: Type.NUMBER },
            result: { type: Type.NUMBER },
            logic: { type: Type.NUMBER },
            max_points: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            correct_calculation: { type: Type.STRING },
            concept_correction: { type: Type.STRING, nullable: true },
            alternative_solutions: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
            alternative_methods: {
              type: Type.ARRAY,
              nullable: true,
              description:
                '化學等科一題多解結構化：每物件為一獨立解法，含 method_name、description、steps 字串陣列',
              items: {
                type: Type.OBJECT,
                properties: {
                  method_name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
            },
            knowledge_tags: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
            scientific_notation_and_units: { type: Type.STRING, nullable: true },
            internal_verification: { type: Type.STRING, nullable: true },
            zero_compression: {
              type: Type.OBJECT,
              nullable: true,
              description: '五段式零跳步詳解（繁中＋LaTeX 雙跳脫）；無則 null',
              properties: {
                given: { type: Type.STRING },
                formula: { type: Type.STRING },
                substitute: { type: Type.STRING },
                derive: { type: Type.STRING },
                answer: { type: Type.STRING },
              },
            },
            ceec_answer_sheet: {
              type: Type.OBJECT,
              nullable: true,
              description:
                '擬真大考作答區：矩陣勾選表、申論欄、選擇題或虛線列；不適用則 null',
              properties: {
                mode: {
                  type: Type.STRING,
                  description: 'mcq | fill | short | mixed',
                },
                line_count: { type: Type.NUMBER, nullable: true },
                lines_per_response_field: { type: Type.NUMBER, nullable: true },
                response_field_labels: {
                  type: Type.ARRAY,
                  nullable: true,
                  items: { type: Type.STRING },
                },
                answer_grid: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    row_labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                    col_labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                    solution_checks_per_row: {
                      type: Type.ARRAY,
                      nullable: true,
                      items: { type: Type.NUMBER, nullable: true },
                    },
                  },
                },
                mcq: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    mode: {
                      type: Type.STRING,
                      description: 'single | multi',
                    },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correct_indices: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER },
                    },
                  },
                },
              },
            },
            micro_lesson: {
              type: Type.OBJECT,
              nullable: true,
              description:
                'Phase 4 圖像式微課程（教學補充卡）；不適用則 null。欄位依 variant 取捨：oxidation_timeline 需 steps；color_oscillation 需 color_from/color_to（僅 #RRGGBB）；coordination_multiply 需 bidentate_count，teeth_per_ligand 可選預設 2。',
              properties: {
                variant: {
                  type: Type.STRING,
                  description: 'oxidation_timeline | color_oscillation | coordination_multiply',
                },
                title: { type: Type.STRING, nullable: true },
                caption: { type: Type.STRING, nullable: true },
                steps: {
                  type: Type.ARRAY,
                  nullable: true,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      species: { type: Type.STRING, nullable: true },
                      oxidation_state: { type: Type.NUMBER },
                    },
                  },
                },
                arrows: {
                  type: Type.ARRAY,
                  nullable: true,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      from_index: { type: Type.NUMBER },
                      to_index: { type: Type.NUMBER },
                      label: { type: Type.STRING, nullable: true },
                    },
                  },
                },
                color_from: { type: Type.STRING, nullable: true },
                color_to: { type: Type.STRING, nullable: true },
                bidentate_count: { type: Type.NUMBER, nullable: true },
                teeth_per_ligand: { type: Type.NUMBER, nullable: true },
                result_coordination: { type: Type.NUMBER, nullable: true },
              },
            },
            student_input_parsing: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                segments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING },
                      is_error: { type: Type.BOOLEAN },
                      error_reason: { type: Type.STRING, nullable: true },
                      correction: { type: Type.STRING, nullable: true },
                    },
                  },
                },
              },
            },
            visualization_code: {
              type: Type.OBJECT,
              nullable: !phase3ForceViz,
              description: visualizationCodeDescription,
              properties: {
                explanation: { type: Type.STRING },
                visualizations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        description:
                          'scatter | plotly_chart | mol3d | svg_diagram | chem_aromatic_ring（苯環/吡啶+孤對電子）| physics_wave_interference | physics_snell_diagram | stem_xy_chart（x/y 陣列+chart_kind line|scatter）',
                      },
                      x: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                      y: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                      mode: { type: Type.STRING },
                      name: { type: Type.STRING },
                      data: {
                        type: Type.ARRAY,
                        description: 'Plotly traces；欄位依圖表類型取捨',
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            type: { type: Type.STRING, nullable: true },
                            x: {
                              type: Type.ARRAY,
                              nullable: true,
                              items: { type: Type.NUMBER, nullable: true },
                            },
                            y: {
                              type: Type.ARRAY,
                              nullable: true,
                              items: { type: Type.NUMBER, nullable: true },
                            },
                            z: {
                              type: Type.ARRAY,
                              nullable: true,
                              items: { type: Type.NUMBER, nullable: true },
                            },
                            mode: { type: Type.STRING, nullable: true },
                            name: { type: Type.STRING, nullable: true },
                            text: {
                              type: Type.ARRAY,
                              nullable: true,
                              items: { type: Type.STRING, nullable: true },
                            },
                          },
                        },
                      },
                      layout: {
                        type: Type.OBJECT,
                        nullable: true,
                        description: 'Plotly layout；可只填常用鍵',
                        properties: {
                          title: { type: Type.STRING, nullable: true },
                        },
                      },
                      svgCode: { type: Type.STRING },
                      cid: { type: Type.STRING },
                      smiles: { type: Type.STRING, nullable: true, description: 'mol3d 等用 SMILES' },
                      title: { type: Type.STRING, nullable: true, description: '圖表或 3D 標題' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      ...(stemSchemaIncludesCompounds
        ? {
            compounds: {
              type: Type.ARRAY,
              description: '題目中出現的所有化合物，供前端渲染結構式與 3D 模型',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: 'PubChem 可搜尋的化合物名稱（英文或繁體中文）',
                  },
                  formula: { type: Type.STRING, description: '化學式，例如 H2SO4、C6H12O6' },
                  smiles: { type: Type.STRING, nullable: true, description: '標準 SMILES，供結構式與 3D' },
                  english_name: {
                    type: Type.STRING,
                    nullable: true,
                    description: 'IUPAC 或精確英文名，供 PubChem name 查詢',
                  },
                },
                required: ['name'],
              },
            },
          }
        : {}),
    },
  };
}
