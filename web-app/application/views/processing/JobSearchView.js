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

//TODO
//not used anymore
var JobSearchView = Backbone.View.extend({
    width: null,
    software: null,
    project: null,
    parent: null,
    initialize: function (options) {
        this.software = options.software;
        this.project = options.project;
        this.parent = options.parent;
        this.idJob = options.idJob;
    },
    render: function () {
        var self = this;
        require([
            "text!application/templates/processing/JobSearch.tpl.html"
        ],
            function (jobSearchViewTpl) {
                self.loadResult(jobSearchViewTpl);
            });
        return this;
    },
    loadResult: function (jobSearchViewTpl) {
        console.log("JobSearchView.loadResult");
        var self = this;
        var content = _.template(jobSearchViewTpl, {});
        $(self.el).empty();
        $(self.el).append(content);

        self.printJobListingPanel();
    },
    printBasicSearchPanel: function () {

    },
    printAdvancedSearchPanel: function () {

    },
    printFilterPanel: function () {

    },
    printJobListingPanel: function () {
        console.log("JobSearchView.printJobListingPanel");
        var self = this;

        if (window.app.models.projects == undefined || (window.app.models.projects.length > 0 && window.app.models.projects.at(0).id == undefined)) {
            window.app.models.projects = new ProjectCollection();
            window.app.models.projects.fetch({
                success: function (collection, response) {
                    self.openJobListing();
                }
            });
        } else {
            self.openJobListing();
        }
    },
    openJobListing: function () {
        var self = this;
        new JobCollection({ project: self.project.id, software: self.software.id}).fetch({
            success: function (collection, response) {
                var listing = new JobTableView({
                    width: self.software,
                    project: self.project,
                    software: self.software,
                    el: $("#jobTablesList"),
                    parent: self,
                    jobs: collection

                }).render();
                console.log("listing1:" + listing);
                new JobSearchEngineView({
                    width: self.software,
                    project: self.project,
                    software: self.software,
                    idJob: self.idJob,
                    el: $("#jobFilterList"),
                    parent: self,
                    listing: listing,
                    allJobs: collection
                }).render();

            }
        });
    },
    refreshSearch: function () {

    }

});