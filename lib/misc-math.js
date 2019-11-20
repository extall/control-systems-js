/*** Misc math functions collected from various sources ***/

"use strict";

var mMath = mMath || {};

/* Eigenvalue computation contributed by
 * https://gist.github.com/bellbind/60fb876842346864baaf340cb789ad10
 */

mMath.range = function(n, f = v => v) {
    return Array.from(Array(n), (_, i) => f(i));
};

mMath.sum = function(a, f = v => v) {
    return a.reduce((r, v, i) => r + f(v, i), 0);
};

// returns hessenberg matrix: m[y][x] == 0 when y >= x + 2
mMath.householder = function(mat) {
    const n = Math.sqrt(mat.length);
    const m = Array.from(mat);
    console.assert(Number.isInteger(n));
    const idx = (x, y) => y * n + x;

    for (let k = 0; k < n - 2; k++) {
        if (Math.abs(m[idx(k, k + 1)]) < Number.EPSILON) continue;
        const u = mMath.range(n, i => i <= k ? 0 : m[idx(k, i)]);
        const sigma = Math.sign(u[k + 1]) * Math.hypot(...u);
        u[k + 1] += sigma;
        const norm = Math.sqrt(2 * sigma * u[k + 1]);
        const h = u.map(v => v / norm);
        
        const sdx = mMath.range(n, i => mMath.sum(h, (v, j) => v * m[idx(j, i)]));
        const sdy = mMath.range(n, i => mMath.sum(h, (v, j) => v * m[idx(i, j)]));
        const hdx = mMath.sum(sdx, (v, i) => v * h[i]);
        const hdy = mMath.sum(sdy, (v, i) => v * h[i]);
        const dx = sdx.map((v, i) => 2 * (v - hdx * h[i]));
        const dy = sdy.map((v, i) => 2 * (v - hdy * h[i]));
        
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
            m[idx(x, y)] -= h[y] * dy[x] + h[x] * dx[y];
        }
    }
    return m;
};

// returns upper triangler matrix: m[y][x] == 0 when y >= x + 1
mMath.qr = function(mat) {
    
    let iter = 0;
    const maxIter = 1000;
    
    const n = Math.sqrt(mat.length);
    const m = Array.from(mat);
    console.assert(Number.isInteger(n));
    const idx = (x, y) => y * n + x;
    let k = n;

    while (k >= 2 && iter <= maxIter) {
        console.log(k, m[idx(k - 2, k - 1)]);
        //console.log(mat2d(m));
        if (Math.abs(m[idx(k - 2, k - 1)]) < Number.EPSILON) {
            k--;
            continue;
        }
        
        // eigenvalue of last 2x2 sub matrix: l^2 - tr * l + det = 0
        const a = m[idx(k - 1, k - 1)], b = m[idx(k - 2, k - 1)],
              c = m[idx(k - 1, k - 2)], d = m[idx(k - 2, k - 2)];
        const tr = a * d, det = a * d - b * c;
        const disc = Math.sqrt(tr * tr - 4 * det) || 0;
        const l1 = (tr + disc) / 2, l2 = (tr - disc) / 2;
        const mu = a - (Math.abs(l1) < Math.abs(l2) ? l1 : l2);
        // (option) pre process M = M - mu * I 
        for (let i = 0; i < k; i++) m[idx(i, i)] -= mu;
        
        // init q as unit matrix
        const idxq = (x, y) => y * k + x;
        const q = Array(k * k).fill(0);
        for (let i = 0; i < k; i++) q[idxq(i, i)] = 1;
        
        // rotate to makes M => Q * R (R store to M)
        for (let i = 0; i < k - 1; i++) {
            const a1 = m[idx(i, i)], a2 = m[idx(i, i + 1)]; 
            const base = Math.hypot(a1, a2);
            const cos = base < Number.EPSILON ? 0 : a1 / base;
            const sin = base < Number.EPSILON ? 0 : a2 / base;
            // make R
            m[idx(i, i)] = base;
            m[idx(i, i + 1)] = 0;
            for (let x = i + 1; x < k; x++) {
                const e1 = m[idx(x, i)], e2 = m[idx(x, i + 1)];
                m[idx(x, i)] = e1 * cos + e2 * sin;
                m[idx(x, i + 1)] = e2 * cos - e1 * sin;
            }
            // make Q
            for (let y = 0; y < k; y++) {
                const e1 = q[idxq(i, y)], e2 = q[idxq(i + 1, y)];
                q[idxq(i, y)] = e1 * cos + e2 * sin;
                q[idxq(i + 1, y)] = e2 * cos - e1 * sin;
            }
        }

        // next M as R * Q
        for (let y = 0; y < k; y++) {
            const ry = Array.from(Array(k - y), (_, j) => m[idx(y + j, y)]);
            for (let x = 0; x < k; x++) {
                m[idx(x, y)] = mMath.sum(ry, (v, j) => v * q[idxq(x, j + y)]);
            }
        }
        
        // (option) post process M = M + mu * I
        for (let i = 0; i < k; i++) m[idx(i, i)] += mu;     
    
        // Log matrices
        console.log(q);
    
        // Iteration counter
        iter++;
    }
    return m;
};

// list of eigen values square matrix (allow non symmetric)
mMath.eigenvalues = function(mat) {
    const ut = mMath.qr(mMath.householder(mat));
    const n = Math.sqrt(ut.length);
    return mMath.range(n, i => ut[i * n + i]);
};

/* Vector convolution contributed by
 * https://gist.github.com/PhotonEE/7671999
 */

mMath.conv = function(vec1, vec2){
    var disp = 0; // displacement given after each vector multiplication by element of another vector
    var convVec = [];
    // for first multiplication
    for (j = 0; j < vec2.length ; j++){
        convVec.push(vec1[0] * vec2[j]);
    }
    disp = disp + 1;
    for (i = 1; i < vec1.length ; i++){
        for (j = 0; j < vec2.length ; j++){
            if ((disp + j) !== convVec.length){
                convVec[disp + j] = convVec[disp + j] + (vec1[i] * vec2[j])
            }
            else{
                convVec.push(vec1[i] * vec2[j]);
            }
        }
        disp = disp + 1;
    }
    return convVec;
};