import React from 'react';

export interface PhysiologyLayer {
  component: string;
  process?: string;
  highlight?: boolean;
  direction?: string;
  permeability?: string;
  hormone_control?: string;
  status?: string;
}

export interface PhysiologyMechanismViz {
  category?: string;
  topic: string;
  layers: PhysiologyLayer[];
  visual_style?: string;
  interaction_enabled?: boolean;
}

export const PhysiologyMechanismDiagram: React.FC<{ viz: PhysiologyMechanismViz }> = ({ viz }) => {
  const topic = viz.topic || 'Mechanism';
  const layers = Array.isArray(viz.layers) ? viz.layers : [];

  return (
    <div className="space-y-4">
      <div className="relative border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-500/5 rounded-r-xl">
        <h4 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
          {topic.replace(/_/g, ' ')} Mechanism
        </h4>
        {viz.category && (
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">{viz.category}</p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {layers.map((layer, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border transition-colors ${
              layer.highlight
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-[var(--border-color)] bg-[var(--bg-main)]'
            }`}
          >
            <div className="flex justify-between items-center mb-2 gap-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {layer.component.replace(/_/g, ' ')}
              </span>
              {layer.process && (
                <span className="text-[10px] bg-[var(--bg-card)] px-2 py-0.5 rounded text-[var(--text-secondary)] shrink-0">
                  {layer.process}
                </span>
              )}
            </div>
            {layer.direction && (
              <p className="text-[10px] text-[var(--text-secondary)] mb-1">Direction: {layer.direction}</p>
            )}
            {layer.permeability && (
              <p className="text-[10px] text-blue-500 dark:text-blue-400">Permeability: {layer.permeability}</p>
            )}
            {layer.hormone_control && (
              <p className="text-[10px] text-pink-500 dark:text-pink-400">
                Controlled by: {layer.hormone_control}
              </p>
            )}
            {layer.status && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Status: {layer.status}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
