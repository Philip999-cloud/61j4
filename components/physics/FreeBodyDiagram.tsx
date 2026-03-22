import React, { useRef, useEffect } from 'react';

export interface ForceVector {
  name: string;
  magnitude: number;
  angle: number; // 角度（0 = 右, 90 = 上, 180 = 左, 270 = 下）
}

interface FreeBodyDiagramProps {
  forces: ForceVector[];
  objectShape?: 'box' | 'circle' | 'dot';
}

export const FreeBodyDiagram: React.FC<FreeBodyDiagramProps> = ({ forces, objectShape = 'box' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空背景
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxMagnitude = Math.max(...forces.map(f => f.magnitude), 1);
    const scale = 120 / maxMagnitude; // 畫布長度比例

    // 繪製格線背景 (幫助視覺對準)
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#334155'; // Tailwind slate-700
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
      ctx.moveTo(0, i); ctx.lineTo(canvas.width, i);
    }
    ctx.stroke();

    // 繪製中心物體
    ctx.fillStyle = '#1e293b'; // Tailwind slate-800
    ctx.strokeStyle = '#64748b'; // Tailwind slate-500
    ctx.lineWidth = 3;

    if (objectShape === 'box') {
      ctx.fillRect(centerX - 30, centerY - 30, 60, 60);
      ctx.strokeRect(centerX - 30, centerY - 30, 60, 60);
    } else if (objectShape === 'circle') {
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // 繪製向量箭頭
    forces.forEach(force => {
      // 物理數學角度(0度向右，90度向上)轉為 Canvas 角度(0度向右，90度向下)
      const rad = -(force.angle * Math.PI) / 180;
      const length = force.magnitude * scale;
      const arrowSize = 12;

      const endX = centerX + Math.cos(rad) * length;
      const endY = centerY + Math.sin(rad) * length;

      // 畫線
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#ef4444'; // Tailwind red-500
      ctx.lineWidth = 4;
      ctx.stroke();

      // 畫箭頭頭部
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(rad - Math.PI / 6),
        endY - arrowSize * Math.sin(rad - Math.PI / 6)
      );
      ctx.lineTo(
        endX - arrowSize * Math.cos(rad + Math.PI / 6),
        endY - arrowSize * Math.sin(rad + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // 繪製文字標籤
      ctx.fillStyle = '#f8fafc'; // slate-50
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = force.angle > 0 && force.angle < 180 ? 'bottom' : 'top';
      
      // 文字稍微往外推
      const textX = endX + Math.cos(rad) * 20;
      const textY = endY + Math.sin(rad) * 20;
      ctx.fillText(force.name, textX, textY);
    });
  }, [forces, objectShape]);

  return (
    <div className="flex flex-col items-center p-4 bg-slate-900 rounded-xl border border-slate-700 shadow-xl w-full overflow-x-auto">
      <h4 className="text-slate-300 font-bold mb-4 uppercase tracking-widest text-sm self-start flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500"></span>
        受力分析圖 (Free Body Diagram)
      </h4>
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={400} 
        className="w-full max-w-[400px] h-auto rounded-lg"
      />
    </div>
  );
};
