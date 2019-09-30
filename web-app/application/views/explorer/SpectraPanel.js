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


var SpectraPanel = Backbone.View.extend({
    tagName: "div",
    review: false,

    /**
     * SpectraPanel constructor
     * @param options
     */
    initialize: function (options) {
        this.refreshSpectra = [];
        this.browseImageView = options.browseImageView;
        if (!window.app.isUndefined(options.review)) {
            this.review = options.review;
        }
    },
    /**
     * Grab the layout and call ask for render
     */
    render: function () {
        var self = this;
        require([
            "text!application/templates/explorer/SpectraPanel.tpl.html"
        ], function (tpl) {
            self.doLayout(tpl);
        });

        return this;
    },
    createTabs: function (idOntology) {
        var self = this;
        var annotationPanel = $("#spectraPanel" + self.model.id);

    },
    represhSpectra: function (idTerm, el) {
        //Maybe move code that's in the click function  here
    }
    ,
    /**
     * Render the html into the DOM element associated to the view
     * @param tpl
     */
    doLayout: function (tpl) {
        var self = this;
        var el = $("#" + self.browseImageView.divId).find('#spectraPanel' + self.model.get('id'));

        el.html(_.template(tpl));

        var spectraPanelBig = $(".spectra-panel-big");
        var spectraPanelMini = $(".spectra-panel-mini");
        $(".show-spectra-panel-big").on("click", function () {
            console.log("still ok");
            spectraPanelMini.css("bottom", -20);
            spectraPanelMini.hide();
            spectraPanelBig.css("bottom", 0);
            spectraPanelBig.show();
        });

        $(".hide-spectra-panel-big").on("click", function() {
            spectraPanelBig.css("bottom", -300);
            spectraPanelBig.hide();
            spectraPanelMini.css("bottom", 0);
            spectraPanelMini.show();
        });

        $("div .tabsSpectra").on('shown.bs.tab','a[data-toggle="tab"]', function (e) {
            console.log("Maybehere")
            e.preventDefault();
            //Refresh selected tab
            var idTerm = $(this).attr("data-term");
            var obj = _.detect(self.refreshSpectra, function (object) {
                return (object.idTerm == idTerm);
            });
            if (obj) obj.refresh.call();
        });

        return this;
    },

    refreshSpectraTabs: function (idTerm) {
        console.log("TODO refresh");
    },
});
