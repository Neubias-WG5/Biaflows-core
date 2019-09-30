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

var AdminDashboard = Backbone.View.extend({
    totals : null,
    currents : null,
    rendered: false,
    render: function () {
        var self = this;

        if (!this.rendered) {
            require(["text!application/templates/admin/AdminDashboard.tpl.html"],
                function (tpl) {
                    self.getValues(function() {
                        self.doLayout(tpl);
                        self.rendered = true;
                    });
                }
            );
        }
    },
    refreshCurrentConnections: function (){
        var self = this;
        $.get( "api/stats/currentStats.json", function( data ) {
            self.currents = data;
            $(self.el).find("#statsTotalOnlineUsers").text(self.currents.users);
            $(self.el).find("#statsTotalActiveProjects").text(self.currents.projects);
            var mostActiveProject = "No record";
            if(self.currents.mostActiveProject) {
                mostActiveProject = self.currents.mostActiveProject.project.name+" ("+self.currents.mostActiveProject.users+" users online)";
            }
            $(self.el).find("#statsMostActiveProject").text(mostActiveProject);
        });
        $.get( "api/stats/imageserver/total.json", function( data ) {
            var percent = data.usedP * 100;
            percent = percent.toPrecision(2);
            $(self.el).find("#statUsedStorage").text(percent+"%");
            if(percent >= 95){
                $(self.el).find("#statUsedStorage").css("color", "red");
                $(self.el).find("#statUsedStorage").css("font-weight", "bold");
            } else if(percent >= 80){
                $(self.el).find("#statUsedStorage").css("color", "orange");
            }
        }).fail(function(){
            $(self.el).find("#statUsedStorage").text("Unknown");
            $(self.el).find("#statUsedStorage").css("color", "red");
            $(self.el).find("#statUsedStorage").css("font-weight", "bold");
        });
    },

    doLayout: function(tpl) {
        var self = this;

        var modelView = self.totals;
        modelView.instance = window.location.host;

        var view = _.template(tpl, modelView);
        $(this.el).append(view);

        new LastConnexionsGraphsView({
            el: $(self.el).find("#lastConnectionsGraph"),
            title : "Last Connections"
        }).render();
        new AverageConnexionsGraphsView({
            el: $(self.el).find("#avgConnectionsGraph"),
            title : "Average Connections"
        }).render();
        /*new LastAnnotationsGraphsView({
            el: $(self.el).find("#lastAnnotationsGraph")}).render();*/

        self.refreshCurrentConnections();
        this.refreshCurrentStatsInterval = window.app.view.addInterval(function () {
            self.refreshCurrentConnections();
        }, 30*1000);
        //window.app.view.intervals.push(this.refreshCurrentStatsInterval);

        return this;
    },

    getValues: function (callback) {
        var self = this;

        self.totals = null;
        self.currents = null;

        var loadedCallBack = function() {
            if (self.totals === null) {
                return;
            }
            callback();
        };
        $.get( "api/stats/all.json", function( data ) {
            self.totals = data;
            loadedCallBack();
        });
    }
});

var LastAnnotationsGraphsView = Backbone.View.extend({
    graphs : []
    //TODO mongodb entry for each created annotation
});

