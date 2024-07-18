'use strict';

var Encoding = require('dw/crypto/Encoding');
var URLUtils = require('dw/web/URLUtils');
var URLAction = require('dw/web/URLAction');
var URLParameter = require('dw/web/URLParameter');

/**
 * Puts together the SEO URL from the httpPath and httpQueryString of a request
 *
 * The httpPath will look like /on/demandware.store/Sites-RefArch-Site/en_US/Login-Show
 *
 * Note: If this method receives an encoded query parameter value ie. ?foo=something== then
 * the resulting query parameter will automatically get encoded to ?foo=something%3d%3d
 *
 * @param {string} httpPath - the http path from the request url. This is the relative non SEO-optimized path
 * @param {string} queryString - the query string from the request url
 * @returns {dw.web.URL} url - the SEO optimized url path for the current page
 */
exports.getSEOUrl = function (httpPath, queryString) {
    var pathParts = httpPath.substr(1).split('/');

    // If there are 3 or less parts to the httpPath there is probably no specified controller so we direct to the home page
    if (pathParts.length <= 3) {
        return URLUtils.httpsHome();
    }

    // The action (aka the controller start node) is always the final part of the httpPath
    var action = new URLAction(pathParts[pathParts.length - 1]);

    var urlParts = [];
    if (queryString) {
        var qsParts = queryString.split('&');
        urlParts = qsParts.map(function (qsParam) {
            var paramParts = qsParam.split('=');

            if (paramParts[1]) {
                // The query parameter is a key/value pair, e.g. `?foo=bar`

                var key = paramParts.shift();
                // if there are `=` characters in the parameter value
                // (ie. the value is encoded and contains `=`), rejoin them
                var value = paramParts.join('=');

                // if the query parameter contains encoded values (ie. %3d)
                // we decode them back to the original value as the url.apply below
                // will re-encode it. This also prevents encoded values from being
                // double encoded on refresh (ie. %3d becoming %253d)
                return new URLParameter(
                    Encoding.fromURI(key),
                    Encoding.fromURI(value)
                );
            }

            // The query parameter is not a key/value pair, e.g. `?queryparam`
            return new URLParameter(
                undefined,
                Encoding.fromURI(qsParam),
                false
            );
        });
    }
    urlParts.unshift(action);
    return URLUtils.url.apply(URLUtils, urlParts).toString();
};
