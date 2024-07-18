'use strict';

var server = require('server');
var Fetch = require('*/cartridge/scripts/services/fetch');
var Logger = require('dw/system/Logger');
var log = Logger.getLogger('plugin_slas', 'plugin_slas.test');
var HTTPClient = require('dw/net/HTTPClient');
var instanceRestriction = require('*/cartridge/scripts/middleware/instanceRestriction');
var System = require('dw/system/System');
/* global request, response */

/**
 * WARNING: ECom does not natively support breaking script continuation. The following code block is for TESTING PURPOSES ONLY.
 * DO NOT USE this function in production code.
 * Holds thread execution for specified time.
 * @param {*} ms time to stop thread execution for in ms.
 */
function sleep(ms) {
    try {
        var httpClient = new HTTPClient();
        httpClient.setTimeout(ms / 3); // it stall for 3x the specified ms for unknown reasons. Hence ms / 3.
        httpClient.open('GET', 'http://' + System.instanceHostname + ':9999/');
        httpClient.send();
    } catch (e) {
        log.error(e);
    }
}

/**
 * Converts a Map(K,V) to JSON object
 * @param {*} map containing key-value pairs.
 * @returns {Object} parsed JSON object containing key value pairs.
 */
function parseMaptoJSON(map) {
    var jsonObject = {};

    if (map.size() === 0) {
        return jsonObject;
    }

    var itr = map.keySet().iterator();
    while (itr.hasNext()) {
        var key = itr.next();
        jsonObject[key] = map.get(key)[0];
    }
    return jsonObject;
}

/**
 * Parse request body
 * @param {dw.system.Request} req - request object
 * @returns {Object} parsed JSON body
 */
function parseRequestBody(req) {
    var parsedBody = {};
    if (!req || !req.body) return parsedBody;
    try {
        parsedBody = JSON.parse(req.body);
    } catch (ex) {
        log.error(ex.toString() + ' in ' + ex.fileName + ':' + ex.lineNumber);
    }
    return parsedBody;
}

/**
 * Request handler function to extract essential information from req object and return it as a json response.
 * Response will be delayed by number of seconds passed in the 'delay' param.
 * WARNING: ECom does not natively support breaking script continuation. The delay functionality is for TESTING PURPOSES ONLY.
 * DO NOT CALL 'delay' in production code.
 * @param {*} req request received from client.
 * @param {*} res response object to be sent to client.
 * @param {*} next function called to continue middleware execution.
 */
function handleFetchRequest(req, res, next) {
    /**
     *  The req and res objects from the server module don’t show up enough information about the request so we use
     *  the global request and response classes from Script API which have proper documented functions for accessing request and response properties.
     *  Also, for setting status on res, `res.status()` or `res.setStatus()` in the server module does not work. So we need to use the global response object.
     */
    var args = parseMaptoJSON(request.getHttpParameters());
    var headers = parseMaptoJSON(request.getHttpHeaders());
    var delay = args.delay && parseInt(args.delay, 10);

    var geolocation = {
        lat: request.getGeolocation().latitude,
        lng: request.getGeolocation().longitude
    };

    res.json({
        args: args,
        headers: headers,
        geolocation: geolocation,
        url: request.getHttpURL().toString(),
        method: request.httpMethod,
        data: parseRequestBody(req)
    });

    if (delay && !Number.isNaN(delay)) {
        sleep(delay * 1000);
    }
    next();
}

server.post(
    'TestFetch',
    server.middleware.https,
    instanceRestriction.redirectProduction,
    function (req, res, next) {
        var body = parseRequestBody(req);
        var serviceName = body.serviceName;
        var url = body.url;
        var options = body.options;

        var response;

        try {
            response = Fetch.fetch(serviceName, url, options);
            response.body = JSON.parse(response.body);
            res.json(response);
        } catch (ex) {
            var error = ex;
            res.json(error);
        }
        next();
    }
);

/**
 * Test endpoint for HTTP status codes. Returns response status to value received in 'status' param.
 * If no status param is set, response status will default to 200 OK
 * If status param is set to a non-numeric value, response status will be set to 400 Bad Request
 */
server.get(
    'GetStatus',
    server.middleware.https,
    instanceRestriction.redirectProduction,
    function (req, res, next) {
        var status = request.getHttpParameters().get('status');

        res.json();
        if (!status) {
            next();
        }

        var responseStatus = parseInt(status[0], 10);
        response.setStatus(Number.isNaN(responseStatus) ? 400 : responseStatus);

        next();
    }
);

/**
 * Test endpoint for getting http request properties for GET requests.
 */
server.get(
    'GetAnything',
    server.middleware.https,
    instanceRestriction.redirectProduction,
    handleFetchRequest
);

/**
 * Test endpoint for getting http request properties for POST requests.
 */
server.post(
    'PostAnything',
    server.middleware.https,
    instanceRestriction.redirectProduction,
    handleFetchRequest
);

module.exports = server.exports();
