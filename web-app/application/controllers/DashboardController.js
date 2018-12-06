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

var DashboardController = Backbone.Router.extend({

    view: null,
    routes: {
        "tabs-images-:project": "images",
        "tabs-thumbs-:project": "imagesthumbs",
        "tabs-imagesarray-:project": "imagesarray",
        "tabs-annotations-:project-:terms-:users": "annotations",
        "tabs-annotations-:project": "annotations",
        "tabs-properties-:project-:iddomain": "properties",
        "tabs-properties-:project": "properties",
        "tabs-projectproperties-:project-:iddomain": "projectProperties",
        "tabs-annotationproperties-:project-:iddomain": "annotationProperties",
        "tabs-imageproperties-:project-:iddomain": "imageProperties",
        "tabs-jobproperties-:project-:iddomain": "jobProperties",
        "tabs-dashboard-:project": "dashboard",
        "tabs-config-:project": "config",
        "tabs-usersconfig-:project": "usersConfig",
        "tabs-algos-:project-:software-:job": "algos",
        "tabs-algos-:project-:software-": "algos",
        "tabs-algos-:project": "algos",
        "tabs-useralgo-:userjob": "useralgos",
        "tabs-reviewdash-:project-:image-:user-:term": "review",
//        "tabs-review-:project-:user-:term": "review",
//        "tabs-review-:project": "review"
        "tabs-groups-:project": "group",
        "tabs-benchmark-:project": "benchmark"

    },

    init: function (project, callback) {
        $(window).scrollTop(0);
        console.log("window.app.status.currentProject=" + window.app.status.currentProject + " new project=" + project);
        if (window.app.status.currentProject != undefined && window.app.status.currentProject != project) {
            this.destroyView();
            window.app.controllers.browse.closeAll();
            window.app.status.currentProject = undefined;
            window.app.view.clearIntervals();
        }

        if (window.app.status.currentProject == undefined) {
            window.app.view.clearIntervals();
            window.app.status.currentProject = project;
            window.app.controllers.browse.initTabs();
            if (this.view == null) {
                this.createView(callback);
            }
            this.showView();

            // here, save a no-sql line projectConnexion
            var userInfo = window.app.getInfoClient();
            new ProjectConnectionModel({
                project: project,
                os: userInfo.os,
                browser: userInfo.browser,
                browserVersion : userInfo.browserVersion

            }).save();

        } else {
            callback.call();
            this.showView();
        }

    },
    refresh: function () {
        //get open tabs + current tab
        var current = window.location.href;
        var openImageTabs = window.app.status.currentImages;
        var project = window.app.status.currentProject;
        window.app.status.currentProject = -1;

        // force change otherwise the last redirect will not be considered
        window.location = "#tabs-dashboard-"+project;

        // reload image in same order
        // we wait than an image is loaded before loading the next.
        var counter = 0;
        var callback = function () {
            if(counter < $(openImageTabs).length) {
                var image = $(openImageTabs)[counter].image;
                if(openImageTabs[counter].review) {
                    window.app.controllers.browse.review(project, image, undefined, callback);
                } else {
                    window.app.controllers.browse.browse(project, image, undefined, undefined, callback);
                }
            } else if(counter == openImageTabs.length) {
                window.location = current;
                if(counter == 0){
                    //force reload when no open images
                    location.reload();
                }
            }
            counter++;
        };

        callback();
        // If openImageTabs is empty, currentProject is still -1
        window.app.status.currentProject = project;
    },
    images: function (project) {
        this.imagesarray(project);
    },
    imagesthumbs: function (project) {
        console.log("imagesthumbs");
        var self = this;
        var func = function () {
            console.log("refreshImagesThumbs");
            self.view.refreshImagesThumbsView();
            console.log("showImagesThumbs");
            self.view.showImagesThumbs();
            var tabs = $("#explorer > .browser").find(".nav-tabs");
            tabs.find('a[href=#tabs-images-' + window.app.status.currentProject + ']').tab('show');
        };
        this.init(project, func);
    },
    imagesarray: function (project) {
        var self = this;
        console.log("imagesarray");
        var func = function () {
            console.log("refreshImagesTable");
            self.view.refreshImagesTable();
            console.log("showImagesTable");
            self.view.showImagesTable();
            var tabs = $("#explorer > .browser").find(".nav-tabs");
            tabs.find('a[href=#tabs-images-' + window.app.status.currentProject + ']').tab('show');
        };
        this.init(project, func);
    },
    group: function(project){
        var self = this;
        console.log("imagesgroup");
        var func = function () {
            self.view.refreshGroupView();
            var tabs = $("#explorer > .browser").find(".nav-tabs");
            tabs.find('a[href=#tabs-groups-' + window.app.status.currentProject + ']').tab('show');
        };
        this.init(project, func);
    },
    annotations: function (project, terms, users) {
        console.log("controller.annotations=" + users);
        var self = this;
        var func = function () {
            window.app.controllers.browse.tabs.triggerRoute = false;
            var tabs = $("#explorer > .browser").find(".nav-tabs");
            tabs.find('a[href=#tabs-annotations-' + window.app.status.currentProject + ']').click();
            self.view.refreshAnnotationsView(terms, users);
            window.app.controllers.browse.tabs.triggerRoute = true;

        };
        this.init(project, func);
    },
    projectProperties : function(project, idDomain) {
        console.log("projectProperties");
        this.properties(project, idDomain, "Project");
    },
    imageProperties : function(project, idDomain) {
        console.log("imageProperties");
        this.properties(project, idDomain, "ImageInstance");
    },
    annotationProperties : function(project, idDomain) {
        console.log("annotationProperties");
        this.properties(project, idDomain, "Annotation");
    },
    jobProperties : function(project, idDomain) {
        console.log("jobProperties");
        this.properties(project, idDomain, "Job");
    },
    properties: function (project, idDomain, nameDomain) {
        console.log("controller.properties: " + project + "-" + idDomain);
        var self = this;
        var func = function () {
            console.log("init properties with domain = " + nameDomain);
            window.app.controllers.browse.tabs.triggerRoute = false;
            var tabs = $("#explorer > .browser").find(".nav-tabs");
            tabs.find('a.annotationTabLink').click();
            self.view.refreshProperties(idDomain, nameDomain);
            window.app.controllers.browse.tabs.triggerRoute = true;
        };
        self.init(project, func);
    },
    algos: function (project, software, job) {
        var self = this;
        console.log("DashBoard.algos");
        var func = function () {
            window.app.controllers.browse.tabs.triggerRoute = false;
            var tabs = $("#explorer > .browser").find(".nav-tabs");
            console.log(tabs.find('a[href^=#tabs-algos-' + window.app.status.currentProject + '-]'));
            tabs.find('a[href^=#tabs-algos-' + window.app.status.currentProject + ']').click();
            self.view.refreshAlgosView(software, job || undefined);
            window.app.controllers.browse.tabs.triggerRoute = true;
        };
        this.init(project, func);
    },
    benchmark: function(project) {
        var self = this;
        console.log("imagesgroup");
        var func = function () {
            self.view.refreshBenchmarkView();
            var tabs = $("#explorer > .browser").find(".nav-tabs");
            tabs.find('a[href=#tabs-benchmark-' + window.app.status.currentProject + ']').tab('show');
        };
        this.init(project, func);
    },
    useralgos : function(userjob) {

        new UserModel({id: userjob}).fetch({
            success: function (model, response) {
                new JobModel({id: model.get("job")}).fetch({
                    success: function (job, response) {
                        window.location = "#tabs-algos-"+job.get('project')+"-"+job.get('software')+"-" + job.get('id');
                    }
                });
            }
        });
    },

//    review : function(project) {
//        this.review(project,null,null)
//    },
    review : function(project,image,user,term) {
        console.log("review");
        var self = this;
        var func = function () {

            console.log("project="+project + " image="+image+" user="+user + " term="+term);

            if(user && (user=="null")) {
                user = null;
            }
            if(term && (term=="null")) {
                term = null;
            }

            console.log("Controller dashboard.review");
            self.view.refreshReview(image,user,term);
            var tabs = $("#explorer > .browser").find(".nav-tabs");
            tabs.find('a[href=#tabs-reviewdash-' + window.app.status.currentProject + ']').tab('show');
        };
        this.init(project, func);
    },
    config: function (project) {
        console.log("config");
        var self = this;
        var func = function () {
            self.view.refreshConfigView();
            var tabs = $("#explorer > .browser").find(".nav-tabs");
            tabs.find('a[href=#tabs-config-' + window.app.status.currentProject + ']').click();
        };
        this.init(project, func);
    },

    usersConfig: function (project) {
        console.log("usersConfig");
        var self = this;
        var func = function () {
            self.view.refreshUsersConfigView();
            var tabs = $("#explorer > .browser").find(".nav-tabs");
            tabs.find('a[href=#tabs-usersconfig-' + window.app.status.currentProject + ']').click();
        };
        this.init(project, func);
    },

    dashboard: function (project, callback) {
        var self = this;
        console.log("dashboard");
        var func = function () {
            self.view.refreshDashboard();
            window.app.controllers.browse.tabs.triggerRoute = false;
            console.log("dashboard");
            var tabs = $("#explorer > .browser").find(".nav-tabs");
            console.log("tabs="+tabs.length);
            console.log("tabs.find="+tabs.find('#dashboardLink-' + window.app.status.currentProject));
            tabs.find('#dashboardLink-' + window.app.status.currentProject).click();
            window.app.controllers.browse.tabs.triggerRoute = true;
            if (callback != undefined) {
                callback.call();
            }

        };
        this.init(project, func);
    },

    createView: function (callback) {
        console.log("createView");
        var self = this;

        var nbCollectionToFetch = 7;
        var nbCollectionToFetched = 0;
        var collectionFetched = function (expected) {
            nbCollectionToFetched++;
            if (nbCollectionToFetched < expected) {
                return;
            }
            self.view = new ProjectDashboardView({
                model: window.app.status.currentProjectModel,
                el: $("#explorer-tab-content")
            }).render();
            callback.call();
        };
        new UserJobCollection({project: window.app.status.currentProject}).fetch({
            success: function (collection, response) {
                window.app.models.projectUserJob = collection;
                collectionFetched(nbCollectionToFetch);
            }
        });
        new UserCollection({project: window.app.status.currentProject}).fetch({
            success: function (collection, response) {
                window.app.models.projectUser = collection;
                collectionFetched(nbCollectionToFetch);
            }
        });
        new UserCollection({project: window.app.status.currentProject, admin:true}).fetch({
            success: function (collection, response) {
                window.app.models.projectAdmin = collection;
                collectionFetched(nbCollectionToFetch);
            }
        });
        new UserLayerCollection({project: window.app.status.currentProject}).fetch({
            success: function (collection, response) {
                window.app.models.userLayer = collection;
                collectionFetched(nbCollectionToFetch);
            }
        });
        new UserCollection({project: window.app.status.currentProject, representative:true}).fetch({
            success: function (representatives) {
                window.app.models.projectRepresentatives = representatives;
                collectionFetched(nbCollectionToFetch);
            }
        });


        new ProjectModel({id: window.app.status.currentProject}).fetch({
            success: function (model, response) {
                window.app.status.currentProjectModel = model;
                collectionFetched(nbCollectionToFetch);
                new OntologyModel({id: window.app.status.currentProjectModel.get("ontology")}).fetch({
                    success: function (model, response) {
                        window.app.status.currentOntologyModel = model;
                        window.app.status.currentTermsCollection = window.app.retrieveTerm(model);
                        collectionFetched(nbCollectionToFetch);
                    }
                });
            }
        });


    },

    destroyView: function () {
        $(".projectUserDialog").modal('hide');
        $(".projectUserDialog").remove();
        this.view = null;
    },

    showView: function () {
        $("#explorer > .browser").show();
        $("#explorer > .noProject").hide();
        window.app.view.showComponent(window.app.view.components.explorer);
    },

    // methods called when something has changed.
    // Reactive reloading
    refreshUserData: function () {
        var self = this;

        var nbCollectionToFetch = 2;
        var nbCollectionFetched = 0;

        var collectionFetched = function () {
            nbCollectionFetched++;
            if (nbCollectionFetched < nbCollectionToFetch) {
                return;
            }
            self.view.refreshUserData();
            window.app.controllers.browse.refreshUserData();

        };

        new UserCollection({project: window.app.status.currentProject}).fetch({
            success: function (collection) {
                window.app.models.projectUser = collection;
                collectionFetched();
            }
        });
        new UserLayerCollection({project: window.app.status.currentProject}).fetch({
            success: function (collection) {
                window.app.models.userLayer = collection;
                collectionFetched();
            }
        });
    },

    refreshRepresentativeData: function () {
        var self = this;
        new UserCollection({project: window.app.status.currentProject, representative:true}).fetch({
            success: function (representatives) {
                window.app.models.projectRepresentatives = representatives;
                self.view.updateRepresentatives();
            }
        });


    }
});
