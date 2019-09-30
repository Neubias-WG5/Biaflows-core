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

var SoftwareDetailsView = Backbone.View.extend({
    project: null,
    detailsRendered: false,
    initialize: function (options) {
        this.project = options.project;
        this.stats = options.stats;
    },
    render: function () {
        var self = this;
        require([
            "text!application/templates/processing/SoftwareDetails.tpl.html"
        ],
            function (softwareDetailsTpl) {
                self.doLayout(softwareDetailsTpl);
            });
        return this;
    },
    doLayout: function (softwareDetailsTpl) {
        var self = this;
        self.model.set({_created: window.app.convertLongToDate(self.model.get("created"))});
        $(self.el).html(_.template(softwareDetailsTpl, $.extend({}, self.model.toJSON(), self.stats.toJSON())));
        $("#softwareHideDetailsButton").on("click", function (e) {
            $("#softwareDetailsPanel").hide();
            $("#softwareDescription").show();
        });
        $("#softwareShowDetailsButton").on("click", function (e) {
            $("#softwareDetailsPanel").show();
            $("#softwareDescription").hide();
            if (!self.detailsRendered) {
                self.printJobsChart();
                self.printSoftwareParams();
                self.detailsRendered = true;
            }
        });

    },
    printSoftwareParams: function () {
        var self = this;
        var tbody = $('#softwareParamsTable').find("tbody");
        tbody.empty();
        _.each(self.model.get('parameters'), function (param) {
            var tpl = "<tr><td><%= name %></td><td><%= type %></td><td><%= defaultParamValue %></td><td><input type='checkbox' <%= checked %> disabled /></td><td><%= variable %></td></tr>";
            var rowHtml = _.template(tpl, {
                name : param.humanName,
                type : param.type,
                defaultParamValue : param.defaultParamValue,
                checked : (param.required ? "checked" : ""),
                variable : param.name
            });

            tbody.append(rowHtml);
        });


    },
    printJobsChart: function () {
        var self = this;
        var software = self.model;
        $("#softwareInfoChart").html("<svg></svg>");
        var title = 'Job status for ' + self.model.get('name') + ' (over all projects)';
        var chartData = [{
            key : title,
            bar : true,
            values : [
                {
                    label : 'Not Launched',
                    value : software.get('numberOfNotLaunch')
                },
                {
                    label : 'Waiting',
                    value : software.get('numberOfWait')
                },
                {
                    label : 'In Queue',
                    value : software.get('numberOfInQueue')
                },
                {
                    label : 'Running',
                    value : software.get('numberOfRunning')
                },
                {
                    label : 'Success',
                    value : software.get('numberOfSuccess')
                },
                {
                    label : 'Failed',
                    value : software.get('numberOfFailed')
                },
                {
                    label : 'Indeterminate',
                    value : software.get('numberOfIndeterminate')
                },
                {
                    label : 'Killed',
                    value : software.get('numberOfKilled')
                }
            ]
        }];

        if(BrowserSupport.isTooOld()) {
            BrowserSupport.addMessage($("#softwareInfoChart"),BrowserSupport.CHARTS);
        }
        else {
            nv.addGraph(function() {
                var chart = nv.models.discreteBarChart()
                    .x(function(d) { return d.label })
                    .y(function(d) { return d.value })
                    .color(["#777777", "#f0ad4e", "#5bc0de", "#337AB7", "#5cb85c", "#d9534f", "#777777", "#000000"]);


                d3.select("#softwareInfoChart svg")
                    .datum(chartData)
                    .transition().duration(1200)
                    .call(chart);

                nv.utils.windowResize(chart.update);

                return chart;
            });
        }

    }
});