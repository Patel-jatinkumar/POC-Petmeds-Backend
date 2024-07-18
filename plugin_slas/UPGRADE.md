# Upgrading Plugin_SLAS from v6.x to v7.x

We refactored the codebase, moved some custom preferences around, and renamed services to follow a convention to make it easier to query logs in logcenter. Follow this guide to upgrade Plugin_SLAS if you have an existing installation at v6.x

## Transferring Custom Code

If you have made customizations to the plugin, review which areas you have changed and make plans to port your changes over to v7.x. As part of the v7.x release, we have made significant changes to the structure of the codebase. For more details on where code has moved, please refer [here](https://github.com/SalesforceCommerceCloud/plugin_slas/blob/main/REDESIGN.md)

## Configuring Services

We've updated `services.xml` with services renamed to follow a convention. Follow the steps below to import the updated `services.xml` and configure services for plugin_SLAS v7.x:

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

-   The _client ID_ used for setting up the public client for SLAS. (Example: `da422690-7800-41d1-8ee4-3ce983961078`)
-   The _storefront password_ used to protect your site. Lookup location: **Administration** > **Sites** > **Manage Sites** > _Select Site Name_ > **Site Status** > **Password**

For more information about the short code and organization ID, see [Commerce API Configuration Values](https://developer.salesforce.com/docs/commerce/commerce-api/guide/commerce-api-configuration-values.html).

To update your configuration:

1. Go to **Administration** > **Operations** > **Services**.
2. Select the **Credentials** tab.
3. Click `plugin_slas.scapi.auth.cred` to edit the credential.
4. Set `User` to your SLAS client ID.
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

We recommend a clearing out older service configurations to avoid conflicting services. To do this simply delete all old services, profiles and credentials by following these steps:

-   Go to **Administration** > **Operations** > **Services**

**Delete Services**

1. Under **Services** tab, select the following services:
    - `controller.internal`
    - `sfcc-slas-auth`
    - `sfcc-slas-ocapi-session-bridge`
    - `sfcc-slas-scapi-baskets`
2. Click on **Delete** on bottom right of the services table.
3. Click **OK** to confirm delete when prompted.

**Delete Profiles**

1. Under **Profiles** tab, select the following profiles:
    - `controller.internal.prof`
    - `sfcc-slas-auth-http`
2. Click on **Delete** on bottom right of the profiles table.
3. Click **OK** to confirm delete when prompted.

**Delete Credentials**

1. Under **Credentials** tab, select the following credentials:
    - `sfcc-slas-auth-cred`
    - `sfcc-slas-scapi-cred-baskets`
2. Click on **Delete** on bottom right of the credentials table.
3. Click **OK** to confirm delete when prompted.

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
-   The _Support Multi-Site_ should be set to `Yes` if your B2C Commerce instance has multiple sites under a single domain. Using this option will ensure that cookies are created with a site id post-fixed (Example: `cc-nx-g_RefArch`). Please note that if you are using `plugin_slas` conjunction with a PWA Kit hybrid deployment you will have to manually update your PWA Kit to load the appropriate refresh token cookies.

To update your configuration:

1. Go to **Merchant Tools** > **Site Preferences** > **Custom Preferences** > **SLAS Plugin**.
2. If you have a custom IDP, set **Redirect URI - SLAS Login** to the redirect URI you previously configured.
3. Set **Always Save Refresh Token** as needed. If the refresh token cookie for a registered user needs to be saved always, such as in a phased launch setup with PWA Kit, set the value to **Yes**. If the refresh token cookie needs to be saved only when user has selected **Remember Me**, set the value to **No**.

### New in v7.x

Note the following custom preference values newly introduced in v7.0:

-   SCAPI Short Code (_shortcode_)
-   OrgID (_orgId_)
-   SFCC OCAPI Version(_ocapiVersion_) [This replaced the SFCC OCAPI Session Bridge URI field as the Session Bridge URI is built internally]
