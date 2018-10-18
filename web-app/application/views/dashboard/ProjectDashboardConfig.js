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

var ProjectDashboardConfig = Backbone.View.extend({
    defaultLayersPanel : null,
    initialize: function () {
        this.rendered = false;
    },
    render: function () {

        var self = this;
        require(["text!application/templates/dashboard/config/DefaultProjectLayersConfig.tpl.html", "text!application/templates/dashboard/config/CustomUIConfig.tpl.html",
            "text!application/templates/dashboard/config/AnnotationToolsConfig.tpl.html", "text!application/templates/dashboard/config/ImageFiltersConfig.tpl.html",
                "text!application/templates/dashboard/config/SoftwareConfig.tpl.html", "text!application/templates/dashboard/config/GeneralConfig.tpl.html"
            ],
            function (defaultLayersTemplate,customUIConfigTemplate, magicWandTemplate, imageFiltersTemplate,softwareConfigTemplate, generalConfigTemplate) {
            self.doLayout(defaultLayersTemplate,customUIConfigTemplate, magicWandTemplate,imageFiltersTemplate,softwareConfigTemplate, generalConfigTemplate);
            self.rendered = true;
        });
        return this;
    },
    doLayout: function (defaultLayersTemplate,customUIConfigTemplate, AnnotToolsTemplate, imageFiltersTemplate,softwareTemplate, generalConfigTemplate) {

        // generate the config tabs

        var configList = $('<div class="col-md-9"></div>');
        var idPanel;
        var titlePanel;
        var configs=[];

        // General Configs
        idPanel = "general";
        titlePanel = "General Configuration";
        configs.push({id: idPanel, title : titlePanel});
        var general = new GeneralConfigPanel({
            el: _.template(generalConfigTemplate, {titre : titlePanel, id : idPanel}),
            model: this.model
        }).render();
        configList.append(general.el);


        // Default Layers
        idPanel = "defaultLayers";
        titlePanel = "Default Layers Configuration";
        configs.push({id: idPanel, title : titlePanel});
        this.defaultLayersPanel = new DefaultLayerPanel({
            el: _.template(defaultLayersTemplate, {titre : titlePanel, id : idPanel}),
            model: this.model
        }).render();
        configList.append(this.defaultLayersPanel.el);


        // CustomUI
        idPanel = "customUi";
        titlePanel = "Custom UI Configuration";
        configs.push({id: idPanel, title : titlePanel});
        var uiPanel = new CutomUIPanel({
            el: _.template(customUIConfigTemplate, {titre : titlePanel, id : idPanel})
        }).render();
        configList.append(uiPanel.el);


        // Image Filters
        idPanel = "imageFilters";
        titlePanel = "Image filters";
        configs.push({id: idPanel, title : titlePanel});
        var filters = new ImageFiltersProjectPanel({
            el: _.template(imageFiltersTemplate, {titre : titlePanel, id : idPanel}),
            model: this.model
        }).render();
        configList.append(filters.el);


        // Softwares Project
        idPanel = "softwaresProject";
        titlePanel = "Softwares";
        configs.push({id: idPanel, title : titlePanel});
        var softwares = new SoftwareProjectPanel({
            el: _.template(softwareTemplate, {titre : titlePanel, id : idPanel}),
            model: this.model
        }).render();
        configList.append(softwares.el);

        // Annotation tools Config
        idPanel = "annotTools";
        titlePanel = "Private Annotation Tools Configuration";
        configs.push({id: idPanel, title : titlePanel});
        var magicWand = new AnnotationToolsConfig({
            el: _.template(AnnotToolsTemplate, {titre : titlePanel, id : idPanel})
        }).render();
        configList.append(magicWand.el);

        // Generation of the left menu
        var menu = this.createConfigMenu(configs);

        $(this.el).append(menu);
        $(this.el).append(configList);

    },
    createConfigMenu: function (configs) {
        // generate the menu skeleton

        var html = '';
        html = html + '<div class="col-md-2">';
        html = html + '    <div class="panel panel-default">';
        html = html + '        <div class="panel-heading">';
        html = html + '            <h4>Configurations</h4>';
        html = html + '        </div>';

        html = html + '    </div>';
        html = html + '</div>';

        var menu = $(html);

        var configMenu = $('<div class="panel-body"></div>');

        // Generation of the left menu
        $.each(configs, function (index, value) {
            configMenu.append('<div><input id="'+value.id+'-config-checkbox" type="checkbox" checked> '+value.title+'</div>');
            configMenu.find("input#"+value.id+"-config-checkbox").change(function () {
                if ($(this).is(':checked')) {
                    $("#config-panel-"+value.id).show();
                } else {
                    $("#config-panel-"+value.id).hide();
                }
            });
        });
        menu.find(".panel-default").append(configMenu);
        return menu;
    },
    refresh: function () {
        if (!this.rendered) {
            this.render();
        }
    },

    refreshUserData: function (){
        this.defaultLayersPanel.refresh();
    }


});

var GeneralConfigPanel = Backbone.View.extend({
    projectMultiSelectAlreadyLoad: false,
    projects: [],
    projectRetrieval: [],
    render: function () {
        var self = this;

        // initialization
        $(self.el).find("#project-edit-name").val(self.model.get('name'));
        $(self.el).find("input#blindMode-checkbox-config").attr('checked', self.model.get('blindMode'));
        $(self.el).find("input#hideUsersLayers-checkbox-config").attr('checked', self.model.get('hideUsersLayers'));
        $(self.el).find("input#hideAdminsLayers-checkbox-config").attr('checked', self.model.get('hideAdminsLayers'));
        if(self.model.get('isReadOnly')) {
            $(self.el).find("input#EditingModeReadOnly-radio-config").attr('checked', 'checked');
        } else if(self.model.get('isRestricted')) {
            $(self.el).find("input#EditingModeRestricted-radio-config").attr('checked', 'checked');
        } else {
            $(self.el).find("input#EditingModeFull-radio-config").attr('checked', 'checked');
        }


        new ProjectCollection().fetch({
            success: function (collection) {
                self.projects = collection;

                // change handler
                $(self.el).find("input#retrievalProjectSome-radio-config,input#retrievalProjectAll-radio-config,input#retrievalProjectNone-radio-config").change(function () {
                    self.refreshRetrievalProjectSelect();
                    self.update();
                });

                if (self.model.get('retrievalDisable')) {
                    $(self.el).find("input#retrievalProjectNone-radio-config").attr("checked", "checked");
                } else if (self.model.get('retrievalAllOntology')) {
                    $(self.el).find("input#retrievalProjectAll-radio-config").attr("checked", "checked");
                } else {
                    $(self.el).find("input#retrievalProjectSome-radio-config").attr("checked", "checked");
                }
                self.refreshRetrievalProjectSelect();
            }
        });

        $(self.el).find("#reloadProjectButton").click(function (event) {
            window.app.controllers.dashboard.refresh();
        });

        $(self.el).find("#saveProjectNameButton").click(function (event) {
            DialogModal.initDialogModal(null, null, 'RefreshProject', 'It is recommended to refresh the project to consider this modification. Do you want to reload this project ?', 'CONFIRMATIONWARNING',
                function(){
                    self.update(true);
                    window.app.controllers.dashboard.refresh();
                },
                function(){
                    self.update(true);
                    $(self.el).find("#saveProjectNameButton").prop('disabled', true);
                });
        });

        $(self.el).find("#project-edit-name").on("input", function (x) {
            if($(x.target).val() === self.model.get('name')) {
                $(self.el).find("#saveProjectNameButton").prop('disabled', true);
            } else {
                $(self.el).find("#saveProjectNameButton").prop('disabled', false);
            }
        });

        $(self.el).find("input#EditingModeFull-radio-config,input#EditingModeRestricted-radio-config,input#EditingModeReadOnly-radio-config").change(function () {
            self.update();
        });


        $(self.el).on('click', '.general-checkbox-config', function() {
            self.update();
        });

        return this;
    },
    refreshRetrievalProjectSelect: function () {
        var self = this;
        if ($(self.el).find("input#retrievalProjectSome-radio-config").is(':checked')) {
            if (!self.projectMultiSelectAlreadyLoad) {
                self.createRetrievalProjectSelect(self.projects);
                self.projectMultiSelectAlreadyLoad = true;
            } else {
                $(self.el).find("div#retrievalGroup").find(".uix-multiselect").show();
            }
        } else {
            $(self.el).find("div#retrievalGroup").find(".uix-multiselect").hide();
        }
    },
    createRetrievalProjectSelect: function (projects) {
        var self = this;
        /* Create Projects List */
        $(self.el).find("#retrievalproject").empty();

        projects.each(function (project) {
            if (project.get('ontology') === self.model.get('ontology') && project.id !== self.model.id) {
                if (_.indexOf(self.model.get('retrievalProjects'), project.id) === -1) {
                    $(self.el).find("#retrievalproject").append('<option value="' + project.id + '">' + project.get('name') + '</option>');
                }
                else {
                    $(self.el).find("#retrievalproject").append('<option value="' + project.id + '" selected="selected">' + project.get('name') + '</option>');
                }
            }
        });

        $(self.el).find("#retrievalproject").append('<option value="' + self.model.id + '" selected="selected">' + self.model.get('name') + '</option>');

        $(self.el).find("#retrievalproject").multiselectNext().bind("multiselectChange", function(evt, ui) {
            self.projectRetrieval = [];
            //var values = $.map(ui.optionElements, function(opt) { return $(opt).attr('value'); });
            //console.log("Multiselect change event! " + ui.optionElements.length + ' value ' + (ui.selected ? 'selected' : 'deselected') + ' (' + values + ')');
            $(this).find("option:selected").each(function(i, o) {
                self.projectRetrieval.push(o.value);
            });
            self.update();
        });

        $(self.el).find(".ui-button-icon-only .ui-icon").css("margin-top", "-8px");
        $(self.el).find("div.uix-multiselect").css("background-color", "#DDDDDD");
    },
    update: function(changeName) {
        var self = this;

        var project = self.model;

        var blindMode = $(self.el).find("input#blindMode-checkbox-config").is(':checked');
        var hideUsersLayers = $(self.el).find("input#hideUsersLayers-checkbox-config").is(':checked');
        var hideAdminsLayers = $(self.el).find("input#hideAdminsLayers-checkbox-config").is(':checked');

        var isRestricted = $(self.el).find("input#EditingModeRestricted-radio-config").is(':checked');
        var isReadOnly = $(self.el).find("input#EditingModeReadOnly-radio-config").is(':checked');

        var retrievalDisable = $(self.el).find("input#retrievalProjectNone-radio-config").is(':checked');
        var retrievalProjectAll = $(self.el).find("input#retrievalProjectAll-radio-config").is(':checked');
        var retrievalProjectSome = $(self.el).find("input#retrievalProjectSome-radio-config").is(':checked');
        if (!retrievalProjectSome) {
            self.projectRetrieval = [];
        }

        var name;
        // name is important, to change name, it MUST have the boolean at true. We don't update name "by accident"
        name = changeName ? $(self.el).find("#project-edit-name").val() : self.model.get('name');

        project.set({name: name, retrievalDisable: retrievalDisable, retrievalAllOntology: retrievalProjectAll, retrievalProjects: self.projectRetrieval,
            blindMode:blindMode,isReadOnly:isReadOnly,isRestricted:isRestricted,hideUsersLayers:hideUsersLayers,hideAdminsLayers:hideAdminsLayers});
        project.save({name: name, retrievalDisable: retrievalDisable, retrievalAllOntology: retrievalProjectAll, retrievalProjects: self.projectRetrieval,
            blindMode:blindMode,isReadOnly:isReadOnly,isRestricted:isRestricted,hideUsersLayers:hideUsersLayers,hideAdminsLayers:hideAdminsLayers}, {
            success: function (model, response) {
                console.log("1. Project edited!");
                window.app.view.message("Project", response.message, "success");
            },
            error: function (model, response) {
                var json = $.parseJSON(response.responseText);
                window.app.view.message("Project", json.errors, "error");
            }
        });
    }

});

var AnnotationToolsConfig = Backbone.View.extend({
    defaultRadiusValue: 8,
    thresholdKey: null,
    toleranceKey: null,
    initialize: function () {
        this.toleranceKey = "mw_tolerance" + window.app.status.currentProject;
        if (window.localStorage.getItem(this.toleranceKey) == null) {
            window.localStorage.setItem(this.toleranceKey, Processing.MagicWand.defaultTolerance);
        }
        this.thresholdKey = "th_threshold" + window.app.status.currentProject;
        if (window.localStorage.getItem(this.thresholdKey) == null) {
            window.localStorage.setItem(this.thresholdKey, Processing.Threshold.defaultTheshold);
        }
        this.radiusKey = "point_radius" + window.app.status.currentProject;
        if (window.localStorage.getItem(this.radiusKey) == null) {
            window.localStorage.setItem(this.radiusKey, this.defaultRadiusValue);
        }
        return this;
    },

    render: function () {
        this.fillForm();
        this.initEvents();
        return this;
    },

    initEvents: function () {
        var self = this;
        var form = $(self.el).find("#mwToleranceForm");
        //between pixels
        var max_euclidian_distance = Math.ceil(Math.sqrt(255 * 255 + 255 * 255 + 255 * 255));
        // Magic Wand Form
        form.on("submit", function (e) {
            e.preventDefault();
            //tolerance
            var toleranceValue = parseInt($(self.el).find("#input_tolerance").val());
            if (_.isNumber(toleranceValue) && toleranceValue >= 0 && toleranceValue < max_euclidian_distance) {
                window.localStorage.setItem(self.toleranceKey, Math.round(toleranceValue));
                var successMessage = _.template("Tolerance value for project <%= name %> is now <%= tolerance %>", {
                    name: window.app.status.currentProjectModel.get('name'),
                    tolerance: toleranceValue
                });
                window.app.view.message("Success", successMessage, "success");
            } else {
                window.app.view.message("Error", "Tolerance must be an integer between 0 and " + max_euclidian_distance, "error");
            }

            var thresholdValue = parseInt($(self.el).find("#input_threshold").val());
            if (_.isNumber(thresholdValue) && thresholdValue >= 0 && thresholdValue < 255) {
                window.localStorage.setItem(self.thresholdKey, Math.round(thresholdValue));
                successMessage = _.template("Threshold value for project <%= name %> is now <%= threshold %>", {
                    name: window.app.status.currentProjectModel.get('name'),
                    threshold: thresholdValue
                });
                window.app.view.message("Success", successMessage, "success");
            } else {
                window.app.view.message("Error", "Threshold must be an integer between 0 and 255", "error");
            }
        });

        // Point Form
        var form = $(self.el).find("#pointConfigForm");
        form.on("submit", function (e) {
            e.preventDefault();
            var radiusValue = parseInt($(self.el).find("#input_radius").val());
            if (_.isNumber(radiusValue) && radiusValue >= 0) {
                window.localStorage.setItem(self.radiusKey, Math.round(radiusValue));
                var successMessage = _.template("Radius value for project <%= name %> is now <%= radius %>", {
                    name: window.app.status.currentProjectModel.get('name'),
                    radius: radiusValue
                });
                window.app.view.message("Success", successMessage, "success");
            } else {
                window.app.view.message("Error", "Radius must be an integer greater than 0 ", "error");
            }
        });
    },

    fillForm: function () {
        var self = this;
        $(self.el).find("#input_tolerance").val(window.localStorage.getItem(this.toleranceKey));
        $(self.el).find("#input_threshold").val(window.localStorage.getItem(this.thresholdKey));
        $(self.el).find("#input_radius").val(window.localStorage.getItem(this.radiusKey));
    }
});

var SoftwareProjectPanel = Backbone.View.extend({

    removeSoftware: function (idSoftwareProject) {
        var self = this;
        new SoftwareProjectModel({ id: idSoftwareProject }).destroy({
            success: function (model, response) {
                $(self.el).find("#software" + idSoftwareProject).remove();
                window.app.view.message("", response.message, "success");
            },
            error: function (model, response) {

            }
        });
        return false;
    },

    renderSoftwares: function () {
        var self = this;
        var el = $(this.el).find(".softwares");
        new SoftwareProjectCollection({ project: self.model.id}).fetch({
            success: function (softwareProjectCollection, response) {
                softwareProjectCollection.each(function (softwareProject) {
                    self.renderSoftware(softwareProject, el);
                });
            }
        });

    },
    renderSoftware: function (softwareProject) {
        var self = this;

        var softwares = $(self.el).find("#addedSoftwares");

        var newSoft = softwareProject.toJSON();

        softwares.append(
                '<div id="software'+newSoft.id+'" class="row">' +
                    '<div class="col-md-5 col-md-offset-4"><p>' + newSoft.name + ' (' + newSoft.softwareVersion + ')</p></div>' +
                    '<div class="col-md-2"><a class="removesoftwarebutton btn btn-danger" href="javascript:void(0);" data-id='+newSoft.id+'>Remove</a></div>'+
                '</div>');
    },

    render: function () {
        var self = this;
        new SoftwareCollection().fetch({
            success: function (softwareCollection, response) {
                softwareCollection.each(function (software) {
                    var option = _.template("<option value='<%= id %>'><%= name %> (<%= softwareVersion %>)</option>", software.toJSON());
                    $(self.el).find("#addSoftware").append(option);
                });
                $(self.el).find("#addSoftwareButton").click(function (event) {
                    event.preventDefault();
                    new SoftwareProjectModel({ project: self.model.id, software: $(self.el).find("#addSoftware").val()}).save({}, {
                        success: function (softwareProject, response) {
                            self.renderSoftware(new SoftwareProjectModel(softwareProject.toJSON().softwareproject));
                            window.app.view.message("", response.message, "success");
                        },
                        error: function (model, response) {
                            window.app.view.message("", $.parseJSON(response.responseText).errors, "error");
                        }
                    });
                    return false;
                });
            }
        });

        self.renderSoftwares();

        $(self.el).on('click', ".removesoftwarebutton", function () {
            var idSoftwareProject = $(this).attr('data-id');
            self.removeSoftware(idSoftwareProject);
            return false;
        });

        return this;
    }

});

var DefaultLayerPanel = Backbone.View.extend({

    render: function () {
        var self = this;

        $(self.el).find("#selectedDefaultLayers").hide();

        self.refresh();


        $(self.el).find('#projectadddefaultlayersbutton').click(function() {

            var container = $(self.el).find('#availableprojectdefaultlayers')[0];
            var selected = container.options[container.options.selectedIndex];
            if(!window.app.isUndefined(selected.value) && selected.value != '') {
                $(self.el).find("#selectedDefaultLayers").show();
                // check if not already taken
                if ($(self.el).find('#selectedDefaultLayers #defaultlayer' + selected.value).length === 0) {
                    $(self.el).find('#selectedDefaultLayers').append('<div class="col-md-3 col-md-offset-1"><input type="checkbox" id="hideByDefault' + selected.value + '" class="hideByDefault"> Hide layers by default</div>');
                    $(self.el).find('#selectedDefaultLayers').append('<div class="col-md-5"><p>' + selected.text + '</p></div>');
                    $(self.el).find('#selectedDefaultLayers').append('<div class="col-md-2"><a id="defaultlayer' + selected.value + '" class="projectremovedefaultlayersbutton btn btn-danger" href="javascript:void(0);">Remove</a></div>');
                    save(selected.value, false);
                }
            }
        });
        $(self.el).find('#selectedDefaultLayers').on('click', '.projectremovedefaultlayersbutton', function() {
            var id = $(this).attr("id").replace("defaultlayer","");
            $(this).parent().prev().prev().remove();
            $(this).parent().prev().remove();
            $(this).parent().remove();
            if($(self.el).find("#selectedDefaultLayers").children().length === 0){
                $(self.el).find("#selectedDefaultLayers").hide();
            }
            destroy(id);
        });

        $(self.el).find('#selectedDefaultLayers').on('click', '.hideByDefault', function() {
            var id = $(this).attr("id").replace("hideByDefault","");
            var chkb = $(this);

            new ProjectDefaultLayerModel({id:id, project: self.model.id}).fetch({
                success: function (lModel) {
                    lModel.set('hideByDefault', chkb.is(":checked"));
                    lModel.save(null, {
                        success: function (model) {
                            console.log("updated");
                        }
                    });
                }
             });

        });


        var save = function(userId, hide) {
            var layer = new ProjectDefaultLayerModel({user: userId, project: self.model.id, hideByDefault: hide});
            layer.save(null, {
                success: function (model, response) {
                    console.log("save success");
                    // with the project_default_layer id, we will be able to delete them more efficiently
                    var id = $(self.el).find('#selectedDefaultLayers #defaultlayer' + userId).attr("id").replace(userId,response.projectdefaultlayer.id);
                    $(self.el).find('#selectedDefaultLayers #defaultlayer' + userId).attr("id", id);
                    id = $(self.el).find('#selectedDefaultLayers #hideByDefault' + userId).attr("id").replace(userId,response.projectdefaultlayer.id);
                    $(self.el).find('#selectedDefaultLayers #hideByDefault' + userId).attr("id", id);
                },
                error: function (x, y) {
                    console.log("save error");
                    console.log(x);
                    console.log(y.responseText);
                }
            });
        };
        var destroy = function(id) {
            var layer = new ProjectDefaultLayerModel({id:id, project: self.model.id}).fetch({
                success: function (lModel) {
                    lModel.destroy({
                        success: function (model) {
                            console.log("destroyed");
                        }
                    });
                }
            });
        };

        return this;
    },
    refresh : function(){
        var self = this;
        $(self.el).find('#availableprojectdefaultlayers').empty();
        $(self.el).find('#selectedDefaultLayers').empty();


        // load all user and admin of the project
        window.app.models.projectUser.each(function(user) {
            $(self.el).find('#availableprojectdefaultlayers').append('<option value="'+ user.id +'">' + user.prettyName() + '</option>');
        });

        // load existing default layers
        new ProjectDefaultLayerCollection({project: self.model.id}).fetch({
            success: function (collection) {
                var defaultLayersArray=[];
                collection.each(function(layer) {
                    defaultLayersArray.push({id: layer.id, userId: layer.attributes.user, hideByDefault: layer.attributes.hideByDefault});
                });


                $(self.el).find("#selectedDefaultLayers").show();
                for(var i = 0; i<defaultLayersArray.length; i++){
                    // check if not already taken
                    $(self.el).find('#selectedDefaultLayers').append('<div class="col-md-3 col-md-offset-1"><input type="checkbox" id="hideByDefault' + defaultLayersArray[i].id + '" class="hideByDefault"> Hide layers by default</div>');
                    $(self.el).find('#hideByDefault' + defaultLayersArray[i].id)[0].checked = defaultLayersArray[i].hideByDefault;
                    $(self.el).find('#selectedDefaultLayers').append('<div id = "tmp'+ defaultLayersArray[i].userId +'" class="col-md-5"><p></p></div>');
                    $(self.el).find('#selectedDefaultLayers').append('<div class="col-md-2"><a id="defaultlayer' + defaultLayersArray[i].id + '" class="projectremovedefaultlayersbutton btn btn-danger" href="javascript:void(0);">Remove</a></div>');
                    new UserModel({id: defaultLayersArray[i].userId}).fetch({
                        success: function (model) {
                            $(self.el).find('#tmp'+model.id).find("p").text(model.prettyName());
                            $(self.el).find('#tmp'+model.id).removeAttr('id');
                        }
                    });
                }
            }
        });
    }

});

var ImageFiltersProjectPanel = Backbone.View.extend({
    removeImageFilter: function (idImageFilter) {
        var self = this;
        new ProjectImageFilterModel({ id: idImageFilter}).destroy({
            success: function (model, response) {
                $(self.el).find("#imageFilter" + idImageFilter).remove();
                window.app.view.message("", response.message, "success");
            }
        });
        return false;
    },
    renderFilters: function () {
        var self = this;
        var el = $(this.el).find(".image-filters");
        new ProjectImageFilterCollection({ project: self.model.id}).fetch({
            success: function (imageFilters, response) {
                imageFilters.each(function (imageFilter) {
                    self.renderImageFilter(imageFilter, el);
                });
            }
        });
    },
    renderImageFilter: function (imageFilter, el) {
        var self = this;

        var filters = $(self.el).find("#addedImageFilters");

        var newFilter = imageFilter.toJSON();

        filters.append(
                '<div id="imageFilter'+newFilter.id+'" class="row">' +
                    '<div class="col-md-5 col-md-offset-4"><p>' + newFilter.name + '</p></div>' +
                    '<div class="col-md-2"><a class="removeImageFilterButton btn btn-danger" href="javascript:void(0);" data-id='+newFilter.id+'>Remove</a></div>'+
                '</div>');
    },
    render: function () {
        var self = this;
        var el = $(this.el).find(".image-filters");
        new ImageFilterCollection().fetch({
            success: function (imageFilters, response) {
                imageFilters.each(function (imageFilter) {
                    var option = _.template("<option value='<%=  id %>'><%=   name %></option>", imageFilter.toJSON());
                    $(self.el).find("#addImageFilter").append(option);

                });
                $(self.el).find("#addImageFilterButton").click(function (event) {
                    event.preventDefault();
                    new ProjectImageFilterModel({ project: self.model.id, imageFilter: $(self.el).find("#addImageFilter").val()}).save({}, {
                        success: function (imageFilter, response) {
                            self.renderImageFilter(new ImageFilterModel(imageFilter.toJSON().imagefilterproject));
                            window.app.view.message("", response.message, "success");
                        },
                        error: function (response) {
                            window.app.view.message("", $.parseJSON(response.responseText).errors, "error");
                        }
                    });
                    return false;
                });
            }
        });

        self.renderFilters();

        $(self.el).on('click', ".removeImageFilterButton", function () {
            var idImageFilter = $(this).attr("data-id");
            self.removeImageFilter(idImageFilter);
            return false;
        });
        return this;

    }
});


var CutomUIPanel = Backbone.View.extend({
    obj : null,

    refresh : function() {
        var self = this;
        var elTabs = $(self.el).find("#custom-ui-table-tabs");
        var elPanels = $(self.el).find("#custom-ui-table-panels");
        var elTools = $(self.el).find("#custom-ui-table-tools");
        var elGraphs = $(self.el).find("#custom-ui-table-project-graphs");

        var fn = function() {
            require(["text!application/templates/dashboard/config/CustomUIItem.tpl.html"], function (customUIItemTpl) {
                elTabs.empty();
                elPanels.empty();
                elTools.empty();
                elGraphs.empty();

                _.each(CustomUI.components,function(component) {
                    self.createComponentConfig(component,customUIItemTpl,elTabs);
                });
                _.each(CustomUI.componentsPanels,function(component) {
                    self.createComponentConfig(component,customUIItemTpl,elPanels);
                });
                _.each(CustomUI.componentsTools,function(component) {
                    self.createComponentConfig(component,customUIItemTpl,elTools);
                });
                _.each(CustomUI.componentsGraphs,function(component) {
                    self.createComponentConfig(component,customUIItemTpl,elGraphs);
                });

                $(self.el).find("#btn-project-configuration-tab-ADMIN_PROJECT").attr("disabled", "disabled");

                $(self.el).find("#custom-ui-table").find("button").click(function(eventData,ui) {

                    console.log(eventData.target.id);
                    var currentButton = $(self.el).find("#"+eventData.target.id);
                    var isActiveNow = self.obj[currentButton.data("component")][currentButton.data("role")];
                    currentButton.removeClass(isActiveNow? "btn-success" : "btn-danger");
                    currentButton.addClass(isActiveNow? "btn-danger" : "btn-success");
                    self.obj[currentButton.data("component")][currentButton.data("role")]=!self.obj[currentButton.data("component")][currentButton.data("role")];
                    self.addConfig();
                });

            });
        };
        self.retrieveConfig(fn);
    },
    createComponentConfig : function(component, template,mainElement) {
        var self = this;
        var customUI = _.template(template,component);
        $(mainElement).append(customUI);
        var tr = $(mainElement).find("#customUI-"+component.componentId+"-roles");
        tr.append("<td>"+component.componentName+"</td>");
        if(!self.obj[component.componentId]) {
            //component is not define in the project config, active by default
            self.obj[component.componentId] = {};
            _.each(CustomUI.roles,function(role) {
                var active = true;
                self.obj[component.componentId][role.authority] = active;
                tr.append(self.createButton(role,component,active));
            });
        } else {
            _.each(CustomUI.roles,function(role) {
                var active = true;
                if( !self.obj[component.componentId][role.authority]) {
                    active = false;
                }
                tr.append(self.createButton(role,component,active));
            });

        }
    },
    render: function () {
        var self = this;

        self.refresh();
        return this;
    },
    addConfig : function() {
        var self = this;
        $.ajax({
            type: "POST",
            url: "custom-ui/project/"+window.app.status.currentProject+".json",
            data: JSON.stringify(self.obj),
            contentType:"application/json; charset=utf-8",
            dataType:"json",
            success: function() {
                self.refresh();
                window.app.view.message("Project", "Configuration save!", "success");
                CustomUI.customizeUI(function() {CustomUI.hideOrShowComponents();});
            }
        });
    },
    retrieveConfig : function(callback) {
        var self = this;
        $.get( "custom-ui/project/"+window.app.status.currentProject+".json", function( data ) {
            self.obj = data;
            callback();
        });
    },
    createButton : function(role,component, active) {
        var classBtn = active? "btn-success" : "btn-danger";
        return '<td><button type="radio" data-component="'+component.componentId+'" data-role="'+role.authority+'" id="btn-' + component.componentId +'-'+role.authority+'" class="btn  btn-large btn-block '+classBtn+'">'+role.name+'</button></td>';
    }

});
