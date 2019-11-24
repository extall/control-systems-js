/* 
 * This is the Control System Toolbox graphics facilities
 * At the moment, based on functionPlot due to its versatility.
 * NB! For this reason, d3.js v3 must be loaded into the environment such that
 * the window.d3v3 property must point to the d3v3 object.
 */

var csg = csg || {};

csg.plot = function (args) {
    // Store current d3 version and switch to d3v3
    window.d3v = window.d3;
    window.d3 = window.d3v3;

    // Use the functionPlot library
    var inst = functionPlot(args);

    // Restore previous d3 version
    window.d3 = window.d3v;

    // If xAxis is log, additional processing
    // old format
    if (args.xAxis.type === "log") {
        var format = inst.meta.xAxis.tickFormat()
        var logFormat = function (d) {
            console.log(d);
            if (math.abs(math.log10(d)) - math.abs(math.floor(math.log10(d))) < Number.EPSILON) {
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
