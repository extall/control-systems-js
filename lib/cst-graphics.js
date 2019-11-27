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
            if (math.abs(math.log10(d)) 
                    - math.abs(math.floor(math.log10(d))) < Number.EPSILON) {
                return format(d);
            } else
            {
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

/*
 * Renders state space matrices using KaTeX to given selector
 * The equation is of display type \[ ... \] and is unnumbered
 */
csg.render_disp_unnum_ss = function(ss,sel){
    
    var MB = "[]"; // Matrix brackets. Maybe make an option?
    
    // Get the matrices
    var A = ss.A; var B = ss.B; var C = ss.C; var D = ss.D;
    
    // Iterate over matrices and create base for symbolic representations
    var sA = [];
    for (var k=0; k<A.length; k++){
        sA.push(A[k].join(" & "));
    }
    sA = "\\left" + MB[0] + "\\begin{array}{" 
            + new Array(A.matsize()[0]+1).join("c") 
            + "}" + sA.join("\\\\ ") + "\\end{array}" + "\\right" + MB[1]
            + "\\rm\\bf{x}";
    
    var sB = [];
    for (var k=0; k<B.length; k++){
        sB.push(B[k].join(" & "));
    }
    sB = "\\left" + MB[0] + "\\begin{array}{" 
            + new Array(A.matsize()[0]+1).join("c") 
            + "}" + sB.join("\\\\ ") + "\\end{array}" + "\\right" + MB[1]
            + "\\rm\\bf{u}";
    
    var sC = [];
    for (var k=0; k<C.length; k++){
        sC.push(C[k].join(" & "));
    }
    sC = "\\left" + MB[0] + "\\begin{array}{" 
            + new Array(A.matsize()[0]+1).join("c") 
            + "}" + sC.join("\\\\ ") + "\\end{array}" + "\\right" + MB[1]
            + "\\rm\\bf{x}";
    
    var sD = [];
    for (var k=0; k<D.length; k++){
        sD.push(D[k].join(" & "));
    }
    sD = "\\left" + MB[0] + "\\begin{array}{" 
            + new Array(A.matsize()[0]+1).join("c") 
            + "}" + sD.join("\\\\ ") + "\\end{array}" + "\\right" + MB[1]
            + "\\rm\\bf{u}";
    
    var mathstr =  "\\[ \n \\rm\\bf{\\dot x} = " + sA + "+" + sB 
            + "\\] \n\\[" + "\\rm\\bf{y} = " + sC + "+" + sD + ". \n \\]";
    
    d3.select(sel).html(mathstr);
    renderMathInElement(document.querySelector(sel));
};

/*
 * Create a LaTeX polynomial from given vector (vector = 1D array!)
 */
csg.poly2latex = function(p){
    var s = "";
    for (var k=0; k<p.length; k++){
        if (math.abs(p[k]) > cst.EPSILON){
            var num = math.round(p[k], cst.ROUND_RESULT_TO);
            s += (num > 0 ? (k === 0 ? "" : "+") : "") 
                        + ((math.abs(num) === 1 && k !== (p.length-1))? "" : num.toString())
                        + (((p.length-k-1) > 0) ? ("s" + (((p.length-k-1) !== 1) ? "^{" + ((p.length-k-1).toString() + "}") : "")) : "");
        }
    }
    return s;
};

/*
 * Renders transfer function using KaTeX to given selector
 * The equation is of display type \[ ... \] and is unnumbered
 */
csg.render_disp_unnum_tf = function(tf,sel,sysn){
    if (sysn === undefined){
        sysn = "G";
    }
    
    var mathstr = ("\\[ " + sysn + "(s)=\\frac{" + csg.poly2latex(tf.b) + "}{"
            + csg.poly2latex(tf.a) + "} \\]");
    
    d3.select(sel).html(mathstr);
    renderMathInElement(document.querySelector(sel));
};