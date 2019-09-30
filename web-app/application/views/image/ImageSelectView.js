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


var ImageSelectView = Backbone.View.extend({

       events: {

       },

       initialize: function(options) {
          this.id = "thumb"+this.model.get('id');
          _.bindAll(this, 'render');
       },

       render: function() {
          var self = this;
          this.model.set({ project : window.app.status.currentProject });
          var self = this;
          require(["text!application/templates/image/ImageChoice.tpl.html"], function(tpl) {
             $(self.el).html(_.template(tpl, self.model.toJSON()));
          });
          return this;
       }
    });
