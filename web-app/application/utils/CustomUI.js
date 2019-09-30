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

var CustomUI = {
    customizeUI : function(callback) {
        var self = this;
        var project = "";
        if(window.app.status.currentProject) {
            project = "?project="+window.app.status.currentProject;
        }

        $.get("custom-ui/config.json"+project, function(data){
            window.app.status.customUI = data;
            if(callback) callback();
        });
    },
    mustBeShow : function(id) {
        return window.app.status.customUI[id];
    },
    hideOrShowComponents : function() {
        var self = this;
        console.log("hideOrShowProjectComponents");
        _.each(window.app.status.customUI,function(value,key) {
            if(!self.mustBeShow(key)) {
                $(".custom-ui-"+key).hide();
            } else {
                $(".custom-ui-"+key).show();
            }
        });
    },
    components: [
        //  {componentId: "project-images-tab", componentName: "Image tab"},

        {componentId: "project-images-tab", componentName: "Images tab"},
        {componentId: "project-imagegroups-tab", componentName: "ImageGroups tab"},
        {componentId: "project-annotations-tab", componentName: "Annotations tab"},
        {componentId: "project-properties-tab", componentName: "Properties tab"},
        {componentId: "project-jobs-tab", componentName: "Jobs tab"},
        {componentId: "project-benchmark-tab", componentName: "Benchmark tab"},
        {componentId: "project-usersconfiguration-tab", componentName: "User configuration tab"},
        {componentId: "project-configuration-tab", componentName: "Project configuration tab"} //TODO: cannot be hide by project-admin

    ],
    componentsPanels: [
        //  {componentId: "project-images-tab", componentName: "Image tab"},
        {componentId: "project-explore-hide-tools", componentName: "All panels"},
        {componentId: "project-explore-info", componentName: "<i class=\"fas fa-info-circle\"></i> Information panel"},
        {componentId: "project-explore-digital-zoom", componentName: "<i class=\"fas fa-search\"></i> Digital zoom panel"},
        {componentId: "project-explore-link", componentName: "<i class=\"fas fa-link\"></i> Multi views panel"},
        {componentId: "project-explore-filter", componentName: "<i class=\"fas fa-filter\"></i> Image manipulation panel"},
        {componentId: "project-explore-image-layers", componentName: "<i class=\"fas fa-layer-group\"></i> Layers panel"},
        {componentId: "project-explore-ontology", componentName: "<i class=\"fas fa-palette\"></i> Ontology panel"},
        {componentId: "project-explore-annotation-panel", componentName: "<i class=\"fas fa-shapes\"></i> Annotation list panel"},
        {componentId: "project-explore-multidim", componentName: "<i class=\"fas fa-images\"></i> Multidimension panel"},
        // {componentId: "project-explore-spectra-panel", componentName: "Multidimension spectral distribution panel"},
        {componentId: "project-explore-property", componentName: "<i class=\"fas fa-tags\"></i> Property panel"},
        {componentId: "project-explore-review", componentName: "<i class=\"fas fa-check-circle\"></i> Review panel"},
        {componentId: "project-explore-follow", componentName: "<i class=\"fas fa-chess-rook\"></i> User tracking panel"},
        {componentId: "project-explore-job", componentName: "<i class=\"fas fa-terminal\"></i> Job panel"},
        {componentId: "project-explore-overview", componentName: "<i class=\"fas fa-map\"></i> Overview"},
        {componentId: "project-explore-scaleline", componentName: "<i class=\"fas fa-ruler\"></i> Scale line"},

        {componentId: "project-explore-annotation-main", componentName: "<i class=\"fas fa-mouse-pointer\"></i> Current selection - main panel"},
        {componentId: "project-explore-annotation-info", componentName: "<i class=\"fas fa-mouse-pointer\"></i> Current selection - <i class=\"fas fa-info-circle\"></i> info panel"},
        {componentId: "project-explore-annotation-preview", componentName: "<i class=\"fas fa-mouse-pointer\"></i> Current selection - <i class=\"fas fa-crop-alt\"></i> preview panel"},
        {componentId: "project-explore-annotation-similarities", componentName: "<i class=\"fas fa-mouse-pointer\"></i> Current selection - <i class=\"fas fa-magic\"></i> similarities panel"},
        {componentId: "project-explore-annotation-comments", componentName: "<i class=\"fas fa-mouse-pointer\"></i> Current selection - <i class=\"fas fa-comments\"></i> comments panel"},
        {componentId: "project-explore-annotation-properties", componentName: "<i class=\"fas fa-mouse-pointer\"></i> Current selection - <i class=\"fas fa-tags\"></i> properties panel"},
        {componentId: "project-explore-annotation-description", componentName: "<i class=\"fas fa-mouse-pointer\"></i> Current selection - <i class=\"fas fa-align-left\"></i> description panel"},
    ],
    componentsTools: [
        //  {componentId: "project-images-tab", componentName: "Image tab"},
        {componentId: "project-tools-main", componentName: "All tools"},
        {componentId: "project-tools-select", componentName: "<i class=\"fas fa-mouse-pointer\"></i> Select tool"},
        {componentId: "project-tools-point", componentName: "<i class=\"fas fa-map-marker-alt\"></i> Draw point tool"},
        {componentId: "project-tools-line", componentName: "<i class=\"fas fa-minus\"></i> Draw line tool"},
        {componentId: "project-tools-arrow", componentName: "<i class=\"fas fa-long-arrow-alt-right\"></i> Draw arrow tool"},
        {componentId: "project-tools-rectangle", componentName: "<i class=\"fas fa-vector-square\"></i> Draw rectangle tool"},
        {componentId: "project-tools-diamond", componentName: "Draw diamond tool"},
        {componentId: "project-tools-circle", componentName: "<i class=\"far fa-circle\"></i> Draw circle tool"},
        {componentId: "project-tools-polygon", componentName: "<i class=\"fas fa-draw-polygon\"></i> Draw polygon tool"},
        {componentId: "project-tools-magic", componentName: "<i class=\"fas fa-magic\"></i> Magic wand tool"},
        {componentId: "project-tools-freehand", componentName: "<i class=\"fas fa-pencil-alt\"></i> Draw freehand tool"},
        {componentId: "project-tools-union", componentName: "<i class=\"fas fa-pencil-alt\"></i><i class=\"far fa-plus-square\"></i> Union tool"},
        {componentId: "project-tools-diff", componentName: "<i class=\"fas fa-pencil-alt\"></i><i class=\"far fa-minus-square\"></i> Difference tool"},

        {componentId: "project-tools-fill", componentName: "<i class=\"fas fa-fill\"></i> Fill tool"},
        {componentId: "project-tools-edit", componentName: "<i class=\"fas fa-edit\"></i> Edit tool"},
        {componentId: "project-tools-resize", componentName: "<i class=\"fas fa-expand-arrows-alt\"></i> Resize tool"},
        {componentId: "project-tools-rotate", componentName: "<i class=\"fas fa-redo-alt\"></i> Rotate tool"},
        {componentId: "project-tools-move", componentName: "<i class=\"fas fa-arrows-alt\"></i> Move tool"},
        {componentId: "project-tools-delete", componentName: "<i class=\"fas fa-trash-alt\"></i> Delete tool"},

        {componentId: "project-tools-rule", componentName: "<i class=\"fas fa-ruler-horizontal\"></i> Length ruler tool"},
        {componentId: "project-tools-area", componentName: "<i class=\"fas fa-ruler-combined\"></i> Area ruler tool"},
        {componentId: "project-tools-screenshot", componentName: "<i class=\"fas fa-camera-retro\"></i> Screenshot tool"}
    ],
    componentsGraphs: [
        {componentId: "project-annotations-term-piegraph", componentName: "Annotations VS terms pie graph"},
        {componentId: "project-annotations-term-bargraph", componentName: "Annotations VS terms bar graph"},
        {componentId: "project-annotations-users-graph", componentName: "Annotations by contributor graph"},
        {componentId: "project-annotated-slides-term-graph", componentName: "Annotated slides by term graph"},
        {componentId: "project-annotated-slides-users-graph", componentName: "Annotated slides by contributor graph"},
        {componentId: "project-annotation-graph", componentName: "Number of contributor annotation graph"},
        {componentId: "project-users-global-activities-graph", componentName: "Users global activities graph"},
        {componentId: "project-users-heatmap-graph", componentName: "Users heatmap graph"}
    ],

    roles:[
        { "authority": "ADMIN_PROJECT","name": "project manager"},
        { "authority": "CONTRIBUTOR_PROJECT", "name": "project contributor" }
    ]
};