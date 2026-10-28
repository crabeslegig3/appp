import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGeometricFactor,
  generateSequence,
  calculateSyntheticSubsurfaceRho,
  simulateShot,
  formatZ2D,
  formatCSV,
} from './ert-math';

test('calculates exact Wenner geometric factor K = 2 * pi * a', () => {
  // In Wenner array with spacing 5m and multiplier s=1:
  // A=0, M=1, N=2, B=3 -> a = 5m
  // K should be 2 * Math.PI * 5 = 31.4159265...
  const k = calculateGeometricFactor(0, 3, 1, 2, 5);
  const expected = 2 * Math.PI * 5;
  assert.ok(Math.abs(k - expected) < 1e-4, `Expected ${expected}, got ${k}`);
});

test('generates Dipole-Dipole sequence with expected structure', () => {
  const points = generateSequence({
    arrayType: 'dd',
    electrodes: 28,
    spacing: 5,
    nMax: 4,
  });

  assert.ok(points.length > 0, 'Sequence should generate points');
  const first = points[0];
  assert.equal(first.p[0], 0);
  assert.equal(first.p[1], 1);
  assert.equal(first.p[2], 2);
  assert.equal(first.p[3], 3);
  assert.ok(first.k > 0, 'K must be positive');
  assert.ok(first.x >= 0, 'x midpoint must be non-negative');
  assert.ok(first.z > 0, 'z pseudo-depth must be positive');
});

test('synthetic subsurface resistivity stays within physical geological bounds', () => {
  const totalLength = 275;
  const rho1 = calculateSyntheticSubsurfaceRho(50, 10, totalLength);
  const rho2 = calculateSyntheticSubsurfaceRho(150, 20, totalLength);

  assert.ok(rho1 > 5 && rho1 < 2000, `rho1 ${rho1} is out of expected geophysical range`);
  assert.ok(rho2 > 5 && rho2 < 2000, `rho2 ${rho2} is out of expected geophysical range`);
});

test('shot simulation computes Ohm law values and IP windows', () => {
  const points = generateSequence({
    arrayType: 'dd',
    electrodes: 28,
    spacing: 5,
    nMax: 4,
  });

  const simulated = simulateShot(points[0], {
    totalLength: 135,
    maxCurrent: 500,
    contactResistance: [1.2, 1.4, 1.1, 1.0],
    stackCycles: 4,
    isIP: true,
  });

  assert.ok(simulated.rho > 0, 'Apparent resistivity must be > 0');
  assert.ok(simulated.I > 0 && simulated.I <= 500, 'Current must be within max limit');
  assert.ok(simulated.R > 0, 'Resistance must be > 0');
  assert.ok(simulated.err >= 0, 'Error must be >= 0');
  assert.equal(simulated.m?.length, 6, 'IP mode should produce 6 decay windows');
});

test('formats EarthImager z2d and CSV properly', () => {
  const points = generateSequence({
    arrayType: 'we',
    electrodes: 28,
    spacing: 5,
    nMax: 2,
  });

  const p0 = simulateShot(points[0], {
    totalLength: 135,
    maxCurrent: 400,
    contactResistance: [1.1, 1.1, 1.1, 1.1],
    stackCycles: 2,
    isIP: false,
  });

  const z2d = formatZ2D([p0], 5);
  assert.ok(z2d.startsWith('c1 p1 c2 p2 res'), 'Z2D must start with header');
  assert.ok(z2d.includes('\r\n'), 'Z2D must contain CRLF line breaks');

  const csv = formatCSV([p0]);
  assert.ok(csv.startsWith('A,B,M,N,x_m,z_m'), 'CSV must start with columns');
});
