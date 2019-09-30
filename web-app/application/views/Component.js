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

var Component = Backbone.View.extend({
    tagName: "div",
    views: {},
    /* Component constructor */
    initialize: function (options) {
        this.divId = options.divId;
        this.el = options.el;
        this.template = options.template;
        this.buttonAttr = options.buttonAttr;
        if (options.activate != undefined) {
            this.activate = options.activate;
        }
        if (options.onActivate != undefined) {
            this.onActivate = options.onActivate;
        }
        if (options.deactivate != undefined) {
            this.deactivate = options.deactivate;
        }
        if (options.show != undefined) {
            this.show = options.show;
        }
    },
    /**
     *  Render the component into it's DOM element and add it to the menu
     */
    render: function () {
        var self = this;
        $(this.el).append(this.template);
        return this;
    },
    /**
     * Show the DOM element and disable the button associated to the component
     **/
    activate: function () {
        $("#" + this.divId).show();
        $("#" + this.buttonAttr.elButton).parent().addClass("active");
        if (this.onActivate != undefined) {
            this.onActivate();
        }
    },

    /**
     * Hide the DOM element and enable the button associated
     */
    deactivate: function () {
        $("#" + this.divId).hide();
        $("#" + this.buttonAttr.elButton).parent().removeClass("active");
    },

    /**
     * Show a subpage of the component
     * - view : the DOM element which contains the content of the page to activate
     * - scope : the DOM element name which contains pages
     * - name : the name of the page to activate
     */
    show: function (view, scope, name) {
        $(scope).find(".title.active").each(function () {
            $(this).removeClass("active");
        });
        $(scope).find("a[name=" + name + "]").addClass("active");
        for (var i in this.views) {
            var v = this.views[i];
            if (v != view) {
                $(v.el).hide();
            }
        }

        $(view.el).show();
    }
});