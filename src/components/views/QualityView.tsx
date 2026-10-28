import React, { useEffect, useRef } from 'react';
import { QuadripolePoint } from '../../utils/ert-math';
import { RefreshCw, BarChart2, ScatterChart, AlertCircle } from 'lucide-react';

interface QualityViewProps {
  points: QuadripolePoint[];
  currentIndex: number;
  errorThreshold: number;
  onRemeasure: () => void;
  isConnected: boolean;
}

export const QualityView: React.FC<QualityViewProps> = ({
  points,
  currentIndex,
  errorThreshold,
  onRemeasure,
  isConnected,
}) => {
  const qhCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const qzCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const measured = points.slice(0, currentIndex);
  const errors = measured.map((q) => q.err);
  const badPoints = measured.filter((q) => q.err > errorThreshold);
  const sortedRho = [...measured.map((q) => q.rho)].sort((a, b) => a - b);
  const avgError = errors.length > 0 ? errors.reduce((a, b) => a + b, 0) / errors.length : 0;
  const medianRho = sortedRho.length > 0 ? sortedRho[Math.floor(sortedRho.length / 2)] : 0;
  const topNoisy = [...measured].sort((a, b) => b.err - a.err).slice(0, 8);

  // Error distribution histogram
  useEffect(() => {
    const canvas = qhCanvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const edges = [0, 1, 2, 3, 5, 10, 60];
    const counts = edges.slice(1).map((edge, i) =>
      errors.filter((v) => v >= edges[i] && v < edge).length
    );
    const maxCount = Math.max(1, ...counts);
    const barWidth = (w - 24) / counts.length;

    ctx.font = '10px "IBM Plex Mono", monospace';

    // Horizontal baseline
    ctx.strokeStyle = '#1b2838';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, h - 24);
    ctx.lineTo(w - 12, h - 24);
    ctx.stroke();

    counts.forEach((count, i) => {
      const barH = (count / maxCount) * (h - 52);
      ctx.fillStyle = edges[i] < errorThreshold ? '#34d399' : '#fbbf24';
      ctx.fillRect(12 + i * barWidth + 4, h - 24 - barH, barWidth - 8, barH);

      ctx.fillStyle = '#6b7e94';
      ctx.textAlign = 'center';
      ctx.fillText(`${edges[i]}–${edges[i + 1]}%`, 12 + i * barWidth + barWidth / 2, h - 10);
      if (count > 0) {
        ctx.fillStyle = '#dbe5f0';
        ctx.fillText(String(count), 12 + i * barWidth + barWidth / 2, h - 28 - barH);
      }
    });

    if (measured.length === 0) {
      ctx.fillStyle = '#6b7e94';
      ctx.font = '12px "IBM Plex Sans"';
      ctx.textAlign = 'center';
      ctx.fillText('Sin puntos medidos aún', w / 2, h / 2);
    }
  }, [measured, errors, errorThreshold]);

  // Error vs rho scatter plot
  useEffect(() => {
    const canvas = qzCanvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Frame
    ctx.strokeStyle = '#1b2838';
    ctx.strokeRect(12, 12, w - 24, h - 34);

    // Threshold line
    const threshY = h - 22 - (Math.min(errorThreshold, 20) / 20) * (h - 40);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(12, threshY);
    ctx.lineTo(w - 12, threshY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#6b7e94';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ρa 10 → 1000 Ω·m (log)', 14, h - 8);
    ctx.fillText(`Umbral ${errorThreshold}%`, 14, threshY - 4);

    measured.forEach((q) => {
      ctx.fillStyle = q.err > errorThreshold ? '#fbbf24' : '#38c8f5';
      const x = 12 + ((Math.log10(Math.max(1, q.rho)) - 1) / 2) * (w - 24);
      const y = h - 22 - (Math.min(q.err, 20) / 20) * (h - 40);
      ctx.fillRect(Math.max(12, Math.min(w - 14, x)), Math.max(14, Math.min(h - 24, y)), 3.5, 3.5);
    });

    if (measured.length === 0) {
      ctx.fillStyle = '#6b7e94';
      ctx.font = '12px "IBM Plex Sans"';
      ctx.textAlign = 'center';
      ctx.fillText('Esperando mediciones de campo…', w / 2, h / 2);
    }
  }, [measured, errorThreshold]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-3.5 items-start pb-20 md:pb-6">
      {/* 1. Visual Charts */}
      <div className="flex flex-col gap-3.5">
        <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
            <BarChart2 className="w-3.5 h-3.5 text-[#38c8f5]" />
            <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
              Histograma de Dispersión del Error (%)
            </h3>
          </div>
          <canvas ref={qhCanvasRef} className="w-full h-[160px] sm:h-[190px] bg-[#060a0f] border border-[#141e2b] rounded-lg" />
        </div>

        <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
            <ScatterChart className="w-3.5 h-3.5 text-[#38c8f5]" />
            <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
              Correlación Error (%) vs Resistividad Aparente ρa
            </h3>
          </div>
          <canvas ref={qzCanvasRef} className="w-full h-[160px] sm:h-[190px] bg-[#060a0f] border border-[#141e2b] rounded-lg" />
        </div>
      </div>

      {/* 2. Quality Summary & Noise Remediation */}
      <div className="flex flex-col gap-3.5">
        <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
          <h3 className="text-[12.5px] font-semibold pb-2 mb-2.5 border-b border-[#141e2b] text-[#dbe5f0]">
            Resumen de Calidad de Datos (QA/QC)
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="bg-[#060a0f] p-2.5 rounded-lg border border-[#141e2b]">
              <span className="block text-[10.5px] text-[#8497ad]">Puntos Adquiridos</span>
              <b className="font-mono-numbers text-[18px] text-[#dbe5f0]">{measured.length}</b>
            </div>
            <div className="bg-[#060a0f] p-2.5 rounded-lg border border-[#141e2b]">
              <span className="block text-[10.5px] text-[#8497ad]">Sobre Tolerancia ({errorThreshold}%)</span>
              <b className={`font-mono-numbers text-[18px] ${badPoints.length > 0 ? 'text-[#fbbf24]' : 'text-[#34d399]'}`}>
                {badPoints.length} ({measured.length > 0 ? ((badPoints.length / measured.length) * 100).toFixed(0) : 0}%)
              </b>
            </div>
            <div className="bg-[#060a0f] p-2.5 rounded-lg border border-[#141e2b]">
              <span className="block text-[10.5px] text-[#8497ad]">Error Promedio</span>
              <b className="font-mono-numbers text-[18px] text-[#dbe5f0]">
                {measured.length > 0 ? `${avgError.toFixed(2)}%` : '—'}
              </b>
            </div>
            <div className="bg-[#060a0f] p-2.5 rounded-lg border border-[#141e2b]">
              <span className="block text-[10.5px] text-[#8497ad]">ρa Mediana</span>
              <b className="font-mono-numbers text-[18px] text-[#38c8f5]">
                {measured.length > 0 ? `${medianRho.toPrecision(4)} Ω·m` : '—'}
              </b>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
            <AlertCircle className="w-4 h-4 text-[#fbbf24]" />
            <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
              Cuadripolos con Mayor Ruido
            </h3>
          </div>

          {topNoisy.length > 0 ? (
            <div className="grid gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {topNoisy.map((q) => {
                const [A, B, M, N] = q.p;
                const bStr = B < 0 ? '∞' : String(B + 1);
                return (
                  <div
                    key={q.index}
                    className="flex justify-between items-center py-1.5 px-2.5 bg-[#060a0f] border border-[#141e2b] rounded-lg text-[12px]"
                  >
                    <span className="font-mono text-[#8497ad]">
                      A{A + 1} B{bStr} M{M + 1} N{N + 1}
                    </span>
                    <b className={`font-mono-numbers ${q.err > errorThreshold ? 'text-[#fbbf24]' : 'text-[#dbe5f0]'}`}>
                      err={q.err.toFixed(1)}% · {q.rho.toPrecision(3)} Ω·m
                    </b>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-[#8497ad] py-2 text-center">Sin mediciones registradas aún.</p>
          )}

          <div className="mt-3 pt-2.5 border-t border-[#141e2b]">
            <button
              onClick={onRemeasure}
              disabled={!isConnected || badPoints.length === 0}
              className="w-full h-9 rounded-lg font-medium text-[12px] bg-[#101b27] hover:bg-[#162536] active:bg-[#162536] border border-[#22354a] hover:border-[#38c8f5] text-[#dbe5f0] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#38c8f5]" />
              <span>Remedir puntos sobre el umbral ({badPoints.length} pendientes)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
