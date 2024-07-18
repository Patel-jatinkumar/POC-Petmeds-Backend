'use strict';

/* global request, response, session */

var Status = require('dw/system/Status');

var slasAuthHelper = require('*/cartridge/scripts/helpers/slasAuthHelper');
var slasAuthService = require('*/cartridge/scripts/services/SLASAuthService');
var config = require('*/cartridge/scripts/config/SLASConfig');
var urlHelper = require('*/cartridge/scripts/helpers/urlHelper');

/**
 * Checks to see if there is a session guard in place. This guard is used in refresh token login flows
 * to stop loops caused by the post-login session bridge creating a new dwsid.
 * @returns {boolean} boolean value suggesting if session guard is active.
 */
function isSessionGuardActive() {
    var dwsidCookie = slasAuthHelper.getCookie(config.DWSID_COOKIE_NAME);

    var sessionGuardCookie = slasAuthHelper.getCookie(
        config.SESSION_GUARD_COOKIE_NAME
    );

    /*
        Session guard is active if:
        a) a dwsid cookie exists. If there is no dwsid cookie, ECOM will assign a brand new dwsid and we should log in.
        b) a cc-sg cookie exists.
        c) the cc-sg cookie is younger than 30 minutes
    */
    // TODO: Can probably lower this to only be active for 1 minute.
    var activeSessionGuard =
        dwsidCookie &&
        sessionGuardCookie &&
        sessionGuardCookie.maxAge < 30 * 60;

    // Session guard has been used to block loop. Can now remove the session guard cookie
    slasAuthHelper.removeCookie(config.SESSION_GUARD_COOKIE_NAME, response);
    return activeSessionGuard;
}

/**
 * The onSession hook is called for every new session in a site. For performance reasons the hook function should be kept short.
 * This hook is only triggered if a dwsid is either expired or is missing.
 * @returns {dw/system/Status} status - return status
 */
exports.onSession = function () {
    var isStorefrontSession = !!(session && session.userName === 'storefront');
    var isNotRegisteredUser = !session.customer.profile;
    var isGetRequest = request.httpMethod === 'GET';

    if (
        !slasAuthHelper.isValidRequestURI(request.httpPath) ||
        isSessionGuardActive() ||
        !isStorefrontSession ||
        !isNotRegisteredUser ||
        !isGetRequest
    ) {
        return new Status(Status.OK);
    }

    var tokenData = {};
    var ocapiSessionBridgeCookies = {};
    var redirectURL = '';
    var guestRefreshTokenCookie = slasAuthHelper.getCookie(
        config.REFRESH_TOKEN_COOKIE_NAME_GUEST
    );
    var registeredRefreshTokenCookie = slasAuthHelper.getCookie(
        config.REFRESH_TOKEN_COOKIE_NAME_REGISTERED
    );

    var isNewGuestShopper =
        !guestRefreshTokenCookie && !registeredRefreshTokenCookie;
    if (isNewGuestShopper) {
        if (config.USE_DWGST) {
            tokenData = slasAuthHelper.getSLASAccessTokenForGuestSessionBridge(
                session.generateGuestSessionSignature()
            );
        } else {
            tokenData = slasAuthHelper.getSLASAccessTokenForGuestSessionBridge(
                request.httpHeaders.get('x-is-session_id')
            );
        }
    } else {
        tokenData = slasAuthService.getAccessToken({
            grant_type: config.GRANT_TYPE_REFRESH_TOKEN,
            refresh_token: registeredRefreshTokenCookie
                ? registeredRefreshTokenCookie.value
                : guestRefreshTokenCookie.value
        });

        /* Refresh token logins are not supported by session-bridge endpoint.
            So we use OCAPI session bridge to manually bridge sessions between SLAS and ECOM. */
        ocapiSessionBridgeCookies = slasAuthHelper.getOCAPISessionBridgeCookies(
            tokenData.access_token,
            request.httpRemoteAddress
        );

        redirectURL = urlHelper.getSEOUrl(
            request.httpPath,
            request.httpQueryString
        );
    }

    var refreshTokenCookieToSet = registeredRefreshTokenCookie
        ? config.REFRESH_TOKEN_COOKIE_NAME_REGISTERED
        : config.REFRESH_TOKEN_COOKIE_NAME_GUEST;

    var cookiesToSet = ocapiSessionBridgeCookies;
    cookiesToSet[refreshTokenCookieToSet] = {
        value: tokenData.refresh_token,
        maxAge: tokenData.refresh_token_expires_in
    };
    cookiesToSet[config.SESSION_GUARD_COOKIE_NAME] = {
        value: 1,
        maxAge: config.SESSION_GUARD_COOKIE_AGE
    };
    cookiesToSet[config.USID_COOKIE_NAME] = {
        value: tokenData.usid,
        maxAge: config.USID_COOKIE_AGE
    };
    cookiesToSet[config.ACCESS_TOKEN_COOKIE_NAME] = {
        value: tokenData.access_token,
        maxAge: config.ACCESS_TOKEN_COOKIE_AGE
    };

    slasAuthHelper.setCookiesToResponse(cookiesToSet, response);

    if (redirectURL) {
        response.redirect(redirectURL);
    }
    return new Status(Status.OK);
};
