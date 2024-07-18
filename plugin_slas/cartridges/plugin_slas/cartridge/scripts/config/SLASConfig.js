'use strict';

var Logger = require('dw/system/Logger');
var log = Logger.getLogger('plugin_slas', 'plugin_slas.config');

var Site = require('dw/system/Site');
var currentSite = Site.getCurrent();

var multiSiteSupportEnabled =
    currentSite.getCustomPreferenceValue('supportMultiSite');

var OCAPI_VERSION = currentSite.getCustomPreferenceValue('ocapiVersion');
var ORGID = currentSite.getCustomPreferenceValue('orgId');

var validOcapiVersionRegex = new RegExp(/^\d{2}_\d{1,2}$/);
var validOrgIdRegex = new RegExp(
    /^f_ecom_[a-z]{4}_(dev|stg|prd|s\d{2}|\d{3})$/
);

var validOcapiVersion = validOcapiVersionRegex.test(OCAPI_VERSION);
var validOrgId = validOrgIdRegex.test(ORGID);

if (!validOrgId) {
    var invalidOrgIdMessage = ORGID + ' is not a valid organizaiton ID.';
    log.error(invalidOrgIdMessage);
    throw Error(invalidOrgIdMessage);
}

if (!validOcapiVersion) {
    var invalidOcapiVersionMessage =
        OCAPI_VERSION + ' is not a valid OCAPI version.';
    log.error(invalidOcapiVersionMessage);
    throw Error(invalidOcapiVersionMessage);
}

module.exports = {
    SHORTCODE: currentSite.getCustomPreferenceValue('shortCode'),

    ORGID: ORGID,

    FETCH_DEFAULT_TIMEOUT: 5000,

    // The service endpoint for guest login
    CALL_TYPE_OAUTH2_LOGIN_GUEST: 'authorize',

    // The service endpoint for registered user login
    CALL_TYPE_OAUTH2_LOGIN_REGISTERED: 'login',

    // The service endpoint for guest login with session bridge
    CALL_TYPE_SESSION_BRIDGE_TOKEN: 'session-bridge/token',

    // The service endpoint to get access token and refresh token
    CALL_TYPE_OAUTH2_TOKEN: 'token',

    // Guest login request parameter value for 'response_type'
    OAUTH2_LOGIN_GUEST_RESPONSE_TYPE: 'code',

    // Request parameter value for grant_type for the call to get access token and refresh token
    GRANT_TYPE_AUTH_CODE_PKCE: 'authorization_code_pkce',

    // Request parameter value for grant_type for the call to get access token from refresh token login
    GRANT_TYPE_REFRESH_TOKEN: 'refresh_token',

    // Request parameter value for grant_type for the call to get access token and refresh token via session bridge
    GRANT_TYPE_SESSION_BRIDGE: 'session_bridge',

    // The value for 'channel_id' request parameter for SLAS service calls
    CHANNEL_ID: currentSite.ID,

    // The value for 'redirect_uri' parameter in guest and registered user login calls
    REDIRECT_URI: currentSite.getCustomPreferenceValue('redirectURI_SLAS'),

    // The custom preference to always drop refresh token cookies in browser during registered user login
    SAVE_REFRESH_TOKEN_ALWAYS:
        currentSite.getCustomPreferenceValue('saveRefreshToken_Always') ||
        false,

    DWSID_COOKIE_NAME: 'dwsid',

    // session guard cookie name. This is set when a login occurs to stop guest sessions from refreshing while the existing session is active
    SESSION_GUARD_COOKIE_NAME: multiSiteSupportEnabled
        ? 'cc-sg_' + currentSite.ID
        : 'cc-sg',

    // The maximum age of this cookie. This must be less than the minimum age of a session (30 minutes) so that the guard is not active when the session expires.
    SESSION_GUARD_COOKIE_AGE: 30 * 60,

    // refresh token cookie name for registered users
    REFRESH_TOKEN_COOKIE_NAME_REGISTERED: multiSiteSupportEnabled
        ? 'cc-nx_' + currentSite.ID
        : 'cc-nx',

    // refresh token cookie name for guest users
    REFRESH_TOKEN_COOKIE_NAME_GUEST: multiSiteSupportEnabled
        ? 'cc-nx-g_' + currentSite.ID
        : 'cc-nx-g',

    // This is set to match the currently 90 day expiration of registered refresh tokens
    // DEPRECATED - The plugin now uses the refresh_token_expires_in field from the SLAS response to set cc-nx cookie age
    REFRESH_TOKEN_COOKIE_AGE: 90 * 24 * 60 * 60,

    USID_COOKIE_NAME: multiSiteSupportEnabled
        ? 'usid_' + currentSite.ID
        : 'usid',

    ACCESS_TOKEN_COOKIE_NAME: multiSiteSupportEnabled
        ? 'cc-at_' + currentSite.ID
        : 'cc-at',

    ACCESS_TOKEN_COOKIE_AGE: 30 * 60,

    // The maximum age of the usid cookie . This is set to match the refresh token
    USID_COOKIE_AGE: 90 * 24 * 60 * 60,

    // SCAPI end point for merging guest user basket during login
    SCAPI_BASKET_MERGE_ENDPOINT: '/baskets/actions/merge',

    // The header name set in Customer CDN settings -> Client IP Header Name. Allows B2C to retrieve the client IP during session bridging.
    CLIENT_IP_HEADER_NAME:
        currentSite.getCustomPreferenceValue('clientIPHeaderName'),

    // Feature toggle for using session signatures (dwsgst). Enabled by default. Disabling this will have the system fallback to DWSID.
    USE_DWGST: currentSite.getCustomPreferenceValue('use_dwsgst'),

    // controllers to exclude for guest login and token refresh
    CONTROLLERS_TO_EXCLUDE: [
        '__Analytics-Start',
        'ConsentTracking-Check',
        'ConsentTracking-GetContent',
        'ConsentTracking-SetConsent',
        'ConsentTracking-SetSession',
        'SLASSessionHelper-SaveSession',
        'TestHelper-TestGeoLocationSlasExclude',
        '__SYSTEM',
        '__Analytics'
    ],

    // The request URI used to fetch OCAPI Session in bridge service - SLAS
    OCAPI_SESSION_BRIDGE_URI_SLAS:
        'https://' +
        currentSite.httpsHostName +
        '/s/' +
        currentSite.ID +
        '/dw/shop/v' +
        OCAPI_VERSION +
        '/sessions',

    // list of configured service IDs
    SERVICE_IDS: {
        INTERNAL_CONTROLLER: 'plugin_slas.internal-controller'
    },

    // site preference used to enable restoration of session attributes after session bridge
    RESTORE_SESSION_ATTRIBUTES:
        currentSite.getCustomPreferenceValue('restoreSessionAttributes_SLAS') ||
        false
};