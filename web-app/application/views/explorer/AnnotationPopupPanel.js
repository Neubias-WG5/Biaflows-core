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
 * User: stevben
 * Date: 12/06/11
 * Time: 12:33
 * To change this template use File | Settings | File Templates.
 */

var AnnotationPopupPanel = SideBarPanel.extend({
    tagName: "div",

    /**
     * AnnotationPopupPanel constructor
     * @param options
     */
    initialize: function (options) {
        this.browseImageView = options.browseImageView;
        this.idAnnotation = options.idAnnotation;
    },
    /**
     * Grab the layout and call ask for render
     */
    render: function () {
        var self = this;
        require([
            "text!application/templates/explorer/PopupAnnotation.tpl.html"
        ], function (tpl) {
            self.doLayout(tpl);
        });
        return this;
    },
    /**
     * Render the html into the DOM element associated to the view
     * @param tpl
     */
    doLayout: function (tpl) {
        var self = this;

        new AnnotationModel({id: self.idAnnotation}).fetch({
            success: function (annotation, response) {



                self.createPopup(tpl,annotation);
                self.browseImageView.showAnnotationInReviewPanel(annotation);

                self.initTooglePanel("annotation-info-panel",".toggle-content-info");
                self.initTooglePanel("annotation-property-panel",".toggle-content-property");
                self.initTooglePanel("annotation-preview-panel",".toggle-content-preview");
                self.initTooglePanel("annotation-suggested-panel",".toggle-content-suggested");
                self.initTooglePanel("annotation-description-panel",".toggle-content-description");


            }
        });


    },
    initTooglePanel : function(panelName,toogleClass) {
        var self = this;
        var el = $('#annotationDetailPanel' + self.model.get('id'));
        var elContent = el.find("."+panelName);
        var sourceEvent = el.find(toogleClass);
        self.initToggle(el, elContent, sourceEvent, panelName);
    },
    createPopup : function(tpl,annotation) {
        console.log("create annotation pop-up");
        var self = this;
        var user = window.app.models.projectUser.get(annotation.get("user"));
        if (window.app.isUndefined(user)) {
            user = window.app.models.projectUserJob.get(annotation.get("user"));
        }
        annotation.set({"username": user.prettyName()});

        self.browseImageView.currentAnnotation = annotation;

        var terms = [];
        //browse all term and compute the number of user who add this term

        if (annotation.get("reviewed")) {
            _.each(annotation.get("term"), function (idTerm) {
                var termName = window.app.status.currentTermsCollection.get(idTerm).get('name');
                var idOntology = window.app.status.currentProjectModel.get('ontology');
                var tpl = _.template("<a href='#ontology/<%=   idOntology %>/<%=   idTerm %>'><%=   termName %></a> ", {idOntology: idOntology, idTerm: idTerm, termName: termName});
                terms.push(tpl);

            });
        } else {
            _.each(annotation.get("userByTerm"), function (termuser) {
                var idTerm = termuser.term;
                var termName = window.app.status.currentTermsCollection.get(idTerm).get('name');
                var userCount = termuser.user.length;
                var idOntology = window.app.status.currentProjectModel.get('ontology');
                var tpl = _.template("<a href='#ontology/<%=   idOntology %>/<%=   idTerm %>'><%=   termName %></a> (<%=   userCount %>)", {idOntology: idOntology, idTerm: idTerm, termName: termName, userCount: userCount});
                terms.push(tpl);

            });
        }

        annotation.set({"terms": terms.join(", ")});

        if (window.app.isUndefined(annotation.get("nbComments"))) {
            annotation.set({"nbComments": 0});
        }
        annotation.set({"smallCropURL": annotation.get("smallCropURL")+"&time="+Date.now()});

        annotation.set('area', Math.round(annotation.get('area')));
        annotation.set('perimeter', Math.round(annotation.get('perimeter')));

        var jsonAnnotation = annotation.toJSON()
        jsonAnnotation.retrieval_enabled = window.app.configurations.retrieval_enabled;
        var content = _.template(tpl, jsonAnnotation);
        var elem = $("#" + self.browseImageView.divId).find("#annotationDetailPanel" + self.browseImageView.model.id);
        elem.html(content);
        CustomUI.hideOrShowComponents();
        elem.show();

        var isProjectAdmin = self.browseImageView.isCurrentUserProjectAdmin();
        var isSameUser =  annotation.get("user")==window.app.status.user.id

        if(!isProjectAdmin && !isSameUser) {
            $("#messageAnnotationCreator").html('<span class="label label-warning"> <i class=" glyphicon glyphicon-remove"/> You cannot edit this annotation</span>');
        } else {
            $("#messageAnnotationCreator").html('<span class="label label-success"> <i class="glyphicon glyphicon-ok"/> You can edit this annotation</span>');
        }

        if (window.app.status.currentProjectModel.get('hideUsersLayer') || window.app.status.currentProjectModel.get('hideAdminsLayer') ||  window.app.status.currentProjectModel.get('retrievalDisable')) {
            $("#loadSimilarAnnotation" + annotation.id).html("Retrieval is disabled");
        } else {
            self.showSimilarAnnotation(annotation);
        }

        self.retrieveDescription(annotation);
    },

    showSimilarAnnotation: function (model) {
        var self = this;
        console.log('showSimilarAnnotation');
        if (window.app.isUndefined(window.app.status.currentTermsCollection) || (window.app.status.currentTermsCollection.length > 0 && window.app.isUndefined(window.app.status.currentTermsCollection.at(0).id))) {
            new TermCollection({idOntology: window.app.status.currentProjectModel.get('ontology')}).fetch({
                success: function (terms, response) {
                    window.app.status.currentTermsCollection = terms;
                    self.showSimilarAnnotationResult(model);
                }});
        } else {
            self.showSimilarAnnotationResult(model);
        }
    },
    showSimilarAnnotationResult: function (model) {
        var self = this;
        console.log('showSimilarAnnotationResult');
        new AnnotationRetrievalModel({annotation: model.id}).fetch({
            success: function (collection, response) {

                var termsList = collection.get('term');

                var bestTerm1Object;
                var bestTerm2Object;

                var sum = 0;
                var i = 0;

                _.each(termsList, function (term) {
                    sum = sum + term.rate;
                    if (i === 0) {
                        bestTerm1Object = term;
                    }
                    if (i === 1) {
                        bestTerm2Object = term;
                    }
                    i++;
                });

                var bestTerm1;
                var bestTerm2;
                var bestTerm1Value = 0;
                var bestTerm2Value = 0;
                if (!window.app.isUndefined(bestTerm1Object)) {
                    bestTerm1 = bestTerm1Object.id;
                    bestTerm1Value = bestTerm1Object.rate;
                    if (bestTerm1Value == 0) {
                        bestTerm1 = undefined;
                    }
                }
                if (!window.app.isUndefined(bestTerm2Object)) {
                    bestTerm2 = bestTerm2Object.id;
                    bestTerm2Value = bestTerm2Object.rate;
                    if (bestTerm2Value == 0) {
                        bestTerm2 = undefined;
                    }
                }

                bestTerm1Value = (bestTerm1Value / sum) * 100;
                bestTerm2Value = (bestTerm2Value / sum) * 100;

                //Print suggested Term
                self.printSuggestedTerm(model, window.app.status.currentTermsCollection.get(bestTerm1), window.app.status.currentTermsCollection.get(bestTerm2), bestTerm1Value, bestTerm2Value, window.app.status.currentTermsCollection, collection.get('annotation'));
            }, error: function (bad, response) {
                $("#loadSimilarAnnotation" + model.id).html("Error: cannot reach retrieval");
            }});
    },
    printSuggestedTerm: function (annotation, bestTerm1, bestTerm2, bestTerm1Value, bestTerm2Value, terms, similarAnnotation) {
        var self = this;
        var suggestedTerm = "";
        var suggestedTerm2 = "";
        if (!window.app.isUndefined(bestTerm1)) {
            suggestedTerm += "<span id=\"changeBySuggest" + bestTerm1.id + "\" style=\"display : inline\"><u>" + bestTerm1.get('name') + "</u> (" + Math.round(bestTerm1Value) + "%)<span>";
        }
        if (!window.app.isUndefined(bestTerm2)) {
            suggestedTerm2 += " or " + "<span id=\"changeBySuggest" + bestTerm2.id + "\" style=\"display : inline\"><u>" + bestTerm2.get('name') + "</u> (" + Math.round(bestTerm2Value) + "%)<span>";
        }

        $("#suggTerm" + annotation.id).empty();
        $("#suggTerm" + annotation.id).append("<b>Suggested term</b> : ");
        $("#suggTerm" + annotation.id).append(suggestedTerm);
        $("#suggTerm" + annotation.id).append(suggestedTerm2);
        if (!window.app.isUndefined(bestTerm1)) {
            self.createSuggestedTermLink(bestTerm1, annotation);
        }

        if (!window.app.isUndefined(bestTerm2)) {
            self.createSuggestedTermLink(bestTerm2, annotation);
        }

        require([
            "text!application/templates/explorer/SimilarAnnotationModal.tpl.html"
        ],
            function (retrievalTpl) {
                var template = _.template(retrievalTpl,{});
                $("#loadSimilarAnnotation" + annotation.id).replaceWith('<a id="openRetrievalModal'+annotation.id+'" href="#myModalRetrieval'+annotation.id+'"  data-toggle="modal"><i class="glyphicon glyphicon-question-sign" /> See similar annotations</a>');
                var modal = new CustomModal({
                    idModal : "myModalRetrieval"+annotation.id,
                    button : $('#openRetrievalModal'+annotation.id),
                    header :"Retrieval - Annotation similarity",
                    body :template
                });
                modal.addButtons("closeRetrieval","Close",true,true);

                $("#openRetrievalModal"+annotation.id).click(function (event) {
                    event.preventDefault();

                    var bestTerms = [bestTerm1, bestTerm2];
                    var bestTermsValue = [bestTerm1Value, bestTerm2Value];
                    var panel = new AnnotationRetrievalView({
                        model: new AnnotationRetrievalCollection(similarAnnotation),
                        projectsPanel: self,
                        container: self,
                        el: "#annotationRetrievalInfo",
                        baseAnnotation: annotation,
                        terms: terms,
                        bestTerms: bestTerms,
                        bestTermsValue: bestTermsValue
                    }).render();
                });

            });





    },

    createSuggestedTermLink: function (term, annotation) {
        var self = this;
        $("#changeBySuggest" + term.id).click(function () {
            new AnnotationTermModel({term: term.id, userannotation: annotation.id, clear: true
            }).save(null, {success: function (termModel, response) {
                    window.app.view.message("Correct Term", response.message, "");
                    //Refresh tree
                    self.ontologyPanel.ontologyTreeView.refresh(annotation.id);
                }, error: function (model, response) {
                    var json = $.parseJSON(response.responseText);
                    window.app.view.message("Correct term", "error:" + json.errors, "");
                }});
        });
    },
    retrieveDescription : function(annotation) {
        var self = this;
        var content = $(".textcontent"+annotation.id);
        console.log("retrieveDescription");
        DescriptionModal.initDescriptionView(annotation.id, annotation.get('class'), annotation.get("user") === window.app.status.user.id,content, 150, function() {
            var text = content.html();
            content.empty().append(text.replace(new RegExp("<h.>", "g"),'<br>').replace(new RegExp("</h.>", "g"),'<br>'));
        },function() {self.render();});
    }
});
