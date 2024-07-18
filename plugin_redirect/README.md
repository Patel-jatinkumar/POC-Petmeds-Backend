# plugin_redirect

## Overview

The Hybrid Storefront plug-in cartridge (name tentative) provides Storefront Reference Architecture (SFRA) and SiteGenesis sites with a mechanism for redirecting pages to PWA Kit as part of a hybrid storefront strategy. With a hybrid storefront, users of SFRA and SiteGenesis can use PWA Kit to power a subset of pages on their storefront.

This cartridge works in conjunction with the following technologies:

-   A content delivery network (CDN)
-   The `plugin_slas` cartridge
-   PWA Kit (to handle page routing and session bridging)

This cartridge’s primary job is to handle redirects when different storefronts (SFRA and PWA Kit, for example) use a different URL pattern. If both storefronts use the same URL pattern, redirects must be handled by a CDN’s routing rules instead.

### How It Works

The Hybrid Storefront cartridge uses `server.prepend` to insert code into existing controllers and uses `res.redirect(url)` to redirect requests to PWA Kit URLs.

## Before You Begin

Before you install this cartridge, you must install the `plugin_slas` cartridge and the `app_storefront_base` cartridge. Installation instructions for the `plugin_slas` cartridge are in its [README](https://github.com/SalesforceCommerceCloud/plugin_slas).

After installing the `plugin_slas` cartridge, come back here to get started with installing the Hybrid Storefront cartridge.

**Tip**: The installation instructions are very similar for both cartridges, so watch out for subtle differences!

## Cartridge Path Considerations

Before installing the Hybrid Storefront cartridge, you must update to your site settings:

1. Log in to Business Manager.
2. Go to **Administration** > **Sites** > **Manage Sites**.
3. Select the site that you want to use with the Hybrid Storefront cartridge. Example site identifier: RefArch.
4. Click the **Settings** tab.
5. In the **Cartridges** field, add the new cartridge path: `plugin_redirect`. It must be added _before_ the path for `app_storefront_base`. Example path: `plugin_redirect:plugin_slas:app_storefront_base`

## Getting Started

### Install and Upload the Cartridge

1. Clone this repository. The name of the top-level directory is `plugin_redirect`.

2. From the `plugin_redirect` directory, run `npm install`. This command installs all of the package dependencies.

3. Create a `dw.json` file in the `plugin_redirect` directory. Replace the `PLACEHOLDER_` strings with actual values.

```json
{
    "hostname": "PLACEHOLDER_HOSTNAME.demandware.net",
    "username": "PLACEHOLDER_USERNAME",
    "password": "PLACEHOLDER_PASSWORD",
    "code-version": "PLACEHOLDER_VERSION"
}
```

**Note**: Make sure your `code-version` matches the version used by the `app_storefront_base` and `plugin_slas` cartridges.

4. From the `plugin_redirect` directory, run the following command: `npm run uploadCartridge`.

## Configure the Cartridge in Business Manager

To configure the Hybrid Storefront cartridge, log in to Business Manager as an Administrator and perform the following tasks:

### Import system-objecttype-extensions.xml

1. Go to **Administration** > **Site Development** > **Import & Export**.
2. Under **Import & Export Files**, click **Upload**.
3. Click **Choose File**.
4. Go to `plugin_redirect/meta/`.
5. Select **system-objecttype-extensions.xml**.
6. Click **Upload**.
7. After the file has completed uploading, click **Back**.
8. Under **Meta Data**, click **Import**.
9. Select **system-objecttype-extensions.xml** and click **Next**.
10. After the file has finished validating, click **Import**.

### Update Custom Preferences

**Note**: These values can also be provided by editing the configuration in `./meta/system-objecttype-extensions.xml` before importing the file.

1. Go to **Merchant Tools** > **Site Preferences** > **Custom Preferences** > **PWA Kit Hybrid Plugin**.
2. For the pages that you want to redirect to PWA Kit URLs, set the redirect value to `Yes`.
3. If you have modified your routes in your PWA Kit project, update the `PWA Kit Routes` attribute to match your PWA Kit routes. The `PWA Kit Routes` attribute takes in JSON (shown below).

The default routes are:

```json
{
    "Home": "/",
    "Product": "/[locale]/product/[productid]",
    "Category": "/[locale]/category/[categoryid]",
    "Search": "/[locale]/search?q=[searchterms]",
    "Account": "/[locale]/account",
    "Cart": "/[locale]/cart",
    "Login": "/[locale]/login",
    "Checkout": "/[locale]/checkout"
}
```

#### Route Syntax

The `PWA Kit Routes` attribute uses the following placeholder values:

-   `[locale]`
-   `[productid]`
-   `[categoryid]`
-   `[searchterms]`

The `[locale]` placeholder can be used in every controller and is replaced with the locale ID (`en-US`, for example).

The `[productid]` placeholder is used only in the product controller and is replaced with the product ID.

The `[categoryid]` and `[searchterms]` placeholders are used only in the search controller. They are replaced with either the category ID or the search terms being looked up.

## Supported Controllers

By default, the Hybrid Storefront cartridge supports redirects the following controllers:

-   Account - Show, EditProfile, EditPassword
-   Cart - Show
-   Checkout - Begin
-   Default - Start
-   Home - Show
-   Login - Show
-   Product- Show
-   Search - Show

Here’s how to add redirects for additional controllers:

1. Create a controller with the same name as the one you are extending in SFRA.
2. Use `server.prepend` to prepend code onto the controller.
3. In `server.prepend`, use `res.redirect(url)` to redirect.

## Inspiration

The Hybrid Storefront cartridge was inspired by the following projects:

-   https://github.com/salesforceCommerceCloud/ocapi_hooks_collection/
-   https://github.com/SalesforceCommerceCloud/plugin_slas/
