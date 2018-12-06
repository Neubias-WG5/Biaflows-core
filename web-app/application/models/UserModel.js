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

var UserModel = Backbone.Model.extend({
    /*initialize: function(spec) {
     if (!spec || !spec.name || !spec.username) {
     throw "InvalidConstructArgs";
     }
     },

     validate: function(attrs) {
     if (attrs.name) {
     if (!_.isString(attrs.name) || attrs.name.length === 0) {
     return "Name must be a string with a length";
     }
     }
     },*/

    url: function () {
        var base = 'api/user';
        var format = '.json';
        if (this.isNew()) {
            return base + format;
        }
        return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id + format;
    },

    prettyName: function () {
        if (this.get('lastname')==undefined) {
            return this.get("softwareName") + " " + window.app.convertLongToDate(this.get("created"));
        }
        else {
            return this.get('lastname') + " " + this.get('firstname') + " (" + this.get('username') +")";
        }

    },
    layerName: function () {
        if (this.get('algo')) {
            return this.get("softwareName") + " " + window.app.convertLongToDate(this.get("created"));
        }
        else {
            return this.get('lastname') + " " + this.get('firstname') + " ("+this.get('username')+")";
        }
    }
});


var UserFriendCollection = PaginatedCollection.extend({
    model: UserModel,
    url: function () {
        return "api/user/" + this.id + "/friends.json";
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.id = options.id;
    }, comparator: function (user) {
        if (user.get("lastname") != undefined) {
            return user.get("lastname") + " " + user.get("firstname")
        }
        else {
            return user.get("username").toLowerCase();
        }
    }
});

var UserOnlineCollection = PaginatedCollection.extend({
    model: UserModel,
    url: function () {
        return "api/project/" + this.project + "/online/user.json";
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.project = options.project;
    }
});

// define our collection
var UserCollection = PaginatedCollection.extend({
    model: UserModel,
    url: function () {
        if (!window.app.isUndefined(this.withActivity)) {
            var url= "api/project/" + this.project + "/usersActivity.json";
            if (!window.app.isUndefined(this.online) && this.online) {
                url+= "?onlineOnly=true";
                if (!window.app.isUndefined(this.admins) && this.admins) {
                    url+= "&adminsOnly=true";
                }
            } else if (!window.app.isUndefined(this.admins) && this.admins) {
                url+= "?adminsOnly=true";
            }
            return url
        } else if (!window.app.isUndefined(this.project) && this.representative) {
            return "api/project/" + this.project + "/users/representative.json";
        } else if (!window.app.isUndefined(this.project) && this.admin) {
                return "api/project/" + this.project + "/admin.json";
        } else if (!window.app.isUndefined(this.project) && this.creator) {
            return "api/project/" + this.project + "/creator.json";
        } else if (!window.app.isUndefined(this.project) && this.online) {
            return "api/project/" + this.project + "/user.json?online=true";
        } else if (!window.app.isUndefined(this.project)) {
            return "api/project/" + this.project + "/user.json";
        } else if (!window.app.isUndefined(this.ontology)) {
            console.log("ontologyYYY=" + this.ontology);
            return "api/ontology/" + this.ontology + "/user.json";
        } else if (!window.app.isUndefined(this.group)) {
            return "api/group/" + this.group + "/user.json";
        } else if (!window.app.isUndefined(this.withRoles)) {
            return "api/user.json?withRoles="+this.withRoles;
        } else {
            return "api/user.json";
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.project = options.project;
        this.ontology = options.ontology;
        this.admin = options.admin;
        this.creator = options.creator;
        this.online = options.online;
        this.representative = options.representative;
        this.group = options.group;
        this.withRoles = options.withRoles;
        this.withActivity = options.withActivity;
        this.admins = options.admins;
    },
    comparator: function (user) {
        if (user.get("lastname") != undefined) {
            return user.get("lastname") + " " + user.get("firstname")
        }
        else {
            if(user.get("username")==undefined) {
                return -1;
            } else{
                return user.get("username").toLowerCase();
            }
        }
    }
});




var UserLayerCollection = PaginatedCollection.extend({
    url: function () {
        if (!window.app.isUndefined(this.project) && !window.app.isUndefined(this.image)) {
            return "api/project/" + this.project + "/userlayer.json?image="+this.image;
        } else if (!window.app.isUndefined(this.project)) {
            return "api/project/" + this.project + "/userlayer.json";
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.project = options.project;
        this.image = options.image;
    }
});


var UserGroup = Backbone.Model.extend({
    url: function () {
        if (!window.app.isUndefined(this.group) && !this.isNew()) {
            return "api/user/" + this.user + "/group/"+this.group+".json";
        } else {
            return "api/user/" + this.user + "/group.json";
        }
    },
    initialize: function (options) {
        this.user = options.user;
        this.group = options.group;
    }
});

var UserSecRole = Backbone.Model.extend({
    url: function () {
        if (!window.app.isUndefined(this.role) || this.isNew()) {
            if (!window.app.isUndefined(this.highest)) {
                return "api/user/" + this.user + "/role.json?highest=true";
            }
            return "api/user/" + this.user + "/role.json";
        } else {
            return "api/user/" + this.user + "/role/" + this.role + ".json";
        }
    },
    initialize: function (options) {
        this.user = options.user;
        this.role = options.role;
        this.highest = options.highest;
    }
});


// define our collection
var UserJobCollection = PaginatedCollection.extend({
    model: UserModel,
    url: function () {
        if (this.project && !this.tree && !this.image) {
            return "api/project/" + this.project + "/userjob.json";
        } else if (this.project && this.image) {
            return "api/project/" + this.project + "/userjob.json?image=" + this.image;
        } else if (this.project && this.tree) {
            return "api/project/" + this.project + "/userjob.json?tree=true";
        } else {
            return "api/userjob.json";
        }
    },
    prettyName: function () {
        return this.get('softwareName');
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.project = options.project;
        this.image = options.image;
        this.tree = options.tree || false;
    }, comparator: function (user) {
        var newString = ""
        if (!user.get("created")) {
            return user.get("created")
        }
        //substract each datetime digit from 9 (e.g 3 => 6 because 9-3; 123 => 876).
        //It was impossible to sort with two critera and 1 asc and 1 desc
        //So sort with 2 asc but the second critera value is invert
        for (counter = 0; counter < user.get("created").toString().length; counter++) {
            newString = newString + (9 - user.get("created").toString()[counter]);
        }
        return user.get("softwareName") + newString;
    }, invertNumber: function (number) {

    }
});

var UserLockModel = Backbone.Model.extend({
    initialize: function (options) {
        this.userId = options.userId;
    },
    url: function () {
        return "/api/user/"+ this.userId +"/lock";
    }
});
