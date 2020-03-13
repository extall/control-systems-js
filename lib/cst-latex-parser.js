/*
 * This is the Control System Toolbox LaTeX parser
 * supporting a very limited (but necessary) subset of
 * LaTeX math expressions
 */

/* Dependencies */
// /lib/cas/*

var csl = csl || {};

// Parse a "classical" polynomial expression: only integer-order exponents are allowed
// We allow to skip multiplication signs
// So this is good for handwriting recognition
csl.parse_cpoly = function(poly, sym){

    // This is the default variable substitute
    // and will be used for processing the expression.
    var DEFAULT_VAR = "@";

    if (sym === undefined){
        sym = "x";
    }
    else{
        // Only lowercase variables accepted
        if (sym.length > 1){
            throw("Variable must be represented by a single character.");
        }
        sym = sym.toLowerCase();
    }

    // *** Preparse the expression ***

    // Replace all parentheses, remove white space, and the symbol itself
    poly = poly.replace(/\{/g, "(")
        .replace(/\[/g, "(")
        .replace(/\}/g, ")")
        .replace(/\]/g, ")")
        .replace(/\s/g,"")
        .replace(new RegExp(sym, 'g'), DEFAULT_VAR);

    // Add missing multiplication signs
    var myregexp = /([+-]?\d+([\.,]\d+)?([Ee]-?\d+)?|[a-z]+)\@/g;
    var match = myregexp.exec(poly);
    while (match != null) {
        poly = poly.replace(match[0], match[0].replace("@", "*@"));
        match = myregexp.exec(poly);
    }

    // Resolve bracket and operator multiplication
    poly = poly.replace(/\)\(/g, ")*(")
        .replace(/\@\(/g, "@*(")
        .replace(/\)\@/g, ")*@");

    // Substitute the variable back
    poly = poly.replace(new RegExp(DEFAULT_VAR, 'g'), sym);

    // *** Construct an array of polynomial coefficients using a CAS ***
    var parsed = nerdamer.coeffs(poly, sym);

    var coeffs = [];
    var i=0;
    var coeff = nerdamer.vecget(parsed,i);
    while (coeff.toString() !== ""){
        coeffs.unshift(coeff.toString());
        i++; coeff = nerdamer.vecget(parsed,i);
    }

    // We will return not only the symbolic array, but also
    // the numeric one, if we can convert it to floating point numbers using eval
    try {
        var coeff_floats = coeffs.map(x => eval(x));
    }
    catch(err){
        console.log("There are unresolved symbols in the expression, cannot provide floats array.");
    }

    // Return the coefficient object
    return {"coeffs": coeffs, "floats": coeff_floats};

};

// Parse a TF expression in LaTeX form of, e.g.,
// G(s)=\frac{1+s}{3.5 s^{2}+12}

csl.parse_tf = function(latex){

    // Remove whitespace. Not always safe with LaTeX, but assuming
    // the LaTeX pattern we expect, should be fine to do it
    latex = latex.replace(/ /g, "");
    console.log(latex);

    // Identify the pattern
    var myregexp = /([A-Z])\(([a-z])\)=\\frac\{(.+)\}\{(.+)\}/g;
    var match = myregexp.exec(latex);

    if (match){
        var parsed = {};
        parsed.fun_name = match[1];
        parsed.var_name = match[2];
        parsed.zeros_poly = csl.parse_cpoly(match[3], parsed.var_name);
        parsed.poles_poly = csl.parse_cpoly(match[4], parsed.var_name);
    }

    return parsed;
};