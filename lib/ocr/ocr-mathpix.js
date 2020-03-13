/* A set of classes/functions for working with MathPix OCR API

   NB! NEVER store your API credentials in JavaScript files that
   are served to the client. A possible solution is to provide a form
   in your application that must be filled with API data every time
   the user runs the application.

   2020, by Aleksei Tepljakov
 */

var OCR_MATHPIX_URL = "https://api.mathpix.com/v3/text";
var OCR_MATHPIX_REQUEST_TIMEOUT = 1000;

// ocr_mp is the object through which communication works
// As this is a proper object, it must be initialized with "new"
var ocr_mp = function (appid, apikey) {

    // Store the information for later use
    this.appid = appid;
    this.apikey = apikey;
};

// Send an actual image to parse and return as pure LaTeX
ocr_mp.prototype.send_image = function (img_base64) {

    // TODO: using async=false is bad. Need to rewrite.
    // Right now it is OK for testing purposes only.
    var x = new XMLHttpRequest();
    x.open("POST", OCR_MATHPIX_URL, false);

    // Headers and authentication
    x.setRequestHeader("content-type", "application/json");
    x.setRequestHeader("app_id", this.appid);
    x.setRequestHeader("app_key", this.apikey);

    // Timeout since we are working synchronously
    // x.timeout = OCR_MATHPIX_REQUEST_TIMEOUT;

    // Form the body of the request
    var req = {
        "src": img_base64,
        "formats": ["text"],
        "data_options": {
            "include_asciimath": false,
            "include_latex": true
        }
    };

    // Send the actual request
    x.send(JSON.stringify(req));

    // TODO! NB! Need to at least check the response code before returning anything
	// TODO #2: Sometimes the OCR algorithm cannot find any content. Need to check for
	// that as well.
    return JSON.parse(x.responseText);
};