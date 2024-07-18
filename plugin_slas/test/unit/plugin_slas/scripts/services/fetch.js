'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('Fetch Tests', function () {
    var serviceCall = sinon.stub();
    var serviceGetTimeout = sinon.spy();
    var serviceSetURL = sinon.spy();

    var credentials = {
        user: 'user',
        password: 'password'
    };

    var serviceType = 'GENERIC';

    var Fetch = proxyquire(
        '../../../../../cartridges/plugin_slas/cartridge/scripts/services/fetch',
        {
            '*/cartridge/scripts/config/SLASConfig': proxyquire(
                '../../../../../cartridges/plugin_slas/cartridge/scripts/config/SLASConfig',
                {
                    'dw/system/Site': {
                        getInstanceHostName: function () {
                            return 'instance host name';
                        },
                        getCurrent: function () {
                            return {
                                ID: 'siteID',
                                getCustomPreferenceValue: function (property) {
                                    if (property === 'ocapiVersion')
                                        return '23_1';
                                    if (property === 'orgId')
                                        return 'f_ecom_aaaa_dev';
                                    return 'custom pref value';
                                }
                            };
                        }
                    },
                    'dw/system/Logger': {
                        getLogger: function () {
                            return {
                                error: function () {}
                            };
                        }
                    }
                }
            ),
            '*/cartridge/scripts/models/CaseInsensitiveMap': proxyquire(
                '../../../../../cartridges/plugin_slas/cartridge/scripts/models/CaseInsensitiveMap',
                {
                    'dw/util/HashMap': {}
                }
            ),
            'dw/svc/LocalServiceRegistry': {
                createService: function () {
                    return {
                        getConfiguration: function () {
                            return {
                                getProfile: function () {
                                    return {
                                        getTimeoutMillis: serviceGetTimeout
                                    };
                                },
                                getCredential: function () {
                                    return credentials;
                                },
                                getServiceType: function () {
                                    return serviceType;
                                }
                            };
                        },
                        setURL: serviceSetURL,
                        call: serviceCall
                    };
                }
            },
            'dw/net/HTTPClient': {
                setAllowRedirect: sinon.spy(),
                setTimeout: sinon.spy(),
                open: sinon.spy(),
                sendBytes: sinon.spy(),
                send: sinon.spy()
            },
            'dw/util/Bytes': {},
            'dw/util/StringUtils': {
                encodeBase64: function (string) {
                    return string;
                }
            }
        }
    );

    it('Fetch gets expected response', function () {
        var url = 'url';
        var urlWithQueryString = url + '?qs=1&qz=2';
        var options = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            queryParameters: {
                qs: '1',
                qz: '2'
            },
            body: {
                key: 'value'
            },
            method: 'POST',
            useCredentials: true,
            onCredentials: function (op, _credentials) {
                op.credential = _credentials.user; // eslint-disable-line no-param-reassign
            },
            timeout: 0
        };

        var expectedServiceCallParameters = {
            url: urlWithQueryString,
            method: options.method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                authorization:
                    'Basic ' + credentials.user + ':' + credentials.password
            },
            body: 'key=value',
            credential: credentials.user,
            timeout: 0
        };

        var result = {
            ok: true,
            object: {
                text: 'body',
                responseHeaders: 'headers',
                ok: true,
                status: 'status',
                statusText: 'statusText',
                url: url,
                errorText: ''
            }
        };

        serviceCall.returns(result);

        Fetch.fetch('service', url, options);
        var expectedUrl = serviceSetURL.calledWithMatch(urlWithQueryString);
        var expectedCall = serviceCall.calledWithMatch(
            expectedServiceCallParameters
        );

        expect(expectedUrl).to.be.ok;
        expect(expectedCall).to.be.ok;
    });
    it('Fetch throws an error when a GET request has a body', function () {
        var options = {
            body: {
                key: 'value'
            }
        };
        expect(function () {
            Fetch.fetch('service', 'url', options);
        }).to.throw(TypeError, 'Unexpected request body found in GET request');
    });
    it('Fetch throws an ERROR type error when the service returns an error', function () {
        var result = {
            ok: false,
            error: 'Error',
            errorMessage: 'Error Message',
            msg: 'Message',
            status: 'ERROR',
            unavailableReason: 'Unavailable Reason'
        };

        // TODO - Make order of attributes not matter here!
        var expectedError = {
            type: 'Service',
            status: result.status,
            message: result.msg,
            errorCode: result.error,
            errorMessage: result.errorMessage
        };

        serviceCall.returns(result);

        expect(function () {
            Fetch.fetch('service', 'url', {});
        }).to.throw(Error, JSON.stringify(expectedError));
    });
    it('Fetch throws a Service Unavailable when the service returns a service unavaliable', function () {
        var result = {
            ok: false,
            error: 'Error',
            errorMessage: 'Error Message',
            msg: 'Message',
            status: 'SERVICE_UNAVAILABLE',
            unavailableReason: 'Unavailable Reason'
        };

        var expectedError = {
            type: 'Service',
            status: result.status,
            statusText: result.unavailableReason,
            message: result.msg
        };

        serviceCall.returns(result);

        expect(function () {
            Fetch.fetch('service', 'url', {});
        }).to.throw(Error, JSON.stringify(expectedError));
    });
    it('ThrowHttpError throws expected error', function () {
        var inputResponse = {
            status: '404',
            statusText: 'Not Found',
            errorText: {
                message: 'message'
            }
        };
        var description = 'HTTP Not Found Test';

        var expectedError = {
            type: 'HTTP',
            status: inputResponse.status,
            statusText: inputResponse.statusText,
            message: inputResponse.errorText,
            description: description
        };

        expect(function () {
            Fetch.throwHttpError(inputResponse, description);
        }).to.throw(Error, JSON.stringify(expectedError));
    });
    it('EncodeToString converts object into query string', function () {
        var object = {
            key1: 'value1',
            key2: 'value2'
        };
        var queryString = 'key1=value1&key2=value2';

        assert.equal(queryString, Fetch.encodeToString(object));
    });
    it('DeserializeQueryString converts query string into object', function () {
        var queryString = '?key1=value1&key2=value2';
        var expectedResult = {
            key1: 'value1',
            key2: 'value2'
        };

        assert.equal(
            JSON.stringify(expectedResult),
            JSON.stringify(Fetch.deserializeQueryString(queryString))
        );
    });
});
