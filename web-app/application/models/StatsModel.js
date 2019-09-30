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
 * Time: 10:53
 * To change this template use File | Settings | File Templates.
 */
var StatsModel = Backbone.Model.extend({

    url: function () {
        if (!window.app.isUndefined(this.project)) {
            return "api/project/" + this.project + "/stats/term.json";
        } else if (!window.app.isUndefined(this.term)) {
            return "api/term/" + this.term + "/project/stat.json";
        } else {
            return "api/stat.json";
        }
    },
    initialize: function (options) {
        this.project = options.project;
        this.term = options.term;
    }
});

var StatsProjectSoftwareModel = Backbone.Model.extend({
    url: function () {
        if (!window.app.isUndefined(this.project) && !window.app.isUndefined(this.software)) {
            return "api/project/" + this.project + "/software/" + this.software + "/stats.json";
        }
    },
    initialize: function (options) {
        this.project = options.project;
        this.software = options.software;
    }
});


var StatsRetrievalSuggestionAVGModel = Backbone.Model.extend({
    url: function () {
        if (!window.app.isUndefined(this.project) && !window.app.isUndefined(this.software)) {
            return "api/stats/retrieval/avg.json?project=" + this.project + "&software=" + this.software;
        } else if (!window.app.isUndefined(this.job)) {
            return "api/stats/retrieval/avg.json?job=" + this.job;
        }
    },
    initialize: function (options) {
        this.project = options.project;
        this.software = options.software;
        this.job = options.job;
    }
});

var StatsRetrievalSuggestionMatrixModel = Backbone.Model.extend({
    url: function () {
        console.log("StatsRetrievalSuggestionMatrixModel=" + this.project + "#" + this.software + "#" + this.job);
        if (!window.app.isUndefined(this.project) && !window.app.isUndefined(this.software)) {
            return "api/stats/retrieval/confusionmatrix.json?project=" + this.project + "&software=" + this.software;
        } else if (!window.app.isUndefined(this.job)) {
            return "api/stats/retrieval/confusionmatrix.json?job=" + this.job;
        }
    },
    initialize: function (options) {
        this.project = options.project;
        this.software = options.software;
        this.job = options.job;
    }
});

var StatsRetrievalSuggestionWorstTermModel = Backbone.Model.extend({
    url: function () {
        if (!window.app.isUndefined(this.project) && !window.app.isUndefined(this.software)) {
            return "api/stats/retrieval/worstTerm.json?project=" + this.project + "&software=" + this.software;
        } else if (!window.app.isUndefined(this.job)) {
            return "api/stats/retrieval/worstTerm.json?job=" + this.job;
        }
    },
    initialize: function (options) {
        this.project = options.project;
        this.software = options.software;
        this.job = options.job;
    }
});

var StatsRetrievalSuggestionWorstTermWithSuggest = Backbone.Model.extend({
    url: function () {
        if (!window.app.isUndefined(this.project) && !window.app.isUndefined(this.software)) {
            return "api/stats/retrieval/worstTermWithSuggest.json?project=" + this.project + "&software=" + this.software;
        } else if (this.job != undefined) {
            return "api/stats/retrieval/worstTermWithSuggest.json?job=" + this.job;
        }
    },
    initialize: function (options) {
        this.project = options.project;
        this.software = options.software;
        this.job = options.job;
    }
});


var StatsRetrievalSuggestionWorstAnnotationModel = Backbone.Model.extend({
    url: function () {
        if (!window.app.isUndefined(this.project) && !window.app.isUndefined(this.software)) {
            return "api/stats/retrieval/worstAnnotation.json?project=" + this.project + "&software=" + this.software;
        } else if (!window.app.isUndefined(this.job)) {
            return "api/stats/retrieval/worstAnnotation.json?job=" + this.job;
        }
    },
    initialize: function (options) {
        this.project = options.project;
        this.software = options.software;
        this.job = options.job;
    }
});

var StatsRetrievalSuggestionEvolutionModel = Backbone.Model.extend({
    url: function () {
        if (!window.app.isUndefined(this.project) && !window.app.isUndefined(this.software)) {
            return "api/stats/retrieval/evolution.json?project=" + this.project + "&software=" + this.software;
        } else if (!window.app.isUndefined(this.job)) {
            return "api/stats/retrieval/evolution.json?job=" + this.job;
        }
    },
    initialize: function (options) {
        this.project = options.project;
        this.software = options.software;
        this.job = options.job;
    }
});

var StatsRetrievalEvolutionModel = Backbone.Model.extend({
    url: function () {
        if (!window.app.isUndefined(this.project) && !window.app.isUndefined(this.software) && window.app.isUndefined(this.term)) {
            return "api/stats/retrieval-evolution/evolution.json?project=" + this.project + "&software=" + this.software;
        } else if (!window.app.isUndefined(this.project) && !window.app.isUndefined(this.software) && !window.app.isUndefined(this.term)) {
            return "api/stats/retrieval-evolution/evolutionByTerm.json?project=" + this.project + "&software=" + this.software + "&term=" + this.term;
        } else if (!window.app.isUndefined(this.job) && window.app.isUndefined(this.term)) {
            return "api/stats/retrieval-evolution/evolution.json?job=" + this.job;
        } else if (!window.app.isUndefined(this.job)) {
            return "api/stats/retrieval-evolution/evolutionByTerm.json?job=" + this.job + "&term=" + this.term;
        }
    },
    initialize: function (options) {
        this.project = options.project;
        this.software = options.software;
        this.job = options.job;
        this.term = options.term;
    }
});


// define our collection
var StatsTermCollection = PaginatedCollection.extend({
    model: StatsModel,

    url: function () {
        if (!window.app.isUndefined(this.project)) {
            return "api/project/" + this.project + "/stats/term.json";
        } else if (!window.app.isUndefined(this.term)) {
            return "api/term/" + this.term + "/project/stat.json";
        } else {
            return "api/stat.json";
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.project = options.project;
        this.term = options.term;
    }
});

// define our collection
var StatsUserCollection = PaginatedCollection.extend({
    model: StatsModel,

    url: function () {
        if (!window.app.isUndefined(this.project)) {
            return "api/project/" + this.project + "/stats/user.json";
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.project = options.project;
    }
});

var StatsUserAnnotationCollection = PaginatedCollection.extend({
    model: StatsModel,

    url: function () {
        if (!window.app.isUndefined(this.project)) {
            return "api/project/" + this.project + "/stats/userannotations.json";
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.project = options.project;
    }
});

var StatsTermSlideCollection = PaginatedCollection.extend({
    model: StatsModel,

    url: function () {
        if (!window.app.isUndefined(this.project)) {
            return "api/project/" + this.project + "/stats/termslide.json";
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.project = options.project;
    }
});

var StatsUserSlideCollection = PaginatedCollection.extend({
    model: StatsModel,

    url: function () {
        if (!window.app.isUndefined(this.project)) {
            return "api/project/" + this.project + "/stats/userslide.json";
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.project = options.project;
    }
});

var StatsAnnotationEvolutionCollection = PaginatedCollection.extend({
    model: StatsModel,

    url: function () {
        if (!window.app.isUndefined(this.project)) {
            return "api/project/" + this.project + "/stats/annotationevolution.json?daysRange=" + this.daysRange + "&term=" + this.term;
        }
    },
    initialize: function (options) {
        this.initPaginator(options);
        this.project = options.project;
        this.daysRange = options.daysRange;
        this.term = options.term;
    }
});


