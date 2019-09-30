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

var ImagePropertiesView = Backbone.View.extend({
    tagName: "div",

    initialize: function (options) {
    },
    doLayout: function (tpl) {
        var self = this;
        this.dialog = new ConfirmDialogView({
            el: '#dialogs',
            template: _.template(tpl, this.model.toJSON()),
            dialogAttr: {
                dialogID: "#image-properties"
            }
        }).render();
        $("#closeImagePropertiesDialog").click(function (event) {
            event.preventDefault();
            self.dialog.close();
            return false;
        });

        return this;
    },
    render: function () {
        var self = this;
        require(["text!application/templates/image/ImageProperties.tpl.html"], function (tpl) {
            self.doLayout(tpl);
            self.printProperties();
        });
        return this;
    },
    printProperties: function () {
        var self = this;

        require(["text!application/templates/image/ImageProperty.tpl.html"], function (tpl) {
            var target = $("#image-properties-content");
            target.empty();
            self.model.fetch({
                success: function (model, response) {
                    target.append(_.template(tpl, {key: "original name", value: self.model.get('originalFilename')}));

                    $.get("/api/abstractimage/"+self.model.get("baseImage")+"/user.$format", function(data) {
                        target.append(_.template(tpl, {key: "original uploader", value: data.username+" ("+data.firstname+" "+data.lastname+")"}));
                        new ImagePropertyCollection({image: self.model.get("baseImage")}).fetch({
                            success: function (collection, response) {
                                collection.sort();
                                collection.each(function (model) {
                                    target.append(_.template(tpl, {key: model.get("key"), value: model.get("value")}));
                                });
                            }
                        });
                    });
                }
            });
        });
    }
});