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


var LayerSwitcherPanel = SideBarPanel.extend({
    tagName: "div",

    /**
     * LayerSwitcherPanel constructor
     * @param options
     */
    initialize: function (options) {
        this.browseImageView = options.browseImageView;
        this.followInterval = null;
        this.userFollowed = null;
        this.vectorLayers = [];

        this.allVectorLayers = [];
        this.loadedVectorLayers = [];
        this.defaultVectorLayers = [];
    },
    /**
     * Grab the layout and call ask for render
     */
    render: function () {
        var self = this;
        require([
            "text!application/templates/explorer/LayerSwitcher.tpl.html"
        ], function (tpl) {
            self.doLayout(tpl);
        });
        return this;
    },
    addBaseLayer: function (layer, model) {
        var self = this;
        var radioName = "layerSwitch-" + model.get("id");
        //index of the layer in this.layers array
        var layerID = "layerSwitch-" + model.get("id") + "-" + new Date().getTime();

        var imageFilter = layer.imageFilter;
        if (imageFilter) {
            layerID += "-IF-"+imageFilter.id;
        }


        var liLayer = _.template("<li><input type='radio' id='<%=   id %>' name='<%=   radioName %>' checked/><span style='color : #ffffff;'> <%=   name %></span></li>",
            {id: layerID, radioName: radioName, name: layer.name.substr(0, 15)});
        $("#" + this.browseImageView.divId).find("#layerSwitcher" + this.model.get("id")).find(".baseLayers").append(liLayer);
        $("#" + layerID).change(function () {
            self.browseImageView.map.setBaseLayer(layer);
        });
    },
    addVectorLayer: function (layer, model, userID) {

        if(userID=="ROI"){
            return;
        }

        console.log("### addVectorLayer");
        console.log(model);
        var self = this;
        this.vectorLayers.push({ id: userID, vectorsLayer: layer.vectorsLayer});
        //index of the layer in this.layers array
        var layerID = "layerSwitch-" + model.get("id") + "-" + userID + "-" + new Date().getTime();
        var color = "#FFF";
        if (userID == "REVIEW") {
            color = "#5BB75B";
        }
        var button = '<button class="btn btn-xs btn-default removeImageLayers" id="removeImageLayers' + userID + '" data-user="' + userID + '" style="height:18px;"> <i class="glyphicon glyphicon-trash"></i></button>';


        var layerOptionTpl;
        if (layer.isOwner) {
            layerOptionTpl = _.template("<li style='display:none;' id='entry<%= userID %>'><input id='<%= id %>' class='showUser' type='checkbox'  value='<%= name %>' />&nbsp;&nbsp;<input type='checkbox' class='drawableLayer' data-user-id='<%= userID %>' checked/>&nbsp;&nbsp;<input type='checkbox' disabled/><span style='color :<%=   color %>;'> <%=   name %> <span class='numberOfAnnotation'></span></span>" + button + "</li>", {id: layerID, name: layer.vectorsLayer.name, color: color, userID: userID});
        } else if (userID != "REVIEW" && layer.user.get('algo')) {
            layerOptionTpl = _.template("<li style='display:none;' id='entry<%= userID %>' data-id='<%= userID %>'><input id='<%= id %>' class='showUser' type='checkbox' value='<%= name %>' />&nbsp;&nbsp;<input type='checkbox' class='drawableLayer' disabled/>&nbsp;&nbsp;<input type='checkbox' class='followUser' data-user-id='<%= userID %>' disabled/>&nbsp;<span style='color : <%=   color %>;'><%= name %> <span class='numberOfAnnotation'></span></span></a>" + button + " <a href='#tabs-useralgo-<%= userID %>'>See job details...</a></li>", {userID: userID, id: layerID, name: layer.vectorsLayer.name, color: color});
        } else if (userID == "REVIEW") {
            layerOptionTpl = _.template("<li style='display:none;' id='entry<%= userID %>' data-id='<%= userID %>'><input id='<%= id %>' class='showUser' type='checkbox' value='<%= name %>' />&nbsp;&nbsp;<input type='checkbox' class='drawableLayer' disabled/>&nbsp;&nbsp;<input type='checkbox' class='followUser' data-user-id='<%= userID %>' disabled/>&nbsp;<span style='color : <%=   color %>;'><%= name %> <span class='numberOfAnnotation'></span></span></a>" + button + " </li>", {userID: userID, id: layerID, name: layer.vectorsLayer.name, color: color});
        } else {
            layerOptionTpl = _.template("<li style='display:none;' id='entry<%= userID %>' data-id='<%= userID %>'><input id='<%= id %>' class='showUser' type='checkbox' value='<%= name %>' />&nbsp;&nbsp;<input type='checkbox' class='drawableLayer' data-user-id='<%= userID %>'/>&nbsp;&nbsp;<input type='checkbox' class='followUser' data-user-id='<%= userID %>' disabled/>&nbsp;<span style='color : <%=   color %>;'><%= name %> <span class='numberOfAnnotation'></span></span></a>" + button + " </li>", {userID: userID, id: layerID, name: layer.vectorsLayer.name, color: color});
        }
        $("#" + this.browseImageView.divId).find("#layerSwitcher" + model.get("id")).find("ul.annotationLayers").append(layerOptionTpl);

        if(!self.browseImageView.isCurrentUserProjectAdmin()){
            if(window.app.status.currentProjectModel.get("isReadOnly") || (window.app.status.currentProjectModel.get("isRestricted") && window.app.status.user.id !== userID)){
                $("#layerSwitcher" + model.get("id")).find("#entry" + userID).find(".drawableLayer").attr("disabled", true);
            }
        }


        console.log("add layer!!!");

        layer.vectorsLayer.setVisibility(true);
        //update annotation proprety layers
        self.browseImageView.annotationProperties.updateAnnotationProperyLayers();
        $("#" + layerID).prop('checked', true);

        $("#" + layerID).click(function () {
            var checked = $(this).is(':checked');
            layer.vectorsLayer.setVisibility(checked);
            //update annotation proprety layers
            self.browseImageView.annotationProperties.updateAnnotationProperyLayers();
        });
        self.browseImageView.setLayerDrawable(layer.userID, layer.isOwner);

    },
    updateOnlineUsers: function (onlineUsers) {
        var self = this;
        var userList = $("#" + this.browseImageView.divId).find("#layerSwitcher" + this.model.get("id")).find("ul.annotationLayers");
        var projectUsers = _.pluck(window.app.models.projectUser.models, 'id');
        //check if the the user we are following is always connected, if not disconneted
        if (!_.include(onlineUsers, self.userFollowed)) {
            userList.find("li[data-id=" + self.userFollowed + "]").find('input.followUser').removeAttr('checked');
            self.stopFollowing();
        }
        _.each(projectUsers, function (userID) {
            if (!_.include(onlineUsers, userID)) {
                userList.find("li[data-id=" + userID + "]").find('span').css('color', 'white');
                userList.find("li[data-id=" + userID + "]").find('input.followUser').attr("disabled", "disabled");
            }
        });
        _.each(onlineUsers, function (userID) {
            userList.find("li[data-id=" + userID + "]").find('span').css('color', '#46a546');
            userList.find("li[data-id=" + userID + "]").find('input.followUser').removeAttr("disabled");
        });
    },
    startFollowing: function () {
        var self = this;
        window.app.view.message("", "Start following " + window.app.models.projectUser.get(self.userFollowed).prettyName(), "success");
        var image = this.model.get("id");
        var project = this.model.get("project");
        this.followInterval = window.app.view.addInterval(function () {
            // horrible hack. only do GET if we are currently looking at the image
            if($("#tabs-image-"+project+"-"+image+"-").hasClass("active")){
                new UserPositionModel({ image: image, user: self.userFollowed }).fetch({
                    success: function (model, response) {
                        self.browseImageView.goToLocation(model.get("x"), model.get("y"), model.get("zoom"));
                        var layerWrapper = _.detect(self.vectorLayers, function (item) {
                            return item.id == self.userFollowed;
                        });
                        if (layerWrapper) {
                            layerWrapper.vectorsLayer.refresh();
                        }
                    },
                    error: function (model, response) {
                    }
                });
            }
        }, 1000);
    },
    stopFollowing: function () {
        var self = this;
        if (self.followInterval != undefined) {
            window.app.view.message("", "Stop following " + window.app.models.projectUser.get(self.userFollowed).prettyName(), "success");
            if(self.followInterval) clearInterval(self.followInterval.loop);
            self.followInterval = null;
            self.userFollowed = null;
        }
    },
    /**
     * Render the html into the DOM element associated to the view
     * @param tpl
     */
    doLayout: function (tpl) {
        var self = this;
        var content = _.template(tpl, {id: self.model.get("id"), isDesktop: !window.app.view.isMobile});
        var mapDiv = $("#" + this.browseImageView.divId);
        mapDiv.find("#layerSwitcher" + self.model.get("id")).html(content);

        mapDiv.on('change', ".followUser", function (e) {
            var userToFollow = this;
            var followUser = $(this).is(':checked');
            $("#" + self.browseImageView.divId).find("#layerSwitcher" + self.model.get("id")).find('.followUser:checked').each(function () {
                if (userToFollow != this) {
                    $(this).attr('checked', false);
                }
            });
            self.stopFollowing();
            if (!followUser) {
                return;
            }
            self.userFollowed = $(this).attr("data-user-id");
            self.startFollowing();

        });

        $("#selectLayersIcon" + self.model.get("id")).off("click");

        $(document).on("change", "#selectLayersIcon" + self.model.get("id"), function (event) {
            console.log("change user annotation");
            var userList = $("#" + self.browseImageView.divId).find("#layerSwitcher" + self.model.get("id")).find("ul.annotationLayers");
            var projectUsers = _.pluck(window.app.models.projectUser, 'id');
            var almostOneCheckedState = false;
            _.each(projectUsers, function (userID) {
                var checked = userList.find("li[data-id=" + userID + "]").find('input.showUser').is(':checked');
                if (!almostOneCheckedState && checked) {
                    almostOneCheckedState = true;
                }
            });
            if (userList.find("li[data-id=REVIEW]").find('input.showUser').is(':checked')) {
                almostOneCheckedState = true;
            }
            self.browseImageView.setAllLayersVisibility(!almostOneCheckedState);
        });

        $(self.el).on("click", ".drawableLayer", function (event) {
            self.browseImageView.setLayerDrawable($(this).data("userId"), $(this).is(":checked"));
        });

        var el = $('#layerSwitcher' + self.model.get('id'));
        var elContent1 = el.find(".layerSwitcherContent1");
        var sourceEvent1 = el.find(".toggle-content1");
        var sourceEvent2 = el.find(".toggle-content2");
        var elContent2 = el.find(".layerSwitcherContent2");
        this.initToggle(el, elContent1, sourceEvent1, "layerSwitcherContent1");
        this.initToggle(el, elContent2, sourceEvent2, "layerSwitcherContent2");

        $("#" + this.browseImageView.divId).find("#opacitySelectionSlider").slider({
            min: 0,
            max: 100,
            value: 50,
            change: function (event, ui) {
                console.log(ui);
                self.browseImageView.setOpacity(ui.value,ui.value);
            }
        });

    },
    roiLayer : null,
    showROI : function() {
        var self = this;
        console.log("### SHOW ROI");
        if(!self.roiLayer) {
            self.roiLayer = new AnnotationLayer(null, "ROI layer", self.model.get('id'), "ROI", "", self.browseImageView.ontologyPanel.ontologyTreeView, self.browseImageView, self.browseImageView.map, self.browseImageView.review);
            self.roiLayer.isOwner = false;
            self.loadedVectorLayers.push({ id: "ROI", user: 0});
            self.roiLayer.loadAnnotations(self.browseImageView);
            self.roiLayer.vectorsLayer.setVisibility(true);
        } else {
            self.roiLayer.vectorsLayer.setVisibility(true);
        }
        self.browseImageView.refreshLayers();

    },
    hideROI : function() {
        var self = this;
        if(self.roiLayer) {
            self.roiLayer.vectorsLayer.setVisibility(false);
            self.browseImageView.refreshLayers();
        }

    },
    initLayerSelection: function () {
        var self = this;
        var select = $("#selectLayerSwitcher" + self.model.id);
        select.empty();

        //add all available layer on select
        _.each(self.allVectorLayers, function (layer) {
            if(layer.user==null) {
                select.append('<option style="color:#000000;" value="' + layer.id + '">Review Layer</option>');
            } else {
                select.append('<option style="color:#000000;" value="' + layer.id + '">' + layer.user.layerName() + '</option>');
            }

        });

        var panel = $("#layerSwitcher" + self.model.get("id"));


        //if click on add layer
        panel.find("#addImageLayers" + self.model.get("id")).unbind();
        panel.find("#addImageLayers" + self.model.get("id")).click(function () {


            var option = select.find("option[value=" + select.val() + "]");
            option.hide();
            if (!self.disableEvent) {
                console.log("### show user click");


                var layer = _.find(self.allVectorLayers, function (user) {
                    return user.id == select.val();
                });
                var alreadyExist = _.find(self.loadedVectorLayers, function (user) {
                    return user.id == select.val();
                });


                var item;
                if (!alreadyExist) {
                    //if not yet added, create layer

                    var user = layer.user;

                    self.addLayerEvent(user, false);
                    item = panel.find("#entry" + select.val());
                } else {
                    item = panel.find("#entry" + select.val());
                    item.show();
                }

                console.log("item="+select.val());
                console.log("layer is checked?="+item.find(".showUser").is(":checked"));
                //force click on show layer to set layer visible = true
                if (!item.find(".showUser").is(":checked")) {

                    item.find(".showUser").click();

                }
                console.log("layer is checked?="+item.find(".showUser").is(":checked"));
            }
            select.val(select.find("option:visible").val());

            var item = panel.find("#entry" + window.app.status.user.id);

            self.browseImageView.reinitControls();
        });
        panel.find("#layerComp" + self.model.get("id")).show();
        panel.find(".removeImageLayers").show();

        self.showDefaultLayers();
    },
    addLayerEvent: function (user, defaultLayer) {

        var self = this;
        var layerAnnotation;

        if(user!=null) {
            console.log("### create layer: "+user.prettyName());
            layerAnnotation = new AnnotationLayer(user, user.prettyName(), self.model.get('id'), user.get('id'), user.get('color'), self.browseImageView.ontologyPanel.ontologyTreeView, self.browseImageView, self.browseImageView.map, self.browseImageView.review);
            layerAnnotation.isOwner = (user.get('id') == window.app.status.user.id);
            self.loadedVectorLayers.push({ id: user.id, user: user});

        } else {
            console.log("### create layer: Review layer");
            layerAnnotation = new AnnotationLayer(null, "Review layer", self.model.get('id'), "REVIEW", "", self.browseImageView.ontologyPanel.ontologyTreeView, self.browseImageView, self.browseImageView.map, self.browseImageView.review);
            layerAnnotation.isOwner = false;
            self.loadedVectorLayers.push({ id: "REVIEW", user: user});
        }

        var panel = $("#layerSwitcher" + self.model.get("id"));
        layerAnnotation.loadAnnotations(self.browseImageView);

        var item = panel.find(user!=null? "#entry" + user.get('id') : "#entryREVIEW");
        item.show();


        if(!defaultLayer) {
            if(user!=null) {
                self.registerRemoveLayerButton(user.get('id'));
            } else {
                self.registerRemoveLayerButton("REVIEW");
            }

            self.registerRemoveLayerButton();
        } else {
            // delete the remove button
            $("#layerSwitcher" + self.model.get("id")).find("#removeImageLayers" + user.get('id')).remove();

            // apply tooltip and italic style
            var li = $("#entry"+ user.get('id'));
            li.attr({
                "data-toggle" : "tooltip",
                "title" : "Default Layer"
            });
            li.find("span").attr({
                "style": $(li.find("span")).attr("style") + "font-style: italic;"
            });
        }
    },
    registerRemoveLayerButton: function (idLayer) {
        var self = this;
        self.disableEvent = true;
        var panel = $("#layerSwitcher" + self.model.get("id"));
        var select = $("#selectLayerSwitcher" + self.model.id);
        panel.find("#removeImageLayers" + idLayer).click(function () {
            var button = $(this);
            var user = button.data("user");
            var option = select.find("option[value=" + user + "]");
            var item = panel.find("#entry" + user);
            option.show();
            if (!self.disableEvent) {
                if (item.find(".showUser").is(":checked")) {
                    item.find(".showUser").click();
                }
            }
            item.hide();
        });
        self.disableEvent = false;
    },
    showDefaultLayers: function () {
        var self = this;

        self.showLayer(window.app.status.user.id);

        var elementsToWait = 0;

        for(var i = 0; i < self.defaultVectorLayers.length; i++) {
            if(self.defaultVectorLayers[i].userId != window.app.status.user.id){

                var isInTheList = _.find(self.allVectorLayers, function (user) {
                    return user.id == self.defaultVectorLayers[i].userId;
                });
                if(isInTheList == undefined) {
                    elementsToWait++;
                }
            }
        }

        var loadedElements = 0;

        var checkNonHideElement = function() {
            console.log("checkNonHideElement");
            for(var i = 0; i < self.defaultVectorLayers.length; i++) {
                if (self.defaultVectorLayers[i].hide) {
                    // checkbox for visibility is unchecked
                    if ($("#entry" + self.defaultVectorLayers[i].userId).find(".showUser").is(":checked")) {
                        $("#entry" + self.defaultVectorLayers[i].userId).find(".showUser").click();
                    }
                } else {
                    //show by default
                }
            }
        };

        for(var i = 0; i < self.defaultVectorLayers.length; i++) {
            if(self.defaultVectorLayers[i].userId != window.app.status.user.id){

                var isInTheList = _.find(self.allVectorLayers, function (user) {
                    return user.id == self.defaultVectorLayers[i].userId;
                });
                if(isInTheList == undefined) {
                    new UserModel({id: self.defaultVectorLayers[i].userId}).fetch({
                        success: function (model) {
                            self.addLayerEvent(model, true);
                            loadedElements++;
                            if(loadedElements == elementsToWait) {
                                checkNonHideElement();
                            }
                        }
                    });
                } else {
                    self.showLayer(self.defaultVectorLayers[i].userId);
                }
            }
        }
        console.log("elementsToWait");
        console.log(elementsToWait);
        if(elementsToWait == 0){
            // I wait than each UserModel are loaded but if there are no UserModel to load, I still need to call this function
            checkNonHideElement();
        }




    },
    showLayer: function (id) {
        var self = this;
        console.log("### showLayer " + id);
        var select = $("#selectLayerSwitcher" + self.model.id);
        select.val(id);
        var panel = $("#layerSwitcher" + self.model.get("id"));
        panel.find("#addImageLayers" + self.model.get("id")).click();
    },
    hideLayer: function (id) {
        var self = this;
        var panel = $("#layerSwitcher" + self.model.get("id"));
        panel.find("#removeImageLayers" + id).click();
    },
    getDisplayedLayers: function () {
        //TODO : make a function that return only user Layers (not Review and not job layers)
        // ticket #1075 GitHub
        return this.vectorLayers;
    }

});
