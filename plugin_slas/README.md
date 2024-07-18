# The plugin_slas Cartridge

[![E2E](https://github.com/SalesforceCommerceCloud/plugin_slas/actions/workflows/run-tests.yml/badge.svg)](https://github.com/SalesforceCommerceCloud/plugin_slas/actions/workflows/run-tests.yml)

This cartridge extends authentication for guest users and registered shoppers using the [Shopper Login and API Access Service](https://developer.salesforce.com/docs/commerce/commerce-api/references?meta=shopper-login-and-api-access:Summary) (SLAS).

You get the following benefits:

1. Compatibility with phased or hybrid deployments, where part of the application is built headlessly with the B2C Commerce API while other parts use SFRA controllers.
2. Longer login durations (up to 90 days), thanks to refresh tokens.

**NOTE:** Plugin_SLAS does **NOT** support the following features:

-   Passwordless Login
-   OpenID/OAuth2 Login
-   External Identity Provider integrations

## Compatibility

This cartridge works with a compatibility mode of 18.10 and newer.

## Important Considerations

Plugin SLAS v7 and later is only available for use with PWA Kit 2.7.1 or later. Changes to Plugin SLAS in v7 - specifically related to synchronizing shopper sessions between PWA Kit and SFRA sites in a hybrid setup - require corresponding alterations to the PWA Kit.

The cartridge makes API calls during session creation, which impacts storefront performance. Before adding the cartridge to a production storefront, compare the performance of your storefront with and without the cartridge to decide if it’s right for you.

The cartridge also introduces a redirect to returning visitors.

Currently, the cartridge only replaces direct login to the B2C Commerce system where the credentials are stored within Salesforce.

Before using the cartridge, review the [issues page](https://github.com/SalesforceCommerceCloud/plugin_slas/issues) in this repository.

### Cart Retention

To ensure consistent performance and availability of the SLAS APIs, we purge all guest shopper records with a last update older than 30 days. That means that carts are not retained for guest shoppers who have not returned to an app (that implements SLAS APIs or Plugin SLAS) at least one time in the last 30 days. This policy does not impact guest shoppers who have returned to the app within the last 30 days. This policy aligns with the legal default for a guest cart retention period, which is 30 days.

## What's changed in v7.3.0

Support for SLAS Private Clients have been added. Existing projects using SLAS Public Clients are not impacted by consuming these changes. Projects that consume plugin_slas 7.2.1 can opt to switch from a public client to a private client at a time of their own choosing.

Switching to a SLAS Private Client will result in the following changes:
* Refresh tokens will become reusable. They will not be discarded and replaced after one use
* Guest login calls no longer need to call SLAS /authorize. Logins require just one call to get a SLAS token

For instructions on how to switch to a SLAS Private Client, see the Switching a SLAS Public Clinet to a SLAS Private Client section of this Readme.

## What's changed in v7.2.0

Development can now be done on Node 18.

## What's changed in v7.1.0

SLAS Session Bridge API used for new guest login now uses signed guest session tokens (`DWSGST`) instead of session ID (`dwsid`). This will be enabled by default in v7.1.0 of Plugin SLAS. However, this change is being offered behind a feature toggle (temporarily) which can be found in Plugin SLAS Custom Preferences.

Note that SLAS APIs will **deprecate the use of `dwsid`** for session bridge APIs in January 2024 following which the feature toggle will be removed.

Make sure to include the new custom preference for Use session signature (`use_dwsgst`).
To update the custom preferences list follow steps listed under **Import system-objecttype-extensions.xml** section below.

## Deprecations in v7.0.0

-   Dropped support for hooks in the login flow. All login functions are now direct function calls.
-   Session bridging is now the only supported login flow for new guest shoppers.

## Get Started

### Update Cartridge Path

The cartridge requires the `app_storefront_base` cartridge from [Storefront Reference Architecture](https://github.com/salesforceCommerceCloud/storefront-reference-architecture).

To update your cartridge path:

1. Log in to Business Manager.
2. Go to **Administration** > **Sites** > **Manage Sites**.
3. Select the site that you want to use SLAS. Example site identifier: `RefArch`.
4. Click the **Settings** tab.
5. In the **Cartridges** field, add the new cartridge path: `plugin_slas`. It must be added _before_ the path for `app_storefront_base`. Example path: `plugin_slas:app_storefront_base`

> This repo includes a testing cartridge, `plugin_slas_test`. This cartridge is NOT required for the plugin to work!

### Create a SLAS API Client

Use the SLAS Admin UI to [create a public or private API client](https://developer.salesforce.com/docs/commerce/commerce-api/guide/authorization-for-shopper-apis.html#create-a-slas-client).

When creating the client, you must include `sfcc.session_bridge` in the scope.

If you are using a custom identity provider (IDP), in the `redirectUri` array include your IDP callback URL. See the following document for more information:
https://developer.salesforce.com/docs/commerce/commerce-api/guide/slas-identity-providers.html?q=RedirectUrl#customize-redirect-domain

If you are creating a private client, make sure you save the client secret that the SLAS Admin UI returns in a secure location.

### Install and Upload the Cartridge

1. Clone this repository. The name of the top-level directory is `plugin_slas`.
2. From the `plugin_slas` directory, run `npm install` to install package dependencies.
3. Create a `dw.json` file in `plugin_slas` directory. Replace the `$` strings with actual values or set the corresponding environment variables.

    ```json
    {
        "hostname": "$HOST.demandware.net",
        "username": "$USERNAME",
        "password": "$PASSWORD",
        "code-version": "$VERSION"
    }
    ```

4. From the `plugin_slas` directory, `npm run uploadCartridge`.

> For more information on uploading the cartridge, see the following topic on the B2C Commerce Infocenter: [Upload Code for SFRA](https://documentation.b2c.commercecloud.salesforce.com/DOC2/topic/com.demandware.dochelp/content/b2c_commerce/topics/sfra/b2c_uploading_code.html).

## Configure Cartridge in Business Manager

To configure the cartridge, log in to Business Manager as an Administrator and perform the following tasks:

## Configuring Services

### Import services.xml

1. Go to **Administration** > **Operations** > **Import & Export**.
2. Under **Import & Export Files**, click **Upload**.
3. Click **Choose File**.
4. Go to `plugin_slas/meta/`.
5. Select `services.xml`.
6. Click **Upload**.
7. After the file has completed uploading, click **Back**.
8. Under **Services**, click **Import**.
9. Select `services.xml` and click **Next**.
10. After the file has finished validating, click **Next**.
11. Select **MERGE** and click **Import**.

### Update Service Credentials

> These values can also be provided by editing the configuration in `./meta/services.xml` before [importing the file](#import-servicesxml).

To configure the service credentials, you need to know the following configuration values:

-   The _client ID_ used for setting up the client for SLAS. (Example: `da422690-7800-41d1-8ee4-3ce983961078`)
-   The _client secret_ if you are using a private client for SLAS.
-   The _storefront password_ used to protect your site. Lookup location: **Administration** > **Sites** > **Manage Sites** > _Select Site Name_ > **Site Status** > **Password**

For more information about the short code and organization ID, see [Commerce API Configuration Values](https://developer.salesforce.com/docs/commerce/commerce-api/guide/commerce-api-configuration-values.html).

To update your configuration:

1. Go to **Administration** > **Operations** > **Services**.
2. Select the **Credentials** tab.
3. Click `plugin_slas.scapi.auth.cred` to edit the credential.
4. Set `User` to your SLAS client ID.
   * If you are using a SLAS private client, set 'Password' to your SLAS client secret.
5. Click **Apply** to apply the changes, then click **<< Back to List**.
6. Click `plugin_slas.internal-controller.cred` to edit the credential.
7. Set `User` to `storefront`
8. Set `Password` to your storefront password.
    > :warning: The `"plugin_slas.internal-controller.cred"` `User` and `Password` credentials (Steps 7 and 8) are **required** even if storefront password protection is not enabled on your site. :warning:
    >
    > The `SLASSessionHelper-SaveSession` controller must be password protected to prevent bad actors from arbitrarily setting session custom / privacy attributes.
    >
    > If password protection is enabled on your site, these values are:
    > `User` = `storefront` > `Password` = the value set at **Administration** > **Sites** > **Manage Sites** > _Select Site Name_ > **Site Status** > **Password**
    >
    > If password protection is _not_ enabled, the `User` and `Password` values can be anything you choose as long as they are not blank values.

### Service Profiles Circuit Breaker

The circuit breaker and rate limiter are configured with "per proccess" circuit breaking to improve robustness. The internal, per-process circuit breaker is enabled when the **Enable Circuit Breaker** checkbox is checked inside service profile configuration and setting values for number/interval to 0. The services.xml configuration provided in Plugin SLAS out of the box has these set by default.

To modify the circuit breaker and rate limiter config (optional):

1. Go to **Administration** > **Operations** > **Services**.
2. Select the **Profiles** tab.
3. Select a profile.
4. Set desired values for circuit breaker and rate limter.

## Configuring Custom Preferences

### Import system-objecttype-extensions.xml

1. Go to **Administration** > **Site Development** > **Import & Export**.
2. Under **Import & Export Files**, click **Upload**.
3. Click **Choose File**.
4. Go to `plugin_slas/meta/meta`.
5. Select `system-objecttype-extensions.xml`.
6. Click **Upload**.
7. After the file has completed uploading, click **Back**.
8. Under **Meta Data**, click **Import**.
9. Select `system-objecttype-extensions.xml` and click **Next**.
10. After the file has finished validating, click **Import**.

### Update Custom Preferences

> These values can also be provided by editing the configuration in `./meta/meta/system-objecttype-extensions.xml` before [importing the file](#import-system-objecttype-extensionsxml).

To configure the custom preferences, you need to know the following configuration values:

-   The _short code_ for your B2C Commerce instance. (Example: `kv7kzm78`)
-   The _organization ID_ for your B2C Commerce instance. (Example: `f_ecom_zzte_053`)
-   If you have a custom IDP, the _redirect URI_ you configured when you set up a public client for SLAS. (See [Required SLAS Administration Tasks](#required-slas-administration-tasks))
-   The _OCAPI version_ you are using. (Example: `23_1`)
-   If your B2C Commerce instance has multiple sites under a single domain, set the _Support Multi-Site_ property to `Yes`. This setting ensures that the site ID is appended to cookies when they are created. Example: `cc-nx-g_RefArch`. **Note**: If you are using **Plugin SLAS** with a PWA Kit hybrid deployment, _Support Multi-Site_ property is **required** to be set to `Yes` and you must manually update your PWA Kit to load the appropriate refresh token cookies.

To update your configuration:

1. Go to **Merchant Tools** > **Site Preferences** > **Custom Preferences** > **SLAS Plugin**.
2. If you have a custom IDP, set **Redirect URI - SLAS Login** to the redirect URI you previously configured.
3. Set **Always Save Refresh Token** as needed. If the refresh token cookie for a registered user needs to be saved always, such as in a phased launch setup with PWA Kit, set the value to **Yes**. If the refresh token cookie needs to be saved only when user has selected **Remember Me**, set the value to **No**.

### Enable IP/Geolocation Tracking

To enable client IP-based services, such as geo-location, you must set a custom Client IP Header Name. Otherwise, B2C Commerce uses the network connection source address (your CDN).

1. Go to **Merchant Tools** > **SEO** > **Customer CDN Settings**.
2. In the Dynamic Content section, enter `x-client-ip` in the Client IP Header Name and click Save.

> The default Client IP Header Name that is set in the plug-in is `x-client-ip`. If you have already set a different value in the Client IP Header Name field in Business Manager, update the `Client IP Header Name` property in Custom Preferences to match what is already set.

> Note: if you use a stacked CDN, you must make sure your CDN is configured to forward ip address via an HTTP header, and use that header name instead of the default `x-client-ip`.

> Note: **Merchant Tools** > **SEO** > **Customer CDN Settings** > **Client IP Header Name** value must match **Merchant Tools** -> **Site Preferences** -> **Custom Preferences** -> **SLAS plugin config** > **Client IP Header Name**

### Update Open Commerce API Settings

1. Go to **Administration** > **Site Development** > **Open Commerce API Settings**.
2. Add an Open Commerce API (OCAPI) Shop API setting for the SLAS client you created earlier. Don’t forget to replace `$CLIENT` with an actual value or set the corresponding environment variable.
    ```json
    {
        "_v": "22.10",
        "clients": [
            {
                "client_id": "$CLIENT",
                "resources": [
                    {
                        "resource_id": "/sessions",
                        "methods": ["post"],
                        "read_attributes": "(**)",
                        "write_attributes": "(**)"
                    }
                ]
            }
        ]
    }
    ```

### Update Firewall Rules

The cartridge makes OCAPI calls that come from your B2C Commerce instance and route through your CDN on the way back to the instance.

If you are using a web application firewall (WAF) with your eCDN or with a custom CDN (also known as a "stacked CDN"), you must explicitly allow requests from your instance so that they are not blocked.

Add the outgoing IP addresses of your main POD and backup POD (also known as a "disaster recovery POD") to your WAF allowlist.

You can find the outgoing IP address of your POD using a DNS lookup. Replace `222` in the following command with the ID of your POD.

```sh
dig +short A outgoing.pod222.demandware.net
```

> Whenever a realm is moved or split, you must update these rules!

🎉 Congratulations! You’ve successfully installed and configured the cartridge!

## Upgrading Plugin SLAS from v6.x

Follow the upgrade guide linked [here](https://github.com/SalesforceCommerceCloud/plugin_slas/blob/main/UPGRADE.md) if you have an existing Plugin SLAS installation at v6.x

## Cookies

When the cartridge is correctly installed, it sets the following **mandatory** cookies:

-   `cc-nx-g`: Refresh token for guest users
-   `cc-nx`: Refresh token for registered users.
-   `cc-sg`: Boolean used to stop guest logins when an existing session is already logged in.
-   `usid`: A customer's unique shopper id.
-   `cc-at`: Contains the SLAS access token. Used in [phased launches](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/phased-headless-rollouts.html) to share the access token. May be split into two cookies (`cc-at` and `cc-at_2`) to avoid maximum cookie size restrictions. Join the values for the complete token.

If you have the _Support Multi-Site_ property in this plugin's custom preference set to `Yes`, the cookies described earlier are appended to the site ID. Example: `cc-nx-g_RefArch`.

## Tests

The cartridge comes with unit tests and end-to-end tests.

To run the unit tests, run `npm run test` at the project root.

To run the end-to-end tests, first install the included `plugin_slas_test` cartridge, then set the following environment variables

-   `SFCC_BASE_URL`: The base URL of the store you are running the test against. For example: `https://zzrf-003.dx.commercecloud.salesforce.com`

-   `IS_PRIVATE_CLIENT`: Set to false if you are running the tests against a SLAS public client. Set to true if you are running tests against a SLAS private client. Tests assume false (public client) if not set.

-   Update cartridge path to `plugin_slas_test:plugin_slas:app_storefront_base`. See the [Update Cartridge Path](#update-cartridge-path) section for a step-by-step guide.

-   Import `./test/meta/services.xml` in `MERGE` mode in services. See the "Import services.xml" section for a step-by-step guide.

Now, run `npm run test:e2e` to execute all e2e tests.
To get information on test coverage, run `npm run cover`. Coverage information is output to the `coverage` folder under root directory.

## Switching a SLAS Public Client to a SLAS Private Client

To change from a SLAS Public Client to a SLAS Private Client:

1. Follow the steps in the Create a SLAS API Client section of this README
1. Go to **Administration** > **Operations** > **Services**.
2. Select the **Credentials** tab.
3. Click `plugin_slas.scapi.auth.cred` to edit the credential
4. Set `User` to your SLAS client ID. Set 'Password' to your SLAS client secret.

## Contributing

Plugin SLAS uses Github Action workflows to validated pull requests. Unfortunately, running Github Actions workflows on forks has been disabled across SalesforceCommerceCloud org. To contribute to Plugin SLAS code, please push code to a feature branch off of `develop`. Make sure to submit a detailed description of the code changes being made in the pull request.

Before committing code to this project, always run the following commands:

-   `npm run lint`
-   `npm run format`
-   `npm run test`
-   `npm run test:e2e`
