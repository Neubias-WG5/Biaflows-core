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
 * Created by IntelliJ IDEA.
 * User: lrollus
 * Date: 8/04/11
 * Time: 13:29
 * To change this template use File | Settings | File Templates.
 */
var TaskModel = Backbone.Model.extend({

    url: function () {
        var base = 'api/task';
        var format = '.json';
        if (this.isNew()) {
            url = base + format;
        } else {
            var url = base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id + format;
        }
        url = url +"?"
       if (this.project) {
           url = url + "&project=" + this.project;
       }
       if (this.printInActivity) {
           url = url + "&printInActivity=" + this.printInActivity;
       }
       return url;

    },
    initialize: function (options) {
        this.project = options.project;
        this.printInActivity = options.printInActivity;
    }
});


var TaskCommentsCollection = PaginatedCollection.extend({
    model: TaskModel,
    url: function () {
        return "api/project/"+ this.project +"/task/comment.json";
    },
    initialize: function (options) {
        this.initPaginator(options);
        if (options != undefined) {
            this.project = options.project;
        }
    }, comparator: function (comment) {
        return -comment.get("timestamp");
    }
});
