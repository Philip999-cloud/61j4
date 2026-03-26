import React from 'react';
import { CEECFillInBlank } from './CEECFillInBlank';

interface Props {
  lineCount: number;
}

export const CeecHandwritingLines: React.FC<Props> = ({ lineCount }) => {
  return <CEECFillInBlank lineCount={lineCount} />;
};
