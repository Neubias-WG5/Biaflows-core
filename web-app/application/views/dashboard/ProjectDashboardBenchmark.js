/*
 * Copyright (c) 2009-2016. Authors: see NOTICE file.
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

var ProjectDashboardBenchmark = Backbone.View.extend({
    imagesBenchmarkTabsView: null,
    render: function () {
        var self = this;
        self.doLayout(imageBenchmarkTableTemplate);
        return this;
    },
    doLayout: function () {
        window.setImageBenchmarkTabInstance(this.model.get('id'));
    },
    refresh: function(){
        var self = this;
        if (this.imagesBenchmarkTabsView == null) {
            self.render();
        } else {
            console.log("this.imagesBenchmarkTabsView.refresh()");
            //this.imagesTabsView.refresh();
        }
    }
});