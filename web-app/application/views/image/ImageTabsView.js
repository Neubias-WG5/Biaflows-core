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

var ImageTabsView = Backbone.View.extend({
    tagName: "div",
    images: null, //array of images that are printed
    idProject: null,
    searchPanel: null,
    project : null,
    initialize: function (options) {
        this.idProject = options.idProject;
        this.project = options.project;
    },

    refresh: function () {
        this.afterDeleteImageEvent();
    },
    afterDeleteImageEvent: function () {
        var table = $(this.el).find("#imageProjectTable" + this.idProject);
        this.update()
    },
    render : function() {
        var self = this;
        require(["text!application/templates/image/ImageReviewAction.tpl.html"], function (actionMenuTpl) {
            self.doLayout(actionMenuTpl);
            if(window.app.status.user.model.get('guest')){
                $("#imageAdd"+self.idProject).hide()
            } else {
                $("#imageAdd"+self.idProject).click(function() {
                    new AddImageToProjectDialog({el: "#dialogs", model: self.project}).render();
                });
            }
            $("#imageRefresh"+self.idProject).click(function() {
                self.refresh();
            });

        });

                return this;
    },
    update : function() {
        var self = this;
        require(["text!application/templates/image/ImageReviewAction.tpl.html"], function (actionMenuTpl) {
            self.doLayout(actionMenuTpl);
        });
        return this;
    },
    doLayout: function (actionMenuTpl) {
        var self = this;
        self.images = [];
        var isAdmin = window.app.status.currentProjectModel.isAdmin(window.app.models.projectAdmin);
        var table = $(this.el).find("#imageProjectTable" + self.idProject);
        var body = $(this.el).find("#imageProjectArray" + self.idProject);
        var columns = [
            { className: "center", data: "id", targets: [0]},
            { data: "macroURL", defaultContent: "", orderable: false, render: function ( data, type, row ) {
                return _.template("<div style='width : 130px;'><a href='#tabs-image-<%= project %>-<%=  id  %>-0'><img src='<%= thumb %>' alt='originalFilename' style='max-height : 45px;max-width : 128px;'/></a></div>",
                    {
                        project : self.idProject,
                        id : row["id"],
                        thumb : row["macroURL"]+"?maxWidth=128"
                    });
            }, targets: [1]},
            { data: "originalFilename", searchable: true, defaultContent: "", render : function ( data, type, row ) {
                var imageInstanceModel = new ImageInstanceModel({});
                imageInstanceModel.set(row);
                var names = imageInstanceModel.getVisibleName(window.app.status.currentProjectModel.get('blindMode'),isAdmin);
                if(isAdmin) {
                    if(window.app.status.currentProjectModel.get('blindMode')) {
                        return names[1]+"<br/><i>"+names[0]+"</i>";
                    } else {
                        return names[0];
                    }
                }
                return names;
            }, targets: [2]},
            { data: "width", defaultContent: "", targets: [3] },
            { data: "height", defaultContent: "", targets: [4] },
            { data: "magnification", defaultContent: "", render : function( data, type ) {
                if(type === "display"){
                    if (data) {
                        return data + " X";
                    } else {
                        return '<span class="label label-default">Undefined</span>'
                    }
                } else if(type === "sort"){
                    return window.app.isUndefined(data) ? 0 : data;
                }
            }, targets: [5]},
            { data: "resolution", defaultContent: "", render : function( data, type ) {
                if(type === "display"){
                    if (data) {
                        try {
                            return data.toFixed(3);
                        }catch(e) {return "";}
                    } else {
                        return '<span class="label label-default">Undefined</span>'
                    }
                } else if(type === "sort"){
                    return window.app.isUndefined(data) ? 0 : data;
                }
            }, targets: [6]},
            { data: "numberOfAnnotations", targets: [7] },
            { data: "numberOfJobAnnotations", targets: [8] },
            { data: "numberOfReviewedAnnotations", targets: [9] },
            { data: "mime", defaultContent: "", orderable: false, render : function( data, type, row ) {
                var mimeType = row["mime"];
                if (mimeType == "openslide/ndpi" || mimeType == "openslide/vms") {
                    return '<img src="images/brands/hamamatsu.png" alt="hamamatsu photonics" style="max-width : 100px;max-height : 40px;" >';
                } else if (mimeType == "openslide/mrxs") {
                    return '<img src="images/brands/3dh.png" alt="hamamatsu photonics" style="max-width : 100px;max-height : 40px;" >';
                } else if (mimeType == "openslide/svs") {
                    return '<img src="images/brands/aperio.png" alt="hamamatsu photonics" style="max-width : 100px;max-height : 40px;" >';
                } else if (mimeType == "openslide/scn") {
                    return '<img src="images/brands/leica.png" alt="hamamatsu photonics" style="max-width : 100px;max-height : 40px;" >';
                } else if (mimeType == "openslide/ventana" || mimeType == "openslide/bif") {
                    return '<img src="images/brands/roche.png" alt="hamamatsu photonics" style="max-width : 100px;max-height : 40px;" >';
                } else if (mimeType == "philips/tif") {
                    return '<img src="images/brands/philips.png" alt="philips" style="max-width : 100px;max-height : 40px;" >';
                }
                else return '<span class="label label-default">Undefined</span>';
            }, targets: [10] },
            { data: "created", defaultContent: "", render : function ( data, type ) {
                if(type === "display"){
                    return window.app.convertLongToDate(data);
                }
                return data;
            }, targets: [11]} ,
            { orderable: false, render : function ( data, type, row ) {
                if (row["reviewStart"] && row["reviewStop"]) {
                    return '<span class="label label-success">Reviewed</span>';
                } else if (row["reviewStart"]) {
                    return '<span class="label label-warning">In review</span>';
                } else {
                    return '<span class="label label-info">None</span>';
                }
            }, targets: [12]},
            { orderable: false, render : function( data, type, row ) {
                self.images.push(row);
                row["project"]  = self.idProject;
                return _.template(actionMenuTpl, row);

            }, targets: [13]},
            { searchable: false, targets: "_all" }
        ];
        self.imagesdDataTables = table.DataTable({
            destroy: true,
            processing: true,
            serverSide: true,
            ajax: {
                url: new ImageInstanceCollection({project: this.idProject}).url(),
                data: {
                    "datatables": "true"
                }
            },
            drawCallback: function() {
                _.each(self.images, function(aData) {
                    var model = new ImageInstanceModel(aData);
                    var action = new ImageReviewAction({el:body,model:model, container : self});
                    action.configureAction();
                });

                $(".dropdown-menu").css("left", "-140px");

                self.images = [];
            },
            columnDefs : columns,
            order: [[ 0, "desc" ]]
        });
    }
});
