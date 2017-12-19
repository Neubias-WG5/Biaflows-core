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

var ApplicationController = Backbone.Router.extend({

    models: {},
    controllers: {},
    view: null,
    status: {},

    routes: {
        "": "initialRoute",
        "explorer": "explorer"
    },

    startup: function () {
        var self = this;

        var pingURL = 'server/ping';
        var oldStatus = self.status;
        self.status = new Status(pingURL, self.serverDownCallback,
            function (data) {
                if (!data.get('authenticated')) {
                    console.log("Deconnexion");
                    self.status.stop();
                    window.location = "logout";
                }

            }, 20000);
        for (var key in oldStatus) {
            self.status[key] = oldStatus[key];
        }

        HotKeys.initHotKeys();

//        require([
//            "text!application/templates/explorer/SimilarAnnotationModal.tpl.html"
//        ],
//            function (retrievalTpl) {
//                var template = _.template(retrievalTpl,{});
//                $("#similarannotationmodal").append(template);
//                $('#tabSimilarAnnotation a').click(function (e) {
//                    e.preventDefault();
//                    $(this).tab('show');
//                })
//            });

        self.view = new ApplicationView({
            el: $('#content')
        });

        //init collections
        self.models.images = new ImageCollection({project: undefined});
        self.models.imagesinstance = new ImageInstanceCollection({project: undefined});
        self.models.slides = new SlideCollection({project: undefined});
        self.models.terms = new TermCollection({project: undefined});
        self.models.ontologies = new OntologyCollection();
        self.models.ontologiesLigth = new OntologyCollection({light: true});
        self.models.disciplines = new DisciplineCollection();
        self.models.projects = new ProjectCollection({description:true});
        self.models.annotations = new AnnotationCollection({});

        self.models.imagesequence = new ImageSequenceCollection({group: undefined});
        self.models.imagegroup = new ImageGroupCollection({project: undefined});

        //"hashtable" with custom collection (useful in software page)
        self.models.currentCollection = {};

        //fetch models
        var modelsToPreload = [];
        if (_.size(modelsToPreload) == 0) {
            self.modelFetched(0, 0);
        } else {
            var nbModelFetched = 0;
            _.each(modelsToPreload, function (model) {
                model.fetch({
                    success: function (model, response) {
                        self.modelFetched(++nbModelFetched, _.size(modelsToPreload));
                    }
                });
            });
        }
//        Feedback({h2cPath:'lib/feedback.js-master/examples/js/html2canvas.js',appendTo:document.getElementById('feebackCapture')});
    },

    modelFetched: function (cpt, expected) {
        var self  = this;
        if (cpt == expected) {
            var callback = function() {
                self.view.render(self.start);
                CustomUI.hideOrShowComponents();
            };
            CustomUI.customizeUI(callback);
        }
    },

    //tmp area where we store the image
    //usefull if we already have the image when we open explore (no GET image)
    setNewImage : function(image) {
        this.newImage = {};
        this.newImage.position = false;
        this.newImage.image = image;
    },
    setNewImageWithPosition : function(image,x,y,zoom) {
        this.setNewImage(image);
        this.newImage.position = true;
        this.newImage.x = x;
        this.newImage.y = y;
        this.newImage.zoom = zoom;
    },
    popNewImage : function() {
        var newImage = this.newImage
        this.newImage = null;
        return newImage
    },
    start: function () {
        window.app.controllers.image = new ImageController();
        window.app.controllers.project = new ProjectController();
        window.app.controllers.dashboard = new DashboardController();
        window.app.controllers.browse = new ExplorerController();
        window.app.controllers.ontology = new OntologyController();
        window.app.controllers.upload = new UploadController();
        window.app.controllers.command = new CommandController();
        window.app.controllers.annotation = new AnnotationController();
        window.app.controllers.activity = new ActivityController();
        window.app.controllers.search = new SearchController();
        window.app.controllers.account = new AccountController();
        window.app.controllers.phono = new PhonoController();
        window.app.controllers.userdashboard = new UserDashboardController();
        window.app.controllers.admin = new AdminController();

        window.app.controllers.imagegroup = new ImageGroupController();

        window.app.view.initPreferences();
        window.app.view.initUserMenu();

        //Start the history
        Backbone.history.start();
    },
    initialize: function () {
        var self = this;


        //init controllers
        self.controllers.auth = new AuthController();

        require(["text!application/templates/ServerDownDialog.tpl.html"], function (serverDownTpl) {

            self.serverDownCallback = function (status) {
                window.app.view.clearIntervals();
                $("#content").fadeOut('slow').empty();
                $(".navbar").remove();
                new ConfirmDialogView({
                    el: '#dialogs',
                    template: serverDownTpl,
                    dialogAttr: {
                        dialogID: "#server-down"
                    }
                }).render();
            };
            var successcallback = function (data) {
                console.log("Launch app!");
                console.log(data);
                self.status.version = data.get('version');
                self.status.serverURL = data.get('serverURL');
                self.status.serverID = data.get('serverID');
                if (data.get('authenticated')) {
                    new UserModel({id: "current"}).fetch({
                        success: function (model, response) {
                            self.status.user = {
                                id: data.get('user'),
                                authenticated: data.get('authenticated'),
                                model: model,
                                filenameVisible : true
                            }
                            self.startup();
                        }
                    });

                } else {
                    self.controllers.auth.login();
                }
            };


            var project = window.app.status.currentProject
            if (project == undefined) {
                project = "null";
            }
            new PingModel({project: project}).save({}, {
                    success: function (model, response) {
                        console.log("Ping success first!");
                        successcallback(model)
                    },
                    error: function (model, response) {
                        console.log("Ping error!");
                    }
                }
            );



        });


    },

    explorer: function () {
        this.view.showComponent(this.view.components.explorer);
    },

    /*upload: function() {
     this.view.showComponent(this.view.components.upload);
     },*/

    admin: function () {
        this.view.showComponent(this.view.components.admin);
    },

    warehouse: function () {
        this.view.showComponent(this.view.components.warehouse);
    },

    initialRoute: function () {
        this.navigate("#userdashboard", true);
    },
    convertLongToDate: function (longDate) {
        var createdDate = new Date();
        createdDate.setTime(longDate);

        //date format
        var year = createdDate.getFullYear();
        var month = (createdDate.getMonth() + 1) < 10 ? "0" + (createdDate.getMonth() + 1) : (createdDate.getMonth() + 1);
        var day = (createdDate.getDate()) < 10 ? "0" + (createdDate.getDate()) : (createdDate.getDate());

        var hour = (createdDate.getHours()) < 10 ? "0" + (createdDate.getHours()) : (createdDate.getHours());
        var min = (createdDate.getMinutes()) < 10 ? "0" + (createdDate.getMinutes()) : (createdDate.getMinutes());

        return year + "-" + month + "-" + day + " " + hour + "h" + min;
    },
    convertLongToDateShort: function (longDate) {
        var createdDate = new Date();
        createdDate.setTime(longDate);

        //date format
        var year = createdDate.getFullYear();
        var month = (createdDate.getMonth() + 1) < 10 ? "0" + (createdDate.getMonth() + 1) : (createdDate.getMonth() + 1);
        var day = (createdDate.getDate()) < 10 ? "0" + (createdDate.getDate()) : (createdDate.getDate());
        return year + "-" + month + "-" + day;
    },
    convertLongToPrettyDate: function (longDate) {
        /*
         * JavaScript Pretty Date
         * Copyright (c) 2011 John Resig (ejohn.org)
         * Licensed under the MIT and GPL licenses.
         * 20140506: updated by lrollus
         */

        // Takes an ISO time and returns a string representing how
        // long ago the date represents.
        if(isNaN(parseFloat(longDate)) || !isFinite(longDate)) return longDate;
        var date = new Date();
        date.setTime(longDate);

        var diff = (((new Date()).getTime() - date.getTime()) / 1000),
            day_diff = Math.floor(diff / 86400);

        if ( isNaN(day_diff)) {
            return;
        }
        if ( day_diff < 0){
            console.log("ApplicationController : convertLongToPrettyDate : WARNING : day_diff is in future.")
            return "Not known";
        }

        var result = day_diff == 0 && (
            diff < 60 && "just now" ||
            diff < 120 && "1 minute ago" ||
            diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
            diff < 7200 && "1 hour ago" ||
            diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
            day_diff === 1 && "Yesterday" ||
            day_diff < 7 && day_diff + " days ago" ||
            day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";

        if(!result) {
            var printFullDate = function (longDate) {
                var createdDate = new Date();
                createdDate.setTime(longDate);

                //date format
                var year = createdDate.getFullYear();
                var month = (createdDate.getMonth() + 1) < 10 ? "0" + (createdDate.getMonth() + 1) : (createdDate.getMonth() + 1);
                var day = (createdDate.getDate()) < 10 ? "0" + (createdDate.getDate()) : (createdDate.getDate());
                return year + "-" + month + "-" + day;
            };
            result = printFullDate(date);
        }
        return result;

    },
    convertLongToPrettyDuration: function (seconds){
        var numyears = Math.floor(seconds / 31536000);
        var numdays = Math.floor((seconds % 31536000) / 86400);
        var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
        var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
        var numseconds = Math.floor((((seconds % 31536000) % 86400) % 3600) % 60);
        var result = "";
        if(numyears > 0) {
            result += numyears + " year";
            if(numyears > 1) result += "s";
        }
        result += " ";
        if(numdays > 0) {
            result += numdays + " day";
            if(numdays > 1) result += "s";
        }
        result += " ";
        if(numhours > 0) {
            result += numhours + " hour";
            if(numhours > 1) result += "s";
        }
        result += " ";
        if(numminutes > 0) {
            result += numminutes + " minute";
            if(numminutes > 1) result += "s";
        }
        result += " ";
        if(numseconds > 0) {
            result += numseconds + " second";
            if(numseconds > 1) result += "s";
        }
        if(seconds < 1) result = "Less than 1 second";

        result = result.replace(/\s+/g, " ");
        return result;
    },
    isUndefined: function(variable){
        return (typeof variable === "undefined" || variable === null);
    },
    minString: function (string, maxFirstCar, maxLastCar) {
        if (string.length <= (maxFirstCar + maxLastCar + 5)) {
            return  string;
        }
        var start = string.substr(0, maxFirstCar);
        var end = string.substr((string.length - maxLastCar), maxLastCar);

        return start + "[...]" + end;
    },
    replaceVariable: function (value) {
        if (!value) {return value;} //return undefined of not defined...

        var result = value;
        result = result.replace("$currentProjectCreationDate$", window.app.status.currentProjectModel.get('created'));
        result = result.replace("$currentProject$", window.app.status.currentProject);
        result = result.replace("$cytomineHost$", window.location.protocol + "//" + window.location.host);
        result = result.replace("$currentDate$", new Date().getTime());
        result = result.replace("$currentOntology$", window.app.status.currentProjectModel.get('ontology'));
        return result;
    },
    retrieveTerm: function (ontology) {
        var self = this;
        return new TermCollection(self.retrieveChildren(ontology.attributes));
    },
    retrieveChildren: function (parent) {
        var self = this;
        if (parent['children'] == null || parent['children'].length == 0) {
            return [];
        }
        var children = [];
        _.each(parent['children'], function (elem) {
            children.push(elem);
            children = _.union(children, self.retrieveChildren(elem));
        });
        return children;
    },
    isCollectionUndefinedOrEmpty: function (collection) {
        console.log(collection);
        return (collection == undefined || (collection == 1 && collection.at(0).id == undefined))
    },
    getFromCache: function (key) {
        return  this.models.currentCollection[key];
    },
    addToCache: function (key, value) {
        this.models.currentCollection[key] = value;
    },
    clearCache: function () {
        this.models.currentCollection = {};
    },
    addOrReplaceEvent: function (element, eventType, fCallback) {
        if (!element || !element.data('events') || !element.data('events')[eventType] || !fCallback) {
            return false;
        }

        for (runner in element.data('events')[eventType]) {
            if (element.data('events')[eventType][runner].handler == fCallback) {
                return true;
            }

        }

        return false;
    },
    getInfoClient: function () {

        var browser = null;
        var userAgent = navigator.userAgent;

        var i;
        var index;
        // Chrome
        if (userAgent.indexOf("Chrome/") > -1){
            browser = "Chrome";
            index = userAgent.indexOf("Chrome/");
            i = "Chrome/".length;
        }
        // IceWeasel
        else if (userAgent.indexOf("Iceweasel/") > -1){
            browser = "Iceweasel";
            index = userAgent.indexOf("Iceweasel/");
            i = "Iceweasel/".length;
        }
        // Firefox
        else if (userAgent.indexOf("Firefox/") > -1){
            browser = "Firefox";
            index = userAgent.indexOf("Firefox/");
            i = "Firefox/".length;
        }
        //MSIE
        else if (userAgent.indexOf("MSIE") > -1){
            browser = "Internet Explorer";
            index = userAgent.indexOf("MSIE");
            i = "MSIE ".length;
        }
        // Opera
        else if (userAgent.indexOf("Opera") > -1){
            browser = "Opera";
            index = userAgent.indexOf("Version/");
            i = "Version/".length;
        }
        // Safari
        else if (userAgent.indexOf("Safari") > -1){
            browser = "Safari";
            index = userAgent.indexOf("Version/");
            i = "Version/".length;
        }

        if(browser === null){
            browser = "Unknown";
        }
        var version = "";
        if(index === -1){
            version = "Unknown"
        } else {
            while (index+i <userAgent.length) {
                var ch = userAgent.substr(index+i, 1);
                if(ch != "." && ch != " "){
                    version += ch;
                    i++;
                } else break;
            }
        }

        var os;

        //navigator.userAgent samples
        /*"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:42.0) Gecko/20100101 Firefox/42.0"
        "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:44.0) Gecko/20100101 Firefox/44.0"
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/41.0.2272.76 Chrome/41.0.2272.76 Safari/537.36"
        "Mozilla/5.0 (Windows NT 6.1; rv:40.0) Gecko/20100101 Firefox/40.0"*/

        if(userAgent.indexOf("Mac") > -1){
            os = "OSX";
        } else if(userAgent.indexOf("Win") > -1){
            os = "Windows ";

            index = userAgent.indexOf("Windows NT ");
            var l = "Windows NT ".length;
            var osVersion = userAgent.substr(index+ l, 3);
            if(osVersion.indexOf("5.1")>-1){
                os += " XP";
            } else if(osVersion.indexOf("6.0")>-1){
                os += " Vista";
            } else if(osVersion.indexOf("6.1")>-1){
                os += " 7";
            } else if(osVersion.indexOf("6.2")>-1){
                os += " 8";
            } else if(osVersion.indexOf("10.0")>-1){
                os += " 10";
            }
        } else if(userAgent.indexOf("Ubuntu") > -1){
            os = "Ubuntu";
        } else if(userAgent.indexOf("Linux") > -1){
            os = "Linux";
        } else {
            os = "Unknown";
        }

        return {os : os, browser : browser, browserVersion : version};

    }
});
