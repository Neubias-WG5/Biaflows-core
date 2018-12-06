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

var AddImageToProjectDialog = Backbone.View.extend({
    initialize: function (options) {
        _.bindAll(this, 'render');
    },
    render: function () {
        var self = this;
        require([
            "text!application/templates/dashboard/AddImageToProjectDialog.tpl.html"
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
        $("#addImageToProjectProject").modal('show');
        self.createArray();
    },
    createArray: function () {
        var self = this;
        self.images = [];
        var table = $("#addImageToProjectTable" + self.model.id);
        var columns = [
            { className: 'center', data: "id", targets: [0]},
            { defaultContent: "No preview available", orderable: false, render : function ( data, type, row ) {
                return _.template("<div style='width : 130px;'><a href='#tabs-image-<%= project %>-<%=  id  %>-'><img src='<%= thumb %>?maxSize=128' alt='originalFilename' style='max-height : 45px;max-width : 128px;'/></a></div>",
                    {
                        project : self.model.id,
                        id : row["id"],
                        thumb : row["thumb"]
                    });
            }, targets: [1]},
            { data: "originalFilename", defaultContent: "", searchable: true, targets: [2]},
            { data: "created", render : function ( data ) {
                return window.app.convertLongToDate(data);
            }, targets: [3]},
            { orderable: false, render : function( data, type, row ) {
                self.images.push(row);
                if(row["inProject"]) {
                    return '<label id="labelAddToProject'+row["id"]+'">Already in project</label>';
                } else {
                    return '<button id="btnAddToProject'+row["id"]+'" type="button" class="btn btn-success btn-xs"><span class="glyphicon glyphicon-plus"></span> Add</button>';
                }
            }, targets: [4]},
            { searchable: false, targets: "_all" }
        ];
        $('#addImageToProjectTable' + self.idProject).show();
        self.imagesdDataTables = table.DataTable({
            processing: true,
            serverSide: true,
            ajax: {
                url: new ImageCollection({project: self.model.id}).url(),
                data: {
                    "datatables": "true"
                }
            },
            autoWidth: false,
            drawCallback: function() {

                _.each(self.images, function(aData) {
                    var idProject = self.model.id;
                    var idImage = aData["id"];

                    $("#btnAddToProject"+idImage).click(function() {
                        new ImageInstanceModel({}).save({project: idProject, user: null, baseImage: idImage}, {
                            success: function (image, response) {
                                $("#btnAddToProject"+idImage).replaceWith('<label id="labelAddToProject'+idImage+'">Already in project</label>');
                                window.app.view.message("Image", response.message, "success");
                            },
                            error: function (model, response) {
                                var json = $.parseJSON(response.responseText);
                                window.app.view.message("Image", json.errors.message, "error");
                            }
                        });
                    });
                });
                self.images = [];
            },
            columnDefs : columns
        });
    }
});