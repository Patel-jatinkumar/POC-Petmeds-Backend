'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

var SERVICE = 'plugin_slas.generic.scapi.auth';

/**
 * Helper function for checking if service crendentials have been set for SLAS private client.
 *
 * Assumes that if a password is present, the client is private.
 * If no password, assumes the client is public.
 * @returns {boolean} true if SLAS private client
 */
function isPrivateClient() {
    var service = LocalServiceRegistry.createService(SERVICE, {});

    var serviceConfiguration = service.getConfiguration();
    var credentials = serviceConfiguration.getCredential();

    // eslint-disable-next-line no-extra-boolean-cast
    if (!!credentials.password) {
        return true;
    }
    return false;
}

module.exports = {
    isPrivateClient: isPrivateClient
};
