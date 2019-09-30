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
 * Date: 7/04/11
 * Time: 15:01
 * To change this template use File | Settings | File Templates.
 */
var OntologyModel = Backbone.Model.extend({
    url: function () {
        var base = 'api/ontology';
        var format = '.json';
        if (this.task != null && this.task != undefined) {
            format = format+"?task="+this.task
        }
        if (this.isNew()) {
            return base + format;
        }
        return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id + format;
    },
    initialize: function (options) {
        this.id = options.id;
        this.task = options.task;
    }
});


// define our collection
var OntologyCollection = PaginatedCollection.extend({
    model: OntologyModel,
    CLASS_NAME: "be.cytomine.ontology.Ontology",
    url: function () {
        if (this.light == undefined) {
            return "api/ontology.json";
        } else {
            return "api/ontology.json?light=true";
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        if (options != undefined) {
            this.light = options.light;
        }
    }, comparator: function (ontology) {
        return ontology.get("name");
    }
});

