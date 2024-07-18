'use strict';

var Logger = require('dw/system/Logger');
var URLUtils = require('dw/web/URLUtils');

var config = require('*/cartridge/scripts/config/SLASConfig');
var Fetch = require('*/cartridge/scripts/services/fetch');

var log = Logger.getLogger('plugin_slas', 'plugin_slas.sessionVars');

/**
 * Use a service (and it's credentials) to call a private controller that will transfer session variables
 * after a session bridge is made
 * @param {Object} parameters - parameters
 * @returns {Object} JSON representation of session vars to be saved
 */
function saveSessionVars(parameters) {
    var url = URLUtils.abs('SLASSessionHelper-SaveSession');

    var options = {
        method: 'POST',
        headers: {
            'x-sf-custom-auth': parameters.authorizationHeader,
            Cookie: 'dwsid=' + parameters.dwsid
        },
        body: {
            sessionVars: parameters.sessionVars
        },
        useCredentials: true
    };

    var response = Fetch.fetch(
        config.SERVICE_IDS.INTERNAL_CONTROLLER,
        url.toString(),
        options
    );

    if (!response.ok) {
        Fetch.throwHttpError(response, 'Session variables transfer error');
    }

    var returns;
    try {
        returns = JSON.parse(response.body);
    } catch (e) {
        log.error(e.toString() + ' in ' + e.fileName + ':' + e.lineNumber);
    }
    return returns;
}

module.exports = {
    saveSessionVars: saveSessionVars
};
