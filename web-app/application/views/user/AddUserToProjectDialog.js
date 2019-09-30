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

var AddUserToProjectDialog = Backbone.View.extend({
    allUsers: [],
    projectUsers: [],
    availableUsers: [],
    idsUsersToAdd: [],
    userMaggicSuggest : null,
    groups: null,
    saveCallback:null,
    /* Global explanations
    * We can add users by 3 ways :
     * 1) By it's name with a maggicSuggest
     * 2) By finding him with its group
     * 3) By adding him into the application
     *
     * We don't display the users already into the project.
     * So,
     *  - availableUsers used into 1) is allUsers - projectsUsers
     *  - groups are the groups containing the users used into 2)
     *  - For 2) if an user is in a group but he is already into the project, he is disabled
     *  - idsUsersToAdd used into 1) and 2) are the users we selected to be into the project.
     *
     * This Dialog doesn't save. It's the responsability of the caller (by the "closeAction")
     * */
    initialize: function (options) {
        _.bindAll(this, 'render');
        this.saveCallback = options.closeAction;
    },
    render: function () {
        var self = this;
        require([
                "text!application/templates/user/AddUserToProjectDialog.tpl.html"
            ],
            function (tpl) {
                self.doLayout(tpl);
            });
        return this;
    },

    doLayout: function (tpl) {
        var self = this;
        var htmlCode = _.template(tpl, self.model.toJSON());
        $(this.el).html(htmlCode);

        self.allUsers = [];
        self.projectUsers = [];
        self.availableUsers = [];
        self.idsUsersToAdd = [];

        var creation = function(){
            self.createUserList();
            self.createMultiSelectUser();

            $(self.el).find("input#addUsersByName-radio-config,input#addUsersByGroup-radio-config,input#addUsersByMail-radio-config").change(function () {
                if ($(self.el).find("input#addUsersByName-radio-config").is(':checked')) {
                    $(self.el).find("div#projectedituser").show();
                    $(self.el).find(".uix-multiselect").hide();
                    $(self.el).find("#invite_new_user").hide();
                } else if ($(self.el).find("input#addUsersByMail-radio-config").is(':checked')){
                    $(self.el).find("div#projectedituser").hide();
                    $(self.el).find("#invite_new_user").show();
                    $(self.el).find(".uix-multiselect").hide();
                } else {
                    $(self.el).find("div#projectedituser").hide();
                    $(self.el).find("#invite_new_user").hide();
                    $(self.el).find(".uix-multiselect").show();
                }
            });
            $(self.el).find("input#addUsersByName-radio-config,input#addUsersByGroup-radio-config").trigger('change');

            $(self.el).find("#invitenewuserbutton").click(function (event) {
                var username = $(self.el).find("#new_username").val();
                var firstname = $(self.el).find("#new_firstname").val();
                var lastname = $(self.el).find("#new_lastname").val();
                var mail = $(self.el).find("#new_mail").val();

                $.ajax({
                    type: "POST",
                    url: "api/user/invitation.json",
                    data: " {name : "+username+", firstname : "+firstname+", lastname : "+lastname+", mail:"+mail+"}",
                    contentType:"application/json; charset=utf-8",
                    dataType:"json",
                    success: function(user) {
                        window.app.view.message("Project", username+" invited!", "success");

                        console.log("user added");
                        console.log(user);

                        self.idsUsersToAdd.push(user.id);
                        self.availableUsers.push({id:user.id, label:user.lastname + ' ' + user.firstname + ' (' + user.username + ')'});

                        $(self.el).find("#new_username").val("");
                        $(self.el).find("#new_firstname").val("");
                        $(self.el).find("#new_lastname").val("");
                        $(self.el).find("#new_mail").val("");
                        self.refreshUserList();
                        self.loadMultiSelectUser();
                    },
                    error: function(x) {
                        window.app.view.message("Project", x.responseJSON.errors, "error");
                    }
                });
            });
        };

        $(this.el).find("#addUserToProjectContent").hide();

        self.getValues(function() {
            $(self.el).find("#addUserToProjectWaitingDiv").hide();
            $(self.el).find("#addUserToProjectContent").show();
            creation();
        });

        $('#addUserToProjectSaveBtn').on('click', function () {
            self.saveCallback(self.idsUsersToAdd);
        });

        $("#addUserToProject").modal('show');
    },
    getValues: function (doLayout) {
        var self = this;
        var allUsers = null;
        var projectUsers = null;
        var groups = null;


        var loadUsers = function() {
            if(allUsers == null || projectUsers == null || groups== null) {
                return;
            }

            self.allUsers = [];
            self.projectUsers = [];
            self.availableUsers = [];

            projectUsers.each(function(user) {
                self.projectUsers.push(user.id);
            });

            allUsers.each(function(user) {
                self.allUsers.push({id:user.id,label:user.prettyName()});
                //the availableUsers to add are the users not yet into the projet.
                if(self.projectUsers.indexOf(user.id) == -1) {
                    self.availableUsers.push({id:user.id,label:user.prettyName()});
                }
            });

            self.groups = groups;
            self.groups.each(function(group) {
                for(var i=0; i<group.attributes.users.length ; i++) {
                    group.attributes.users[i].label = group.attributes.users[i].lastname + ' ' + group.attributes.users[i].firstname + '(' + group.attributes.users[i].username + ')';
                }
            });

            doLayout();

        };

        new UserCollection({}).fetch({
            success: function (allUserCollection) {
                allUsers = allUserCollection;
                loadUsers();
            }
        });

        new UserCollection({project: self.model.id}).fetch({
            success: function (projectUserCollection) {
                projectUsers = projectUserCollection;
                window.app.models.projectUser = projectUserCollection;
                loadUsers();
            }
        });
        new GroupWithUserCollection().fetch({
            success: function (groupUsersCollection) {
                groups = groupUsersCollection;
                loadUsers();
            }
        });
    },
    createUserList: function () {
        var self = this;
        self.userMaggicSuggest = $(self.el).find('#projectedituser').magicSuggest({
            data: self.availableUsers,
            displayField: 'label',
            value: self.idsUsersToAdd,
            width: 590,
            maxSelection:null
        });
        $(self.userMaggicSuggest).on('selectionchange', function(e,m){
            self.idsUsersToAdd = this.getValue();
            self.loadMultiSelectUser();
        });
    },
    createMultiSelectUser: function() {

        var self = this;

        $(self.el).find("#usersByGroup").multiselectNext().bind("multiselectChange", function(evt, ui) {

            self.idsUsersToAdd = [];
            $(this).find("option:selected").each(function(i, o) {
                self.idsUsersToAdd.push(Number(o.value));
            });
            self.refreshUserList();

            $(self.el).find("#usersByGroup").multiselectNext('refresh', function() {
                $(self.el).find(".ui-button-icon-only .ui-icon").css("margin-top", "-8px");
            });
        });

        $(self.el).find(".ui-button-icon-only .ui-icon").css("margin-top", "-8px");
        $(self.el).find("div.uix-multiselect").css("background-color", "#DDDDDD");

        self.loadMultiSelectUser();
    },
    loadMultiSelectUser: function() {

        var self = this;

        $(self.el).find("#usersByGroup").empty();
        $(self.el).find("#usersByGroup").multiselectNext('refresh');

        // I need to restart multiselect to include to options append to the select

        var userToAddArray = [];

        // I need to find the user object to display the label property
        for(var i = 0; i< self.idsUsersToAdd.length; i++) {
            var user = $.grep(self.availableUsers, function(e){ return e.id == self.idsUsersToAdd[i]; })[0];
            userToAddArray.push(user);
        }

        for(var i = 0; i< userToAddArray.length; i++) {
            $(self.el).find("#usersByGroup").append('<option value="' + userToAddArray[i].id + '" selected>' + userToAddArray[i].label + '</option>');
        }

        self.groups.each(function(group) {

            $(self.el).find("#usersByGroup").append('<optgroup label="'+group.attributes.name+'">');
            var optGroup = $(self.el).find("#usersByGroup optgroup").last();
            for(var i=0; i<group.attributes.users.length ; i++) {
                var currentUser = group.attributes.users[i];
                if($.inArray( currentUser.id, self.projectUsers ) === -1 && $.inArray( currentUser.id, self.idsUsersToAdd ) === -1){
                    optGroup.append('<option value="' + currentUser.id + '">' + currentUser.label + '</option>');
                } else {
                    optGroup.append('<option value="' + currentUser.id + '" disabled>' + currentUser.label + '</option>');
                }
            }
            $(self.el).find("#usersByGroup").append('</optgroup>');


        });
        $(self.el).find("#usersByGroup").multiselectNext('refresh', function() {
            $(self.el).find(".ui-button-icon-only .ui-icon").css("margin-top", "-8px");
        });
    },
    refreshUserList: function () {

        var self = this;

        // Avoid an infinite loop between the 2 listeners.
        $(self.userMaggicSuggest).off('selectionchange');
        self.userMaggicSuggest.clear();
        self.userMaggicSuggest.setData(self.availableUsers);
        self.userMaggicSuggest.setValue(self.idsUsersToAdd);


        $(self.userMaggicSuggest).on('selectionchange', function(e,m){
            self.idsUsersToAdd = this.getValue();
            self.loadMultiSelectUser();
        });
    }
});