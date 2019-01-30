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

/**
 * Created by hoyoux on 09.02.15.
 */
var ProjectCommandsView = Backbone.View.extend({

    tagName: 'ul',
    className: 'nav',
    initialize: function (options) {
        if(options != undefined) {
            // Since 1.1.0, Backbone Views no longer automatically attach options passed to the constructor as this.options
            this.options = options;
            this.idProject = options.idProject;
            this.collection = options.collection;
            this.splitByDay = options.splitByDay;
            this.displayAll = options.displayAll;
        }
    },
    render: function () {
        var self = this;
        require([
                "text!application/templates/command/CommandAnnotation.tpl.html",
                "text!application/templates/command/CommandGeneric.tpl.html",
                "text!application/templates/command/CommandImageInstance.tpl.html"],
            function (commandAnnotationTpl, commandGenericTpl, commandImageInstanceTpl) {

                var dateCreated = new Date();
                self.collection.each(function(command){

                    var commandView = new ProjectCommandView({ idProject: self.idProject, command: command, displayAll: self.displayAll });
                    var result = commandView.render(commandAnnotationTpl, commandGenericTpl, commandImageInstanceTpl);
                    if(result != null){

                        if(self.splitByDay) {
                            dateCreated.setTime(command.get('created'));
                            var shortDate = dateCreated.toLocaleDateString();
                            if(self.startDate!=shortDate) {
                                self.startDate=shortDate;
                                self.$el.append('<li class="nav-header">'+shortDate+'</li>');
                            }
                        }

                        self.$el.append(result.el);
                    }
                });
            }
        );
        return this;
    }
});

var ProjectCommandView = Backbone.View.extend({

    tagName: 'li',
    initialize: function (options) {
        if(options != undefined) {
            // Since 1.1.0, Backbone Views no longer automatically attach options passed to the constructor as this.options
            this.options = options;
            this.command= options.command;
            this.idProject= options.idProject;
            this.displayAll = options.displayAll;
        }
    },
    render: function (commandAnnotationTpl, commandGenericTpl, commandImageInstanceTpl) {
        var self = this;
        this.el = this.decodeCommandAction(this.command, commandAnnotationTpl, commandGenericTpl, commandImageInstanceTpl);
        if(this.el == "undefined") {
            return null;
        }
        return this; // returning this for chaining..
    },
    decodeCommandAction : function(commandHistory,commandAnnotationTpl, commandGenericTpl, commandImageInstanceTpl) {
        var self = this;
        var jsonCommand = $.parseJSON(commandHistory.get("data"));
        var dateCreated = new Date();
        dateCreated.setTime(commandHistory.get('created'));
        var dateStr = dateCreated.toLocaleDateString() + " " + dateCreated.toLocaleTimeString();


        if (commandHistory.get('className') == "be.cytomine.command.AddCommand") {
            if (commandHistory.get('serviceName') == "userAnnotationService") {
                var cropStyle = "block";
                var cropURL = "api" + jsonCommand.smallCropURL.split("/api")[1];
                return _.template(commandAnnotationTpl,
                    {   idProject: self.idProject,
                        idAnnotation: jsonCommand.id,
                        idImage: jsonCommand.image,
                        imageFilename: jsonCommand.imageFilename,
                        icon: "add.png",
                        text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'),
                        datestr: dateStr,
                        cropURL: cropURL,
                        cropStyle: cropStyle
                    });
            }
            else if (commandHistory.get('serviceName') == "reviewedAnnotationService") {
                var cropStyle = "block";
                var cropURL = "api" + jsonCommand.smallCropURL.split("/api")[1];
                return _.template(commandAnnotationTpl,
                    {   idProject: self.idProject,
                        idAnnotation: jsonCommand.id,
                        idImage: jsonCommand.image,
                        imageFilename: jsonCommand.imageFilename,
                        icon: "add.png",
                        text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'),
                        datestr: dateStr,
                        cropURL: cropURL,
                        cropStyle: cropStyle
                    });
            }
            else if (commandHistory.get('serviceName') == "algoAnnotationService") {
                var cropStyle = "block";
                var cropURL = "api" + jsonCommand.smallCropURL.split("/api")[1];
                return _.template(commandAnnotationTpl,
                    {   idProject: self.idProject,
                        idAnnotation: jsonCommand.id,
                        idImage: jsonCommand.image,
                        imageFilename: jsonCommand.imageFilename,
                        icon: "add.png",
                        text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'),
                        datestr: dateStr,
                        cropURL: cropURL,
                        cropStyle: cropStyle
                    });
            }
            else if (commandHistory.get('serviceName') == "annotationTermService") {
                return _.template(commandGenericTpl, {icon: "ui-icon-plus", text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'), datestr: dateStr, image: ""});
            }
            else if (commandHistory.get('serviceName') == "imageInstanceService") {
                var cropStyle = "block";
                var cropURL = "api" + jsonCommand.thumb.split("/api")[1];
                return _.template(commandImageInstanceTpl, {idProject: self.idProject, idImage: jsonCommand.id, imageFilename: jsonCommand.filename, icon: "add.png", text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'), datestr: dateStr, cropURL: cropURL, cropStyle: cropStyle});
            }
            else if (commandHistory.get('serviceName') == "jobService") {
                return _.template(commandGenericTpl, {icon: "ui-icon-plus", text: commandHistory.get('action'), datestr: dateStr, image: ""});
            }
        }

        else if (commandHistory.get('className') == "be.cytomine.command.EditCommand") {

            if (commandHistory.get('serviceName') == "userAnnotationService") {
                var cropStyle = "";
                var cropURL = "api" + jsonCommand.newUserAnnotation.smallCropURL.split("/api")[1];
                return _.template(commandAnnotationTpl, {idProject: self.idProject, idAnnotation: jsonCommand.newUserAnnotation.id, idImage: jsonCommand.newUserAnnotation.image, imageFilename: jsonCommand.newUserAnnotation.imageFilename, icon: "delete.gif", text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'), datestr: dateStr, cropURL: cropURL, cropStyle: cropStyle});
            }
            else if (commandHistory.get('serviceName') == "reviewedAnnotationService") {
                var cropStyle = "";
                var cropURL = "api" + jsonCommand.newReviewedAnnotation.smallCropURL.split("/api")[1];
                return _.template(commandAnnotationTpl, {idProject: self.idProject, idAnnotation: jsonCommand.newReviewedAnnotation.id, idImage: jsonCommand.newReviewedAnnotation.image, imageFilename: jsonCommand.newReviewedAnnotation.imageFilename, icon: "delete.gif", text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'), datestr: dateStr, cropURL: cropURL, cropStyle: cropStyle});
            }
            else if (commandHistory.get('serviceName') == "algoAnnotationService") {
                var cropStyle = "";
                var cropURL = "api" + jsonCommand.newAnnotation.smallCropURL.split("/api")[1];
                return _.template(commandAnnotationTpl, {idProject: self.idProject, idAnnotation: jsonCommand.newAnnotation.id, idImage: jsonCommand.newAnnotation.image, imageFilename: jsonCommand.newAnnotation.imageFilename, icon: "delete.gif", text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'), datestr: dateStr, cropURL: cropURL, cropStyle: cropStyle});
            }
            else if (commandHistory.get('serviceName') == "annotationTermService") {
                return _.template(commandGenericTpl, {icon: "ui-icon-pencil", text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'), datestr: dateStr, image: ""});
            }
            else if (commandHistory.get('serviceName') == "imageInstanceService") {
                if (jsonCommand.newImageInstance.deleted != null && jsonCommand.previousImageInstance.deleted == null) {
                    commandHistory.set('action', commandHistory.get('action') + " (deletion)");
                }
            }
        }

        else if (commandHistory.get('className') == "be.cytomine.command.DeleteCommand") {
            if (commandHistory.get('serviceName') == "userAnnotationService") {
                var cropStyle = "";
                var cropURL = "api" + jsonCommand.smallCropURL.split("/api")[1];
                return _.template(commandAnnotationTpl, {idProject: self.idProject, idAnnotation: jsonCommand.id, idImage: jsonCommand.image, imageFilename: jsonCommand.imageFilename, icon: "delete.gif", text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'), datestr: dateStr, cropURL: cropURL, cropStyle: cropStyle});

            }
            else if (commandHistory.get('serviceName') == "reviewedAnnotationService") {
                var cropStyle = "";
                var cropURL = "api" + jsonCommand.smallCropURL.split("/api")[1];
                return _.template(commandAnnotationTpl, {idProject: self.idProject, idAnnotation: jsonCommand.id, idImage: jsonCommand.image, imageFilename: jsonCommand.imageFilename, icon: "delete.gif", text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'), datestr: dateStr, cropURL: cropURL, cropStyle: cropStyle});
            }
            else if (commandHistory.get('serviceName') == "algoAnnotationService") {
                var cropStyle = "";
                var cropURL = "api" + jsonCommand.smallCropURL.split("/api")[1];
                return _.template(commandAnnotationTpl, {idProject: self.idProject, idAnnotation: jsonCommand.id, idImage: jsonCommand.image, imageFilename: jsonCommand.imageFilename, icon: "delete.gif", text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'), datestr: dateStr, cropURL: cropURL, cropStyle: cropStyle});
            }
            else if (commandHistory.get('serviceName') == "annotationTermService") {
                return _.template(commandGenericTpl, {icon: "ui-icon-trash", text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'), datestr: dateStr, image: ""});

            }
            else if (commandHistory.get('serviceName') == "imageInstanceService") {
                var cropStyle = "block";
                var cropURL = "api" + jsonCommand.thumb.split("/api")[1];
                return _.template(commandImageInstanceTpl, {idProject: self.idProject, idImage: jsonCommand.id, imageFilename: jsonCommand.filename, icon: "delete.gif", text: commandHistory.get("prefixAction") + " " + commandHistory.get('action'), datestr: dateStr, cropURL: cropURL, cropStyle: cropStyle});

            }
        }
        if (self.displayAll) {
            return _.template(commandGenericTpl, {text: commandHistory.get('action'), datestr: dateStr});
        }
        return "undefined";
    }
});