
import React, { useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, PieChart, Pie, Cell, ZAxis, Label, ComposedChart
} from 'recharts';
import LatexRenderer from './LatexRenderer';

interface SmartChartProps {
  data: {
    type: string;
    chartType?: 'line' | 'bar' | 'area' | 'scatter' | 'pie';
    title?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    data: any[];
    explanation?: string;
    config?: any; // Supports advanced configuration with multiple series
  };
  renderExplanationOnly?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 p-4 rounded-xl shadow-2xl z-50">
        <div className="text-zinc-400 text-[10px] mb-2 font-mono uppercase tracking-widest border-b border-zinc-800 pb-1">
           {label !== undefined && label !== null ? (
               <span className="flex gap-1 items-center">
                  X: <LatexRenderer content={String(label)} isInline={true} />
               </span>
           ) : 'Data Point'}
        </div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="text-xs font-bold flex items-center gap-2 mb-1 last:mb-0" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
            <span className="flex items-center text-zinc-300"><LatexRenderer content={entry.name} isInline={true}/>:</span>
            <span className="flex items-center font-mono"><LatexRenderer content={typeof entry.value === 'number' ? entry.value.toFixed(2) : String(entry.value)} isInline={true}/></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const LatexAxisTick = (props: any) => {
  const { x, y, payload, textAnchor, fill } = props;
  const text = payload.value;
  const strText = String(text);
  
  return (
    <foreignObject x={x - 60} y={y} width="120" height="50" style={{ overflow: 'visible', pointerEvents: 'none' }}>
        <div style={{ 
            fontSize: '10px', 
            color: fill || '#71717a', 
            textAlign: textAnchor === 'end' ? 'right' : (textAnchor === 'middle' ? 'center' : 'left'),
            whiteSpace: 'nowrap', 
            lineHeight: '1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: textAnchor === 'end' ? 'flex-end' : (textAnchor === 'middle' ? 'center' : 'flex-start'),
            justifyContent: 'flex-start',
            marginTop: '8px'
        }}>
           <LatexRenderer content={strText} isInline={true} /> 
        </div>
    </foreignObject>
  );
};

// Robust Data Normalization
const normalizeData = (rawData: any[]) => {
  if (!Array.isArray(rawData)) return [];
  
  return rawData.map(item => {
    // If explicit x key exists, use it. Otherwise guess.
    let xKey = 'x';
    let yKey = 'y';
    
    // Auto-detect keys if standard ones missing
    if (!('x' in item)) {
        xKey = Object.keys(item).find(k => ['label', 'time', 'category', 'year', 'name', 'date'].includes(k.toLowerCase())) || Object.keys(item)[0];
    }
    // Only guess Y if not present, but for advanced charts we rely on config series keys
    if (!('y' in item)) {
        yKey = Object.keys(item).find(k => ['value', 'score', 'count', 'amount', 'energy', 'velocity', 'force', 'probability', 'f(x)'].includes(k.toLowerCase()) && k !== xKey) || Object.keys(item)[1];
    }

    const xVal = item[xKey];
    
    // For simple charts, we map found Y to 'y'. For advanced, we keep original keys.
    let yVal = item[yKey];
    if (typeof yVal === 'string') {
         const match = yVal.match(/^-?[\d\.]+/);
         yVal = match ? parseFloat(match[0]) : 0;
    }
    
    return {
      ...item,
      x: xVal,
      y: yVal, // Legacy support
      [xKey]: xVal,
      [yKey]: yVal
    };
  });
};

export const SmartChart: React.FC<SmartChartProps> = ({ data, renderExplanationOnly }) => {
  useEffect(() => {
    const originalWarn = console.warn;
    const originalError = console.error;

    const filterLog = (args: any[]) => {
        if (args.length > 0 && typeof args[0] === 'string') {
            const msg = args[0];
            if (
                msg.includes('chart should be greater than 0') || 
                msg.includes('defaultProps') ||
                msg.includes('The width(-1) and height(-1)') ||
                msg.includes('width(0) and height(0)')
            ) {
                return true; 
            }
        }
        return false;
    };

    console.warn = (...args) => {
      if (filterLog(args)) return;
      originalWarn.apply(console, args);
    };
    
    console.error = (...args) => {
      if (filterLog(args)) return;
      originalError.apply(console, args);
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  if (renderExplanationOnly) {
      if (!data.explanation) return null;
      return <LatexRenderer content={data.explanation} />;
  }

  if (!data || !data.data || data.data.length === 0) return null;
  
  const { chartType, title, xAxisLabel, yAxisLabel, explanation, config } = data;
  const chartData = normalizeData(data.data);
  const isNumericX = chartData.length > 0 && chartData.every(d => typeof d.x === 'number' && !isNaN(d.x));

  // --- ADVANCED RENDERER (Config Driven) ---
  if (config) {
     return (
        <div className="w-full bg-zinc-950/40 rounded-3xl border border-zinc-800 p-6 shadow-xl flex flex-col hover:border-zinc-700 transition-colors duration-300" style={{ minHeight: '400px' }}>
           <div className="flex justify-between items-center mb-6 shrink-0 border-b border-zinc-800 pb-4">
              <h4 className="text-zinc-200 font-bold text-sm flex items-center gap-3">
                 <span className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></span>
                 <span className="tracking-wide"><LatexRenderer content={config.title || title || 'Graph'} isInline={true} /></span>
              </h4>
           </div>
           
           <div className="w-full flex-grow relative" style={{ height: '300px', width: '100%', minWidth: '0' }}>
               <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#333" strokeOpacity={0.3} />
                     <XAxis 
                        dataKey={config.xAxis?.dataKey || 'x'} 
                        type={config.xAxis?.type || (isNumericX ? 'number' : 'category')}
                        domain={(config.xAxis?.domain || ['auto', 'auto']) as any}
                        tickCount={config.xAxis?.tickCount}
                        stroke="#52525b" 
                        tick={<LatexAxisTick />}
                        tickLine={false}
                        axisLine={{ stroke: '#3f3f46' }}
                        allowDuplicatedCategory={false}
                     >
                        {config.xAxis?.label && <Label value={config.xAxis.label} offset={0} position="insideBottom" style={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} />}
                     </XAxis>
                     <YAxis 
                        type={config.yAxis?.type || 'number'}
                        domain={(config.yAxis?.domain || ['auto', 'auto']) as any}
                        stroke="#52525b" 
                        tick={<LatexAxisTick />}
                        tickLine={false}
                        axisLine={{ stroke: '#3f3f46' }}
                     >
                        {config.yAxis?.label && <Label value={config.yAxis.label} angle={-90} position="insideLeft" style={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} />}
                     </YAxis>
                     <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1, fill: 'rgba(255,255,255,0.02)' }} />
                     {config.legend && <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '15px' }} />}
                     
                     {config.series?.map((s: any, idx: number) => {
                        if (s.type === 'line') return (
                            <Line 
                                key={idx} 
                                type={s.interpolation || 'monotone'} 
                                dataKey={s.dataKey} 
                                stroke={s.color || COLORS[idx % COLORS.length]} 
                                name={s.name} 
                                dot={s.dot === undefined ? false : s.dot} 
                                strokeWidth={s.strokeWidth || 2} 
                                connectNulls={s.connectNulls !== undefined ? s.connectNulls : true} 
                            />
                        );
                        if (s.type === 'area') return (
                            <Area 
                                key={idx} 
                                type={s.interpolation || 'monotone'} 
                                dataKey={s.dataKey} 
                                fill={s.color || COLORS[idx % COLORS.length]} 
                                stroke={s.color || COLORS[idx % COLORS.length]} 
                                name={s.name} 
                                fillOpacity={0.3} 
                            />
                        );
                        if (s.type === 'scatter') return (
                            <Scatter 
                                key={idx} 
                                dataKey={s.dataKey} 
                                fill={s.color || COLORS[idx % COLORS.length]} 
                                name={s.name} 
                            />
                        );
                        return null;
                     })}
                  </ComposedChart>
               </ResponsiveContainer>
           </div>
           
           {explanation && (
             <div className="mt-6 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 shrink-0">
                <div className="text-zinc-400 text-xs leading-relaxed text-center font-medium">
                   <LatexRenderer content={explanation} isInline={true} />
                </div>
             </div>
           )}
        </div>
     );
  }

  // --- LEGACY RENDERER (Original Logic) ---
  const CommonAxis = ({ forceCategory = false }: { forceCategory?: boolean }) => {
    const useCategory = forceCategory || !isNumericX;
    
    return (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} strokeOpacity={0.3} />
        <XAxis 
          dataKey="x" 
          type={useCategory ? "category" : "number"}
          stroke="#52525b" 
          tick={<LatexAxisTick />}
          tickLine={false}
          axisLine={{ stroke: '#3f3f46' }}
          allowDuplicatedCategory={false}
          domain={useCategory ? undefined : (['auto', 'auto'] as any)}
          padding={useCategory ? { left: 10, right: 10 } : undefined}
          interval="preserveStartEnd"
        >
          {xAxisLabel && (
             <Label 
               value={xAxisLabel} 
               offset={0} 
               position="insideBottom" 
               style={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }} 
             />
          )}
        </XAxis>
        <YAxis 
          dataKey="y"
          stroke="#52525b" 
          tick={<LatexAxisTick />}
          tickLine={false}
          axisLine={{ stroke: '#3f3f46' }}
          domain={['auto', 'auto'] as any}
        >
           {yAxisLabel && (
             <Label 
               value={yAxisLabel} 
               angle={-90} 
               position="insideLeft" 
               style={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }} 
             />
          )}
        </YAxis>
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1, fill: 'rgba(255,255,255,0.02)' }} />
        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '15px', textTransform: 'uppercase', fontWeight: 'bold', color: '#71717a' }} iconType="circle" />
      </>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={chartData} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
            <CommonAxis forceCategory={true} />
            <Bar dataKey="y" fill="#3b82f6" name={yAxisLabel || "Value"} radius={[4, 4, 0, 0]} barSize={chartData.length < 5 ? 60 : undefined} animationDuration={1000} />
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart data={chartData} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
            <defs>
              <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CommonAxis />
            <Area type="monotone" dataKey="y" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorY)" name={yAxisLabel || "Value"} animationDuration={1000} />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={90}
              innerRadius={60}
              fill="#8884d8"
              dataKey="y"
              nameKey="x"
              paddingAngle={5}
              animationDuration={1000}
            >
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
          </PieChart>
        );
      case 'scatter':
        return (
          <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
             <CartesianGrid strokeDasharray="3 3" stroke="#333" strokeOpacity={0.3} />
             <XAxis type="number" dataKey="x" name={xAxisLabel} stroke="#52525b" tick={<LatexAxisTick />} domain={['auto', 'auto'] as any}>
                <Label value={xAxisLabel} offset={0} position="insideBottom" style={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} />
             </XAxis>
             <YAxis type="number" dataKey="y" name={yAxisLabel} stroke="#52525b" tick={<LatexAxisTick />} domain={['auto', 'auto'] as any}>
                <Label value={yAxisLabel} angle={-90} position="insideLeft" style={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} />
             </YAxis>
             <ZAxis type="number" range={[50, 400]} />
             <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
             <Legend wrapperStyle={{ fontSize: '10px' }} />
             <Scatter name={title} data={chartData} fill="#3b82f6" line={{ stroke: '#3b82f6', strokeWidth: 2 }} shape="circle" animationDuration={1000} />
          </ScatterChart>
        );
      case 'line':
      default:
        return (
          <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
            <CommonAxis />
            <Line 
              type="monotone" 
              dataKey="y" 
              stroke="#3b82f6" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#18181b', stroke: '#3b82f6', strokeWidth: 2 }} 
              activeDot={{ r: 6, fill: '#60a5fa' }}
              name={yAxisLabel || "Value"} 
              animationDuration={1000}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className="w-full bg-zinc-950/40 rounded-3xl border border-zinc-800 p-6 shadow-xl flex flex-col hover:border-zinc-700 transition-colors duration-300" style={{ minHeight: '400px' }}>
      <div className="flex justify-between items-center mb-6 shrink-0 border-b border-zinc-800 pb-4">
         <h4 className="text-zinc-200 font-bold text-sm flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></span>
            <span className="tracking-wide"><LatexRenderer content={title} isInline={true} /></span>
         </h4>
         {chartType !== 'pie' && <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">{chartType} Visualization</span>}
      </div>
      
      <div className="w-full flex-grow relative" style={{ height: '300px', width: '100%', minWidth: '0' }}>
        {data.data && data.data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
               {renderChart()}
            </ResponsiveContainer>
        ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-xs">No Data to Display</div>
        )}
      </div>

      {explanation && (
        <div className="mt-6 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 shrink-0">
           <div className="text-zinc-400 text-xs leading-relaxed text-center font-medium">
              <LatexRenderer content={explanation} isInline={true} />
           </div>
        </div>
      )}
    </div>
  );
};
