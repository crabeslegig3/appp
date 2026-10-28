import React, { useState } from 'react';
import { ContactTestSummary } from '../../services/api';
import { Radio, AlertTriangle, CheckCircle2, Filter } from 'lucide-react';

interface ContactViewProps {
  electrodesCount: number;
  contactSummary: ContactTestSummary | null;
  activeElectrodes: { tx: number[]; rx: number[] };
  onRunTest: () => void;
  onSelectElectrode: (electrodeNumber: number, valueKohm?: number) => void;
  isConnected: boolean;
}

export const ContactView: React.FC<ContactViewProps> = ({
  electrodesCount,
  contactSummary,
  activeElectrodes,
  onRunTest,
  onSelectElectrode,
  isConnected,
}) => {
  const values = contactSummary?.values ?? [];
  const [selectedEl, setSelectedEl] = useState<{ number: number; kohm?: number } | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'bad' | 'good'>('all');

  const getElectrodeClass = (index: number) => {
    const val = values[index];
    const isTx = activeElectrodes.tx.includes(index);
    const isRx = activeElectrodes.rx.includes(index);

    let colorCls = 'bg-[#101924] border-[#1c2c3e] text-[#6b7e94]';
    if (val != null) {
      if (val < 2) colorCls = 'bg-[#0b3323] border-[#1b6b4a] text-[#6ee7b7]';
      else if (val < 5) colorCls = 'bg-[#3b320d] border-[#7d6812] text-[#fde047]';
      else if (val < 10) colorCls = 'bg-[#45270d] border-[#9a5416] text-[#fdba74]';
      else colorCls = 'bg-[#4a141b] border-[#a32d3a] text-[#fca5a5] shadow-[0_0_8px_rgba(239,68,68,0.25)]';
    }

    let outlineCls = '';
    if (isTx) outlineCls = 'ring-2 ring-white ring-offset-1 ring-offset-[#070b10] z-10';
    else if (isRx) outlineCls = 'ring-2 ring-[#38c8f5] ring-offset-1 ring-offset-[#070b10] z-10';

    return `${colorCls} ${outlineCls}`;
  };

  const handleElectrodeClick = (num: number, val?: number) => {
    setSelectedEl({ number: num, kohm: val });
    onSelectElectrode(num, val);
  };

  const getActionRecommendation = (kohm?: number) => {
    if (kohm == null) return 'Electrodo no medido todavía. Ejecuta el test de contacto F1.';
    if (kohm < 2) return 'Contacto óptimo. Permite inyección a corriente máxima.';
    if (kohm < 5) return 'Contacto aceptable. Monitorear si llueve o se seca el terreno.';
    if (kohm < 10) return 'Resistencia elevada. Ajustar pinza de toma de cable y apretar contra pica.';
    return 'Contacto crítico (> 10 kΩ). Reclavar pica metálica en terreno húmedo o verter agua salada al 5%.';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3.5 items-start pb-20 md:pb-6">
      {/* 1. SwitchBox Electrode Grid */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 mb-3 border-b border-[#141e2b] gap-2">
          <div>
            <h3 className="text-[12.5px] sm:text-[13px] font-semibold text-[#dbe5f0]">
              Matriz SwitchBox ({electrodesCount} Canales de Terreno)
            </h3>
            <span className="text-[10px] sm:text-[11px] text-[#8497ad]">
              Revisa la impedancia ohmica de cada toma de cable antes de medir
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#060a0f] p-0.5 rounded-lg border border-[#1b2838] text-[11px]">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded ${filterMode === 'all' ? 'bg-[#1b2838] text-[#38c8f5]' : 'text-[#8497ad]'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterMode('bad')}
                className={`px-2 py-0.5 rounded ${filterMode === 'bad' ? 'bg-[#1b2838] text-[#f87171]' : 'text-[#8497ad]'}`}
              >
                &gt;5kΩ
              </button>
            </div>

            <button
              onClick={onRunTest}
              disabled={!isConnected}
              className="h-8 px-3 rounded-lg text-[11.5px] font-medium bg-[#0e5c3e] hover:bg-[#13754f] active:bg-[#13754f] border border-[#1d976c] text-[#e8fff5] disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>F1 Repetir test</span>
            </button>
          </div>
        </div>

        {/* Responsive Grid of Electrodes */}
        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 gap-1.5">
          {[...Array(electrodesCount)].map((_, i) => {
            const val = values[i];
            const isSelected = selectedEl?.number === i + 1;
            const isBad = val != null && val >= 5;
            const isDimmed = filterMode === 'bad' && !isBad;

            return (
              <button
                key={i}
                onClick={() => handleElectrodeClick(i + 1, val)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-mono-numbers border font-medium cursor-pointer transition-all hover:scale-105 active:scale-95 ${getElectrodeClass(
                  i
                )} ${isSelected ? 'ring-2 ring-[#38c8f5] shadow-lg scale-105' : ''} ${
                  isDimmed ? 'opacity-20' : 'opacity-100'
                }`}
                title={`Electrodo #${i + 1}${val != null ? ` · ${val.toFixed(2)} kΩ` : ' (sin medir)'}`}
              >
                <span className="leading-tight">{i + 1}</span>
                {val != null && (
                  <span className="text-[8.5px] leading-none opacity-80 mt-0.5">
                    {val < 10 ? val.toFixed(1) : Math.round(val)}k
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Electrode Diagnostic HUD */}
        {selectedEl && (
          <div className="mt-3.5 p-3 bg-[#060a0f] border border-[#19405c] rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono font-medium text-[12.5px] text-[#dbe5f0]">
                Electrodo E{selectedEl.number}
              </span>
              <span className="font-mono-numbers text-[13px] text-[#38c8f5]">
                {selectedEl.kohm != null ? (
                  <>
                    <b>{selectedEl.kohm.toFixed(2)} kΩ</b>{' '}
                    <span className="text-[11px] text-[#8497ad]">
                      ({selectedEl.kohm < 2 ? 'Excelente' : selectedEl.kohm < 5 ? 'Aceptable' : selectedEl.kohm < 10 ? 'Alto' : 'Crítico'})
                    </span>
                  </>
                ) : (
                  'Sin test registrado'
                )}
              </span>
            </div>
            <p className="text-[11.5px] text-[#8497ad] leading-relaxed">
              <b className="text-[#38c8f5]">Acción recomendada:</b> {getActionRecommendation(selectedEl.kohm)}
            </p>
          </div>
        )}

        {/* Impedance Legend */}
        <div className="mt-3.5 pt-2.5 border-t border-[#141e2b] text-[11px] text-[#8497ad] flex flex-wrap gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#0b3323] border border-[#1b6b4a]" />
            &lt; 2 kΩ (Óptimo)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#3b320d] border border-[#7d6812]" />
            2–5 kΩ (Aceptable)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#45270d] border border-[#9a5416]" />
            5–10 kΩ (Ajustar pinza)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#4a141b] border border-[#a32d3a]" />
            &gt; 10 kΩ (Reclavar / Sal)
          </span>
        </div>
      </div>

      {/* 2. Statistical Summary & Bad Electrodes List */}
      <div className="flex flex-col gap-3.5">
        <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
          <h3 className="text-[12.5px] font-semibold pb-2 mb-2.5 border-b border-[#141e2b] text-[#dbe5f0]">
            Resumen Estadístico del Test
          </h3>
          {contactSummary ? (
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="bg-[#060a0f] p-2.5 rounded-lg border border-[#141e2b]">
                <span className="block text-[10.5px] text-[#8497ad]">Mediana de Línea</span>
                <b className="font-mono-numbers text-[18px] text-[#dbe5f0]">
                  {contactSummary.medianKohm.toFixed(2)} kΩ
                </b>
              </div>
              <div className="bg-[#060a0f] p-2.5 rounded-lg border border-[#141e2b]">
                <span className="block text-[10.5px] text-[#8497ad]">Pico Máximo</span>
                <b className="font-mono-numbers text-[18px] text-[#fbbf24]">
                  {contactSummary.maxKohm.toFixed(1)} kΩ
                </b>
              </div>
              <div className="bg-[#060a0f] p-2.5 rounded-lg border border-[#141e2b]">
                <span className="block text-[10.5px] text-[#8497ad]">&lt; 2 kΩ (Óptimos)</span>
                <b className="font-mono-numbers text-[18px] text-[#34d399]">
                  {contactSummary.under2k} / {electrodesCount}
                </b>
              </div>
              <div className="bg-[#060a0f] p-2.5 rounded-lg border border-[#141e2b]">
                <span className="block text-[10.5px] text-[#8497ad]">&gt; 5 kΩ (A corregir)</span>
                <b className="font-mono-numbers text-[18px] text-[#fb5b66]">
                  {contactSummary.between5and10k + contactSummary.over10k}
                </b>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-[#8497ad] py-3 text-center">
              Sin test ejecutado. Pulsa F1 Repetir test.
            </p>
          )}
        </div>

        <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
            <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />
            <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
              Electrodos a Corregir en Terreno
            </h3>
          </div>

          {contactSummary && contactSummary.badElectrodes.length > 0 ? (
            <div className="grid gap-2 max-h-[240px] overflow-y-auto pr-1">
              {contactSummary.badElectrodes.map((bad) => (
                <div
                  key={bad.electrode}
                  onClick={() => handleElectrodeClick(bad.electrode, bad.resistanceKohm)}
                  className="flex justify-between items-center py-2 px-3 bg-[#060a0f] border border-[#141e2b] hover:border-[#19405c] rounded-lg text-[12px] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#fb5b66]" />
                    <span className="font-mono font-medium text-[#dbe5f0]">
                      Electrodo E{bad.electrode}
                    </span>
                  </div>
                  <div className="text-right">
                    <b
                      className={`font-mono-numbers ${
                        bad.resistanceKohm >= 10 ? 'text-[#fb5b66]' : 'text-[#fbbf24]'
                      }`}
                    >
                      {bad.resistanceKohm.toFixed(1)} kΩ
                    </b>
                    <div className="text-[10px] text-[#8497ad]">
                      {bad.resistanceKohm >= 10 ? 'Reclavar / humedecer sal' : 'Ajustar pinza'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : contactSummary ? (
            <div className="flex items-center gap-2 text-[12px] text-[#34d399] py-3">
              <CheckCircle2 className="w-4 h-4" />
              <span>Todos los electrodos presentan excelente acoplamiento galvánico (&lt; 5 kΩ).</span>
            </div>
          ) : (
            <p className="text-[12px] text-[#8497ad] py-3 text-center">
              Realiza el test de contacto para identificar electrodos con alta impedancia.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
