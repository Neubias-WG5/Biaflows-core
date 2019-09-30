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

/**
 * Created by laurent
 * Date : 03.03.17.
 */



var ImageGroupHDF5Model = Backbone.Model.extend({

    url: function () {
        var base = 'api';
        var format = '.json';
        if (this.isNew()) return base + "/imagegroupHDF5" + format;
        if(this.group == undefined)
            return base + "/imagegroupHDF5/" + this.id + "" + format;
        else
            return base + "/imagegroup/" + this.group + "/imagegroupHDF5" + format;
    },

    initialize: function (options) {
        this.id = options.id;
        this.group = options.group;

    }

});

var ImageGroupSpectraModel = Backbone.Model.extend({
   url: function () {
       var base = 'api/imagegroupHDF5';
       var format = '.json';
       return base + "/" + this.group + "/" + this.x + "/" + this.y + "/pixel" + format;
   },

    initialize: function(options){
        this.group = options.group;
        this.x = Math.round(options.x);
        this.y = Math.round(options.y);
    }


});