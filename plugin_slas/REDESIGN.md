# What’s New in Plugin_SLAS v7.0

The **Plugin_SLAS** cartridge extends authentication for guest users and registered shoppers using the [Shopper Login and API Access Service](https://developer.salesforce.com/docs/commerce/commerce-api/references?meta=shopper-login-and-api-access:Summary) (SLAS).
The plugin provides the following functionality:

1. Compatibility with phased or hybrid deployments, where part of the application is built headlessly with the B2C Commerce API ([Managed Runtime](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/using-the-managed-runtime-api.html) and [PWA Kit](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/getting-started.html)) while other parts use SFRA controllers.
2. Longer login durations (up to 90 days) and basket persistence, thanks to refresh tokens.

Note that plugin_slas v7 is only available for use with PWA Kit 2.7.1 or later. Changes to plugin_slas in v7 - specifically related to synchronizing shopper sessions between PWA Kit and SFRA sites in a hybrid setup - require corresponding alterations to the PWA Kit.

# What Changed ?

We rebuilt **Plugin_SLAS** from ground up with a redesigned architecture in-order to make it more robust, reliable, maintainable and easy to install. We focused deeply in the following areas:

-   **New Network Layer**
-   **New Controller Layer**
-   **New Middle Layer**
-   **Extensive E2E tests**
-   **Improved Error Handling**
-   **Simplified Configuration / Installation**
-   **Bug Fixes**

# Network Layer

**Plugin_SLAS** makes calls to multiple external services (SCAPI/OCAPI) to handle shopper sessions and to allow seamless switching between PWA Kit and SFRA sessions in a hybrid storefront setup. The PWA Kit uses the more modern `node-fetch` as it's underlying network layer to manage calls to APIs.

The general approach to coding web services in Salesforce B2C Commerce involves writing a script for a RESTful web service and storing credentials or certificates in the Business Manager.

The web service script:

-   Gets Service objects from the registry
-   Provides input parameters for the `createRequest` callback used to construct the URL to call the web service
-   Provides error handling based on the Result of the web service call
-   Writes output variables to the pipeline dictionary to be used by the rendering template

[Learn More about Script API Service Framework](https://documentation.b2c.commercecloud.salesforce.com/DOC2/topic/com.demandware.dochelp/content/b2c_commerce/topics/web_services/b2c_coding_your_web_service.html?resultof=%22%53%65%72%76%69%63%65%22%20%22%73%65%72%76%69%63%22%20)

**The problem:** The Script API Service Framework has a very esoteric interface and exposes multiple underlying HTTP clients all of which require a different setup, and different `options` objects, and can quickly become overwhelming to manage. It is common to create multiple instances of the service object to make network calls, and this degrades performance. Each underlying client requires a different `options` object to configure how the service framework built the request and how it handles responses.

To normalize these calls, we created a layer of handler functions that help standardize call signatures and APIs that feel familiar when interacting with the underlying APIs. We wrote an interface similar to the more familiar `node-fetch` API that developers are can use to construct requests and get network errors.

**Solution:** Via this API that mimics `node-fetch`, we wrote a new network layer on top of the Script API Service Framework the new plugin bypasses some limitations of the Script API Service Framework in abstracting the underlying client implementation.

This new `Fetch` function takes service name, url, and options object as input.

It also allows following additional configuration to make API calls:

-   **method** - sets the type of HTTP request. Defaults to `GET`
-   **queryParameters** - an object containing key/value pairs representing query parameters that will be appended to the path
-   **headers** - an object containing key/value pairs representing HTTP headers
-   **body** - the request body. Assumes the provided object is serialized to JSON
-   **timeout** - sets the request timeout in milliseconds. Timeout defined in the service profile takes precedence over what is provided via this option. A default timeout defined in SLASConfig is applied if there is no timeout defined in the profile and no timeout option is provided.
-   **useCredentials** - a boolean that determines whether a service's credentials should be used. The credentials are defined in business manager. Setting this to true overwrites the authentication header.
-   **onCredentials** - a callback function that defines how service credentials are to be used by this call

The implementation of this new `Fetch` API can be found here:
[**plugin_slas/cartridge/scripts/services/fetch.js**](https://github.com/SalesforceCommerceCloud/plugin_slas/blob/main/cartridges/plugin_slas/cartridge/scripts/services/fetch.js)

# Authentication Flows

**Plugin_SLAS** can be triggered to handle the following authentication flows:

1. **New Guest Shopper**

Whenever a shopper lands on a storefront, a new session ID (`dwsid`) is generated for that session. This triggers a call to the `onSession` hook. Plugin_SLAS will read the value for guest `refresh_token` (`cc-nx-g`) which will not be set initially for New Guest Shoppers.

The guest shopper is authorized by making a call to the SLAS authorize API: **`/oauth2/authorize`** to get a `usid` for the new guest shopper and then makes a call to session-bridge API: `**/oauth2/session-bridge/token**` to bridge demandware and SLAS sessions and returns `auth_token` (JWT) and `refresh_token` values for the new guest shopper which is then stored as `cc-nx-g`

**NOTE**:

-   The session-bridge API internally bridges demandware and SLAS sessions. Manually calling OCAPI `**/sessions**` is not required.
-   **Plugin_SLAS** only supports the session-bridge approach for New Guest Shopper sessions starting v6.4
-   SLAS session bridge API does not support the `refresh_token` flow yet.

New `refresh_token` value is stored as `cc-nx-g` cookie in the browser

1. **Returning Guest / Registered Shopper**

Whenever a shopper lands on a storefront, a new session ID (`dwsid`) is generated for that session. This triggers a call to the onSession hook. Here, **Plugin_SLAS** will read the value for `refresh_token` (`cc-nx-g` or `cc-nx`) which will be set for returning guest / registered shoppers.

**Plugin_SLAS** will send the `refresh_token` value to SLAS token API: `**/oauth2/token**` and retrieve new `auth_token` and `refresh_token` values to restore returning guest shopper session. Note that the SLAS token API does **not** bridge demandware and SLAS sessions internally. So **Plugin_SLAS** manually makes a call to OCAPI `**/sessions**` API for session bridging.

New `refresh_token` value is stored as `cc-nx-g` cookie for returning guest shoppers and `cc-nx` cookie for returning registered shoppers in the browser.

1. **Create New Account & Login**

Shoppers can visit the Login Page on the storefront and use the Create Account form to create a new registered shopper account. Submitting the Create Account form triggers the `**Account-SubmitRegistration**` controller in SFRA. The form is validated and if validation is successful, a new shopper account is created. The email and password submitted by the shopper are then used by **Plugin_SLAS** to log the shopper into their newly created account. **Plugin_SLAS** authenticates the shopper by sending the email and password to SLAS authenticate API: `**/oauth2/login**`. On successful authentication plugin_SLAS will call the SLAS token API: `**/oauth2/token**` to retrieve `auth_token` and `refresh_token` values for the registered shopper session.

Note that the SLAS token API does **not** bridge demandware and SLAS sessions internally. So **Plugin_SLAS** manually makes a call to OCAPI `**/sessions**` API for session bridging.

New `refresh_token` value is stored as `cc-nx` cookie in the browser.

1. **Login into Existing Account**

Shoppers can visit the Login Page on the storefront and use the Login form to login into their existing shopper account. Submitting the Login form triggers the `**Account-Login**` controller in SFRA. The form is validated and if validation is successful Plugin_SLAS authenticates the shopper by sending the email and password to SLAS authenticate API: `**/oauth2/login**`. On successful authentication **Plugin_SLAS** will call the SLAS token API: `**/oauth2/token**` to retrieve `auth_token` and `refresh_token` values for the registered shopper session.

Note that the SLAS token API does not bridge demandware and SLAS sessions internally. So **Plugin_SLAS** manually makes a call to OCAPI `**/sessions**` API for session bridging.

New `refresh_token` value is stored as `cc-nx` cookie in the browser.

1. **Logout Shopper from Registered Shopper Session**

-   Shoppers can click on the logout button on the storefront to logout of their currently logged in session. Clicking the logout button triggers the `**Login-Logout**` controller in SFRA. Here, **Plugin_SLAS** sends the `auth_token` and `refresh_token` to SLAS Logout API: `**/oauth2/logout**` to clear current session and logout the shopper from their registered account.

`refresh_token` value is cleared from `cc-nx` cookie in the browser.

# Controller Layer

We saw how various **Plugin_SLAS** authentication flows can be triggered by one of the following:

-   `onSession` Hook
-   `Account-Login` Controller or `Account-SubmitRegistration` Controller
-   `Login-Logout` Controller

Each of these requests to **Plugin_SLAS** contain information about the shopper which is essential for **Plugin_SLAS** to determine the correct authentication flow to execute and to build the required API requests.

The controller layer acts as the action layer used to break down the incoming requests to extract information and rebuild the outgoing response objects sent to the storefront. We refactored the helper methods to accept only the data they require to perform their intended action.

The Controller Layer also handles building the response object sent back to the storefront. All the tokens and cookies required to be added to the response are returned to the controller layer from the respective helper functions which acts to normalize the data and reduce inconsistencies in cookie values and other data returned to the calling context.

Interested in the code ? Take a peek:
[**plugin_slas/cartridge/scripts/hooks/request/onSession.js**](https://github.com/SalesforceCommerceCloud/plugin_slas/blob/main/cartridges/plugin_slas/cartridge/scripts/hooks/request/onSession.js)
[**plugin_slas/cartridge/scripts/helpers/loginHelpers.js**](https://github.com/SalesforceCommerceCloud/plugin_slas/blob/main/cartridges/plugin_slas/cartridge/scripts/helpers/loginHelpers.js)

`loginShopper` function inside **_loginHelpers.js_** is called from the controllers whenever a shopper login is requested. We’ve moved almost all the code into the helper function to keep deviation from original controller implementation in the base SFRA cartridge at minimum.

**NOTE**: We’ve dropped support for login hooks and are directly calling all helper functions from the controllers as javascript function calls. We continue to override `onSession` hook to manage new demandware sessions created.

# Middle Layer

We saw how the Network Layer handles requests to external API made by **Plugin_SLAS** and the Controller Layer handles requests and responses between **Plugin_SLAS** and the storefront. The middle layer helps orchestrate the multiple authentication flows handled by **Plugin_SLAS**. Given request data from the controller layer, the middle layer makes the required requests from the Network layer and then passes back needed state changes in the response to the controller layer. The Controller Layer shouldn’t directly access the request or response, but instead all the information it needs from the request should be passed to it and anything that needs to be set on the response should be returned to the Controller Layer.

Here are some of the helper functions we’ve implemented as a part of the Middle Layer:
[**plugin_slas/cartridge/scripts/helpers/slasAuthHelper.js**](https://github.com/SalesforceCommerceCloud/plugin_slas/blob/main/cartridges/plugin_slas/cartridge/scripts/helpers/slasAuthHelper.js)

# E2E Testing

## Testing Authentication and Session Management

**Plugin_SLAS** handles 5 major authentication flows. These can be combined with `shopper-baskets` APIs to execute multiple user flows from adding items to cart all the way till checkout. Also, **Plugin_SLAS** is designed to work with multi-site-enabled and hybrid storefronts. Here’s a list of test cases we execute as a part of our e2e testing suite each time we push code changes to **Plugin_SLAS** making sure our customers get to work with a robust and reliable release each time.

E2E test cases:

-   Guest logins retain same session on subsequent requests
-   Guest refresh token login works
-   Login form returns correct error if invalid credentials
-   New registeration form returns correct error if invalid input
-   Guest user logs in without adding items to basket returns empty basket works
-   Guest user basket persists on existing account login works
-   Guest user basket persists on logging into newly registered account works
-   Registered refresh token triggers registered login
-   Registered user logout works
-   Geolocation remains consistent after initial guest login
-   Geolocation remains consistent after refresh token login
-   Geolocation remains consistent after registered user login
-   Custom session attributes are restored after session bridge
-   Custom session attributes are not restored after logout
-   Session is reused when switching between sites - **Multi Site only**

**Note**: That these test cases are run against a _single-site_ storefront setup as well as a _multi-site_ storefront session.

We’ve made it easy to configure the BM Site that the tests run against by simply modifying the [**testConfig.js**](https://github.com/SalesforceCommerceCloud/plugin_slas/blob/main/test/config/testConfig.js) file.

We wrote the e2e test suite to mimic the Middle Layer setup we have for **Plugin_SLAS** cartridge code. Take a look at the [**testHelpers.js**](https://github.com/SalesforceCommerceCloud/plugin_slas/blob/main/test/helpers/testHelpers.js) \*\*\*\* to see how we extracted the most commonly used authentication flows into helper functions to reduce code duplication across multiple test cases and to make sure features behave consistently across environments and test cases.

We’ve implemented an extensive test suite build up and break down flow by making use of dynamic user creation and account cleanup, removing the dependency to a specific ODS for running the tests. A test-suite-specific shopper account in the ODS is no longer required for executing these end-to-end tests. All shopper credentials are generated at random when the tests begin execution keeping in mind the locale-specific restrictions.

## Testing Phased Launches and Hybrid Storefront Setups

When testing, it's important to ensure the hybrid setup for storefronts using **Plugin_SLAS** is as robust as its authentication and session management. To this end, we setup a permanent prod hybrid storefront site that we can run e2e test against. These e2e tests flow across SFRA and PWA sites in a hybrid setup and mimic all the steps a shopper might take starting from landing on a storefront, adding items to cart and going through checkout to place an order.

We have set up an internal phased launch demo site here. This site can be used to validate implementation issues in your project and confirm whether they can be duplicated in this demo environment: [**Hybrid Launch Test Site**](https://test.phased-launch-testing.com/home?lang=en_US)

# Error Handling

**Plugin_SLAS** interacts with storefront requests as well as makes requests to external APIs. We also allow service configuration and custom preferences via BM. This array of configuration options mean there are multiple possible points of failure in the flow handled by the plugin. These errors used to occur silently or get swallowed by the system making it difficult to debug. To make it easier to debug and quickly find the root of a given error, we have introduced better error handling in the Network Layer. We ensure error messages or exceptions are thrown in a way that points to a clear point of execution in the code, and where appropriate, the errors are properly logged and are easier to investigate using WebDAV logs or Logcenter.

# Simplified Configuration / Plugin Installation

We’ve simplified building out session bridge URI by moving the OCAPI_VERSION to Custom Preferences and building the URL internally. We added additional regex based validation for orgID and OCAPI version to point out configuration errors early on in the plugin installation flow. We also now log warnings about incorrect geolocation when shopper IP cannot be sent to OCAPI session bridge. Errors from misconfiguring will be:

-   Invalid shortcode = unknown host exception (since shortcode is used to build the hostname)
-   Invalid orgID - throws and logs error `Invalid orgID or OCAPI version`
-   Wrong redirect uri - HTTP 400 with `redirect_uri doesn't match the registered redirects` message
-   Non-existant OCAPI version - throws and logs error `Invalid orgID or OCAPI version`

# Bug Fixes

Many bugs were fixed in v7.0. View the full changelog here: https://github.com/SalesforceCommerceCloud/plugin_slas/blob/main/CHANGELOG.md
