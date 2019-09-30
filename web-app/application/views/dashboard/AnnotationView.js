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

var AnnotationView = Backbone.View.extend({
    tagName: "div",
    pagination_window: 3,
    nbAnnotation: -1,
    initialize: function (options) {
        this.page = options.page;
        this.term = options.term;
        this.noTerm = options.noTerm;
        this.multipleTerm = options.multipleTerm;
        this.annotations = null; //array of annotations that are printed
        if (this.page == undefined) {
            this.page = 0;
        }

    },
    render: function () {
        var self = this;
        self.model.goTo(this.page,{
            success: function (collection, response) {
                $(self.el).empty();
                self.model = collection;
                self.nbAnnotation = collection.fullSize;
                if(self.nbAnnotation > 0) {
                    self.initPagination();
                    self.appendThumbs(self.page);
                } else {
                    $(self.el).append('<div style="text-align: center; padding:50px;"><span class="label label-info">No available annotations</span></div>');
                }
            }});

        return this;
    },
    initPagination: function () {
        var self = this;

         var nbPages = self.model.getNumberOfPages();
         console.log("initPagination="+nbPages);
         if(nbPages<2) {
             return;
         } else {

            require(["text!application/templates/dashboard/Pagination.tpl.html"], function (paginationTpl) {
                var termRef = null
                if(self.noTerm) {
                    termRef = "-1";
                } else if (self.multipleTerm) {
                    termRef = "-2";
                } else {
                    termRef = self.term;
                }
                var pagination = _.template(paginationTpl, { term: termRef});
                $(self.el).append(pagination);
                var $pagination = $(self.el).find("#pagination-term-"+termRef).find("ul");

                var className = (self.page == 0) ? "prev disabled" : "";

                var pageLink = _.template("<li class='<%= className %>'><a data-page='<%= page %>' href='#'>&larr; Previous</a></li>", { className: className, page: self.page - 1});
                $pagination.append(pageLink);
                var shiftUp = (self.page - self.pagination_window < 0) ? Math.abs(self.page - self.pagination_window) : 0;
                var shiftDown = (self.page + self.pagination_window >= nbPages) ? Math.abs(self.pagination_window + self.page - nbPages + 1) : 0;

                for (var i = Math.max(0, self.page - self.pagination_window - shiftDown); i < Math.min(nbPages, self.page + self.pagination_window + shiftUp + 1); i++) {
                    var linkID = "term-" + self.term + "-page-" + i;
                    className = (i == self.page) ? "active" : "";
                    pageLink = _.template("<li class='<%= className %>'><a data-page='<%= page %>' href='#'><%= page %></a></li>", {
                        className: className,
                        linkID: linkID,
                        page: i
                    });
                    $pagination.append(pageLink);
                }
                var className = (self.page == nbPages - 1) ? "next disabled" : "";
                pageLink = _.template("<li class='<%= className %>'><a data-page='<%= page %>' href='#'>Next &rarr;</a></li>", { className: className, page: self.page + 1});
                $pagination.append(pageLink);
                console.log("initPagination="+$pagination.length);
                $pagination.find("a").click(function (event) {
                    event.preventDefault();
                    var page = parseInt($(this).attr("data-page"));
                    if (page >= 0 && page < nbPages) {
                        self.switchToPage(page);
                    }
                    return false;
                });

            });



         }
    },
    switchToPage: function (page) {
        var self = this;
        self.page = page;
        $(self.el).empty();
        self.render();
    },
    appendThumbs: function (page) {
        var self = this;
        self.annotations = [];
        self.model.each(function (annotation) {
            var thumb = new AnnotationThumbView({
                model: annotation,
                className: "thumb-wrap",
                terms : window.app.status.currentTermsCollection,
                term: self.term
            }).render();
            $(self.el).append(thumb.el);
            self.annotations.push(annotation.id);
        });
    },
    /**
     * Add the thumb annotation
     * @param annotation Annotation model
     */
    add: function (annotation) {

        var self = this;
        var thumb = new AnnotationThumbView({
            model: annotation,
            terms : window.app.status.currentTermsCollection,
            className: "thumb-wrap",
            id: "thumb" + annotation.get('id')
        }).render();
        $(self.el).prepend(thumb.el);

    },
    /**
     * Remove thumb annotation with id
     * @param idAnnotation  Annotation id
     */
    remove: function (idAnnotation) {
        $("#thumb" + idAnnotation).remove();
    }

});
