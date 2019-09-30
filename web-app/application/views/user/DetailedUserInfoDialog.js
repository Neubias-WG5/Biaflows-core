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

var DetailedUserInfoDialog = Backbone.View.extend({
    activitiesHistory : [],
    numberAnnotations : null,
    numberProjects : null,
    numberManagedProjects : null,

    initialize: function (options) {
        _.bindAll(this, 'render');
    },
    render: function () {
        var self = this;
        require([
                "text!application/templates/user/DetailedUserInfoDialog.tpl.html"
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

        $(this.el).find(".detailedUserInfoContent").hide();

        self.getAndRenderGeneralValues();

        self.getValuesActivities(function() {

            $(self.el).find("#UserActivitiesInfo-"+self.model.id).find(".detailedUserInfoWaitingDiv").hide();
            $(self.el).find("#UserActivitiesInfo-"+self.model.id).find(".detailedUserInfoContent").show();
            self.renderInfoActivities();
        });

        /*self.getValuesHistory(function() {

            $(self.el).find("#UserActivitiesHistory-"+self.model.id).find(".detailedUserInfoWaitingDiv").hide();
            $(self.el).find("#UserActivitiesHistory-"+self.model.id).find(".detailedUserInfoContent").show();
            self.renderHistory();
        });*/

        $(self.el).off("click", ".lessMore");
        $(self.el).on("click", ".lessMore", function(e) {
            if(this.text === "More"){
                this.text = "Less";
            } else {
                this.text = "More"
            }
            $("#"+$(this).data("id")).toggle(400);
        });

        $("#detailedUserInfoDialog").modal('show');
    },


    getAndRenderGeneralValues: function () {
        var self = this;
        new UserSecRole({user:self.model.id}).fetch({
            success: function (collection, response) {
                $(self.el).find("#userRoles").empty();
                var roles = collection.get('collection');
                for(var i = 0;i<roles.length;i++) {
                    switch(roles[i].authority){
                        case "ROLE_SUPER_ADMIN" :
                            $(self.el).find("#userRoles").append("<span class='label label-default'>Super Admin</span>");
                            break;
                        case "ROLE_ADMIN" :
                            $(self.el).find("#userRoles").append("<span class='label label-danger'>Admin</span>");
                            break;
                        case "ROLE_USER" :
                            $(self.el).find("#userRoles").append("<span class='label label-success'>User</span>");
                            break;
                        case "ROLE_GUEST" :
                            $(self.el).find("#userRoles").append("<span class='label label-primary'>Guest</span>");
                            break;
                    }
                }
            }
        });
    },
    getValuesActivities: function (creation) {
        var self = this;

        var callback = function(){
            if(self.numberAnnotations == null || self.numberProjects == null || self.numberManagedProjects == null) return;
            creation();
        };

        $.get("/api/user/"+self.model.id+"/userannotation/count.json", function(data) {
            self.numberAnnotations = data.total;
            callback();
        });

        new ProjectCollection({user:self.model.id}).fetch({
            success: function (collection, response) {
                self.numberProjects = $.map(collection.models,function(item){
                    return  {id: item.id, name : item.get('name')}
                });
                callback();
            }
        });
        new ProjectCollection({user:self.model.id, admin:true}).fetch({
            success: function (collection) {
                self.numberManagedProjects = $.map(collection.models,function(item){
                    return  {id: item.id, name : item.get('name')}
                });
                callback();
            }
        });
    },
    renderInfoActivities:function(){
        var self = this;

        // set the number of project than the user can see
        $(self.el).find("#totalProjectAllowed-"+self.model.id).html(self.numberProjects.length);
        var html="";
        $.each(self.numberProjects, function(i,project){
            html += "<li>"+project.name+"</li>";
        });
        $(self.el).find("#projectAllowed-"+self.model.id).append("<ul>"+html+"</ul>")

        $(self.el).find("#totalProjectManaged-"+self.model.id).html(self.numberManagedProjects.length);
        html="";
        $.each(self.numberManagedProjects, function(i,project){
            html += "<li>"+project.name+"</li>";
        });
        $(self.el).find("#projectManaged-"+self.model.id).append("<ul>"+html+"</ul>")

        $(self.el).find("#totalUserAnnotations-"+self.model.id).html(self.numberAnnotations);
    }
    //,
    /*getValuesHistory: function (creation) {
        var self = this;
        $.get("/api/project/"+self.model.get('projectId')+"/connectionHistory/"+self.model.id+".json?limit=50", function(data) {
            self.activitiesHistory = data.collection;
            creation();
        });

    },
    renderHistory:function(){
        var self = this;
        //here create the treeview

        var nodes = [];
        for(var i=0;i<self.activitiesHistory.length;i++){
            var children = [];

            var time = Math.round(self.activitiesHistory[i].time/1000);

            if(time < 60){
                if(time <= 1){
                    time = time+" second";
                } else {
                    time = time+" seconds";
                }
            } else {
                time = Math.round(time/60)
                if(time <= 1){
                    time = time+" minute";
                } else {
                    time = time+" minutes";
                }
            }

            children.push({
                title : "date : "+window.app.convertLongToDate(self.activitiesHistory[i].created),
                isFolder : false,
                noLink : true,
                unselectable : true,
                hideCheckbox: true
            });

            children.push({
                title : "duration : "+time,
                isFolder : false,
                noLink : true,
                unselectable : true,
                hideCheckbox: true
            });

            var children2 = [];
            if(!self.activitiesHistory[i].images){
                self.activitiesHistory[i].images = [];
            }
            for(var j=0;j<self.activitiesHistory[i].images.length;j++){
                children2.push({
                    title : "Image : "+self.activitiesHistory[i].images[j].imageName+" ("+self.activitiesHistory[i].images[j].mode+")",
                    isFolder : false,
                    noLink : true,
                    unselectable : true,
                    hideCheckbox: true
                });
            }

            children.push({
                title : "Consulted images : "+self.activitiesHistory[i].images.length,
                isFolder : self.activitiesHistory[i].images.length>0,
                noLink : true,
                unselectable : true,
                hideCheckbox: true,
                children : children2
            });

            nodes.push({
                title : window.app.convertLongToPrettyDate(self.activitiesHistory[i].created),
                isFolder : true,
                noLink : true,
                unselectable : true,
                hideCheckbox: true,
                children : children
            });
        }

        $(self.el).find("#treehistory").dynatree({
            ajaxDefaults: { // Used by initAjax option
                cache: false // false: Append random '_' argument to the request url to prevent caching.
            },
            children: nodes,//self.activitiesHistory,
            onExpand: function () {
            },
            onClick: function (node, event) {
            },
            onSelect: function (select, node) {
            },
            onActivate: function (node) {
            },
            onDblClick: function (node, event) {
            },
            onRender: function (node, nodeSpan) {
            }
        });
    }*/
});