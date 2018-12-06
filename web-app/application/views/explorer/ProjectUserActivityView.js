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

var ProjectUserActivityView;
ProjectUserActivityView = Backbone.View.extend({
    tagName: "div",
    divPrefixId: "",
    divId: "",
    /**
     * ProjectUserActivityView constructor
     * Accept options used for initialization
     * @param options
     */
    initialize: function (options) {
        if (options.addToTab != undefined) {
            this.addToTab = options.addToTab;
        }
    },
    render: function () {
        var self = this;
        require(["text!application/templates/explorer/ProjectUserActivity.tpl.html"
        ], function (tpl) {
            self.doLayout(tpl);
        });
        return this;
    },
    doLayout: function (tpl) {
        var self = this;
        self.divId = "tabs-useractivity-" + window.app.status.currentProject + "-" + this.model.id;

        var templateData = self.model.toJSON();

        templateData.projectName = window.app.status.currentProjectModel.get('name');
        templateData.idProject = window.app.status.currentProject;
        templateData.idUser = self.model.id;

        var htmlCode = _.template(tpl, templateData);

        $(this.el).append(htmlCode);

        if (this.addToTab) {
            this.addToTab();
        }

        $(this.el).find(".detailedUserInfoContent").hide();

        $(self.el).find("#UserProjectConnectionsHistory-"+self.model.id).on("click", ".UserActivityDetail-"+self.model.id, function(event) {
            self.updateTableDetails($(event.currentTarget).data("id"));
        });

        self.getValuesActivities(function() {
            $(self.el).find("#UserActivitiesInfo-"+self.model.id).find(".detailedUserInfoWaitingDiv").hide();
            $(self.el).find("#UserActivitiesInfo-"+self.model.id).find(".detailedUserInfoContent").show();
            self.renderInfoActivities();
        });

        self.updateTableHistory();
        self.updateTableConsultationResume();

        new AverageConnexionsGraphsView({
            project : window.app.status.currentProject,
            user : self.model.id,
            title : "Average Connections",
            resizeBtn : false,
            el: $(self.el).find("#UserProjectConnectionsGraph-"+self.model.id)}).render();
        return this;
    },
    show: function (options) {
        $(this.el).find(".detailedUserInfoContent").show();
    },
    getValuesActivities: function (creation) {
        var self = this;

        var callback = function(){
            if(self.numberAnnotations == null || self.lastConnexionDate == null || self.numberConnexions == null) return;
            creation();
        };

        new UserActivitiesCollection({project: window.app.status.currentProject, user: self.model.id, resumeActivity: true}).fetch({
            success: function (data) {
                var model = data.pop();
                self.firstConnexionDate = model.get("firstConnection") || "No connexion yet";
                self.lastConnexionDate = model.get("lastConnection") || "No connexion yet";
                self.numberAnnotations = model.get("totalAnnotations");
                self.numberConnexions = model.get("totalConnections");
                callback();
            }
        });

        // TODO # consulted images
    },
    renderInfoActivities:function(){
        var self = this;

        $(self.el).find("#totalProjectConnexions-"+self.model.id).html(self.numberConnexions);
        //$(self.el).find("#totalConsultedImages"+self.model.id).html(self.);
        $(self.el).find("#totalUserAnnotations-"+self.model.id).html(self.numberAnnotations);

        var prettyDate = "<span title='"+ window.app.convertLongToDate(self.lastConnexionDate) +"'>"+ window.app.convertLongToPrettyDate(self.lastConnexionDate) +"</span>";
        $(self.el).find("#lastProjectConnexion-"+self.model.id).html(prettyDate);
        prettyDate = "<span title='"+ window.app.convertLongToDate(self.firstConnexionDate) +"'>"+ window.app.convertLongToPrettyDate(self.firstConnexionDate) +"</span>";
        $(self.el).find("#firstProjectConnexion-"+self.model.id).html(prettyDate);


    },
    updateTableHistory: function () {
        var self = this;
        var table = $(self.el).find("#UserProjectConnectionsHistory-"+self.model.id).find("table");
        var columns = [
            { data: "created", render : function ( data, type ) {
                if(type === "display"){
                    return "<span title='"+window.app.convertLongToDate(data)+"'> "+window.app.convertLongToPrettyDate(data)+"</span>";
                } else {
                    return data
                }
            }, targets: [0]},
            { data: "time", defaultContent: "< 20 s", render : function ( data, type, row ) {
                if(type === "display"){
                    var result = "";
                    if(row["online"]) {
                        result += "Currently ";
                    }
                    result += window.app.convertLongToPrettyDuration(data/1000);
                    return result;
                } else {
                    return data
                }
            }, targets: [1]},
            { data: "countViewedImages", defaultContent: "Unknown value", targets: [2]},
            { data: "countCreatedAnnotations", defaultContent: "Unknown value", targets: [3]},
            { orderable: false, render : function( data, type, row ) {
                return "<button class='btn btn-info btn-xs UserActivityDetail-"+self.model.id+"' data-id='"+row["id"]+"'>See details</button>";
            }, targets: [4]},
            { searchable: false, orderable: false, targets: "_all" }
        ];

        table.DataTable({
            rowId: 'id',
            destroy: true,
            processing: true,
            serverSide: true,
            ajax: {
                url: new UserActivitiesCollection({project: window.app.status.currentProject, user: self.model.id}).url(),
                data: {
                    "datatables": "true"
                }
            },
            dom: 'lBrtip',
            buttons: {
                dom: {
                    container: {
                        className: 'dataTables_buttons_container'
                    }
                },
                buttons: [
                    {
                        text: 'Reload',
                        className: 'dataTables_reload_button',
                        action: function ( e, dt, node, config ) {
                            dt.ajax.reload();
                        }
                    },
                    {
                        text: 'CSV',
                        className: '',
                        action: function ( e, dt, node, config ) {
                            window.location.href = new UserActivitiesCollection({project: window.app.status.currentProject, user: self.model.id}).url() + "?export=csv";
                        }
                    }
                ]
            },
            searching: false,
            columnDefs : columns,
            order: [],
            pageLength: 10,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]]
        });
    },
    updateTableDetails: function(activityId) {
        var self = this;
        $(self.el).find("#UserActivityDetail-"+self.model.id).show();

        var rowData = $(self.el).find("#UserProjectConnectionsHistory-"+self.model.id).find("table").DataTable().row('#'+activityId).data();
        $(self.el).find("#browser-"+self.model.id).html(rowData.browser);
        $(self.el).find("#OS-"+self.model.id).html(rowData.os);

        var table = $(self.el).find("#UserActivityDetail-"+self.model.id).find("table");

        var columns = [
            { data: "created", render : function ( data, type ) {
                if(type === "display"){
                    return "<span title='"+window.app.convertLongToDate(data)+"'> "+window.app.convertLongToPrettyDate(data)+"</span>";
                } else {
                    return data
                }
            }, targets: [0]},
            { data: "imageName", render : function ( data, type, row ) {
                if(type === "display"){
                    var result = "";
                    if(!window.app.isUndefined(row['imageThumb'])){
                        result += "<img src= '"+row['imageThumb']+"' style='max-width:64px;'><br/>"
                    }
                    result += data;
                    return result;
                } else {
                    return data
                }
            }, targets: [1]},
            { data: "time", defaultContent: "< 20 s", render : function ( data, type, row ) {
                if(type === "display"){
                    //TODO render où j'affiche online s  j'ai la value
                    // convert to pretty timeLaps
                    if(row["online"]) {
                        return "connecté"
                    }
                    return window.app.convertLongToPrettyDuration(data/1000);
                } else {
                    return data
                }
            }, targets: [2]},
            { data: "countCreatedAnnotations", defaultContent: "Unknown value", targets: [3]},
            //{ data : "surface", targets: [3]},
            { searchable: false, orderable: false, targets: "_all" }
        ];

        table.DataTable({
            destroy: true,
            processing: true,
            serverSide: true,
            ajax: {
                url: new UserActivityDetailsCollection({activity: activityId}).url(),
                data: {
                    "datatables": "true"
                }
            },
            dom: 'lBrtip',
            buttons: {
                dom: {
                    container: {
                        className: 'dataTables_buttons_container'
                    }
                },
                buttons: [
                    {
                        text: 'Reload',
                        className: 'dataTables_reload_button',
                        action: function ( e, dt, node, config ) {
                            dt.ajax.reload();
                        }
                    },
                    {
                        text: 'CSV',
                        className: '',
                        action: function ( e, dt, node, config ) {
                            window.location.href = new UserActivityDetailsCollection({activity: activityId}).url() + "?export=csv";
                        }
                    }
                ]
            },
            searching: false,
            columnDefs : columns,
            order: [],
            pageLength: 10,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]]
        });
    },
    updateTableConsultationResume: function () {
        var self = this;
        var table = $(self.el).find("#UserImageConsultationsResume-"+self.model.id).find("table");
        var columns = [
            { data: "imageName", render : function ( data, type, row ) {
                if(type === "display"){
                    var result = "";
                    if(!window.app.isUndefined(row['imageThumb'])){
                        result += "<img src= '"+row['imageThumb']+"' style='max-width:64px;'><br/>"
                    }
                    result += data;
                    return result;
                } else {
                    return data;
                }
            }, targets: [0]},
            { data: "time", defaultContent: "< 20 s", render : function ( data, type, row ) {
                if(type === "display"){
                    return window.app.convertLongToPrettyDuration(data/1000);
                } else {
                    return data;
                }
            }, targets: [1]},
            { data: "first", defaultContent: "", render : function ( data, type, row ) {
                return "<span title='"+window.app.convertLongToDate(row['first'])+"'> "+window.app.convertLongToPrettyDate(row['first'])+"</span><br/>"+
                    "<span title='"+window.app.convertLongToDate(row['last'])+"'> "+window.app.convertLongToPrettyDate(row['last'])+"</span>"
            }, targets: [2]},
            { data: "countCreatedAnnotations", defaultContent: "Unknown value", targets: [3]},
            { searchable: false, orderable: false, targets: "_all" }
        ];

        table.DataTable({
            destroy: true,
            processing: true,
            serverSide: true,
            ajax: {
                url: new ImageConsultationCollection({project: window.app.status.currentProject, user: self.model.id}).url(),
                data: {
                    "datatables": "true"
                }
            },
            dom: 'lBrtip',
            buttons: {
                dom: {
                    container: {
                        className: 'dataTables_buttons_container'
                    }
                },
                buttons: [
                    {
                        text: 'Reload',
                        className: 'dataTables_reload_button',
                        action: function ( e, dt, node, config ) {
                            dt.ajax.reload();
                        }
                    },
                    {
                        text: 'CSV',
                        className: '',
                        action: function ( e, dt, node, config ) {
                            window.location.href = new ImageConsultationCollection({project: window.app.status.currentProject, user: self.model.id}).url() + "&export=csv";
                        }
                    }
                ]
            },
            searching: false,
            columnDefs : columns,
            order: [],
            pageLength: 10,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]]
        });
    }

});