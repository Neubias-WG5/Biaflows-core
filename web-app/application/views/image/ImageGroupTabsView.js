/**
 * Created by laurent
 * Date : 02.03.17.
 */
/*
 * Copyright (c) 2009-2016. Authors: see NOTICE file.
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

var ImageGroupTabsView = Backbone.View.extend({
    tagName: "div",
    groups: null,
    idProject: null,
    project : null,
    initialize: function (options) {
        this.idProject = options.idProject;
        this.project = options.project;
    },

    refresh: function () {
        this.doLayout();
        return this;
    },

    render : function() {
        var self = this;
        this.doLayout();
        $("#groupAdd"+self.idProject).click(function() {
            new AddImageGroupToProjectDialog({el: "#dialogs", model: self.project, backView: self}).render();
        });
        $("#groupRefresh"+self.idProject).click(function() {
            self.refresh();
        });

        return this;
    },

    doLayout: function () {
        var self = this;

        var actionMenuTpl = "<div class=\"btn-group action<%=  id  %>\">\n" +
        "    <button class=\"btn btn-info btn-xs exploreMultiDimImage\" id=\"exploreButton<%=  id  %>\" data-id='<%=  id  %>'>Explore</button>\n" +
        "    <button class=\"btn btn-info btn-xs dropdown-toggle\" data-toggle=\"dropdown\">\n" +
        "        <span class=\"caret\"></span>\n" +
        "    </button>\n" +
        "    <ul class=\"dropdown-menu\">\n" +
        "        <li><a class=\"exploreMultiDimImage\" href=\"#\" data-id='<%=  id  %>'><i\n" +
        "                class=\"icon-eye-open icon-black\"></i> Explore</a></li>\n" +
        "        <li><a class=\"deleteMultiDimImage\" href=\"#\" data-id='<%=  id  %>'><i class=\"glyphicon glyphicon-trash\"></i> Delete</a></li>\n" +
        "    </ul>\n" +
        "</div>";

        self.groups = [];
        var table = $(this.el).find("#imageGroupProjectTable" + self.idProject);
        var columns = [
            { data: "name", defaultContent: "", searchable: true, orderable: true, render : function( data, type, row ) {
                return data;
            }, targets: [0]},
            { data: "macroURL", defaultContent: "", orderable: false, render: function ( data, type, row ) {
                return _.template("<div style='width : 130px;'><a href='#tabs-imagegroup-<%= project %>-<%=  id  %>'><img src='<%= thumb %>' alt='originalFilename' style='max-height : 45px;max-width : 128px;'/></a></div>",
                    {
                        project : self.idProject,
                        id : row["id"],
                        thumb : row["thumb"]+"?maxWidth=128"
                    });
            }, targets: [1]},
            { data: "channel", defaultContent: "", render : function( data, type, row ) {
                return'<div id="channel-'+row["id"]+'"></div>';
            }, targets: [2]},
            { data: "zstack", defaultContent: "", render : function( data, type, row ) {
                return'<div id="zstack-'+row["id"] + '"></div>';
            }, targets: [3]},
            { data: "slice", defaultContent: "", render : function( data, type, row ) {
                return'<div id="slice-'+row["id"] + '"></div>';
            }, targets: [4]},
            { data: "time", defaultContent: "", render : function( data, type, row ) {
                return'<div id="time-'+row["id"] + '"></div>';
            }, targets: [5]},
            { orderable: false, render : function( data, type, row ) {
                return _.template(actionMenuTpl, row);
            }, targets: [6]},
            { searchable: false, orderable: false, targets: "_all" }
        ];
        self.imagesdDataTables = table.DataTable({
            destroy: true,
            processing: true,
            serverSide: true,
            rowId : "id",
            ajax: {
                url: new ImageGroupCollection({project: this.idProject}).url(),
                data: {
                    "datatables": "true"
                }
            },
            rowCallback: function( row, data, index ) {
                var imageGroup = new ImageGroupModel({});
                imageGroup.set(data);
                var callBack = function (){
                    $(self.el).find("#channel-"+data.id).text(imageGroup.prettyPrint(imageGroup.channel));
                    $(self.el).find("#zstack-"+data.id).text(imageGroup.prettyPrint(imageGroup.zstack));
                    $(self.el).find("#slice-"+data.id).text(imageGroup.prettyPrint(imageGroup.slice));
                    $(self.el).find("#time-"+data.id).text(imageGroup.prettyPrint(imageGroup.time));
                    data.zstack = imageGroup.zstack;
                    self.groups.push(data);
                };

                imageGroup.feed(callBack);
            },
            columnDefs : columns,
            order: [[ 0, "desc" ]]

        });

        $(this.el).on("click", ".exploreMultiDimImage", function(event) {
            //1) get the middle of the image Group zStack
            var data = self.imagesdDataTables.row('#'+$(this).data("id")).data();
            var zStack = data.zstack;
            var zMean = zStack[Math.floor(zStack.length/2)];
            //2) get the t0c0n0zMean ImageSequence
            var imageSeq = new ImageSequenceModel({group: data.id, zstack : zMean, slice : 0, time: 0,channel:0});

            imageSeq.fetch({
                success: function (model) {
                    window.location = '#tabs-image-' + self.idProject + '-' + model.get("image") + '-0';
                }
            });
            event.preventDefault();
        });
        $(this.el).on("click", ".deleteMultiDimImage", function(event) {
            event.preventDefault();
            var data = self.imagesdDataTables.row('#'+$(this).data("id")).data();
            require(["text!application/templates/dashboard/ImageGroupDeleteConfirmDialog.tpl.html"], function (tpl) {
                var dialog = new ConfirmDialogView({
                    el: '#dialogsDeleteImage',
                    template: _.template(tpl, {group: data}),
                    dialogAttr: {
                        dialogID: '#delete-imagegroup-confirm'
                    }
                }).render();
                $("body").on("click", "#closeImageGroupDeleteConfirmDialog", function(event) {
                    event.preventDefault();
                    dialog.close();
                    window.app.view.message("ImageGroup", "Please wait", "info", 5000);
                    new ImageGroupModel({id: data.id}).destroy({
                        success: function(response){
                            window.app.view.message("ImageGroup", response.message, "success");
                            self.refresh();
                        },
                        error: function(response){
                            var json = $.parseJSON(response.responseText);
                            window.app.view.message("Image", json.errors, "error");
                            self.refresh();
                        }
                    });
                });
            });
        });

    }


});
