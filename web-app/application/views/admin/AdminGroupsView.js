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

var AdminGroupsView = Backbone.View.extend({

    allUsers : null,
    allGroups : null,
    currentGroup : null,
    usersInGroup : null,
    rendered: false,
    ldap: false,
    render: function () {
        var self = this;
        if (!this.rendered) {
            require(["text!application/templates/admin/AdminGroups.tpl.html"],
                function (tpl) {
                    self.getValues(function() {
                        self.doLayout(tpl);
                        self.rendered = true;
                    });
                }
            );
        } else {
            this.update();
        }
    },
    update: function () {
        var self = this;
        var groupList = $(self.el).find("#groupList");
        groupList.empty();
        groupList.append("<option value='-1'>(Select a group)</option>");

        $.each(self.allGroups, function(index, value) {
            groupList.append("<option value='"+value.id+"'>"+value.label+"</option>");
        });

        if(self.currentGroup !== null){
            groupList.val(self.currentGroup);
            self.updateCurrentGroupPanel();
        }
    },

    doLayout: function(tpl) {
        var self = this;

        var view = _.template(tpl, {});
        $(this.el).append(view);

        if(self.allGroups.length === 0){
            $(self.el).find("#groupList").hide();
            $(self.el).find("#noGroup").show();
        }else{
            $(self.el).find("#groupList").show();
            $(self.el).find("#noGroup").hide();
        }

        if(self.ldap){
            $(".ldap").show();
        }else{
            $(".ldap").hide();
        }

        $(self.el).find("#LDAPReset").on("click", function(){
            $.ajax({
                type: "PUT",
                url: "/api/ldap/"+self.currentGroup+"/group.json",
                contentType:"application/json; charset=utf-8",
                dataType:"json",
                success: function() {
                    self.updateCurrentGroupPanel();
                }
            });

        });

        $(self.el).find("#importFromLDAP").on("click", function(){

            var groupName = $(self.el).find("#addGroupForm").find("#inputGroupName").val();
            var data = { 'name': groupName};

            $.ajax({
                type: "POST",
                url: "api/ldap/group.json",
                data: JSON.stringify(data),
                contentType:"application/json; charset=utf-8",
                dataType:"json",
                success: function(data) {
                    var group = data.object;

                    self.allGroups.push({id:group.id,label:group.name});
                    self.allGroups.sort(function(a,b){return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);} );

                    self.update();
                }
            });

        });


        $(self.el).find("#deleteGroupButton").on("click", function(){

            new GroupModel({id : self.currentGroup}).destroy({
                success: function () {
                    var index = $.map(self.allGroups, function(e){return e.id}).indexOf(Number(self.currentGroup));

                    if (index > -1) {
                        self.allGroups.splice(index, 1);
                    }

                    self.currentGroup = -1;

                    self.update();
                }
            });
        });


        $(self.el).find("#groupList").on("change", function(){
            self.currentGroup = this.value;
            self.updateCurrentGroupPanel();
        });

        $(self.el).find("#editGroupNameButton").on("click", function(){

            var newName = $(self.el).find("#editinputGroupname").val();

            new GroupModel({id : self.currentGroup, name: newName}).save({},{
                success: function () {
                    var index = $.map(self.allGroups, function(e){return e.id}).indexOf(Number(self.currentGroup));
                    self.allGroups[index].label = newName;
                    self.update();
                }
            });
        });

        $(self.el).find("#addUserInGroup").on("click", function(){

            var chosenUser = $(self.el).find("#usersNotInGroupList").val();
            var userName = $(self.el).find("#usersNotInGroupList").find("option:selected").text();

            new UserGroup({group : self.currentGroup, user: chosenUser}).save({},{
                success: function () {
                    self.usersInGroup.push({id:chosenUser, label:userName});
                    self.updateUserTable();
                }
            });
        });

        $(self.el).on("click", ".removeUserFromGroup", function(){
            var user = $(this).data("id");

            // hack : I dont have the id but it is not needed for the url ==> false id
            new UserGroup({id: -1, group : self.currentGroup, user: user}).destroy({
                success: function () {

                    var index = -1;
                    for(var i=0;i<self.usersInGroup.length;i++){
                        if(self.usersInGroup[i].id == user){
                            index = i;
                            break;
                        }
                    }
                    if (index > -1) {
                        self.usersInGroup.splice(index, 1);
                    }

                    self.updateUserTable();
                }
            });
        });

        $(self.el).find("#addGroupForm").submit(function() {
            $(self.el).find("#addGroupForm").find(".error").hide();
            var groupName = $(self.el).find("#addGroupForm").find("#inputGroupName").val();
            if(groupName.length === 0){
                $(self.el).find("#addGroupForm").find(".error").show();
            } else {
                //creation groupe
                var group = new GroupModel();
                group.save({
                    "name": groupName
                }, {
                    success: function (model, response) {
                        window.app.view.message("Success", response.message, "success");

                        var group = model.get("group");

                        self.allGroups.push({id:group.id,label:group.name});
                        self.allGroups.sort(function(a,b){return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);} );

                        self.update();
                    }
                });

            }
            // no reload
            return false;
        });

        this.update();
        return this;
    },

    updateCurrentGroupPanel: function () {
        var self = this;
        $(self.el).find("#selectedGroupDetails").hide();

        if(self.currentGroup ==-1) return;

        var groupName = $(self.el).find("#groupList").find("option:selected").text();
        $(self.el).find("#editinputGroupname").val(groupName);


        new UserCollection({group : self.currentGroup}).fetch({
            success: function (allUsersCollection) {
                self.usersInGroup = $.map(allUsersCollection.models, function(item){return {id: item.id, label: item.prettyName()}});

                self.updateUserTable();
                $(self.el).find("#selectedGroupDetails").show();
            }
        });

    },
    updateUserTable: function () {
        var self = this;

        var table = $(self.el).find("#usersGroupTable");
        table.empty();
        $.each(self.usersInGroup, function(index, value) {
            table.append("<tr><td>"+value.label+"</td>"+
                "<td><button class='removeUserFromGroup btn btn-danger btn-xs' data-id="+value.id+">Remove user</button></td>" +
                "</tr>");
        });

        var userList = $(self.el).find("#usersNotInGroupList");
        userList.empty();
        $.each(self.allUsers, function(index, value) {
            if($.grep(self.usersInGroup, function(e){ return e.id == value.id; }).length == 0){
                userList.append("<option value='"+value.id+"'>"+value.label+"</option>");
            }
        });

    },
    getValues: function (callback) {
        var self = this;

        var users = null;
        var groups = null;
        var ldap = null;

        var loadedCallBack = function() {
            if(users == null || groups == null || ldap == null) {
                return;
            }

            self.allUsers = [];
            self.allGroups = [];
            self.ldap = ldap;

            users.each(function(user) {
                self.allUsers.push({id:user.id,label:user.prettyName()});
            });

            groups.each(function(group) {
                self.allGroups.push({id:group.id,label:group.get('name')});
            });

            callback();
        };

        new UserCollection({}).fetch({
            success: function (allUsersCollection) {
                users = allUsersCollection;
                loadedCallBack();
            }
        });
        new GroupCollection({}).fetch({
            success: function (allGroupsCollection) {
                groups = allGroupsCollection;
                loadedCallBack();
            }
        });
        $.get( "ldap.json", function( data ) {
            ldap = data.enabled;
            loadedCallBack();
        });
    }
});
