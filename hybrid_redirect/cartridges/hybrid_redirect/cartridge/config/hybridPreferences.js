var Site = require('dw/system/Site');
var currentSite = Site.getCurrent();

var HYBRID_MODE = currentSite.getCustomPreferenceValue('isHybridMode');
var REDIRECT_HOME = currentSite.getCustomPreferenceValue('redirectUrl');

module.exports = {
    HYBRID_MODE: HYBRID_MODE,
    REDIRECT_HOME: REDIRECT_HOME
};
