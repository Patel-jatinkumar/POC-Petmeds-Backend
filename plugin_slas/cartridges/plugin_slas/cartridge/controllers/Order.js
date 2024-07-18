/**
 * Extends Order
 *
 * @module  controllers/Order
 */

'use strict';

var server = require('server');
var base = module.superModule;
server.extend(base);

var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Transaction = require('dw/system/Transaction');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var loginHelpers = require('*/cartridge/scripts/helpers/loginHelpers');
var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');

/**
 * Order-CreateAccount : This endpoint is invoked when a shopper has already placed an Order as a guest and then tries to create an account
 * @name Base/Order-CreateAccount
 * @function
 * @memberof Order
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {querystringparameter} - ID: Order ID
 * @param {httpparameter} - dwfrm_newPasswords_newpassword - Password
 * @param {httpparameter} - dwfrm_newPasswords_newpasswordconfirm - Confirm Password
 * @param {httpparameter} - csrf_token - CSRF token
 * @param {category} - sensitive
 * @param {serverfunction} - post
 */
server.replace(
    'CreateAccount',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var OrderMgr = require('dw/order/OrderMgr');

        var formErrors = require('*/cartridge/scripts/formErrors');

        var passwordForm = server.forms.getForm('newPasswords');
        var newPassword = passwordForm.newpassword.htmlValue;
        var confirmPassword = passwordForm.newpasswordconfirm.htmlValue;
        if (newPassword !== confirmPassword) {
            passwordForm.valid = false;
            passwordForm.newpasswordconfirm.valid = false;
            passwordForm.newpasswordconfirm.error = Resource.msg(
                'error.message.mismatch.newpassword',
                'forms',
                null
            );
        }

        var order = OrderMgr.getOrder(req.querystring.ID);
        if (
            !order ||
            order.customer.ID !== req.currentCustomer.raw.ID ||
            order.getUUID() !== req.querystring.UUID
        ) {
            res.json({
                error: [
                    Resource.msg(
                        'error.message.unable.to.create.account',
                        'login',
                        null
                    )
                ]
            });
            return next();
        }

        res.setViewData({ orderID: req.querystring.ID });
        var registrationObj = {
            firstName: order.billingAddress.firstName,
            lastName: order.billingAddress.lastName,
            phone: order.billingAddress.phone,
            email: order.customerEmail,
            password: newPassword
        };

        if (passwordForm.valid) {
            res.setViewData(registrationObj);
            res.setViewData({ passwordForm: passwordForm });

            /* eslint-disable no-shadow,consistent-return */
            this.on('route:BeforeComplete', function (req, res) {
                var registrationData = res.getViewData();

                var login = registrationData.email;
                var password = registrationData.password;
                var newCustomer;
                var newCustomerProfile;

                delete registrationData.email;
                delete registrationData.password;

                // attempt to create a new user and log that user in.
                try {
                    Transaction.wrap(function () {
                        newCustomer = CustomerMgr.createCustomer(
                            login,
                            password
                        );

                        // assign values to the profile
                        newCustomerProfile = newCustomer.getProfile();
                        newCustomerProfile.firstName =
                            registrationData.firstName;
                        newCustomerProfile.lastName = registrationData.lastName;
                        newCustomerProfile.phoneHome = registrationData.phone;
                        newCustomerProfile.email = login;

                        order.setCustomer(newCustomer);

                        // save all used shipping addresses to address book of the logged in customer
                        var allAddresses =
                            addressHelpers.gatherShippingAddresses(order);
                        allAddresses.forEach(function (address) {
                            addressHelpers.saveAddress(
                                address,
                                { raw: newCustomer },
                                addressHelpers.generateAddressName(address)
                            );
                        });

                        res.setViewData({ newCustomer: newCustomer });
                        res.setViewData({ order: order });
                    });
                    loginHelpers.loginShopper({
                        username: login,
                        password: password,
                        isRememberMeChecked: false,
                        ipAddress: req.remoteAddress,
                        responseObj: res.base
                    });
                } catch (e) {
                    var loginError = loginHelpers.parseLoginError(e);
                    if (
                        loginError ===
                        loginHelpers.ENUM_LOGIN_ERROR.INVALID_CREDENTIALS
                    ) {
                        res.json({
                            error: [
                                Resource.msg(
                                    'error.message.account.create.error',
                                    'forms',
                                    null
                                )
                            ]
                        });
                    } else if (
                        loginError ===
                        loginHelpers.ENUM_LOGIN_ERROR.AUTH_SERVICE_FAILURE
                    ) {
                        res.json({
                            error: [
                                Resource.msg(
                                    'error.message.unable.to.create.account',
                                    'login',
                                    null
                                )
                            ]
                        });
                    }
                    return;
                }

                delete registrationData.firstName;
                delete registrationData.lastName;
                delete registrationData.phone;

                accountHelpers.sendCreateAccountEmail(newCustomer.profile);

                res.json({
                    success: true,
                    redirectUrl: URLUtils.url(
                        'Account-Show',
                        'registration',
                        'submitted'
                    ).toString()
                });
            });
        } else {
            res.json({
                fields: formErrors.getFormErrors(passwordForm)
            });
        }

        return next();
    }
);

module.exports = server.exports();
