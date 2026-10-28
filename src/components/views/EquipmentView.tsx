import React, { useState } from 'react';
import { InstrumentStatus } from '../../services/api';
import { Cpu, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';

interface EquipmentViewProps {
  instrument: InstrumentStatus | null;
  isConnected: boolean;
  onRunReceiverTest: () => Promise<string>;
  onRunIpTest: () => Promise<string>;
  onMeasureSp: () => Promise<string>;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  instrument,
  isConnected,
  onRunReceiverTest,
  onRunIpTest,
  onMeasureSp,
}) => {
  const [testResult, setTestResult] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);

  const handleTest = async (testFn: () => Promise<string>) => {
    setTesting(true);
    try {
      const msg = await testFn();
      setTestResult(msg);
    } catch {
      setTestResult('Error al ejecutar la rutina en el procesador DSP.');
    } finally {
      setTesting(false);
    }
  };

  const specs = [
    ['Corriente de salida', '1 a 2000 mA (resolución 1 mA)'],
    ['Tensión máxima TX', '800 Vp-p (aislado galvánicamente)'],
    ['Transmisor continuo', '200 W continuos'],
    ['Canales simultáneos', '8 canales de 24-bit ADC'],
    ['Rango dinámico entrada', '±10 Vp-p'],
    ['Impedancia de entrada', '> 150 MΩ'],
    ['Polarización inducida', '6 ventanas IP (M1..M6) en dominio de tiempo'],
    ['Ciclos de señal IP', '0.5, 1, 2, 4, 8 s'],
    ['Apilado (Stacking)', 'Hasta 300 ciclos automáticos'],
    ['Enlace inalámbrico', 'Wi-Fi 802.11 b/g/n (~100 m campo libre)'],
    ['Capacidad de memoria', '> 79 000 lecturas / > 26 000 con IP'],
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start pb-20 md:pb-6">
      {/* 1. Hardware Status */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
          <Activity className="w-3.5 h-3.5 text-[#38c8f5]" />
          <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
            Telemetría de Hardware SuperSting
          </h3>
        </div>

        <div className="grid gap-2 text-[12px]">
          <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
            <span className="text-[#8497ad]">Batería Interna (Control)</span>
            <b className="font-mono-numbers text-[#dbe5f0]">
              {instrument ? `${instrument.batteryInternal.toFixed(2)} V` : '12.60 V'}
            </b>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
            <span className="text-[#8497ad]">Batería Externa (Transmisor TX)</span>
            <b className="font-mono-numbers text-[#dbe5f0]">
              {instrument ? `${instrument.batteryExternal.toFixed(2)} V` : '12.40 V'}
            </b>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
            <span className="text-[#8497ad]">Enlace Wi-Fi Direct</span>
            <b className={`font-mono-numbers ${isConnected ? 'text-[#34d399]' : 'text-[#fb5b66]'}`}>
              {isConnected ? 'Conectado (8 canales activos)' : 'Desconectado'}
            </b>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
            <span className="text-[#8497ad]">Potencia de Señal RSSI</span>
            <b className="font-mono-numbers text-[#dbe5f0]">
              {isConnected ? `${instrument?.signalDbm ?? -58} dBm` : '—'}
            </b>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
            <span className="text-[#8497ad]">Receptor GNSS/GPS</span>
            <b className="font-mono-numbers text-[#dbe5f0]">
              {instrument?.gpsStatus ?? '3D Fix'}, {instrument?.gpsSatellites ?? 9} satélites
            </b>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
            <span className="text-[#8497ad]">Temperatura del Disipador</span>
            <b className="font-mono-numbers text-[#dbe5f0]">
              {instrument ? `${instrument.temperatureC.toFixed(1)} °C` : '28.4 °C'}
            </b>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#141e2b]">
            <span className="text-[#8497ad]">Firmware DSP</span>
            <b className="font-mono-numbers text-[#38c8f5]">
              {isConnected ? `v${instrument?.firmware ?? '4.2'}` : '—'}
            </b>
          </div>
        </div>
      </div>

      {/* 2. Pruebas diagnósticas y calibración */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[#141e2b]">
          <Cpu className="w-3.5 h-3.5 text-[#38c8f5]" />
          <h3 className="text-[12.5px] font-semibold text-[#dbe5f0]">
            Diagnóstico y Potencial Espontáneo (SP)
          </h3>
        </div>

        <p className="text-[11.5px] text-[#8497ad] leading-relaxed mb-3">
          Comprobación de offset de los conversores analógico-digitales y potencial espontáneo de terreno.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <button
            onClick={() => handleTest(onRunReceiverTest)}
            disabled={!isConnected || testing}
            className="h-9.5 px-2 rounded-lg font-medium text-[11.5px] bg-[#101b27] hover:bg-[#162536] hover:border-[#38c8f5] border border-[#22354a] text-[#dbe5f0] disabled:opacity-35 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <Cpu className="w-3.5 h-3.5 text-[#38c8f5]" />
            <span>Test Receptor 8CH</span>
          </button>
          <button
            onClick={() => handleTest(onRunIpTest)}
            disabled={!isConnected || testing}
            className="h-9.5 px-2 rounded-lg font-medium text-[11.5px] bg-[#101b27] hover:bg-[#162536] hover:border-[#38c8f5] border border-[#22354a] text-[#dbe5f0] disabled:opacity-35 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#38c8f5]" />
            <span>Carga de Prueba IP</span>
          </button>
        </div>

        <button
          onClick={() => handleTest(onMeasureSp)}
          disabled={!isConnected || testing}
          className="w-full h-9.5 rounded-lg font-medium text-[12px] bg-[#101b27] hover:bg-[#162536] hover:border-[#34d399] border border-[#22354a] text-[#dbe5f0] disabled:opacity-35 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs mb-3"
        >
          <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
          <span>Medir SP (8 Canales Simultáneos)</span>
        </button>

        {testResult && (
          <div className="p-2.5 bg-[#060a0f] border border-[#19405c] rounded-lg text-[11.5px] text-[#7ef0c0] font-mono leading-relaxed">
            {testResult}
          </div>
        )}
      </div>

      {/* 3. Specs List */}
      <div className="p-3.5 bg-[#0a1017] border border-[#1b2838] rounded-xl shadow-xs md:col-span-2 lg:col-span-1">
        <h3 className="text-[12.5px] font-semibold pb-2 mb-2.5 border-b border-[#141e2b] text-[#dbe5f0]">
          Especificaciones SuperSting R8/IP
        </h3>
        <div className="grid gap-1.5 text-[11.5px]">
          {specs.map(([label, val]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-[#141e2b]">
              <span className="text-[#8497ad]">{label}</span>
              <b className="font-mono-numbers text-[#dbe5f0] text-right">{val}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
