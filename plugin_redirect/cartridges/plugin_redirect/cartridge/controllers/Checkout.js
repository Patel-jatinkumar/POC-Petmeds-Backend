var server = require('server');
var helper = require('*/cartridge/scripts/helpers/hybridDeployHelper');
var config = require('*/cartridge/config/hybridDeployPreferences');

server.extend(module.superModule);

server.prepend('Begin', function (req, res, next) {
    if (config.PWA_KIT_REDIRECT_CHECKOUT) {
        var redirectUrl = helper.getUrl('Checkout', req.locale.id);
        res.setRedirectStatus(301);
        res.redirect(redirectUrl);
    }

    next();
});

module.exports = server.exports();
