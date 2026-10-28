import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateSequence,
  simulateShot,
  formatZ2D,
  formatCSV,
  formatSTG,
  QuadripolePoint,
  SequenceConfig,
} from './src/utils/ert-math';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

interface InstrumentState {
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

const instrument: InstrumentState = {
  connected: false,
  connecting: false,
  ssid: 'SuperSting-R8',
  ip: '192.168.1.1',
  signalDbm: -58,
  firmware: '4.2',
  batteryInternal: 12.6,
  batteryExternal: 12.4,
  gpsStatus: '3D Fix',
  gpsSatellites: 9,
  transmitterPowerW: 200,
  maxVoltageVp: 800,
  inputImpedanceMohm: 150,
  channels: 8,
  contactResistance: [],
  temperatureC: 28.4,
};

let surveyConfig: SequenceConfig & { jobName: string } = {
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
};

interface SurveySession {
  isRunning: boolean;
  points: QuadripolePoint[];
  currentIndex: number;
  lastBatch: QuadripolePoint[];
  activeElectrodes: { tx: number[]; rx: number[] };
  timer: NodeJS.Timeout | null;
  startedAt: number | null;
  completedAt: number | null;
}

const surveySession: SurveySession = {
  isRunning: false,
  points: [],
  currentIndex: 0,
  lastBatch: [],
  activeElectrodes: { tx: [], rx: [] },
  timer: null,
  startedAt: null,
  completedAt: null,
};

interface StoredFile {
  name: string;
  type: 'stg' | 'cmd' | 'csv' | 'z2d';
  pointsCount: number;
  createdAt: string;
  sizeBytes: number;
  dataPoints?: QuadripolePoint[];
}

const storedFiles: Map<string, StoredFile> = new Map([
  [
    'LINEA00.stg',
    {
      name: 'LINEA00.stg',
      type: 'stg',
      pointsCount: 1248,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      sizeBytes: 158200,
    },
  ],
  [
    'DD56.cmd',
    {
      name: 'DD56.cmd',
      type: 'cmd',
      pointsCount: 396,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      sizeBytes: 42000,
    },
  ],
]);

const sseClients: Response[] = [];

function broadcastSSE(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      // client disconnected
    }
  });
}

function getIntervalMs(): number {
  const base = 300;
  const timeSec = surveyConfig.isIP ? surveyConfig.ipCycle ?? 2 : surveyConfig.measureTime ?? 1.2;
  return base + timeSec * 150;
}

function executeShotStep() {
  if (!surveySession.isRunning) return;

  if (surveySession.currentIndex >= surveySession.points.length) {
    surveySession.isRunning = false;
    if (surveySession.timer) clearInterval(surveySession.timer);
    surveySession.timer = null;
    surveySession.completedAt = Date.now();
    surveySession.activeElectrodes = { tx: [], rx: [] };

    const filename = `${surveyConfig.jobName}.stg`;
    storedFiles.set(filename, {
      name: filename,
      type: 'stg',
      pointsCount: surveySession.points.length,
      createdAt: new Date().toISOString(),
      sizeBytes: surveySession.points.length * 128,
      dataPoints: [...surveySession.points],
    });

    broadcastSSE('survey_completed', {
      totalPoints: surveySession.points.length,
      filename,
    });
    return;
  }

  const batchEnd = Math.min(surveySession.currentIndex + 8, surveySession.points.length);
  const totalLength = (surveyConfig.electrodes - 1) * (surveyConfig.spacing || 5);

  const batch: QuadripolePoint[] = [];
  for (let idx = surveySession.currentIndex; idx < batchEnd; idx++) {
    const rawPoint = surveySession.points[idx];
    const simulated = simulateShot(rawPoint, {
      totalLength,
      maxCurrent: surveyConfig.maxCurrent ?? 500,
      contactResistance: instrument.contactResistance,
      stackCycles: surveyConfig.stackCycles ?? 4,
      isIP: Boolean(surveyConfig.isIP),
    });
    surveySession.points[idx] = simulated;
    batch.push(simulated);
  }

  surveySession.currentIndex = batchEnd;
  surveySession.lastBatch = batch;

  const leadPoint = batch[0];
  const tx = [leadPoint.p[0], leadPoint.p[1]].filter((e) => e >= 0);
  const rx = Array.from(new Set(batch.flatMap((b) => [b.p[2], b.p[3]])));
  surveySession.activeElectrodes = { tx, rx };

  instrument.batteryInternal = Math.max(10.2, instrument.batteryInternal - 0.005);
  instrument.batteryExternal = Math.max(10.0, instrument.batteryExternal - 0.005);

  broadcastSSE('shot_update', {
    currentIndex: surveySession.currentIndex,
    totalPoints: surveySession.points.length,
    batch,
    activeElectrodes: surveySession.activeElectrodes,
    batteryInternal: Number(instrument.batteryInternal.toFixed(2)),
    batteryExternal: Number(instrument.batteryExternal.toFixed(2)),
  });
}

// REST Routes
app.get('/api/instrument/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    instrument: {
      ...instrument,
      batteryInternal: Number(instrument.batteryInternal.toFixed(2)),
      batteryExternal: Number(instrument.batteryExternal.toFixed(2)),
    },
  });
});

app.post('/api/instrument/connect', (req: Request, res: Response) => {
  const { action } = req.body;
  if (action === 'disconnect') {
    instrument.connected = false;
    instrument.connecting = false;
    if (surveySession.isRunning) {
      surveySession.isRunning = false;
      if (surveySession.timer) clearInterval(surveySession.timer);
      surveySession.timer = null;
    }
    broadcastSSE('instrument_state', { connected: false });
    return res.json({ status: 'ok', connected: false });
  }

  instrument.connected = true;
  instrument.connecting = false;
  broadcastSSE('instrument_state', { connected: true, connecting: false });
  res.json({ status: 'ok', connected: true });
});

app.post('/api/instrument/contact-test', (req: Request, res: Response) => {
  const count = surveyConfig.electrodes || 56;
  const cr: number[] = [];

  for (let i = 0; i < count; i++) {
    const u1 = Math.max(1e-6, Math.random());
    const u2 = Math.random();
    const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    let val = Math.exp(Math.log(1.3) + 0.38 * gauss);

    if (i === Math.floor(count * 0.31)) val = 7.4 + Math.random();
    if (i === Math.floor(count * 0.72)) val = 22.5 + Math.random() * 4;

    cr.push(Number(val.toFixed(2)));
  }

  instrument.contactResistance = cr;

  const sorted = [...cr].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const max = sorted[sorted.length - 1];
  const badElectrodes = cr
    .map((val, idx) => ({ electrode: idx + 1, resistanceKohm: val }))
    .filter((e) => e.resistanceKohm >= 5.0);

  const summary = {
    totalElectrodes: count,
    medianKohm: median,
    maxKohm: max,
    under2k: cr.filter((v) => v < 2).length,
    between2and5k: cr.filter((v) => v >= 2 && v < 5).length,
    between5and10k: cr.filter((v) => v >= 5 && v < 10).length,
    over10k: cr.filter((v) => v >= 10).length,
    badElectrodes,
    values: cr,
  };

  broadcastSSE('contact_test_results', summary);
  res.json({ status: 'ok', summary });
});

app.post('/api/instrument/receiver-test', (req: Request, res: Response) => {
  const channels = [1, 2, 3, 4, 5, 6, 7, 8].map((ch) => ({
    channel: ch,
    gainErrorPct: Number(((Math.random() - 0.5) * 0.15).toFixed(3)),
    phaseErrorMrad: Number(((Math.random() - 0.5) * 0.25).toFixed(3)),
    status: 'PASS',
  }));

  res.json({
    status: 'ok',
    message: 'Receiver test: 8 canales dentro de tolerancia (< 0.1% ganancia, < 0.2 mrad fase)',
    channels,
  });
});

app.post('/api/instrument/ip-test', (req: Request, res: Response) => {
  const windows = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'].map((win, idx) => ({
    window: win,
    timeMs: (idx + 1) * 100,
    chargeabilityMvV: Number((25 * Math.exp(-0.35 * idx) * (0.98 + 0.04 * Math.random())).toFixed(2)),
    status: 'PASS',
  }));

  res.json({
    status: 'ok',
    message: 'IP test load: ventanas M1 a M6 calibradas dentro de tolerancia',
    windows,
  });
});

app.post('/api/instrument/sp-test', (req: Request, res: Response) => {
  const channels = [1, 2, 3, 4, 5, 6, 7, 8].map((ch) => {
    const u1 = Math.max(1e-6, Math.random());
    const u2 = Math.random();
    const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return {
      channel: ch,
      potentialMv: Number((gauss * 12).toFixed(1)),
    };
  });

  res.json({
    status: 'ok',
    message: 'Auto-potencial (SP) medido en los 8 canales',
    channels,
  });
});

app.get('/api/survey/config', (req: Request, res: Response) => {
  res.json({ status: 'ok', config: surveyConfig });
});

app.post('/api/survey/config', (req: Request, res: Response) => {
  surveyConfig = { ...surveyConfig, ...req.body };
  if (surveySession.isRunning) {
    surveySession.isRunning = false;
    if (surveySession.timer) clearInterval(surveySession.timer);
    surveySession.timer = null;
  }
  surveySession.points = [];
  surveySession.currentIndex = 0;
  surveySession.lastBatch = [];

  res.json({ status: 'ok', config: surveyConfig });
});

app.post('/api/survey/sequence', (req: Request, res: Response) => {
  const config = { ...surveyConfig, ...req.body };
  const rawPoints = generateSequence(config);
  const totalLength = (config.electrodes - 1) * (config.spacing || 5);
  const zMax = rawPoints.length > 0 ? Math.max(...rawPoints.map((q) => q.z)) : 0;
  const groups8 = Math.ceil(rawPoints.length / 8);
  const intervalSec = ((config.isIP ? config.ipCycle ?? 2 : config.measureTime ?? 1.2) * 150 + 300) / 1000;
  const estimatedMin = Number(((groups8 * intervalSec) / 60).toFixed(1));

  res.json({
    status: 'ok',
    summary: {
      totalPoints: rawPoints.length,
      groupsOf8: groups8,
      estimatedMinutes: estimatedMin,
      lineLengthM: totalLength,
      approxDepthM: Number((0.2 * totalLength).toFixed(0)),
      maxPseudoDepthM: Number(zMax.toFixed(1)),
      memoryPct: Number(((rawPoints.length / (config.isIP ? 26000 : 79000)) * 100).toFixed(1)),
    },
    samplePoints: rawPoints.slice(0, 8),
  });
});

app.post('/api/survey/start', (req: Request, res: Response) => {
  if (!instrument.connected) {
    return res.status(400).json({ error: 'Equipo no conectado. Enlaza por Wi-Fi primero.' });
  }

  if (surveySession.points.length === 0 || surveySession.currentIndex >= surveySession.points.length) {
    surveySession.points = generateSequence(surveyConfig);
    surveySession.currentIndex = 0;
    surveySession.lastBatch = [];
    surveySession.startedAt = Date.now();
  }

  if (surveySession.points.length === 0) {
    return res.status(400).json({ error: 'La configuración actual no genera puntos de medición.' });
  }

  surveySession.isRunning = true;
  if (surveySession.timer) clearInterval(surveySession.timer);
  surveySession.timer = setInterval(executeShotStep, getIntervalMs());

  broadcastSSE('survey_started', {
    totalPoints: surveySession.points.length,
    currentIndex: surveySession.currentIndex,
  });

  res.json({
    status: 'ok',
    isRunning: true,
    totalPoints: surveySession.points.length,
    currentIndex: surveySession.currentIndex,
  });
});

app.post('/api/survey/pause', (req: Request, res: Response) => {
  surveySession.isRunning = false;
  if (surveySession.timer) clearInterval(surveySession.timer);
  surveySession.timer = null;

  broadcastSSE('survey_paused', { currentIndex: surveySession.currentIndex });
  res.json({ status: 'ok', isRunning: false, currentIndex: surveySession.currentIndex });
});

app.post('/api/survey/stop', (req: Request, res: Response) => {
  surveySession.isRunning = false;
  if (surveySession.timer) clearInterval(surveySession.timer);
  surveySession.timer = null;

  const finishedCount = surveySession.currentIndex;
  if (finishedCount > 0) {
    const filename = `${surveyConfig.jobName}.stg`;
    storedFiles.set(filename, {
      name: filename,
      type: 'stg',
      pointsCount: finishedCount,
      createdAt: new Date().toISOString(),
      sizeBytes: finishedCount * 128,
      dataPoints: surveySession.points.slice(0, finishedCount),
    });
  }

  broadcastSSE('survey_stopped', { currentIndex: surveySession.currentIndex });
  res.json({ status: 'ok', isRunning: false, recordedPoints: finishedCount });
});

app.post('/api/survey/step', (req: Request, res: Response) => {
  if (!instrument.connected) {
    return res.status(400).json({ error: 'Instrumento no conectado.' });
  }
  if (surveySession.points.length === 0) {
    surveySession.points = generateSequence(surveyConfig);
    surveySession.currentIndex = 0;
  }
  surveySession.isRunning = true;
  executeShotStep();
  surveySession.isRunning = false;

  res.json({
    status: 'ok',
    currentIndex: surveySession.currentIndex,
    totalPoints: surveySession.points.length,
    lastBatch: surveySession.lastBatch,
  });
});

app.post('/api/survey/remeasure', (req: Request, res: Response) => {
  const threshold = surveyConfig.errorThreshold ?? 2.0;
  const measured = surveySession.points.slice(0, surveySession.currentIndex);
  const badPoints = measured.filter((q) => q.err > threshold);

  badPoints.forEach((q) => {
    q.cycles += 4;
    q.err = Number((q.err * 0.45).toFixed(2));
  });

  broadcastSSE('remeasure_completed', {
    remeasuredCount: badPoints.length,
    threshold,
  });

  res.json({
    status: 'ok',
    remeasuredCount: badPoints.length,
    threshold,
  });
});

app.get('/api/survey/state', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    isRunning: surveySession.isRunning,
    currentIndex: surveySession.currentIndex,
    totalPoints: surveySession.points.length,
    config: surveyConfig,
    activeElectrodes: surveySession.activeElectrodes,
    lastBatch: surveySession.lastBatch,
    points: surveySession.points.slice(0, surveySession.currentIndex),
  });
});

app.get('/api/files', (req: Request, res: Response) => {
  const filesList = Array.from(storedFiles.values());
  res.json({ status: 'ok', files: filesList });
});

app.get('/api/files/:filename/export', (req: Request, res: Response) => {
  const { filename } = req.params;
  const format = (req.query.format as string) || 'z2d';

  let pointsToExport: QuadripolePoint[] = [];
  if (filename.startsWith(surveyConfig.jobName) && surveySession.currentIndex > 0) {
    pointsToExport = surveySession.points.slice(0, surveySession.currentIndex);
  } else if (storedFiles.has(filename)) {
    pointsToExport = storedFiles.get(filename)?.dataPoints ?? [];
  }

  if (pointsToExport.length === 0) {
    const fresh = generateSequence(surveyConfig);
    const totalLength = (surveyConfig.electrodes - 1) * surveyConfig.spacing;
    pointsToExport = fresh.map((p) =>
      simulateShot(p, {
        totalLength,
        maxCurrent: surveyConfig.maxCurrent ?? 500,
        contactResistance: instrument.contactResistance,
        stackCycles: surveyConfig.stackCycles ?? 4,
        isIP: Boolean(surveyConfig.isIP),
      })
    );
  }

  if (format === 'csv') {
    const csvContent = formatCSV(pointsToExport);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csvContent);
  } else if (format === 'stg') {
    const stgContent = formatSTG(surveyConfig.jobName, pointsToExport, surveyConfig);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.stg"`);
    return res.send(stgContent);
  } else if (format === 'json') {
    return res.json({
      jobName: surveyConfig.jobName,
      surveyConfig,
      points: pointsToExport,
    });
  } else {
    const z2dContent = formatZ2D(pointsToExport, surveyConfig.spacing);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.z2d"`);
    return res.send(z2dContent);
  }
});

app.post('/api/files/upload-cmd', (req: Request, res: Response) => {
  const { filename, content } = req.body;
  if (!filename || !content) {
    return res.status(400).json({ error: 'Nombre de archivo y contenido requeridos.' });
  }
  const lines = (content as string).split('\n').filter((l) => l.trim().length > 0);
  storedFiles.set(filename, {
    name: filename,
    type: 'cmd',
    pointsCount: lines.length,
    createdAt: new Date().toISOString(),
    sizeBytes: Buffer.byteLength(content, 'utf8'),
  });

  res.json({
    status: 'ok',
    message: `Archivo de comandos ${filename} guardado con éxito (${lines.length} comandos).`,
  });
});

app.get('/api/survey/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write('event: connected\ndata: {"status":"connected"}\n\n');
  sseClients.push(res);

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[SuperSting R8/IP Backend] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Backend] Failed to start server:', err);
});
