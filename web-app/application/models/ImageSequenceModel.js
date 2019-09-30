/**
 * Created by laurent
 * Date : 16.02.17.
 */

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


var ImageSequenceModel = Backbone.Model.extend({


    url: function () {
        var base = 'api/imagesequence';
        var format = '.json';
        if (window.app.isUndefined(this.channel) || window.app.isUndefined(this.zstack) || window.app.isUndefined(this.slice)
            || window.app.isUndefined(this.time)|| window.app.isUndefined(this.group)) {
            if (this.isNew()) return base + format;
            return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id + format;
        }
        return "/api/imagegroup/"+ this.group +"/"+this.channel+"/"+this.zstack+"/"+this.slice+"/"+this.time+"/imagesequence.json";
    },

    initialize: function (options) {
        this.group = options.group;
        this.channel = options.channel;
        this.zstack = options.zstack;
        this.slice = options.slice;
        this.time = options.time;
    }
});


var ImageSequenceCollection = PaginatedCollection.extend({
    model: ImageSequenceModel,

    url: function() {
        var format = '.json';
        return "api/imagegroup/" + this.group + "/imagesequence" + format;
    },

    initialize: function (options) {
        this.group = options.group;

    }
});