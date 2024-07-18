'use strict';

var config = require('../../config/testConfig');
var testHelpers = require('../../helpers/testHelpers');
var assert = require('chai').assert;
var expect = require('chai').expect;

var actions = testHelpers.getActions('RefArch', 'en_US');

describe('Fetch e2e tests', async function () {
    before(async function () {
        this.timeout(config.timeouts.before);
        var missingEnvVars = Object.keys(config.env).reduce(function (
            arr,
            key
        ) {
            if (!config.env[key]) {
                arr.push(key);
            }
            return arr;
        }, []);

        if (missingEnvVars.length) {
            throw new Error(
                'Missing environment variables: ' + missingEnvVars.join(',')
            );
        }
    });

    it('Can call fetch', async function () {
        var url = actions.FETCH_ANYTHING;
        var urlWithQueryString = url + '?key1=1&key2=2';

        var response = await testHelpers.callFetchWith({
            serviceName: 'plugin_slas_test.fetch-service',
            url: url,
            options: {
                queryParameters: {
                    key1: '1',
                    key2: '2'
                }
            }
        });
        var responseData = await response.json();

        assert.strictEqual(
            responseData.status,
            200,
            'Response should return 200'
        );
        assert.strictEqual(
            responseData.url,
            urlWithQueryString,
            'URL should contain query string'
        );
    });

    it('Fetch error when GET request has a body', async function () {
        var url = actions.FETCH_ANYTHING;

        var response = await testHelpers.callFetchWith({
            serviceName: 'plugin_slas_test.fetch-service',
            url: url,
            options: {
                body: {
                    content: 'A body'
                }
            }
        });
        var error = await response.json();

        assert.strictEqual(
            error.message,
            'Unexpected request body found in GET request',
            'Message should match'
        );
    });

    it('Fetch timeout', async function () {
        var url = actions.FETCH_ANYTHING + '?delay=1';

        var response = await testHelpers.callFetchWith({
            serviceName: 'plugin_slas_test.fetch-service',
            url: url
        });
        var responseData = await response.json();
        var error = JSON.parse(responseData.message);

        assert.strictEqual(
            error.status,
            'SERVICE_UNAVAILABLE',
            'Response should have SERVICE_UNAVAILABLE status'
        );
        assert.strictEqual(
            error.statusText,
            'TIMEOUT',
            'Reason for unavailable service is TIMEOUT'
        );
    });

    it('Fetch expired cert', async function () {
        var url = 'https://expired.badssl.com/';

        var response = await testHelpers.callFetchWith({
            serviceName: 'plugin_slas_test.fetch-service',
            url: url
        });
        var responseData = await response.json();
        var error = JSON.parse(responseData.message);

        assert.strictEqual(
            error.status,
            'ERROR',
            'Response should have ERROR status'
        );
        expect(error.message).to.contain('SSLHandshakeException');
    });

    it('Fetch returns HTTP 429', async function () {
        var url = actions.FETCH_STATUS + '?status=429';

        var response = await testHelpers.callFetchWith({
            serviceName: 'plugin_slas_test.fetch-service',
            url: url
        });
        var responseData = await response.json();
        assert.strictEqual(
            responseData.status,
            429,
            'Response should return 429'
        );
        assert.strictEqual(
            responseData.statusText,
            'Too Many Requests',
            'Status text should say Too Many Requests'
        );
    });

    it('Fetch wrong type of service', async function () {
        var url = actions.FETCH_ANYTHING;

        var response = await testHelpers.callFetchWith({
            serviceName: 'plugin_slas_test.fetch-wrong-service-type',
            url: url
        });
        var error = await response.json();

        assert.strictEqual(
            error.message,
            'Service plugin_slas_test.fetch-wrong-service-type is not of type GENERIC. The service type must be GENERIC in Business Manager.',
            'Fetch should fail because the service is not GENERIC type'
        );
    });

    it('Fetch triggers rate limit', async function () {
        var url = actions.FETCH_ANYTHING;

        // Rate limit is set to max 1 calls every second
        // so we wait more than 1 second to ensure the rate limit is clear
        // then make 2 calls to trigger the rate limit
        await testHelpers.delay(1000);
        var response = await testHelpers.callFetchWith({
            serviceName: 'plugin_slas_test.fetch-rate-limit',
            url: url
        });
        var responseData1 = await response.json();
        assert.strictEqual(
            responseData1.status,
            200,
            'Response 1 should return 200'
        );

        var response2 = await testHelpers.callFetchWith({
            serviceName: 'plugin_slas_test.fetch-rate-limit',
            url: url
        });
        var responseData2 = await response2.json();
        var error = JSON.parse(responseData2.message);

        assert.strictEqual(
            error.status,
            'SERVICE_UNAVAILABLE',
            'Response 2 should have SERVICE_UNAVAILABLE status'
        );
        assert.strictEqual(
            error.statusText,
            'RATE_LIMITED',
            'Reason for unavailable service is RATE_LIMITED'
        );
    }).timeout(config.timeouts.tests);

    it('Fetch errors can trigger circuit breaker if too many requests timeout', async function () {
        var url = actions.FETCH_ANYTHING + '?delay=1';

        // Circuit breaker is set to 2 errors every second with timeout of 500ms
        // so we wait more than 500 milliseconds to ensure the circuit breaker is clear
        // then make 2 calls that result in an error to trigger the circuit breaker
        await testHelpers.delay(500);

        var response1 = await testHelpers.callFetchWith({
            serviceName: 'plugin_slas_test.fetch-circuit-breaker',
            url: url
        });
        var responseData1 = await response1.json();
        var error1 = JSON.parse(responseData1.message);

        assert.strictEqual(
            error1.status,
            'SERVICE_UNAVAILABLE',
            'Response should have SERVICE_UNAVAILABLE status'
        );
        assert.strictEqual(
            error1.statusText,
            'TIMEOUT',
            'Reason for unavailable service is TIMEOUT'
        );

        var response2 = await testHelpers.callFetchWith({
            serviceName: 'plugin_slas_test.fetch-circuit-breaker',
            url: url
        });
        var responseData2 = await response2.json();
        var error2 = JSON.parse(responseData2.message);

        assert.strictEqual(
            error2.status,
            'SERVICE_UNAVAILABLE',
            'Response should have SERVICE_UNAVAILABLE status'
        );
        assert.strictEqual(
            error2.statusText,
            'CIRCUIT_BROKEN',
            'Reason for unavailable service is CIRCUIT_BROKEN'
        );
    }).timeout(config.timeouts.tests);
});
