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

var ProjectDashboardProperties = Backbone.View.extend({

    jobPropertyCollection: null,
    jobCollection: null,

    annotationPropertyCollection: null,
    annotationCollection: null,

    imageInstancePropertyCollection: null,
    imageInstanceCollection: null,

    projectPropertyCollection: null,

    initialize: function (options) {
        this.idDomain = options.idDomain;
        this.nameDomain = options.nameDomain;
    },

    render: function () {
        var self = this;

        require(["text!application/templates/dashboard/Properties.tpl.html"], function (propertiesTpl) {
            self.doLayout(propertiesTpl);
        });
    },

    refresh: function (idDomain, nameDomain) {
        var self = this;

        if (!window.app.isUndefined(nameDomain)) {
            self.nameDomain = nameDomain;
        }

        if (self.nameDomain != "Project") {
            self.initIdentifiantSelect(idDomain);
        } else {

            $("#identifiantSelect").hide();
            $("#refreshIdentifiantSelect").hide();
            $("#infoDisplaySelect").empty();

            self.refreshProperty();
            //self.initTableProperty();
            self.initPropertyRowEvents();
            self.loadAutocomplete();
        }

        self.initRadioButton();
    },

    doLayout: function (propertiesTpl) {
        var self = this;
        console.log("doLayout");

        var content = _.template(propertiesTpl, {id: self.model.id, name: self.model.get("name")});
        $("#tabs-properties-" + self.model.id).append(content);

        console.log(self.idDomain);
        //In case of a user use a link in menu explore (popupAnnotation for example)
        if (self.idDomain != null) {
            self.refresh(self.idDomain, self.nameDomain);
        }

        $.get("api/keywords.json", function (data) {
            $("#waitForKeywords").replaceWith('<input type="text" title="Value" class="input-xlarge" id="input_value_keywords" required />');
            console.log(data.collection);
            $("#input_value_keywords").typeahead({local: data.collection, minLength: 0});
        });

        $("#buttonJobProperty").click(function () {
            window.app.controllers.dashboard.navigate("#tabs-jobproperties-" + window.app.status.currentProject + "-undefined", false);
            self.refresh(self.idDomain, "Job");
        });

        $("#buttonAnnotationProperty").click(function () {
            window.app.controllers.dashboard.navigate("#tabs-annotationproperties-" + window.app.status.currentProject + "-undefined", false);
            self.refresh(self.idDomain, "Annotation");
        });

        $("#buttonImageInstanceProperty").click(function () {
            window.app.controllers.dashboard.navigate("#tabs-imageproperties-" + window.app.status.currentProject + "-undefined", false);
            self.refresh(self.idDomain, "ImageInstance");
        });

        $("#buttonProjectProperty").click(function () {
            window.app.controllers.dashboard.navigate("#tabs-projectproperties-" + window.app.status.currentProject + "-undefined", false);
            self.refresh(self.idDomain, "Project");
        });

        $("#refreshIdentifiantSelect").click(function () {
            console.log("click refresh");
            self.initIdentifiantSelect();
        });

        $("#addProperty").click(function (event) {
            console.log("click button add");
            event.preventDefault();
            self.addPropertyTable(false);
        });

        $("#addKeywords").click(function (event) {
            console.log("click button add");
            event.preventDefault();
            self.addPropertyTable(true);
        });

        $("#identifiantSelect").click(function () {
            console.log("click select");
            self.idDomain = $("#identifiantSelect").val();
            self.refreshProperty();
        });
        $("#deleteProperty").click(function () {
            console.log("click button delete");
            self.deleteProperty();
        });

        if (window.app.status.user.model.get('guest')) {
            $("#add-property-" + self.model.id).remove();
            $("#deleteProperty").remove();
        }

        if (!self.nameDomain) {
            $("#buttonProjectProperty").click();
        }
    },

    initPropertyRowEvents: function () {
        var self = this;

        $(document).on('dblclick', "td.propertyKey", function () {
            var id = $(this).attr('data-id');
            var idForm = "propertyFormKey" + id;
            var model;

            if (self.nameDomain == "Annotation") {
                model = self.annotationPropertyCollection.get(id);
            } else if (self.nameDomain == "ImageInstance") {
                model = self.imageInstancePropertyCollection.get(id);
            } else if (self.nameDomain == "Project") {
                model = self.projectPropertyCollection.get(id);
            } else if (self.nameDomain == "Job") {
                model = self.jobPropertyCollection.get(id);
            }

            var formEdit = _.template("<form id='<%= idForm %>'><input value='<%= key %>' type='text' id='input_NewKey'></form>",
                {key: model.get('key'), idForm: idForm});
            $(this).html(formEdit);
            var td = $(this);

            $("#" + idForm).submit(function () {
                model.save({key: $("#input_NewKey").val()}, {
                    success: function (model, response) {
                        td.empty();
                        td.html(model.get('key'));
                        return false;
                    },
                    error: function (model, response) {
                        var json = $.parseJSON(response.responseText);
                        window.app.view.message("Property", json.errors, "error");
                    }
                });
            });
        });

        $(document).on('dblclick', "td.propertyValue", function () {
            if (window.app.status.user.model.get('guest')) {
                return;
            }

            var id = $(this).attr('data-id');
            var idForm = "propertyFormValue" + id;
            var model;

            if (self.nameDomain == "Annotation") {
                model = self.annotationPropertyCollection.get(id);
            } else if (self.nameDomain == "ImageInstance") {
                model = self.imageInstancePropertyCollection.get(id);
            } else if (self.nameDomain == "Project") {
                model = self.projectPropertyCollection.get(id);
            } else if (self.nameDomain == "Job") {
                model = self.jobPropertyCollection.get(id);
            }

            var td = $(this);
            var formEdit = _.template("<form id='<%= idForm %>'><input value='<%= value %>' type='text' id='input_NewValue'></form>",
                {value: model.get('value'), idForm: idForm});
            $(this).html(formEdit);

            $("#" + idForm).submit(function (event) {
                event.preventDefault();
                model.save({value: $("#input_NewValue").val()}, {
                    success: function (model, response) {
                        td.empty();
                        td.html(model.get('value'));
                        return false;
                    },
                    error: function (model, response) {
                        var json = $.parseJSON(response.responseText);
                        window.app.view.message("Property", json.errors, "error");
                    }
                });
            });
        });
    },

    initIdentifiantSelect: function (ident) {
        var self = this;

        //Hide selectBox and Button refresh
        var select = $("#identifiantSelect");
        select.hide();
        select.empty();
        select.attr("disabled", "disabled");
        $("#refreshIdentifiantSelect").hide();

        //display message "Loading..."
        var loadingAlert = _.template("<div class='alert alert-info'><i class='icon-refresh'/> Loading...</div>", {});
        $("#infoDisplaySelect").empty();
        $("#infoDisplaySelect").append(loadingAlert);

        if (self.nameDomain == "Annotation") {
            new AnnotationCollection({project: self.model.id}).fetch({
                success: function (collection, response) {
                    self.annotationCollection = collection;
                    addValueSelect(collection, ident);
                },
                error: function (model, response) {
                    var json = $.parseJSON(response.responseText);
                    window.app.view.message("Annotation Property", json.errors, "error");
                }
            });
        } else if (self.nameDomain == "ImageInstance") {
            new ImageInstanceCollection({project: self.model.id, noLabel:true}).fetch({
                success: function (collection, response) {
                    self.imageInstanceCollection = collection;
                    addValueSelect(collection, ident);
                },
                error: function (model, response) {
                    var json = $.parseJSON(response.responseText);
                    window.app.view.message("ImageInstance Property", json.errors, "error");
                }
            });
        } else if (self.nameDomain == "Job") {
            new JobCollection({project: self.model.id}).fetch({
                success: function (collection, response) {
                    self.jobCollection = collection;
                    addValueSelect(collection, ident);
                },
                error: function (model, response) {
                    var json = $.parseJSON(response.responseText);
                    window.app.view.message("Job Property", json.errors, "error");
                }
            })
        }

        var addValueSelect = function (collection, id) {
            var idExist = false;

            if (_.size(collection) > 0) {
                $(select).removeAttr("disabled");
                $("#loadingSelect").hide();
            }

            if (_.size(collection) > 1000) {
                if (!id) {
                    window.app.message("Project", "Too much objects to retrieve. Go to image view and select one object.",
                        "warning", 5000)
                }
                $("#identifiantSelect").hide();
            }
            else {
                collection.each(function (options) {
                    var date = window.app.convertLongToDate(options.get('created'));
                    var option;
                    if (self.nameDomain == "ImageInstance") {
                        option = _.template("<option value='<%= id %>'><%= value %></option>", {
                            id: options.get('id'),
                            value: options.get('instanceFilename')
                        });
                    }
                    else if (self.nameDomain == "Annotation") {
                        option = _.template("<option value='<%= id %>'><%= value %> - <%= created %></option>", {
                            id: options.get('id'),
                            value: options.get('id'),
                            created: date
                        });
                    }
                    else if (self.nameDomain == "Job") {
                        option = _.template("<option value='<%= id %>'><%= name %> (by <%=username %> at <%= created %>)</option>", {
                            id: options.get('id'),
                            name: options.get('softwareName'),
                            username: options.get('username'),
                            created: date
                        });
                    }
                    select.append(option);
                });
            }

            if (collection.get(id)) {
                select.val(id);
            } else {
                self.idDomain = undefined;
            }


            self.refreshProperty();

            //Display selectbox, button Refresh and hide the label "loading..."
            select.show();
            $("#refreshIdentifiantSelect").show();
            $("#infoDisplaySelect").empty();
            self.initPropertyRowEvents();
            self.loadAutocomplete();
        }
    },

    refreshProperty: function () {
        var self = this;

        if (self.nameDomain == "Annotation") {
            window.app.controllers.dashboard.navigate("#tabs-annotationproperties-" + window.app.status.currentProject + "-" + self.idDomain, false);
            //window.app.controllers.dashboard.navigate("#tabs-annotationproperties-" + window.app.status.currentProject + "-" + $("#identifiantSelect").val() ,false);
        } else if (self.nameDomain == "ImageInstance") {
            window.app.controllers.dashboard.navigate("#tabs-imageproperties-" + window.app.status.currentProject + "-" + self.idDomain, false);
            //window.app.controllers.dashboard.navigate("#tabs-imageproperties-" + window.app.status.currentProject + "-" + $("#identifiantSelect").val() ,false);
        } else if (self.nameDomain == "Project") {
            window.app.controllers.dashboard.navigate("#tabs-projectproperties-" + window.app.status.currentProject + "-" + self.idDomain, false);
            //window.app.controllers.dashboard.navigate("#tabs-projectproperties-" + window.app.status.currentProject + "-" + $("#identifiantSelect").val() ,false);
        } else if (self.nameDomain == "Job") {
            window.app.controllers.dashboard.navigate("#tabs-jobproperties-" + window.app.status.currentProject + "-" + self.idDomain, false);
        }

        self.initTableProperty();
    },

    initRadioButton: function () {
        var self = this;

        if (self.nameDomain == "Annotation") {
            $("#buttonImageInstanceProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonProjectProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonJobProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonAnnotationProperty").attr("class", "btn btn-default btn-primary active");
        } else if (self.nameDomain == "ImageInstance") {
            $("#buttonAnnotationProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonProjectProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonJobProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonImageInstanceProperty").attr("class", "btn btn-default btn-primary active");
        } else if (self.nameDomain == "Project") {
            $("#buttonAnnotationProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonImageInstanceProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonJobProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonProjectProperty").attr("class", "btn btn-default btn-primary active");
        } else if (self.nameDomain == "Job") {
            $("#buttonAnnotationProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonImageInstanceProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonProjectProperty").attr("class", "btn btn-default btn-primary");
            $("#buttonJobProperty").attr("class", "btn btn-default btn-primary active");
        }
    },

    initTableProperty: function () {
        var self = this;

        var idDomain = $("#identifiantSelect").val();
        var tbody = $(this.el).find("#tableProperty");
        tbody.empty();

        //Display message "Loading..."
        var loadingAlert = _.template("<div class='alert alert-info'><i class='icon-refresh'/> Loading...</div>", {});
        $("#infoDisplayTable").empty();
        $("#infoDisplayTable").append(loadingAlert);

        if (self.nameDomain == "Annotation") {
            new AnnotationPropertyCollection({idAnnotation: idDomain}).fetch({
                success: function (collection, response) {
                    self.annotationPropertyCollection = collection;
                    loopCollection(self.annotationPropertyCollection);
                    self.loadImage(idDomain, self.annotationCollection);
                },
                error: function (model, response) {
                    var json = $.parseJSON(response.responseText);
                    window.app.view.message("Annotation Property", json.errors, "error");
                }
            });
        } else if (self.nameDomain == "ImageInstance") {
            new PropertyCollection({
                domainClassName: "be.cytomine.image.ImageInstance",
                domainIdent: idDomain
            }).fetch({
                success: function (collection, response) {
                    self.imageInstancePropertyCollection = collection;
                    loopCollection(self.imageInstancePropertyCollection);
                    self.loadImage(idDomain, self.imageInstanceCollection);
                },
                error: function (model, response) {
                    var json = $.parseJSON(response.responseText);
                    window.app.view.message("ImageInstance Property", json.errors, "error");
                }
            });
        } else if (self.nameDomain == "Project") {
            new PropertyCollection({
                domainClassName: "be.cytomine.project.Project",
                domainIdent: window.app.status.currentProject
            }).fetch({
                success: function (collection, response) {
                    self.projectPropertyCollection = collection;
                    loopCollection(self.projectPropertyCollection);
                    self.loadImage(idDomain, null);
                },
                error: function (model, response) {
                    var json = $.parseJSON(response.responseText);
                    window.app.view.message("Project Property", json.errors, "error");
                }
            });
        } else if (self.nameDomain == "Job") {
            new PropertyCollection({
                domainClassName: "be.cytomine.processing.Job",
                domainIdent: idDomain
            }).fetch({
                success: function (collection, response) {
                    self.jobPropertyCollection = collection;
                    loopCollection(self.jobPropertyCollection);
                    self.loadImage(idDomain, self.jobCollection);
                },
                error: function (model, response) {
                    var json = $.parseJSON(response.responseText);
                    window.app.view.message("Job Property", json.errors, "error");
                }
            });
        }

        var loopCollection = function (collection) {
            if (collection.size() === 0) {
                $("#infoDisplayTable").empty();
                var noDataAlert = _.template("<div class='alert alert-block'>No data to display</div>", {});
                $("#infoDisplayTable").append(noDataAlert);
            } else {
                collection.each(function (model) {
                    self.drawOption(model);
                });
            }
        }
    },

    loadImage: function (idDomain, collection) {
        var self = this;

        //Add Image Or Text
        var imageOrTextPlace = $("#loadImageOrText");
        var imageType;
        imageOrTextPlace.empty();

        if (self.nameDomain == "Job") {
            collection.each(function (options) {
                if (idDomain == options.get('id')) {
                    var option = _.template("<p id='textProperty-<%=id%>'><%=name%></p>", {
                        id: options.get('id'),
                        name: options.get('softwareName') + " (by " + options.get('username') + " at "
                        + window.app.convertLongToDate(options.get('created')) + ")"
                    });
                    imageOrTextPlace.append(option);
                    imageOrTextPlace.attr("href", "#tabs-algos-" + window.app.status.currentProject + "-" + options.get('software') + "-" + options.get('id'));
                }
            });
        }
        else if (self.nameDomain == "Project") {
            var option = _.template("<p id='textProperty-<%=id%>'><%=name%></p>", {
                id: window.app.status.currentProject,
                name: window.app.status.currentProjectModel.get('name')
            });
            imageOrTextPlace.append(option);
            imageOrTextPlace.attr("href", "#tabs-dashboard-" + window.app.status.currentProject);
        }
        else {
            if (self.nameDomain == "Annotation") {
                imageType = "cropURL";
            } else if (self.nameDomain == "ImageInstance") {
                imageType = "thumb";
            }

            collection.each(function (options) {
                if (idDomain == options.get('id')) {
                    var option = _.template("<img align='middle' id='imageProperty-<%=id%>' src='<%=image%>?maxSize=256' style='max-width :256px; max-height : 256px'>", {
                        id: options.get('id'),
                        image: options.get(imageType)
                    });
                    imageOrTextPlace.append(option);
                    var id_image = options.get('id');
                    if (self.nameDomain == "Annotation")
                        id_image = options.get('image');
                    imageOrTextPlace.attr("href", "#tabs-image-" + window.app.status.currentProject + "-" + id_image + "-");
                }
            });
        }
    },

    drawOption: function (model) {
        $("#infoDisplayTable").empty();

        if (window.app.status.user.model.get('guest') && model.get('key') == '@CUSTOM_UI_PROJECT') {
            return;
        }

        var tbody = $(this.el).find("#tableProperty");
        var option = _.template("<tr class='trProperty<%= id %>' id='<%= id %>'><td data-id='<%= id %>' class='propertyKey'><%= key %></td>" +
            "<td data-id='<%= id %>' class='propertyValue'><%= value %></td>" +
            "<td><input type='checkbox'  id='checkbox<%= id %>'></td></tr>", {
            id: model.get('id'),
            key: model.get('key'),
            value: model.get('value')
        });
        tbody.append(option);

        //Empty input key and value
        $("#input_key").val("");
        $("#input_value").val("");

        if (window.app.status.user.model.get('guest')) {
            $("#checkbox"+model.get('id')).remove()
        }
    },

    addPropertyTable: function (isKeyword) {
        var self = this;

        var key = $("#input_key").val();
        var value = $("#input_value").val();

        if (isKeyword) {

            key = "$TAGS";
            value = $("#input_value_keywords").val();
        }

        console.log(key + value);


        if ((value != "" && key != "")) {
            if (self.nameDomain == "Annotation") {
                new AnnotationPropertyModel({
                    domainIdent: $("#identifiantSelect").val(),
                    key: key,
                    value: value
                }).save({domainIdent: $("#identifiantSelect").val(), key: key, value: value}, {
                    success: function (model, response) {
                        self.drawOption(model);
                        self.annotationPropertyCollection.add(model);
                        console.log("COLLECTION");
                        console.log(self.annotationPropertyCollection);
                    },
                    error: function (model, response) {
                        var json = $.parseJSON(response.responseText);
                        window.app.view.message("Annotation Property", json.errors, "error");
                    }
                });
            } else if (self.nameDomain == "ImageInstance") {
                new PropertyModel({
                    domainClassName: "be.cytomine.image.ImageInstance",
                    domainIdent: $("#identifiantSelect").val(),
                    key: key,
                    value: value
                }).save({
                    domainClassName: "be.cytomine.image.ImageInstance",
                    domainIdent: $("#identifiantSelect").val(), key: key, value: value
                }, {
                    success: function (model, response) {
                        self.drawOption(model);
                        self.imageInstancePropertyCollection.push(model);
                    },
                    error: function (model, response) {
                        var json = $.parseJSON(response.responseText);
                        window.app.view.message("ImageInstance Property", json.errors, "error");
                    }
                });
            } else if (self.nameDomain == "Project") {
                new PropertyModel({
                    domainClassName: "be.cytomine.project.Project",
                    domainIdent: window.app.status.currentProject,
                    key: key,
                    value: value
                }).save({domainClassName: "be.cytomine.project.Project",
                    domainIdent: window.app.status.currentProject, key: key, value: value
                }, {
                    success: function (model, response) {
                        self.drawOption(model);
                        self.projectPropertyCollection.push(model);
                    },
                    error: function (model, response) {
                        var json = $.parseJSON(response.responseText);
                        window.app.view.message("Project Property", json.errors, "error");
                    }
                });
            } else if (self.nameDomain == "Job") {
                new PropertyModel({
                    domainClassName: "be.cytomine.processing.Job",
                    domainIdent: $("#identifiantSelect").val(),
                    key: key,
                    value: value
                }).save({
                    domainClassName: "be.cytomine.processing.Job",
                    domainIdent: $("#identifiantSelect").val(), key: key, value: value
                }, {
                    success: function (model, response) {
                        self.drawOption(model);
                        self.jobPropertyCollection.push(model);
                    },
                    error: function (model, response) {
                        var json = $.parseJSON(response.responseText);
                        window.app.view.message("Job Property", json.errors, "error");
                    }
                });
            }
        }
    },

    deleteProperty: function () {
        if (window.app.status.user.model.get('guest')) {
            return;
        }

        var self = this;
        var collection;

        if (self.nameDomain == "Annotation") {
            collection = self.annotationPropertyCollection;
        } else if (self.nameDomain == "ImageInstance") {
            collection = self.imageInstancePropertyCollection;
        } else if (self.nameDomain == "Project") {
            collection = self.projectPropertyCollection;
        } else if (self.nameDomain == "Job") {
            collection = self.jobPropertyCollection;
        }

        var idModelArray = [];

        collection.each(function (model) {
            idModelArray.push(model.id);
        });

        _.each(idModelArray, function (idModel) {
            if ($("#checkbox" + idModel).is(':checked')) {
                collection.get(idModel).destroy({
                    success: function (model, response) {
                        window.app.view.message(self.nameDomain + " Property", response.message, "success");
                        $("tr.trProperty" + model.id).empty();
                    },
                    error: function (model, response) {
                        var json = $.parseJSON(response.responseText);
                        window.app.view.message(self.nameDomain + " Property", json.errors, "error");
                    }
                });
            }
        });

    },

    loadAutocomplete: function () {
        var self = this;
        //array for autocompletion
        var keyNameArray = [];
        var domainName = null;

        if (self.nameDomain == "Annotation") {
            domainName = "annotation";
        } else if (self.nameDomain == "ImageInstance") {
            domainName = "imageinstance";
        }
        console.log("####################");
        if (domainName != null) {
            $.get("/api/" + domainName + "/property/key.json?idProject=" + window.app.status.currentProject, function (data) {
                console.log(data);
                console.log(data.collection);
                _.each(data.collection, function (item) {
                    console.log(item)
                    keyNameArray.push(item);
                });
                console.log("*************");
                console.log(keyNameArray);
                $("#input_key").typeahead({local: keyNameArray});
                console.log("*************");
            });

        } else {
            $("#input_key").typeahead({local: keyNameArray});
        }

    }
});