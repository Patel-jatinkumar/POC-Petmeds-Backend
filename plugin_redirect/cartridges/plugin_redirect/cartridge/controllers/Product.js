var server = require('server');
var helper = require('*/cartridge/scripts/helpers/hybridDeployHelper');
var config = require('*/cartridge/config/hybridDeployPreferences');

server.extend(module.superModule);

server.prepend('Show', function (req, res, next) {
    if (config.PWA_KIT_REDIRECT_PRODUCT) {
        var redirectUrl = helper.getProductUrl(req.locale.id, req.querystring.pid);
        res.setRedirectStatus(301);
        res.redirect(redirectUrl);
    }

    next();
});

module.exports = server.exports();
