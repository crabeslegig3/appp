import React, { useEffect, useState } from 'react';
import { Battery, BatteryCharging, Radio, Wifi, WifiOff, Clock, ShieldCheck } from 'lucide-react';

interface HeaderBarProps {
  connectionStatus: 0 | 1 | 2; // 0=disconnected, 1=connecting, 2=connected
  internalBattery: number;
  externalBattery: number;
  jobName: string;
  onConnectToggle: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  connectionStatus,
  internalBattery,
  externalBattery,
  jobName,
  onConnectToggle,
}) => {
  const [time, setTime] = useState<string>('--:--:--');

  useEffect(() => {
    const updateClock = () => {
      setTime(new Date().toLocaleTimeString('es-ES', { hour12: false }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const statusLabels = ['Desconectado', 'Enlazando…', 'En Línea'];

  return (
    <header className="sticky top-0 z-20 bg-[#0a1017]/95 backdrop-blur-md border border-[#1b2838] rounded-xl p-2.5 sm:px-4 sm:py-2.5 shadow-lg shadow-black/40">
      {/* Desktop / Tablet Bar (> md) */}
      <div className="hidden md:flex items-center justify-between gap-2 lg:gap-4 text-[12px] lg:text-[12.5px] w-full">
        {/* Brand & Connection status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                connectionStatus === 0
                  ? 'bg-[#fb5b66] shadow-[0_0_8px_rgba(251,91,102,0.6)]'
                  : connectionStatus === 1
                  ? 'bg-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse'
                  : 'bg-[#34d399] shadow-[0_0_10px_rgba(52,211,153,0.8)]'
              }`}
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1 leading-none">
              <span className="font-semibold text-[12.5px] lg:text-[13px] tracking-tight text-[#dbe5f0]">
                SuperSting™ R8/IP
              </span>
              <span className="text-[10px] font-mono text-[#5d7087] hidden xl:inline">· 8CH/200W</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-[10.5px] lg:text-[11px]">
              <span
                className={`font-medium ${
                  connectionStatus === 2
                    ? 'text-[#34d399]'
                    : connectionStatus === 1
                    ? 'text-[#fbbf24]'
                    : 'text-[#8497ad]'
                }`}
              >
                {statusLabels[connectionStatus]}
              </span>
              <span className="text-[#3b4c60]">|</span>
              <span className="text-[#8497ad] font-mono">Wi-Fi Direct</span>
            </div>
          </div>

          {/* Signal RSSI bars */}
          <div className="hidden xl:flex items-end gap-0.5 h-3.5 pl-1" title={connectionStatus === 2 ? '-58 dBm (Excelente)' : 'Sin señal'}>
            <i className={`w-1 h-1 rounded-xs transition-colors ${connectionStatus === 2 ? 'bg-[#34d399]' : 'bg-[#1e2a3a]'}`} />
            <i className={`w-1 h-1.5 rounded-xs transition-colors ${connectionStatus === 2 ? 'bg-[#34d399]' : 'bg-[#1e2a3a]'}`} />
            <i className={`w-1 h-2.5 rounded-xs transition-colors ${connectionStatus === 2 ? 'bg-[#34d399]' : 'bg-[#1e2a3a]'}`} />
            <i className={`w-1 h-3.5 rounded-xs transition-colors ${connectionStatus === 2 ? 'bg-[#34d399]' : 'bg-[#1e2a3a]'}`} />
          </div>
        </div>

        <div className="hidden lg:block h-6 w-px bg-[#182433]" />

        {/* Telemetry Badges (Batteries, GPS, Project) */}
        <div className="flex items-center gap-2.5 lg:gap-4 shrink min-w-0">
          {/* Internal Battery */}
          <div className="flex items-center gap-1.5 shrink-0" title="Batería interna del SuperSting R8">
            <Battery className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#38c8f5]" />
            <div>
              <div className="text-[9px] lg:text-[10px] text-[#5d7087] uppercase font-mono leading-none">INT</div>
              <div className="font-mono-numbers text-[11.5px] lg:text-[12.5px] font-medium text-[#dbe5f0]">
                {internalBattery.toFixed(1)}V
              </div>
            </div>
          </div>

          {/* External TX Battery */}
          <div className="flex items-center gap-1.5 shrink-0" title="Batería de potencia externa para TX">
            <BatteryCharging className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#34d399]" />
            <div>
              <div className="text-[9px] lg:text-[10px] text-[#5d7087] uppercase font-mono leading-none">EXT TX</div>
              <div className="font-mono-numbers text-[11.5px] lg:text-[12.5px] font-medium text-[#dbe5f0]">
                {externalBattery.toFixed(1)}V
              </div>
            </div>
          </div>

          <div className="hidden xl:block h-6 w-px bg-[#182433]" />

          {/* GPS */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0" title="Posicionamiento GPS">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8497ad]" />
            <div className="font-mono text-[11.5px] text-[#dbe5f0]">
              <span className="text-[#38c8f5]">3D</span> <span className="hidden xl:inline text-[#5d7087]">· 9 Sats</span>
            </div>
          </div>

          <div className="hidden md:block h-6 w-px bg-[#182433]" />

          {/* Active File */}
          <div className="shrink-0 truncate max-w-[120px] lg:max-w-[160px]">
            <div className="text-[9px] lg:text-[10px] text-[#5d7087] uppercase font-mono leading-none hidden lg:block">PROYECTO</div>
            <div className="font-mono text-[11.5px] lg:text-[12.5px] font-medium text-[#38c8f5] truncate">
              {jobName}.stg
            </div>
          </div>
        </div>

        <div className="hidden lg:block h-6 w-px bg-[#182433]" />

        {/* Right Section: Clock & Connect Action */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          {/* UTC Clock */}
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11.5px] text-[#8497ad]">
            <Clock className="w-3.5 h-3.5 text-[#5d7087]" />
            <span className="font-mono-numbers text-[#dbe5f0]">{time}</span>
          </div>

          {/* Connect Action Button */}
          <button
            onClick={onConnectToggle}
            className={`px-3 lg:px-4 h-8.5 rounded-lg font-medium text-[12px] lg:text-[12.5px] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-[0.98] shrink-0 ${
              connectionStatus === 2
                ? 'bg-[#4d161d] hover:bg-[#631c26] border border-[#a8323e] text-[#ffe6e8]'
                : connectionStatus === 1
                ? 'bg-[#422e0a] border border-[#a37012] text-[#fed7aa] cursor-wait'
                : 'bg-[#0e5c3e] hover:bg-[#13754f] border border-[#1d976c] text-[#e8fff5]'
            }`}
          >
            {connectionStatus === 2 ? (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </>
            ) : connectionStatus === 1 ? (
              <>
                <Radio className="w-3.5 h-3.5 animate-spin" />
                <span>Enlazando…</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Conectar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Bar (< md) */}
      <div className="md:hidden flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                connectionStatus === 0
                  ? 'bg-[#fb5b66] shadow-[0_0_6px_rgba(251,91,102,0.6)]'
                  : connectionStatus === 1
                  ? 'bg-[#fbbf24] animate-pulse'
                  : 'bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.7)]'
              }`}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-semibold text-[13px] text-[#dbe5f0] tracking-tight truncate">
                  SuperSting R8/IP
                </span>
                <span className="text-[10px] font-mono text-[#5d7087]">
                  {statusLabels[connectionStatus]}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onConnectToggle}
            className={`h-7 px-2.5 rounded-md font-semibold text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
              connectionStatus === 2
                ? 'bg-[#4d161d] border border-[#a8323e] text-[#ffe6e8]'
                : connectionStatus === 1
                ? 'bg-[#422e0a] border border-[#a37012] text-[#fed7aa]'
                : 'bg-[#0e5c3e] border border-[#1d976c] text-[#e8fff5]'
            }`}
          >
            {connectionStatus === 2 ? 'Desconectar' : connectionStatus === 1 ? 'Enlazando…' : 'Conectar'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#162130] text-[11px] font-mono-numbers">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#8497ad]">
              <Battery className="w-3.5 h-3.5 text-[#38c8f5]" />
              <span className="text-[#dbe5f0] font-medium">{internalBattery.toFixed(1)}V</span>
            </span>
            <span className="flex items-center gap-1 text-[#8497ad]">
              <BatteryCharging className="w-3.5 h-3.5 text-[#34d399]" />
              <span className="text-[#dbe5f0] font-medium">{externalBattery.toFixed(1)}V</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#38c8f5] font-mono font-medium truncate max-w-[110px]">
              {jobName}.stg
            </span>
            <span className="text-[#3b4c60]">·</span>
            <span className="text-[#8497ad]">{time}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
