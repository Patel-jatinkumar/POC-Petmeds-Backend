var server = require('server');
var helper = require('*/cartridge/scripts/helpers/hybridDeployHelper');
var config = require('*/cartridge/config/hybridDeployPreferences');

server.extend(module.superModule);

server.prepend('Show', function (req, res, next) {
    if (config.PWA_KIT_REDIRECT_ACCOUNT) {
        var redirectUrl = helper.getUrl('Account', req.locale.id);
        res.setRedirectStatus(301);
        res.redirect(redirectUrl);
    }

    next();
});

server.prepend('EditProfile', function (req, res, next) {
    if (config.PWA_KIT_REDIRECT_ACCOUNT) {
        var redirectUrl = helper.getUrl('Account', req.locale.id);
        res.setRedirectStatus(301);
        res.redirect(redirectUrl);
    }

    next();
});

server.prepend('EditPassword', function (req, res, next) {
    if (config.PWA_KIT_REDIRECT_ACCOUNT) {
        var redirectUrl = helper.getUrl('Account', req.locale.id);
        res.setRedirectStatus(301);
        res.redirect(redirectUrl);
    }

    next();
});

module.exports = server.exports();
