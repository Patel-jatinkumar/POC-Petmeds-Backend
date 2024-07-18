var server = require('server');
var helper = require('*/cartridge/scripts/helpers/hybridDeployHelper');
var config = require('*/cartridge/config/hybridDeployPreferences');

server.extend(module.superModule);

server.prepend('Show', function (req, res, next) {
    var redirectUrl;

    // if there is a cgid, we are searching for a category
    if (req.querystring.cgid) {
        if (config.PWA_KIT_REDIRECT_CATEGORY) {
            redirectUrl = helper.getCategoryUrl(req.locale.id, req.querystring.cgid);
            res.setRedirectStatus(301);
            res.redirect(redirectUrl);
        }
        return next();
    }
    // else we are doing a search
    if (config.PWA_KIT_REDIRECT_SEARCH) {
        redirectUrl = helper.getSearchUrl(req.locale.id, req.querystring.q);
        res.setRedirectStatus(301);
        res.redirect(redirectUrl);
    }

    return next();
});

module.exports = server.exports();
