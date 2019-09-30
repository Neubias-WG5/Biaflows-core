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

/**
 * Created by laurent
 * Date : 16.02.17.
 */

var ImageGroupController = Backbone.Router.extend({

    currentlySelected: [],

    routes: {
        "imagegroup/addall": "addall", // #user/list => list()
        "imagegroup/delete-:group": "deleteGroup",
        "imagegroup/convert-:group": "convert",
    },

    addall: function () {


    /*    var ig2 = new ImageGroupModel({name: "stfu", project: window.app.status.currentProject});
        ig2.save();
        */


        var ig = new ImageGroupModel({id:24390});
        var tmp;
        ig.fetch({
            success: function (igm, response) {
                tmp = igm;
            }
        });
        var imageCol = new ImageInstanceCollection({project: window.app.status.currentProject});
        imageCol.fetch({
            success: function (collection, response) {
                new ImageGroupTmpView({
                    model: collection
                }).render();
                var i = 0;
                collection.each(function (image) {
                    var imgSeq = new ImageSequenceModel({
                        image: image.id,
                        channel: i,
                        zStack: 0,
                        slice: 0,
                        time: 0,
                        imageGroup: tmp.id});
                    imgSeq.save();
                    ++i;
                });

            },
            error: function (collection, response) {
                //une erreur s'est produite
            }
        });
    },

    deleteGroup: function (group, callback) {
        new ImageGroupModel({id: group}).destroy({
            success: function(response){
                callback();
            }
        });
    },

    convert: function(group){
        var h5group = new ImageGroupHDF5Model({
            group: group
        });
        h5group.save();
        $("#tabs-images-"+window.app.status.currentProject).find("#con-"+group).html("Conversion is taking place. You will be notified by mail");
    }
});