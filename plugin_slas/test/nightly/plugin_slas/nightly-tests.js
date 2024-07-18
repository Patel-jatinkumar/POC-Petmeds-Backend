'use strict';

var testHelpers = require('../../helpers/testHelpers');
var assert = require('chai').assert;
var config = require('../../config/testConfig');

describe('Internal Circuit Breaker Tests', async function () {
    it('Fetch triggers internal, per-process circuit breaker', async function () {
        var REQUEST_ATTEMPTS = 105;
        var url = config.env.SFCC_BASE_URL + ':81'; // Simulates Socket/Connection timeout
        var IS_CIRCUIT_BROKEN = false;

        while (REQUEST_ATTEMPTS--) {
            var response = await testHelpers.callFetchWith({
                serviceName: 'plugin_slas_test.fetch-internal-circuit-breaker',
                url: url
            });
            var responseData = await response.json();
            var error = JSON.parse(responseData.message);
            if (error.statusText === 'CIRCUIT_BROKEN') {
                IS_CIRCUIT_BROKEN = true;
                break;
            }
        }

        assert.strictEqual(
            IS_CIRCUIT_BROKEN,
            true,
            '80% service calls failing in a Socket/Connection timeout should trigger internal circuit breaker'
        );
    }).timeout(config.timeouts.nightlyTests);
});
