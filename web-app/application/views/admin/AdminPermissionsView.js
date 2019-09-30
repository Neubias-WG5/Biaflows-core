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

var AdminPermissionsView = Backbone.View.extend({

    userPermissionsPanel : null,
    domainPermissionsPanel : null,
    allUsers : null,
    allDomains: null,

    render: function () {
        var self = this;
        if (!this.rendered) {
            require(["text!application/templates/admin/AdminPermissions.tpl.html"],
                function (tpl) {
                    self.getValues(function() {
                        self.doLayout(tpl);
                        self.rendered = true;
                    });
                }
            );
        }
    },

    doLayout: function(tpl) {
        var self = this;

        var view = _.template(tpl, {});
        $(this.el).append(view);

        self.userPermissionsPanel = new AdminUserPermissionsPanel({
            el: $(self.el).find("#adminUserPermissionsPanel"),
            users : self.allUsers,
            domains : self.allDomains
        });
        self.userPermissionsPanel.render();

        $(self.el).find("#domainPermissionsPanelBtn").on("click", function(){
            $(self.el).find("#domainPermissionsPanelBtn").addClass("btn-primary");
            $(self.el).find("#userPermissionsPanelBtn").removeClass("btn-primary");
            if(self.domainPermissionsPanel === null){
                self.domainPermissionsPanel = new AdminDomainPermissionsPanel({
                    el: $(self.el).find("#adminDomainPermissionsPanel"),
                    users : self.allUsers,
                    domains : self.allDomains
                });
                self.domainPermissionsPanel.render();
            } else {
                self.domainPermissionsPanel.show();
            }
            if(self.userPermissionsPanel !== null){
                self.userPermissionsPanel.hide();
            }
        });
        $(self.el).find("#userPermissionsPanelBtn").on("click", function(){
            $(self.el).find("#domainPermissionsPanelBtn").removeClass("btn-primary");
            $(self.el).find("#userPermissionsPanelBtn").addClass("btn-primary");
            self.userPermissionsPanel.show();
            if(self.domainPermissionsPanel !== null){
                self.domainPermissionsPanel.hide();
            }
        });

        return this;
    },

    getValues: function(callback) {

        var self = this;
        var users = null;
        var domains = null;

        var loadedCallBack = function() {
            if(users === null || domains === null) {
                return;
            }

            self.allUsers = [];
            self.allDomains = [];

            users.each(function(user) {
                self.allUsers.push({id:user.id,username:user.get("username"), prettyName:user.prettyName()});
            });

            self.allDomains = domains;

            callback();
        };

        new UserCollection({}).fetch({
            success: function (allUsersCollection) {
                users = allUsersCollection;
                loadedCallBack();
            }
        });
        $.get( "api/acl/domain.json", function( data ) {
            domains = data.collection;
            loadedCallBack();
        });

    }

});


var AdminGenericPermissionsPanel = Backbone.View.extend({
    allUsers : null,
    allDomains: null,
    initialize: function (options) {
        this.allUsers = options.users;
        this.allDomains = options.domains;
    },
    render: function () {
        var self = this;
        if (!this.rendered) {
            self.doLayout();
            self.rendered = true;
        }
    },
    show: function(){
        $(this.el).show();
    },
    hide: function(){
        $(this.el).hide();
    },
    getAllDomainNames: function(){
        var self = this;
        return $.unique( $.map(self.allDomains, function(value){
            return value.className;
        }));
    },
    getAllDomainElements: function(domain){
        var self = this;
        return $.map(self.allDomains, function(value){
            if(value.className.indexOf(domain) > -1){
                return {id: value.id, name: value.name};
            }
        });
    },
    createDomainBoxes: function(box1,box2){
        var self = this;

        $.each(self.getAllDomainNames(), function(index, value) {
            var name = self.getDomainName(value);
            box1.append("<option value='"+value+"'>"+name+"</option>");
        });

        $(this.el).on("change", "#"+box1.attr("id"), function(){
            var domainSelected = this.value;
            if(domainSelected === '') {
                box2.empty();
                box2.hide();
            } else {
                box2.show();
                box2.append("<option value=''>(Select a domain)</option>");
                $.each(self.getAllDomainElements(domainSelected), function(index, value) {
                    box2.append("<option value='"+value.id+"'>"+value.name+"</option>");
                });
            }
        });
    },
    getDomainName: function(domain){
        var name = domain.split('.');
        return name[name.length-1];
    },
    maskToString: function (mask){
        if(mask === 1){
            return "READ";
        } else if(mask === 2) {
            return "WRITE";
        } else if(mask === 8){
            return "DELETE";
        } else if(mask === 16){
            return "ADMIN";
        }
    },
    addPermission: function (domainClass, domainId, userId, auth, callback){
        $.ajax({
            url: "api/domain/"+domainClass+"/"+domainId+"/user/"+userId+".json?auth="+auth,
            type: 'POST',
            success: function() {
                callback();
            }
        });
    },
    deletePermission: function (domainClass, domainId, userId, auth, callback){
        $.ajax({
            url: "api/domain/"+domainClass+"/"+domainId+"/user/"+userId+".json?auth="+auth,
            type: 'DELETE',
            success: function() {
                callback();
            }
        });
    }
});

var AdminUserPermissionsPanel = AdminGenericPermissionsPanel.extend({
    currentUser : null,

    doLayout: function() {
        var self = this;

        var selectBox = $(self.el).find("#selectUserForPermission");
        $.each(self.allUsers, function(index, value) {
            selectBox.append("<option value='"+value.id+"'>"+value.username+"</option>");
        });

        selectBox.on("change", function(){
            var idSelected = this.value;

            self.currentUser = $.grep(self.allUsers, function(e){ return e.id == idSelected; })[0];

            self.showCurrentUserPermissions();
        });

        return this;
    },

    showCurrentUserPermissions: function(){
        var self = this;
        $(self.el).find("#selectedUserPermissions").empty();

        if(self.currentUser ===null || typeof self.currentUser ==="undefined") return;

        var html = "" +
            "<div>"+
            "<h5><%= prettyName %></h5>"+
            "<table class='table table-striped'>"+
            "<thead>"+
            "<tr>"+
            "<th>Domain</th>"+
            "<th>Domain name</th>"+
            "<th>Domain id</th>"+
            "<th>Permission</th>"+
            "<th>Action</th>"+
            "</tr>"+
            "</thead>"+
            "<tbody>"+
            "</tbody>"+
            "</table>"+
            "</div>";

        $(self.el).find("#selectedUserPermissions").append(_.template(html, self.currentUser));
        var body = $(self.el).find("#selectedUserPermissions").find("tbody");

        $.get( "api/acl.json?idUser="+self.currentUser.id, function( data ) {
            var permissions = data.collection;
            $.each(permissions, function(index, value) {
                var domain = self.getDomainName(value.domainClassName);

                var label = "label-default";
                if(domain === "Project"){
                    label = "label-success";
                } else if(domain === "Ontology"){
                    label = "label-warning";
                } else if(domain === "Storage"){
                    label = "label-danger";
                } else if(domain === "Software"){
                    label = "label-info";
                }
                var perm = self.maskToString(value.mask);

                body.append(
                        "<tr>"+
                        "<td><span class='label "+label+"'>"+domain+"</span></td>"+
                        "<td>"+value.name+"</td>"+
                        "<td>"+value.domainIdent+"</td>"+
                        "<td>"+perm+"</td>"+
                        "<td><button class='deleteUserPermBtn btn btn-danger' data-domain='"+value.domainClassName+"' " +
                        "data-id='"+value.domainIdent+"' data-auth='"+perm+"'>Remove permission</button></td>"+
                        "</tr>"
                );

            });

            body.append(
                    "<tr>"+
                    "<td>" +
                    "<select id='addPermissionDomainClass'>" +
                    "<option value=''>(Select a domain)</option>" +
                    "</select>" +
                    "</td>"+
                    "<td>"+
                    "<select id='addPermissionDomainIdent' style='display : none'></select>"+
                    "</td>"+
                    "<td id='domainId'></td>"+
                    "<td>"+
                    "<select id='addPermissionMask' style='display : none'>" +
                    "<option value=''>(Select a permission)</option>" +
                    "<option value='1'>READ</option>" +
                    "<option value='2'>WRITE</option>" +
                    "<option value='8'>DELETE</option>" +
                    "<option value='16'>ADMIN</option>" +
                    "</select>"+
                    "</td>"+
                    "<td><button class='addUserPermissionBtn btn btn-primary'>Add permission</button></td>"+
                    "</tr>"
            );

            self.createDomainBoxes($(self.el).find("#addPermissionDomainClass"),$(self.el).find("#addPermissionDomainIdent"));
        });

        $(self.el).on("change", "#addPermissionDomainIdent", function(){
            var idSelected = this.value;
            if(idSelected === '') {
                $(self.el).find("#domainId").empty();
                $(self.el).find("#addPermissionMask").hide();
            } else {
                $(self.el).find("#addPermissionMask").show();
                $(self.el).find("#domainId").text(idSelected);
            }
        });

        $(self.el).on("click", ".addUserPermissionBtn", function(){
            var domain = $(self.el).find("#addPermissionDomainClass").val();
            var auth = $(self.el).find("#addPermissionMask option:selected").text();
            var domainId = $(self.el).find("#domainId").text();
            self.addPermission(domain, domainId, self.currentUser.id, auth,
                function(){
                    self.showCurrentUserPermissions();
                });
        });

        $(self.el).on("click", ".deleteUserPermBtn", function(){
            var domain = $(this).data("domain");
            var auth = $(this).data("auth");
            var domainId = $(this).data("id");
            self.deletePermission(domain, domainId, self.currentUser.id, auth,
                function(){
                    self.showCurrentUserPermissions();
                });
        });
    }
});


var AdminDomainPermissionsPanel = AdminGenericPermissionsPanel.extend({

    currentDomain : null,

    doLayout: function() {
        var self = this;

        var selectBox = $(self.el).find("#selectDomainForPermission");

        self.createDomainBoxes(selectBox,$(self.el).find("#selectDomainIdForPermission"));

        $(self.el).find("#selectDomainIdForPermission").on("change", function(){
            var idSelected = this.value;
            var domain = $(self.el).find("#selectDomainForPermission").val();
            self.currentDomain = $.grep(self.allDomains, function(e){ return e.id == idSelected && e.className == domain; })[0];
            self.currentDomain.name = self.getDomainName(self.currentDomain.className);
            self.showCurrentDomainPermissions();
        });


        self.show();

        return this;
    },
    showCurrentDomainPermissions: function(){
        var self = this;
        $(self.el).find("#selectedDomainPermissions").empty();

        if(self.currentDomain ===null || typeof self.currentDomain ==="undefined") return;

        var html = "" +
            "<div>"+
            "<h5>Domain <%= name %> (<%= id %>)</h5>"+
            "<table class='table table-striped'>"+
            "<thead>"+
            "<tr>"+
            "<th>User</th>"+
            "<th>Permission</th>"+
            "<th>Action</th>"+
            "</tr>"+
            "</thead>"+
            "<tbody>"+
            "</tbody>"+
            "</table>"+
            "</div>";

        $(self.el).find("#selectedDomainPermissions").append(_.template(html, self.currentDomain));
        var body = $(self.el).find("#selectedDomainPermissions").find("tbody");

        $.get( "api/acl.json?idDomain="+self.currentDomain.id, function( data ) {
            var permissions = data.collection;
            $.each(permissions, function(index, value) {

                var perm = self.maskToString(value.mask);

                body.append(
                        "<tr>"+
                        "<td>"+value.sid+"</td>"+
                        "<td>"+perm+"</td>"+
                        "<td><button class='deleteDomainPermBtn btn btn-danger' " +
                        "data-id='"+value.idUser+"' data-auth='"+perm+"'>Remove permission</button></td>"+
                        "</tr>"
                );

            });

            body.append(
                    "<tr>"+
                    "<td>" +
                    "<select id='addPermissionUser'>" +
                    "<option value=''>(Select a user)</option>" +
                    "</select>" +
                    "</td>"+
                    "<td>"+
                    "<select id='addPermissionMask'>" +
                    "<option value=''>(Select a permission)</option>" +
                    "<option value='1'>READ</option>" +
                    "<option value='2'>WRITE</option>" +
                    "<option value='8'>DELETE</option>" +
                    "<option value='16'>ADMIN</option>" +
                    "</select>"+
                    "</td>"+
                    "<td><button class='addDomainPermissionBtn btn btn-primary'>Add permission</button></td>"+
                    "</tr>"
            );

            $.each(self.allUsers, function(index, value) {
                $(self.el).find("#addPermissionUser").append("<option value='"+value.id+"'>"+value.username+"</option>");
            });

        });

        $(self.el).on("click", ".addDomainPermissionBtn", function(){
            var userId = $(self.el).find("#addPermissionUser").val();
            var auth = $(self.el).find("#addPermissionMask option:selected").text();
            self.addPermission(self.currentDomain.className,  self.currentDomain.id, userId, auth,
                function(){
                    self.showCurrentDomainPermissions();
                });
        });

        $(self.el).on("click", ".deleteDomainPermBtn", function(){
            var auth = $(this).data("auth");
            var userId = $(this).data("id");
            self.deletePermission(self.currentDomain.className,  self.currentDomain.id, userId, auth,
                function(){
                    self.showCurrentDomainPermissions();
                });
        });
    }
});
