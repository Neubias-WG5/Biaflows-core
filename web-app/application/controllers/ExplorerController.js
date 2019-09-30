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

var ExplorerController = Backbone.Router.extend({

    tabs: null,

    routes: {
        "tabs-annotation-:idAnnotation": "browseAnnotation",
        "tabs-image-:idProject-:idImage-": "browseSimple",
        "tabs-imagemergechannel-:idProject-:idImage-": "browseChannel",
        "tabs-image-:idProject-:idImage-:idAnnotation": "browse",
        "tabs-imagegroup-:idProject-:idGroup": "browseGroup",
        "tabs-review-:idProject-:idImage-": "reviewSimple",
        "tabs-reviewmergechannel-:idProject-:idImage-": "reviewChannel",
        "tabs-useractivity-:idProject-:idUser": "userActivity"

    },

    initialize: function () {
    },

    initTabs: function () { //SHOULD BE OUTSIDE OF THIS CONTROLLER
        this.tabs = new ExplorerTabs({
            el: $("#explorer > .browser"),
            container: window.app.view.components.explorer
        }).render();
        window.app.status.currentImages = [];
    },

    browseAnnotation: function (idAnnotation) {
        var self = this;
        console.log("browseAnnotation");
        //allow to access an annotation without knowing its projet/image (usefull to access annotation when we just have annotationTerm data).
        new AnnotationModel({id: idAnnotation}).fetch({
            success: function (model, response) {
                self.browse(model.get("project"), model.get("image"), idAnnotation);
            }
        });
    },

    browseSimple: function (idProject, idImage, idAnnotation) {
        this.browse(idProject,idImage,idAnnotation,undefined);
    },
    browseChannel: function (idProject, idImage, idAnnotation) {
        this.browse(idProject,idImage,idAnnotation,"channel");
    },
    browse: function (idProject, idImage, idAnnotation,merge, callback) {
        $(window).scrollTop(0);
        /*
         if (window.app.secondaryWindow) {
         window.app.secondaryWindow.location = window.location;
         }
         */
        var self = this;
        //create tabs if not exist
        if (this.tabs == null) {
            this.initTabs();
        }
        var createBrowseImageViewTab = function () {
            var browseImageViewInitOptions = {};
            if (idAnnotation != "" && idAnnotation !== "0") {
                browseImageViewInitOptions.goToAnnotation = {value: idAnnotation};
            }
            console.log("addBrowseImageView");
            self.tabs.addBrowseImageView(idImage, browseImageViewInitOptions,merge,callback);
            self.showView();

            // record the image consultation for the current user
            // new ImageConsultationModel({
            //     image: idImage,
            //     mode : "view"
            // }).save();

            if($.inArray(idImage, $.map(window.app.status.currentImages, function(a) {return a.image}))<0) {
                window.app.status.currentImages.push({image: idImage, review:false});
            }
        };

        if (window.app.status.currentProject == undefined || window.app.status.currentProject != idProject) {//direct access -> create dashboard
            window.app.controllers.dashboard.dashboard(idProject, createBrowseImageViewTab);
            return;
        }

        createBrowseImageViewTab();
    },

    browseGroup: function (idProject, idGroup) {
        var imageGroup = new ImageGroupModel({id:idGroup});
        var callBack = function (){
            var zStack = imageGroup.zstack;
            var zMean = zStack[Math.floor(zStack.length/2)];
            var imageSeq = new ImageSequenceModel({group: idGroup, zstack : zMean, slice : imageGroup.slice[0],
                time: imageGroup.time[0], channel: imageGroup.channel[0]});
            imageSeq.fetch({
                success: function (model) {
                    window.location = '#tabs-image-' + idProject + '-' + model.get("image") + '-0';
                }
            });
        };
        imageGroup.feed(callBack);
    },
    refreshImage: function (idImage){
        var self = this;
        if($.inArray(idImage, $.map(window.app.status.currentImages, function(a) {return Number(a.image)}))>=0) {
            self.tabs.refreshBrowseImageView(idImage);
        }
    },

    reviewSimple: function (idProject, idImage) {
        this.review(idProject,idImage,undefined);
    },
    reviewChannel: function (idProject, idImage) {
        this.review(idProject,idImage,"channel");
    },
    review: function (idProject, idImage,merge, callback) {
        $(window).scrollTop(0);

        var self = this;
        //create tabs if not exist
        if (this.tabs == null) {
            console.log("this.tabs==null");
            this.initTabs();
        }
        var createReviewImageViewTab = function () {
            console.log("createReviewImageViewTab");
            var reviewImageViewInitOptions = {};
            self.tabs.addReviewImageView(idImage, reviewImageViewInitOptions,merge,callback);
            //$('#tabs-image-'+idImage).tab('show');
            // window.app.view.showComponent(self.tabs.container);
            console.log("showView");

            self.showView();

            // record the image consultation for the current user
            // new ImageConsultationModel({
            //     imageinstance: idImage,
            //     mode : "review"
            // }).save();

            if($.inArray(idImage, $.map(window.app.status.currentImages, function(a) {return a.image}))<0) {
                window.app.status.currentImages.push({image: idImage, review:true});
            }
        };

        if (window.app.status.currentProject == undefined || window.app.status.currentProject != idProject) {//direct access -> create dashboard
            console.log("project check");
            window.app.controllers.dashboard.dashboard(idProject, createReviewImageViewTab);
            return;
        }

        createReviewImageViewTab();


    },

    userActivity: function (idProject, idUser, callback) {
        $(window).scrollTop(0);
        var self = this;
        //create tabs if not exist
        if (this.tabs == null) {
            this.initTabs();
        }
        var createUserActivityViewTab = function () {
            console.log("addUserActivityView");
            self.tabs.addUserActivityView(idUser, null/*browseImageViewInitOptions*/,callback);
            self.showView();
        };

        if (window.app.status.currentProject == undefined || window.app.status.currentProject != idProject) {//direct access -> create dashboard
            window.app.controllers.dashboard.dashboard(idProject, createUserActivityViewTab);
            return;
        }

        createUserActivityViewTab();
    },

    close: function (idImage, review) {
        this.tabs.removeImageTab(idImage, review? 'review': 'image')
        window.app.status.currentImages.splice($.inArray(idImage, $.map(window.app.status.currentImages, function(a) {return a.image})));
    },

    closeAll: function () {
        if (this.tabs == null) {
            return;
        }
        this.tabs = null;
        $("#explorer > .browser").empty();
    },

    showView: function () {
        $("#explorer > .browser").show();
        $("#explorer > .noProject").hide();
        window.app.view.showComponent(window.app.view.components.explorer);
    },

    // methods called when something has changed.
    // Reactive reloading
    refreshUserData: function () {
        this.tabs.refreshUserData();
    }


});