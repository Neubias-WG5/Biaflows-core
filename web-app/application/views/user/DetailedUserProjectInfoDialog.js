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

var DetailedUserProjectInfoDialog = Backbone.View.extend({
    activitiesHistory : [],
    numberAnnotations : null,
    lastConnexionDate : null,
    numberConnexions : null,

    initialize: function () {
        _.bindAll(this, 'render');
    },
    render: function () {
        var self = this;
        require([
                "text!application/templates/user/DetailedUserProjectInfoDialog.tpl.html"
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

        self.getValuesActivities(function() {

            $(self.el).find("#UserActivitiesInfo-"+self.model.id).find(".detailedUserInfoWaitingDiv").hide();
            $(self.el).find("#UserActivitiesInfo-"+self.model.id).find(".detailedUserInfoContent").show();
            self.renderInfoActivities();
        });

        self.getValuesHistory(function() {

            $(self.el).find("#UserActivitiesHistory-"+self.model.id).find(".detailedUserInfoWaitingDiv").hide();
            $(self.el).find("#UserActivitiesHistory-"+self.model.id).find(".detailedUserInfoContent").show();
            self.renderHistory();
        });

        $("#detailedProjectUserInfoDialog").modal('show');
    },

    getValuesActivities: function (creation) {
        var self = this;

        var callback = function(){
            if(self.numberAnnotations == null || self.lastConnexionDate == null || self.numberConnexions == null) return;
            creation();
        };

        $.get("/api/user/"+self.model.id+"/userannotation/count.json?project="+self.model.get('projectId'), function(data) {
            self.numberAnnotations = data.total;
            callback();
        });

        $.get("/api/project/"+self.model.get('projectId')+"/lastconnections.json", function(data) {
            self.lastConnexionDate = data.collection[0].created;
            callback();
        });

        $.get("/api/project/"+self.model.get('projectId')+"/connectionFrequency/"+self.model.id+".json", function(data) {
            self.numberConnexions = data.collection[0].frequency;
            callback();
        });
        // TODO # consulted images

    },
    renderInfoActivities:function(){
        var self = this;

        $(self.el).find("#totalProjectConnexions-"+self.model.id).html(self.numberConnexions);

        //$(self.el).find("#totalConsultedImages"+self.model.id).html(self.);

        $(self.el).find("#totalUserAnnotations-"+self.model.id).html(self.numberAnnotations);

        var prettyDate = "<span title='"+window.app.convertLongToDate(self.lastConnexionDate)+"'> "+window.app.convertLongToPrettyDate(self.lastConnexionDate)+"</span>"
        $(self.el).find("#lastProjectConnexion-"+self.model.id).html(prettyDate);


    },
    getValuesHistory: function (creation) {
        var self = this;
        $.get("/api/project/"+self.model.get('projectId')+"/connectionHistory/"+self.model.id+".json?limit=50", function(data) {
            self.activitiesHistory = data.collection;
            creation();
        });

    },
    renderHistory:function(){
        var self = this;

        if(self.activitiesHistory.length === 0){
            $("#treehistory").html("No records");
            return;
        }

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
                time = Math.round(time/60);
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
                    title : "Image : "+self.activitiesHistory[i].images[j].imageName+" ("+self.activitiesHistory[i].images[j].mode+")"/*+" ("+self.activitiesHistory[i].images[j].created+")"*/,
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
            children: nodes/*,
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
            }*/
        });
    }
});