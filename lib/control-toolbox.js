/***
 *  control-toolbox.js - Control Systems toolbox for JavaScript
 *  
 *  The toolbox is intended mostly for control system educators and thus
 *  supports some basic object types needed to teach modeling and control
 *  of linear systems.
 *  
 *  The syntax is intended to be similar to the MATLAB language.
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

// CST namespace 
var cst = cst || {};

/*****************/
/*** Constants ***/
/*****************/
cst.MAX_QR_ITERATIONS = 100;
cst.EPSILON = Number.EPSILON;


/*************************/
/*** Utility functions ***/
/*************************/

// Identity (eye-dentity) function: create a matrix where every element is zero
// except on the main diagonal where every element is unity
cst.eye = function (n) {
    // Alias for math.identity
    return math.identity(n).toArray();
}

// Zeros matrix
cst.zeros = function (n, m) {

    var z = [];

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

// Computes eigenvalues assuming complex values. If imaginary part is zero
// in both roots, returns real values
//cst.eig2x2 = function(A){
//    A = Array.isArray(A) ? A : [A];
//    var a_size = A.matsize();
//    if (a_size[0] !== a_size[1]) {
//        throw "eig: Matrix A is not a square matrix!";
//    }
//    
//    var roots = [];
//    
//    // Compute the values
//    var a = math.complex(A[0][0], 0);
//    var b = math.complex(A[0][1], 0);
//    var c = math.complex(A[1][0], 0);
//    var d = math.complex(A[1][1], 0);
//    
//    var AA = math.complex(1, 0);
//    var BB = math.multiply(-1, math.add(a, d));
//    var CC = math.add(math.multiply(a,d), math.multiply(-1,b,c));
//    
//    var B2 = math.multiply(BB, BB);
//    var AC4 = math.multiply(-4, AA, CC);
//    var UNDSQRT = math.add(B2, AC4);
//    var SQRT = math.sqrt(UNDSQRT);
//   
//    roots.push(math.divide(math.add(math.multiply(-1, BB), SQRT), 2));
//    roots.push(math.divide(math.add(math.multiply(-1, BB), math.multiply(-1, SQRT)),2));
//    
//    // Check the roots: replace complex values if needed
//    for (var k=0; k<roots.length; k++){
//        if (roots[k].im === 0){
//            roots.splice(k,1,roots[k].re);
//        }
//    }
//
//    return roots;
//};

cst.eig = function (A) {
    A = Array.isArray(A) ? A : [A];
    var a_size = A.matsize();
    if (a_size[0] !== a_size[1]) {
        throw "eig: Matrix A is not a square matrix!";
    }

    // Use the jmat library to compute the eigenvalues
    // TODO: Maybe switch to jmat from math.js?
    var eigsj = Jmat.eig(A).l;

    // Convert to proper format
    var eigs = [];
    for (var k = 0; k < eigsj.length; k++) {
        if (math.abs(eigsj[k].im) < cst.EPSILON) {
            eigs.push(eigsj[k].re);
        } else {
            eigs.push(math.Complex(eigsj[k].re, eigsj[k].im));
        }
    }

    return eigs;

//    // Simple QR decomposition based algorithm
//    var M = A.slice();
//
//    for (var k = 0; k < cst.MAX_QR_ITERATIONS; k++) {
//        var D = math.qr(M);
//        var Q = D.Q;
//        var R = D.R;
//        M = math.multiply(R, Q);
//    }
//    console.log("M,Q,R");
//    console.log(M);
//    console.log(Q);
//    console.log(R);
//
//    // Now we go along the diagonal and test the element M(i+1,i) to
//    // determine whether we should add real or complex eigenvalues
//    var k=0;
//    var eigs = [];
//    while (k < a_size[0]){
//        
//        if (k === a_size[0]-1 || math.abs(M[k+1][k]) < cst.EPSILON){
//            // Real eigenvalue
//            eigs.push(M[k][k]);
//            k++;
//        }
//        else{
//            // Complex eigenvalues
//            var roots = cst.eig2x2(
//                    [M[k].slice(k, k+2),
//                     M[k+1].slice(k, k+2)]
//                    );
//            eigs.push(roots[0]);
//            eigs.push(roots[1]);
//            k+=2;
//        }
//    }

    // mMath.eigenvalues() needs A to be flat
    // return mMath.eigenvalues(math.flatten(A));
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

};

// Frequency domain reponse
cst.tf.prototype.freqresp = function (w) {

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

// Simulate linear response
cst.ss.prototype.lsim = function (u, t) {

};

// Frequency domain reponse
cst.ss.prototype.freqresp = function (w) {

};

