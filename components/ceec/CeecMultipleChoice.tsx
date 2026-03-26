import React from 'react';
import type { CeecMcqSpec } from '../../types';
import { CEECRadioGroup } from './CEECRadioGroup';
import { CEECCheckboxGroup } from './CEECCheckboxGroup';

interface Props {
  mcq: CeecMcqSpec;
  /** 批改結果頁預設展示正解與錯誤選項狀態 */
  showSolution?: boolean;
}

export const CeecMultipleChoice: React.FC<Props> = ({ mcq, showSolution = true }) => {
  const { mode, options, correct_indices: correctRaw } = mcq;
  const correctIndices = Array.isArray(correctRaw) ? correctRaw : [];

  if (mode === 'single') {
    return <CEECRadioGroup options={options} correctIndices={correctIndices} showSolution={showSolution} />;
  }
  return <CEECCheckboxGroup options={options} correctIndices={correctIndices} showSolution={showSolution} />;
};
