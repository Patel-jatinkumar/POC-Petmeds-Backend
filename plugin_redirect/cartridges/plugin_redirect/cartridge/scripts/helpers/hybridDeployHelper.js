var config = require('*/cartridge/config/hybridDeployPreferences');

var routes = JSON.parse(config.PWA_KIT_ROUTES.valueOf());

/**
 * Converts locale from the format used in SFRA format to the format used in PWA
 * For example, this converts 'en_US' to 'en-US'
 * @param {string} locale - the locale from SFRA
 * @return {string} the locale used by PWA
 */
function convertLocale(locale) {
    if (!locale) {
        return '';
    }
    return locale.replace(/_/, '-');
}

/**
 * For the given component and locale, fetch a PWA Kit URL
 * @param {string} component - the component we are routing to
 * @param {string} locale - the locale from SFRA
 * @return {string} the PWA Kit URL to the given component or undefined if component does not have a route
 */
function getUrl(component, locale) {
    var route = routes[component];

    if (!route) {
        return undefined;
    }

    var path = route.replace(/\[locale\]/g, convertLocale(locale));

    return path;
}

/**
 * Builds the url for product details pages
 * @param {string} locale - the customer's locale
 * @param {string} productId - the product id
 * @return {string} the url
 */
function getProductUrl(locale, productId) {
    return getUrl('Product', locale).replace(/\[productid\]/g, productId);
}

/**
 * Builds the url for category pages
 * @param {string} locale - the customer's locale
 * @param {string} categoryId - the category id
 * @return {string} the url
 */
function getCategoryUrl(locale, categoryId) {
    return getUrl('Category', locale).replace(/\[categoryid\]/g, categoryId);
}

/**
 * Builds the url for search results pages
 * @param {string} locale - the customer's locale
 * @param {string} searchterms - the search terms
 * @return {string} the url
 */
function getSearchUrl(locale, searchterms) {
    return getUrl('Search', locale).replace(/\[searchterms\]/g, searchterms);
}

module.exports = {
    convertLocale: convertLocale,
    getUrl: getUrl,
    getProductUrl: getProductUrl,
    getCategoryUrl: getCategoryUrl,
    getSearchUrl: getSearchUrl
};
