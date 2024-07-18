'use strict';

var server = require('server');
var BasketMgr = require('dw/order/BasketMgr');

/* global customer */
server.get('CustomerID', server.middleware.https, function (req, res, next) {
    res.json({
        customer: customer.ID,
        basket: BasketMgr.getCurrentBasket().getProductQuantityTotal()
    });
    return next();
});

module.exports = server.exports();
