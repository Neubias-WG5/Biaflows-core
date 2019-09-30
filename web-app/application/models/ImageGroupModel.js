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
 * Created by laurent on 16.02.17.
 *
 */


var ImageGroupModel = Backbone.Model.extend({
    channel:"",
    zstack:"",
    time:"",
    slice:"",
    feeded:false,


    url: function () {
        var base = 'api/imagegroup';
        var format = '.json';
        if (this.isNew()) return base + format;
        return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id + format;
    },

    forcefeed: function(){
        this.feeded = false;
        this.feed();
    },

    feed: function (callback) {
        var self = this;
        if(self.feeded)
            return;

        $.get("/api/imagegroup/"+this.id+"/characteristics.json", function(data) {

            if(data.channel!=null && data.channel!=undefined) {
                self.channel=data.channel;
                self.slice=data.slice;
                self.time=data.time;
                self.zstack=data.zStack;
            }

            if(callback != undefined)
                callback();
        });
        self.feeded=true;
    },
    prettyPrint: function (array) {
        if(array.length === 0){
            return "[]";
        }
        var ini = array[0];
        var result = "[" + ini;

        var nbConsecutiveValues = 0;
        for(var i = 1; i < array.length; ++i){
            if(array[i] === ini + 1){
                nbConsecutiveValues++;
                ini++;
            }
            else{
                if(nbConsecutiveValues == 0)
                    result += "," + array[i];
                else{
                    nbConsecutiveValues = 0;
                    result += ".." + ini + "," + array[i];
                }
                ini = array[i];
            }
        }
        if(nbConsecutiveValues != 0)
            result +=  ".." + array[array.length - 1] + "]";
        else
            result += "]";
        return result;
    },

    initialize: function (options) {
        this.channel=options.channel;
        this.zstack=0;
        this.time=options.time;
        this.slice=options.slice;
        this.feeded=false;

    },
});

var ImageGroupCollection = PaginatedCollection.extend({
    model: ImageGroupModel,
    url: function() {

        var format = '.json';
        return "api/project/"+ this.project + "/imagegroup" + format;
    },

    initialize: function (options) {
      this.project=options.project;
    }
});