'use strict';

/**
 * @namespace BasketTestHelper
 */

var server = require('server');
var BasketMgr = require('dw/order/BasketMgr');
var config = require('*/cartridge/scripts/config/SLASConfig');
var slasAuthHelper = require('*/cartridge/scripts/helpers/slasAuthHelper');
var slasAuthService = require('*/cartridge/scripts/services/SLASAuthService');
var Fetch = require('*/cartridge/scripts/services/fetch');

/**
 * Returns the base URL
 * @returns {string} url - the url for this instance
 */
function getBaseURL() {
    return (
        'https://' +
        config.SHORTCODE +
        '.api.commercecloud.salesforce.com/checkout/shopper-baskets/v1/organizations/' +
        config.ORGID
    );
}

server.get(
    'CurrentOrNewBasket',
    server.middleware.https,
    function (req, res, next) {
        var createBasketIfNull = req.querystring.createBasket;
        var currentBasket;
        try {
            if (createBasketIfNull) {
                currentBasket = BasketMgr.getCurrentOrNewBasket();
            } else {
                currentBasket = BasketMgr.getCurrentBasket();
            }
        } catch (e) {
            res.json({ error: true, errorMessage: 'Failed to get basket' });
        }
        res.json(
            currentBasket
                ? {
                      basketID: currentBasket.UUID,
                      customerID: currentBasket.customer.ID,
                      productQuantityTotal: currentBasket.productQuantityTotal
                  }
                : {
                      error: true,
                      errorMessage: 'Basket not found.'
                  }
        );
        next();
    }
);

server.get('DeleteBasket', server.middleware.https, function (req, res, next) {
    var basket = BasketMgr.getCurrentBasket();
    var SERVICE = 'plugin_slas.generic.scapi.shopper-baskets';
    if (!basket) {
        res.json({
            error: true,
            errorMessage: 'No active basket found.'
        });
        return next();
    }

    var registeredRefreshTokenCookie = slasAuthHelper.getCookie(
        config.REFRESH_TOKEN_COOKIE_NAME_REGISTERED
    );

    var tokenData = slasAuthService.getAccessToken({
        grant_type: config.GRANT_TYPE_REFRESH_TOKEN,
        refresh_token: registeredRefreshTokenCookie.value
    });

    var removeBasketOptions = {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + tokenData.access_token
        },
        queryParameters: {
            siteId: config.CHANNEL_ID
        }
    };

    var removeBasketURL = getBaseURL() + '/baskets/' + basket.UUID;

    try {
        var removeBasketResponse = Fetch.fetch(
            SERVICE,
            removeBasketURL,
            removeBasketOptions
        );

        if (removeBasketResponse.status !== 200) {
            res.json({
                error: true,
                errorMessage: removeBasketResponse.statusText
            });
        } else {
            res.json({
                result: removeBasketResponse.status
            });
        }

        var cookiesToSet = {};
        cookiesToSet[config.REFRESH_TOKEN_COOKIE_NAME_REGISTERED] = {
            value: tokenData.refresh_token,
            maxAge: tokenData.refresh_token_expires_in
        };
        slasAuthHelper.setCookiesToResponse(cookiesToSet, res);
    } catch (e) {
        res.json({
            error: true,
            errorMessage: 'Failed to delete basket.'
        });
    }
    return next();
});

module.exports = server.exports();
