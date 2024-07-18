'use strict';

/* global request */

var Cookie = require('dw/web/Cookie');

var slasAuthService = require('*/cartridge/scripts/services/SLASAuthService');
var sessionBridge = require('*/cartridge/scripts/services/SessionBridgeService');
var config = require('*/cartridge/scripts/config/SLASConfig');
var sessionHelpers = require('*/cartridge/scripts/helpers/slasSessionHelpers');
var controllerService = require('*/cartridge/scripts/services/ControllerService');
var slasServiceUtils = require('*/cartridge/scripts/services/slasServiceUtils');

/**
 * save cookies to HTTP response
 * @param {string[]} cookieStrings - array of set-Cookie header strings
 * @returns {Object} plain javascript object with cookie names and values
 */
function convertCookieStringsToObject(cookieStrings) {
    var cookieObject = {};
    cookieStrings.toArray().forEach(function (cookieString) {
        var cookieParts = cookieString.split(';');
        var nameValue = cookieParts.shift().split('=');
        var name = nameValue.shift();
        var value = nameValue.join('=');
        value = decodeURIComponent(value);
        var newCookie = { value: value };
        cookieParts.forEach(function (part) {
            var sides = part.split('=');
            var key = sides.shift().trim().toLowerCase();
            value = sides.join('=');
            if (key === 'path') {
                newCookie.path = value;
            } else if (key === 'max-age') {
                newCookie.maxAge = parseInt(value, 10);
            }
        });
        cookieObject[name] = newCookie;
    });
    return cookieObject;
}

/**
 * Creates the cookie
 * @param {string}name - cookie to be created
 * @param {string}value - refresh_token to be set as value
 * @param {number}age - age of the cookie
 * @returns {dw.web.Cookie} - new persistent cookie
 */
function createCookie(name, value, age) {
    var newCookie = new Cookie(name, value);
    newCookie.setHttpOnly(false); // set as required for PWA hybrid solution
    newCookie.setSecure(true);
    if (age) {
        newCookie.setMaxAge(age);
    }
    newCookie.setPath('/');
    return newCookie;
}

/**
 * Retrieves cookie
 * @param {string}name - cookie to retrieve
 * @returns {dw.web.Cookie} retrieved refresh_token cookie
 */
function getCookie(name) {
    var refreshTokenCookie;
    var cookies = request.getHttpCookies();
    var cookieCount = cookies.getCookieCount();
    for (var i = 0; i < cookieCount; i++) {
        if (name === cookies[i].getName()) {
            refreshTokenCookie = cookies[i];
            break;
        }
    }
    return refreshTokenCookie;
}

/**
 * Removes cookie
 * @param {string} name - cookie to be removed
 * @param {dw.system.Response} resp - response object
 */
function removeCookie(name, resp) {
    var cookies = request.getHttpCookies();
    var cookieCount = cookies.getCookieCount();
    for (var i = 0; i < cookieCount; i++) {
        if (name === cookies[i].getName()) {
            var cookie = cookies[i];
            cookie.value = '';
            cookie.setMaxAge(0);
            cookie.setPath('/');
            resp.addHttpCookie(cookie);
            break;
        }
    }
}

/**
 *
 * @param {Object[]} cookiesToSet - cookies to be added to response object.
 * @property {string} cookieToSet.value - value of cookie.
 * @property {number} cookieToSet.maxAge - time to live for cookie.
 * @param {Object} response - response object to set the cookies to. {dw.system.Response} if SLAS was triggered from onSession.
 * {res.base} if SLAS was triggered from Login Page.
 */
function setCookiesToResponse(cookiesToSet, response) {
    Object.keys(cookiesToSet).forEach(function (key) {
        // Append empty string to force string conversion and ensure access to match().
        // Otherwise value could be a number / boolean / null / undefined.
        var value = cookiesToSet[key].value + '';
        var maxAge = cookiesToSet[key].maxAge;

        // ECOM starts to throw a cookie maxValueLength warning at 1200 characters though the hard limit is 2000 characters.
        // If the value exceeds 1200 characters, we split it across multiple keys to remain under the threshold and avoid
        // warnings appearing in ECOM logs.
        // One case where this applies is the SLAS JWT, which typically exceeds 2000 characters.
        var valueParts = value.match(/.{1,1199}/g);

        // Early exit if no chunking occured. Also handles the case where value is an empty string ie. when deleting cookies.
        if (!valueParts || valueParts.length < 2) {
            response.addHttpCookie(createCookie(key, value, maxAge));
            return;
        }

        var partCount = 1;
        valueParts.forEach(function (valuePart) {
            var cookieKey = key;

            // A bit of future-proofing here.
            // We omit adding the part to the first part of the key so we can more easily drop
            // part 2 and above once we can store the full value in a single cookie.
            // Results in the following: Part 1 is cc-at. Part 2 is cc-at_2, etc.
            if (partCount > 1) {
                cookieKey = cookieKey + '_' + partCount;
            }
            var cookie = createCookie(cookieKey, valuePart, maxAge);
            response.addHttpCookie(cookie);
            partCount += 1;
        });
    });
}

/**
 * Get SLAS tokens for current new session using SLAS session-bridge.
 * @param {string} sessionId - Guest session id / signature.
 * @returns {Object} object containg SLAS tokens.
 */
function getSLASAccessTokenForGuestSessionBridge(sessionId) {
    var sessionBridgeAccessTokenParameters = {};

    if (!slasServiceUtils.isPrivateClient()) {
        var authorizeResponse = slasAuthService.authorizeCustomer({
            hint: 'sb-guest'
        });

        sessionBridgeAccessTokenParameters.usid = authorizeResponse.usid;
        sessionBridgeAccessTokenParameters.code = authorizeResponse.code;
        sessionBridgeAccessTokenParameters.code_verifier =
            authorizeResponse.code_verifier;
    }

    if (config.USE_DWGST) {
        sessionBridgeAccessTokenParameters.dwsgst = sessionId;
    } else {
        sessionBridgeAccessTokenParameters.dwsid = sessionId;
    }

    return slasAuthService.getSessionBridgeAccessToken(
        sessionBridgeAccessTokenParameters
    );
}

/**
 * Get SLAS tokens for regsitered user login flow.
 * @param {Object} options request options to pass to authenticate service.
 * @property {string} options.username username of the shopper.
 * @property {string} options.password password of the shopper.
 * @property {string} options.usid value of the usid cookie.
 * @returns {Object} object containing SLAS tokens.
 */
function getSLASAccessTokenForRegisteredShoppers(options) {
    var authenticateResponse = slasAuthService.authenticateCustomer(options);

    var tokenResponse = slasAuthService.getAccessToken({
        grant_type: config.GRANT_TYPE_AUTH_CODE_PKCE,
        code_verifier: authenticateResponse.code_verifier,
        usid: authenticateResponse.usid,
        code: authenticateResponse.code
    });

    return tokenResponse;
}

/**
 * Get SLAS token for refresh token user login flow.
 * @param {string} refreshToken a refresh token
 * @returns {Object} object containing SLAS tokens.
 */
function getSLASAccessTokenForRefreshLogin(refreshToken) {
    return slasAuthService.getAccessToken({
        grant_type: config.GRANT_TYPE_REFRESH_TOKEN,
        refresh_token: refreshToken
    });
}

/**
 * Establish session with session bridge using the access token.
 * @param {string}accessToken - access_token to be used to establish session.
 * @param {string}ipAddress - remoteAddress from the origin of the request.
 * @returns {Object} - cookies to be set from session bridge call.
 */
function getOCAPISessionBridgeCookies(accessToken, ipAddress) {
    var responseCookies = sessionBridge.getSession(accessToken, ipAddress);

    var cookieObject = convertCookieStringsToObject(responseCookies);

    if (!config.RESTORE_SESSION_ATTRIBUTES) {
        return cookieObject;
    }

    if (!cookieObject.dwsid) {
        throw new Error('Failed to restore session attributes');
    }

    // call internal controller with new dwsid and save session variables to new session
    var authorizationHeader = sessionHelpers.getEncodedServiceCredentials(
        config.SERVICE_IDS.INTERNAL_CONTROLLER
    );

    if (!authorizationHeader) {
        throw new Error(
            'Service credentials were not set for "plugin_slas.internal-controller.cred", session attributes will not be restored!'
        );
    }

    if (authorizationHeader) {
        var parameters = {
            authorizationHeader: authorizationHeader,
            dwsid: cookieObject.dwsid.value,
            sessionVars: sessionHelpers.getSessionVars()
        };
        controllerService.saveSessionVars(parameters);
    }

    return cookieObject;
}

/**
 * Logs out the customer using SLAS.
 * @param {string}refreshToken - use refresh token to log out.
 * @param {string}accessToken - registered user JWT required to validate client.
 * @returns {Object} response from logout API call.
 */
function logoutCustomer(refreshToken, accessToken) {
    var logoutResponse = slasAuthService.logoutCustomer({
        refresh_token: refreshToken,
        access_token: accessToken
    });
    return logoutResponse;
}

/**
 *  Check if the request URI is valid to be considered for guest login or registered user's token refresh
 *  @param {string}requestURI - the request URI
 *  @returns {boolean} indicating if the request URI is valid for guest login
 */
function isValidRequestURI(requestURI) {
    var isValidURI = true;
    var excludedURIs = config.CONTROLLERS_TO_EXCLUDE;
    for (var i = 0; i < excludedURIs.length; i++) {
        if (requestURI.indexOf(excludedURIs[i]) !== -1) {
            isValidURI = false;
            break;
        }
    }
    return isValidURI;
}

module.exports = {
    createCookie: createCookie,
    getCookie: getCookie,
    removeCookie: removeCookie,
    getSLASAccessTokenForGuestSessionBridge:
        getSLASAccessTokenForGuestSessionBridge,
    getSLASAccessTokenForRegisteredShoppers:
        getSLASAccessTokenForRegisteredShoppers,
    getSLASAccessTokenForRefreshLogin: getSLASAccessTokenForRefreshLogin,
    getOCAPISessionBridgeCookies: getOCAPISessionBridgeCookies,
    logoutCustomer: logoutCustomer,
    isValidRequestURI: isValidRequestURI,
    setCookiesToResponse: setCookiesToResponse
};
