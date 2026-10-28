import React from 'react';
import { ElectrodeArrayType, SequenceConfig } from '../../utils/ert-math';
import { SequenceSummary } from '../../services/api';
import { Sliders, Layers, Zap, Gauge } from 'lucide-react';

interface ConfigViewProps {
  config: SequenceConfig & { jobName: string };
  summary: SequenceSummary | null;
  onChange: (patch: Partial<SequenceConfig & { jobName: string }>) => void;
  onApplyAndBuildMap: () => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  config,
  summary,
  onChange,
  onApplyAndBuildMap,
}) => {
  const arrayOptions: { id: ElectrodeArrayType; label: string; desc: string }[] = [
    { id: 'dd', label: 'Dipolo-Dipolo', desc: 'Resolución lateral (DD)' },
    { id: 'pd', label: 'Polo-Dipolo', desc: 'Mayor profundidad (PD)' },
    { id: 'we', label: 'Wenner', desc: 'Excelente S/R vertical (WE)' },
    { id: 'sc', label: 'Schlumberger', desc: 'Estructuras tabulares (SC)' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start pb-20 md:pb-6">
      {/* 1. Geometría del tendido */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
          <Layers className="w-3.5 h-3.5 text-[#38c8f5]" />
          <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
            Geometría del Tendido
          </h3>
        </div>

        <div className="mb-2.5">
          <label className="block text-[11px] text-[#8497ad] mb-1 font-mono">Nombre de Archivo</label>
          <input
            type="text"
            value={config.jobName}
            onChange={(e) => onChange({ jobName: e.target.value.trim() || 'LINEA01' })}
            className="w-full h-8.5 px-2.5 bg-[#060a0f] text-[#dbe5f0] border border-[#1b2838] focus:border-[#38c8f5] rounded-lg font-mono text-[12px] outline-none"
          />
        </div>

        <div className="mb-2.5">
          <label className="block text-[11px] text-[#8497ad] mb-1.5 font-mono">Arreglo Electródico</label>
          <div className="grid grid-cols-2 gap-1.5">
            {arrayOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onChange({ arrayType: opt.id });
                  onApplyAndBuildMap();
                }}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  config.arrayType === opt.id
                    ? 'bg-[#0f2438] border-[#38c8f5] text-[#38c8f5] shadow-xs'
                    : 'bg-[#060a0f] border-[#162231] text-[#8497ad] hover:border-[#24354a]'
                }`}
              >
                <div className="font-medium text-[11.5px] text-[#dbe5f0]">{opt.label}</div>
                <div className="text-[9.5px] text-[#6b7e94] leading-tight truncate">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <div>
            <label className="block text-[11px] text-[#8497ad] mb-1 font-mono">Nº Electrodos</label>
            <select
              value={config.electrodes}
              onChange={(e) => {
                onChange({ electrodes: Number(e.target.value) });
                onApplyAndBuildMap();
              }}
              className="w-full h-8.5 px-2 bg-[#060a0f] text-[#dbe5f0] border border-[#1b2838] rounded-lg font-mono text-[12px] outline-none"
            >
              <option value={28}>28 electrodos</option>
              <option value={56}>56 electrodos</option>
              <option value={84}>84 electrodos</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[#8497ad] mb-1 font-mono">Espaciado a (m)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={config.spacing}
              onChange={(e) => {
                onChange({ spacing: Math.max(0.5, Number(e.target.value) || 5) });
                onApplyAndBuildMap();
              }}
              className="w-full h-8.5 px-2 bg-[#060a0f] text-[#dbe5f0] border border-[#1b2838] rounded-lg font-mono text-[12px] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[#8497ad] mb-1 font-mono">Separación n máx</label>
          <select
            value={config.nMax}
            onChange={(e) => {
              onChange({ nMax: Number(e.target.value) });
              onApplyAndBuildMap();
            }}
            className="w-full h-8.5 px-2 bg-[#060a0f] text-[#dbe5f0] border border-[#1b2838] rounded-lg font-mono text-[12px] outline-none"
          >
            <option value={4}>n = 4 niveles</option>
            <option value={6}>n = 6 niveles</option>
            <option value={8}>n = 8 niveles</option>
          </select>
        </div>
      </div>

      {/* 2. Transmisión y medida */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
          <Zap className="w-3.5 h-3.5 text-[#fbbf24]" />
          <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
            Transmisión y Medida
          </h3>
        </div>

        <div className="mb-2.5">
          <label className="block text-[11px] text-[#8497ad] mb-1 font-mono">Límite Corriente (mA)</label>
          <input
            type="number"
            min="1"
            max="2000"
            value={config.maxCurrent}
            onChange={(e) => onChange({ maxCurrent: Math.min(2000, Math.max(1, Number(e.target.value))) })}
            className="w-full h-8.5 px-2 bg-[#060a0f] text-[#dbe5f0] border border-[#1b2838] rounded-lg font-mono text-[12px] outline-none"
          />
        </div>

        <div className="mb-2.5">
          <label className="block text-[11px] text-[#8497ad] mb-1 font-mono">Tiempo de Lectura (s)</label>
          <select
            value={config.measureTime}
            onChange={(e) => onChange({ measureTime: Number(e.target.value) })}
            className="w-full h-8.5 px-2 bg-[#060a0f] text-[#dbe5f0] border border-[#1b2838] rounded-lg font-mono text-[12px] outline-none"
          >
            <option value={0.4}>0.4 s (rápido)</option>
            <option value={0.8}>0.8 s</option>
            <option value={1.2}>1.2 s (estándar de campo)</option>
            <option value={3.6}>3.6 s (alta señal/ruido)</option>
            <option value={7.2}>7.2 s (condiciones ruidosas)</option>
          </select>
        </div>

        <div className="pt-2.5 border-t border-[#141e2b]">
          <label className="flex items-center gap-2 cursor-pointer text-[12px] text-[#dbe5f0] font-medium">
            <input
              type="checkbox"
              checked={config.isIP}
              onChange={(e) => onChange({ isIP: e.target.checked })}
              className="accent-[#38c8f5] w-4 h-4 rounded cursor-pointer"
            />
            <span>Polarización Inducida (IP)</span>
          </label>
        </div>

        {config.isIP && (
          <div className="mt-2.5">
            <label className="block text-[11px] text-[#8497ad] mb-1 font-mono">Ciclo IP (s)</label>
            <select
              value={config.ipCycle}
              onChange={(e) => onChange({ ipCycle: Number(e.target.value) })}
              className="w-full h-8.5 px-2 bg-[#060a0f] text-[#dbe5f0] border border-[#1b2838] rounded-lg font-mono text-[12px] outline-none"
            >
              <option value={0.5}>0.5 s</option>
              <option value={1}>1.0 s</option>
              <option value={2}>2.0 s (recomendado)</option>
              <option value={4}>4.0 s</option>
            </select>
          </div>
        )}
      </div>

      {/* 3. Apilado y calidad */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
          <Sliders className="w-3.5 h-3.5 text-[#34d399]" />
          <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
            Apilado y Tolerancia
          </h3>
        </div>

        <div className="mb-2.5">
          <label className="block text-[11px] text-[#8497ad] mb-1 font-mono">Ciclos de Apilado (Stack)</label>
          <input
            type="number"
            min="1"
            max="300"
            value={config.stackCycles}
            onChange={(e) => onChange({ stackCycles: Math.min(300, Math.max(1, Number(e.target.value))) })}
            className="w-full h-8.5 px-2 bg-[#060a0f] text-[#dbe5f0] border border-[#1b2838] rounded-lg font-mono text-[12px] outline-none"
          />
        </div>

        <div className="mb-2.5">
          <label className="block text-[11px] text-[#8497ad] mb-1 font-mono">Umbral de Error Estándar (%)</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="50"
            value={config.errorThreshold}
            onChange={(e) => onChange({ errorThreshold: Math.max(0.1, Number(e.target.value)) })}
            className="w-full h-8.5 px-2 bg-[#060a0f] text-[#dbe5f0] border border-[#1b2838] rounded-lg font-mono text-[12px] outline-none"
          />
        </div>

        <p className="mt-2 text-[11px] text-[#6b7e94] leading-relaxed">
          El equipo detiene el apilado cuando el promedio móvil queda bajo el umbral configurado o se alcanza el número máximo de ciclos.
        </p>
      </div>

      {/* 4. Resumen de la secuencia */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
          <Gauge className="w-3.5 h-3.5 text-[#38c8f5]" />
          <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
            Resumen de Medición
          </h3>
        </div>

        {summary ? (
          <div className="grid gap-2 text-[12px]">
            <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
              <span className="text-[#8497ad]">Puntos de Medida</span>
              <b className="font-mono-numbers text-[#dbe5f0]">{summary.totalPoints}</b>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
              <span className="text-[#8497ad]">Disparos (8CH)</span>
              <b className="font-mono-numbers text-[#dbe5f0]">{summary.groupsOf8}</b>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
              <span className="text-[#8497ad]">Duración Estimada</span>
              <b className="font-mono-numbers text-[#38c8f5]">{summary.estimatedMinutes} min</b>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
              <span className="text-[#8497ad]">Longitud de Línea</span>
              <b className="font-mono-numbers text-[#dbe5f0]">{summary.lineLengthM} m</b>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
              <span className="text-[#8497ad]">Profundidad Teórica</span>
              <b className="font-mono-numbers text-[#dbe5f0]">~{summary.approxDepthM} m</b>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
              <span className="text-[#8497ad]">Memoria Flash Requerida</span>
              <b className="font-mono-numbers text-[#34d399]">{summary.memoryPct}%</b>
            </div>
          </div>
        ) : (
          <div className="text-[12px] text-[#8497ad] py-4 text-center">Calculando secuencia…</div>
        )}
      </div>
    </div>
  );
};
