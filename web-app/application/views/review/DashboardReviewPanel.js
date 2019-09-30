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

var DashboardReviewPanel = Backbone.View.extend({
    width: null,
    software: null,
    project: null,
    parent: null,
    params: [],
    paramsViews: [],
    user : null,
    term: null,
    disableEvent: false,
    termSpanTemplate : null,
    initialize: function (options) {
        this.el = "#tabs-reviewdash-" + this.model.id;
    },
    render: function (image,user,term) {
        var self = this;
        require([
            "text!application/templates/review/ReviewPanel.tpl.html","text!application/templates/image/ImageReviewAction.tpl.html","text!application/templates/ontology/TermSpan.tpl.html"
        ],
            function (ReviewPanelTpl,ReviewActionTpl, TermSpanTpl) {
                self.termSpanTemplate = TermSpanTpl;

                //show review tab
                $("#explorer-tab").find("a[href='#tabs-reviewdash-"+window.app.status.currentProject+"']").parent().show();


                //get image to review
                new ImageInstanceModel({id: image}).fetch({
                    success: function (model, response) {
                        //get only userjob that add annotation for this image
                        new UserJobCollection({project: window.app.status.currentProject, image: image}).fetch({
                            success: function (collection, response) {
                                self.userJobForImage = collection;
                                $(self.el).empty();

                                var reviewer = null;
                                if(model.get('reviewUser')) {
                                    reviewer = window.app.models.projectUser.get(model.get('reviewUser')).prettyName()
                                }

                                $(self.el).append(_.template(ReviewPanelTpl,{idImage: image,imageFilename:model.getVisibleName(window.app.status.currentProjectModel.get('blindMode')),projectName:self.model.get('name'),reviewer:reviewer, validate:model.get('reviewStop')}));

                                //if no reviewer, allow to start review
                                if(reviewer==null) {
                                    $("a#startToReview"+image).click(function(evt){
                                         evt.preventDefault();

                                        new ImageReviewModel({id: image}).save({}, {
                                            success: function (model, response) {
                                                window.app.view.message("Image", response.message, "success");
                                                self.refresh();
                                            },
                                            error: function (model, response) {
                                                var json = $.parseJSON(response.responseText);
                                                window.app.view.message("Image", json.errors, "error");
                                             }});
                                    });
                                }


                                self.initFilter(user,term);

                                $(self.el).find("#reviewCytoAction").append(_.template(ReviewActionTpl, model.toJSON()));
                                var action = new ImageReviewAction({el:$("#reviewCytoAction"), model : model, container : self});
                                action.configureAction();


                                $("#statsReviewListing").css("min-height",$("#filterReviewListing").height());

                                self.initStatsReview(image,user);

                                self.initLastReview();

                                self.initAnnotationListing(image,user,term);

                                self.initTermListing();
                            }
                        });
                }});
            });
        window.app.view.currentReview = this;
        return this;
    },
    afterDeleteImageEvent : function() {
      var self = this;
      this.refresh(self.image,self.user,self.term);
    },
    refresh: function(image,user,term) {
        var self = this;
        if(!image) {
            self.render(self.image,self.user,self.term);
            return;
        } else {
            self.render(image,user,term);
        }
    },
    marskAsReviewed : function(id, terms, reviewed) {
        var self = this;

        new AnnotationReviewedModel({id: id}).save({terms:terms}, {
            success: function (model, response) {
                //remove from annotation listing
                if(!reviewed) {
                    self.annotationListing.remove(id);
                    console.log(self.lastReviewListing);
                }

                //refresh last review
                self.lastReviewListing.refresh();

                self.reviewStatsListing.refresh();

            },
            error: function (model, response) {
                var json = $.parseJSON(response.responseText);
                window.app.view.message("Annotation", json.errors, "error");
                self.refresh()
            }});
    },
    initLastReview : function() {
        var self = this;
        self.lastReviewListing = new ReviewLastReviewListing({
            user : window.app.status.user.id,
            project : self.model.id,
            container: self,
            el: $("#lastReviewListing")
        });
        self.lastReviewListing.render();
    },
    initStatsReview : function(image,user) {
        var self = this;
        self.reviewStatsListing = new ReviewStatsListing({
            project : self.model.id,
            image : image,
            user : user,
            container: self,
            el: $("#statsReviewListing")
        });
        self.reviewStatsListing.render();
    },
    initAnnotationListing: function(image,user,term) {
        console.log("initAnnotationListing");
        var self = this;
        self.image = image;
        self.user = user;
        self.term = term;
        self.annotationListing = new ReviewAnnotationListing({
            page: undefined,
            model: null,
            term: undefined,
            container: self,
            el: $("#annotationReviewListing")
        }).render(self.model.id,image,user,term);


        $("#annotationReviewListing").find(".thumb-wrap").draggable( {
              containment: self.el,
              stack: "#annotationReviewListing .thumb-wrap",
              cursor: 'move',
              revert: true
        });
    },
    initTermListing: function() {
        console.log("initTermListing");
        var self = this;

        var collection = window.app.status.currentTermsCollection;

        self.termListing= new ReviewTermListing({
            model: collection,
            container: self,
            el: $("#termReviewChoice")
        }).render();

        $("#termReviewChoice").find("div").droppable( {
            accept: '#annotationReviewListing .thumb-wrap, #lastReviewedAnnotation .thumb-wrap',
            hoverClass: 'termHovered',
            drop: self.handle,
            cursor: 'move',
      	 	 revert: true,
            over : function(event,ui) {
                if($(this).data("originalColor")==undefined) {
                    $(this).data("originalColor",$(this).css("background-color"));
                }
                $(this).css("background-color","#ffffff");
                console.log(this);
            },
            out: function(event,ui) {
                if($(this).data("originalColor")!=undefined) {
                    $(this).css("background-color",$(this).data("originalColor"));
                }

                console.log(this);
            }
          } );

    },
//
//    registerReviewPopup : function(annotation) {
//        console.log("registerReviewPopup");
//        var self = this;
//        require([
//            "text!application/templates/review/ReviewBrowse.tpl.html"
//        ],
//        function (tpl) {
//            var modal = new CustomModal({
//                idModal : "browseReviewModal",
//                button : $("#browseReviewModalButton"),
//                header :"BrowseAnnotation",
//                body :tpl,
//                width : 900,
//                height : 800
//            });
//            modal.addButtons("closeBrowseReview","Close",true);
//            $('#myModal').modal(options)
//        });
//
//    },








    handle : function(event,ui) {

        if($(this).data("originalColor")!=undefined) {
            $(this).css("background-color",$(this).data("originalColor"));
        }

        console.log(this);
        //ui.draggable.draggable( 'disable' );
       // ui.draggable.position( { of: $(this), my: 'left top', at: 'left top' } );
        ui.draggable.draggable( 'option', 'revert', false );

        if(ui.draggable.data('reviewed')) {
            window.app.view.currentReview.handleReviewed( $(this),event, ui);
        }else {
            window.app.view.currentReview.handleNotReviewed( $(this),event, ui);
        }
    },
    handleNotReviewed : function(termBox,event, ui) {
        var self = this;
        var idTerm = $(termBox).data("term");
        var idAnnotation = ui.draggable.data('annotation');

        var allChecked = _.map($("#annotationReviewListing").find(".component").find('input:checked'),function(elem) {
            return $(elem).data("annotation");
        });

        console.log(allChecked);

        if(allChecked.length==0) {
           //no checked but d&d => just take annotation that was dragged
           window.app.view.currentReview.marskAsReviewed(idAnnotation,[idTerm],false);
        } else {
           //one or more checked
            console.log(allChecked);
            allChecked = _.union(allChecked, [idAnnotation]);
            console.log(allChecked);
            _.each(allChecked,function(item) {
                console.log("review:"+item);
                window.app.view.currentReview.marskAsReviewed(item,[idTerm],false);
            });
        }

    },
    handleReviewed :function(termBox,event, ui) {
        var self = this;
        var idTerm = $(termBox).data("term");
        var idAnnotation = ui.draggable.data('annotation');
        var idAnnotationParent = window.app.view.currentReview.lastReviewListing.model.get(idAnnotation).get('parentIdent');


        //first: reject annotation
            new AnnotationReviewedModel({id: idAnnotationParent}).destroy({
                success: function (model, response) {
                        //second: validate annotation
                           window.app.view.currentReview.marskAsReviewed(idAnnotationParent,[idTerm],true);
                },
                error: function (model, response) {
                    var json = $.parseJSON(response.responseText);
                    window.app.view.message("Annotation", json.errors, "error");
                }});
    },
    dropStyleAnnotation : function(event, ui ) {
         //ui.draggable.addClass( 'hove' );
         ui.draggable.draggable( 'disable' );

         //$(this).droppable( 'disable' );
         ui.draggable.position( { of: $(this), my: 'left top', at: 'left top' } );
         ui.draggable.draggable( 'option', 'revert', false );
    },
    initFilter : function(user, term) {
        var self = this;
        var userFilter = $("#filterReviewListing").find("#filterUser");
        userFilter.empty();
        userFilter.append('<option value="0">All user (no job)</option>');

        window.app.models.projectUser.each(function(user) {
            userFilter.append('<option value="'+user.id+'">'+user.prettyName()+'</option>');
        });
        self.userJobForImage.each(function(user) {
            userFilter.append('<option value="'+user.id+'">'+user.prettyName()+'</option>');
        });

        var termFilter = $("#filterReviewListing").find("#filterTerm");
        termFilter.empty();
        termFilter.append('<option value="0">All</option>');
        termFilter.append('<option value="-1">No Term</option>');
        termFilter.append('<option value="-2">Multiple Term</option>');
        window.app.status.currentTermsCollection.each(function(term) {
            termFilter.append('<option value="'+term.id+'">'+term.get('name')+'</option>');
        });

        var changeFilter = function() {
            var userValue = userFilter.val();
            var termValue = termFilter.val();
            if(userValue==0) {
                userValue = null;
            }
            if(termValue==0) {
                termValue = null;
            } else if(termValue==-1) {
                termValue = "no";
             }else if(termValue==-2) {
                termValue = "multiple";
             }
            if(!self.disableEvent) {
               window.location = "#tabs-reviewdash-"+self.model.id+"-"+self.image+"-"+ userValue + "-" + termValue
            }
        }

        userFilter.change(changeFilter);
        termFilter.change(changeFilter);


        self.changeSelectedFilter(user,term)

    },
    changeSelectedFilter : function (user, term) {
        var self = this;
        var userFilter = $("#filterReviewListing").find("#filterUser");
        var termFilter = $("#filterReviewListing").find("#filterTerm");

        self.disableEvent = true;
        if(user) {
            userFilter.val(user);
        } else {
            userFilter.val(0);
        }

        if(term) {
            if(term=="no") {
                termFilter.val(-1);
            } else if(term=="multiple") {
                termFilter.val(-2);
            } else termFilter.val(term);
        } else {
            termFilter.val(0);
        }
        self.disableEvent = false;
    }

});