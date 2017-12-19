/*
 * Copyright (c) 2009-2017. Authors: see NOTICE file.
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
var ProjectModel = Backbone.Model.extend({

    url: function () {
        var base = 'api/project';
        var format = '.json';
        if (!window.app.isUndefined(this.task)) {
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
    },
    isAdmin : function(admins) {
        return admins.get(window.app.status.user.id) != undefined || window.app.status.user.model.get("adminByNow");
    },
    isReadOnly : function(admins) {
        var isAdmin = this.isAdmin(admins);
        var isRO = this.get('isReadOnly');
        return !isAdmin && isRO;
    }
});


var ProjectUserModel = Backbone.Model.extend({
    url: function () {
        if (window.app.isUndefined(this.user)) {
            return "api/project/" + this.project + "/user.json";
        } else {
            return "api/project/" + this.project + "/user/" + this.user + ".json";
        }
    },
    initialize: function (options) {
        this.project = options.project;
        this.user = options.user;
    }
});


var OntologyProjectModel = PaginatedCollection.extend({
    model: ProjectModel,
    url: function () {
        return "api/ontology/" + this.ontology + "/project.json";
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.ontology = options.ontology;
    }
});

var ProjectDefaultLayerModel = Backbone.Model.extend({

    url: function () {
        if (window.app.isUndefined(this.get("project"))) {
            return null;
        } else {
            if (window.app.isUndefined(this.get("id"))) {
                return "api/project/" + this.get("project") + "/defaultlayer.json";
            } else {
                return "api/project/" + this.get("project") + "/defaultlayer/" + this.get("id") + ".json";
            }
        }
    },
    initialize: function (options) {
    },
    defaults : {
        user: null,
        project: null,
        hideByDefault : false
    }
});

var ProjectConnectionModel = Backbone.Model.extend({
    url: function () {
        if (window.app.isUndefined(this.user)) {
            if (!window.app.isUndefined(this.heatmap)) {
                return '/api/project/'+this.project +'/connectionFrequency.json?heatmap='+this.heatmap;
            }
            return '/api/project/'+this.project +'/userconnection.json';
        } else {
            return '/api/project/'+this.project +'/userconnection/'+this.user+'.json';
        }
    },
    initialize: function (options) {
        this.project = options.project;
        this.user = options.user;
        this.heatmap = options.heatmap;
    }
});



var ProjectDefaultLayerCollection = PaginatedCollection.extend({
    model: ProjectDefaultLayerModel,
    fullSize : -1,
    url: function () {
        if (window.app.isUndefined(this.project)) {
            return null;
        } else {
            return "api/project/" + this.project + "/defaultlayer.json";
        }
    },
    initialize: function (options) {        this.initPaginator(options);
        if (!window.app.isUndefined(options)) {
            this.project = options.project;
        }
    },
    comparator: function (layer) {
        return layer.get("user");
    }
});

// define our collection
var ProjectCollection = PaginatedCollection.extend({
    model: ProjectModel,
    fullSize : -1,
    url: function () {
        if (!window.app.isUndefined(this.user)) {
            if (window.app.isUndefined(this.admin)) {
                return "api/user/" + this.user + "/project.json";
            } else {
                return "api/user/" + this.user + "/project/light.json?admin="+this.admin;
            }
        } else if (!window.app.isUndefined(this.ontology)) {
            return "api/ontology/" + this.ontology + "/project.json";
        } else if (!window.app.isUndefined(this.description) && this.description == true) {
            return "api/project.json?description=true";
        } else {
            return "api/project.json";
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        if (!window.app.isUndefined(options)) {
            this.user = options.user;
            this.description = options.description;
            this.ontology = options.ontology;
            this.admin = options.admin;
        }
    },
    comparator: function (project) {
        return project.get("name");
    }
});
