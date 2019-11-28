/* 
 * This is the Control System Toolbox graphics facilities
 * At the moment, based on functionPlot due to its versatility.
 * NB! For this reason, d3.js v3 must be loaded into the environment such that
 * the window.d3v3 property must point to the d3v3 object.
 */

var csg = csg || {};
/* Dependencies */
// lib/control-toolbox.js
// lib/d3.js
// lib/function-plot.js
// lib/d3-simple-slider.min.js
// lib/mathbox-bundle.min.js
// lib/jmat.min.js
// lib/uikit.min.js
// lib/uikit-icons.min.js
// katex/*

// Function used for plotting with functionPlot
csg.plot = function (args) {
    // Store current d3 version and switch to d3v3
    window.d3v = window.d3;
    window.d3 = window.d3v3;

    // Use the functionPlot library
    var inst = functionPlot(args);

    // Restore previous d3 version
    window.d3 = window.d3v;

    // If xAxis is log, additional processing
    if (args.xAxis.type === "log") {
        var format = inst.meta.xAxis.tickFormat()
        var logFormat = function (d) {
            if (math.abs(math.abs(math.log10(d))
                - math.abs(math.floor(math.log10(d)))) < Number.EPSILON) {
                return format(d);
            } else {
                return "";
            }
        }
        // update format
        inst.meta.xAxis.tickFormat(logFormat);
        // redraw the graph
        inst.draw();
    }

    return inst;
};

// Assign unique ids to newly created elements
// WARNING: this uses a while loop. Use with caution.
// TODO: Assuming only CSG is used for plotting, can introduce a class property to hold
// information about figure numbers (MATLAB like).
csg.assign_ids = function(basename, num){
    if (num === undefined){
        num = 1;
    }
    var k=1;
    while (!d3.select("#" + basename + k).empty()) k++;
    var nb = basename + k;
    var ids = [];
    var i=1;
    for (var k=0; k<num; k++){
        while (!d3.select("#" + nb + i).empty()) i++;
        ids.push(nb + i);
        i++;
    }
    return ids;
};

// Autorange allows to find axes limits easily

// TODO: this is suboptimal. Usually the min/max vals are on the
// boundaries of the range
csg.autorange_x = function(arr){
    var minval = math.min.apply(null, arr);
    var maxval = math.max.apply(null, arr);
    return [minval, maxval];
};

csg.autorange_y = function(arr, pm){
    if (pm === undefined) pm =[-5, 5];
    var minval = math.min.apply(null, arr);
    var maxval = math.max.apply(null, arr);
    return [minval+pm[0], maxval+pm[1]];
};

// Function for plotting Bode diagrams
csg.bode = function (tf, w, sel, params) { // TODO: should be system type agnostic (support for any lti)

    // Check frequencies
    if (w === undefined){
        // Could make it automatically determine the range, but for now provide a default
        w = cst.logspace(-4,4,255);
    }

    // Plot size depends on the container. Will create two additional containers
    var conw = parseFloat(d3.select(sel).style("width"));
    var conh = parseFloat(d3.select(sel).style("height"));

    /* TODO: Layouts. For now, leave as vertical. Perhaps, a more flexible system
       for layout assignment is needed anyway (like MATLAB's figure, subplot etc.). */
    var layout = "v";
    if (params !== undefined && params.layout !== undefined) layout = params.layout;

    var conww = parseInt(conw);
    var conhh = parseInt(conh/2);

    // Must assign unique id's and append new elements
    var uniids = csg.assign_ids("bode", 2);
    d3.select(sel).html("");
    d3.select(sel).append("div").attr("id", uniids[0]).style("width", conww).style("height", conhh);
    d3.select(sel).append("div").attr("id", uniids[1]).style("width", conww).style("height", conhh);

    var rr = tf.freqresp(w);
    var mp = cst.to_magph(rr, undefined, true);
    var data1 = math.concat(math.transpose(w), math.transpose([mp[0]]));
    var fig1 = csg.plot({
        target: "#" + uniids[0],
        width: conww,
        height: conhh,
        xAxis: {
            type: "log",
            label: 'Freq [rad/s]',
            domain: csg.autorange_x(w)
        },
        yAxis: {
            label: 'Magnitude [dB]',
            domain: csg.autorange_y(mp[0], [-10,10])
        },
        grid: true,
        disableZoom: true,
        data: [{
            points: data1,
            fnType: 'points',
            graphType: 'polyline'
        }]
    });

    var data2 = math.concat(math.transpose(w), math.transpose([mp[1]]));

    var fig2 = csg.plot({
        target: "#" + uniids[1],
        width: conww,
        height: conhh,
        xAxis: {
            type: "log",
            label: 'Freq [rad/s]',
            domain: csg.autorange_x(w)
        },
        yAxis: {
            label: 'Phase [deg]',
            domain: csg.autorange_y(mp[1], [-10,10])
        },
        grid: true,
        disableZoom: true,
        data: [{
            points: data2,
            fnType: 'points',
            graphType: 'polyline'
        }]
    });

    return [fig1, fig2];
};

/*
 * Renders state space matrices using KaTeX to given selector
 * The equation is of display type \[ ... \] and is unnumbered
 */
csg.render_disp_unnum_ss = function (ss, sel) {

    var MB = "[]"; // Matrix brackets. Maybe make an option?

    // Get the matrices
    var sA = csg.matrix2latex(ss.A, MB) + "\\rm\\bf{x}";
    var sB = csg.matrix2latex(ss.B, MB) + "\\rm\\bf{u}";
    var sC = csg.matrix2latex(ss.C, MB) + "\\rm\\bf{x}";
    var sD = csg.matrix2latex(ss.D, MB) + "\\rm\\bf{u}";

    var mathstr = "\\[ \n \\rm\\bf{\\dot x} = " + sA + "+" + sB
        + "\\] \n\\[" + "\\rm\\bf{y} = " + sC + "+" + sD + "\n \\]";

    d3.select(sel).html(mathstr);
    renderMathInElement(document.querySelector(sel));
};

/*
 * Create a LaTeX matrix using array
 */
csg.matrix2latex = function (m, delim) {

    // Delimiters
    if (delim === undefined) {
        delim = "[]";
    }

    var sm = [];
    for (var k = 0; k < m.length; k++) {
        sm.push(m[k].join(" & "));
    }
    sm = sm.join("\\\\ ");
    sm = ((delim && delim.length > 1) ? ("\\left" + delim[0]) : "")
        + "\\begin{array}{" + new Array(m.matsize()[1] + 1).join("c") + "}"
        + sm + "\\end{array}" + ((delim && delim.length > 1) ? ("\\right" + delim[1]) : "");

    return sm;
};

/*
 * Create a LaTeX polynomial from given vector (vector = 1D array!)
 */
csg.poly2latex = function (p) {
    var s = "";
    for (var k = 0; k < p.length; k++) {
        if (math.abs(p[k]) > cst.EPSILON) {
            var num = math.round(p[k], cst.ROUND_RESULT_TO);
            s += (num > 0 ? (k === 0 ? "" : "+") : "")
                + ((math.abs(num) === 1 && k !== (p.length - 1)) ? "" : num.toString())
                + (((p.length - k - 1) > 0) ? ("s" + (((p.length - k - 1) !== 1) ? "^{"
                    + ((p.length - k - 1).toString() + "}") : "")) : "");
        }
    }
    return s;
};

/*
 * Renders transfer function using KaTeX to given selector
 * The equation is of display type \[ ... \] and is unnumbered
 */
csg.render_disp_unnum_tf = function (tf, sel, sysn) {
    if (sysn === undefined) {
        sysn = "G";
    }

    var mathstr = ("\\[ " + sysn + "(s)=\\frac{" + csg.poly2latex(tf.b) + "}{"
        + csg.poly2latex(tf.a) + "} \\]");

    d3.select(sel).html(mathstr);
    renderMathInElement(document.querySelector(sel));
};