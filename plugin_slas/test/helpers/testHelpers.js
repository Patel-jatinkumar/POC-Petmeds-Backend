'use strict';

var nodeFetch = require('node-fetch');
var config = require('../config/testConfig');
var fetch = require('node-fetch');
var JSDOM = require('jsdom').JSDOM;

var areaCodes = {
    en_US: '857',
    en_GB: '0120'
};
/* global Promise */

var delay = function (t, val) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve(val);
        }, t);
    });
};

/**
 * Extract cookies from response headers by reading 'set-cookie' headers and extracting substring until the first ';' in the value.
 * @param {Object} response HTTP response object
 * @returns list of key=value cookies
 */
var parseCookies = function (response) {
    var cookiesToSet = response.headers.raw()['set-cookie'];
    return cookiesToSet.map(function (entry) {
        var parts = entry.split(';');
        var cookiePart = parts[0];
        return cookiePart;
    });
};

/**
 * Converts a cookie string or a ';' separated string (eg: a=1;b=2;c=3) to a javascript object (eg: {a: 1, b: 2, c: 3})
 * @param {string} cookieString string containing key=value pairs separated by a ';' (eg: a=1;b=2;c=3)
 * @returns converted javascript object (eg: {a: 1, b: 2, c: 3})
 */
var cookiesAsObject = function (cookieString) {
    return Object.fromEntries(
        cookieString
            .split(';')
            .filter(Boolean)
            .map(function (v) {
                var idx = v.indexOf('=');
                return idx > -1
                    ? [v.slice(0, idx), v.slice(idx + 1).replace('""', '')]
                    : [v];
            })
    );
};

/**
 * Converts a javascrit object into a ';' separated string (eg: a=1;b=2;c=3)
 * @param {Object} obj object key=value pairs
 * @returns string containing key=value pairs separated by a ';' (eg: a=1;b=2;c=3)
 */
var objectToCookieString = function (obj) {
    var str = '';
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i += 1) {
        str = str + keys[i] + '=' + obj[keys[i]] + ';';
    }
    str.slice(0, -1);

    return str;
};

/**
 * Merges given js objects the latter value for a duplicate parameter will be used if found.
 * @returns Merged js object
 */
var mergeObjects = function () {
    var resObj = {};
    for (var i = 0; i < arguments.length; i += 1) {
        var obj = arguments[i];
        var keys = Object.keys(obj);
        for (var j = 0; j < keys.length; j += 1) {
            resObj[keys[j]] = obj[keys[j]];
        }
    }
    return resObj;
};

/**
 * Builder function to generate storefront URLs for user actions based on siteId and locale.
 * @param {string} site siteID of currently active storefront (eg.: RefArch, RefArchGlobal, etc.).
 * @param {string} locale locale of currently active storefront (eg.: en_US, en_GB, fr_FR, etc.).
 * @returns Object containing storefront URLs for user actions.
 */
var getActions = function (site, locale) {
    var basePath =
        config.env.SFCC_BASE_URL +
        '/on/demandware.store/Sites-' +
        site +
        '-Site/' +
        locale;

    return {
        HOME: basePath,
        LOGIN: basePath + '/Account-Login',
        REGISTER: basePath + '/Account-SubmitRegistration',
        LOGIN_PAGE: basePath + '/Login-Show',
        LOGOUT_PAGE: basePath + '/Login-Logout',
        GEOLOCATION: basePath + '/TestHelper-TestGeoLocation',
        GEOLOCATION_NO_SLAS:
            basePath + '/TestHelper-TestGeoLocationSlasExclude',
        SET_SESSION_ATTRS: basePath + '/TestHelper-SetSessionVars',
        GET_SESSION_ATTRS: basePath + '/TestHelper-GetSessionVars',
        ADD_TO_CART: basePath + '/Cart-AddProduct',
        DELETE_BASKET: basePath + '/BasketTestHelper-DeleteBasket',
        GET_USER_BASKET: basePath + '/BasketTestHelper-CurrentOrNewBasket',
        GET_REGISTERED_JWT: basePath + '/TestHelper-GetRegisteredUserJWT',
        REMOVE_CUSTOMER: basePath + '/CustomerTestHelper-DeleteCustomer',
        FETCH: basePath + '/TestFetch-TestFetch',
        FETCH_STATUS: basePath + '/TestFetch-GetStatus',
        FETCH_ANYTHING: basePath + '/TestFetch-GetAnything',
        CHECKOUT_PAGE: basePath + '/Checkout-Begin',
        CHECKOUT_LOGIN: basePath + '/CheckoutServices-LoginCustomer'
    };
};

/**
 * Generates a random string of given length containing uppercase letters, lowercase letters and numbers.
 * @param {number} length Length of generated string required.
 * @returns Randomly generated alphanumeric string.
 */
var generateRandomString = function (length) {
    var randomString = '';
    var characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    var counter = 0;
    while (counter < length) {
        randomString += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
        counter += 1;
    }
    return randomString;
};

/**
 * Generates a random valid phone number string
 * @param {number} length Length of generated string required.
 * @returns Randomly generated numeric string.
 */
var generateRandomPhoneNumber = function (length) {
    // US Phone numbers must have the format NXX NXX-XXXX
    // where N cannot be 0 or 1.
    // The area code cannot have 9 in the 2nd digit
    // The middle 3 digits cannot be N11

    var randomPhone = '';
    var validNumbers = '23456789'; // exclude 0 or 1 to keep things simple
    var validNumbersLength = validNumbers.length;
    var counter = 0;
    while (counter < length) {
        randomPhone += validNumbers.charAt(
            Math.floor(Math.random() * validNumbersLength)
        );
        counter += 1;
    }
    return randomPhone;
};

/**
 * Generates a random user object containing firstName, lastName, phone, email and password based on locale (Supports en_US and en_GB only).
 * @param {string} locale locale of currently active storefront (en_US or en_GB).
 * @returns Object containing randomly generated user data.
 */
var generateUserCredentials = function (locale) {
    var user = {};
    user.firstName = generateRandomString(8);
    user.lastName = generateRandomString(8);
    user.phone = areaCodes[locale] + generateRandomPhoneNumber(7);
    user.email = (generateRandomString(12) + '@domain.com').toLowerCase();
    user.password = generateRandomString(15) + 'Ab1!%&*$#@^+:;=?';

    return user;
};

/**
 * Requests storefront homepage, to generate new guest session or restore existing guest session.
 * @param {object} shopperSession Session details for previously logged in guest user. ({cookies: ...}).
 * @param {string} siteId siteId of currently active storefront (eg.: RefArch, RefArchGlobal).
 * @param {string} locale locale of currently active storefront (eg.: en_US, en_GB, etc.).
 * @returns Session details for current active guest session ({cookies: ..., response: ...}).
 */
var getGuestShopperSession = async function (shopperSession, siteId, locale) {
    var actions = getActions(siteId, locale);

    var headers =
        shopperSession && shopperSession.cookies
            ? { cookie: shopperSession.cookies }
            : {};

    // initial guest login
    var guestLoginResponse = await fetch(actions.HOME, {
        redirect: 'manual',
        headers: headers
    });
    var guestSession = await parseCookies(guestLoginResponse).join(';');

    return { cookies: guestSession, response: guestLoginResponse };
};

/**
 * Login a registered user using email and password into the storefront. Passin guest session cookies to associate guest user with logged in user.
 * @param {object} shopperSession Session cookies for existing guest user or previously logged-in user.
 * @param {string} siteId siteId of currently active storefront (eg.: RefArch, RefArchGlobal).
 * @param {string} locale locale of currently active storefront (eg.: en_US, en_GB, etc.).
 * @param {object} user Email and password of shopper to login.
 * @returns Session details for current active regsitered user session ({cookies: ..., response: ...}).
 */
var getRegisteredShopperSession = async function (
    shopperSession,
    siteId,
    locale,
    user,
    isCheckoutPage
) {
    var actions = getActions(siteId, locale);

    if (!user || !user.email || !user.password) {
        throw new Error('User credentials missing');
    }

    shopperSession =
        shopperSession || (await getGuestShopperSession(null, siteId, locale));
    // fetch a csrf token from the login form
    var response = await fetch(
        isCheckoutPage ? actions.CHECKOUT_PAGE : actions.LOGIN_PAGE,
        {
            headers: { cookie: shopperSession.cookies }
        }
    ).then(function (res) {
        return res.text();
    });
    var csrfToken = new JSDOM(response).window.document.querySelector(
        'input[name="csrf_token"]'
    ).value;

    var form;
    if (isCheckoutPage) {
        form = new URLSearchParams({
            dwfrm_coRegisteredCustomer_email: user.email,
            dwfrm_coRegisteredCustomer_password: user.password,
            csrf_token: csrfToken
        });
    } else {
        form = new URLSearchParams({
            loginEmail: user.email,
            loginPassword: user.password,
            loginRememberMe: true,
            csrf_token: csrfToken
        });
    }

    var registeredLoginResponse = await fetch(
        isCheckoutPage ? actions.CHECKOUT_LOGIN : actions.LOGIN,
        {
            method: 'POST',
            body: form,
            redirect: 'manual',
            headers: {
                cookie: shopperSession.cookies
            }
        }
    );

    var regsiteredLoginCookies = await parseCookies(
        registeredLoginResponse
    ).join(';');

    return {
        cookies: regsiteredLoginCookies,
        response: registeredLoginResponse
    };
};

/**
 * Creates new user account on currently active storefront.
 * @param {*} shopperSession existing shopper session (eg.: guest shopper session trying to register) details.
 * @param {*} siteId siteId of currently active storefront (eg.: RefArch, RefArchGlobal).
 * @param {*} locale locale of currently active storefront (eg.: en_US, en_GB, etc.).
 * @param {*} newUserData data for new user to be created
 * @returns Session details for current active registered user session ({cookies: ..., response: ..., user: ...}).
 */
var registerNewShopper = async function (
    shopperSession,
    siteId,
    locale,
    newUserData
) {
    var actions = getActions(siteId, locale);
    var newUser = newUserData || generateUserCredentials(locale);

    shopperSession =
        shopperSession || (await getGuestShopperSession(null, siteId, locale));
    // fetch a csrf token from the login form
    var response = await fetch(actions.LOGIN_PAGE, {
        headers: { cookie: shopperSession.cookies }
    }).then(function (res) {
        return res.text();
    });

    var csrfToken = new JSDOM(response).window.document.querySelector(
        'input[name="csrf_token"]'
    ).value;

    var createAccountFormData = new URLSearchParams({
        dwfrm_profile_customer_firstname: newUser.firstName,
        dwfrm_profile_customer_lastname: newUser.lastName,
        dwfrm_profile_customer_phone: newUser.phone,
        dwfrm_profile_customer_email: newUser.email,
        dwfrm_profile_customer_emailconfirm: newUser.email,
        dwfrm_profile_login_password: newUser.password,
        dwfrm_profile_login_passwordconfirm: newUser.password,
        csrf_token: csrfToken
    });

    var createAccountRes = await fetch(actions.REGISTER, {
        method: 'POST',
        body: createAccountFormData,
        redirect: 'manual',
        headers: {
            cookie: shopperSession.cookies
        }
    });

    var createAccountCookies = await parseCookies(createAccountRes).join(';');

    return {
        cookies: createAccountCookies,
        response: createAccountRes,
        profile: newUser
    };
};

/**
 * Logout shopper and delete a registered shopper account. Requires user to be logged in.
 * @param {string} siteId siteId of currently active storefront (eg.: RefArch, RefArchGlobal).
 * @param {string} locale locale of currently active storefront (eg.: en_US, en_GB, etc.).
 * @param {Object} user Email and password of shopper to login.
 * @returns http response object for `actions.REMOVE_CUSTOMER`
 */
var removeRegisteredShopper = async function (siteId, locale, user) {
    if (!user || !user.email || !user.password) {
        throw new Error('User credentials required');
    }

    var actions = getActions(siteId, locale);

    var registeredShopperSession = await getRegisteredShopperSession(
        null,
        siteId,
        locale,
        user
    );

    // Remove customer account after tests have executed.
    return await await fetch(actions.REMOVE_CUSTOMER, {
        headers: {
            cookie: registeredShopperSession.cookies
        }
    });
};

/**
 * Deletes shopper basket. Requires customer to be logged-in and must have an active basket.
 * @param {string} siteId siteId of currently active storefront (eg.: RefArch, RefArchGlobal).
 * @param {string} locale locale of currently active storefront (eg.: en_US, en_GB, etc.).
 * @param {Object} user Email and password of shopper to login.
 * @returns http response object for `actions.DELETE_BASKET`
 */
var removeBasket = async function (siteId, locale, user) {
    if (!user || !user.email || !user.password) {
        throw new Error('User credentials required');
    }

    var actions = getActions(siteId, locale);

    var registeredShopperSession = await getRegisteredShopperSession(
        null,
        siteId,
        locale,
        user
    );

    // Remove customer account after tests have executed.
    return await await fetch(actions.DELETE_BASKET, {
        headers: {
            cookie: registeredShopperSession.cookies
        }
    });
};

/**
 *
 * @param {Object} args Config params to be passed to Plugin SLAS Fetch layer.
 * @param {String} args.serviceName Name of Plugin SLAS service to be called.
 * @param {String} args.url URL for the service being called.
 * @returns
 */
async function callFetchWith(args) {
    var actions = getActions('RefArch', 'en_US');

    return await nodeFetch(actions.FETCH, {
        method: 'POST',
        headers: {
            // This header is required to have the controller output JSON rather than rendering the page
            'x-requested-with': 'XMLHttpRequest'
        },
        body: JSON.stringify(args)
    });
}

module.exports = {
    delay: delay,
    mergeObjects: mergeObjects,
    parseCookies: parseCookies,
    cookiesAsObject: cookiesAsObject,
    objectToCookieString: objectToCookieString,
    getActions: getActions,
    generateUserCredentials: generateUserCredentials,
    getRegisteredShopperSession: getRegisteredShopperSession,
    getGuestShopperSession: getGuestShopperSession,
    registerNewShopper: registerNewShopper,
    removeRegisteredShopper: removeRegisteredShopper,
    removeBasket: removeBasket,
    callFetchWith: callFetchWith
};
