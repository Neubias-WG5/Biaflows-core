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

var DownloadFiles = Backbone.View.extend({
    project: null,
    terms: null,
    jobs: null,
    software: null,
    initialize: function (options) {
        this.terms = window.app.status.currentTermsCollection;
        this.project = options.project;
        this.jobs = options.jobs;
        this.software = options.software;
    },
    render: function () {
        var self = this;
        require([
            "text!application/templates/processing/DownloadFiles.tpl.html"
        ],
            function (tpl) {
                self.doLayout(tpl)
            });
        return this;
    },
    doLayout: function (tpl) {
        var self = this;
        var content = _.template(tpl, {});
        $(this.el).append(content);


        var refresh = function () {
            new JobDataCollection({ job: self.model.id}).fetch({
                success: function (collection, response) {
                    $("#jobDataResult").find('tbody').empty();
                    collection.each(function (data) {
                        console.log("data=" + data + " " + collection.length);
                        $("#jobDataResult").find('tbody').append('<tr id="' + data.id + '"></tr>');
                        var row = $("#jobDataResult").find('tbody').find("tr#" + data.id);
                        row.append('<td>' + data.get("filename") + '</td>');
                        row.append('<td>' + data.get("key") + '</td>');
                        row.append('<td>' + self.convertSize(data.get("size")) + '</td>');
                        row.append('<td><a href="/api/jobdata/' + data.id + '/view" class="label label-info">' + data.get("filename") + '</a></td>');
                        row.append('<td><a href="/api/jobdata/' + data.id + '/download" class="label label-info">' + data.get("filename") + '</a></td>');
                    });

                }
            });
        };
        refresh();
        var interval = window.app.view.addInterval(refresh, 5000);
        $(window).bind('hashchange', function () {
            clearInterval(interval.loop);
        });


    },
    convertSize: function (bytes) {
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes == 0) {
            return 'n/a';
        }
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }
});