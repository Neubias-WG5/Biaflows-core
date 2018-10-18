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

var ExplorerTabs = Backbone.View.extend({
    tagName: "div",
    triggerRoute: true,
    /**
     * ExplorerTabs constructor
     * @param options
     */
    initialize: function (options) {
        this.tabs = []; //that we are browsing
        this.container = options.container;
        this.dashboard = null;
    },
    /**
     * Grab the layout and call ask for render
     */
    render: function () {
        var self = this;
        require(["text!application/templates/explorer/Tabs.tpl.html"], function (tpl) {
            self.doLayout(tpl);
        });
        return this;
    },
    /**
     * Render the html into the DOM element associated to the view
     * @param tpl
     */
    doLayout: function (tpl) {
        $(this.el).html(_.template(tpl, {}));
        return this;
    },
    showLastTab : function(avoid) {
        console.log("avoid="+avoid);
        var i=(this.tabs.length-1);
        while(i>=0) {
            console.log("i="+i);
            console.log(this.tabs[i].idImage);
            if(this.tabs[i].idImage!=avoid) {
                var id = this.tabs[i].view.divPrefixId + "-" + this.tabs[i].idImage;  //$("#tabs-image-16829").tab('show');
                console.log("show:"+id);
                console.log($("#"+id).length);


                var millisecondsToWait = 250;
                setTimeout(function() {
                    // Whatever you want to do after the wait
                    console.log("#"+id);
                    $("#"+id).tab('show');
                }, millisecondsToWait);

                break;
            }
            i--;
        }
    },
    /**
     *  Add a Tab containing a BrowseImageView instance
     *  @idImage : the id of the Image we want to display
     *  @options : some init options we want to pass the the BrowseImageView Instance
     */
    addBrowseImageView: function (idImage, options,merge, callback) {
        var self = this;
        var tab = this.getImageView(idImage);
        if (tab != null) {
            //open tab if already exist
            tab.view.show(options);
            self.showImageTab(idImage, "image");
            return;
        }
        tab = this.getImageView("review-" + idImage);
        if (tab != null) {
            //close review tab for this image if already exist
            $("#closeTabtabs-review-" + idImage).click()
        }

        var tabs = $("#explorer-tab-content");
        console.log("BrowseImageView");
        var view = new BrowseImageView({
            addToTab: function () {
                self.addImageTab(view, false)
            },
            initCallback: function () {
                view.show(options);
                if(callback) {
                    callback();
                }
            },
            el: tabs,
            merge : merge
        });
        self.tabs.push({idImage: idImage, view: view});

        var openTab = function(model) {
            view.model = model.image;
            view.render();
            if(model.position) {
                view.position = {x:model.x,y:model.y,zoom:model.zoom}
            }

            self.showImageTab(idImage, "image");
            if(view.map !== null){
                view.map.updateSize();
                view.map.zoomToMaxExtent();
            }
        };

        var imageNew = window.app.popNewImage();
        if(imageNew && imageNew.image && imageNew.image.id==idImage) {
            openTab(imageNew)
        } else {
            new ImageInstanceModel({id: idImage}).fetch({
                success: function (model, response) {
                    openTab({image:model, position: false});
                }
            });
        }
    },
    /**
     *  Reload a Tab containing a BrowseImageView instance
     *  @idImage : the id of the Image we want to display
     */
    refreshBrowseImageView: function (idImage) {
        var self = this;
        var tab = this.getImageView(idImage);
        var isReview = tab == null;
        tab = (tab == null ? this.getImageView("review-"+idImage): tab);
        if (tab != null) {
            //refresh only opened tab

            var tabs = $("#explorer-tab-content");
            var view;
            for(var i=0;i<self.tabs.length;i++) {
                if(self.tabs[i].idImage == idImage || (isReview && self.tabs[i].idImage == "review-"+idImage)){
                    view = self.tabs[i].view;
                    break;
                }
            }

            new ImageInstanceModel({id: idImage}).fetch({
                success: function (model, response) {
                    view = new BrowseImageView({
                        addToTab: function () {
                            self.refreshTab(view.model.id, view.divPrefixId, model);
                        },
                        el: tabs,
                        review: view.review,
                        merge : view.merge
                    });
                    view.model = model;
                    view.render();
                    if(view.model.position) {
                        view.position = {x:model.x,y:model.y,zoom:model.zoom}
                    }

                }
            });
        }
    },
    addImageTab: function (browseImageView, review) {

        var self = this;

        var tabs = $('#explorer-tab');

        var tabTpl =
            "<li>" +
            "<a style='float: left;' id='" + browseImageView.divPrefixId + "-<%= idImage %>' rel='tooltip' title='<%= filename %>' href='#" + browseImageView.divPrefixId + "-<%= idProject %>-<%= idImage %>-' data-toggle='tab'>" +
            "<i class='icon-search'></i><span> <%= shortOriginalFilename %> </span>" +
            "</a>" +
            "</li>";

        var tmpName = browseImageView.model.getVisibleName(window.app.status.currentProjectModel.get('blindMode'));

        tabs.append(_.template(tabTpl, {
                idProject: window.app.status.currentProject, idImage: browseImageView.model.get('id'),
                filename: tmpName,
                shortOriginalFilename: tmpName
            })
        );
        self.refreshTab(browseImageView.model.get('id'), browseImageView.divPrefixId, browseImageView.model)
        var dropdownTpl = '<li class="dropdown"><a href="#" id="' + browseImageView.divPrefixId + '-<%= idImage %>-dropdown" class="dropdown-toggle" data-toggle="dropdown"><b class="caret"></b></a><ul class="dropdown-menu"><li><a href="#tabs-dashboard-<%= idProject %>" data-toggle="tab" data-image="<%= idImage %>" class="closeTab" id="closeTab' + browseImageView.divPrefixId + '-<%= idImage %>"><i class="icon-remove" /> Close</a></li></ul></li>';
        tabs.append(_.template(dropdownTpl, { idProject: window.app.status.currentProject, idImage: browseImageView.model.get('id'), filename: browseImageView.model.get('filename')}));

        if(review) {
            $("#closeTabtabs-review-" + browseImageView.model.id).on("click", function (e) {
                var idImage = $(this).attr("data-image");
                self.removeImageTab(idImage, "review");
                self.showLastTab(idImage);
            });
        } else {
            $("#closeTabtabs-image-" + browseImageView.model.id).on("click", function (e) {
                var idImage = $(this).attr("data-image");
                self.removeImageTab(idImage, "image");
                self.showLastTab(idImage);
                window.app.status.currentImages.splice($.inArray(idImage, $.map(window.app.status.currentImages, function(a) {return a.image})));
            });
        }
    },
    addUserActivityTab: function (userActivityView) {

        var self = this;

        var tabs = $('#explorer-tab');

        var tabTpl =
            "<li>" +
            "<a style='float: left;' id='" + "tabs-useractivity-<%= idUser %>' rel='tooltip' title='Activity of <%= username %>' href='#" + userActivityView.divId + "' data-toggle='tab'>" +
            "<i class='icon-search'></i><span> Activity of <%= username %></span>" +
            "<button type='button' id='closeTab-useractivity-<%= idUser %>' data-user='<%= idUser %>'  class='close' style='margin-left: 5px; margin-right: -5px;margin-top: -10px'>×</button>" +
            "</a>" +
            "</li>";

        tabs.append(_.template(tabTpl, {
                idProject: window.app.status.currentProject,
                username: userActivityView.model.get('username'),
                idUser: userActivityView.model.get('id')
            })
        );

        $("#closeTab-useractivity-" + userActivityView.model.id).on("click", function (e) {
            var idUser = $(this).attr("data-user");
            self.removeUserActivityTab(idUser);
            window.app.controllers.browse.navigate("#tabs-usersconfig-" + window.app.status.currentProject, true);
        });
    },
    addUserActivityView: function (idUser, options, callback) {
        var self = this;
        var tab = this.getUserActivityView(idUser);
        if (tab != null) {
            //open tab if already exist
            tab.view.show(options);
            self.showUserActivityTab(idUser, "image");
            return;
        }

        var tabs = $("#explorer-tab-content");
        console.log("ProjectUserActivityView");
        var view = new ProjectUserActivityView({
            addToTab: function () {
                self.addUserActivityTab(view)
            },
            el: tabs
        });
        self.tabs.push({idUser: idUser, view: view});

        var openTab = function(model) {
            view.model = model;
            view.render();
            self.showUserActivityTab(idUser);
        };

        new UserModel({id: idUser}).fetch({
            success: function (model, response) {
                openTab(model);
            }
        });
    },
    addReviewImageView: function (idImage, options,merge, callback) {
        var self = this;
        var tab = this.getImageView("review-" + idImage);
        if (tab != null) {
            //open tab if already exist
            tab.view.show(options);
            self.showImageTab(idImage, "review");
            return;
        }
        tab = this.getImageView(idImage);
        if (tab != null) {
            //close image tab for this image if already exist
            $("#closeTabtabs-image-" + idImage).click()
        }

        var tabs = $("#explorer-tab-content");
        var view = new BrowseImageView({
            addToTab: function () {
                self.addImageTab(view, true)
            },
            initCallback: function () {
                view.show(options)
                if(callback) {
                    callback();
                }
            },
            el: tabs,
            review: true,
            merge : merge
        });
        self.tabs.push({idImage: "review-" + idImage, view: view});
        var openTab = function(model) {
            view.model = model.image;
            console.log(view.model);
            view.render();
            self.showImageTab(idImage, "review");

            if (model.image.get("inReview") == false && model.image.get("reviewed") == false) {

                self.removeImageTab(idImage, "review");
                window.app.view.message("Review image", "You must first start reviewing picture before review it!", "warning");
            }
        }

        var imageNew = window.app.popNewImage();
        if(imageNew && imageNew.image && imageNew.image.id==idImage) {
            openTab(imageNew);
        } else {
            new ImageInstanceModel({id: idImage}).fetch({
                success: function (model, response) {
                    console.log("ImageInstanceModel="+idImage);
                    openTab({image:model, position: false});
                }
            });
        }
    },

    /**
     * Return the reference to a BrowseImageView instance
     * contained in a tab
     * @param idImage the ID of an Image contained in a BrowseImageView
     */
    getImageView: function (idImage) {
        var object = _.detect(this.tabs, function (object) {
            return object.idImage == idImage;
        });
        return object;
    },
    getUserActivityView: function (idUser) {
        var object = _.detect(this.tabs, function (object) {
            return object.idUser == idUser;
        });
        return object;
    },
    /**
     * Remove a Tab
     * @param index the identifier of the Tab
     */
    removeImageTab: function (idImage, prefix) {

        window.removeExploreInstance(idImage);

        var browseImageView = null

        if (prefix != "review") {
            browseImageView = this.getImageView(idImage);
        }
        else {
            browseImageView = this.getImageView("review-" + idImage);
        }

        // browseImageView.view.stopBroadcastingInterval();
        // browseImageView.view.stopWatchOnlineUsersInterval();
        var indexOf = this.tabs.indexOf(browseImageView);

        this.tabs.splice(indexOf, 1);
        var tabs = $('#explorer-tab');
        //Remove Tab
        $('#tabs-' + prefix + '-' + idImage).parent().remove();
        //Remove dropdown
        $('#tabs-' + prefix + '-' + idImage + "-dropdown").parent().remove();
        //Remove content
        $('#tabs-' + prefix + '-' + window.app.status.currentProject + '-' + idImage + '-').remove();
    },
    removeUserActivityTab: function (idUser) {

        var userActivityView = this.getUserActivityView(idUser);

        var indexOf = this.tabs.indexOf(userActivityView);

        this.tabs.splice(indexOf, 1);
        var tabs = $('#explorer-tab');
        //Remove Tab
        $('#tabs-useractivity-' + idUser).parent().remove();
        //Remove content
        $('#tabs-useractivity-' + window.app.status.currentProject + '-' + idUser).remove();
    },
    /**
     * Reload a Tab
     * @param index the identifier of the Tab
     */
    refreshTab: function (idImage, divPrefixId, model) {

        var isAdmin = window.app.status.currentProjectModel.isAdmin(window.app.models.projectAdmin);
        var name = model.getVisibleName(window.app.status.currentProjectModel.get('blindMode'), isAdmin);
        if(isAdmin) {
            if(window.app.status.currentProjectModel.get('blindMode')) {
                name = name[1] +" | "+ name[0];
            } else {
                name = name[0];
            }
        }

        var shortOriginalFilename = model.getVisibleName(window.app.status.currentProjectModel.get('blindMode'));
        if (shortOriginalFilename.length > 25) {
            shortOriginalFilename = shortOriginalFilename.substring(0, 23) + "...";
        }

        //Change title
        $('#' + divPrefixId + '-' + idImage).attr("title", name);
        //Change content
        $('#' + divPrefixId + '-' + idImage+' span').html(shortOriginalFilename);
    },
    /**
     * Show a tab
     * @param idImage the identifier of the Tab
     */
    showImageTab: function (idImage, prefix) {
        window.app.status.currentImage = {};
        window.app.status.currentImage.idImage = idImage;
        window.app.status.currentImage.prefix = prefix;
        var tabs = $('#explorer-tab');
        window.app.controllers.browse.tabs.triggerRoute = false;
        $('#tabs-' + prefix + '-' + idImage).click();
        window.app.controllers.browse.tabs.triggerRoute = true;
    },
    showUserActivityTab: function (idUser, prefix) {
        var tabs = $('#explorer-tab');
        window.app.controllers.browse.tabs.triggerRoute = false;
        $('#tabs-useractivity-' + idUser).click();
        window.app.controllers.browse.tabs.triggerRoute = true;
    },
    /**
     * Go to a specific image and close another one (usefull for next/previous or multidim go to)
     */
    goToImage : function(idImageToOpen,idProject, idImageToClose, mode, imageToOpen,x,y,zoom,merge) {
        var self = this;
        if(imageToOpen && x) {
            window.app.setNewImageWithPosition(imageToOpen,x,y,zoom);
        } else if(imageToOpen) {
            window.app.setNewImage(imageToOpen);
        }
        window.app.controllers.browse.tabs.removeImageTab(idImageToClose,mode) //TODO support REVIEW TOO!!!!

        if(merge) {
            mode = mode +"mergechannel"
        }
        console.log("goTo"+"#tabs-" + mode + "-"+idProject+"-"+idImageToOpen+"-") ;
        var urldest = "#tabs-" + mode + "-"+idProject+"-"+idImageToOpen+"-"

        if(window.location.hash==urldest) {
            window.location.reload();
        } else {
            window.location = urldest
        }
    },

    /**
     * Return the number of opened tabs
     */
    size: function () {
        return _.size(this.tabs);
    },
    /**
     * Close all the Tabs
     */
    closeAll: function () {
        var tabs = $(this.el).children('.tabs');
        this.tabs = [];
        $(this.el).hide();
        $(this.el).parent().find('.noProject').show();
    },
    /**
     * Add a ProjectDashBoardView instance in the first Tab
     * @param dashboard the ProjectDashBoardView instance
     */
    addDashboard: function (dashboard) {
        var self = this;
        this.dashboard = dashboard;

        // If the project name is too long, we truncate it.
        var projectName = window.app.status.currentProjectModel.attributes.name;
        if(projectName.length > 30) {
            projectName = projectName.substring(0, 13) + "..." + projectName.substring(projectName.length-14, projectName.length);
        }
        var tabs = $('#explorer-tab');
        tabs.append(_.template("<li class='custom-ui-project-dashboard-tab' id='project-dashboard-tab'><a id='dashboardLink-<%= idProject %>' href='#tabs-dashboard-<%= idProject %>' data-toggle='tab'><i class='icon-road' /> <%= name %></a></li>", { idProject: window.app.status.currentProject, name: projectName}));
        tabs.append(_.template("<li class='custom-ui-project-images-tab' id='project-images-tab'><a href='#tabs-images-<%= idProject %>' data-toggle='tab'><i class='icon-picture' /> Images</a></li>", { idProject: window.app.status.currentProject}));
        tabs.append(_.template("<li class='custom-ui-project-imagegroups-tab' id='project-imagegroups-tab'><a href='#tabs-groups-<%= idProject %>' data-toggle='tab'><i class='icon-picture' /> ImageGroups</a></li>", { idProject: window.app.status.currentProject}));
        tabs.append(_.template("<li class='custom-ui-project-annotations-tab' id='project-annotations-tab' style='display:none;'><a href='#tabs-annotations-<%= idProject %>' data-toggle='tab'><i class='icon-pencil' /> Annotations</a></li>", { idProject: window.app.status.currentProject}));
        tabs.append(_.template("<li class='custom-ui-project-properties-tab' id='project-properties-tab' style='display:none;'><a class='annotationTabLink' href='#tabs-properties-<%= idProject %>' data-toggle='tab'><i class='icon-list' /> Properties</a></li>", { idProject: window.app.status.currentProject}));
        tabs.append(_.template("<li class='custom-ui-project-jobs-tab' id='project-jobs-tab' style='display:none;'><a href='#tabs-algos-<%= idProject %>' data-toggle='tab'><i class='icon-tasks' /> Jobs</a></li>", { idProject: window.app.status.currentProject}));
        tabs.append(_.template("<li class='custom-ui-project-configuration-tab' id='project-configuration-tab' style='display:none;'><a href='#tabs-config-<%= idProject %>' data-toggle='tab'><i class='icon-wrench' /> Configuration</a></li>", { idProject: window.app.status.currentProject}));
        tabs.append(_.template("<li class='custom-ui-project-usersconfiguration-tab' id='project-usersconfiguration-tab' style='display:none;'><a href='#tabs-usersconfig-<%= idProject %>' data-toggle='tab'><i class='icon-wrench' /> Users</a></li>", { idProject: window.app.status.currentProject}));
        tabs.append(_.template("<li class='custom-ui-project-review-tab' id='project-review-tab'><a href='#tabs-reviewdash-<%= idProject %>' data-toggle='tab'><i class='icon-chevron-down' /> Review</a></li>", { idProject: window.app.status.currentProject}));

        //hide review tab
        tabs.find("a[href='#tabs-reviewdash-"+window.app.status.currentProject+"']").parent().hide();


        CustomUI.customizeUI(function() {CustomUI.hideOrShowComponents();});



        tabs.on('click','a[data-toggle="tab"]', function (e) {
            var hash = this.href.split("#")[1];
            $("#" + hash).attr('style', 'overflow:none;');
            if (self.triggerRoute) {
                window.app.controllers.browse.navigate("#" + hash, self.triggerRoute);
            }
        });

        $("#explorer > .browser").show();
        $("#explorer > .noProject").hide();

    },
    /**
     * Ask to the dashboard view to refresh
     */
    getDashboard: function () {
        return this.dashboard;
    },

    // methods called when something has changed.
    // Reactive reloading
    refreshUserData: function () {
        for(var i = 0; i< this.tabs.length; i++){
            this.tabs[i].view.refreshUserData();
        }
    }

});
