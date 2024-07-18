'use strict';

var base = module.superModule;
var server = require('server');
var slasAuthHelper = require('*/cartridge/scripts/helpers/slasAuthHelper');
var slasAuthService = require('*/cartridge/scripts/services/SLASAuthService');
var config = require('*/cartridge/scripts/config/SLASConfig');
var Logger = require('dw/system/Logger');
server.extend(base);

var log = Logger.getLogger('plugin_slas', 'plugin_slas.logout');

/**
 * Login-Logout : This endpoint is called to log shopper out of the session
 * @name Base/Login-Logout
 * @function
 * @memberof Login
 * @param {category} - sensitive
 * @param {serverfunction} - get
 */
server.prepend('Logout', function (req, res, next) {
    var refreshTokenCookie = slasAuthHelper.getCookie(
        config.REFRESH_TOKEN_COOKIE_NAME_REGISTERED
    );

    if (refreshTokenCookie && refreshTokenCookie.value) {
        try {
            var tokenData = slasAuthService.getAccessToken({
                grant_type: config.GRANT_TYPE_REFRESH_TOKEN,
                refresh_token: refreshTokenCookie.value
            });

            slasAuthHelper.logoutCustomer(
                tokenData.refresh_token,
                tokenData.access_token
            );
        } catch (e) {
            log.info('Invalid refresh token or access token on logout revoke.');
        }
    }

    var cookiesToRemove = [
        config.REFRESH_TOKEN_COOKIE_NAME_REGISTERED,
        config.SESSION_GUARD_COOKIE_NAME,
        config.USID_COOKIE_NAME
    ];
    cookiesToRemove.forEach(function (cookie) {
        slasAuthHelper.removeCookie(cookie, res.base);
    });

    // Use a special key that SFRA can use to trigger a refresh in PWA
    // This key is used when logout is triggered in SFRA but the redirect after logout
    // immediately sends the user to PWA, so we are not logging in as a guest in SFRA
    var cookiesToSet = [];
    cookiesToSet[config.ACCESS_TOKEN_COOKIE_NAME] = {
        value: 'refresh',
        maxAge: config.ACCESS_TOKEN_COOKIE_AGE
    };

    slasAuthHelper.setCookiesToResponse(cookiesToSet, res.base);

    next();
});

module.exports = server.exports();
