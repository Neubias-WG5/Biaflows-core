/*
 * Copyright (c) 2009-2017. Authors: see NOTICE file.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var LoginDialogView = Backbone.View.extend({
    tagName: "div",
    dialog : null,
    initialize: function (options) {
    },
    doLayout: function (tpl) {
        var self = this;
        // this.dialog = new ConfirmDialogView({
        //     el: '#dialogs',
        //     template: _.template(tpl, {version: window.app.status.version, url:window.app.status.serverURL}),
        //     dialogAttr: {
        //         dialogID: "#login-confirm",
        //         backdrop: false
        //     }
        // }).render();
        $("body").css("background-color", "#eee");

        $(this.el).html(_.template(tpl, {}));



        $("#j_username").click(function () {
            $(this).select();
        });
        $("#j_password").click(function () {
            $(this).select();
        });
        $('#submit-login').click(function(e) {
            e.preventDefault();
            window.app.controllers.auth.doLogin();
        });
        // $('#submit-forgotPassword').click(function(e) {
        //     e.preventDefault();
        //     window.app.controllers.auth.doForgotPassword();
        // });
        // $('#submit-forgotUsername').click(function(e) {
        //     e.preventDefault();
        //     window.app.controllers.auth.doForgotUsername();
        // });
        // $('#submit-CreateAccount').click(function(e) {
        //     e.preventDefault();
        //     window.app.controllers.auth.createAccount();
        // });
        // $('#forgotUsername').click(function(e) {
        //     e.preventDefault();
        //     self.forgotUsername();
        // });
        // $('#forgotPassword').click(function(e) {
        //     e.preventDefault();
        //     self.forgotPassword();
        // });
        // $('#restoreLogin').click(function(e) {
        //     e.preventDefault();
        //     self.restoreLogin();
        // });
        // $('#createAccount').click(function(e) {
        //     e.preventDefault();
        //     self.createAccount();
        // });


        return this;
    },
    render: function () {
        var self = this;
        require(["text!application/templates/auth/BiaflowsIndex.tpl.html"], function (tpl) {
            self.doLayout(tpl);
        });
        return this;
    },
    close: function () {
        $(this.el).html("");
        $("body").css("background-color", "#fff");
        // this.dialog.close();
    },
    forgotPassword : function () {
        $("#formGrouploginPassword").hide();
        $("#formGrouploginEmail").hide();
        $("#formGroupSubmitLogin").hide();
        $("#formGroupSubmitForgotUsername").hide();
        $("#help-inline").hide();

        $("#help-inline-forgot").show();
        $("#formGrouploginUsername").show();
        $("#formGroupSubmitForgotPassword").show();
    },
    forgotUsername : function () {
        $("#formGrouploginUsername").hide();
        $("#formGrouploginPassword").hide();
        $("#formGroupSubmitLogin").hide();
        $("#formGroupSubmitForgotPassword").hide();
        $("#help-inline").hide();

        $("#help-inline-forgot").show();
        $("#formGrouploginEmail").show();
        $("#formGroupSubmitForgotUsername").show();
    },
    restoreLogin : function () {
        $("#formGrouploginUsername").show();
        $("#formGrouploginPassword").show();
        $("#formGroupSubmitLogin").show();
        $("#help-inline").show();

        $("#help-inline-forgot").hide();
        $("#formGroupSubmitForgotPassword").hide();
        $("#formGroupSubmitForgotUsername").hide();
        $("#formGrouploginEmail").hide();
        $("#formGroupSubmitCreateAccount").hide();
    }/*,
    createAccount : function () {
        $("#formGrouploginPassword").hide();
        $("#formGroupSubmitLogin").hide();
        $("#formGroupSubmitForgotPassword").hide();
        $("#help-inline").hide();

        $("#help-inline-forgot").show();
        $("#formGrouploginUsername").show();
        $("#formGrouploginEmail").show();
        $("#formGroupSubmitCreateAccount").show();
    }*/

});