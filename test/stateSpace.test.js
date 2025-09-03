import { describe, it, expect } from 'vitest';
import { StateSpace } from '../src/stateSpace.js';

// First-order system: dx/dt = -x + u, y = x
// Input: step of 1

describe('StateSpace.lsim', () => {
  it('simulates first-order response to step input', () => {
    const A = [[-1]];
    const B = [[1]];
    const C = [[1]];
    const D = [[0]];
    const sys = new StateSpace(A, B, C, D);
    const t = Array.from({ length: 5 }, (_, i) => i * 0.1);
    const u = Array(t.length).fill(1);
    const y = sys.lsim(u, t, [[0]]);
    const expected = t.map(time => 1 - Math.exp(-time));
    for (let i = 0; i < y.length; i++) {
      expect(y[i][0]).toBeCloseTo(expected[i], 2);
    }
  });
});
