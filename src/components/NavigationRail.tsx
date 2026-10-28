import React from 'react';
import {
  Activity,
  Sliders,
  Radio,
  BarChart3,
  Database,
  Cpu,
  Server,
  Zap,
} from 'lucide-react';

export type TabKey = 'live' | 'cfg' | 'con' | 'qa' | 'dat' | 'eq' | 'api';

interface NavigationRailProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  isOnline: boolean;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeTab,
  onTabChange,
  isOnline,
}) => {
  const tabs = [
    { id: 'live' as TabKey, label: 'Medición', fullLabel: 'Medición en vivo', icon: Activity },
    { id: 'cfg' as TabKey, label: 'Config', fullLabel: 'Configuración survey', icon: Sliders },
    { id: 'con' as TabKey, label: 'Contacto', fullLabel: 'Contacto electrodos', icon: Radio },
    { id: 'qa' as TabKey, label: 'Calidad', fullLabel: 'Control de calidad', icon: BarChart3 },
    { id: 'dat' as TabKey, label: 'Datos', fullLabel: 'Datos y exportación', icon: Database },
    { id: 'eq' as TabKey, label: 'Equipo', fullLabel: 'Equipo y diagnóstico', icon: Cpu },
    { id: 'api' as TabKey, label: 'API', fullLabel: 'Backend API Express', icon: Server },
  ];

  return (
    <>
      {/* 1. Desktop & Tablet Sidebar (Visible on md: and larger) */}
      <aside className="hidden md:flex flex-col w-16 lg:w-56 shrink-0 bg-[#060a0f] border-r border-[#1b2838] p-2 lg:p-3 h-screen sticky top-0 z-30 select-none transition-all duration-200">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-1 lg:px-2 py-3 mb-3 border-b border-[#141e2b] justify-center lg:justify-start">
          <div className="w-9 h-9 rounded-lg bg-[#0e1d2c] flex items-center justify-center border border-[#1b435a] shadow-inner shrink-0" title="SuperSting R8/IP ERT Manager">
            <Zap className="w-5 h-5 text-[#38c8f5]" />
          </div>
          <div className="hidden lg:block truncate">
            <div className="font-semibold text-[13.5px] leading-tight text-[#dbe5f0] tracking-tight truncate">
              ERT Manager
            </div>
            <div className="text-[10.5px] text-[#8497ad] font-mono">SuperSting R8/IP</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-col gap-1.5 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                title={tab.fullLabel}
                className={`flex flex-col lg:flex-row items-center lg:gap-3 px-1.5 lg:px-3 py-2 lg:h-10 rounded-lg text-center lg:text-left text-[9.5px] lg:text-[12.5px] font-medium transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-[#0f2438] text-[#38c8f5] border border-[#1b435a] shadow-sm font-semibold'
                    : 'text-[#8497ad] hover:bg-[#0c1520] hover:text-[#dbe5f0]'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 lg:w-4 lg:h-4 shrink-0 ${isActive ? 'text-[#38c8f5]' : 'text-[#6b7e94]'}`} />
                  {tab.id === 'api' && isOnline && (
                    <span className="lg:hidden absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#34d399]" />
                  )}
                </div>
                <span className="lg:hidden tracking-tight truncate max-w-[52px] leading-tight mt-0.5">
                  {tab.label}
                </span>
                <span className="hidden lg:inline truncate">{tab.fullLabel}</span>
                {tab.id === 'api' && isOnline && (
                  <span className="hidden lg:inline-block ml-auto w-1.5 h-1.5 rounded-full bg-[#34d399]" title="Backend Express activo" />
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop / Tablet Footer Status */}
        <div className="mt-auto pt-2 border-t border-[#141e2b] text-[11px] text-[#5d7087] px-1 lg:px-2 flex flex-col lg:flex-row justify-center lg:justify-between items-center font-mono gap-1">
          <span className="hidden lg:inline">Express v4.2</span>
          <div className="flex items-center gap-1.5" title="Backend Express Activo">
            <span className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] lg:text-[11px] text-[#34d399] font-semibold">ON</span>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Bottom Navigation Bar (Visible only on < md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#060a0f]/95 backdrop-blur-md border-t border-[#1b2838] px-1 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-center justify-around gap-0.5 overflow-x-auto no-scrollbar max-w-lg mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 min-w-[48px] py-1 px-1 flex flex-col items-center justify-center gap-1 rounded-lg text-center transition-all cursor-pointer ${
                  isActive
                    ? 'text-[#38c8f5] bg-[#0f2438] shadow-xs'
                    : 'text-[#8497ad] hover:text-[#dbe5f0] active:bg-[#0c1520]'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-4.5 h-4.5 transition-transform ${isActive ? 'scale-110 text-[#38c8f5]' : ''}`} />
                  {tab.id === 'api' && isOnline && (
                    <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none tracking-tight">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
