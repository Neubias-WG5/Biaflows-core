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

var SoftwareModel = Backbone.Model.extend({
    url: function () {
        var base = 'api/software';
        var format = '.json';
        if (this.isNew()) {
            return base + format;
        }
        return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id + format;
    }
});

// define our collection
var SoftwareCollection = PaginatedCollection.extend({
    model: SoftwareModel,
    CLASS_NAME: "be.cytomine.processing.Software",
    url: function () {
        if (this.project != null) {
            return 'api/project/' + this.project + '/software.json';
        }
        else {
            return 'api/software.json';
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        if (!options) {
            return;
        }
        this.project = options.project;
    },
    comparator: function (software) {
        return software.get("name");
    }
});

// define our collection
var SoftwareParameterModelCollection = PaginatedCollection.extend({
    model: SoftwareModel,
    sortAttribut: null,
    url: function () {
        if (this.uri != null && this.uri != undefined) {
            return this.uri;
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        if (!options) {
            return;
        }
        this.uri = options.uri;
        this.sortAttribut = options.sortAttribut;
        console.log(this);
    },
    comparator: function (model) {
        if (this.sortAttribut != null && this.sortAttribut != undefined) {
            return model.get(this.sortAttribut);
        }
        else {
            return model.get("id");
        }
    }
});

var SoftwareProjectModel = Backbone.Model.extend({
    url: function () {
        var base = 'api/softwareproject';
        var format = '.json';
        if (this.isNew()) {
            return base + format;
        }
        return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id + format;
    }
});

var SoftwareProjectCollection = PaginatedCollection.extend({
    model: SoftwareProjectModel,
    url: function () {
        if (this.project != null) {
            return 'api/project/' + this.project + '/softwareproject.json';
        }
        else {
            return 'api/softwareproject.json';
        }
    },
    initialize: function (options) {
        if (!options) {
            return;
        }
        this.initPaginator(options);
        this.project = options.project;
    }
});