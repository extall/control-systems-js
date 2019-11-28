/***
 *  control-toolbox.js - Control Systems toolbox for JavaScript
 *  
 *  The toolbox is intended mostly for control system educators and thus
 *  supports some basic object types needed to teach modeling and control
 *  of linear systems.
 *  
 *  The syntax is intended to be similar to the MATLAB language, though some
 *  conventions are different, like matrix indexing (starts with 0).
 *  
 *  The development of the toolbox is partially supported by a
 *  TalTech teaching grant awarded to Aleksei Tepljakov in 2019.
 *  
 *  (c) 2019-2020 Aleksei Tepljakov
 *  
 *  The code is published under the MIT license. See the LICENSE file for details.
 * 
 ***/

/* Dependencies */
// lib/math.min.js
// lib/misc-math.js
// lib/jmat.min.js

"use strict";

/* Extend Array with matsize method: matrix size */
Array.prototype.matsize = function () {

    // Proper multidimensional array
    if (this[0].length !== undefined) {
        var num_rows = this.length;
        var num_cols = this[0].length;
        for (var k = 0; k < num_rows; k++) {
            if (this[k].length !== num_cols) {
                throw "Inconsistent matrix dimensions at row " + (k + 1);
            }
        }
    }
    // Vector
    else {
        var num_rows = 1;
        var num_cols = this.length;
    }

    return([num_rows, num_cols]);
};

/* Some additional functionality for pushing/popping and returning an array
 * This is useful for method chaining; maybe inefficient for larger arrays
 */
Array.prototype.pusha = function (el) {
    var arr = this.slice();
    arr.push(el);
    return arr;
};

Array.prototype.popa = function () {
    var arr = this.slice();
    arr.pop();
    return arr;
}

/* Accessing submatrices in a similar fashion to NumPy.
 * Note that only 2D Arrays are supported (each row is a subarray),
 * so the input must look like [[a,b,...],[x,y,...],...]
 * Note that this method cannot be used for assignment. For the same, you should
 * use the facilities provided in the mathjs library (e.g., concat).
 * RANGE argument: a string such as "0:,1:2" or ":" (for vectors) or ":4,:"
 * TODO: The support is not full at the moment, so taking, e.g., multiple
 * columns from matrix and combining them in a submatrix is not yet directly
 * doable.
 * 
 * For the programmatic approach, the syntax is slightly more complicated.
 * Suppose you have variables that detemine start/end ranges, but you also
 * want to use the : operator. Then, you need to call sub2d(a,b,c,d) for a 
 * matrix and sub2d(a,b) for a vector, such that pairs (a,b) and (c,d) must
 * always be specified. Here are examples for a vector (same applies to full
 * syntax):
 * 
 * A = [1,2,3];
 * A.sub2d(1,":");  // Returns [[2,3]]
 * A.sub2d(":",""); // Returns [[1,2,3]]
 * A.sub2d(":",1);  // Returns [[1,2]]
 * A.sub2d(1,1);    // Returns [[2]]
 * A.sub2d(":",-1); // Returns [[1,2]]
 */
Array.prototype.sub2d = function (a, b, c, d) {
    // We will use a syntax similar to both MATLAB and Python to figure out the
    // proper ranges that the submatrix must be cut from

    // For numeric purposes, however, we want to have the possibility to supply
    // mixed arguments. Thus, we need a few helper functions here.
    var _sr = function (a, b) {
        var the_str = "";
        if ((typeof a === 'string' || a instanceof String) && a === ":") {
            if (b !== undefined || b !== "") {
                the_str = ":" + b.toString();
            } else
            {
                the_str = ":";
            }

        } else if ((typeof b === 'string' || b instanceof String) && b === ":") {
            the_str = a.toString() + ":";
        } else
        {
            the_str = a.toString() + ":" + b.toString();
        }
        return the_str;
    };

    var _sr2 = function (a, b, c, d) {
        return _sr(a, b) + "," + _sr(c, d);
    };

    // Determine type of arguments
    var range = undefined;
    if ((typeof a === 'string' || a instanceof String) && b === undefined) {
        // Range is supplied, nothing else to do
        range = a;
    } else {
        // Otherwise, we construct the range ourselves
        if (c === undefined && d === undefined) {
            // Vector
            range = _sr(a, b);
        } else
        {
            // Matrix
            range = _sr2(a, b, c, d);
        }
    }

    var A = this.slice();

    // Need to make sure a row vector is treated properly
    if (A[0][0] === undefined) {
        A = [A];
    }

    var sizeA = A.matsize();

    // Parse the range
    var r = range.replace(/\s/g, ""); // Remove all whitespace characters

    // Check for some common errors
    if (sizeA[0] > 1 && sizeA[1] > 1 && r.indexOf(",") === -1) {
        throw "sub2d: Matrix supplied, but range specifies a (sub)vector"
    }

    // Now we decide what to do based on the range specifier
    if (r.indexOf(",") === -1) {
        // We want to cut out a vector. So we'll add ":" to the other dimension.
        if (sizeA[0] > sizeA[1]) {
            r += ",:";
        } else {
            r = ":," + r;
        }
    }

    // Now, let us parse the whole thing
    var ab = r.split(",");
    var rowr = A.sub2dparserange(ab[0], 0);
    var colr = A.sub2dparserange(ab[1], 1);

    // Create the new matrix
    var A1 = [];
    for (var k = rowr[0]; k < rowr[1] + 1; k++) {
        A1.push(A[k].slice(colr[0], colr[1] + 1));
    }

    // Acutally return the new matrix
    return A1;

};

// Helper function that parses the range and returns it
// Range is string, e.g., "1:2" or ":"; dim is dimension, 0 for rows, 1 for cols
Array.prototype.sub2dparserange = function (range, dim) {
    var mats = this.matsize();
    if (range.indexOf(":") === -1) {
        // Just duplicate the value separating it with colon
        range = range + ":" + range;
    }

    var xy = range.split(":");
    var rr = [];

    if (xy[0] === "" && xy[1] === "") {
        // The whole range must be taken
        rr = rr.pusha(0).pusha(mats[dim] - 1);
    } else if (xy[0] === "" && xy[1] !== "") {
        // Only concerned with end of range
        var en = parseInt(xy[1]);

        // If end of range is negative, take from far end of range
        en = (en >= 0 ? en : mats[dim] + en - 1);

        rr = rr.pusha(0).pusha(en);
    } else if (xy[0] !== "" && xy[1] === "") {
        // Only concerned with beginning of range
        var st = parseInt(xy[0]);
        rr = rr.pusha(st).pusha(mats[dim] - 1);
    } else {
        // Full parsing
        var st = parseInt(xy[0]);
        var en = parseInt(xy[1]);
        en = (en >= 0 ? en : mats[dim] + en - 1);
        rr = rr.pusha(st).pusha(en);
    }

    return rr;
};


// CST namespace 
var cst = cst || {};

/*****************/
/*** Constants ***/
/*****************/
cst.MAX_QR_ITERATIONS = 100;
cst.EPSILON = 1e-11; // Number.EPSILON;
cst.ROUND_RESULT_TO = 8;


/*************************/
/*** Utility functions ***/
/*************************/

// Difference function
cst.diff = function (a) { //TODO: User must be able to specify dimension
    
    // Usual checks
    a = Array.isArray(a) ? a : [a];
    a = (a[0][0] === undefined) ? [a] : a;
    
    // Now we need two vectors (basically two copies);
    // The first we truncate by the last values, and we extract one value from
    // the second one
    var a1 = a.slice();
    var a2 = a.slice();
    
    if (a.matsize()[0] > a.matsize()[1]){
        a1 = a.sub2d(":", -1, ":", "");
        a2 = a.sub2d(1, ":", ":", "");
    } else if (a.matsize()[0] < a.matsize()[1]) {
        a1 = a.sub2d(":", "", ":", -1);
        a2 = a.sub2d(":", "", 1, ":");
    } else {
        throw "diff: cannot determine the dimension to which to apply the difference operation";
    }
    
    return math.subtract(a2,a1);
};

// Cumulative sum
cst.cumsum = function(a) { //TODO: User must be able to specify dimension
    
    a = Array.isArray(a) ? a : [a];
    a = (a[0][0] === undefined) ? [a] : a;
    
    // New matrix
    var a1 = cst.zeros(a.matsize());
    
    // Which dimension should we process?
    var needTranspose = false;
    if (a.matsize()[0] > a.matsize()[1]){
        // Nothing has to be changed
    } else if (a.matsize()[0] < a.matsize()[1]) {
        // Need to transpose after
        a = math.transpose(a);
        needTranspose = true;
    } else {
        throw "cumsum: cannot determine the dimension to which to apply the cumsum operation";
    }
    
    // Compute the sum
    a1.splice(0,1,a[0]);
    var row_sum = a[0];
    for (var k=1; k<a.matsize()[0]; k++){
            var row_sum = math.add(row_sum, a[k]);
            a1.splice(k,1,row_sum);
        }
    
    if (needTranspose){
        a1 = math.transpose(a1);
    }
    
    return a1;
};

// Unwrap phase in [rad]. NB! A vector is expected! TODO: Maybe allow matrices
cst.unwrap_phase_vec = function(ph,per) {
    ph = Array.isArray(ph) ? ph : [ph];
    ph = (ph[0][0] === undefined) ? [ph] : ph;
    
    var s = ph.matsize();
    if (s[0] !== 1 && s[1] !== 1){
        throw "unwrap_phase: only vectors are supported!";
    }
    
    if (per === undefined){
        per = 2*math.PI;
    }
    var dang = cst.diff(ph);
    var dangd = math.subtract(math.mod((math.add(dang, per/2.0)), per), per/2.0);
    var corr = cst.cumsum(math.subtract(dangd, dang));

    var nph = [];
    if (ph.matsize()[0] > ph.matsize()[1]){
        nph = math.concat([[ph[0][0]]], math.add(ph.sub2d(1,":",":",""), corr), 0);
    } else if (ph.matsize()[0] < ph.matsize()[1]) {
        nph = math.concat([[ph[0][0]]], math.add(ph.sub2d(":","", 1,":"), corr));
    }else{
        throw "unwrap_phase: cannot determine the dimension to which to apply the unwrap operation";
    }
    return nph;
    
};

// Create linear range
cst.colon = function (t_start, dt, t_end) {

    // Move either forward or back
    var t_cond = (t_start < t_end) ? function (t, c) {
        return (t <= c);
    } : function (t, c) {
        return (t > c);
    };
    var t_now = t_start;
    var t = [];
    while (t_cond(t_now, t_end)) {
        t.push(math.round(t_now, cst.ROUND_RESULT_TO));
        t_now += dt;
    }
    return [t];
};

// Convert array to column vector
cst.to_colv = function (a) {
    return math.reshape(a, [a.length, 1]);
};

// Complex frequency response to magnitude and phase
cst.to_magph = function(r,opt,unw) {
    
    // Should magnitude be absolute or in dB?
    if (opt !== undefined){
        opt = opt.toLowerCase();
        if (opt !== "db" && opt !== "abs"){
            throw "to_magph: Magnitude representation option must be 'db' or 'abs'.";
        }
    }else{
        opt = "db";
    }
    
    if (unw === undefined){
        unw = false;
    }
    
    // r is expected to be either a matrix or vector
    r = Array.isArray(r) ? r : [r];
    r = ((r[0][0] !== undefined) ? r : [r]);
    
    var rmp = cst.zeros(2,r.matsize()[1]);
    
    // If we want to unwrap, do it here
    if (unw){
        var rr = cst.unwrap_phase_vec(math.arg(r));
    }
    else{
        var rr = null;
    }
    
    // Convert complex response to magnitude [dB or absolute] and phase [degrees]
    for (var k=0; k<r.matsize()[1]; k++){
        rmp[0][k] = (opt === "db" ? 20*math.log10(math.abs(r[0][k])) : math.abs(r[0][k]));
        rmp[1][k] = 180.0*(unw ? rr[0][k] : (math.arg(r[0][k])))/math.pi; // Degrees by default
    }
    
    return rmp;

};

// Identity (eye-dentity) function: create a matrix where every element is zero
// except on the main diagonal where every element is unity
cst.eye = function (n) {
    // Alias for math.identity
    if (n <= 0) {
        return [];
    } else {
        return math.identity(n).toArray();
    }
}

// Zeros matrix
cst.zeros = function (n, m) {

    var z = [];

    // Check input arguments
    if (n <= 0 || (m !== undefined && m <= 0)) {
        return z;
    }

    // If n is scalar, generate a matrix
    if (!Array.isArray(n) && m === undefined) {
        z = math.zeros(n, n).toArray();
    }
    // Otherwise use the shape provided
    else {
        if (m === undefined) {
            z = math.zeros(n[0], n[1]).toArray();
        } else {
            z = math.zeros(n, m).toArray();
        }
    }
    return z;
};

// Logarithmic space
cst.logspace = function (elo, ehi, N) {
    // Create N logarithmically spaced points
    // If N is omitted, 50 points will be generated
    if (N === undefined) {
        N = 50;
    }

    var step = (ehi - elo) / (N - 1);
    var w = cst.zeros(1, N);

    for (var k = 0; k < N; k++) {
        w[0][k] = math.pow(10, elo + step * k);
    }

    return w;
};

// Find roots of a polynomial by finding the eigenvalues of the companion matrix
// Expects the vector to be in the following form:
// for 3x^2+x-10 the vector should be [3, 1, -10].
cst.roots = function (poly) {

    // Make sure polynomial is monic
    poly = math.divide(poly, poly[0]);

    // Reverse the array
    poly.reverse();

    // Get the number of elements in poly vector
    var N = poly.length;
    var polyN1 = poly.slice(0, N - 1);

    // Create the companion matrix
    var lh = math.concat(cst.zeros(1, N - 2), cst.eye(N - 2), 0);
    var rh = math.multiply(-1, cst.to_colv(polyN1));
    var A = math.concat(lh, rh);

    // Compute and return the roots using eigenvalues
    return cst.eig(A);

};

cst.eig = function (A) {
    A = Array.isArray(A) ? A : [A];
    var a_size = A.matsize();
    if (a_size[0] !== a_size[1]) {
        throw "eig: Matrix A is not a square matrix!";
    }

    // Use the jmat library to compute the eigenvalues
    // TODO: Maybe switch to jmat from math.js?
    var eigsj = Jmat.eig(A).l;

    // Convert to proper format and round
    // NB! In case of poorly conditioned matrices, rounding may result in
    // errors. Therefore, TODO: perhaps reconsider.
    var eigs = [];
    for (var k = 0; k < eigsj.length; k++) {
        if (math.abs(eigsj[k].im) < cst.EPSILON) {
            eigs.push(math.round(eigsj[k].re, cst.ROUND_RESULT_TO));
        } else {
            eigs.push(math.Complex(
                    math.round(eigsj[k].re, cst.ROUND_RESULT_TO),
                    math.round(eigsj[k].im, cst.ROUND_RESULT_TO)
                    )
                    );
        }
    }

    return eigs;

};


/*******************************/
/*** Transfer function class ***/
/*******************************/
cst.tf = function (b, a) {

    if (!(this instanceof cst.tf)) {
        return new cst.tf(b, a);
    }

    // Convert to arrays if needed
    this.b = Array.isArray(b) ? b : [b];
    this.a = Array.isArray(a) ? a : [a];
};

// Simulate linear response
cst.tf.prototype.lsim = function (u, t) {

    // To simulate the linear reponse of the transfer function,
    // we convert it to state space representation
    var sys = this.tf2ss();
    var y = sys.lsim(u, t); // Zero initial conditions assumed
    return y;

};

// Frequency domain reponse. NB! We assume frequency is given in rad/s.
cst.tf.prototype.freqresp = function (w) {
    
    // w is expected to be either a matrix or vector
    w = Array.isArray(w) ? w : [w];
    
    // "Vector" (pure array) is provided, convert to matrix
    if (w[0][0] === undefined){
        w = [w];
    }

    // Function that precomputes complex powers at a particular frequency
    // This way, we only need to compute these for ONE polynomial instead of TWO
    var freqresp1 = function (b, a, w) {
        var ord = math.max(b.length, a.length);
        var hp = ord-1;
        var pows = cst.zeros(1,ord);
        for (var k=0; k<ord; k++){
            pows[0][k] = math.pow(math.multiply(math.complex(0,1),w),hp-k);
        }
        return pows;
    };
    
    var b = this.b;
    var a = this.a;
    
    // Preallocate frequency response
    var N = w.matsize()[1];
    var r = cst.zeros(1,N);
    
    // For each frequency, compute the ratio B/A and store it
    for (var k=0; k<N; k++){
        var pows = freqresp1(b,a,w[0][k]);
        var zp = 0;
        for (var i=0; i<b.length; i++){
            zp = math.add(zp, math.multiply(b[i], pows[0][pows[0].length-b.length+i]));
        }
        var pp = 0;
        for (var i=0; i<a.length; i++){
            pp = math.add(pp, math.multiply(a[i], pows[0][pows[0].length-a.length+i]));
        }
        // Store the complex response
        r[0][k] = math.divide(zp,pp);
    }
    
    return r;
};

// Conversion to state space model.
// We use the controller canonical form.
cst.tf.prototype.tf2ss = function () {

    // Process the vectors:
    // * Check whether tf is proper
    // * Pad the zero polynomial with zeros
    // * The pole polynomial must be monic
    // * For convenience, we also reverse the arrays

    if (this.b.length > this.a.length) {
        throw "Cannot convert improper tf to ss.";
    }

    // Padding
    var zp = this.b;
    var pp = this.a;
    var bpadN = pp.length - zp.length;
    zp = cst.zeros(1, bpadN)[0].concat(zp);

    // Making pp monic and reversing element order
    zp = math.divide(zp, pp[0]).reverse();
    pp = math.divide(pp, pp[0]).reverse();

    // Constuct the matrices
    var N = pp.length - 1;

    // State matrix
    var A = math.concat(cst.zeros(N - 1, 1), cst.eye(N - 1));
    if (A.length > 0) {
        A = math.concat(A, [math.multiply(-1, pp.slice(0, pp.length - 1))], 0);
    } else {
        A = [math.multiply(-1, pp.slice(0, pp.length - 1))];
    }

    // Input matrix
    var B = cst.zeros(N, 1).popa().pusha([1]);

    // Output matrix
    var C = [];
    for (var k = 0; k < N; k++) {
        C.push(zp[k] - pp[k] * zp[zp.length - 1]);
    }
    C = [C];

    // Direct transfer matrix
    var D = [[zp[zp.length - 1]]];

    // Finally, create the state space model
    return cst.ss(A, B, C, D);

};


/*************************/
/*** State-space class ***/
/*************************/
cst.ss = function (A, B, C, D) {

    if (!(this instanceof cst.ss)) {
        return new cst.ss(A, B, C, D);
    }

    // Make sure that we have arrays
    A = Array.isArray(A) ? A : [A];
    B = Array.isArray(B) ? B : [B];
    C = Array.isArray(C) ? C : [C];
    D = Array.isArray(D) ? D : [D];

    // Check matrix sizes // TODO: Maybe throw more helpful errors
    var a_size = A.matsize();
    if (a_size[0] !== a_size[1]) {
        throw "ss: Matrix A is not a square matrix!";
    }

    var b_size = B.matsize();
    if (a_size[0] !== b_size[0]) {
        throw "ss: Matrix A and matrix B sizes are not compatible!";
    }

    var c_size = C.matsize();
    if (a_size[0] !== c_size[1]) {
        throw "ss: Matrix A and matrix C sizes are not compatible!";
    }

    var d_size = D.matsize();
    if ((c_size[0] !== d_size[0]) || (b_size[1] !== d_size[1])) {
        throw "ss: Matrix D has an incompatible size with either B or C matrix";
    }

    // Finally store the matrices
    this.A = A;
    this.B = B;
    this.C = C;
    this.D = D;

    // Also store some useful information
    this.num_states = a_size[0];
    this.num_inputs = b_size[1];
    this.num_outputs = c_size[0];

};

// Frequency domain reponse
cst.ss.prototype.freqresp = function (w) {
    console.log("Not implemented yet.")
};

// Simulate linear response
// 
// NB! u and t are assumed to be arrays! If u is a scalar, an array will be
// created to match the length of array t. The elements of the latter must be
// evenly spaced.
// 
// The simulation method is taken from python-control toolbox
cst.ss.prototype.lsim = function (u, t, x0) {

    // Make sure t is array
    t = Array.isArray(t) ? t : [t];
    
    // However, we will treat t as Array vector, so we need to extract
    // the array from the 2d tensor.
    t = (t[0][0] !== undefined) ? t[0] : t;
    
    // If x0 is not specified, we assume zero initial conditions
    if (x0 === undefined) {
        x0 = cst.zeros(this.num_states, 1);
    } else
    {
        // Make sure we have a column vector
        x0 = cst.to_colv(x0);
    }

    if (!Array.isArray(u)) {
        u = math.add(u, cst.zeros(t.length, this.num_inputs));
    } else {
        u = cst.to_colv(u);
    }

    // Make sure u has shape (num_inputs, t.length)
    u = math.transpose(u);

    // Sampling interval
    var dt = t[1] - t[0];

    // Number of steps
    var ns = t.length;

    var ni = this.num_inputs;
    var nn = this.num_states;
    var no = this.num_outputs;

    var M0 = math.concat(math.multiply(this.A, dt),
            math.multiply(this.B, dt), cst.zeros(nn, ni));
    var M1 = math.concat(cst.zeros(ni, nn + ni), cst.eye(ni));
    var M2 = cst.zeros(ni, nn + 2 * ni);
    var M = math.concat(M0, M1, M2, 0);

    // Matrix exponential
    var expM = math.expm(M);
    expM = expM.toArray();

    // Get submatrices
    var Ad = expM.sub2d(":", nn - 1, ":", nn - 1);
    var Bd1 = expM.sub2d(":", nn - 1, nn + ni, ":");
    var Bd0 = expM.sub2d(":", nn - 1, nn, nn + ni - 1);

    Bd0 = math.add(Bd0, math.multiply(-1, Bd1));

    // Preallocate array
    // TODO: This preallocation results in 10x speedup, maybe it
    // is possible to further optimize this by using math.matrix?
    var xout = cst.zeros(nn, ns);

    // TODO: this function must be generally available
    // Replace column
    var rep_col = function (ar, i, col) {
        for (var k = 0; k < ar.length; k++) {
            ar[k][i] = col[k][0];
        }
    };

    // Replace first row
    rep_col(xout, 0, x0);

    for (var i = 1; i < ns; i++) {

        var nx0 = math.multiply(Ad, xout.sub2d(":", "", i - 1, i - 1));
        var nx1 = math.multiply(Bd0, u.sub2d(":", "", i - 1, i - 1));
        var nx2 = math.multiply(Bd1, u.sub2d(":", "", i, i));
        var new_x = math.add(nx0, nx1, nx2);

        rep_col(xout, i, new_x);
    }

    var ny0 = math.multiply(this.C, xout);
    var ny1 = math.multiply(this.D, u);

    var y_out = math.add(ny0, ny1);

    // We should return only the output, but TODO: maybe we need the evolution
    // of each state. Should figure out a flexible parameter structure
    return y_out;

};
