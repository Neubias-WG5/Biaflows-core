/**
 * Created by laurent
 * Date : 12.03.17.
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

var AddImageSequenceDialog = Backbone.View.extend({
    initialize: function (options) {
        _.bindAll(this, 'render');
    },
    render: function () {
        var self = this;

        require([
                "text!application/templates/dashboard/AddImageSequenceDialog.tpl.html"
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
        $("#addImageSequence").modal('show');
        self.createArray();
    },
    createArray: function () {

        var self = this;
        self.images = [];
        var table = $("#addImageSequenceTable" + self.model.id);
        var columns = [
            { className: 'center', data: "id", targets: [0]},
            { data: "thumb", defaultContent: "", orderable: false, render : function ( data, type, row ) {
                return _.template("<div style='width : 130px;'><a href='#tabs-image-<%= project %>-<%=  id  %>-'><img src='<%= thumb %>?maxSize=128' alt='originalFilename' style='max-height : 45px;max-width : 128px;'/></a></div>",
                    {
                        project : self.model.get("project"),
                        id : row["id"],
                        thumb : row["thumb"]
                    });
            }, targets: [1]},
            { data: "originalFilename", defaultContent: "", searchable: true, targets: [2]},
            { orderable: false, render : function( data, type, row ) {
                self.images.push(row);
                var html =    ' <button class="btn btn-info btn-xs" id="add-button-<%=  id  %>">Add</button>';
                return _.template(html, row);
            }, targets: [3]},
            { searchable: false, targets: "_all" }
        ];
        self.imagesdDataTables = table.DataTable({
            processing: true,
            serverSide: true,

            ajax: {
                url: new ImageInstanceCollection({project: self.model.get("project"), imagegroup: "any"}).url(),
                data: {
                    "datatables": "true"
                }
            },

            drawCallback: function() {

                $("#imageAddSeqResearch" + self.model.id).unbind();

                _.each(self.images, function(aData) {

                    //Tricky part we register a  function call for each printed element
                    $("#imageAddSeqResearch" + self.model.id).click(function () {
                        //This is a copy paste :'(
                        self.model.feed();
                        var imgSeq = new ImageSequenceModel({
                            image: aData.id,
                            slice:0,
                            imageGroup: self.model.id});
                        imgSeq.save({}, {
                            success: function () {

                                $("#add-button-" + aData.id).replaceWith('<label id="labelAddToGroup' + aData.id + '">Added</label>');
                                self.model.forcefeed();
                            }
                        });

                    });


                    $("#add-button-"+aData.id).click(function() {
                        self.model.feed();
                        var imgSeq = new ImageSequenceModel({
                            image: aData.id,
                            slice:0,
                            imageGroup: self.model.id});
                        imgSeq.save({}, {
                            success: function () {

                                $("#add-button-" + aData.id).replaceWith('<label id="labelAddToGroup' + aData.id + '">Added</label>');
                                self.model.forcefeed();
                            }
                        });

                    });



                });
                self.images = [];
            },
            columnDefs : columns
        });
        $('#addImageSequenceTable' + self.idProject).show();
    }
});