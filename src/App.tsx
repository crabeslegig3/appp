/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { NavigationRail, TabKey } from './components/NavigationRail';
import { HeaderBar } from './components/HeaderBar';
import { CommandBar } from './components/CommandBar';
import { LiveView } from './components/views/LiveView';
import { ConfigView } from './components/views/ConfigView';
import { ContactView } from './components/views/ContactView';
import { QualityView } from './components/views/QualityView';
import { DataView } from './components/views/DataView';
import { EquipmentView } from './components/views/EquipmentView';
import { BackendApiModal } from './components/views/BackendApiModal';
import {
  api,
  InstrumentStatus,
  ContactTestSummary,
  SequenceSummary,
  StoredFileInfo,
} from './services/api';
import { QuadripolePoint, SequenceConfig } from './utils/ert-math';

const TAB_TITLES: Record<TabKey, [string, string]> = {
  live: [
    'Medición en vivo',
    'Pseudosección de resistividad aparente en tiempo real y recepción 8 canales.',
  ],
  cfg: [
    'Configuración del survey',
    'Geometría del tendido, parámetros de transmisión y criterios de apilado.',
  ],
  con: [
    'Contacto de electrodos',
    'Resistencia de contacto de cada electrodo del SwitchBox.',
  ],
  qa: [
    'Control de calidad (QA)',
    'Distribución del error y remediación de puntos ruidosos.',
  ],
  dat: [
    'Datos y exportación',
    'Memoria flash y descarga en formato .z2d / CSV para inversión.',
  ],
  eq: [
    'Equipo y diagnóstico',
    'Telemetría, calibración de 8 canales y medición de SP.',
  ],
  api: [
    'Backend API Express',
    'Endpoints REST y flujo de telemetría geofísica en tiempo real.',
  ],
};

export type AppSurveyConfig = {
  jobName: string;
  arrayType: SequenceConfig['arrayType'];
  electrodes: number;
  spacing: number;
  nMax: number;
  maxCurrent: number;
  measureTime: number;
  isIP: boolean;
  ipCycle: number;
  stackCycles: number;
  errorThreshold: number;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('live');

  // Instrument State
  const [connectionStatus, setConnectionStatus] = useState<0 | 1 | 2>(0);
  const [instrument, setInstrument] = useState<InstrumentStatus | null>(null);
  const [internalBattery, setInternalBattery] = useState<number>(12.6);
  const [externalBattery, setExternalBattery] = useState<number>(12.4);

  // Survey Configuration
  const [config, setConfig] = useState<AppSurveyConfig>({
    jobName: 'LINEA01',
    arrayType: 'dd',
    electrodes: 56,
    spacing: 5,
    nMax: 8,
    maxCurrent: 500,
    measureTime: 1.2,
    isIP: false,
    ipCycle: 2,
    stackCycles: 4,
    errorThreshold: 2.0,
  });

  const [sequenceSummary, setSequenceSummary] = useState<SequenceSummary | null>(null);

  // Survey Runtime State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [points, setPoints] = useState<QuadripolePoint[]>([]);
  const [lastBatch, setLastBatch] = useState<QuadripolePoint[]>([]);
  const [activeElectrodes, setActiveElectrodes] = useState<{ tx: number[]; rx: number[] }>({
    tx: [],
    rx: [],
  });

  // Contact Test Summary
  const [contactSummary, setContactSummary] = useState<ContactTestSummary | null>(null);

  // Files in memory
  const [files, setFiles] = useState<StoredFileInfo[]>([]);

  // Logs on LCD
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString('es-ES')}] Backend conectado. Enlaza con el SuperSting.`,
  ]);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString('es-ES');
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 8)]);
  }, []);

  const refreshFiles = useCallback(async () => {
    try {
      const fl = await api.listFiles();
      setFiles(fl);
    } catch {
      // ignore
    }
  }, []);

  const refreshSequenceSummary = useCallback(async (cfgToUse: SequenceConfig = config) => {
    try {
      const sum = await api.getSequenceSummary(cfgToUse);
      setSequenceSummary(sum);
    } catch (err) {
      console.error('Error fetching sequence summary:', err);
    }
  }, [config]);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const inst = await api.getInstrumentStatus();
        setInstrument(inst);
        setConnectionStatus(inst.connected ? 2 : 0);
        setInternalBattery(inst.batteryInternal);
        setExternalBattery(inst.batteryExternal);

        const currentCfg = await api.getSurveyConfig();
        setConfig((prev) => ({
          ...prev,
          ...currentCfg,
          maxCurrent: currentCfg.maxCurrent ?? prev.maxCurrent,
          measureTime: currentCfg.measureTime ?? prev.measureTime,
          isIP: currentCfg.isIP ?? prev.isIP,
          ipCycle: currentCfg.ipCycle ?? prev.ipCycle,
          stackCycles: currentCfg.stackCycles ?? prev.stackCycles,
          errorThreshold: currentCfg.errorThreshold ?? prev.errorThreshold,
        }));
        await refreshSequenceSummary(currentCfg);
        await refreshFiles();

        const state = await api.getSurveyState();
        setIsRunning(state.isRunning);
        setCurrentIndex(state.currentIndex);
        setPoints(state.points || []);
        setLastBatch(state.lastBatch || []);
        setActiveElectrodes(state.activeElectrodes || { tx: [], rx: [] });
      } catch (err) {
        console.warn('Initial backend fetch notice:', err);
      }
    }
    init();
  }, [refreshSequenceSummary, refreshFiles]);

  // SSE Subscription
  useEffect(() => {
    const unsubscribe = api.subscribeEvents({
      onShotUpdate: (data) => {
        setCurrentIndex(data.currentIndex);
        setLastBatch(data.batch);
        setActiveElectrodes(data.activeElectrodes);
        setInternalBattery(data.batteryInternal);
        setExternalBattery(data.batteryExternal);

        setPoints((prev) => {
          const updated = [...prev];
          data.batch.forEach((shot) => {
            updated[shot.index] = shot;
          });
          return updated;
        });

        const lead = data.batch[0];
        if (lead) {
          const [A, B, M, N] = lead.p;
          const bStr = B < 0 ? '∞' : String(B + 1);
          addLog(
            `MEA ${data.currentIndex}/${data.totalPoints} A${A + 1} B${bStr} M${M + 1} N${N + 1} ρa=${lead.rho.toPrecision(
              3
            )} Ωm I=${lead.I.toFixed(0)}mA err=${lead.err.toFixed(1)}%`
          );
        }
      },
      onSurveyCompleted: (data) => {
        setIsRunning(false);
        setActiveElectrodes({ tx: [], rx: [] });
        addLog(`Survey completo: ${data.totalPoints} puntos en ${data.filename}`);
        refreshFiles();
      },
      onContactTest: (data) => {
        setContactSummary(data);
        addLog(
          `Test contacto: ${data.totalElectrodes} el, mediana ${data.medianKohm.toFixed(
            1
          )} kΩ`
        );
      },
      onInstrumentState: (data) => {
        if (data.connecting) {
          setConnectionStatus(1);
          addLog('Buscando red SuperSting-R8…');
        } else if (data.connected) {
          setConnectionStatus(2);
          addLog('Conectado: 8 canales, TX 200 W');
        } else {
          setConnectionStatus(0);
          setIsRunning(false);
          addLog('Enlace Wi-Fi cerrado');
        }
      },
      onRemeasure: (data) => {
        addLog(`Remedición: ${data.remeasuredCount} puntos apilados`);
      },
    });

    return () => unsubscribe();
  }, [addLog, refreshFiles]);

  // Handlers
  const handleConnectToggle = async () => {
    if (connectionStatus === 1) return;
    if (connectionStatus === 2) {
      await api.connectInstrument('disconnect');
      setConnectionStatus(0);
      addLog('Enlace Wi-Fi cerrado');
    } else {
      setConnectionStatus(1);
      addLog('Buscando red SuperSting-R8…');
      try {
        const res = await api.connectInstrument('connect');
        if (res.connected) {
          setConnectionStatus(2);
          addLog('Conectado: 8 canales, TX 200 W');
        }
      } catch {
        setConnectionStatus(0);
      }
    }
  };

  const handleContactTest = async () => {
    try {
      addLog('Iniciando test de contacto…');
      const sum = await api.runContactTest();
      setContactSummary(sum);
    } catch {
      addLog('Error al ejecutar test');
    }
  };

  const handleStartPause = async () => {
    if (isRunning) {
      await api.pauseSurvey();
      setIsRunning(false);
      addLog('Survey en pausa');
    } else {
      try {
        const res = await api.startSurvey();
        setIsRunning(true);
        addLog(
          `Secuencia ${config.arrayType.toUpperCase()}: ${res.totalPoints} puntos`
        );
      } catch (err: unknown) {
        addLog(`Error al iniciar: ${(err as Error).message}`);
      }
    }
  };

  const handleStop = async () => {
    await api.stopSurvey();
    setIsRunning(false);
    setActiveElectrodes({ tx: [], rx: [] });
    addLog('Survey detenido');
    refreshFiles();
  };

  const handleStep = async () => {
    try {
      const res = await api.stepSurvey();
      setCurrentIndex(res.currentIndex);
      setLastBatch(res.lastBatch);
    } catch (err: unknown) {
      addLog(`Error en paso: ${(err as Error).message}`);
    }
  };

  const handleRemeasure = async () => {
    try {
      const res = await api.remeasureSurvey();
      setPoints((prev) =>
        prev.map((q) => {
          if (q.err > config.errorThreshold) {
            return { ...q, cycles: q.cycles + 4, err: Number((q.err * 0.45).toFixed(2)) };
          }
          return q;
        })
      );
      addLog(`Remedición para ${res.remeasuredCount} puntos`);
    } catch {
      addLog('Error en remedición');
    }
  };

  const handleConfigChange = async (patch: Partial<AppSurveyConfig>) => {
    const updated: AppSurveyConfig = { ...config, ...patch };
    setConfig(updated);
    await api.updateSurveyConfig(updated);
    await refreshSequenceSummary(updated);
  };

  const handleDownloadExport = (format: 'csv' | 'z2d' | 'stg' | 'json') => {
    const url = api.getExportUrl(`${config.jobName}`, format);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.jobName}.${format}`;
    a.click();
    addLog(`Exportado ${config.jobName}.${format}`);
  };

  const handleUploadCmd = async (filename: string, content: string) => {
    try {
      const res = await api.uploadCmdFile(filename, content);
      addLog(res.message);
      refreshFiles();
    } catch {
      addLog('Error al guardar .cmd');
    }
  };

  const handleRunReceiverTest = async () => {
    const res = await api.runReceiverTest();
    addLog(res.message);
    return res.message;
  };

  const handleRunIpTest = async () => {
    const res = await api.runIpTest();
    addLog(res.message);
    return res.message;
  };

  const handleMeasureSp = async () => {
    const res = await api.measureSp();
    const str = res.channels.map((c) => `C${c.channel}:${c.potentialMv.toFixed(0)}mV`).join(' ');
    addLog(`SP: ${str}`);
    return str;
  };

  const totalPoints = sequenceSummary?.totalPoints || points.length || 0;
  const ivSec = (300 + (config.isIP ? (config.ipCycle || 2) : (config.measureTime || 1.2)) * 150) / 1000;
  const remainingSec = Math.max(0, Math.ceil(((totalPoints - currentIndex) / 8) * ivSec));

  return (
    <div className="min-h-screen bg-[#070b10] text-[#dbe5f0] flex flex-col md:flex-row font-sans select-none overflow-x-hidden">
      {/* Navigation Rail: Desktop Sidebar on >= md, Bottom Nav on < md */}
      <NavigationRail
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOnline={true}
      />

      {/* Main Content Area: Adapts to phone, tablet and widescreen laptop */}
      <div className="flex-1 flex flex-col min-w-0 p-2 sm:p-3.5 md:p-4 lg:p-5 max-w-[1720px] mx-auto w-full overflow-x-hidden">
        {/* Top Header Bar */}
        <HeaderBar
          connectionStatus={connectionStatus}
          internalBattery={internalBattery}
          externalBattery={externalBattery}
          jobName={config.jobName}
          onConnectToggle={handleConnectToggle}
        />

        {/* Tab Header title & subtitle */}
        <div className="py-2 sm:py-3">
          <div className="flex items-baseline justify-between">
            <h1 className="text-[17px] sm:text-[20px] lg:text-[22px] font-semibold text-[#dbe5f0] tracking-tight">
              {TAB_TITLES[activeTab][0]}
            </h1>
            <span className="text-[10px] sm:text-[11px] text-[#38c8f5] font-mono">
              SuperSting R8/IP
            </span>
          </div>
          <p className="text-[11px] sm:text-[12.5px] text-[#8497ad] leading-tight max-w-3xl">
            {TAB_TITLES[activeTab][1]}
          </p>
        </div>

        {/* Command Bar */}
        <div className="mb-3">
          <CommandBar
            isConnected={connectionStatus === 2}
            isRunning={isRunning}
            currentIndex={currentIndex}
            totalPoints={totalPoints}
            estimatedRemainingSec={remainingSec}
            onContactTest={handleContactTest}
            onStartPause={handleStartPause}
            onStop={handleStop}
            onStep={handleStep}
          />
        </div>

        {/* View Component */}
        <main className="flex-1">
          {activeTab === 'live' && (
            <LiveView
              points={points}
              currentIndex={currentIndex}
              totalPoints={totalPoints}
              lastBatch={lastBatch}
              activeElectrodes={activeElectrodes}
              electrodesCount={config.electrodes}
              electrodeSpacing={config.spacing}
              maxCurrent={config.maxCurrent}
              stackCycles={config.stackCycles}
              errorThreshold={config.errorThreshold}
              logs={logs}
            />
          )}

          {activeTab === 'cfg' && (
            <ConfigView
              config={config}
              summary={sequenceSummary}
              onChange={handleConfigChange}
              onApplyAndBuildMap={() => {
                addLog(`Geometría: ${config.electrodes} el @ ${config.spacing}m`);
              }}
            />
          )}

          {activeTab === 'con' && (
            <ContactView
              electrodesCount={config.electrodes}
              contactSummary={contactSummary}
              activeElectrodes={activeElectrodes}
              onRunTest={handleContactTest}
              onSelectElectrode={(elNum, val) => {
                addLog(`E${elNum}: ${val != null ? `${val.toFixed(2)} kΩ` : 'sin test'}`);
              }}
              isConnected={connectionStatus === 2}
            />
          )}

          {activeTab === 'qa' && (
            <QualityView
              points={points}
              currentIndex={currentIndex}
              errorThreshold={config.errorThreshold}
              onRemeasure={handleRemeasure}
              isConnected={connectionStatus === 2}
            />
          )}

          {activeTab === 'dat' && (
            <DataView
              jobName={config.jobName}
              measuredCount={currentIndex}
              isIP={config.isIP}
              files={files}
              onDownloadExport={handleDownloadExport}
              onUploadCmd={handleUploadCmd}
            />
          )}

          {activeTab === 'eq' && (
            <EquipmentView
              instrument={instrument}
              isConnected={connectionStatus === 2}
              onRunReceiverTest={handleRunReceiverTest}
              onRunIpTest={handleRunIpTest}
              onMeasureSp={handleMeasureSp}
            />
          )}

          {activeTab === 'api' && <BackendApiModal />}
        </main>
      </div>
    </div>
  );
}
