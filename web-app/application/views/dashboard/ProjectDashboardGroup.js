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

var ProjectDashboardGroup = Backbone.View.extend({
    imagesView: null,
    imagesGroupTabsView: null,
    render: function () {

        var self = this;
        require(["text!application/templates/dashboard/ImageGroupTable.tpl.html"],
            function (imageGroupTableTemplate) {
                self.doLayout(imageGroupTableTemplate);
            });
        return this;
    },
    doLayout: function (imageGroupTableTemplate) {
        // var self = this;
        // if (this.imagesGroupTabsView == null) {
        //     this.imagesGroupTabsView = new ImageGroupTabsView({
        //         model: new ImageGroupCollection({project: self.model.get('id')}),
        //         el: _.template(imageGroupTableTemplate, {id : self.model.get('id')}),
        //         idProject: this.model.id,
        //         project: this.model
        //     }).render();
        //     $(this.el).append(this.imagesGroupTabsView.el);
        // }
        window.setImageGroupTabInstance(this.model.get('id'));
    },
    refresh: function(){
        var self = this;
        if (this.imagesGroupTabsView == null) {
            self.render();
        } else {
            console.log("this.imagesGroupTabsView.refresh()");
            //this.imagesTabsView.refresh();
        }
    }
});