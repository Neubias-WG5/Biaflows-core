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

// Watcher
// -------
// Class for polling a given model (or collection) and firing a callback
// when it changes.
//
// - `model` model to watch
// - `callback` function to call when a change occurs to the model
// - `interval` interval to polling the server (in milliseconds)
var Watcher = function (model, callback, interval) {
    _.bindAll(this, 'fetch', 'destroy');
    this.model = model;
    this.callback = callback;
    this.interval = interval || 1000;
    this.current = JSON.stringify(this.model);
    this.watcher = setInterval(this.fetch, this.interval);
};

Watcher.prototype.fetch = function () {
    var that = this;
    this.model.fetch({
        silent: true,
        success: function () {
            var state = JSON.stringify(that.model);
            if (that.current !== state) {
                that.current = state;
                that.callback && that.callback();
            }
        },
        error: function () {
        }
    });
};

Watcher.prototype.destroy = function () {
    window.clearInterval(this.watcher);
};

// Status
// ------
// Class for polling a certain endpoint and firing a callback if it is down.
//
// - `url` URL to poll
// - `callback` function to call if the URL request results in an error
// - `interval` interval to poll the URL (in milliseconds)
var Status = function (url, errorcallback, successcallback, interval) {
    _.bindAll(this, 'start', 'error', 'stop');
    this.url = url;
    this.errorcallback = errorcallback;
    this.successcallback = successcallback;
    this.interval = interval || 1000;
    this.start();
};

Status.prototype.start = function () {
    var self = this;
    var ajaxFn = function () {

        if(!document.hidden) {
            var project = window.app.status.currentProject;
            if (window.app.isUndefined(project)) {
                project = "null";
            }
            new PingModel({project: project}).save({}, {
                    success: function (model, response) {
                        self.successcallback(model);
                    },
                    error: function (model, response) {
                        self.error();
                    }
                }
            );
        }
    };
    if (!this.watcher) {
        this.watcher = setInterval(ajaxFn, this.interval);
    }
};

Status.prototype.error = function () {
    this.stop();
    this.errorcallback(this);
};

Status.prototype.stop = function () {
    if (this.watcher) {
        window.clearInterval(this.watcher);
        delete this.watcher;
    }
};

/*
 * Return 1 for the January first and 365 or 366 for the Decembert 31th.
 */
Date.prototype.getDayOfYear = function(){
    var now = new Date(+this);
    var start = new Date(now.getFullYear(), 0, 0);
    var diff = now - start;
    var oneDay = 1000 * 60 * 60 * 24;
    var day = Math.round(diff / oneDay);
    return day;
};
/*
    First week begin at the first sunday of the year.
    Results is between 0 and 52.
 */
Date.prototype.getWeekNumber = function(){
    var now = new Date(+this);
    now.setHours(0,0,0);
    var d = new Date(now.getFullYear(), 0, 1);
    // set to first sunday of the year
    d.setDate(d.getDate()+(7-d.getDay())%7);
    if(now < d) return 52;
    return Math.floor((now.getDayOfYear() - d.getDayOfYear())/7);

};
