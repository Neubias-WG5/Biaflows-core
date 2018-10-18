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

var AdminView = Backbone.View.extend({
    adminDashboard: null,
    adminUsersView: null,
    adminGroupsView: null,
    adminPermissionsView : null,
    adminSoftwaresView: null,
    adminConfigView : null,
    initialize: function (options) {
        _.bindAll(this, 'render');
    },
    render: function () {
        var self = this;
        self.doLayout();
        return this;
    },
    doLayout: function (tpl) {
        $("#admin").find("#admin-tab").on('click','a[data-toggle="tab"]', function (e) {
            var hash = this.href.split("#")[1];

            $("#" + hash).attr('style', 'overflow:none;');
            window.app.controllers.admin.navigate("#" + hash, true);
        });
    },
    destroy: function() {
        var self = this;
        var views = [self.adminDashboard,self.adminUsersView,self.adminGroupsView,self.adminPermissionsView,self.adminSoftwaresView,self.adminConfigView];
        for(var i=0;i<views.length;i++){
            if(views[i]) {
                $(views[i].el).empty();
                views[i] = null;
            }
        }
    },
    refreshDashboard: function () {
        var self = this;
        if (this.adminDashboard == null) {
            this.adminDashboard = new AdminDashboard({
                //model: this.model,
                el: $(self.el).find("#admin-tabs-dashboard")
            });
        }
        this.adminDashboard.render();
    },
    refreshUsers: function () {
        var self = this;
        if (this.adminUsersView == null) {
            this.adminUsersView = new AdminUsersView({
                //model: this.model,
                el: $(self.el).find("#admin-tabs-users")
            });
        }
        this.adminUsersView.render();
    },
    refreshGroups: function () {
        var self = this;
        if (this.adminGroupsView == null) {
            this.adminGroupsView = new AdminGroupsView({
                //model: this.model,
                el: $(self.el).find("#admin-tabs-groups")
            });
        }
        this.adminGroupsView.render();
    },
    refreshPermissions: function () {
        var self = this;
        if (this.adminPermissionsView == null) {
            this.adminPermissionsView = new AdminPermissionsView({
                //model: this.model,
                el: $(self.el).find("#admin-tabs-permissions")
            });
        }
        this.adminPermissionsView.render();
    },
    refreshSoftwares: function () {
        var self = this;
        if (this.adminSoftwaresView == null) {
            this.adminSoftwaresView = new AdminSoftwaresView({
                //model: this.model,
                el: $(self.el).find("#admin-tabs-softwares")
            });
        }
        this.adminSoftwaresView.render();
    },
    refreshConfig: function () {
        var self = this;
        if (this.adminConfigView == null) {
            this.adminConfigView = new AdminConfigView ({
                //model: this.model,
                el: $(self.el).find("#admin-tabs-config")
            });
        }
        this.adminConfigView.render();
    }
});
