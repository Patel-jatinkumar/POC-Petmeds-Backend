'use strict';

// All tests in this file run against a live sandbox instance.
var fetch = require('node-fetch');
var assert = require('chai').assert;
var config = require('../../config/testConfig');
var testHelpers = require('../../helpers/testHelpers');

describe('onSession login tests', async function () {
    var shoppersToDelete = [];
    var shopperBasketsToDelete = [];

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

        // Register new shopper for registered user login tests
        for (var i = 0; i < config.cases.length; i++) {
            config.cases[i].existingShopper =
                await testHelpers.registerNewShopper(
                    null,
                    config.cases[i].siteId,
                    config.cases[i].locale
                );
        }
    });

    beforeEach(async function () {
        // TODO: Revisit why tests running without a delay breaks SFRA.
        this.timeout(config.timeouts.beforeEach);

        await testHelpers.delay(2000);
    });

    after(async function () {
        this.timeout(config.timeouts.after);

        // Queue existing shopper accounts for cleanup
        config.cases.forEach(function (c) {
            shoppersToDelete.push({
                siteId: c.siteId,
                locale: c.locale,
                user: c.existingShopper.profile
            });
        });

        // Remove randomly registered shopper accounts after all tests run.
        while (shoppersToDelete.length) {
            await testHelpers.delay(1500);
            var shopperToDelete = shoppersToDelete.pop();

            await testHelpers.removeRegisteredShopper(
                shopperToDelete.siteId,
                shopperToDelete.locale,
                shopperToDelete.user
            );
        }
    });

    afterEach(async function () {
        if (shopperBasketsToDelete.length === 0) {
            return;
        }

        this.timeout(config.timeouts.afterEach);

        while (shopperBasketsToDelete.length) {
            await testHelpers.delay(1500);
            var shopperBasketToDelete = shopperBasketsToDelete.pop();

            await testHelpers.removeBasket(
                shopperBasketToDelete.siteId,
                shopperBasketToDelete.locale,
                shopperBasketToDelete.user
            );
        }
    });

    config.cases.forEach(async function (c) {
        var siteId = c.siteId;
        var locale = c.locale;
        var expectedCookieNames = c.expectedCookieNames;

        var actions = testHelpers.getActions(siteId, locale);

        describe(c.description, function () {
            it('Guest login works and sets cookies', async function () {
                var guestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        null,
                        siteId,
                        locale
                    );
                assert.strictEqual(
                    guestShopperSession.response.status,
                    200,
                    'Response should be HTTP 200'
                );

                var guestShopperCookiesAsObject = testHelpers.cookiesAsObject(
                    guestShopperSession.cookies
                );

                assert.exists(
                    guestShopperCookiesAsObject[
                        expectedCookieNames.sessionGuard
                    ],
                    'Response should set session guard cookie'
                );
                assert.exists(
                    guestShopperCookiesAsObject[expectedCookieNames.guest],
                    'Response should set guest cookie'
                );
                assert.exists(
                    guestShopperCookiesAsObject[
                        expectedCookieNames.accessToken
                    ],
                    'Response should set access token cookie'
                );
                assert.exists(
                    guestShopperCookiesAsObject[
                        expectedCookieNames.accessToken2
                    ],
                    'Response should set access token cookie part 2'
                );
            }).timeout(config.timeouts.tests);

            it('Guest logins retain same session on subsequent requests', async function () {
                var guestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        null,
                        siteId,
                        locale
                    );
                assert.strictEqual(
                    guestShopperSession.response.status,
                    200,
                    'Response should be a 200 redirect'
                );
                assert.strictEqual(
                    guestShopperSession.response.url,
                    actions.HOME,
                    'Response redirect should be to the same page'
                );

                var guestShopperCookiesAsObject = testHelpers.cookiesAsObject(
                    guestShopperSession.cookies
                );

                assert.exists(
                    guestShopperCookiesAsObject[
                        expectedCookieNames.sessionGuard
                    ],
                    'Response should set session guard cookie'
                );
                assert.exists(
                    guestShopperCookiesAsObject[expectedCookieNames.guest],
                    'Response should set guest cookie'
                );

                var secondGuestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        guestShopperSession,
                        siteId,
                        locale
                    );

                assert.isTrue(
                    secondGuestShopperSession.response.ok,
                    'Subsequent response should not be a redirect'
                );

                var secondShopperCookiesAsObject = testHelpers.cookiesAsObject(
                    secondGuestShopperSession.cookies
                );
                assert.notExists(
                    secondShopperCookiesAsObject[
                        expectedCookieNames.sessionGuard
                    ],
                    'Subsequent response should not set session guard cookie'
                );
            }).timeout(config.timeouts.tests);

            it('Guest refresh token login works', async function () {
                var guestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        null,
                        siteId,
                        locale
                    );

                var guestSessionCookiesAsObject = testHelpers.cookiesAsObject(
                    guestShopperSession.cookies
                );

                var formData = new URLSearchParams({
                    pid: '701642923497M',
                    quantity: 2,
                    options: []
                });

                var addToBasketRes = await fetch(actions.ADD_TO_CART, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        cookie: guestShopperSession.cookies
                    }
                });

                assert.strictEqual(
                    addToBasketRes.status,
                    200,
                    'Failed to add item to guest basket'
                );

                var getCurrentBasketRes = await fetch(actions.GET_USER_BASKET, {
                    headers: {
                        cookie: guestShopperSession.cookies
                    }
                });
                var guestBasket = await await getCurrentBasketRes.json();

                assert.exists(guestBasket.basketID);
                assert.strictEqual(
                    guestBasket.productQuantityTotal,
                    2,
                    'Item quantity in basket does not match'
                );

                var refreshGuestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        {
                            cookies:
                                expectedCookieNames.guest +
                                '=' +
                                guestSessionCookiesAsObject[
                                    expectedCookieNames.guest
                                ]
                        },
                        siteId,
                        locale
                    );

                getCurrentBasketRes = await fetch(actions.GET_USER_BASKET, {
                    headers: {
                        cookie: refreshGuestShopperSession.cookies
                    }
                });
                guestBasket = await await getCurrentBasketRes.json();

                assert.exists(guestBasket.basketID);
                assert.strictEqual(
                    guestBasket.productQuantityTotal,
                    2,
                    'Guest basket must contain 2 items when restored'
                );

                var refreshGuestShopperCookiesAsObject =
                    testHelpers.cookiesAsObject(
                        refreshGuestShopperSession.cookies
                    );

                assert.exists(
                    refreshGuestShopperCookiesAsObject[
                        expectedCookieNames.accessToken
                    ],
                    'Refresh token response should set access token cookie'
                );
                assert.exists(
                    refreshGuestShopperCookiesAsObject[
                        expectedCookieNames.accessToken2
                    ],
                    'Refresh token response should set access token cookie part 2'
                );

                // For now, we do not expect the access token to go beyoned 2 parts
                var guestAccessToken = [
                    guestSessionCookiesAsObject[
                        expectedCookieNames.accessToken
                    ],
                    guestSessionCookiesAsObject[
                        expectedCookieNames.accessToken2
                    ]
                ].join('');

                var refreshLoginAccessToken = [
                    refreshGuestShopperCookiesAsObject[
                        expectedCookieNames.accessToken
                    ],
                    refreshGuestShopperCookiesAsObject[
                        expectedCookieNames.accessToken2
                    ]
                ].join('');

                assert.notStrictEqual(
                    guestAccessToken,
                    refreshLoginAccessToken,
                    'The new access token should not be the same as the previous'
                );

                if (!config.isPrivateClient) {
                    assert.notStrictEqual(
                        guestSessionCookiesAsObject[expectedCookieNames.guest],
                        refreshGuestShopperCookiesAsObject[
                            expectedCookieNames.guest
                        ],
                        'For public SLAS client, the new guest cookie should not be the same as the previous'
                    );
                } else {
                    assert.strictEqual(
                        guestSessionCookiesAsObject[expectedCookieNames.guest],
                        refreshGuestShopperCookiesAsObject[
                            expectedCookieNames.guest
                        ],
                        'For private SLAS client, the new guest cookie should be the same as the previous'
                    );
                }
            }).timeout(config.timeouts.tests);

            it('Login form returns correct error if invalid credentials', async function () {
                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        null,
                        siteId,
                        locale,
                        {
                            email: 'test@email.com',
                            password: 'somePassword?'
                        }
                    );

                var response = await registeredShopperSession.response.json();
                var error = response.error[0];
                assert.exists(error, 'Response should contain an error');
                assert.strictEqual(
                    error,
                    'Invalid login or password. Remember that password is case-sensitive. Please try again.',
                    'Response error should be for an invalid login or password.'
                );
            }).timeout(config.timeouts.tests);

            it('New registeration form returns correct error if invalid input', async function () {
                var user = testHelpers.generateUserCredentials(locale);
                user.email = c.existingShopper.profile.email;
                var newRegisteredUser = await testHelpers.registerNewShopper(
                    null,
                    siteId,
                    locale,
                    user
                );

                var response = await newRegisteredUser.response.json();
                assert.exists(
                    response.fields,
                    'Response should contain invalid fields'
                );

                var invalidFields = response.fields;
                assert.exists(
                    invalidFields.dwfrm_profile_customer_email,
                    'Username should be an invalid field'
                );
            }).timeout(config.timeouts.tests);

            it('Guest user logs in without adding items to basket returns empty basket works', async function () {
                var guestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        null,
                        siteId,
                        locale
                    );

                // Verify guest basket does not exist
                var getCurrentBasketRes = await fetch(actions.GET_USER_BASKET, {
                    headers: {
                        cookie: guestShopperSession.cookies
                    }
                });
                var guestBasket = await await getCurrentBasketRes.json();

                assert.notExists(guestBasket.basketID);

                // Login guest user and get registered user JWT
                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        guestShopperSession,
                        siteId,
                        locale,
                        c.existingShopper.profile
                    );

                var registeredShopperCookiesAsObject =
                    testHelpers.cookiesAsObject(
                        registeredShopperSession.cookies
                    );
                assert.isEmpty(
                    registeredShopperCookiesAsObject[expectedCookieNames.guest],
                    'Response should delete guest cookie'
                );
                assert.exists(
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.registered
                    ],
                    'Response should set registered cookie'
                );

                // Get registered user basket
                var getCurrentRegisteredBasketRes = await fetch(
                    actions.GET_USER_BASKET,
                    {
                        headers: {
                            cookie: registeredShopperSession.cookies
                        }
                    }
                );
                var registeredUserBasket =
                    await await getCurrentRegisteredBasketRes.json();

                assert.notExists(registeredUserBasket.basketID);
            }).timeout(config.timeouts.tests);

            it('Guest user basket persists on existing account login works', async function () {
                // Init guest login
                var guestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        null,
                        siteId,
                        locale
                    );

                // Add item to guest cart
                var formData = new URLSearchParams({
                    pid: '701642923497M',
                    quantity: 2,
                    options: []
                });

                var addToBasketRes = await fetch(actions.ADD_TO_CART, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        cookie: guestShopperSession.cookies
                    }
                });

                assert.strictEqual(
                    addToBasketRes.status,
                    200,
                    'Failed to add item to guest basket'
                );

                // Verify item exists in guest basket
                var getCurrentBasketRes = await fetch(actions.GET_USER_BASKET, {
                    headers: {
                        cookie: guestShopperSession.cookies
                    }
                });
                var guestBasket = await await getCurrentBasketRes.json();

                assert.exists(guestBasket.basketID);
                assert.strictEqual(
                    guestBasket.productQuantityTotal,
                    2,
                    'Item quantity in basket does not match'
                );

                // Login guest user and get registered user JWT
                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        guestShopperSession,
                        siteId,
                        locale,
                        c.existingShopper.profile
                    );

                var registeredShopperCookiesAsObject =
                    testHelpers.cookiesAsObject(
                        registeredShopperSession.cookies
                    );

                assert.isEmpty(
                    registeredShopperCookiesAsObject[expectedCookieNames.guest],
                    'Response should delete guest cookie'
                );
                assert.exists(
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.registered
                    ],
                    'Response should set registered cookie'
                );

                // Get registered user basket
                var getCurrentRegisteredBasketRes = await fetch(
                    actions.GET_USER_BASKET,
                    {
                        headers: {
                            cookie: registeredShopperSession.cookies
                        }
                    }
                );
                var registeredUserBasket =
                    await await getCurrentRegisteredBasketRes.json();

                assert.exists(registeredUserBasket.basketID);
                assert.strictEqual(
                    registeredUserBasket.productQuantityTotal,
                    2,
                    'Item quantity in basket does not match after login'
                );

                shopperBasketsToDelete.push({
                    siteId: siteId,
                    locale: locale,
                    user: c.existingShopper.profile
                });
            }).timeout(config.timeouts.tests);

            it('Guest user basket persists on account login without a USID works', async function () {
                // Init guest login
                var guestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        null,
                        siteId,
                        locale
                    );

                // Add item to guest cart
                var formData = new URLSearchParams({
                    pid: '701642923497M',
                    quantity: 2,
                    options: []
                });

                var addToBasketRes = await fetch(actions.ADD_TO_CART, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        cookie: guestShopperSession.cookies
                    }
                });

                assert.strictEqual(
                    addToBasketRes.status,
                    200,
                    'Failed to add item to guest basket'
                );

                // Verify item exists in guest basket
                var getCurrentBasketRes = await fetch(actions.GET_USER_BASKET, {
                    headers: {
                        cookie: guestShopperSession.cookies
                    }
                });
                var guestBasket = await await getCurrentBasketRes.json();

                assert.exists(guestBasket.basketID);
                assert.strictEqual(
                    guestBasket.productQuantityTotal,
                    2,
                    'Item quantity in basket does not match'
                );

                // Remove USID from guest cookies to trigger usid fallback
                var guestShopperSessionCookiesAsObject =
                    testHelpers.cookiesAsObject(guestShopperSession.cookies);
                delete guestShopperSessionCookiesAsObject[
                    expectedCookieNames.usid
                ];
                guestShopperSession.cookies = testHelpers.objectToCookieString(
                    guestShopperSessionCookiesAsObject
                );

                // Login guest user and get registered user JWT
                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        guestShopperSession,
                        siteId,
                        locale,
                        c.existingShopper.profile
                    );

                var registeredShopperCookiesAsObject =
                    testHelpers.cookiesAsObject(
                        registeredShopperSession.cookies
                    );

                assert.isEmpty(
                    registeredShopperCookiesAsObject[expectedCookieNames.guest],
                    'Response should delete guest cookie'
                );
                assert.exists(
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.registered
                    ],
                    'Response should set registered cookie'
                );

                // Get registered user basket
                var getCurrentRegisteredBasketRes = await fetch(
                    actions.GET_USER_BASKET,
                    {
                        headers: {
                            cookie: registeredShopperSession.cookies
                        }
                    }
                );
                var registeredUserBasket =
                    await await getCurrentRegisteredBasketRes.json();

                assert.exists(registeredUserBasket.basketID);

                assert.strictEqual(
                    registeredUserBasket.productQuantityTotal,
                    2,
                    'Item quantity in basket does not match after login'
                );

                shopperBasketsToDelete.push({
                    siteId: siteId,
                    locale: locale,
                    user: c.existingShopper.profile
                });
            }).timeout(config.timeouts.tests);

            it('Guest user can login without a USID or refresh token', async function () {
                // Init guest login
                var guestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        null,
                        siteId,
                        locale
                    );
                var guestShopperSessionCookiesAsObject =
                    testHelpers.cookiesAsObject(guestShopperSession.cookies);
                delete guestShopperSessionCookiesAsObject[
                    expectedCookieNames.usid
                ];
                delete guestShopperSessionCookiesAsObject[
                    expectedCookieNames.guest
                ];
                guestShopperSession.cookies = testHelpers.objectToCookieString(
                    guestShopperSessionCookiesAsObject
                );
                // Login guest user and get registered user JWT
                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        guestShopperSession,
                        siteId,
                        locale,
                        c.existingShopper.profile
                    );
                var registeredShopperCookiesAsObject =
                    testHelpers.cookiesAsObject(
                        registeredShopperSession.cookies
                    );
                assert.exists(
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.registered
                    ],
                    'Response should set registered cookie'
                );
            }).timeout(config.timeouts.tests);

            it('Guest user basket persists on logging into newly registered account works', async function () {
                var guestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        null,
                        siteId,
                        locale
                    );

                // Add item to guest cart
                var formData = new URLSearchParams({
                    pid: '701642923497M',
                    quantity: 2,
                    options: []
                });

                var addToBasketRes = await fetch(actions.ADD_TO_CART, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        cookie: guestShopperSession.cookies
                    }
                });

                assert.strictEqual(
                    addToBasketRes.status,
                    200,
                    'Failed to add item to guest basket'
                );

                // Verify item exists in guest basket
                var getCurrentBasketRes = await fetch(actions.GET_USER_BASKET, {
                    headers: {
                        cookie: guestShopperSession.cookies
                    }
                });
                var guestBasket = await getCurrentBasketRes.json();

                assert.exists(guestBasket.basketID);
                assert.strictEqual(
                    guestBasket.productQuantityTotal,
                    2,
                    'Item quantity in basket does not match'
                );

                // Create new user account
                var newShopperSession = await testHelpers.registerNewShopper(
                    guestShopperSession,
                    siteId,
                    locale
                );

                shoppersToDelete.push({
                    siteId: siteId,
                    locale: locale,
                    user: newShopperSession.profile
                });

                assert.strictEqual(
                    newShopperSession.response.status,
                    200,
                    'Failed to create new account'
                );

                var newShopperSessionCookiesAsObject =
                    testHelpers.cookiesAsObject(newShopperSession.cookies);

                // cookie value is set to '' instead of removing the key and Chai does not consider '' === undefined and fails. So converting '' to undefined.
                assert.notExists(
                    newShopperSessionCookiesAsObject[
                        expectedCookieNames.guest
                    ] || undefined,
                    'Response should delete guest cookie'
                );
                assert.exists(
                    newShopperSessionCookiesAsObject[
                        expectedCookieNames.registered
                    ],
                    'Response should set registered cookie'
                );

                // Get registered user basket
                var getCurrentRegisteredBasketRes = await fetch(
                    actions.GET_USER_BASKET,
                    {
                        headers: {
                            cookie: newShopperSession.cookies
                        }
                    }
                );
                var registeredUserBasket =
                    await await getCurrentRegisteredBasketRes.json();

                assert.exists(registeredUserBasket.basketID);
                assert.strictEqual(
                    registeredUserBasket.productQuantityTotal,
                    2,
                    'Item quantity in basket does not match after login'
                );
            }).timeout(config.timeouts.tests);

            it('Registered user login works and sets cookies', async function () {
                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        null,
                        siteId,
                        locale,
                        c.existingShopper.profile
                    );

                var registeredShopperCookiesAsObject =
                    testHelpers.cookiesAsObject(
                        registeredShopperSession.cookies
                    );

                assert.exists(
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.sessionGuard
                    ],
                    'Response should set session guard cookie'
                );
                assert.exists(
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.registered
                    ],
                    'Response should set registered cookie'
                );
                assert.exists(
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.accessToken
                    ],
                    'Response should set access token cookie'
                );
                assert.exists(
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.accessToken2
                    ],
                    'Response should set access token cookie part 2'
                );
            }).timeout(config.timeouts.tests);

            it('Registered refresh token triggers registered login', async function () {
                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        null,
                        siteId,
                        locale,
                        c.existingShopper.profile
                    );

                var registeredShopperCookiesAsObject =
                    testHelpers.cookiesAsObject(
                        registeredShopperSession.cookies
                    );

                // only set registered cookie so we trigger a refresh of registered user login
                var registeredRefreshResponse = await fetch(actions.HOME, {
                    headers: {
                        cookie:
                            expectedCookieNames.registered +
                            '=' +
                            registeredShopperCookiesAsObject[
                                expectedCookieNames.registered
                            ]
                    },
                    redirect: 'manual'
                });

                var registeredRefreshCookies = testHelpers.cookiesAsObject(
                    testHelpers
                        .parseCookies(registeredRefreshResponse)
                        .join(';')
                );

                assert.exists(
                    registeredRefreshCookies[expectedCookieNames.registered],
                    'Response should set a new registered cookie'
                );

                assert.exists(
                    registeredRefreshCookies[expectedCookieNames.accessToken],
                    'Refresh token response should set access token cookie'
                );
                assert.exists(
                    registeredRefreshCookies[expectedCookieNames.accessToken2],
                    'Refresh token response should set access token cookie part 2'
                );

                // For now, we do not expect the access token to go beyoned 2 parts
                var registeredAccessToken = [
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.accessToken
                    ],
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.accessToken2
                    ]
                ].join('');

                var refreshLoginAccessToken = [
                    registeredRefreshCookies[expectedCookieNames.accessToken],
                    registeredRefreshCookies[expectedCookieNames.accessToken2]
                ].join('');

                assert.notStrictEqual(
                    registeredAccessToken,
                    refreshLoginAccessToken,
                    'The new access token should not be the same as the previous'
                );

                if (!config.isPrivateClient) {
                    assert.notStrictEqual(
                        registeredShopperCookiesAsObject[
                            expectedCookieNames.registered
                        ],
                        registeredRefreshCookies[
                            expectedCookieNames.registered
                        ],
                        'For public SLAS client, the new registered cookie should not be the same as the previous'
                    );
                } else {
                    assert.strictEqual(
                        registeredShopperCookiesAsObject[
                            expectedCookieNames.registered
                        ],
                        registeredRefreshCookies[
                            expectedCookieNames.registered
                        ],
                        'For private SLAS client, the new registered cookie should be the same as the previous'
                    );
                }
            }).timeout(config.timeouts.tests);

            it('Registered user logout works', async function () {
                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        null,
                        siteId,
                        locale,
                        c.existingShopper.profile
                    );

                var registeredShopperCookiesAsObject =
                    testHelpers.cookiesAsObject(
                        registeredShopperSession.cookies
                    );
                assert.isEmpty(
                    registeredShopperCookiesAsObject[expectedCookieNames.guest],
                    'Response should delete guest cookie'
                );
                assert.exists(
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.registered
                    ],
                    'Response should set registered cookie'
                );

                // log registered customer out
                var logoutResponse = await fetch(actions.LOGOUT_PAGE, {
                    redirect: 'manual',
                    headers: { cookie: registeredShopperSession.cookies }
                });

                var logoutResponseCookies = testHelpers
                    .parseCookies(logoutResponse)
                    .join(';');

                var logoutResponseCookiesAsObject = testHelpers.cookiesAsObject(
                    logoutResponseCookies
                );

                assert.strictEqual(
                    logoutResponseCookiesAsObject[
                        expectedCookieNames.accessToken
                    ],
                    'refresh',
                    'Logout response should set access token to refresh'
                );

                assert.isNotTrue(
                    logoutResponseCookiesAsObject[expectedCookieNames.guest],
                    'Response should delete guest cookie'
                );
                assert.isNotTrue(
                    logoutResponseCookiesAsObject[
                        expectedCookieNames.registered
                    ],
                    'Response should delete registered cookie'
                );

                assert.isNotTrue(
                    logoutResponseCookiesAsObject[expectedCookieNames.usid],
                    'Response should delete usid cookie'
                );

                // Follow logout redirect to homepage
                var locationURL = new URL(
                    logoutResponse.headers.get('location'),
                    logoutResponse.url
                );

                var logoutRedirectResponse = await fetch(locationURL, {
                    headers: { cookie: logoutResponseCookies }
                });
                assert.strictEqual(
                    logoutRedirectResponse.status,
                    200,
                    'Logout redirect response should be a 200 OK'
                );
            }).timeout(config.timeouts.tests);

            it('Registered user logout works when refresh token is missing', async function () {
                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        null,
                        siteId,
                        locale,
                        c.existingShopper.profile
                    );

                var registeredShopperCookiesAsObject =
                    testHelpers.cookiesAsObject(
                        registeredShopperSession.cookies
                    );
                assert.isEmpty(
                    registeredShopperCookiesAsObject[expectedCookieNames.guest],
                    'Response should delete guest cookie'
                );
                assert.exists(
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.registered
                    ],
                    'Response should set registered cookie'
                );

                // Delete registered cookie for this test
                delete registeredShopperCookiesAsObject[
                    expectedCookieNames.registered
                ];
                registeredShopperSession.cookies =
                    testHelpers.objectToCookieString(
                        registeredShopperCookiesAsObject
                    );

                // log registered customer out
                var logoutResponse = await fetch(actions.LOGOUT_PAGE, {
                    redirect: 'manual',
                    headers: { cookie: registeredShopperSession.cookies }
                });

                var logoutResponseCookies = testHelpers
                    .parseCookies(logoutResponse)
                    .join(';');

                var logoutResponseCookiesAsObject = testHelpers.cookiesAsObject(
                    logoutResponseCookies
                );

                assert.strictEqual(
                    logoutResponseCookiesAsObject[
                        expectedCookieNames.accessToken
                    ],
                    'refresh',
                    'Logout response should set access token to refresh'
                );

                assert.isNotTrue(
                    logoutResponseCookiesAsObject[expectedCookieNames.guest],
                    'Response should delete guest cookie'
                );
                assert.isNotTrue(
                    logoutResponseCookiesAsObject[
                        expectedCookieNames.registered
                    ],
                    'Response should delete registered cookie'
                );

                assert.isNotTrue(
                    logoutResponseCookiesAsObject[expectedCookieNames.usid],
                    'Response should delete usid cookie'
                );

                // Follow logout redirect to homepage
                var locationURL = new URL(
                    logoutResponse.headers.get('location'),
                    logoutResponse.url
                );

                var logoutRedirectResponse = await fetch(locationURL, {
                    headers: { cookie: logoutResponseCookies }
                });
                assert.strictEqual(
                    logoutRedirectResponse.status,
                    200,
                    'Logout response should be a 200 OK'
                );
            }).timeout(config.timeouts.tests);

            it('Geolocation remains consistent after initial guest login', async function () {
                // Get Geolocation data when the request does not go through SLAS
                var geolocationNoSLAS = await fetch(
                    actions.GEOLOCATION_NO_SLAS
                );
                var geolocationNoSLASCookies = testHelpers.cookiesAsObject(
                    testHelpers.parseCookies(geolocationNoSLAS).join(';')
                );

                assert.notExists(
                    geolocationNoSLASCookies[expectedCookieNames.guest],
                    'Response should not create a guest cookie'
                );

                var geolocationNoSLASObject = await geolocationNoSLAS.json();

                // Get Geolocation data when the request goes through SLAS
                // This triggers an initial login in the background
                var geolocationResponse = await fetch(actions.GEOLOCATION);
                var geolocationCookies = testHelpers.cookiesAsObject(
                    testHelpers.parseCookies(geolocationResponse).join(';')
                );

                assert.exists(
                    geolocationCookies[expectedCookieNames.guest],
                    'Response should create a guest cookie'
                );

                var geolocationResponseObject =
                    await geolocationResponse.json();

                assert.strictEqual(
                    geolocationResponseObject.geolocation.countryCode,
                    geolocationNoSLASObject.geolocation.countryCode,
                    'Country code should match'
                );
                assert.strictEqual(
                    geolocationResponseObject.geolocation.latitude,
                    geolocationNoSLASObject.geolocation.latitude,
                    'Latitude data should match'
                );
                assert.strictEqual(
                    geolocationResponseObject.geolocation.longitude,
                    geolocationNoSLASObject.geolocation.longitude,
                    'Longitude data should match'
                );
            }).timeout(config.timeouts.tests);

            it('Geolocation remains consistent after refresh token login', async function () {
                // Get Geolocation data when the request does not go through SLAS
                var geolocationNoSLAS = await fetch(
                    actions.GEOLOCATION_NO_SLAS
                );
                var geolocationNoSLASCookies = testHelpers.cookiesAsObject(
                    testHelpers.parseCookies(geolocationNoSLAS).join(';')
                );

                assert.notExists(
                    geolocationNoSLASCookies[expectedCookieNames.guest],
                    'Response should not create a guest cookie'
                );

                var geolocationNoSLASObject = await geolocationNoSLAS.json();

                // initial guest login
                var guestLoginResponse = await fetch(actions.HOME, {
                    redirect: 'manual'
                });

                // only set guest cookie so we trigger a refresh of guest user login
                var initialLoginCookies = testHelpers.cookiesAsObject(
                    testHelpers.parseCookies(guestLoginResponse).join(';')
                );

                var secondGuestLogin = await fetch(actions.HOME, {
                    headers: {
                        cookie:
                            expectedCookieNames.guest +
                            '=' +
                            initialLoginCookies[expectedCookieNames.guest]
                    },
                    redirect: 'manual'
                });

                // session bridge is followed by a 302
                assert.strictEqual(
                    secondGuestLogin.status,
                    302,
                    'Response should be a 302 Redirect'
                );

                // Get Geolocation data when the request goes through SLAS refresh token flow
                var geolocationResponse = await fetch(actions.GEOLOCATION, {
                    headers: {
                        cookie: testHelpers
                            .parseCookies(secondGuestLogin)
                            .join(';')
                    }
                });

                var geolocationResponseObject =
                    await geolocationResponse.json();

                assert.strictEqual(
                    geolocationResponseObject.geolocation.countryCode,
                    geolocationNoSLASObject.geolocation.countryCode,
                    'Country code should match'
                );
                assert.strictEqual(
                    geolocationResponseObject.geolocation.latitude,
                    geolocationNoSLASObject.geolocation.latitude,
                    'Latitude data should match'
                );
                assert.strictEqual(
                    geolocationResponseObject.geolocation.longitude,
                    geolocationNoSLASObject.geolocation.longitude,
                    'Longitude data should match'
                );
            }).timeout(config.timeouts.tests);

            it('Geolocation remains consistent after registered user login', async function () {
                // Get Geolocation data when the request does not go through SLAS
                var geolocationNoSLAS = await fetch(
                    actions.GEOLOCATION_NO_SLAS
                );
                var geolocationNoSLASCookies = testHelpers.cookiesAsObject(
                    testHelpers.parseCookies(geolocationNoSLAS).join(';')
                );

                assert.notExists(
                    geolocationNoSLASCookies[expectedCookieNames.guest],
                    'Response should not create a guest cookie'
                );

                var geolocationNoSLASObject = await geolocationNoSLAS.json();

                // initial guest login
                var guestLoginResponse = await fetch(actions.HOME, {
                    redirect: 'manual'
                });
                var guestCookies = testHelpers
                    .parseCookies(guestLoginResponse)
                    .join(';');

                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        { cookies: guestCookies },
                        siteId,
                        locale,
                        c.existingShopper.profile
                    );

                var registeredCookies = testHelpers.cookiesAsObject(
                    registeredShopperSession.cookies
                );
                assert.isEmpty(
                    registeredCookies[expectedCookieNames.guest],
                    'Response should delete guest cookie'
                );
                assert.exists(
                    registeredCookies[expectedCookieNames.registered],
                    'Response should set registered cookie'
                );

                // Get Geolocation data when the request goes through SLAS refresh token flow
                var geolocationResponse = await fetch(actions.GEOLOCATION, {
                    headers: {
                        cookie: registeredShopperSession.cookies
                    }
                });

                var geolocationResponseObject =
                    await geolocationResponse.json();

                assert.strictEqual(
                    geolocationResponseObject.geolocation.countryCode,
                    geolocationNoSLASObject.geolocation.countryCode,
                    'Country code should match'
                );
                assert.strictEqual(
                    geolocationResponseObject.geolocation.latitude,
                    geolocationNoSLASObject.geolocation.latitude,
                    'Latitude data should match'
                );
                assert.strictEqual(
                    geolocationResponseObject.geolocation.longitude,
                    geolocationNoSLASObject.geolocation.longitude,
                    'Longitude data should match'
                );
            }).timeout(config.timeouts.tests);

            it('Custom session attributes are restored after session bridge', async function () {
                // initial guest login
                var guestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        null,
                        siteId,
                        locale
                    );

                // set custom session attributes on guest session
                var guestSessionResponse = await fetch(
                    actions.SET_SESSION_ATTRS,
                    {
                        headers: { cookie: guestShopperSession.cookies }
                    }
                ).then(function (res) {
                    return res.json();
                });

                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        guestShopperSession,
                        siteId,
                        locale,
                        c.existingShopper.profile
                    );

                // get custom session attributes on registered user session
                var registeredSessionResponse = await fetch(
                    actions.GET_SESSION_ATTRS,
                    {
                        headers: { cookie: registeredShopperSession.cookies }
                    }
                ).then(function (res) {
                    return res.json();
                });

                assert.strictEqual(
                    guestSessionResponse.sessionAttributes.custom.customCounter,
                    registeredSessionResponse.sessionAttributes.custom
                        .customCounter,
                    'customCounter custom session attribute should match'
                );
                assert.strictEqual(
                    guestSessionResponse.sessionAttributes.custom.custom1,
                    registeredSessionResponse.sessionAttributes.custom.custom1,
                    'custom1 custom session attribute should match'
                );
                assert.strictEqual(
                    guestSessionResponse.sessionAttributes.custom.custom2,
                    registeredSessionResponse.sessionAttributes.custom.custom2,
                    'custom2 custom session attribute should match'
                );
                assert.strictEqual(
                    guestSessionResponse.sessionAttributes.privacy.privacy1,
                    registeredSessionResponse.sessionAttributes.privacy
                        .privacy1,
                    'privacy1 private session attribute should match'
                );
                assert.strictEqual(
                    guestSessionResponse.sessionAttributes.privacy
                        .privateCounter,
                    registeredSessionResponse.sessionAttributes.privacy
                        .privateCounter,
                    'privateCounter private session attribute should match'
                );
            }).timeout(config.timeouts.tests);

            it('Custom session attributes are not restored after logout', async function () {
                // initial guest login
                var guestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        null,
                        siteId,
                        locale
                    );

                // set custom session attributes on guest session
                var guestSessionResponse = await fetch(
                    actions.SET_SESSION_ATTRS,
                    {
                        headers: { cookie: guestShopperSession.cookies }
                    }
                ).then(function (res) {
                    return res.json();
                });

                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        guestShopperSession,
                        siteId,
                        locale,
                        c.existingShopper.profile
                    );

                // get custom session attributes on registered user session
                var registeredSessionResponse = await fetch(
                    actions.GET_SESSION_ATTRS,
                    {
                        headers: { cookie: registeredShopperSession.cookies }
                    }
                ).then(function (res) {
                    return res.json();
                });

                assert.strictEqual(
                    guestSessionResponse.sessionAttributes.custom.customCounter,
                    registeredSessionResponse.sessionAttributes.custom
                        .customCounter,
                    'customCounter custom session attribute should match'
                );
                assert.strictEqual(
                    guestSessionResponse.sessionAttributes.privacy
                        .privateCounter,
                    registeredSessionResponse.sessionAttributes.privacy
                        .privateCounter,
                    'privateCounter private session attribute should match'
                );

                // log registered customer out
                var logoutResponse = await fetch(actions.LOGOUT_PAGE, {
                    redirect: 'manual'
                });
                var logoutCookies = testHelpers
                    .parseCookies(logoutResponse)
                    .join(';');
                // get custom session attributes on logout/guest user session
                var logoutSessionResponse = await fetch(
                    actions.GET_SESSION_ATTRS,
                    {
                        headers: { cookie: logoutCookies }
                    }
                ).then(function (res) {
                    return res.json();
                });

                assert.notExists(
                    logoutSessionResponse.sessionAttributes.custom
                        .customCounter,
                    'customCounter custom session attribute should not exist'
                );
                assert.notExists(
                    logoutSessionResponse.sessionAttributes.privacy
                        .privateCounter,
                    'privateCounter private session attribute should not exist'
                );
            }).timeout(config.timeouts.tests);

            it('Shopper account login on checkout page works', async function () {
                // Init guest login
                var guestShopperSession =
                    await testHelpers.getGuestShopperSession(
                        null,
                        siteId,
                        locale
                    );

                // Add item to guest cart
                var formData = new URLSearchParams({
                    pid: '701642923497M',
                    quantity: 2,
                    options: []
                });

                var addToBasketRes = await fetch(actions.ADD_TO_CART, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        cookie: guestShopperSession.cookies
                    }
                });

                assert.strictEqual(
                    addToBasketRes.status,
                    200,
                    'Failed to add item to guest basket'
                );

                // Verify item exists in guest basket
                var getCurrentBasketRes = await fetch(actions.GET_USER_BASKET, {
                    headers: {
                        cookie: guestShopperSession.cookies
                    }
                });
                var guestBasket = await await getCurrentBasketRes.json();

                assert.exists(guestBasket.basketID);
                assert.strictEqual(
                    guestBasket.productQuantityTotal,
                    2,
                    'Item quantity in basket does not match'
                );

                // Login guest user and get registered user JWT
                var registeredShopperSession =
                    await testHelpers.getRegisteredShopperSession(
                        guestShopperSession,
                        siteId,
                        locale,
                        c.existingShopper.profile,
                        true
                    );

                var registeredShopperCookiesAsObject =
                    testHelpers.cookiesAsObject(
                        registeredShopperSession.cookies
                    );

                assert.isEmpty(
                    registeredShopperCookiesAsObject[expectedCookieNames.guest],
                    'Response should delete guest cookie'
                );
                assert.exists(
                    registeredShopperCookiesAsObject[
                        expectedCookieNames.registered
                    ],
                    'Response should set registered cookie'
                );

                // Get registered user basket
                var getCurrentRegisteredBasketRes = await fetch(
                    actions.GET_USER_BASKET,
                    {
                        headers: {
                            cookie: registeredShopperSession.cookies
                        }
                    }
                );
                var registeredUserBasket =
                    await await getCurrentRegisteredBasketRes.json();

                assert.exists(registeredUserBasket.basketID);
                assert.strictEqual(
                    registeredUserBasket.productQuantityTotal,
                    2,
                    'Item quantity in basket does not match after login'
                );
            }).timeout(config.timeouts.tests);
        });
    });

    it('Session is reused when switching between sites', async function () {
        var firstSiteActions = testHelpers.getActions(
            config.cases[0].siteId,
            config.cases[0].locale
        );
        var secondSiteActions = testHelpers.getActions(
            config.cases[1].siteId,
            config.cases[1].locale
        );

        // guest login to first site
        var guestLoginSessionFirstSite =
            await testHelpers.getGuestShopperSession(
                null,
                config.cases[0].siteId,
                config.cases[0].locale
            );
        assert.strictEqual(
            guestLoginSessionFirstSite.response.status,
            200,
            'Response should be a 200 redirect'
        );
        assert.strictEqual(
            guestLoginSessionFirstSite.response.url,
            firstSiteActions.HOME,
            'Response redirect should be to the same page'
        );

        var guestLoginCookiesFirstSiteAsObject = testHelpers.cookiesAsObject(
            guestLoginSessionFirstSite.cookies
        );
        assert.exists(
            guestLoginCookiesFirstSiteAsObject[
                config.cases[0].expectedCookieNames.sessionGuard
            ],
            'Response should set session guard cookie'
        );
        assert.exists(
            guestLoginCookiesFirstSiteAsObject[
                config.cases[0].expectedCookieNames.guest
            ],
            'Response should set guest cookie'
        );

        // guest login to second site
        var guestLoginSessionSecondSite =
            await testHelpers.getGuestShopperSession(
                null,
                config.cases[1].siteId,
                config.cases[1].locale
            );
        assert.strictEqual(
            guestLoginSessionSecondSite.response.status,
            200,
            'Response should be a 200 redirect'
        );
        assert.strictEqual(
            guestLoginSessionSecondSite.response.url,
            secondSiteActions.HOME,
            'Response redirect should be to the same page'
        );

        var guestLoginCookiesSecondSiteAsObject = testHelpers.cookiesAsObject(
            guestLoginSessionSecondSite.cookies
        );
        assert.exists(
            guestLoginCookiesSecondSiteAsObject[
                config.cases[1].expectedCookieNames.sessionGuard
            ],
            'Response should set session guard cookie'
        );
        assert.exists(
            guestLoginCookiesSecondSiteAsObject[
                config.cases[1].expectedCookieNames.guest
            ],
            'Response should set guest cookie'
        );
        // emulate a broswer by combinding cookies from both responses for third request.
        var combinedCookiesObj = testHelpers.mergeObjects(
            guestLoginCookiesFirstSiteAsObject,
            guestLoginCookiesSecondSiteAsObject
        );
        var combinedCookies = Object.keys(combinedCookiesObj).map(
            function (key) {
                var cookieValue = combinedCookiesObj[key] || '""';
                return key + '=' + cookieValue;
            }
        );

        // subsequent request
        var secondResponse = await testHelpers.getGuestShopperSession(
            { cookies: combinedCookies.join(';') },
            config.cases[0].siteId,
            config.cases[0].locale
        );
        var secondResponseCookiesAsObject = testHelpers.cookiesAsObject(
            secondResponse.cookies
        );

        assert.isTrue(
            secondResponse.response.ok,
            'Subsequent response should not be a redirect'
        );
        assert.notExists(
            secondResponseCookiesAsObject[
                config.cases[0].expectedCookieNames.sessionGuard
            ] || undefined,
            'Subsequent response should not set session guard cookie'
        );
        assert.notExists(
            secondResponseCookiesAsObject[
                config.cases[0].expectedCookieNames.guest
            ] || undefined,
            'Subsequent response should not set session guard cookie'
        );
    }).timeout(config.timeouts.tests);
});
