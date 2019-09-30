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
 * Created by IntelliJ IDEA.
 * User: lrollus
 * Date: 12/11/15
 * Time: 14:38
 * To change this template use File | Settings | File Templates.
 */
var ReviewPanel = SideBarPanel.extend({
    tagName: "div",
    userLayers: null,
    userJobLayers: null,
    reviewLayer: null,
    /**
     * ReviewPanel constructor
     * @param options
     */
    initialize: function (options) {
        this.browseImageView = options.browseImageView;
        this.userLayers = options.userLayers;
        this.userJobLayers = options.userJobLayers;
        this.printedLayer = [];
        this.layerName = {};
    },
    isLayerPrinted: function (layer) {

        console.log("isLayerPrinted " + layer);
        var isPresent = false;
        _.each(this.printedLayer, function (item) {
            if (item.id == layer) {
                isPresent = true;
            }
        });
        console.log("isLayerPrinted=" + isPresent);
        return isPresent;
    },
    /**
     * Grab the layout and call ask for render
     */
    render: function () {
        var self = this;
        require([
            "text!application/templates/explorer/ReviewPanel.tpl.html"
        ], function (tpl) {
            self.doLayout(tpl);
        });

        return this;
    },
    initControl: function (layerAnnotation) {
        var self = this;
        console.log("initControl=" + layerAnnotation.name);
        var selectFeature = new OpenLayers.Control.SelectFeature(layerAnnotation.vectorsLayer);
        var layer = layerAnnotation;
        layer.initControls(self.browseImageView, selectFeature);
        layer.registerEvents(self.browseImageView.map);
        layer.controls.select.activate();


        if (_.isFunction(self.browseImageView.initCallback)) {
            self.browseImageView.initCallback.call();
        }
        self.browseImageView.initAutoAnnoteTools();
    },
    /**
     * Add the review layer on the map
     */
    addReviewLayerToReview: function () {
        var self = this;

        var layer = "REVIEW";
        var layerAnnotation = new AnnotationLayer(null,layer, self.model.get('id'), 0, "#ff0000", self.browseImageView.ontologyPanel.ontologyTreeView, self.browseImageView, self.browseImageView.map, true);
        layerAnnotation.loadAnnotations(self.browseImageView);
        self.printedLayer.push({id: layer, vectorsLayer: layerAnnotation.vectorsLayer, layer: layerAnnotation});
        var selectFeature = new OpenLayers.Control.SelectFeature([layerAnnotation.vectorsLayer]);
        layerAnnotation.isOwner = true;
        layerAnnotation.initControls(self.browseImageView, selectFeature);
        layerAnnotation.registerEvents(self.browseImageView.map);
        self.browseImageView.userLayer = layerAnnotation;
        layerAnnotation.vectorsLayer.setVisibility(true);
        layerAnnotation.toggleIrregular();
        //Simulate click on None toolbar
        var toolbar = $("#" + self.browseImageView.divId).find('#toolbar' + self.model.get('id'));
        toolbar.find('a[id=select' + self.model.get('id') + ']').click();
        layerAnnotation.controls.select.activate();
        self.reviewLayer = layerAnnotation;
        _.each(this.printedLayer, function (item) {
            item.layer.controls.select.activate();
        });
    },
    /**
     * Add a specific user/job layer on the map
     * @param layer User/UserJob id
     */
    addLayerToReview: function (layer) {

        var self = this;
        console.log("----------");
        console.log(self.browseImageView.divId + " => " + layer);
        if (layer == undefined) {
            return;
        }

        var alreadyPrintBeforeLayer = null;
        _.each(self.printedLayer, function (elem) {
            if (elem.id == layer) {
                alreadyPrintBeforeLayer = elem.vectorsLayer
                alreadyPrintBeforeLayer.setVisibility(true);
            }
        });
        if (alreadyPrintBeforeLayer) {
            return;
        }


        var panelElem = $("#" + this.browseImageView.divId).find("#reviewPanel" + self.model.get("id"));
        //remeber if the current mode was "edit"
        var isEdit = ($("#" + self.browseImageView.divId).find('#toolbar' + self.model.get('id')).find('a#modify' + self.model.get('id') + ".active").length == 1)
        //disable edition
        $("#" + self.browseImageView.divId).find('#toolbar' + self.model.get('id')).find('a#none' + self.model.get('id')).click();

        self.reviewLayer.controls.select.unselectAll();
        self.reviewLayer.removeSelection(true);
        self.addToListLayer(layer);

        console.log("*********** Layer");
        console.log(layer);
        console.log("*********** User");
        console.log(user);
        console.log("*********** self.userLayers");
        console.log(self.userLayers);
        console.log("*********** self.userJobLayers");
        console.log(self.userJobLayers);
        console.log("*********** self.userLayers.get(layer)");
        console.log(self.userLayers.get(layer));
        console.log("*********** self.userJobLayers.get(layer)");
        console.log(self.userJobLayers.get(layer));

        var user = self.userLayers.get(layer);
        if (user == undefined) {
            user = self.userJobLayers.get(layer);
        }

        var layerAnnotation = new AnnotationLayer(user,user.prettyName(), self.model.get('id'), user.get('id'), user.get('color'), self.browseImageView.ontologyPanel.ontologyTreeView, self.browseImageView, self.browseImageView.map, true);
        layerAnnotation.isOwner = (user.get('id') == window.app.status.user.id);
        if (layerAnnotation.isOwner) {
            self.browseImageView.userLayer = layerAnnotation;
        }
        layerAnnotation.loadAnnotations(self.browseImageView);

        self.printedLayer.push({id: layer, vectorsLayer: layerAnnotation.vectorsLayer, layer: layerAnnotation});

// TODO start: DISABLE THIS IF MAGIC SUGGEST
//        //disable from selecy list
//        var selectElem = panelElem.find("#reviewChoice" + self.model.get("id")).find("select");
//        selectElem.find("option#" + layer).attr("disabled", "disabled");
////
////        //select the first not selected
//        selectElem.val(selectElem.find("option[disabled!=disabled]").first().attr("value"));
// TODO end: DISABLE THIS IF MAGIC SUGGEST
        var selectFeature = new OpenLayers.Control.SelectFeature(self.getVisibleVectorsLayer());

        layerAnnotation.initControls(self.browseImageView, selectFeature);
        layerAnnotation.registerEvents(self.browseImageView.map);

        if (layer.isOwner) {
            layerAnnotation.vectorsLayer.setVisibility(true);
            layerAnnotation.toggleIrregular();
            //Simulate click on None toolbar
        } else {
            //layerAnnotation.controls.select.activate();
        }
        _.each(this.printedLayer, function (item) {
            item.layer.controls.select.activate();
        });

        //force unnselected
        $("#" + self.browseImageView.divId).find('#toolbar' + self.model.get('id')).find('a#select' + self.model.get('id')).click();
        if (isEdit) {
            $("#" + self.browseImageView.divId).find('#toolbar' + self.model.get('id')).find('a#modify' + self.model.get('id')).click()
        }

    },
    getVisibleVectorsLayer: function () {
        var vectorLayers = _.map(this.printedLayer, function (layer) {
            return layer.vectorsLayer;
        });
        return vectorLayers;
    },
    /**
     * Remove a specific layer on the map
     * @param layer User/UserJob id
     */
    removeLayerFromReview: function (layer) {
        var self = this;
        var panelElem = $("#" + this.browseImageView.divId).find("#reviewPanel" + self.model.get("id"));
        //hide this layer
        _.each(self.printedLayer, function (elem) {
            if (elem.id == layer) {
                elem.vectorsLayer.setVisibility(false);
            }
        });
        //remove from layer list
        self.printedLayer = _.filter(self.printedLayer, function (elem) {
            return elem.id != layer
        });
        panelElem.find("#reviewLayerElem" + layer).replaceWith("");
// TODO start: DISABLE THIS IF MAGIC SUGGEST
        //enable from select list
//        var selectElem = panelElem.find("#reviewChoice" + self.model.get("id")).find("select");
//        selectElem.find("option#" + layer).removeAttr("disabled");
// TODO end: DISABLE THIS IF MAGIC SUGGEST
    },
    addVectorLayer: function (layer, model, userID) {
        var self = this;
        layer.vectorsLayer.setVisibility(true);
    },
    addToListLayer: function (layer) {
// TODO start: DISABLE THIS IF MAGIC SUGGEST

//        var self = this;
//        //disable from select box
//        var panelElem = $("#" + this.browseImageView.divId).find("#reviewPanel" + self.model.get("id"));
//        console.log("#######");
//        console.log(this.browseImageView.divId + "=>" + layer);
//
//
//        var isAlgo = self.userJobLayers.get(layer)!=null;     //
//
//        var jobdetails = "";
//        if(isAlgo) {
//            jobdetails =  '<a href="#tabs-useralgo-'+layer+'">See job details...</a>';
//        }
//
//
//
//
//       // add to list
//        panelElem.find("#reviewSelection" + self.model.id).append('<span style="display:block;" id="reviewLayerElem' + layer + '">' + self.layerName[layer] + '<i class="icon-remove icon-white" id="removeReviewLayer' + layer + '"></i> '+jobdetails+' </span>');
//        $("#removeReviewLayer" + layer).click(function (elem) {
//            self.removeLayerFromReview(layer);
//        });
// TODO end: DISABLE THIS IF MAGIC SUGGEST
    },
    currentSelection: [],
    doLayout: function (tpl) {
        var self = this;
        var el = $("#reviewPanel" + self.model.get("id"));
        var params = {id: self.model.get("id"), isDesktop: !window.app.view.isMobile};
        var content = _.template(tpl, params);
        el.html(content);
        self.showCurrentAnnotation(null);

        if (!self.model.get("reviewed")) {
            //image is not reviewed

            var selectElem = el.find("#reviewChoice" + self.model.get("id")).find("select");


            var json = []
            //fill select with all possible layers
            this.userLayers.each(function (layer) {
                self.layerName[layer.id] = layer.layerName();
// TODO start: DISABLE THIS IF MAGIC SUGGEST
//                selectElem.append('<option value="' + layer.id + '" id="' + layer.id + '">' + layer.layerName() + '</option>');
// TODO end: DISABLE THIS IF MAGIC SUGGEST
                json.push({id:layer.id,name:layer.layerName()});
            });

            console.log("userJobLayers="+this.userJobLayers.length);
            this.userJobLayers.each(function (layer) {
                if (!layer.get("isDeleted")) {
                    self.layerName[layer.id] = layer.layerName();
// TODO start: DISABLE THIS IF MAGIC SUGGEST
//                    selectElem.append('<option value="' + layer.id + '" id="' + layer.id + '">' + layer.layerName() + '</option>');
// TODO end: DISABLE THIS IF MAGIC SUGGEST
                    json.push({id:layer.id,name:layer.layerName()});
                }
            });

// TODO START: ENABLE THIS IF MAGIC SUGGEST
            console.log("el.find('#addReviewLayerSelect')="+el.find('#addReviewLayerSelect').length);

//<div id="addReviewLayerSelect" class="ms-ctn" style="width: 150px; height: 31px;">
//
//    <div id="ms-trigger-0" class="ms-trigger">
//        <div class="ms-trigger-ico">
//        </div>
//    </div>
//    <div class="ms-helper " style="display: none;">
//    </div>
//    <div id="ms-sel-ctn-0" class="ms-sel-ctn">
//        <div class="ms-sel-item ms-sel-text ">Rollus Loïc</div>
//        <input id="ms-input-0" type="text" class="" value="Type or click here" style="width: 30px;">
//        <input type="hidden" value="[16]">
//    </div>
//</div>

            var suggest = el.find('#addReviewLayerSelect').magicSuggest({
                resultAsString: true,
                width: 250,
                value: [window.app.status.user.id],
                data: json
            });
            self.currentSelection = [window.app.status.user.id]
//            suggest.render($("#addReviewLayerSelect"));

            $(suggest).on("selectionchange", function (e) {
                var newSelection = suggest.getValue();
                console.log("*************************** selectionchange ***************************");
                console.log(newSelection);
                _.each(newSelection,function(item) {
                    console.log(item);
                });



                console.log("newSelection="+_.pluck(newSelection, 'id'));


                console.log("currentSelection="+self.currentSelection);
                var toAdd = _.difference(newSelection, self.currentSelection);
                 console.log(toAdd);
                _.each(toAdd,function(id) {
                    self.currentSelection.push(id);
                    self.addLayerToReview(id);
                });

                var toRem =  _.difference(self.currentSelection,newSelection);
                console.log(toRem);
                _.each(toRem,function(id) {

                    self.currentSelection = _.difference(self.currentSelection,[id]);
                    self.removeLayerFromReview(id);
                });

           });
            el.find('#addReviewLayerSelect').find("#ms-input-0").css("width","30px");

 // TODO end: ENABLE THIS IF MAGIC SUGGEST

//            //init event
// TODO start: DISABLE THIS IF MAGIC SUGGEST

//            $("#addReviewLayers" + self.model.id).click(function () {
//                self.addLayerToReview(el.find("#reviewChoice" + self.model.get("id")).find("select").val());
//            });
// TODO end: DISABLE THIS IF MAGIC SUGGEST
            $("#reviewMultiple" + self.model.id).click(function () {
                self.addAllReviewAnnotation();
            });
            $("#unReviewMultiple" + self.model.id).click(function () {
                self.deleteAllReviewAnnotation();
            });
            $("#reviewValidate" + self.model.id).click(function () {
                self.validatePicture();
            });

            $('#showReviewLayer' + self.model.id).on('change',function () {
                self.reviewLayer.vectorsLayer.setVisibility($(this).is(':checked'));
            });

        } else {
            //image is validate
            var panel = $("#" + self.browseImageView.divId).find("#reviewPanel" + self.model.get("id"));
            panel.find('#showReviewLayer' + self.model.id).attr("disabled", "disabled");
// TODO end: DISABLE THIS IF MAGIC SUGGEST
//            panel.find("#addReviewLayerSelect" + self.model.id).attr("disabled", "disabled");
// TODO end: DISABLE THIS IF MAGIC SUGGEST
// TODO end: DISABLE THIS IF MAGIC SUGGEST

// TODO end: DISABLE THIS IF MAGIC SUGGEST
            panel.find("select").attr("disabled", "disabled");
            panel.find("#reviewMultiple" + self.model.id).attr("disabled", "disabled");
            panel.find("#addReviewLayers" + self.model.id).attr("disabled", "disabled");
            panel.find("#reviewValidate" + self.model.id).hide();
            panel.find("#reviewUnValidate" + self.model.id).show();

            $("#reviewUnValidate" + self.model.id).click(function () {
                self.unvalidatePicture();
            });

            //hide and lock action
            el.find("#currentReviewAnnotation" + self.model.get("id")).hide();
            el.find("#reviewChoice" + self.model.get("id")).hide();
            el.find(".toggleShowAnnotation").click(function (event) {
                event.preventDefault();
                return false;
            });
            el.find(".toggleShowLayers").click(function (event) {
                event.preventDefault();
                return false;
            });
            el.find(".toggleShowAction").click(function (event) {
                event.preventDefault();
                return false;
            });
        }

        var elContent1 = el.find(".reviewPanelContent1");
        var sourceEvent1 = el.find(".toggle-content1");
        var elContent2 = el.find(".reviewPanelContent2");
        var sourceEvent2 = el.find(".toggle-content2");
        var elContent3 = el.find(".reviewPanelContent3");
        var sourceEvent3 = el.find(".toggle-content3");
        this.initToggle(el, elContent1, sourceEvent1, "reviewPanelContent1");
        this.initToggle(el, elContent2, sourceEvent2, "reviewPanelContent2");
        this.initToggle(el, elContent3, sourceEvent3, "reviewPanelContent3");


        $("#" + self.browseImageView.divId).find("#opacitySelectionSliderReview").slider({
            min: 0,
            max: 100,
            value:50,
            change: function (event, ui) {
                 console.log( ui);
                self.browseImageView.setOpacity(ui.value);
            }
        });
    },
    /**
     * Accept curent annotation for review
     */
    addReviewAnnotation: function () {
        var self = this;
        var annotation = self.browseImageView.currentAnnotation;

        //get all term selected by the current user
        var terms = self.getSelectedTerm(annotation);

        //remove the based annotation from the layer
        self.browseImageView.removeFeature(annotation.id);
        new AnnotationReviewedModel({id: annotation.id}).save({terms: terms}, {
            success: function (model, response) {
                self.refreshAnnotation(response, annotation);
            },
            error: function (model, response) {
                var json = $.parseJSON(response.responseText);
                window.app.view.message("Annotation", json.errors, "error");
            }});
    },
    deleteReviewAnnotation: function () {
        var self = this;
        var annotation = self.browseImageView.currentAnnotation;
        self.browseImageView.removeFeature(annotation.id);
        new AnnotationReviewedModel({id: annotation.get('parentIdent')}).destroy({
            success: function (model, response) {
                window.app.view.message("Annotation rejected", "", "success");
                _.each(self.printedLayer, function (layer) {
                    layer.vectorsLayer.refresh();
                });
            },
            error: function (model, response) {
                var json = $.parseJSON(response.responseText);
                window.app.view.message("Annotation", json.errors, "error");
            }});
    },
    refreshAnnotation: function (response, annotation) {
        var self = this;
        //add the reviewed annotation on the layer + print message
        var newFeature = AnnotationLayerUtils.createFeatureFromAnnotation(response.reviewedannotation);
        var cropURL = annotation.get('cropURL');
        //var cropImage = _.template("<img src='<%=   url %>' alt='<%=   alt %>' style='max-width: 175px;max-height: 175px;' />", { url: cropURL, alt: cropURL});
        //var alertMessage = _.template("<p><%=   message %></p><div><%=   cropImage %></div>", { message: response.message, cropImage: cropImage});
        //var alertMessage = _.template("<p><%=   message %></p>", { message: response.message});
        window.app.view.message("Annotation reviewed", "", "success");
        self.reviewLayer.addFeature(newFeature);
        self.reviewLayer.controls.select.unselectAll();
        self.reviewLayer.controls.select.select(newFeature);
        _.each(self.printedLayer, function (layer) {
            layer.vectorsLayer.refresh();
        });
    },
    showCurrentAnnotation: function (annotation) {
        var self = this;
        console.log("showCurrentAnnotation=" + annotation);
        $("#currentReviewAnnotation" + self.model.id).empty();
        require([
            "text!application/templates/explorer/ReviewPanelSelectedAnnotation.tpl.html"
        ], function (tpl) {
            var params = {};
            var idAnnotation;

            //fill current annotation info
            if (annotation == null) {
                params = {id: self.model.get("id"), username: "", date: "", isReviewed: false, idAnnotation: ""};
                idAnnotation = "";
            }
            else {
                var user = window.app.models.projectUser.get(annotation.get("user"));
                if (user == undefined) {
                    user = window.app.models.projectUserJob.get(annotation.get("user"));
                }
                params = {id: self.model.get("id"), username: user.prettyName(), date: window.app.convertLongToDate(annotation.get("created")), isReviewed: annotation.get("reviewed"), idAnnotation: annotation.id }
                idAnnotation = annotation.id;
            }
            var content = _.template(tpl, params);
            $("#currentReviewAnnotation" + self.model.id).append(content);

            if (params.idAnnotation == "") {
                //no annotation selected
                $("#currentReviewAnnotation" + self.model.id).find("#reviewSingle" + idAnnotation).attr("disabled", "disabled");
                $("#currentReviewAnnotation" + self.model.id).find("#unreviewSingle" + idAnnotation).attr("disabled", "disabled");
            } else if (params.isReviewed) {
                //annotation is reviewed, cannot re-review
                $("#currentReviewAnnotation" + self.model.id).find("#reviewSingle" + idAnnotation).attr("disabled", "disabled");
            } else {
                //annotation is not reviewed, cannot unreview
                $("#currentReviewAnnotation" + self.model.id).find("#unreviewSingle" + idAnnotation).attr("disabled", "disabled");
            }

            $("#currentReviewAnnotation" + self.model.id).find("#reviewSingle" + idAnnotation).click(function () {
                self.addReviewAnnotation();
            });
            $("#currentReviewAnnotation" + self.model.id).find("#unreviewSingle" + idAnnotation).click(function () {
                self.deleteReviewAnnotation();
            });
            $("#currentReviewAnnotation" + self.model.id).find("#reviewValidate" + idAnnotation).click(function () {
                self.validatePicture();
            });
            self.showAnnotationTerm(annotation)
        });
    },
    /**
     * Show all term map with this annotation and add a checkbox to each one
     * @param annotation
     */
    showAnnotationTerm: function (annotation) {
        var self = this;

        if (annotation != null) {
            var termsListElem = $("#currentReviewAnnotation" + self.model.id).find("#termsChoice" + annotation.id);
            termsListElem.empty();
            _.each(annotation.get('term'), function (term) {
                self.addTermChoice(term, annotation.id, annotation.get("reviewed"));
            });
            $("#termsChoice" + annotation.id + " .termchoice").sort(self.asc_sort).appendTo("#termsChoice" + annotation.id);
        }
    },
    addTermChoice: function (idTerm, idAnnotation) {
        this.addTermChoice(idTerm, idAnnotation, false);
    },
    addTermChoice: function (idTerm, idAnnotation, lock) {
        var self = this;
        var termsListElem = $("#currentReviewAnnotation" + self.model.id).find("#termsChoice" + idAnnotation);
        var lockCheckBox = ""
        if (lock) {
            lockCheckBox = 'disabled="disabled"';
        }
        termsListElem.append('<div class="termchoice"><input type="checkbox" ' + lockCheckBox + ' checked="checked" name="terms" value="' + idTerm + '" id="termInput' + idTerm + '"> ' + window.app.status.currentTermsCollection.get(idTerm).get('name') + "&nbsp;&nbsp;</div>");
    },
    asc_sort: function (a, b) {
        return ($(b).text()) < ($(a).text());
    },
    deleteTermChoice: function (idTerm, idAnnotation) {
        var self = this;
        var termsListElem = $("#currentReviewAnnotation" + self.model.id).find("#termsChoice" + idAnnotation)
        termsListElem.find("input#termInput" + idTerm).replaceWith("");
    },
    getSelectedTerm: function (annotation) {
        var self = this;
        var termsListElem = $("#currentReviewAnnotation" + self.model.id).find("#termsChoice" + annotation.id);
        var selectedInput = termsListElem.find("input[name='terms']:checked:enabled");
        var selectedTermsId = [];

        _.each(selectedInput, function (input) {
            console.log("selectedTermsId it=" + input);
            selectedTermsId.push($(input).val())
        });
        console.log("selectedTermsId=" + selectedTermsId);
        return selectedTermsId;
    },
    /**
     * Review all visible layers
     */
    addAllReviewAnnotation: function () {
        var self = this;

        var layers = _.map(_.filter(self.printedLayer, function (num) {
            return num.id != "REVIEW";
        }), function (item) {
            return item.id
        });

        if (layers.length == 0) {
            window.app.view.message("Annotation", "You must add at least one layer!", "error");
        } else {
            new TaskModel({project: self.model.get('project')}).save({}, {
                    success: function (taskResponse, response) {
                        var task = taskResponse.get('task');
                        console.log("task=" + task);


                        $("#taskreview" + self.model.id).append('<div id="task-' + task.id + '"></div>');
                        $("#reviewChoice" + self.model.id).hide();
                        $("#taskreview" + self.model.id).show();


                        var timer = window.app.view.printTaskEvolution(task, $("#taskreview" + self.model.id).find("#task-" + task.id), 2000, false);

                        new AnnotationImageReviewedModel({image: self.model.id, layers: layers, task: task.id}).save({}, {
                            success: function (model, response) {
                                clearInterval(timer);
                                $("#taskreview" + self.model.id).empty();
                                $("#taskreview" + self.model.id).hide();
                                $("#reviewChoice" + self.model.id).show();
                                window.app.view.message("Annotation", "Annotation are reviewed!", "success");
                                _.each(self.printedLayer, function (layer) {
                                    layer.vectorsLayer.refresh();
                                });
                            },
                            error: function (model, response) {
                                console.log("AnnotationImageReviewedModel error");
                                var json = $.parseJSON(response.responseText);
                                window.app.view.message("Annotation", json.errors, "error");
                                $("#taskreview" + self.model.id).empty();
                                $("#taskreview" + self.model.id).hide();
                                $("#reviewChoice" + self.model.id).show();
                                clearInterval(timer);

                            }});

                    },
                    error: function (model, response) {
                        var json = $.parseJSON(response.responseText);
                        window.app.view.message("Task", json.errors, "error");
                    }
                }
            );
        }
    },
    deleteAllReviewAnnotation: function () {
        console.log("deleteAllReviewAnnotation");
        var self = this;

        var layers = _.map(_.filter(self.printedLayer, function (num) {
            return num.id != "REVIEW";
        }), function (item) {
            return item.id
        });
        console.log("###################################");
        console.log(layers);

        if (layers.length == 0) {

            window.app.view.message("Annotation", "You must add at least one layer!", "error");
        } else {

            require(["text!application/templates/review/ConfirmUnreviewDialog.tpl.html"], function (tpl) {

                   var dialog = new ConfirmDialogView({
                       el: '#dialogs',
                       template: _.template(tpl, {}),
                       dialogAttr: {
                           dialogID: "#unreview-confirm",
                           backdrop: false
                       }
                   }).render();

                   $('#unreview-confirm').find(".confirm").click(function () {
                       new TaskModel({project: self.model.get('project')}).save({}, {
                               success: function (taskResponse, response) {
                                   var task = taskResponse.get('task');

                                   $("#taskreview" + self.model.id).append('<div id="task-' + task.id + '"></div>');
                                   $("#reviewChoice" + self.model.id).hide();
                                   $("#taskreview" + self.model.id).show();

                                   var timer = window.app.view.printTaskEvolution(task, $("#taskreview" + self.model.id).find("#task-" + task.id), 2000, false);

                                   new AnnotationImageReviewedModel({image: self.model.id, layers: layers, task: task.id}).destroy({
                                       success: function (model, response) {
                                           clearInterval(timer);
                                           $("#taskreview" + self.model.id).empty();
                                           $("#taskreview" + self.model.id).hide();
                                           $("#reviewChoice" + self.model.id).show();
                                           window.app.view.message("Annotation", "All visible annotations are rejected!", "success");
                                           _.each(self.printedLayer, function (layer) {
                                               layer.vectorsLayer.refresh();
                                           });

                                       },
                                       error: function (model, response) {
                                           console.log("AnnotationImageReviewedModel error");
                                           var json = $.parseJSON(response.responseText);
                                           window.app.view.message("Annotation", json.errors, "error");
                                           $("#taskreview" + self.model.id).empty();
                                           $("#taskreview" + self.model.id).hide();
                                           $("#reviewChoice" + self.model.id).show();
                                           clearInterval(timer);

                                       }});
                                   dialog.close();

                               },
                               error: function (model, response) {
                                   var json = $.parseJSON(response.responseText);
                                   window.app.view.message("Task", json.errors, "error");
                               }
                           }
                       );
                   });

                   $('#unreview-confirm').find(".cancel").click(function () {
                       dialog.close();
                   });
            });



        }
    },
    validatePicture: function () {
        var self = this;
        self.browseImageView.validatePicture();
    },
    unvalidatePicture: function () {
        var self = this;
        self.browseImageView.unvalidatePicture();
    },
    refresh: function (model) {
        var self = this;
        self.model = model;
        self.render();
    }
});
