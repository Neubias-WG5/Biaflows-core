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

var ProjectDashboardUsersConfig = Backbone.View.extend({
    adminMagicSuggest: null,
    representativeMagicSuggest: null,
    projectUsers: [],
    projectAdmins: [],
    projectRepresentatives: [],
    showOnlyOnlineUsers : false,
    showOnlyAdmins : false,
    statsUsersHeatmapView : null,
    statsUsersGlobalActivitiesView: null,
    initialize: function () {
        this.rendered = false;
    },
    render: function () {
        var self = this;
        if (!this.rendered) {
            require(["text!application/templates/dashboard/config/UsersConfig.tpl.html"],
                function (userTableTemplate) {
                    self.doLayout(userTableTemplate);
                    self.rendered = true;
                });
        } else {
            this.update();
        }
    },
    update: function () {
        var self = this;
        this.getValues(function(){
            self.updateMagics();
        });
        this.updateTable();
    },
    updateTable: function () {
        var self = this;

        var table = $(this.el).find("#userProjectTable" + self.model.get('id'));

        var columns = [
            { orderable: false, render : function( data, type, row ) {
                return "<input type='checkbox' data-id='"+row["id"]+"' class='userchckbox-"+self.model.get('id')+"'>";
            }, targets: [0]},
            { data: "username", searchable: true, targets: [1]},
            { searchable: true, orderable: false, render : function ( data, type, row ) {
                return row["firstname"] + " "+row["lastname"];
            }, targets: [2]},
            { data: "lastConnection", className: "prettyTime", defaultContent: "No record", render : function( data, type, row ) {
                return "<span title='"+window.app.convertLongToDate(row["lastConnection"])+"'> "+window.app.convertLongToPrettyDate(row["lastConnection"])+"</span>";
            }, targets: [3]},
            { data: "lastImageName", defaultContent: "No record", orderable: false, targets: [4]},
            { data: "LDAP", defaultContent: "", render : function( data) {
                if(data){
                    return "<div class = 'led-green'></div>";
                } else {
                    return "<div class = 'led-red'></div>";
                }
            }, targets: [5]},
            { data: "email", searchable: true, targets: [6] },
            { data: "frequency", defaultContent: "An error happened", targets: [7]},
            { orderable: false, render : function( data, type, row ) {
                return "<button class='btn btn-info btn-xs UserActivityBtn' data-user='"+row["id"]+"' data-project='"+self.model.id+"'>Details</button>";
            }, targets: [8]},
            { searchable: false, targets: "_all" }
        ];

        table.DataTable({
            destroy: true,
            processing: true,
            serverSide: true,
            ajax: {
                url: new UserCollection({withActivity: true, project: this.model.get('id'), admins : self.showOnlyAdmins, online : self.showOnlyOnlineUsers}).url(),
                data: {
                    "datatables": "true"
                }
            },
            rowCallback: function( row, data,index ) {
                var id = data["id"]; // ID is returned by the server as part of the data
                var $nRow = $(row); // cache the row wrapped up in jQuery
                if (self.projectAdmins.indexOf(id) >= 0) {
                    $('td', $nRow).css({"background-color":"#ff3333"});
                }
                if (id == window.app.status.user.id) {
                    $('td', $nRow).css({"background-color":"#3385ff"});
                }
                return row;
            },
            columnDefs : columns,
            order: [],
            lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]]
        });

        $('#selectAllUsers'+self.model.id).prop('checked', false);


    },
    updateMagics: function () {
        var self = this;
        $(self.adminMagicSuggest).off('selectionchange');
        $(self.representativeMagicSuggest).off('selectionchange');

        self.adminMagicSuggest.setData(self.projectUsers);
        self.adminMagicSuggest.clear();
        self.adminMagicSuggest.setValue(self.projectAdmins);
        self.representativeMagicSuggest.setData(self.projectUsers);
        self.representativeMagicSuggest.clear();
        self.representativeMagicSuggest.setValue(self.projectRepresentatives);

        $(self.adminMagicSuggest).on('selectionchange', function(){
            self.projectAdmins = this.getValue();
            self.updateUsersInProject(null,self.projectAdmins,null);
        });
        $(self.representativeMagicSuggest).on('selectionchange', function(){
            self.projectRepresentatives = this.getValue();
            self.updateUsersInProject(null, null, self.projectRepresentatives);
        });

    },
    getValues: function (callBack) {
        var self = this;
        var projectUser = null;
        var projectRepresentative = null;
        var projectAdmin = null;


        var loadUsers = function() {
            if(projectUser == null || projectAdmin == null || projectRepresentative == null) {
                return;
            }

            self.projectUsers = [];
            self.projectAdmins = [];
            self.projectRepresentatives = [];

            projectUser.each(function(user) {
                self.projectUsers.push({id:user.id,label:user.prettyName()});
            });


            projectAdmin.each(function(user) {
                self.projectAdmins.push(user.id);
            });

            projectRepresentative.each(function(user) {
                self.projectRepresentatives.push(user.id);
            });

            callBack();

        };

        new UserCollection({project: self.model.id}).fetch({
            success: function (projectUserCollection) {
                projectUser = projectUserCollection;
                window.app.models.projectUser = projectUserCollection;
                loadUsers();
            }
        });

        new UserCollection({project: self.model.id, admin:true}).fetch({
            success: function (projectUserCollection) {
                projectAdmin = projectUserCollection;
                window.app.models.projectAdmin = projectUserCollection;
                loadUsers();
            }
        });

        new UserCollection({project: self.model.id, representative:true}).fetch({
            success: function (projectUserCollection) {
                projectRepresentative = projectUserCollection;
                window.app.models.projectRepresentative = projectUserCollection;
                loadUsers();
            }
        });
    },

    doLayout: function (userTableTemplate) {
        var self = this;

        // table
        var view = _.template(userTableTemplate, {id : self.model.get('id')});
        $(this.el).append(view);

        $(this.el).find("#ProjectUserAdd"+self.model.get('id')).on("click", function() {
            //The close action save the user modifications
            new AddUserToProjectDialog({el: "#dialogs", model: self.model, closeAction: function(newUsersId){
                self.addUsersInProject(newUsersId);
            }}).render();
        });
        $(this.el).find("#UserRefresh"+self.model.get('id')).on("click", function() {
            self.updateTable();
        });

        $(this.el).find("#ProjectUserExport"+self.model.get('id')).on("click", function() {
            window.open("/api/project/"+self.model.id+"/user/download?format=csv");
        });




        $(this.el).find("#ProjectUserDelete"+self.model.get('id')).on("click", function() {
            self.deleteUsersInProject();
        });

        // TODO uncomment when archive proccess is written
        /*$(this.el).find("#ProjectUserArchive"+self.model.get('id')).on("click", function() {
            self.archiveAnnotationsOfUsers();
        });*/




        $(this.el).find("#ShowOnlyOnline"+self.model.get('id')).change(function() {
            if ($(this).is(':checked')) {
                self.showOnlyOnlineUsers = true;
            } else {
                self.showOnlyOnlineUsers = false;
            }
            self.updateTable();
        });
        $(this.el).find("#ShowOnlyAdmin"+self.model.get('id')).change(function() {
            if ($(this).is(':checked')) {
                self.showOnlyAdmins = true;
            } else {
                self.showOnlyAdmins = false;
            }
            self.updateTable();
        });

        $('#selectAllUsers'+self.model.id).on('change', function(){
            $(".userchckbox-"+self.model.get('id')).prop('checked', $(this).prop('checked'));
        });

        $(this.el).on("change", ".userchckbox-"+self.model.get('id'), function() {
            console.log($(this).data("id"));
            if ($(this).prop('checked')) {
                if($(".userchckbox-"+self.model.get('id')+":checked").length === $(".userchckbox-"+self.model.get('id')).length){
                    $('#selectAllUsers'+self.model.id).prop('checked', true);
                }
            } else {
                $('#selectAllUsers'+self.model.id).prop('checked', false);
            }
        });


        // magicsuggest
        self.adminMagicSuggest = $(self.el).find('#projecteditmanager'+self.model.get('id')).magicSuggest({
            data: null,
            displayField: 'label',
            value: null,
            width: 590,
            maxSelection:null
        });
        self.representativeMagicSuggest = $(self.el).find('#projecteditrepresentative'+self.model.get('id')).magicSuggest({
            data: null,
            displayField: 'label',
            value: null,
            width: 590,
            maxSelection:null
        });


        $(this.el).on("click", ".UserDetailsButton"+self.model.get('id'), function() {
            var userId = $(this).data("id");
            new UserModel({id: userId}).fetch({
                success: function (model) {
                    var viewModel = model;
                    viewModel.set({projectId : self.model.id});
                    viewModel.set({projectName : self.model.get('name')});

                    new DetailedUserProjectInfoDialog({el: "#dialogs", model: viewModel}).render();
                }
            });
        });

        self.update();

        if (this.statsUsersGlobalActivitiesView == null) {
            this.statsUsersGlobalActivitiesView = new ProjectUsersTotalActivitiesView({
                model: self.model,
                title : "Activities of contributors",
                el: $(self.el).find("#UsersGlobalActivities"+self.model.id)
            });
        }
        if (this.statsUsersHeatmapView == null) {
            this.statsUsersHeatmapView = new ProjectUsersHeatmapView({
                model: self.model,
                title : "Heatmap of contributor connections",
                el: $(self.el).find("#UsersActivitiesHeatmap"+self.model.id)
            });
        }

        this.statsUsersGlobalActivitiesView.render();
        this.statsUsersHeatmapView.render();

        new LastConnexionsGraphsView({
            project : self.model.id,
            title : "Last Connections",
            el: $(self.el).find("#LastConnections-"+self.model.id)
        }).render();
        new AverageConnexionsGraphsView({
            project : self.model.id,
            title : "Average Connections",
            el: $(self.el).find("#avgConnections-"+self.model.id)}).render();

        $(self.el).find("#userProjectTable"+self.model.id).on("click", ".UserActivityBtn", function(event) {
            window.location = '#tabs-useractivity-'+$(this).data("project")+'-'+$(this).data("user");
        });

    },

    archiveAnnotationsOfUsers: function() {
        var self = this;
        var usersToArchive = $(self.el).find(".userchckbox-"+self.model.get('id')+":checked");

        usersToArchive = $.map( usersToArchive, function(n) {
            return ( Number(n.dataset.id) );
        });

        if(usersToArchive.length === 0) return;

        /*var level = 'CONFIRMATIONWARNING';
        // todo put the after br in red
        var message = "Do you really want to archive these users ? <br/><label class='label label-danger'>You won't be able to reverse this!</label>";
        var callback = function(){
            // TODO : A post request not yet implemented
        };

        DialogModal.initDialogModal(null, self.model.id, 'ArchiveUsers', message, level, callback);*/
    },
    addUsersInProject: function(newUsersId) {
        var self = this;
        var users = [];

        new UserCollection({project: self.model.id}).fetch({
            success: function (projectUserCollection) {
                projectUserCollection.each(function (user) {
                    users.push(user.id);
                });
                for(var i = 0; i< newUsersId.length; i++) {
                    users.push(newUsersId[i]);
                }
                self.updateUsersInProject(users, null, null);
            }
        });
    },
    deleteUsersInProject: function() {
        var self = this;

        var usersToDelete = $(self.el).find(".userchckbox-"+self.model.get('id')+":checked");

        usersToDelete = $.map( usersToDelete, function(n) {
            return ( Number(n.dataset.id) );
        });

        if(usersToDelete.length === 0) return;

        var level = 'CONFIRMATIONWARNING';
        var message = 'Do you want to delete these users ?';
        var callback = null;

        // cannot delete current users and admins.
        if(usersToDelete.indexOf(window.app.status.user.id)>=0){
            level = 'ERROR';
            message = 'Impossible to delete these users. You cannot delete yourself of a project.';
        } else {
            var checkAdminSelected = self.projectAdmins.some(function(currentValue) {
                return usersToDelete.indexOf(currentValue)>=0;
            });

            if(checkAdminSelected) {
                message += "<br/>Be careful, some project managers are selected!";
            }

            callback = function(){
                var users = [];

                new UserCollection({project: self.model.id}).fetch({
                    success: function (projectUserCollection) {
                        projectUserCollection.each(function (user) {
                            if(usersToDelete.indexOf(user.id) == -1) {
                                users.push(user.id);
                            }
                        });
                        self.updateUsersInProject(users, null, null);
                    }
                });
            };
        }

        DialogModal.initDialogModal(null, self.model.id, 'DeleteUsers', message, level, callback);
    },
    updateUsersInProject: function(projectUsers, projectManagers, projectRepresentatives) {
        var self = this;

        var project = self.model;

        project.set({users: projectUsers, admins: projectManagers, representatives: projectRepresentatives});
        project.save({users:projectUsers, admins: projectManagers, representatives: projectRepresentatives}, {
            success: function (model, response) {
                console.log("1. Project edited!");
                window.app.view.message("Project", response.message, "success");
                self.update();
                // The users change. Update all the panels where users are listed.
                window.app.controllers.dashboard.refreshUserData();
                // Idem with representatives
                window.app.controllers.dashboard.refreshRepresentativeData();

            },
            error: function (model, response) {
                var json = $.parseJSON(response.responseText);
                window.app.view.message("Project", json.errors, "error");
            }
        });
    }

});
