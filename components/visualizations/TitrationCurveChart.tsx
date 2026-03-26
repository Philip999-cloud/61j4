import React from 'react';
import { StemXYChart } from './StemXYChart';

/** 滴定曲線：預設軸標籤，底層沿用 StemXYChart（Plotly） */
export const TitrationCurveChart: React.FC<{
  x: number[];
  y: number[];
  xAxisTitle?: string;
  yAxisTitle?: string;
  title?: string;
}> = ({
  x,
  y,
  xAxisTitle = '滴定體積 (mL)',
  yAxisTitle = 'pH',
  title = '滴定曲線',
}) => (
  <StemXYChart
    chartKind="line"
    x={x}
    y={y}
    xAxisTitle={xAxisTitle}
    yAxisTitle={yAxisTitle}
    title={title}
  />
);
