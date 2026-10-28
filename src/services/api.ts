/**
 * Frontend API client communicating with the SuperSting R8/IP Express backend.
 */

import { QuadripolePoint, SequenceConfig } from '../utils/ert-math';

export interface InstrumentStatus {
  connected: boolean;
  connecting: boolean;
  ssid: string;
  ip: string;
  signalDbm: number;
  firmware: string;
  batteryInternal: number;
  batteryExternal: number;
  gpsStatus: string;
  gpsSatellites: number;
  transmitterPowerW: number;
  maxVoltageVp: number;
  inputImpedanceMohm: number;
  channels: number;
  contactResistance: number[];
  temperatureC: number;
}

export interface ContactTestSummary {
  totalElectrodes: number;
  medianKohm: number;
  maxKohm: number;
  under2k: number;
  between2and5k: number;
  between5and10k: number;
  over10k: number;
  badElectrodes: { electrode: number; resistanceKohm: number }[];
  values: number[];
}

export interface SequenceSummary {
  totalPoints: number;
  groupsOf8: number;
  estimatedMinutes: number;
  lineLengthM: number;
  approxDepthM: number;
  maxPseudoDepthM: number;
  memoryPct: number;
}

export interface StoredFileInfo {
  name: string;
  type: 'stg' | 'cmd' | 'csv' | 'z2d';
  pointsCount: number;
  createdAt: string;
  sizeBytes: number;
}

export const api = {
  async getInstrumentStatus(): Promise<InstrumentStatus> {
    const res = await fetch('/api/instrument/status');
    const data = await res.json();
    return data.instrument;
  },

  async connectInstrument(action: 'connect' | 'disconnect'): Promise<{ connected: boolean; connecting?: boolean }> {
    const res = await fetch('/api/instrument/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    return res.json();
  },

  async runContactTest(): Promise<ContactTestSummary> {
    const res = await fetch('/api/instrument/contact-test', {
      method: 'POST',
    });
    const data = await res.json();
    return data.summary;
  },

  async runReceiverTest(): Promise<{ message: string; channels: Array<{ channel: number; gainErrorPct: number; phaseErrorMrad: number; status: string }> }> {
    const res = await fetch('/api/instrument/receiver-test', {
      method: 'POST',
    });
    return res.json();
  },

  async runIpTest(): Promise<{ message: string; windows: Array<{ window: string; timeMs: number; chargeabilityMvV: number; status: string }> }> {
    const res = await fetch('/api/instrument/ip-test', {
      method: 'POST',
    });
    return res.json();
  },

  async measureSp(): Promise<{ message: string; channels: Array<{ channel: number; potentialMv: number }> }> {
    const res = await fetch('/api/instrument/sp-test', {
      method: 'POST',
    });
    return res.json();
  },

  async getSurveyConfig(): Promise<SequenceConfig & { jobName: string }> {
    const res = await fetch('/api/survey/config');
    const data = await res.json();
    return data.config;
  },

  async updateSurveyConfig(config: Partial<SequenceConfig & { jobName: string }>): Promise<SequenceConfig & { jobName: string }> {
    const res = await fetch('/api/survey/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    return data.config;
  },

  async getSequenceSummary(config: Partial<SequenceConfig>): Promise<SequenceSummary> {
    const res = await fetch('/api/survey/sequence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    return data.summary;
  },

  async startSurvey(): Promise<{ status: string; isRunning: boolean; totalPoints: number; currentIndex: number }> {
    const res = await fetch('/api/survey/start', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to start survey');
    }
    return res.json();
  },

  async pauseSurvey(): Promise<{ status: string; isRunning: boolean; currentIndex: number }> {
    const res = await fetch('/api/survey/pause', { method: 'POST' });
    return res.json();
  },

  async stopSurvey(): Promise<{ status: string; isRunning: boolean; recordedPoints: number }> {
    const res = await fetch('/api/survey/stop', { method: 'POST' });
    return res.json();
  },

  async stepSurvey(): Promise<{ currentIndex: number; totalPoints: number; lastBatch: QuadripolePoint[] }> {
    const res = await fetch('/api/survey/step', { method: 'POST' });
    return res.json();
  },

  async remeasureSurvey(): Promise<{ remeasuredCount: number; threshold: number }> {
    const res = await fetch('/api/survey/remeasure', { method: 'POST' });
    return res.json();
  },

  async getSurveyState(): Promise<{
    isRunning: boolean;
    currentIndex: number;
    totalPoints: number;
    activeElectrodes: { tx: number[]; rx: number[] };
    lastBatch: QuadripolePoint[];
    points: QuadripolePoint[];
  }> {
    const res = await fetch('/api/survey/state');
    return res.json();
  },

  async listFiles(): Promise<StoredFileInfo[]> {
    const res = await fetch('/api/files');
    const data = await res.json();
    return data.files;
  },

  getExportUrl(filename: string, format: 'csv' | 'z2d' | 'stg' | 'json'): string {
    return `/api/files/${encodeURIComponent(filename)}/export?format=${format}`;
  },

  async uploadCmdFile(filename: string, content: string): Promise<{ message: string }> {
    const res = await fetch('/api/files/upload-cmd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content }),
    });
    return res.json();
  },

  subscribeEvents(handlers: {
    onShotUpdate?: (data: {
      currentIndex: number;
      totalPoints: number;
      batch: QuadripolePoint[];
      activeElectrodes: { tx: number[]; rx: number[] };
      batteryInternal: number;
      batteryExternal: number;
    }) => void;
    onSurveyCompleted?: (data: { totalPoints: number; filename: string }) => void;
    onContactTest?: (data: ContactTestSummary) => void;
    onInstrumentState?: (data: { connected?: boolean; connecting?: boolean }) => void;
    onRemeasure?: (data: { remeasuredCount: number; threshold: number }) => void;
  }): () => void {
    const eventSource = new EventSource('/api/survey/events');

    eventSource.addEventListener('shot_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        handlers.onShotUpdate?.(data);
      } catch (err) {
        console.error('SSE shot_update parse error:', err);
      }
    });

    eventSource.addEventListener('survey_completed', (e) => {
      try {
        const data = JSON.parse(e.data);
        handlers.onSurveyCompleted?.(data);
      } catch (err) {
        console.error('SSE survey_completed parse error:', err);
      }
    });

    eventSource.addEventListener('contact_test_results', (e) => {
      try {
        const data = JSON.parse(e.data);
        handlers.onContactTest?.(data);
      } catch (err) {
        console.error('SSE contact_test parse error:', err);
      }
    });

    eventSource.addEventListener('instrument_state', (e) => {
      try {
        const data = JSON.parse(e.data);
        handlers.onInstrumentState?.(data);
      } catch (err) {
        console.error('SSE instrument_state parse error:', err);
      }
    });

    eventSource.addEventListener('remeasure_completed', (e) => {
      try {
        const data = JSON.parse(e.data);
        handlers.onRemeasure?.(data);
      } catch (err) {
        console.error('SSE remeasure parse error:', err);
      }
    });

    return () => {
      eventSource.close();
    };
  },
};
