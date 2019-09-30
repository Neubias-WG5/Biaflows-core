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

var ImageController = Backbone.Router.extend({

    routes: {
        "image": "image",
        "image/p:page": "image"
    },

    image: function (page) {
        if (!this.view) {
            this.view = new ImageView({
                page: page,
                model: window.app.models.images,
                el: $("#warehouse > .image"),
                container: window.app.view.components.warehouse
            }).render();

            this.view.container.views.image = this.view;
        }

        this.view.container.show(this.view, "#warehouse > .sidebar", "image");
        window.app.view.showComponent(window.app.view.components.warehouse);
    }

});