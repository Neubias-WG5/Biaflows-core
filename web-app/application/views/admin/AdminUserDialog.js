/*
 * Copyright (c) 2009-2019. Authors: see NOTICE file.
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

var AdminUserDialog = Backbone.View.extend({
    errors : [],
    allRoles : [],
    callback:null,
    currentRole: null,
    initialize: function (options) {
        _.bindAll(this, 'render');
        this.callback = options.callback;
    },
    render: function () {
        var self = this;
        require([
                "text!application/templates/admin/AdminUserDialog.tpl.html"
            ],
            function (tpl) {
                self.getValues(function() {
                    self.doLayout(tpl);
                });
            });
        return this;
    },

    doLayout: function (tpl) {
        var self = this;
        var htmlCode = _.template(tpl, {model:self.model.toJSON()});
        $(this.el).html(htmlCode);

        self.errors = [];

        var roleList = $(this.el).find("#newUserRoleList");

        $.each(self.allRoles, function(index, value) {
            roleList.append("<option value='"+value.id+"'>"+value.authority+"</option>");
        });

        $("#resetPasswordButton").click(function() {

            var newPass = $("#editinputResetPassword").val();

            if(newPass.length<5) {
                $("#changePasswordError").append("Password is too short!");
            }else {

                $("#changePasswordError").empty();
                var data = { 'password': newPass};

                $.ajax({
                    type:"PUT",
                    url : "/api/user/"+self.model.id+"/password.json",
                    contentType: "application/json",
                    data: JSON.stringify(data),
                    success : function(){
                        window.app.view.message("Success", "Password changed", "success");
                    }
                });
            }
        });

        if(!window.app.isUndefined(self.model.id)) {
            new UserSecRole({user:self.model.id, highest : true}).fetch({
                success: function (model) {
                    $(self.el).find("#newUserRoleList").val(model.get("role"));
                }
            });
        }

        $("#adminUserDialog").modal('show');
        $(self.el).find("form").on("keyup", function(e){
            var result = self.validateItem(e.target.id);

            var previousMsgIndex = $.map(self.errors, function(item){return item.id}).indexOf(result.id);
            if(previousMsgIndex >= 0){
                self.errors[previousMsgIndex].message = result.message;
                self.errors[previousMsgIndex].valid = result.valid;
            } else {
                self.errors.push(result);
            }

            self.validate();
        });

        $(self.el).find("#adminUserDialogBtn").click(function() {

            var role = Number($(self.el).find("#newUserRoleList").val());

            var user;
            var savedParams = {
                "username": $(self.el).find("#editinputUsername").val(),
                "firstname": $(self.el).find("#editinputFirstname").val(),
                "lastname": $(self.el).find("#editinputLastname").val(),
                "email": $(self.el).find("#editinputEmail").val()
            };

            if(window.app.isUndefined(self.model.id)){
                user = new UserModel();
                savedParams.password = $(self.el).find("#editinputPassword").val();
                savedParams.algo = false;
            } else {
                user = self.model;
            }


            user.save(savedParams, {
                success: function (model, response) {
                    window.app.view.message("Success", response.message, "success");

                    $.ajax({
                        type:"PUT",
                        url : "/api/user/"+model.get("user").id+"/role/"+role+"/define.json"
                    })
                        .always(function() {
                            $("#adminUserDialog").modal('hide');
                            self.callback();
                        });
                },
                error: function (model, response) {
                    $(self.el).find("#adminUserDialogErrors").append("<div class='error'> "+response.responseJSON.errors.replace(/\n/g,"<br/>")+" </div>");
                }
            });
        });

        if(!window.app.isUndefined(self.model.id)){
            var fields = $(self.el).find("form").find("input[required]");
            for(var i =0; i < fields.length; i++){
                $("#"+fields[i].id).keyup();
            }
        }
    },

    validate: function () {

        var self = this;

        $(self.el).find("#adminUserDialogErrors").empty();

        var messages =  $.map(self.errors, function(item){if(!valid) return item.message});

        var tpl = "<div class='errorMessage'> <%= message %> </div>";

        //display error messages
        $.each(messages, function(ind, value) {
            $(self.el).find("#adminUserDialogErrors").append(_.template(tpl, {message : value}));
        });

        // check if all required field are valid to enable the submit button
        var valid = ($.map(self.errors, function(item){if(item.valid) return item}).length === $(self.el).find("form").find("input[required]").length);
        $(this.el).find("#adminUserDialogBtn").prop('disabled', !valid);
    },
    validateItem: function (id) {
        var value = $(this.el).find("#"+id).val();
        var valid = false;
        var message="";

        if (['editinputFirstname','editinputLastname','editinputUsername'].indexOf(id) >=0) {
            valid = value.length > 0;
            if(!valid){
                message = id.replace("editinput","")+" missing!";
            }
        } else if(id === 'editinputPassword') {
            valid = value.length > 3;
            if(value.length === 0){
                message = "Password missing!";
            } else if(!valid){
                message = "Your password must have at least 4 characters!";
            }
        } else if(id === 'editinputEmail') {
            // ultra basic checking.
            if(value.length < 5){
                message = "email too short!";
            } else {
                var ar = value.indexOf("@");
                var dot = value.indexOf(".");
                if(ar <= 0 || ar === value.length || dot <= 0 || value[value.length-1] === '.'){
                    message = "Not a valid email!";
                } else {
                    valid = true;
                }
            }
        }

        return {id: id, valid: valid, message: message};
    },
    getValues: function (callback) {
        var self = this;

        new SecRoleCollection({}).fetch({
            success: function (allRolesCollection) {
                self.allRoles = $.map(allRolesCollection.models, function(item){return {id: item.id, authority: item.get('authority')}});
                if(!window.app.isUndefined(self.model.id)){
                    new UserSecRole({user : self.model.id}).fetch({
                        success: function (currentRoles) {
                            // TODO collection ! get highest rank
                            self.currentRole = currentRoles;
                            callback();
                        }
                    });
                } else {
                    callback();
                }
            }
        });
    }
});