'use strict';

module.exports = {
    // all tests in this file run against a live sandbox instance
    // BASE_URL looks like https://zzrf-003.dx.commercecloud.salesforce.com/on/demandware.store/Sites-RefArch-Site/en_US
    env: {
        SFCC_BASE_URL: process.env.SFCC_BASE_URL
    },
    cases: [
        {
            // This site has `supportMultiSite=false` (cookies will not be post-fixed).
            description: 'supportMultiSite disabled',
            siteId: 'RefArch',
            locale: 'en_US',
            expectedCookieNames: {
                guest: 'cc-nx-g',
                registered: 'cc-nx',
                sessionGuard: 'cc-sg',
                usid: 'usid',
                accessToken: 'cc-at',
                accessToken2: 'cc-at_2'
            }
        },
        {
            // This site has `supportMultiSite=true` (cookies will be post-fixed).
            description: 'supportMultiSite enabled',
            siteId: 'RefArchGlobal',
            locale: 'en_GB',
            expectedCookieNames: {
                guest: 'cc-nx-g_RefArchGlobal',
                registered: 'cc-nx_RefArchGlobal',
                sessionGuard: 'cc-sg_RefArchGlobal',
                usid: 'usid_RefArchGlobal',
                accessToken: 'cc-at_RefArchGlobal',
                accessToken2: 'cc-at_RefArchGlobal_2'
            }
        }
    ],
    timeouts: {
        before: 10000,
        beforeEach: 5000,
        after: 20000,
        afterEach: 10000,
        tests: 10000,
        nightlyTests: 250000 // The internal circuit breaker calls take about 2s each because we're hitting an unreachable endpoint
        // and we make 100+ calls so to account for all the time we need to bump up the test timeout to 250s
    },
    isPrivateClient: process.env.IS_PRIVATE_CLIENT === 'true'
};
