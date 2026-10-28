import React from 'react';
import { Play, Pause, Square, Radio, FastForward } from 'lucide-react';

interface CommandBarProps {
  isConnected: boolean;
  isRunning: boolean;
  currentIndex: number;
  totalPoints: number;
  estimatedRemainingSec: number;
  onContactTest: () => void;
  onStartPause: () => void;
  onStop: () => void;
  onStep: () => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  isConnected,
  isRunning,
  currentIndex,
  totalPoints,
  estimatedRemainingSec,
  onContactTest,
  onStartPause,
  onStop,
  onStep,
}) => {
  const percent = totalPoints > 0 ? (currentIndex / totalPoints) * 100 : 0;
  const isFinished = currentIndex >= totalPoints && totalPoints > 0;

  const formatRemainingTime = (sec: number) => {
    if (sec <= 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="bg-[#0a1017] border border-[#1b2838] rounded-xl p-2.5 sm:p-3 shadow-md flex flex-col xl:flex-row xl:items-center justify-between gap-3">
      {/* Primary Instrument Membrane Buttons */}
      <div className="flex items-center gap-2 sm:gap-2.5 w-full xl:w-auto flex-wrap sm:flex-nowrap">
        {/* F1 Contact Test Key */}
        <button
          onClick={onContactTest}
          disabled={!isConnected || isRunning}
          title="Prueba de resistencia de contacto de todos los electrodos (F1)"
          className="h-10 sm:h-10.5 px-3 sm:px-3.5 rounded-lg border border-[#22354a] bg-[#101b27] hover:bg-[#162536] active:bg-[#1d3148] hover:border-[#38c8f5] text-[#dbe5f0] font-medium text-[12px] sm:text-[12.5px] flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs active:scale-[0.98]"
        >
          <Radio className="w-4 h-4 text-[#38c8f5] shrink-0" />
          <span>F1 Contacto</span>
        </button>

        {/* Start / Pause Main Action Key - HERO BUTTON (ALWAYS VISIBLE & PROMINENT) */}
        <button
          onClick={onStartPause}
          disabled={!isConnected}
          title={isRunning ? 'Pausar ciclo de medición' : 'Iniciar secuencia de medidas (MEA)'}
          className={`flex-1 sm:flex-initial h-10 sm:h-10.5 px-4 sm:px-6 rounded-lg font-bold text-[13px] sm:text-[13.5px] flex items-center justify-center gap-2 shrink-0 whitespace-nowrap min-w-[130px] sm:min-w-[150px] transition-all disabled:opacity-35 disabled:cursor-not-allowed shadow-md cursor-pointer active:scale-[0.98] ${
            isRunning
              ? 'bg-[#b45309] hover:bg-[#d97706] border border-[#f59e0b] text-white shadow-[0_0_16px_rgba(245,158,11,0.4)]'
              : 'bg-[#059669] hover:bg-[#10b981] border border-[#34d399] text-white shadow-[0_0_16px_rgba(16,185,129,0.35)]'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4.5 h-4.5 fill-current shrink-0" />
              <span>Pausar MEA</span>
            </>
          ) : (
            <>
              <Play className="w-4.5 h-4.5 fill-current shrink-0" />
              <span>{currentIndex > 0 && !isFinished ? 'Reanudar MEA' : 'MEA Iniciar'}</span>
            </>
          )}
        </button>

        {/* Stop Key */}
        <button
          onClick={onStop}
          disabled={!isConnected || currentIndex === 0}
          title="Detener survey y cerrar archivo activo"
          className="h-10 sm:h-10.5 px-3 sm:px-4 rounded-lg font-medium text-[12px] sm:text-[12.5px] bg-[#4a181e] hover:bg-[#601f27] active:bg-[#722733] border border-[#8f2d38] text-[#ffebee] flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs active:scale-[0.98]"
        >
          <Square className="w-3.5 h-3.5 fill-current shrink-0" />
          <span>Detener</span>
        </button>

        {/* Manual Step Key */}
        <button
          onClick={onStep}
          disabled={!isConnected || isRunning}
          title="Dispara 1 grupo de 8 canales en el backend"
          className="hidden sm:flex h-10 sm:h-10.5 px-3 rounded-lg border border-[#22354a] bg-[#101b27] hover:bg-[#162536] hover:border-[#38c8f5] text-[#8497ad] hover:text-[#dbe5f0] text-[12px] font-mono-numbers items-center gap-1.5 shrink-0 whitespace-nowrap disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
        >
          <FastForward className="w-3.5 h-3.5 text-[#38c8f5] shrink-0" />
          <span>+8 Step</span>
        </button>
      </div>

      {/* Real-time Survey Progress Track */}
      <div className="w-full xl:w-auto xl:min-w-[340px] xl:max-w-[460px] flex-1 flex flex-col justify-center bg-[#060b11] border border-[#141f2d] rounded-lg p-2 sm:px-3 sm:py-2">
        <div className="flex items-center justify-between text-[11px] font-mono-numbers text-[#8497ad] mb-1.5 gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[#dbe5f0] font-medium">Progreso:</span>
            <span className="text-[#38c8f5] font-semibold text-[12px]">{percent.toFixed(1)}%</span>
            {isRunning && (
              <span className="inline-block w-2 h-2 rounded-full bg-[#34d399] animate-pulse ml-0.5" />
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-right truncate">
            <span className="truncate">
              Punto <b className="text-[#dbe5f0]">{currentIndex}</b> / {totalPoints}
            </span>
            {isRunning && totalPoints > currentIndex && (
              <span className="text-[#38c8f5] hidden xs:inline shrink-0">
                · ~{formatRemainingTime(estimatedRemainingSec)}
              </span>
            )}
          </div>
        </div>

        <div className="h-2.5 bg-[#030609] border border-[#182637] rounded-sm overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#0e5c3e] via-[#1d976c] to-[#38c8f5] transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
