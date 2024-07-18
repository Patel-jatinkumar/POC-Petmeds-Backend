'use strict';

var config = require('*/cartridge/scripts/config/SLASConfig');
var Fetch = require('*/cartridge/scripts/services/fetch');
var Logger = require('dw/system/Logger');
var log = Logger.getLogger('plugin_slas', 'plugin_slas.sessionBridge');

/**
 * Service call to exchange JWT into a new session
 * @param {string}token - aceess JWT.
 * @param {string}ipAddress - client ip.
 * @return {Object} object containing response cookies.
 */
function getSession(token, ipAddress) {
    var url = config.OCAPI_SESSION_BRIDGE_URI_SLAS;
    var SERVICE = 'plugin_slas.generic.ocapi.sessions';
    var options = {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + token
        }
    };

    if (ipAddress && config.CLIENT_IP_HEADER_NAME) {
        options.headers[config.CLIENT_IP_HEADER_NAME] = ipAddress;
    } else {
        log.warn(
            'Client IP not sent to session bridge. Session gelocation information will be based on server.'
        );
    }

    var response = Fetch.fetch(SERVICE, url, options);

    if (!response.ok) {
        Fetch.throwHttpError(response, 'OCAPI getSession error');
    }
    return response.headers.get('set-cookie');
}

module.exports = {
    getSession: getSession
};
