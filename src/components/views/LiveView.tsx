import React, { useEffect, useRef, useState, useCallback } from 'react';
import { QuadripolePoint } from '../../utils/ert-math';
import { Crosshair, Zap, Activity, Info, Terminal, Copy, Check } from 'lucide-react';

interface LiveViewProps {
  points: QuadripolePoint[];
  currentIndex: number;
  totalPoints: number;
  lastBatch: QuadripolePoint[];
  activeElectrodes: { tx: number[]; rx: number[] };
  electrodesCount: number;
  electrodeSpacing: number;
  maxCurrent: number;
  stackCycles: number;
  errorThreshold: number;
  logs: string[];
}

export const LiveView: React.FC<LiveViewProps> = ({
  points,
  currentIndex,
  totalPoints,
  lastBatch,
  activeElectrodes,
  electrodesCount,
  electrodeSpacing,
  maxCurrent,
  stackCycles,
  errorThreshold,
  logs,
}) => {
  const psCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ipCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoveredPoint, setHoveredPoint] = useState<QuadripolePoint | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);

  const leadPoint = lastBatch.length > 0 ? lastBatch[0] : (points.length > 0 && currentIndex > 0 ? points[currentIndex - 1] : null);

  const geomRef = useRef<{
    px: (v: number) => number;
    py: (v: number) => number;
    cw: number;
    ch: number;
  } | null>(null);

  const totalLength = (electrodesCount - 1) * electrodeSpacing;

  const getResistivityColor = (rho: number) => {
    const minLog = 1; // 10 Ω·m
    const maxLog = 3; // 1000 Ω·m
    const logRho = Math.log10(Math.max(1, rho));
    const ratio = Math.min(1, Math.max(0, (logRho - minLog) / (maxLog - minLog)));
    const hue = 240 * (1 - ratio);
    return `hsl(${hue}, 80%, 50%)`;
  };

  // Redraw pseudosection with high-DPI scaling
  const drawPseudosection = useCallback(() => {
    const canvas = psCanvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const isSmall = width < 480;
    const margin = {
      left: isSmall ? 38 : 56,
      right: isSmall ? 12 : 20,
      top: isSmall ? 14 : 18,
      bottom: isSmall ? 34 : 46,
    };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const measuredPoints = points.slice(0, currentIndex);
    const allZ = points.length > 0 ? points.map((p) => p.z) : [10];
    const zMax = Math.max(10, Math.max(...allZ));

    const px = (v: number) => margin.left + (v / Math.max(1, totalLength)) * plotWidth;
    const py = (v: number) => margin.top + (v / zMax) * plotHeight * 0.88 + plotHeight * 0.06;

    // Canvas Background
    ctx.fillStyle = '#060a0f';
    ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);

    // Distance grid lines & ticks
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#121b27';
    ctx.fillStyle = '#6b7e94';
    ctx.font = isSmall
      ? '9.5px "IBM Plex Mono", monospace'
      : '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';

    const distTicks = isSmall ? 4 : 8;
    for (let i = 0; i <= distTicks; i++) {
      const dist = (totalLength * i) / distTicks;
      const xPos = Math.round(px(dist)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(xPos, margin.top);
      ctx.lineTo(xPos, margin.top + plotHeight);
      ctx.stroke();
      ctx.fillText(`${dist.toFixed(0)}m`, xPos, margin.top + plotHeight + (isSmall ? 14 : 18));
    }

    // Depth grid lines & ticks
    ctx.textAlign = 'right';
    const depthTicks = isSmall ? 3 : 5;
    for (let i = 0; i <= depthTicks; i++) {
      const depth = (zMax * i) / depthTicks;
      const yPos = Math.round(py(depth)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(margin.left, yPos);
      ctx.lineTo(margin.left + plotWidth, yPos);
      ctx.stroke();
      ctx.fillText(`${depth.toFixed(0)}m`, margin.left - (isSmall ? 5 : 8), yPos + 4);
    }

    // Axis titles on larger viewports
    if (!isSmall) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8497ad';
      ctx.fillText('Distancia a lo largo de la línea (m)', margin.left + plotWidth / 2, height - 6);
      ctx.save();
      ctx.translate(14, margin.top + plotHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Pseudoprofundidad aparente (m)', 0, 0);
      ctx.restore();
    }

    const cellWidth = Math.max(2.5, (plotWidth / (electrodesCount - 1)) * 1.05);
    const cellHeight = Math.max(3.5, (plotHeight * 0.88) / 8);
    geomRef.current = { px, py, cw: cellWidth, ch: cellHeight };

    // Measured Data Quadripoles
    measuredPoints.forEach((q) => {
      ctx.fillStyle = getResistivityColor(q.rho);
      ctx.fillRect(
        px(q.x) - cellWidth / 2 + 0.5,
        py(q.z) - cellHeight / 2 + 0.5,
        cellWidth - 0.5,
        cellHeight - 0.5
      );
    });

    // Active shot highlight with high-contrast indicator
    if (currentIndex < points.length && lastBatch.length > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isSmall ? 1.5 : 2;
      lastBatch.forEach((q) => {
        ctx.strokeRect(
          px(q.x) - cellWidth / 2,
          py(q.z) - cellHeight / 2,
          cellWidth,
          cellHeight
        );
      });
    }

    // Hovered point highlight
    if (hoveredPoint) {
      ctx.strokeStyle = '#38c8f5';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        px(hoveredPoint.x) - cellWidth / 2 - 1,
        py(hoveredPoint.z) - cellHeight / 2 - 1,
        cellWidth + 2,
        cellHeight + 2
      );
    }

    // Empty state note
    if (measuredPoints.length === 0) {
      ctx.fillStyle = '#6b7e94';
      ctx.font = isSmall ? '11px "IBM Plex Sans"' : '13px "IBM Plex Sans"';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Sin datos de campo medidos. Enlaza con el equipo y presiona "MEA Iniciar".',
        margin.left + plotWidth / 2,
        margin.top + plotHeight / 2
      );
    }

    // Outer bounding frame
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1f2e42';
    ctx.strokeRect(margin.left + 0.5, margin.top + 0.5, plotWidth - 1, plotHeight - 1);
  }, [points, currentIndex, lastBatch, electrodesCount, totalLength, hoveredPoint]);

  useEffect(() => {
    drawPseudosection();
    const handleResize = () => drawPseudosection();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawPseudosection]);

  // Touch and mouse inspection
  const inspectPoint = (clientX: number, clientY: number) => {
    const geom = geomRef.current;
    const canvas = psCanvasRef.current;
    if (!geom || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const measured = points.slice(0, currentIndex);
    const hit = measured.find(
      (q) =>
        Math.abs(geom.px(q.x) - mx) < Math.max(10, geom.cw) &&
        Math.abs(geom.py(q.z) - my) < Math.max(10, geom.ch)
    );

    setHoveredPoint(hit || null);
  };

  // Crossplot
  useEffect(() => {
    const canvas = cxCanvasRef.current;
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

    // Coordinate grid
    ctx.strokeStyle = '#162231';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, h - 12);
    ctx.lineTo(w - 12, 12);
    ctx.stroke();

    const measured = points.slice(0, currentIndex);
    measured.forEach((q) => {
      ctx.fillStyle = getResistivityColor(q.rho);
      const x = 12 + (q.t / electrodesCount) * (w - 24) - 1.5;
      const y = h - 12 - (q.r / electrodesCount) * (h - 24) - 1.5;
      ctx.fillRect(x, y, 3, 3);
    });

    ctx.fillStyle = '#6b7e94';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText('TX (A,B)', w - 46, h - 4);
    ctx.fillText('RX (M,N)', 4, 12);
  }, [points, currentIndex, electrodesCount]);

  // IP Curve
  useEffect(() => {
    const canvas = ipCanvasRef.current;
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

    ctx.fillStyle = '#6b7e94';
    ctx.font = '10px "IBM Plex Mono", monospace';

    const q = lastBatch[0];
    if (!q || !q.m) {
      ctx.fillText(q ? 'Modo IP apagado' : 'Decaimiento IP (M1..M6)', 8, 14);
      return;
    }

    ctx.fillText('Decaimiento IP (mV/V)', 8, 14);
    ctx.strokeStyle = '#38c8f5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    q.m.forEach((val, j) => {
      const a = 14 + (j / 5) * (w - 28);
      const b = h - 12 - (val / 40) * (h - 34);
      if (j === 0) ctx.moveTo(a, b);
      else ctx.lineTo(a, b);
    });
    ctx.stroke();

    ctx.fillStyle = '#38c8f5';
    q.m.forEach((val, j) => {
      const a = 14 + (j / 5) * (w - 28);
      const b = h - 12 - (val / 40) * (h - 34);
      ctx.fillRect(a - 2.5, b - 2.5, 5, 5);
    });
  }, [lastBatch]);

  const copyLogsToClipboard = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const currentPowerWatts = leadPoint ? (leadPoint.vt * (leadPoint.I / 1000)).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[300px_minmax(0,1fr)_320px] gap-3.5 items-start pb-20 md:pb-6">
      {/* ─── Column 1: Live Telemetry, 200W Transmitter & 8-CH VU Meters ─── */}
      <div className="flex flex-col gap-3.5">
        {/* Live Digital Telemetry Gauges */}
        <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#141e2b]">
            <h3 className="text-[12px] sm:text-[12.5px] font-semibold text-[#dbe5f0] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#38c8f5]" />
              <span>Telemetría en Vivo</span>
            </h3>
            <span className="text-[10px] font-mono text-[#5d7087]">
              {leadPoint ? `PT #${leadPoint.index + 1}` : 'STANDBY'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2">
            {/* Apparent Resistivity */}
            <div className="bg-[#0e1622] border border-[#1b2838] rounded-lg p-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[10.5px] text-[#8497ad] font-mono">ρa</span>
                <span className="text-[10px] text-[#5d7087]">Ω·m</span>
              </div>
              <div className="mt-1 text-[19px] sm:text-[21px] font-mono-numbers font-medium text-[#38c8f5] leading-none">
                {leadPoint ? leadPoint.rho.toPrecision(4) : '---'}
              </div>
            </div>

            {/* Transfer Resistance */}
            <div className="bg-[#0e1622] border border-[#1b2838] rounded-lg p-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[10.5px] text-[#8497ad] font-mono">ΔV / I</span>
                <span className="text-[10px] text-[#5d7087]">Ω</span>
              </div>
              <div className="mt-1 text-[19px] sm:text-[21px] font-mono-numbers font-medium text-[#dbe5f0] leading-none">
                {leadPoint ? leadPoint.R.toPrecision(4) : '---'}
              </div>
            </div>

            {/* Injected Current */}
            <div className="bg-[#0e1622] border border-[#1b2838] rounded-lg p-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[10.5px] text-[#8497ad] font-mono">Corriente I</span>
                <span className="text-[10px] text-[#5d7087]">mA</span>
              </div>
              <div className="mt-1 text-[19px] sm:text-[21px] font-mono-numbers font-medium text-[#34d399] leading-none">
                {leadPoint ? leadPoint.I.toFixed(0) : '---'}
              </div>
            </div>

            {/* Received Potential */}
            <div className="bg-[#0e1622] border border-[#1b2838] rounded-lg p-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[10.5px] text-[#8497ad] font-mono">Tensión ΔV</span>
                <span className="text-[10px] text-[#5d7087]">mV</span>
              </div>
              <div className="mt-1 text-[19px] sm:text-[21px] font-mono-numbers font-medium text-[#dbe5f0] leading-none">
                {leadPoint ? leadPoint.V.toPrecision(3) : '---'}
              </div>
            </div>

            {/* Stack Error */}
            <div className="bg-[#0e1622] border border-[#1b2838] rounded-lg p-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[10.5px] text-[#8497ad] font-mono">Error Estándar</span>
                <span className="text-[10px] text-[#5d7087]">%</span>
              </div>
              <div
                className={`mt-1 text-[19px] sm:text-[21px] font-mono-numbers font-medium leading-none ${
                  leadPoint && leadPoint.err > errorThreshold ? 'text-[#fbbf24]' : 'text-[#dbe5f0]'
                }`}
              >
                {leadPoint ? `${leadPoint.err.toFixed(1)}%` : '---'}
              </div>
            </div>

            {/* Stacking Cycles */}
            <div className="bg-[#0e1622] border border-[#1b2838] rounded-lg p-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[10.5px] text-[#8497ad] font-mono">Apilados</span>
                <span className="text-[10px] text-[#5d7087]">Ciclos</span>
              </div>
              <div className="mt-1 text-[19px] sm:text-[21px] font-mono-numbers font-medium text-[#dbe5f0] leading-none">
                {leadPoint ? leadPoint.cycles : stackCycles}
              </div>
            </div>
          </div>
        </div>

        {/* Responsive sub-grid for TX 200W and 8-Channel Reception on tablet */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3.5">
          {/* Transmitter 200W Output Meter */}
          <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#141e2b]">
              <h3 className="text-[12px] sm:text-[12.5px] font-semibold text-[#dbe5f0] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#fbbf24]" />
                <span>Transmisor TX 200 W</span>
              </h3>
              <span className="text-[11px] font-mono text-[#8497ad]">
                Potencia: <b className="text-[#dbe5f0]">{currentPowerWatts} W</b>
              </span>
            </div>

            <div className="grid gap-2 text-[11px] text-[#8497ad]">
              {/* Current bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span>Corriente de inyección</span>
                  <span className="font-mono-numbers text-[#dbe5f0]">
                    {leadPoint ? `${leadPoint.I.toFixed(0)} mA` : '0 mA'} / {maxCurrent} mA
                  </span>
                </div>
                <div className="h-2 bg-[#060a0f] border border-[#162130] rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0e5c3e] to-[#34d399] transition-all duration-300"
                    style={{
                      width: leadPoint ? `${Math.min(100, (leadPoint.I / maxCurrent) * 100)}%` : '0%',
                    }}
                  />
                </div>
              </div>

              {/* Voltage bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span>Tensión primaria</span>
                  <span className="font-mono-numbers text-[#dbe5f0]">
                    {leadPoint ? `${leadPoint.vt.toFixed(0)} Vp-p` : '0 Vp-p'} / 800 V
                  </span>
                </div>
                <div className="h-2 bg-[#060a0f] border border-[#162130] rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1b435a] to-[#38c8f5] transition-all duration-300"
                    style={{
                      width: leadPoint ? `${Math.min(100, (leadPoint.vt / 800) * 100)}%` : '0%',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 8-Channel Reception Multichannel VU Meters */}
          <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#141e2b]">
              <h3 className="text-[12px] sm:text-[12.5px] font-semibold text-[#dbe5f0]">
                Receptor Multicanal (CH1..CH8)
              </h3>
              <span className="text-[10px] font-mono text-[#5d7087]">24-bit ADC</span>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-1 gap-1.5">
              {[...Array(8)].map((_, idx) => {
                const q = lastBatch[idx];
                const logVal = q ? Math.log10(Math.max(q.V, 0.01)) : 0;
                const widthPct = q ? Math.min(100, Math.max(4, ((logVal + 2) / 5) * 100)) : 0;
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-[30px_1fr_60px] items-center gap-2 text-[11px] text-[#8497ad]"
                  >
                    <span className="font-mono text-[10.5px] font-semibold text-[#6b7e94]">
                      CH{idx + 1}
                    </span>
                    <div className="h-2 bg-[#060a0f] border border-[#162130] rounded-xs overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-[#1b435a] via-[#38c8f5] to-[#7ef0c0] transition-all duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <em className="not-italic font-mono-numbers text-right text-[#dbe5f0] truncate text-[11px]">
                      {q ? `${q.V.toPrecision(3)} mV` : '—'}
                    </em>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Column 2: Pseudosection & Terminal Log ─── */}
      <div className="flex flex-col gap-3.5">
        {/* Real-time Pseudosection Canvas Card */}
        <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#141e2b]">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#38c8f5]" />
              <h3 className="text-[12.5px] sm:text-[13px] font-semibold text-[#dbe5f0]">
                Pseudosección de Resistividad Aparente 2D
              </h3>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#38c8f5] font-mono px-2 py-0.5 rounded bg-[#102436] border border-[#19405c]">
              Tiempo Real
            </span>
          </div>

          <canvas
            ref={psCanvasRef}
            onClick={(e) => inspectPoint(e.clientX, e.clientY)}
            onMouseMove={(e) => inspectPoint(e.clientX, e.clientY)}
            onTouchStart={(e) => {
              if (e.touches[0]) inspectPoint(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) inspectPoint(e.touches[0].clientX, e.touches[0].clientY);
            }}
            className="w-full h-[230px] sm:h-[350px] xl:h-[420px] rounded-lg bg-[#060a0f] cursor-crosshair block touch-none border border-[#141e2b]"
          />

          {/* Precision Color Ramp Scale */}
          <div className="mt-3">
            <div className="h-2.5 rounded-sm bg-gradient-to-r from-[hsl(240,80%,50%)] via-[hsl(120,80%,50%)] to-[hsl(0,80%,50%)] border border-[#1b2838]" />
            <div className="flex justify-between mt-1 text-[10.5px] text-[#8497ad] font-mono-numbers">
              <span>10 Ω·m</span>
              <span>31.6</span>
              <span>100</span>
              <span>316</span>
              <span>1000 Ω·m</span>
            </div>
          </div>

          {/* Interactive Point Inspector HUD */}
          <div className="mt-2.5 p-2 bg-[#060a0f] border border-[#1b2838] rounded-lg text-[11px] sm:text-[11.5px] font-mono">
            {hoveredPoint ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[#dbe5f0]">
                <div>
                  <span className="text-[#5d7087]">Quad: </span>
                  <b className="text-[#38c8f5]">
                    A{hoveredPoint.p[0] + 1} B{hoveredPoint.p[1] < 0 ? '∞' : hoveredPoint.p[1] + 1} M
                    {hoveredPoint.p[2] + 1} N{hoveredPoint.p[3] + 1}
                  </b>
                </div>
                <div>
                  <span className="text-[#5d7087]">ρa: </span>
                  <b className="text-[#34d399]">{hoveredPoint.rho.toPrecision(4)} Ω·m</b>
                </div>
                <div>
                  <span className="text-[#5d7087]">X, Z: </span>
                  <span>{hoveredPoint.x.toFixed(1)}m, {hoveredPoint.z.toFixed(1)}m</span>
                </div>
                <div>
                  <span className="text-[#5d7087]">I, err: </span>
                  <span>{hoveredPoint.I.toFixed(0)}mA, {hoveredPoint.err.toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <div className="text-[#6b7e94] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#38c8f5]" />
                <span>Pasa el cursor o pulsa sobre cualquier punto de la pseudosección para inspeccionar cuadripolo</span>
              </div>
            )}
          </div>
        </div>

        {/* OLED / Instrument Terminal Console */}
        <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#141e2b]">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#38c8f5]" />
              <h3 className="text-[12px] sm:text-[12.5px] font-semibold text-[#dbe5f0]">
                Consola del Instrumento SuperSting
              </h3>
            </div>
            <button
              onClick={copyLogsToClipboard}
              className="text-[10.5px] font-mono text-[#8497ad] hover:text-[#dbe5f0] flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedLog ? <Check className="w-3 h-3 text-[#34d399]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLog ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <pre className="h-[110px] sm:h-[130px] overflow-y-auto whitespace-pre p-2.5 bg-[#060a0f] border border-[#141e2b] rounded-lg text-[#8497ad] font-mono text-[11px] sm:text-[11.5px] leading-relaxed scrollbar-thin">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} className={i === 0 ? 'text-[#7ef0c0] font-medium' : ''}>
                  {log}
                </div>
              ))
            ) : (
              <div className="text-[#5d7087]">Esperando eventos de medición…</div>
            )}
          </pre>
        </div>
      </div>

      {/* ─── Column 3: Crossplot, IP Decay & Cable Array Ribbon ─── */}
      <div className="flex flex-col gap-3.5 lg:col-span-2 xl:col-span-1">
        {/* Crossplot & IP decay curve */}
        <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
          <h3 className="text-[12px] sm:text-[12.5px] font-semibold pb-2 mb-2.5 border-b border-[#141e2b] text-[#dbe5f0]">
            Cruce de Electrodos y Curva IP
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <canvas ref={cxCanvasRef} className="w-full h-[125px] sm:h-[140px] bg-[#060a0f] border border-[#141e2b] rounded-lg" />
            <canvas ref={ipCanvasRef} className="w-full h-[125px] sm:h-[140px] bg-[#060a0f] border border-[#141e2b] rounded-lg" />
          </div>
        </div>

        {/* Cable Array Takeout Ribbon */}
        <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#141e2b]">
            <h3 className="text-[12px] sm:text-[12.5px] font-semibold text-[#dbe5f0]">
              Cinta de Electrodos ({electrodesCount} Pines)
            </h3>
            <span className="text-[10px] text-[#8497ad] font-mono flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-white" />
                TX (A,B)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-[#38c8f5]" />
                RX (M,N)
              </span>
            </span>
          </div>

          <div className="flex gap-0.5 h-5 overflow-hidden rounded bg-[#060a0f] p-1 border border-[#141e2b]">
            {[...Array(electrodesCount)].map((_, i) => {
              const isTx = activeElectrodes.tx.includes(i);
              const isRx = activeElectrodes.rx.includes(i);
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-xs transition-colors duration-150 ${
                    isTx ? 'bg-white shadow-[0_0_6px_#fff]' : isRx ? 'bg-[#38c8f5] shadow-[0_0_6px_#38c8f5]' : 'bg-[#142030]'
                  }`}
                  title={`Electrodo #${i + 1}${isTx ? ' [TX Inyección]' : isRx ? ' [RX Medición]' : ''}`}
                />
              );
            })}
          </div>

          <div className="flex justify-between mt-1 text-[9.5px] text-[#5d7087] font-mono">
            <span>E1 (0.0 m)</span>
            <span>E{Math.round(electrodesCount / 2)}</span>
            <span>E{electrodesCount} ({totalLength.toFixed(0)} m)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
