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

Storage.prototype.OriginalSetItem = Storage.prototype.setItem;
Storage.prototype.OriginalGetItem = Storage.prototype.getItem;

Storage.prototype.setItem = function (key, value) {
    this.OriginalSetItem(window.app.status.serverID+"-"+key, value);
};

Storage.prototype.getItem = function (key) {
    return this.OriginalGetItem(window.app.status.serverID+"-"+key);
};

Storage.prototype.setObject = function (key, value) {
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function (key) {
    return JSON.parse(this.getItem(key));
};

var ApplicationView = Backbone.View.extend({

    tagName: "div",
    className: "layout",
    components: {},
    intervals: [], //references to followInterval, positionInterval...
    isMobile: ( navigator.userAgent.match(/iPad/i) != null ),
    events: {

    },

    /* Will add an interval that will execute the function fct only if the tab is visible, if we are into the parentComponent and if condition is true (if condition is given).
    * Each time a component is selected, all the interval of this component will immediately be triggered.*/
    addInterval: function (fct, time, condition) {
        var self = this;
        var interval = {
            //paused : false,
            parentComponent : self.currentComponent,
            run: function(){
                if(!document.hidden && this.parentComponent === self.currentComponent){
                    if(window.app.isUndefined(condition) || condition){
                        fct();
                    }
                }
            }
        };
        interval.loop = setInterval(function () {
            interval.run();
        }, time);
        this.intervals.push(interval);

        return interval;
    },
    clearIntervals: function () {
        _.each(this.intervals, function (interval) {
            clearInterval(interval.loop);
        });
        this.intervals = [];
    },
    /**
     *  UNDO the last command
     */
    undo: function () {
        window.app.controllers.command.undo();
    },

    /**
     * REDO the last command
     */
    redo: function () {
        window.app.controllers.command.redo();
    },

    /**
     * ApplicationView constructor. Call the initialization of its components
     * @param options
     */
    initialize: function (options) {
    },
    /**
     * Render the html into the DOM element associated to the view
     * @param tpl
     */
    doLayout: function (tpl, renderCallback) {
        var self = this;
        $("body").prepend(_.template(tpl, {}));
        _.each(this.components, function (component) {
            component.render();
        });
        self.initEvents();
        renderCallback.call();
        return this;
    },
    initEvents: function () {
        $(document).on('click',"#undo",this.undo);
        $(document).on('click',"#redo",this.redo);
//
//        $("#undo").on('click', this.undo);
//        $("#redo").on('click', this.redo);
    },
    /**
     * Grab the layout and call ask for render
     */
    render: function (renderCallback) {
        this.initComponents();
        var self = this;
        require([
            "text!application/templates/BaseLayout.tpl.html","text!application/templates/HotkeysDialog.tpl.html"
        ],
            function (tpl,tplHotkeys) {
                self.doLayout(tpl, renderCallback);
                var modal = new CustomModal({
                    idModal : "hotkeysModal",
                    button : $("#hotkeysModalButton"),
                    header :"Hotkeys",
                    body :tplHotkeys,
                    wide: true
                });
                modal.addButtons("closeHotKeys","Close",true,true);
            });
        return this;
    },
    initPreferences: function () {
        _.each(this.panelsConfiguration, function (item) {
            if (window.localStorage.getItem(item.key)) {
                return;
            }
            window.localStorage.setItem(item.key, item.value);
        });
    },
    applyPreferences: function () {
        var self = this;
        _.each(self.panelsConfiguration, function (item) {
            self.updateMenuItem(item);
        });
    },
    initUserMenu: function () {
        var self = this;
        self.showHideMenuAction();
        //Init user menu
        $("#logout").click(function () {
            window.app.controllers.auth.logout();
            return false;
        });
        $("#loggedUser").html(window.app.status.user.model.prettyName());
        if(window.app.status.user.model.get("isSwitched")) {
            $("#loggedUser").css("color","#ff0000");
            $("#li-cancel-switch-user").show();
            $("#a-cancel-switch-user").append(" Go back to " + window.app.status.user.model.get("realUser"));
            $("#a-cancel-switch-user").css("color","#d2322d");
        } else {
            $("#li-cancel-switch-user").hide();
        }


        if(window.app.status.user.model.get("adminByNow")) {
            //user is admin and an admin session is open
            $("#userIcon").addClass("glyphicon");
            $("#userIcon").addClass("glyphicon-star");
        } else {
            $("#userIcon").addClass("glyphicon");
            $("#userIcon").addClass("glyphicon-user");
        }

        if(window.app.status.user.model.get("adminByNow")) {
            //user is admin and an admin session is open
            $("#warning-user-logged-as-admin").show();
            $("#li-close-admin-session").show();
            $("#li-close-admin-session").on("click", function (e) {
                e.preventDefault();
                $.get( "grantRole/closeAdminSession.json", function( data ) {
                    location.reload(true);
                });
            });
        } else if (window.app.status.user.model.get("admin")){
            $("#li-open-admin-session").show();
            $("#li-open-admin-session").on("click", function (e) {
                e.preventDefault();
                $.get( "grantRole/openAdminSession.json", function( data ) {
                    location.reload(true);
                });
            });
        }



        $("#a-info-cytomine").click(function () {
            var body;
            require([
                    "text!application/templates/about/About.tpl.html"
                ],
                function (tpl) {
                    body = _.template(tpl, {version : window.app.status.version, mail : "biaflows@neubias.org", url : window.app.status.serverURL});

                    var modal = new CustomModal({
                        idModal: "about" + "DialogModal",
                        header: "<i class=\"glyphicon glyphicon-info-sign\"/> About <span style=\"color: #fe7f7f;\">BIA</span>FLOWS",
                        body: body,
                        wide: true
                    });

                    modal.render();
                    $('#' + "about" + 'DialogModal').modal();// display the dialog box

                    //$(".modal-header").hide();
                    $(".modal-footer").hide();
                    $("#aboutCyt").css('width', 'auto');
                }
            );
            return false;
        });

        $(".a-info-video-benchmarking").click(function () {
            var body = "<div style=\"position: relative; padding-bottom: 56.25%; height: 0;\"><iframe src=\"https://www.useloom.com/embed/433762f568f949f794248327f770220f\" frameborder=\"0\" webkitallowfullscreen mozallowfullscreen allowfullscreen style=\"position: absolute; top: 0; left: 0; width: 100%; height: 100%;\"></iframe></div>";

            var modal = new CustomModal({
                idModal: "video-benchmarking-modal",
                header: "<i class=\"fab fa-youtube\"></i> Screencast: How to use BIAFLOWS",
                body: body,
                wide: true
            });

            modal.render();
            $("#video-benchmarking-modal").modal();
            $(".modal-footer").hide();
            return false;
        });

        $(".a-info-video-multidim").click(function () {
            var body = "<div style=\"position: relative; padding-bottom: 56.25%; height: 0;\"><iframe src=\"https://www.useloom.com/embed/84b22ce550464b1b9a805200561059b6\" frameborder=\"0\" webkitallowfullscreen mozallowfullscreen allowfullscreen style=\"position: absolute; top: 0; left: 0; width: 100%; height: 100%;\"></iframe></div>";

            var modal = new CustomModal({
                idModal: "video-multidim-modal",
                header: "<i class=\"fab fa-youtube\"></i> Screencast: Viewing multidimensional images",
                body: body,
                wide: true
            });

            modal.render();
            $("#video-multidim-modal").modal();
            $(".modal-footer").hide();
            return false;
        });

        $(".a-info-video-multiview").click(function () {
            var body = "<div style=\"position: relative; padding-bottom: 56.25%; height: 0;\"><iframe src=\"https://www.useloom.com/embed/20206099418f444eb2cb0534e9a84a0a\" frameborder=\"0\" webkitallowfullscreen mozallowfullscreen allowfullscreen style=\"position: absolute; top: 0; left: 0; width: 100%; height: 100%;\"></iframe></div>";

            var modal = new CustomModal({
                idModal: "video-multiview-modal",
                header: "<i class=\"fab fa-youtube\"></i> Screencast: Visually comparing results from multiple workflows",
                body: body,
                wide: true
            });

            modal.render();
            $("#video-multiview-modal").modal();
            $(".modal-footer").hide();
            return false;
        })

    },
    showHideMenuAction : function() {
        _.each(window.app.status.customUI.global,function(val,key) {
            if(val) {
                $("#custom-ui-"+key).show();
            } else {
                $("#custom-ui-"+key).hide();
            }
        });
    },

    printTaskEvolution: function (task, divToFill, timeout, reverse) {
        function checkTask() {
            //load all job data
            console.log(task);
            new TaskModel({id: task.id}).fetch({
                    success: function (taskInfo, response) {
                        divToFill.empty();
                        divToFill.append('' +
                            '<div class="progress progress-striped active">' +
                            '   <div class="bar" style="background-color:#2C3E50;height:50px;width: ' + taskInfo.get('progress') + '%;"></div>' +
                            '</div>');
                        divToFill.append(taskInfo.get('comments').reverse().join('<br>'));
                    },
                    error: function (collection, response) {
                        console.log("error getting task");
                    }}
            );
        }

        checkTask();
        var timer = setInterval(function () {
            checkTask();
        }, timeout);
        return timer;
    },
    /**
     * Initialize the components of the application
     */
    initComponents: function () {
        var self = this;
        require([
            "text!application/templates/user/UserDashboardComponent.tpl.html",
            "text!application/templates/upload/UploadComponent.tpl.html",
            "text!application/templates/project/ProjectComponent.tpl.html",
            "text!application/templates/ontology/OntologyComponent.tpl.html",
            "text!application/templates/explorer/ExplorerComponent.tpl.html",
            "text!application/templates/admin/AdminComponent.tpl.html",
            "text!application/templates/activity/ActivityComponent.tpl.html",
            "text!application/templates/account/AccountComponent.tpl.html",
            "text!application/templates/search/SearchComponent.tpl.html",
            "text!application/templates/software/SoftwareComponent.tpl.html"
        ],
            function (userDashboardTpl,uploadTpl, projectTpl, ontologyTpl, explorerTpl, adminTpl, activityTpl,
                      accountTpl, searchTpl, softwareTpl) {

                var activeInterval = function(){
                    _.each(self.intervals, function (interval) {
                        if(interval.parentComponent === self.currentComponent){
                            // I don't wait x seconds to see the changes, if I go back to my tabs, the ajax will be made immediately
                            interval.run();
                        }
                    });
                };

                self.components.userdashboard = new Component({
                    el: "#content",
                    template: _.template(userDashboardTpl, {}),
                    buttonAttr: {
                        elButton: "userdashboard-button"
                    },
                    divId: "userdashboard",
                    onActivate: function () {
                        self.currentComponent = this;
                        activeInterval();
                    }
                });
                self.components.search = new Component({
                    el: "#content",
                    template: _.template(searchTpl, {}),
                    buttonAttr: {
                        elButton: "search-button"
                    },
                    divId: "search",
                    onActivate: function () {
                        self.currentComponent = this;
                        activeInterval();
                    }
                });
                self.components.activity = new Component({
                    el: "#content",
                    template: _.template(activityTpl, {}),
                    buttonAttr: {
                        elButton: "activity-button"
                    },
                    divId: "activity",
                    onActivate: function () {
                        self.currentComponent = this;
                        activeInterval();
                    }
                });
                self.components.upload = new Component({
                    el: "#content",
                    template: _.template(uploadTpl, {}),
                    buttonAttr: {
                        elButton: "upload-button"
                    },
                    divId: "upload",
                    onActivate: function () {
                        self.currentComponent = this;
                        activeInterval();
                    }
                });
                self.components.account = new Component({
                    el: "#content",
                    template: _.template(accountTpl, {}),
                    buttonAttr: {
                        elButton: "account-button"
                    },
                    divId: "account",
                    onActivate: function () {
                        self.currentComponent = this;
                        activeInterval();
                    }
                });
                self.components.project = new Component({
                    el: "#content",
                    template: _.template(projectTpl, {}),
                    buttonAttr: {
                        elButton: "project-button"
                    },
                    divId: "project"/*,
                     activate: function () {
                     if(self.currentComponent != this && self.currentComponent != self.components.explorer && window.app.status.currentProject != null){
                     // go to explore component
                     window.location="#explorer"
                     } else {
                     // if we are already in project panel, explore panel or if currentProject is null, go to project panel
                     self.currentComponent = self.components.project;

                     $("#" + this.divId).show();
                     $("#" + this.buttonAttr.elButton).parent().addClass("active");
                     }
                     }*/
                });
                self.components.ontology = new Component({
                    el: "#content",
                    template: _.template(ontologyTpl, {}),
                    buttonAttr: {
                        elButton: "ontology-button"
                    },
                    divId: "ontology",
                    onActivate: function () {
                        self.currentComponent = this;
                        activeInterval();
                    }
                });
                self.components.admin = new Component({
                    el: "#content",
                    template: _.template(adminTpl, {}),
                    buttonAttr: {
                        elButton: "admin-button"
                    },
                    divId: "admin",
                    onActivate: function () {
                        self.currentComponent = this;
                        activeInterval();
                    }
                });
                self.components.explorer = new Component({
                    el: "#content",
                    template: _.template(explorerTpl, {}),
                    buttonAttr: {
                        elButton: "explorer-button"//"project-button"
                    },
                    divId: "explorer",
                    activate: function () {
                        if (window.app.status.currentProject == undefined) {
                            $("#explorer > .noProject").show();
                        }
                        else {
                            $("#explorer > .noProject").hide();
                        }
                        self.currentComponent = this;
                        activeInterval();
                        $("#" + this.divId).show();
                        $("#" + this.buttonAttr.elButton).parent().addClass("active");
                    }
                });
                self.components.software = new Component({
                    el: "#content",
                    template: _.template(softwareTpl, {}),
                    buttonAttr: {
                        elButton: "software-button"
                    },
                    divId: "software",
                    onActivate: function () {
                        self.currentComponent = this;
                        activeInterval();
                    }
                });
            });
    },
    /**
     * Show a component
     * @param Component the reference to the component
     */
    showComponent: function (component) {
        _.each(this.components, function (c) {
            if (c != component) {
                c.deactivate();
            }
        });
        $("#app").show();
        component.activate();
    },
    getUserNameById: function (userId) {
        if (window.app.models.projectUser.get(userId)) {
            return window.app.models.projectUser.get(userId).prettyName();
        } else if (window.app.models.projectUserJob.get(userId)) {
            return window.app.models.projectUserJob.get(userId).get("softwareName");
        } else {
            return "undefined"; //should not appear
        }
    }
});

ApplicationView.prototype.message = function (title, message, type,timer) {
    if (type == "error") type = "danger"; //Bootstrap 3
    if (type == "" || type == undefined) {
        type = 'alert-info';
    }
    else {
        type = 'alert-' + type;
    }

    if (message != undefined) {
        message.responseText && (message = message.responseText);
    }

    var tpl = '<div style="width : 400px;" id="alert<%=   timestamp %>" class="alert <%=   type %> alert-dismissable" data-alert="alert"><p><strong><%=   alert %></strong> <%=   message %></p></div>';
    var timestamp = new Date().getTime();
    var left = ($(window).width() / 2 - 200);

    var numberOfOpenedDiv = $("#alerts").find("div.alert").length;
    var maxOtherOpenedAlert = 1;
    var divToClose = numberOfOpenedDiv-maxOtherOpenedAlert;
    if(divToClose>0) {
        $("#alerts").find("div.alert:lt("+divToClose+")").remove()
    }
    $("#alerts").css("left", left).append(_.template(tpl, { alert: title, message: message, timestamp: timestamp, type: type}));

    if(!timer) {
        timer = 3000;
    }
    setTimeout(function () {
        $("#alert" + timestamp).remove();
    }, timer);

};




