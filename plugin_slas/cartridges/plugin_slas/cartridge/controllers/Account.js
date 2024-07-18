/**
 * Extends Account
 *
 * @module  controllers/Account
 */

'use strict';

var server = require('server');
var base = module.superModule;
server.extend(base);

var Resource = require('dw/web/Resource');
var CustomerMgr = require('dw/customer/CustomerMgr');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
var loginHelpers = require('*/cartridge/scripts/helpers/loginHelpers');
var formErrors = require('*/cartridge/scripts/formErrors');

var Logger = require('dw/system/Logger');
var log = Logger.getLogger('plugin_slas', 'plugin_slas.account');

/**
 * Account-Login : The Account-Login endpoint will render the shopper's account page. Once a shopper logs in they will see is a dashboard that displays profile, address, payment and order information.
 * @name Base/Account-Login
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {querystringparameter} - rurl - redirect url. The value of this is a number. This number then gets mapped to an endpoint set up in oAuthRenentryRedirectEndpoints.js
 * @param {httpparameter} - loginEmail - The email associated with the shopper's account.
 * @param {httpparameter} - loginPassword - The shopper's password
 * @param {httpparameter} - loginRememberMe - Whether or not the customer has decided to utilize the remember me feature.
 * @param {httpparameter} - csrf_token - a CSRF token
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 *
 */

server.replace(
    'Login',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        try {
            loginHelpers.loginShopper({
                username: req.form.loginEmail,
                password: req.form.loginPassword,
                isRememberMeChecked: !!req.form.loginRememberMe,
                ipAddress: req.remoteAddress,
                responseObj: res.base
            });

            res.setViewData({
                authenticatedCustomer: CustomerMgr.getCustomerByLogin(
                    req.form.loginEmail
                )
            });
            res.json({
                success: true,
                redirectUrl: accountHelpers.getLoginRedirectURL(
                    req.querystring.rurl,
                    req.session.privacyCache,
                    false
                )
            });
        } catch (e) {
            var loginError = loginHelpers.parseLoginError(e);
            if (
                loginError === loginHelpers.ENUM_LOGIN_ERROR.INVALID_CREDENTIALS
            ) {
                res.json({
                    error: [
                        Resource.msg('error.message.login.form', 'login', null)
                    ]
                });
            } else if (
                loginError ===
                loginHelpers.ENUM_LOGIN_ERROR.AUTH_SERVICE_FAILURE
            ) {
                res.json({
                    error: [
                        Resource.msg('error.oauth.login.failure', 'login', null)
                    ]
                });
            }
        }
        return next();
    }
);

/**
 * Account-SubmitRegistration : The Account-SubmitRegistration endpoint is the endpoint that gets hit when a shopper submits their registration for a new account
 * @name Base/Account-SubmitRegistration
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {querystringparameter} - rurl - redirect url. The value of this is a number. This number then gets mapped to an endpoint set up in oAuthRenentryRedirectEndpoints.js
 * @param {httpparameter} - dwfrm_profile_customer_firstname - Input field for the shoppers's first name
 * @param {httpparameter} - dwfrm_profile_customer_lastname - Input field for the shopper's last name
 * @param {httpparameter} - dwfrm_profile_customer_phone - Input field for the shopper's phone number
 * @param {httpparameter} - dwfrm_profile_customer_email - Input field for the shopper's email address
 * @param {httpparameter} - dwfrm_profile_customer_emailconfirm - Input field for the shopper's email address
 * @param {httpparameter} - dwfrm_profile_login_password - Input field for the shopper's password
 * @param {httpparameter} - dwfrm_profile_login_passwordconfirm: - Input field for the shopper's password to confirm
 * @param {httpparameter} - dwfrm_profile_customer_addtoemaillist - Checkbox for whether or not a shopper wants to be added to the mailing list
 * @param {httpparameter} - csrf_token - hidden input field CSRF token
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.replace(
    'SubmitRegistration',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var registrationForm = server.forms.getForm('profile');

        // form validation
        if (
            registrationForm.customer.email.value.toLowerCase() !==
            registrationForm.customer.emailconfirm.value.toLowerCase()
        ) {
            registrationForm.customer.email.valid = false;
            registrationForm.customer.emailconfirm.valid = false;
            registrationForm.customer.emailconfirm.error = Resource.msg(
                'error.message.mismatch.email',
                'forms',
                null
            );
            registrationForm.valid = false;
        }

        if (
            registrationForm.login.password.value !==
            registrationForm.login.passwordconfirm.value
        ) {
            registrationForm.login.password.valid = false;
            registrationForm.login.passwordconfirm.valid = false;
            registrationForm.login.passwordconfirm.error = Resource.msg(
                'error.message.mismatch.password',
                'forms',
                null
            );
            registrationForm.valid = false;
        }

        if (
            !CustomerMgr.isAcceptablePassword(
                registrationForm.login.password.value
            )
        ) {
            registrationForm.login.password.valid = false;
            registrationForm.login.passwordconfirm.valid = false;
            registrationForm.login.passwordconfirm.error = Resource.msg(
                'error.message.password.constraints.not.matched',
                'forms',
                null
            );
            registrationForm.valid = false;
        }

        // setting variables for the BeforeComplete function
        var registrationFormObj = {
            firstName: registrationForm.customer.firstname.value,
            lastName: registrationForm.customer.lastname.value,
            phone: registrationForm.customer.phone.value,
            email: registrationForm.customer.email.value,
            emailConfirm: registrationForm.customer.emailconfirm.value,
            password: registrationForm.login.password.value,
            passwordConfirm: registrationForm.login.passwordconfirm.value,
            validForm: registrationForm.valid,
            form: registrationForm
        };

        if (registrationForm.valid) {
            res.setViewData(registrationFormObj);

            // eslint-disable-next-line no-shadow
            this.on('route:BeforeComplete', function (req, res) {
                var Transaction = require('dw/system/Transaction');
                var serverError;
                // getting variables for the BeforeComplete function
                var registrationForm = res.getViewData(); // eslint-disable-line

                if (registrationForm.validForm) {
                    var username = registrationForm.email;
                    var password = registrationForm.password;
                    // attempt to create a new user and log that user in.
                    try {
                        Transaction.wrap(function () {
                            var newCustomer = CustomerMgr.createCustomer(
                                username,
                                password
                            );
                            // assign values to the profile
                            var newCustomerProfile = newCustomer.getProfile();
                            newCustomerProfile.firstName =
                                registrationForm.firstName;
                            newCustomerProfile.lastName =
                                registrationForm.lastName;
                            newCustomerProfile.phoneHome =
                                registrationForm.phone;
                            newCustomerProfile.email = registrationForm.email;
                        });

                        loginHelpers.loginShopper({
                            username: username,
                            password: password,
                            isRememberMeChecked: false,
                            ipAddress: req.remoteAddress,
                            responseObj: res.base
                        });
                    } catch (e) {
                        try {
                            // SLAS plugin error messages can be parsed into JSON
                            // while SFRA errors cannot
                            JSON.parse(e.message);
                            log.error(e.message);
                            serverError = true;
                        } catch (parseError) {
                            registrationForm.validForm = false;
                            registrationForm.form.customer.email.valid = false;
                            registrationForm.form.customer.emailconfirm.valid = false;
                            registrationForm.form.customer.email.error =
                                Resource.msg(
                                    'error.message.username.invalid',
                                    'forms',
                                    null
                                );
                        }
                    }
                }

                delete registrationForm.password;
                delete registrationForm.passwordConfirm;
                formErrors.removeFormValues(registrationForm.form);

                if (serverError) {
                    res.setStatusCode(500);
                    res.json({
                        success: false,
                        errorMessage: Resource.msg(
                            'error.message.unable.to.create.account',
                            'login',
                            null
                        )
                    });

                    return;
                }
                if (registrationForm.validForm) {
                    var authenticatedCustomer = CustomerMgr.getCustomerByLogin(
                        registrationForm.email
                    );
                    if (
                        authenticatedCustomer &&
                        authenticatedCustomer.getProfile()
                    ) {
                        // send a registration email
                        accountHelpers.sendCreateAccountEmail(
                            authenticatedCustomer.getProfile()
                        );
                    }
                    res.setViewData({
                        authenticatedCustomer: authenticatedCustomer
                    });
                    res.json({
                        success: true,
                        redirectUrl: accountHelpers.getLoginRedirectURL(
                            req.querystring.rurl,
                            req.session.privacyCache,
                            true
                        )
                    });

                    req.session.privacyCache.set('args', null);
                } else {
                    res.json({
                        fields: formErrors.getFormErrors(registrationForm)
                    });
                }
            });
        } else {
            res.json({
                fields: formErrors.getFormErrors(registrationForm)
            });
        }

        return next();
    }
);

module.exports = server.exports();
