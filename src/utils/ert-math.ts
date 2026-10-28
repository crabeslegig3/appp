/**
 * Pure ERT and IP mathematical models, geometric factor calculations,
 * sequencing, and standard geophysical file formatting.
 */

export type ElectrodeArrayType = 'dd' | 'pd' | 'we' | 'sc';

export interface QuadripolePoint {
  index: number;
  p: [number, number, number, number]; // [A, B, M, N]
  t: number;
  r: number;
  x: number;
  z: number;
  k: number;
  rho: number;
  R: number;
  I: number;
  V: number;
  vt: number;
  err: number;
  cycles: number;
  m: number[] | null;
  timestamp?: number;
}

export interface SequenceConfig {
  arrayType: ElectrodeArrayType;
  electrodes: number;
  spacing: number;
  nMax: number;
  maxCurrent?: number;
  measureTime?: number;
  isIP?: boolean;
  ipCycle?: number;
  stackCycles?: number;
  errorThreshold?: number;
}

export function calculateGeometricFactor(
  A: number,
  B: number,
  M: number,
  N: number,
  spacing: number
): number {
  const dist = (u: number, v: number) => Math.abs(u - v) * spacing;

  let s = 1 / dist(A, M) - 1 / dist(A, N);
  if (B >= 0) {
    s += 1 / dist(B, N) - 1 / dist(B, M);
  }

  const denominator = Math.abs(s);
  if (denominator < 1e-12) return 1.0;
  return (2 * Math.PI) / denominator;
}

export function generateSequence(config: SequenceConfig): QuadripolePoint[] {
  const { arrayType, electrodes: N_el, spacing, nMax } = config;
  const rawP: [number, number, number, number][] = [];

  if (arrayType === 'dd') {
    for (let i = 0; i < N_el; i++) {
      for (let n = 1; n <= nMax; n++) {
        if (i + 2 + n < N_el) {
          rawP.push([i, i + 1, i + 1 + n, i + 2 + n]);
        }
      }
    }
  } else if (arrayType === 'pd') {
    for (let i = 0; i < N_el; i++) {
      for (let n = 1; n <= nMax; n++) {
        if (i + n + 1 < N_el) {
          rawP.push([i, -1, i + n, i + n + 1]);
        }
      }
    }
  } else if (arrayType === 'we') {
    for (let s = 1; s <= nMax; s++) {
      for (let i = 0; i + 3 * s < N_el; i++) {
        rawP.push([i, i + 3 * s, i + s, i + 2 * s]);
      }
    }
  } else {
    for (let s = 1; s <= nMax; s++) {
      for (let i = 0; i + 2 * s + 1 < N_el; i++) {
        rawP.push([i, i + 2 * s + 1, i + s, i + s + 1]);
      }
    }
  }

  return rawP.map((p, idx) => {
    const [A, B, M, N] = p;
    const t = B < 0 ? A : (A + B) / 2;
    const r = (M + N) / 2;
    const x = ((t + r) / 2) * spacing;
    const z = 0.35 * Math.abs(r - t) * spacing;
    const k = calculateGeometricFactor(A, B, M, N, spacing);

    return {
      index: idx,
      p,
      t,
      r,
      x,
      z,
      k,
      rho: 0,
      R: 0,
      I: 0,
      V: 0,
      vt: 0,
      err: 0,
      cycles: 0,
      m: null,
    };
  });
}

export function calculateSyntheticSubsurfaceRho(
  x: number,
  z: number,
  totalLength: number
): number {
  const g = (a: number, b: number, w: number, h: number) =>
    Math.exp(-(((x - a) / w) ** 2 + ((z - b) / h) ** 2));

  const baseline = Math.log(90) + 0.3 * Math.min(z / (totalLength * 0.08), 1.5);
  const conductiveBody = -1.9 * g(0.3 * totalLength, 0.07 * totalLength, 0.1 * totalLength, 0.05 * totalLength);
  const resistiveBody = 1.7 * g(0.68 * totalLength, 0.1 * totalLength, 0.12 * totalLength, 0.07 * totalLength);

  return Math.exp(baseline + conductiveBody + resistiveBody);
}

export function simulateShot(
  point: QuadripolePoint,
  options: {
    totalLength: number;
    maxCurrent: number;
    contactResistance: number[];
    stackCycles: number;
    isIP: boolean;
    noiseScale?: number;
  }
): QuadripolePoint {
  const { totalLength, maxCurrent, contactResistance, stackCycles, isIP, noiseScale = 1.0 } = options;
  const [A, B] = point.p;

  const rA = contactResistance[A] ?? 1.3;
  const rB = B >= 0 ? (contactResistance[B] ?? 1.3) : 0.5;
  const rc = (rA + rB) * (0.92 + 0.16 * Math.random());

  const u1 = Math.max(1e-6, Math.random());
  const u2 = Math.random();
  const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  const baseRho = calculateSyntheticSubsurfaceRho(point.x, point.z, totalLength);
  const rho = Math.max(0.5, baseRho * Math.exp(0.025 * gauss * noiseScale));

  const currentMA = Math.min(maxCurrent, Math.max(10, 400 / rc)) * (0.94 + 0.06 * Math.random());
  const R = rho / point.k;
  const V_mV = R * currentMA;
  const vt = Math.min(800, 2 * (currentMA / 1000) * (rc * 1000));

  const rawErr = (0.5 + 6 / (1 + Math.max(0.01, V_mV))) * (0.6 + 0.8 * Math.random()) * noiseScale;
  const err = Math.min(60, Math.max(0.05, rawErr / Math.sqrt(Math.max(1, stackCycles))));

  let m: number[] | null = null;
  if (isIP) {
    const baseChargeability = 8 + 28 * Math.random();
    m = [0, 1, 2, 3, 4, 5].map((j) =>
      Number((baseChargeability * Math.exp(-0.35 * j) * (0.95 + 0.1 * Math.random())).toFixed(2))
    );
  }

  return {
    ...point,
    rho: Number(rho.toPrecision(5)),
    R: Number(R.toPrecision(5)),
    I: Number(currentMA.toFixed(1)),
    V: Number(V_mV.toPrecision(5)),
    vt: Number(vt.toFixed(1)),
    err: Number(err.toFixed(2)),
    cycles: stackCycles,
    m,
    timestamp: Date.now(),
  };
}

export function formatZ2D(points: QuadripolePoint[], spacing: number): string {
  const formatExp = (x: number): string => {
    const [mantissa, exponent] = x.toExponential(14).split('e');
    const expNum = Number(exponent);
    const sign = expNum < 0 ? '-' : '+';
    const padded = String(Math.abs(expNum)).padStart(4, '0');
    return `${mantissa}E${sign}${padded}`;
  };

  const hasRemote = points.some((q) => q.p[1] < 0);
  const header = `c1 p1 ${hasRemote ? '*c2' : 'c2'} p2 res \r\n`;

  const rows = points.map((q) => {
    const [A, B, M, N] = q.p;
    const dist = (u: number, v: number) => Math.abs(u - v);
    let s = 1 / dist(A, M) - 1 / dist(A, N);
    if (B >= 0) s += 1 / dist(B, N) - 1 / dist(B, M);
    const sign = Math.sign(s) || 1;

    const c1 = A * spacing;
    const p1 = M * spacing;
    const c2 = B < 0 ? '*' : B * spacing;
    const p2 = N * spacing;
    const res = sign * q.R;

    const c1Str = ` ${formatExp(c1)} `;
    const p1Str = ` ${formatExp(p1)} `;
    const c2Str = typeof c2 === 'number' ? ` ${formatExp(c2)} ` : ` * `;
    const p2Str = ` ${formatExp(p2)} `;
    const resStr = `${res < 0 ? '-' : ' '}${formatExp(Math.abs(res))} `;

    return `${c1Str}${p1Str}${c2Str}${p2Str}${resStr}\r\n`;
  });

  return header + rows.join('');
}

export function formatCSV(points: QuadripolePoint[]): string {
  const header = 'A,B,M,N,x_m,z_m,rho_ohm_m,dV_I_ohm,I_mA,V_mV,err_pct,cycles,m1,m2,m3,m4,m5,m6\n';
  const rows = points.map((q) => {
    const [A, B, M, N] = q.p;
    const bStr = B < 0 ? 'REMOTE' : String(B + 1);
    const mStr = q.m ? q.m.join(',') : ',,,,,';
    return `${A + 1},${bStr},${M + 1},${N + 1},${q.x.toFixed(2)},${q.z.toFixed(2)},${q.rho},${q.R},${q.I},${q.V},${q.err},${q.cycles},${mStr}`;
  });
  return header + rows.join('\n') + '\n';
}

export function formatSTG(
  jobName: string,
  points: QuadripolePoint[],
  config: SequenceConfig
): string {
  const lines: string[] = [
    `! SuperSting R8/IP Data File v4.2`,
    `! Job: ${jobName}`,
    `! Date: ${new Date().toISOString()}`,
    `! Electrodes: ${config.electrodes}, Spacing: ${config.spacing}m, Array: ${config.arrayType.toUpperCase()}`,
    `! Total Points: ${points.length}`,
    `! Col: Index, A, B, M, N, AppRes(Ohm-m), Resistance(Ohm), Current(mA), Voltage(mV), Error(%), Cycles`,
  ];

  points.forEach((q) => {
    const [A, B, M, N] = q.p;
    const bStr = B < 0 ? '-1' : String(B + 1);
    lines.push(
      `${q.index + 1},${A + 1},${bStr},${M + 1},${N + 1},${q.rho},${q.R},${q.I},${q.V},${q.err},${q.cycles}`
    );
  });

  return lines.join('\r\n') + '\r\n';
}
