var server = require('server');
var config = require('*/cartridge/config/hybridPreferences');

server.extend(module.superModule);

server.prepend('Show', function (req, res, next) {
    if (config.HYBRID_MODE) {
        var redirectUrl = config.REDIRECT_HOME;
        res.setRedirectStatus(301);
        res.redirect(redirectUrl);
    }

    next();
});

module.exports = server.exports();
