import { matrix, add, multiply, zeros } from 'mathjs';

/**
 * Continuous-time state space system.
 */
export class StateSpace {
  constructor(A, B, C, D) {
    this.A = matrix(A);
    this.B = matrix(B);
    this.C = matrix(C);
    this.D = matrix(D);
    const [n] = this.A.size();
    const [, m] = this.B.size();
    const [p] = this.C.size();
    this.numStates = n;
    this.numInputs = m;
    this.numOutputs = p;
  }

  lsim(u, t, x0 = zeros(this.numStates, 1)) {
    const input = Array.isArray(u) ? u : Array(t.length).fill(u);
    if (t.length < 2) {
      throw new Error('Time vector must have at least two samples');
    }
    let x = matrix(x0);
    const dt = t[1] - t[0];
    const y = [];
    for (let i = 0; i < t.length; i++) {
      const ui = toColumn(input[i], this.numInputs);
      const yi = add(multiply(this.C, x), multiply(this.D, ui));
      y.push(yi.valueOf().map(row => row[0]));
      const dx = add(multiply(this.A, x), multiply(this.B, ui));
      x = add(x, multiply(dx, dt));
    }
    return y;
  }
}

export function toColumn(value, size) {
  if (Array.isArray(value)) {
    return matrix(value.map(v => [v]));
  }
  return matrix(Array(size).fill([value]));
}

export function zerosLike(rows, cols) {
  return zeros(rows, cols);
}
