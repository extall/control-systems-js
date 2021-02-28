/* 
 * This is the Control System Toolbox graphics facilities
 * At the moment, based on functionPlot due to its versatility.
 * NB! For this reason, d3.js v3 must be loaded into the environment such that
 * the window.d3v3 property must point to the d3v3 object.
 */

// Some definitions
var CSG_DRAWING_CANVAS_CLASS = "csg-drawing-canvas";

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

// Handle mouse down events
csg.mouseDown = 0;
window.onload = function () {
    document.body.onmousedown = function () {
        csg.mouseDown = 1;
    };
    document.body.onmouseup = function () {
        csg.mouseDown = 0;
    };
};

// Helper: get container width and height (these are assumed to be specified!)
csg.getconthw = function (sel) {
    var conw = parseFloat(d3.select(sel).style("width"));
    var conh = parseFloat(d3.select(sel).style("height"));
    return {"width": conw, "height": conh};
};

// Helper: touch events the easy way: using slightly modified code from
// https://stackoverflow.com/questions/1517924/javascript-mapping-touch-events-to-mouse-events
csg.touchHandler = function()
{
    var event = d3.event;
    var touches = event.changedTouches,
        first = touches[0],
        type = "";

    switch(event.type)
    {
        case "touchstart": type = "mousedown"; break;
        case "touchmove":  type = "mousemove"; break;
        case "touchend":   type = "mouseup";   break;
        default: return;
    }

    // initMouseEvent(type, canBubble, cancelable, view, clickCount,
    //                screenX, screenY, clientX, clientY, ctrlKey,
    //                altKey, shiftKey, metaKey, button, relatedTarget);

    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1,
        first.screenX, first.screenY,
        first.clientX, first.clientY, false,
        false, false, false, 0/*left*/, null);

    first.target.dispatchEvent(simulatedEvent);
    event.preventDefault();
};

// Helper: locate index of the value closest to this point in a time vector
csg.t_closest = function (x, t) {

    // Assuming t is formed by entries [t0, t0+dt, t1+2*dt, ...], it is easy to find the index
    var ind = parseInt(x / (t[t.length - 1] - t[0]) * (t.length - 1));

    // Clip this value to ensure we are still within array index bounds
    ind = (ind < 0) ? 0 : ind;
    ind = (ind > (t.length-1)) ? (t.length-1) : ind;

    // Finally return the index
    return ind;
};

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
        var format = inst.meta.xAxis.tickFormat();
        var logFormat = function (d) {
            if (math.abs(math.abs(math.log10(d))
                - math.abs(math.floor(math.log10(d)))) < Number.EPSILON) {
                return format(d);
            } else {
                return "";
            }
        };
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
csg.assign_ids = function (basename, num) {
    if (num === undefined) {
        num = 1;
    }
    var k = 1;
    while (!d3.select("#" + basename + k).empty()) k++;
    var nb = basename + k;
    var ids = [];
    var i = 1;
    for (var k = 0; k < num; k++) {
        while (!d3.select("#" + nb + i).empty()) i++;
        ids.push(nb + i);
        i++;
    }
    return ids;
};

// Autorange allows to find axes limits easily

// TODO: this is suboptimal. Usually the min/max vals are on the
// boundaries of the range
csg.autorange_x = function (arr) {
    var minval = math.min.apply(null, arr);
    var maxval = math.max.apply(null, arr);
    return [minval, maxval];
};

csg.autorange_y = function (arr, pm) {

    var minval = math.min.apply(null, arr);
    var maxval = math.max.apply(null, arr);

    // We extend the range +/- 5% of (max-min).
    if (pm === undefined){
        var addr = .05 * (maxval-minval);
        pm = [-addr, addr];
    }

    // On the other hand, if resulting PM is zero, we default to [-1, 1]
    if (math.max.apply(null, pm) === 0){
        pm = [-1, 1];
    }

    return [minval + pm[0], maxval + pm[1]];
};

/* Draw a time series plot */
csg.timeseries = function (t, u, sel, params = undefined, existing = undefined) {

    // Convert vectors if needed
    t = (t.matsize()[0] < t.matsize()[1]) ? cst.to_colv(t) : t;
    u = (u.matsize()[0] < u.matsize()[1]) ? cst.to_colv(u) : u;

    // TODO: now I also get array versions of these, this is clearly suboptimal
    var tv = math.transpose(t)[0];
    var uv = math.transpose(u)[0];

    if (t.matsize()[0] !== u.matsize()[0]) {
        throw("Vectors submitted to time series plot must be the same length.")
    }

    var wh = csg.getconthw(sel);

    // Check if there are existing IDs
    var uniids = undefined;
    if (existing !== undefined){
        uniids = existing.uniids;
    }
    else
    {
        uniids = csg.assign_ids("csg-timeseries-", 1);
    }

    d3.select(sel).html("");
    d3.select(sel).append("div").attr("id", uniids[0]).style("width", wh["width"]).style("height", wh["height"]);

    var xlabel = "Time [s]";
    if (params !== undefined && params.xlabel !== undefined) xlabel = params.xlabel;

    var ylabel = "Variable: u";
    if (params !== undefined && params.ylabel !== undefined) ylabel = params.ylabel;

    var color = "blue";
    if (params !== undefined && params.color !== undefined) color = params.color;

    var graphtype = 'polyline';
    if (params !== undefined && params.graphType !== undefined) graphtype = params.graphType;

    var toplot = math.concat(t, u);

    // The actual graph data
    var the_data = [];

    var range_x = undefined;
    var range_y = undefined;

    // Defining the range
    if (params !== undefined && params.xLim !== undefined){
        range_x = params.xLim;
    }
    else{
        range_x = csg.autorange_x(tv);
    }

    if (params !== undefined && params.yLim !== undefined){
        range_y = params.yLim;
    }
    else{
        range_y = csg.autorange_y(uv);
    }

    // TODO: Quick fix to create multiple overlaid plots, should be more flexible
    if (existing !== undefined){
        // Instead of creating an entirely new figure, we add to the current one, changing some data
        // TODO: autoranging will not work as we need to compare all data to get max extent
        // TODO: so, old range for datas will be used
        existing.options.data.forEach(el => the_data.push(el));

        // Keep old range
        range_x = existing.options.xAxis.domain;
        range_y = existing.options.yAxis.domain;
    }

    // Push the current graph
    the_data.push(
        {
            points: toplot,
            fnType: 'points',
            graphType: graphtype,
            color: color
        }
    );

    // Create the plot
    var fig1 = csg.plot({
        target: "#" + uniids[0],
        width: wh["width"],
        height: wh["height"],
        xAxis: {
            label: xlabel,
            domain: range_x
        },
        yAxis: {
            label: ylabel,
            domain: range_y
        },
        grid: true,
        disableZoom: true,
        data: the_data
    });

    // Set up uniids for future use
    fig1.uniids = uniids;

    return fig1;

};

// Drawable timeseries: given a time vector, draw the response manually
// NB! Works well with about 1000 points. If you need better resolution,
// use this amount of points and apply interpolation afterwards
// BACKGROUND should be an array having lines/styles that should be plotted as background
// (for example to help the user). {t: t, u: u, color: linecolor, graphType: graphType}
csg.draw_timeseries = function (t, sel, params = undefined, background = undefined) {
    // Make sure we have needed shapes
    t = cst.to_colv(t);
    var u = cst.zeros(t.matsize()[0], 1);

    // Create the initial plot
    var drawable_plot = csg.timeseries(t, u, sel, params);

    // Create background plots

    // Append helper plots
    if (background !== undefined){
        background.forEach(el => {
                drawable_plot = csg.timeseries(el.t, el.u, sel, el, drawable_plot);
            }
        );
    }

    // Disallow selection of text
    d3.select(sel).classed("no-select", true);

    // Add new data to plot
    drawable_plot.userdata = {};
    drawable_plot.userdata.handle = drawable_plot;
    drawable_plot.userdata.last_point = undefined;

    // Additional functions

    // Get: returns the current data
    drawable_plot.userdata.get_data = function(){
        return this.handle.options.data[0]["points"];
    };

    // Create the drawing event
    drawable_plot.on("mousemove", function (params) {

        // Only operate when left mouse button is pressed
        if (csg.mouseDown === 0) {
            drawable_plot.userdata.last_point = undefined;
            return;
        }

        var x = params["x"];
        var y = params["y"];
        var ind = csg.t_closest(x, t);

        // Current point
        var pt = [x, y];

        // Update for range only if point was previously saved
        if (this.userdata.last_point !== undefined){

            // Have to linear-interpolate between points since the user
            // may move the mouse faster than the application is able to update
            var lpt = this.userdata.last_point;

            // Get point coordinates in the correct order
            var t1 = (pt[0] < lpt[0]) ? pt[0] : lpt[0];
            var u1 = (pt[0] < lpt[0]) ? pt[1] : lpt[1];
            var t2 = (lpt[0] > pt[0]) ? lpt[0] : pt[0];
            var u2 = (lpt[0] > pt[0]) ? lpt[1] : pt[1];

            // Get start/end indices
            var ind1 = csg.t_closest(t1, t);
            var ind2 = csg.t_closest(t2, t);

            // Is it the same point?
            if ((ind2 - ind1) === 0){
                this.options.data[0]["points"][ind1] = [t[ind][0], pt[1]];
            }
            else{
                // Or a range of points?
                var diff = (u2-u1)/(ind2-ind1);
                for (var k=ind1; k<=ind2; k++){
                    this.options.data[0]["points"][k] = [t[k][0], u1+(diff*(k-ind1))];
                }
            }
        }else{
            // Update single point at index
            this.options.data[0]["points"][ind] = [t[ind][0], y];
        }

        // Store last point
        this.userdata.last_point = pt;

        // Redraw the data
        this.draw();
    });

    drawable_plot.on("mouseout", function (params) {
        this.userdata.last_point = undefined;
    });

    // Handle touch as well
    var s = d3.select(sel);
    s.on("touchstart", csg.touchHandler, true);
    s.on("touchmove", csg.touchHandler, true);
    s.on("touchend", csg.touchHandler, true);
    s.on("touchcancel", csg.touchHandler, true);

    return drawable_plot;
};

// Drawable canvas. This can be used for drawing notes etc
// and also for handwriting recognition with, e.g., MathPix API.
csg.draw_canvas = function(sel){

    // Create and attach the canvas to its container
    var wh = csg.getconthw(sel);
    var canvas = d3.select(sel).append("canvas")
        .classed(CSG_DRAWING_CANVAS_CLASS, true)
        .attr("width", wh["width"])
        .attr("height", wh["height"]);

    // Store the canvas and context
    this.canvas = canvas.node();
    this.canvas_context = this.canvas.getContext("2d");

    // Attach events
    var self = this;
    canvas.on("mousedown", function(){
        this.le = d3.event; // Store last event info
    })
        .on("mousemove", function(){
            if (csg.mouseDown){

                var rect = this.getBoundingClientRect();

                var oxMove = this.le.pageX - rect.left - this.clientLeft - window.pageXOffset;
                var oyMove = this.le.pageY - rect.top - this.clientTop - window.pageYOffset;

                var oxLine = d3.event.pageX - rect.left - this.clientLeft - window.pageXOffset;
                var oyLine = d3.event.pageY - rect.top - this.clientTop - window.pageYOffset;

                self.canvas_context.beginPath();
                self.canvas_context.moveTo(oxMove, oyMove);
                self.canvas_context.lineTo(oxLine, oyLine);
                self.canvas_context.strokeStyle = "#000";
                self.canvas_context.lineWidth = 3;
                self.canvas_context.lineCap = 'round';
                self.canvas_context.stroke();
                this.le = d3.event;
            }
        });

    // Add the handlers for touch events
    canvas.on("touchstart", csg.touchHandler, true)
        .on("touchmove", csg.touchHandler, true)
        .on("touchend", csg.touchHandler, true)
        .on("touchcancel", csg.touchHandler, true);

    // Clear the canvas
    this.clear();
};

csg.draw_canvas.prototype.clear = function(){
    this.canvas_context.fillStyle = "white";
    this.canvas_context.fillRect(0, 0, this.canvas.width, this.canvas.height);
}

csg.draw_canvas.prototype.get_image_base64 = function(){
    return this.canvas.toDataURL();
};

// Function for plotting Bode diagrams
csg.bode = function (tf, w, sel, params) { // TODO: should be system type agnostic (support for any lti)

    // Check frequencies
    if (w === undefined) {
        // Could make it automatically determine the range, but for now provide a default
        w = cst.logspace(-4, 4, 255);
    }

    // Plot size depends on the container. Will create two additional containers
    var wh = csg.getconthw(sel);

    /* TODO: Layouts. For now, leave as vertical. Perhaps, a more flexible system
       for layout assignment is needed anyway (like MATLAB's figure, subplot etc.). */
    var layout = "v";
    if (params !== undefined && params.layout !== undefined) layout = params.layout;

    var conww = parseInt(wh["width"]);
    var conhh = parseInt(wh["height"] / 2);

    // Must assign unique id's and append new elements
    var uniids = csg.assign_ids("csg-bode-", 2);
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
            domain: csg.autorange_y(mp[0], [-10, 10])
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
            domain: csg.autorange_y(mp[1], [-10, 10])
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
csg.render_disp_unnum_tf = function (tf, sel, sysn, varn) {
    if (sysn === undefined) {
        sysn = "G";
    }
	
	if (varn === undefined) {
		varn = "s";
	}

    var mathstr = ("\\[ " + sysn + "(" + varn + ")=\\frac{" + csg.poly2latex(tf.b) + "}{"
        + csg.poly2latex(tf.a) + "} \\]");

    d3.select(sel).html(mathstr);
    renderMathInElement(document.querySelector(sel));
};

/*
Dual matrix table is used to input pairs of matrices the dimensions
of which are somehow related
 */
csg.DualMatrixTable = function () {

    this.rows = []; // All rows are stored in a multidimensional array

    this.states = null; // Number of states
    this.inputs = null; // Number of inputs

    // Initialize the values
    this.init();

};

csg.DualMatrixTable.prototype.init = function () {

    // Shorthand call
    var $f = Fraction;

    // Default row values: three states, one input
    this.rows = [[0, 0, 1, 1],
        [1, 0, 0, 0],
        [0, 1, 0, 0]
    ];

    this.states = 3;
    this.inputs = 2;    // This is also the number of slack variables
    this.table_no = 1;

};

csg.DualMatrixTable.prototype.addState = function () {
    // Update the current values
    this.update_values();

    var $f = Fraction;
    // Add an unknown to every row
    for (var k = 0; k < this.rows.length; k++) {
        var new_var = $f(1);
        if (k === this.rows.length - 1) {
            new_var = $f(-this.unknowns - 1);
        }
        this.rows[k].splice(this.unknowns, 0, new_var);
    }
    this.unknowns++;

    // Update the initial table
    this.update_initial();

};

csg.DualMatrixTable.prototype.removeState = function () {
    // Only remove an unknown, if there are more than one

    if (this.unknowns > 1) {
        // Update the current values
        this.update_values();
        this.unknowns--;

        // Remove an unknown from every row
        for (var k = 0; k < this.rows.length; k++) {
            this.rows[k].splice(this.unknowns, 1);
        }

        this.update_initial();
    }

};

csg.DualMatrixTable.prototype.addInput = function () {

    var $f = Fraction;

    this.update_values();

    // New inequality
    this.ineqs++;

    // First, construct the new row
    var new_row = [];

    // For the unknowns
    for (var k = 0; k < this.unknowns; k++) {
        new_row.push($f(1));
    }

    // For slack variables
    for (var k = 0; k < this.ineqs - 1; k++) {
        new_row.push($f(0));
    }

    // Last slack variable is equal to 1,
    // objective is equal to 0, and RHS is 1
    new_row.push($f(1));
    new_row.push($f(0));
    new_row.push($f(1));

    // Now, update all rows of the existing matrix
    for (var k = 0; k < this.rows.length; k++) {
        this.rows[k].splice(this.rows[k].length - 2, 0, $f(0));
    }

    // Now, add the new row
    this.rows.splice(this.rows.length - 1, 0, new_row);

    // Update the matrix
    this.update_initial();

};

csg.DualMatrixTable.prototype.removeInput = function () {

    // The offset from the end of the matrix is always known

    // Only allow removal if there are more than one constraint
    if (this.ineqs > 1) {

        this.update_values();

        // First remove the last slack column
        for (k = 0; k < this.rows.length; k++) {
            this.rows[k].splice(this.rows[k].length - 2, 1);
        }

        // Then, remove the constraint row
        this.rows.splice(this.rows.length - 1, 1);

        this.ineqs--;

        this.update_initial();
    }

};

// Render the table in the container specified by c(lass)
csg.DualMatrixTable.prototype.render = function (c) {

    // Get the table container and save it for later use
    var tc = d3.select("." + c);

    // Now, generate the table rows/columns
    var t = tc.append("table").classed(csg.DUAL_MATRIX_TABLE_CLASS, true);

    // Render table header
    var th = t.append("tr");

    for (var k = 0; k < (this.rows[0].length + 1); k++) {

        // Generate proper name
        var myn = "";
        if (k === 0) {
            myn = "Row";
        } else if (k > 0 && k <= this.unknowns) {
            myn = "$x_{" + k + "}$";
        } else if (k > this.unknowns && k <= this.unknowns + this.ineqs) {
            myn = "$s_{" + (k - this.unknowns) + "}$";
        } else if (k === this.unknowns + this.ineqs + 1) {
            myn = "$z$";
        } else if (k === this.unknowns + this.ineqs + 2) {
            myn = "$b$";
        }

        th.append("th")
            .classed("r-0 c-" + k, true)
            .html(myn);
    }

    // Now, render all the rows, placing text boxes as needed
    for (var k = 0; k < this.rows.length; k++) {
        var r = this.rows[k];
        var tr = t.append("tr");
        for (var m = 0; m < r.length + 1; m++) {

            // Choose text to render
            var myt = "";
            if (m === 0) {
                myt = "$R_{" + (k + 1) + "}$";
            } else {
                myt = "$" + this.rows[k][m - 1].toLatex() + "$";
            }
            tr.append("td")
                .classed("r-" + (k + 1) + " c-" + m, true)
                .html(myt);

        }
    }
};

// Render the initial table in the container specified by c(lass)
// Textboxes are inserted
csg.DualMatrixTable.prototype.render = function (c) {

    // Get the table container and save it for later use
    var tc = d3.select("." + c);
    this.initial_class = c;

    // Now, generate the table rows/columns
    var t = tc.append("table").classed(csg.DUAL_MATRIX_TABLE_CLASS, true);

    // Render table header
    var th = t.append("tr");

    for (var k = 0; k < (this.rows[0].length + 1); k++) {

        // Generate proper name
        var myn = "";
        if (k === 0) {
            myn = "Row";
        } else if (k > 0 && k <= this.unknowns) {
            myn = "$x_{" + k + "}$";
        } else if (k > this.unknowns && k <= this.unknowns + this.ineqs) {
            myn = "$s_{" + (k - this.unknowns) + "}$";
        } else if (k === this.unknowns + this.ineqs + 1) {
            myn = "$z$";
        } else if (k === this.unknowns + this.ineqs + 2) {
            myn = "$b$";
        }

        th.append("th")
            .classed("r-0 c-" + k, true)
            .html(myn);
    }

    // Now, render all the rows, placing text boxes as needed
    for (var k = 0; k < this.rows.length; k++) {
        var r = this.rows[k];
        var tr = t.append("tr");
        for (var m = 0; m < r.length + 1; m++) {

            // Choose text to render
            var myt = "";
            if (m === 0) {
                myt = "$R_{" + (k + 1) + "}$";
            } else if (m > 0 && m <= this.unknowns) {
                myt = "<input type='text' class='entry r-" + (k + 1) + " c-" + m + "' value='" + this.rows[k][m - 1].toFraction() + "' />";
            } else if (m === r.length) {
                myt = "<input type='text' class='entry r-" + (k + 1) + " c-" + m + "' value='" + this.rows[k][m - 1].toFraction() + "' />";
            } else {
                myt = "$" + this.rows[k][m - 1].toLatex() + "$";
            }
            tr.append("td")
                .classed("r-" + (k + 1) + " c-" + m, true)
                .html(myt);

        }
    }

    var self = this;

    var tcc = tc.append("div").classed("controls", true);

    // Add controls
    tcc.append("span").html("Add unknown").classed("simple-button", true).on("click", function () {
        self.addUnknown();
    });

    tcc.append("span").html("Remove unknown").classed("simple-button", true).on("click", function () {
        self.removeUnknown();
    });

    tcc.append("span").html("Add constraint").classed("simple-button", true).on("click", function () {
        self.addConstraint();
    });

    tcc.append("span").html("Remove constraint").classed("simple-button", true).on("click", function () {
        self.removeConstraint();
    });

    // Render table using katex here
    csg.render_latex_in(selector);
};

csg.DualMatrixTable.prototype.update = function (f) {

    if (f === undefined) {
        f = true;
    }

    if (!f) {

        // Update the values
        this.update_values();

        // Remove the initial table
        d3.select("." + this.initial_class).html("");

        // Replace table with a fixed one
        this.render(this.initial_class);
    } else {

        // Remove the initial table
        d3.select("." + this.initial_class).html("");

        // Just update the table taking into account the updated values
        this.render_initial(this.initial_class);
    }

};

csg.DualMatrixTable.prototype.update_values = function () {

    var self = this;

    d3.selectAll('.' + this.initial_class + ' input.entry')
        .each(function (d) {

            var my_val = d3.select(this).property('value');

            var the_class = d3.select(this).attr('class');

            // Get indices of rows and columns
            var myregexp_r = /r-([0-9]+)/i;
            var match = myregexp_r.exec(the_class);
            var r_no = null;
            if (match != null) {
                r_no = parseInt(match[1]);
            }

            var myregexp_c = /c-([0-9]+)/i;
            var match = myregexp_c.exec(the_class);
            var c_no = null;
            if (match != null) {
                c_no = parseInt(match[1]);
            }

            // Update the cell
            if (c_no !== null && r_no !== null) {
                self.rows[r_no - 1][c_no - 1] = Fraction(my_val);
            }

        });
};