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
    while (match !== null) {
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

// Parse a single (FO)TF potentially with a delay term. Returns strings corresponding to a (fo)tf
// That will need to be parsed later.
csl.parse_fotf_get_string = function(latex){
    // We assume that there is only ONE (fo)tf in the string. We use a parser.
    // TODO: Actually, to make it super robust, we need a proper (multi)TF detector. Right now
    // TODO: the parser will not understand something like "1/s 15/(s+1)" or even "s+1". It will just use the first
    // TODO: found \frac and think that it's the beginning of a transfer function.
    var begin_tf = latex.indexOf("\\frac");
    if (begin_tf === -1){
        return null; // Cannot find a fraction, transfer function detection failed
    }

    var rest_latex = latex.substr(begin_tf + "\\frac".length);
    // Now we need to locate the zero and pole polynomial groups...
    var zero_poly_locs = csl.get_latex_group(rest_latex);
    if (zero_poly_locs.open === -1 || zero_poly_locs.close === -1){
        return null;
    }
    var pole_poly_locs = csl.get_latex_group(rest_latex.substr(zero_poly_locs.close+1));
    if (pole_poly_locs.open === -1 || pole_poly_locs.close === -1){
        return null;
    }
    var zero_poly = zero_poly_locs.group;
    var pole_poly = pole_poly_locs.group;

    // Get the delay term // TODO: commong fractions \frac{a}{b} ARE NOT supported right now.
    var io_delay = "";
    var myregexp = /(e|\\rm{e})(\s+?)?\^(\s+?)?{(\s+?)?\-(([0-9]+?)?(\.|,)?([0-9]+?)?)?(\s+?)?(\*|\\cdot)?(\s+?)?s(\s+?)?}/g;
    var match = myregexp.exec(latex);
    if (match !== null) {
        io_delay = match[5];
    }

    return {"zero_poly": zero_poly, "pole_poly": pole_poly, "io_delay": io_delay};
}

// Helper function: parse the string group by counting curly braces. Returns the inner content
csl.get_latex_group = function(str){
    // FLAGS
    var flags = {"found_first_brace": false, "done": false};
    var l = 0; // Location
    var c = 0; // Brace counter
    var locs = {"open": -1, "close": -1, "group": null}; // The group locations and the group itself (no braces)
    while (l <= str.length && !flags.done){

        // Opening brace
        if (str[l] === "{"){
            if (!flags.found_first_brace){
                flags.found_first_brace = true;
                locs.open = l;
            }else{
                c++;
            }
        }

        // Closing brace
        if (str[l] === "}" && flags.found_first_brace){
            if (c === 0){
                locs.close = l;
                flags.done = true;
            }else{
                c--;
            }
        }

        l++;
    }

    // Add the group to locs
    locs.group = str.substr(locs.open+1, locs.close-1);
    return locs;
}