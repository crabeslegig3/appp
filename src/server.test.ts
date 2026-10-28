import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { generateSequence, simulateShot, formatZ2D, formatCSV, formatSTG } from './utils/ert-math';

test('backend math and export endpoints generate complete ERT files', () => {
  const config = {
    arrayType: 'dd' as const,
    electrodes: 28,
    spacing: 5,
    nMax: 4,
  };
  const points = generateSequence(config);
  assert.ok(points.length > 10, 'Dipole-dipole should generate sufficient points');

  const simulated = points.map((p) =>
    simulateShot(p, {
      totalLength: 135,
      maxCurrent: 500,
      contactResistance: new Array(28).fill(1.5),
      stackCycles: 4,
      isIP: false,
    })
  );

  const z2d = formatZ2D(simulated, 5);
  assert.ok(z2d.includes('c1 p1 c2 p2 res'), 'z2d header present');
  assert.ok(z2d.split('\r\n').length >= points.length, 'z2d row count matches points');

  const csv = formatCSV(simulated);
  assert.ok(csv.includes('rho_ohm_m'), 'csv header present');

  const stg = formatSTG('TEST_SURVEY', simulated, config);
  assert.ok(stg.includes('SuperSting R8/IP Data File'), 'STG header present');
});
