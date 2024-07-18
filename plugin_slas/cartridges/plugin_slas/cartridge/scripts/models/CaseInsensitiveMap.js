'use strict';

var HashMap = require('dw/util/HashMap');

/**
 * Prototype definition for map with case insensitive keys.
 * @param {dw.util.Map} map List of key-value pairs stored as a Map.
 * @returns {CaseInsensitiveMap} Normalized map of key-value pairs.
 */
function CaseInsensitiveMap(map) {
    this.map = map;
    return this;
}

CaseInsensitiveMap.prototype.get = function (key) {
    const caseInsensitiveHeaders = new HashMap();
    // eslint-disable-next-line
    for (var header in this.map) {
        caseInsensitiveHeaders.put(header.toLowerCase(), this.map[header]);
    }
    return caseInsensitiveHeaders[key.toLowerCase()];
};

/**
 * Getter function for a new instance of CaseInsensitive Map.
 * We need to create this getter function because module.exports globalizes functions
 * which prevents us from using the 'new' keyword to instantiate CaseInsensitiveMap.
 * @param {*} map Map containing list of headers from ECom service responses.
 * @returns {CaseInsensitiveMap} instance of CaseInsensitiveMap with normalized headers.
 */
function getCaseInsensitiveMap(map) {
    return new CaseInsensitiveMap(map);
}

module.exports = {
    getCaseInsensitiveMap: getCaseInsensitiveMap
};
