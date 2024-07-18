var Site = require('dw/system/Site');
var currentSite = Site.getCurrent();

var PWA_KIT_REDIRECT_ACCOUNT = currentSite.getCustomPreferenceValue('pwa_kit_redirect_account');
var PWA_KIT_REDIRECT_CART = currentSite.getCustomPreferenceValue('pwa_kit_redirect_cart');
var PWA_KIT_REDIRECT_CHECKOUT = currentSite.getCustomPreferenceValue('pwa_kit_redirect_checkout');
var PWA_KIT_REDIRECT_HOME = currentSite.getCustomPreferenceValue('pwa_kit_redirect_home');
var PWA_KIT_REDIRECT_LOGIN = currentSite.getCustomPreferenceValue('pwa_kit_redirect_login');
var PWA_KIT_REDIRECT_PRODUCT = currentSite.getCustomPreferenceValue('pwa_kit_redirect_product');
var PWA_KIT_REDIRECT_CATEGORY = currentSite.getCustomPreferenceValue('pwa_kit_redirect_category');
var PWA_KIT_REDIRECT_SEARCH = currentSite.getCustomPreferenceValue('pwa_kit_redirect_search');
var PWA_KIT_ROUTES = currentSite.getCustomPreferenceValue('pwa_kit_routes');

module.exports = {
    PWA_KIT_REDIRECT_ACCOUNT: PWA_KIT_REDIRECT_ACCOUNT,
    PWA_KIT_REDIRECT_CART: PWA_KIT_REDIRECT_CART,
    PWA_KIT_REDIRECT_CHECKOUT: PWA_KIT_REDIRECT_CHECKOUT,
    PWA_KIT_REDIRECT_HOME: PWA_KIT_REDIRECT_HOME,
    PWA_KIT_REDIRECT_LOGIN: PWA_KIT_REDIRECT_LOGIN,
    PWA_KIT_REDIRECT_PRODUCT: PWA_KIT_REDIRECT_PRODUCT,
    PWA_KIT_REDIRECT_CATEGORY: PWA_KIT_REDIRECT_CATEGORY,
    PWA_KIT_REDIRECT_SEARCH: PWA_KIT_REDIRECT_SEARCH,
    PWA_KIT_ROUTES: PWA_KIT_ROUTES
};
