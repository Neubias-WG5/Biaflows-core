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

var ProjectInfoDialog = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'render');
    },
    render: function () {
        var self = this;
        require([
                "text!application/templates/project/ProjectInfoDialog.tpl.html"
            ],
            function (tpl) {
                self.doLayout(tpl);
            });
        return this;
    },
    doLayout: function (tpl) {
        var htmlCode = _.template(tpl, this.model.toJSON());
        $(this.el).html(htmlCode);

        var expectedCallback = 5;
        var dataLoadedCallback = 0;
        var dataLoaded = function (dataLoadedCallback) {
            if (dataLoadedCallback === expectedCallback) {
                $("#infoProject").modal("show");
            }
        };


        var project = this.model;

        new UserCollection({project: project.id, creator: true}).fetch({
            success: function (creator) {
                $("#userInfoBigPanel-" + project.id).find("#projectCreator").empty();
                var list = [];
                creator.each(function (user) {
                    list.push(user.prettyName());
                });
                $("#userInfoBigPanel-" + project.id).find("#projectCreator").append(list.join(", "));
                dataLoaded(++dataLoadedCallback);
            }});

        new UserCollection({project: project.id, admin: true}).fetch({
            success: function (admin) {
                $("#userInfoBigPanel-" + project.id).find("#projectAdmins").empty();
                var list = [];
                admin.each(function (user) {
                    list.push(user.prettyName());
                });
                $("#userInfoBigPanel-" + project.id).find("#projectAdmins").append(list.join(", "));
                dataLoaded(++dataLoadedCallback);
            }});
        new UserCollection({project: project.id}).fetch({
            success: function (users) {
                $("#userInfoBigPanel-" + project.id).find("#projectUsers").empty();
                var list = [];

                if(users.length <= 10) {
                    users.each(function (user) {
                        list.push(user.prettyName());
                    });
                    $("#userInfoBigPanel-" + project.id).find("#projectUsers").append(list.join(", "));
                } else {
                    $("#userInfoBigPanel-" + project.id).find("#projectUsers").append("<p><br/>Sorry, we can't display all of the "+users.length+" users but you will find the entire list here :</p>");
                    $("#userInfoBigPanel-" + project.id).find("#projectUsers").append("<select id='usersSelectBox-"+project.id+"' class='input-xlarge focused'><option></option></select>");

                    users.each(function (user) {
                        $("#usersSelectBox-" + project.id).append('<option value="'+ user.id +'">' + user.prettyName() + '</option>');
                    });

                    $("#userInfoBigPanel-" + project.id).find("#projectUsers").append("<p>You can also download this list in <a href='#' id='userListCSV-"+project.id+"'>CSV</a> or <a href='#' id='userListPDF-"+project.id+"'>PDF</a>.</p>");

                    $("#userListCSV-"+project.id).click(function(e) {
                        window.open("/api/project/"+project.id+"/user/download?format=csv");
                        e.preventDefault();
                    });
                    $("#userListPDF-"+project.id).click(function(e) {
                        window.open("/api/project/"+project.id+"/user/download?format=pdf", '_blank');
                        e.preventDefault();
                    });
                }
                dataLoaded(++dataLoadedCallback);
            }});
        new UserCollection({project: project.id, online: true}).fetch({
            success: function (users) {
                $("#userInfoBigPanel-" + project.id).find("#projectUsersOnline").empty();
                var list = [];
                users.each(function (user) {
                    list.push('<span style="color:green;font-style: bold;">' + user.prettyName() + '</span>');
                });
                $("#userInfoBigPanel-" + project.id).find("#projectUsersOnline").append(list.join(", "));
                dataLoaded(++dataLoadedCallback);
            }});

        new UserCollection({project: project.id, representative:true}).fetch({
            success: function (representatives) {
                $("#userInfoBigPanel-" + project.id).find("#projectUsersRepresentative").empty();
                var list = [];
                if(representatives.length === 0){
                    $("#userInfoBigPanel-" + project.id).find("#projectUsersRepresentative").append("No contact");
                } else {
                    representatives.each(function (representative) {
                        list.push(representative.prettyName() + ": "+representative.get('email'));
                    });
                    $("#userInfoBigPanel-" + project.id).find("#projectUsersRepresentative").append(list.join("<br/> "));
                }
                dataLoaded(++dataLoadedCallback);
            }
        });



        new ImageInstanceCollection({project: project.id, max: 3, noLabel:true}).fetch({
            success: function (collection) {
                if (collection.length != 0) {
                    collection.each(function (image) {
                        var imgLinkTpl = '<div style="display : inline;margin: 10px;"><a id="viewImg-<%= id %>" href="#tabs-image-<%= project %>-<%= id %>-"><img class="lazy img-thumbnail" alt="<%= filename %>" src="<%= thumb %>" style="height:200px;" /></a></div>';
                        $("#imageInfoBigPanel-" + project.id).find(".row").append(_.template(imgLinkTpl, image.toJSON()));
                    });
                } else {
                    $("#imageInfoBigPanel-" + project.id).find(".row").append("<div class='alert alert-block'>No data to display</div>");
                }

            }});
    }
});