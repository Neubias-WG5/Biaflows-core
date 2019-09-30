/**
 * Created by laurent
 * Date : 09.03.17.
 */

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


var AddImageGroupToProjectDialog = Backbone.View.extend({

    backView: null,

    initialize: function (options) {
        _.bindAll(this, 'render');
        this.backView = options.backView;
    },
    render: function () {
        var self = this;
        require([
                "text!application/templates/dashboard/AddImageGroupToProjectDialog.tpl.html"
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
        $("#addImageGroupToProjectProject").modal('show');
        $("#add-image-group-sub").click(function (event) {
            $("#add-image-group").submit();
            return false;
        });
        $("#add-image-group").submit(function () {
            self.createImageGroup();
            $("#addImageGroupToProjectProject").modal('hide');

            return false;
        });
    },


    createImageGroup: function () {
        console.log("create Image group");
        var self = this;

        var gname = $("#group-name").val().toUpperCase();
        var addall = $("input#add-all").is(':checked');

        var ig = new ImageGroupModel({name: gname, project: window.app.status.currentProject});
        ig.save({}, {
            success: function (model, response) {
                var igId = model.get("imagegroup").id;
                if(addall){
                    var imageCol = new ImageInstanceCollection({project: window.app.status.currentProject});
                    imageCol.fetch({
                        success: function (collection, response) {
                            collection.each(function (image) {
                                var imgSeq = new ImageSequenceModel({
                                    image: image.id,
                                    slice: 0,
                                    imageGroup: igId});
                                imgSeq.save();
                            });
                            self.backView.refresh();

                            this.close();

                        },
                        error: function (collection, response) {
                        }
                    });
                }

            },
            error: function (response) {
                console.log("error");
            }
        });
    }
});