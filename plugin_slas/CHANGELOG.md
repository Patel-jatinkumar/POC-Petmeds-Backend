# Changelog

## v7.3.0 (April 17, 2024)

-   Reduce session churn on hybrid sites [#187](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/187)
-   Use refresh token expiry from SLAS [#154](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/154)
-   Update OCAPI version regex to allow double digit minor numbers [#182](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/182)
-   Add support for SLAS private clients [#178](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/178)

## v7.2.0 (January 23, 2024)

-   Node 18 upgrade [#175](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/175)

## v7.1.1

-   Add changes to support SiteGenesis with plugin_slas v7 [#171](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/171)
-   Add ability to zip cartridge to support Github Actions [#169](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/169)
-   Update default services configuration to support 'per-process' circuit breaking [#164](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/164)

## v7.1.0

-   Add feature toggle for session bridge guest session signature [#166](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/166)
-   Fix a bug that could potentially cause user login to fail because of missing usid/refresh token. [#148](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/148)
-   Session bridge using the guest session signature. [#135](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/135)

## v7.0.0

-   Update checkout and order confirmation pages to allow login using plugin_SLAS[#130](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/130)
-   Do not store access token in a cookie[#129](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/129)
-   Increase USID cookie timeout and add fallback for USID[#128](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/128)
-   Replace httpbin with SFRA controllers[#127](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/127)
-   Update README and documentation for v7.0.0 release [#126](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/126)
-   Added check to verify basket state is retained on guest refresh token login in e2e tests [#125](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/125)
-   Geolocation controllers include observed IP [#121](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/121)
-   Refactor metadata to impex format [#119](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/119)
-   Add a custom logger and separate plugin_SLAS logs into their own log files [#115](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/114)
-   Normalize response headers from SCAPI/OCAPI calls in Fetch [#114](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/114)
-   Rename this plugin's services [#112](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/112)
-   Update error handling in this plugin [#108](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/108)
-   Re-archtect plugin inference and state layers [#99](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/99)
-   Store access token in a cookie[#95](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/95)
-   Store usid in a cookie [#93](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/93)
-   Re-architect plugin services [#89](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/89) & [#90](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/90)
    The service layer of the plugin has been rewritten and a fetch-like API has been introduced to encapuslate calls to the service framework.
    As part of this change, all services have had their type changed to GENERIC (from HTTP / HTTPForm)
    To consume this change and update your service types you can either:
    a) Re-import services.xml
    b) In Business Manager, navigate to Administration -> Services and for each service, change the Service Type to GENERIC.
    This change also modifies custom attributes. Two new attributes corresponding to your SHORTCODE and ORGID will need to be set via custom preference in Business Manager.
-   Implement CaseInsensitiveMap to normalize response headers received from calls made to external APIs from `plugin_SLAS`

## v6.4.2

-   Add changes to support SiteGenesis [#103](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/103)
-   Exclude page designer controllers from triggering SLAS login flows [#104](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/104)
-   Fix bug in logic to determine origin of request to SLAS [#104](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/104)
-   Fix bug in uploadCartridge npm script [#104](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/104)
-   Allow more special characters in username and passwords [#104](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/104)

## v6.4.1

-   Enable SLAS session-bridge/token endpoint by default [#87](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/87)

## v6.4.0

-   Enable SLAS session-bridge/token endpoint by default [#87](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/87)

## v6.4.0

-   Fix a bug where geolocation information is incorrect for newly logged in users [#82](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/82)
-   Add feature toggle for SLAS session-bridge/token endpoint [#80](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/80)
-   Add small delay in between e2e tests to avoid SLAS rate limit errors [#79](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/79)
-   Add this changelog file! [#78](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/78)
-   Add support for SLAS session-bridge/token endpoint for new guest users [#76](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/76)
-   Add multi-site support [#75](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/75)
-   Setup repository for Github actions [#74](https://github.com/SalesforceCommerceCloud/plugin_slas/pull/74)

## Refer to Github to see changelogs of this plugin for v6.3.0 and older:

https://github.com/SalesforceCommerceCloud/plugin_slas/releases
