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

var ProjectDashboardAlgos = Backbone.View.extend({
    rendered: false,
    jobCollection: null,
    softwares: null,
    disableSelect: false,
    software: null,
    jobSelectView: undefined,
    jobsLight: null,
    initialize: function (options) {
        if(this.model) {
            this.el = "#tabs-algos-" + this.model.id;
        }
        this.idJob = options.idJob;
        this.idSoftware = options.idSoftware;
        this.software = options.software;
    },
    render: function () {
        var self = this;
        require([
            "text!application/templates/processing/SoftwareInfo.tpl.html"
        ],
            function (tpl) {
                self.doLayout(tpl);
                this.rendered = true;
            });
        return this;
    },
    doLayout: function (tpl) {
        var self = this;
        $(this.el).html(_.template(tpl, {}));

        //get all software from project and print menu
        new SoftwareCollection({ project: self.model.id}).fetch({
            success: function (collection, response) {
                console.log("succes!");
                if (collection.length == 0) {
                    $(self.el).html('<div class="alert alert-info" style="width : 50%; margin:auto; margin-top : 30px;">No software available for this project</div>');
                    return;
                }
                if (self.idSoftware == undefined) {
                    var lastSoftware = collection.last();
                    self.idSoftware = lastSoftware.id;
                    window.location = "#tabs-algos-" + self.model.id + "-" + self.idSoftware + "-";
                }

                self.software = collection.get(self.idSoftware);
                self.softwares = collection;
                self.initProjectSoftwareList();
                var idJob = self.idJob;
                self.changeSoftware();
                self.idJob = idJob;
                self.printProjectSoftwareInfo();
                self.printSoftwareButton();
                new JobCollection({ project: self.model.id, software: self.idSoftware, light: true}).fetch({
                    success: function (collection, response) {
                        self.jobsLight = collection;
                        //self.printComparatorLaunch();
                        self.fillJobSelectView();
                    }
                });
            }});


        return this;
    },
    refresh: function () {

        if (!this.rendered) {
            this.render();
        }
        if (this.softwares == null) {
            return;
        }

        this.software = this.softwares.get(this.idSoftware);
        this.printProjectSoftwareInfo();
    },
    refresh: function (idSoftware, idJob) {
        if (!this.softwares || this.softwares.length < 1) {
            return;
        }
        this.idJob = idJob;
        if (idSoftware == undefined) {
            idSoftware = this.idSoftware;
        }
        this.software = this.softwares.get(idSoftware);
        if (idSoftware != this.idSoftware) {
            this.idSoftware = idSoftware;
            console.log("Change software");
            this.changeSoftware();
        } else {
            this.idSoftware = idSoftware;
        }

        this.printProjectSoftwareInfo();
    },
    initProjectSoftwareList: function () {
        var self = this;
        $("#projectSoftwareListUl").empty();
        self.softwares.each(function (software) {
            var executable = (!software.get('executable')) ? '<span class="label label-default">Not executable</span>' : '';
            $("#projectSoftwareListUl").append(
                '<a class="list-group-item" id="consultSoftware-' + software.id +'" href="#tabs-algos-' + self.model.id + '-' + software.id + '-">'
              + ((software.get('deprecated')) ? '<del>' : '')
                + software.get('fullName')
                + ((software.get('deprecated')) ? '</del>' : '')
                // + ' <span class="badge list-group-badge">' + software.get('numberOfJob') + '</span> '
                + executable +'</a>');
            $("#projectSoftwareListUl").children().removeClass("active");
            if (software.id == self.idSoftware) {
                $("#consultSoftware-" + software.id).addClass("active");
            }
        });

    },
    changeSoftware: function () {
        var self = this;
        self.idJob = undefined;
        self.softwares.each(function (software) {
            $("#consultSoftware-" + software.id).removeClass("active");
        });
        $("#consultSoftware-" + self.software.id).addClass("active");
        //clean param list
        $('#selectRunParamsTable').find('tbody').empty();
        $('#job-properties-content').find('tbody').empty();
        $('#job-attached-files-content').find('tbody').empty();
        //clean result
        $("#panelJobResultsDiv").empty();
        //load result
        self.fillJobSelectView();

        if(window.app.status.user.model.get('guest')) {
            $("#softwareLaunchJobButton").remove();
        }
        else {
            if (self.software.get('executable'))
                $("#softwareLaunchJobButton").show();
            else
                $("#softwareLaunchJobButton").hide();
        }

        self.printSoftwareButton();
    },
    printProjectSoftwareInfo: function () {
        var self = this;

        console.log("printProjectSoftwareInfo1");
        //Print software details
        self.printProjectSoftwareDetails();

        //Print last job + n last job details
        //self.printLastNRun();

        console.log("printProjectSoftwareInfo2");
        //Print selected job from this software
        self.printProjectJobInfo();

    },
    changeJobSelection: function (idJob) {
        var self = this;
        window.location = '#tabs-algos-' + self.model.id + '-' + self.idSoftware + '-' + idJob;
        if (self.jobSelectView != undefined) {
            self.jobSelectView.refresh();
        }

        new SoftwareCollection({ project: self.model.id}).fetch({
            success: function (collection, response) {
                self.software = collection.get(self.idSoftware);
                self.softwares = collection;
                self.initProjectSoftwareList();
            }});
    },
    printSoftwareButton: function () {
        var self = this;

        //init modal for job launch
        var launchView = new LaunchJobView({
            software: self.software,
            project: self.model,
            el: '#jobComparatorDialogParent',
            parent: self
        });

        var modalLaunch = new CustomModal({
            idModal : "launchJobModal",
            button : $("#softwareLaunchJobButton"),
            header :"Run " + self.software.get('fullName'),
            body :"<div id='jobComparatorDialogParent'></div>",
            wide : true,
            callBack: function() {launchView.render();}
        });
        modalLaunch.addButtons("closeNewJob","Close",false,true);
        modalLaunch.addButtons("createNewJob","Launch this new job",true,false,function() {
            if(launchView.validate()){
                launchView.createJobFromParam(launchView.executeJob);
                modalLaunch.close();
            } else {
                window.app.view.message("Launch Job", "Some parameters are not valid !", "error",5000);
            }
        });


        /*
        //init modal for job compare
        var modalCompare = new CustomModal({
            idModal : "compareJobModal",
            button : $("#softwareCompareJobButton"),
            header :"Compare jobs",
            body :"<div id='jobComparatorDialogParent'></div>",
            wide : true,
            callBack: function() {
                self.jobsLight.fetch({
                            success: function (collection, response) {
                                var compareView =  new JobComparatorView({
                                       software: self.software,
                                       project: self.model,
                                       el: "#jobComparatorDialogParent",
                                       parent: self,
                                       job1: undefined,
                                       job2: undefined,
                                       softwares: self.softwares,
                                       jobs : collection
                                 }).render();
                            }
                        });
            }
        });
        modalCompare.addButtons("closeCompare","Close",false,true);


        //init modal for job filter
        var modalFilter = new CustomModal({
            idModal : "filterJobModal",
            button :  $("#softwareFilterJobButton"),
            header :"Filter jobs",
            body :"<div id='jobFilterDialogParent'></div>",
            width : Math.round($(window).width() - 200),
            height : Math.round($(window).height() - 200),
            callBack: function() {
                new JobSearchView({
                    software: self.software,
                    project: self.model,
                    idJob: self.idJob,
                    parent: self,
                    el: "#softwareSearchDialogParent"
                }).render();
            }
        });
        modalFilter.addButtons("closeCompare","Close",false,true);
        */
    },
    printComparatorLaunch: function () {
        var self = this;

        $(document).on('click',"#launchComparator", function () {
            self.jobsLight.fetch({
                success: function (collection, response) {

                    new JobComparatorView({
                        software: self.software,
                        project: self.model,
                        el: $("#jobComparatorDialogParent"),
                        parent: self,
                        jobs: collection,
                        job1: collection.get(self.idJob),
                        softwares: self.softwares
                    }).render();
                }
            });
        });
    },
    printLastNRun: function () {
        var self = this;
        var refreshData = function () {
            new JobCollection({ project: self.model.id, software: self.software.id, max: 3}).fetch({
                success: function (collection, response) {
                    var job = collection.models.length > 0 ? collection.models[0] : undefined;
                    self.fillNLastRun(collection);
                }
            });
        };
        refreshData();
        var interval = window.app.view.addInterval(refreshData, 5000);
        $(window).bind('hashchange', function () {
            clearInterval(interval.loop);
        });
    },
    printProjectJobInfo: function () {
        var self = this;
        if (self.idJob != undefined) {
            new JobModel({ id: self.idJob}).fetch({
                success: function (model, response) {
                    self.fillSelectedJobDetails(model);
                    $("#panelJobDetails").show();
                    $("#panelJobResults").show();
                    var targetOffset = $("#panelJobDetails").offset().top;
                    var currentOffset = $('html').offset().top;

                    //if not visible, scroll to job details div
                    if (!(Math.abs(targetOffset) >= Math.abs(currentOffset)) || !(Math.abs(targetOffset) <= Math.abs(currentOffset) + $(window).height() - 200)) {
                        $('html,body').animate({scrollTop: targetOffset - 50}, 500);
                    }

                }
            });
        } else {
            $("#panelJobDetails").hide();
            $("#panelJobResults").hide();
        }

    },
    printProjectSoftwareDetails: function () {
        var self = this;
        new StatsProjectSoftwareModel({project: self.model.id, software: self.software.id}).fetch({
            success: function (model, response) {
                new SoftwareDetailsView({
                    model: self.software,
                    stats: model,
                    project: self.model,
                    el: $("#softwareDetails")
                }).render();
                console.log("printProjectSoftwareDetails OK");
            }
        });
    },
    fillJobSelectView: function () {
        var self = this;

        $('#jobSelection').empty();

        new JobCollection({ project: self.model.id, software: self.software.id, light: true}).fetch({
            success: function (collection, response) {
                self.jobsLight = collection;
                self.jobSelectView = new JobSelectionView({
                    software: self.software,
                    project: self.model,
                    el: $('#jobSelection'),
                    parent: self,
                    jobs: collection,
                    comparator: false
                }).render();
            }
        });
    },
    fillNLastRun: function (jobs) {
        var self = this;

        $("#fullSoftwareDashboard").find('#panelSoftwareLastRunList').empty();
        var i = 0;
        jobs.each(function (job) {
            $("#fullSoftwareDashboard").find('#panelSoftwareLastRunList').append('<div style="margin: 0px auto;min-width:100px;max-width:200px" id="' + job.id + '"></div>');
            self.buildJobInfoElem(job, $("#fullSoftwareDashboard").find('#panelSoftwareLastRunList').find('#' + job.id));
            i++;

        });

    },
    fillSelectedJobDetails: function (job) {
        var self = this;

        if (job == undefined) {
            $('.selectRunDetails').empty();
            $('#selectRunParamsTable').find('tbody').empty();
            $('#job-properties-content').find('tbody').empty();
            $('#job-attached-files-content').find('tbody').empty();
            $("#panelJobResultsDiv").empty();
            return;
        }
        self.idJob = job.id;
        self.currentJobStatus = job.get('status');
        var refreshData = function () {
            var selectRunElem = $("#panelJobDetails").find('.selectRunDetails');
            new JobModel({ id: self.idJob}).fetch({
                success: function (model, response) {
                    selectRunElem.empty();
                    var status = model.get('status');
                    self.buildJobInfoElem(model, selectRunElem);
                    if (self.currentJobStatus != status) {
                        self.currentJobStatus = status;
                        self.jobSelectView.refresh();
                        self.buildJobPropertiesElem(job);
                        setTimeout(function() {
                            self.buildJobAttachedFilesElem(job);
                        }, 3000);
                    }

                    if (status >= 3)
                        self.clearIntervalRefresh();
                }
            });
        };
        refreshData();
        self.interval = window.app.view.addInterval(refreshData, 5000);
        $(window).bind('hashchange', function () {
            self.clearIntervalRefresh();
        });

        
        self.buildJobParamElem(job);
        self.buildJobPropertiesElem(job);
        self.buildJobAttachedFilesElem(job);
        self.printJobResult(job);
    },
    clearIntervalRefresh: function() {
        clearInterval(this.interval.loop);
    },
    buildJobInfoElem: function (job, elem) {
        var self = this;
        if (job == undefined) {
            return;
        }
        var width = $('#panelSoftwareLastRunList').find('#' + job.id).width() - 5;
        require(["text!application/templates/processing/JobInfo.tpl.html"], function (tpl) {
            var jobIcon = job.isSuccess() ? "icon-star" : "icon-star-empty";
            var hasFailed = job.isFailed();
            job.set({
                created: window.app.convertLongToDate(job.get("created")),
                status: self.getStatusElement(job, width),
                icon: jobIcon
            });
            var tpl_data = $.extend({}, {idProject: self.model.id, idSoftware: self.software.id }, job.toJSON());
            elem.append(_.template(tpl, tpl_data));
        });
    },
    getStatusElement: function (job, width) {
        var self = this;
        if (job.isNotLaunch()) {
            return self.getJobLabel("label-default", "Not launched", width);
        }
        else if (job.isInQueue()) {
            return self.getJobLabel("label-info", "In queue", width);
        }
        else if (job.isRunning()) {
            return self.getJobProgress(job, "active", 'progress', width);
        } //progress-bar not blue by default if  progress-striped (<> doc)
        else if (job.isSuccess()) {
            return self.getJobLabel("label-success", "Success", width);
        }
        else if (job.isFailed()) {
            return self.getJobLabel("label-danger", "Failed", width);
        }
        else if (job.isIndeterminate()) {
            return self.getJobLabel("label-default", "Indeterminate", width);
        }
        else if (job.isKilled()) {
            return self.getJobLabel("label-default", "Killed", width);
        }
        else if (job.isWait()) {
            return self.getJobLabel("label-warning", 'Waiting', width);
        } //progress-warning doesn't work (<> doc) :-/
        else {
            return "no supported";
        }
    },
    getJobLabel: function (className, text, width) {
        return _.template('<span class="label <%= className %>"><%= text %></span>', { className: className, text: text});
        //return '<span class="'+className+'""> '+text+'</span>';
    },
    getJobProgress: function (job, className, text, width) {   //todo: add class " progress-striped"
        //var tpl = '<div id="progresstext"> <%= text %></div><div class="progress progress-striped <%= className %>"><div class="bar" style="width : <%= progress %>%;"></div></div>';
        var tpl = '<div class="progress"><div class="progress-bar progress-bar-success progress-bar-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" style="width: <%= progress %>%;"><%= progress %>%</div></div>';
        return _.template(tpl, {text: text, className: className, progress: job.get('progress')});
    },

    buildJobParamElem: function (job) {
        var self = this;
        if (job == undefined) {
            return;
        }

        $('#selectRunParamsTable').find('tbody').empty();

        var data = [];
        _.each(job.get('jobParameters'), function (param) {
            data.push([param.humanName,
                '<div id=' + param.id + '><div class="alert alert-info" style="margin-left : 10px;margin-right: 10px;"><i class="icon-refresh" /> Loading...</div></div>',
                param.type
            ]);
        });


        $('#selectRunParamsTable').DataTable({
            dom: "<'row'<'span6'l><'span6'f>r>t<'row'<'span6'i><'span6'p>>",
            paging:   false,
            data: data,
            searching: false,
            lengthChange: false,
            destroy: true,
            info: false,
            columnDefs: [
                { width: "40%", targets: [ 0 ] },
                { width: "40%", targets: [ 1 ] },
                { width: "20%", targets: [ 2 ] }
            ]
        });
        _.each(job.get('jobParameters'), function (param) {
            self.printJobParameterValue(param, $('#selectRunParamsTable').find("tbody").find("div#" + param.id), 100);
        });
    },
    buildJobPropertiesElem: function (job) {
        var self = this;
        if (job == undefined) {
            return;
        }

        $('#job-properties-content').find('tbody').empty();

        var data = [];
        new PropertyCollection({domainClassName:"be.cytomine.processing.Job", domainIdent:job.get('id')}).fetch({
            success: function (collection, response) {
                collection.each(function (model) {
                    data.push([model.get("key"), model.get("value")])
                });

                $('#job-properties-content').DataTable({
                    dom: "<'row'<'span6'l><'span6'f>r>t<'row'<'span6'i><'span6'p>>",
                    paging:   false,
                    data: data,
                    searching: false,
                    lengthChange: false,
                    destroy: true,
                    info: false,
                    columnDefs: [
                        { width: "50%", targets: [ 0 ] },
                        { width: "50%", targets: [ 1 ] }
                    ],
                    language: {
                        emptyTable: "No properties for this job."
                    }
                });
            }
        });
    },
    buildJobAttachedFilesElem: function (job) {
        var self = this;
        if (job == undefined) {
            return;
        }

        $('#job-attached-files-content').find('tbody').empty();

        var data = [];
        new AttachedFileCollection({domainClassName:"be.cytomine.processing.Job", domainIdent:job.get('id')}).fetch({
            success: function (collection, response) {
                collection.each(function (model) {
                    data.push([model.get("filename"), '<a class="btn btn-xs btn-info"' +
                    ' href="'+ model.get("url") +'">Download</a>'])
                });

                $('#job-attached-files-content').DataTable({
                    dom: '<"toolbar">frtip',
                    paging:   false,
                    data: data,
                    searching: false,
                    lengthChange: false,
                    destroy: true,
                    info: false,
                    columnDefs: [
                        { width: "70%", targets: [ 0 ] },
                        { width: "30%", targets: [ 1 ] }
                    ],
                    language: {
                        emptyTable: "No attached files for this job."
                    }
                });
            }
        });
    },
    //print job param value in cell
    printJobParameterValue: function (param, cell, maxSize) {
        var self = this;
        if (param.type == "Date") {
            cell.html(window.app.convertLongToDate(param.value));
        } else if (param.type == "Boolean") {
            if (param.value == "true") {
                cell.html('<input type="checkbox" name="" checked="checked" disabled/>');
            }
            else {
                cell.html('<input type="checkbox" name="" disabled/>');
            }
        }
        else if (param.type == "ListDomain" || param.type == "Domain") {
            var ids = param.value.split(",");
            console.log("Domain or ListDomain:" + ids);

            if(param.uri) {
                var collection = window.app.getFromCache(window.app.replaceVariable(param.uri));
                if (collection == undefined || (collection.length > 0 && collection.at(0).id == undefined)) {
                    console.log("Collection is NOT CACHE - Reload collection");
                    collection = new SoftwareParameterModelCollection({uri: window.app.replaceVariable(param.uri), sortAttribut: param.uriSortAttribut});
                    collection.fetch({
                        success: function (col, response) {
                            window.app.addToCache(window.app.replaceVariable(param.uri), col);
                            cell.html(self.createJobParameterDomainValue(ids, col, param, maxSize));
                        }
                    });
                } else {
                    console.log("Collection is CACHE");
                    cell.html(self.createJobParameterDomainValue(ids, collection, param, maxSize));
                }
            } else {
                var computeValue = param.value;
                if (param.name.toLowerCase().replace(new RegExp("_", 'g'), "").indexOf("privatekey") !== -1
                    || param.name.toLowerCase().replace(new RegExp("_", 'g'), "").indexOf("publickey") !== -1) {
                    computeValue = "************************************";
                }
                cell.html(computeValue);
            }
        }
        else {
            var computeValue = param.value;
            if (param.name.toLowerCase().replace(new RegExp("_", 'g'), "").indexOf("privatekey") !== -1
                || param.name.toLowerCase().replace(new RegExp("_", 'g'), "").indexOf("publickey") !== -1) {
                computeValue = "************************************";
            }
            cell.html(computeValue);
        }
    },
    createJobParameterDomainValue: function (ids, collection, param, maxSize) {
        var getLink = function(model, uriPrintAttribut) {
            if (model.get("class") == 'be.cytomine.project.Project') {
                return _.template("<a href='#tabs-dashboard-<%= id %>'><%= name %></a>", { id : model.id, name : model.get(uriPrintAttribut) });
            } else if (model.get("class") == 'be.cytomine.image.ImageInstance') {
                return _.template("<a href='#tabs-image-<%= idProject %>-<%= idImage %>-'><%= name %></a>", { idProject : model.get("project"), idImage : model.id, name : model.get(uriPrintAttribut) });
            } else if (model.get("class") == 'be.cytomine.ontology.Term') {
                return _.template("<a href='#ontology/<%= idOntology %>/<%= idTerm %>'><%= name %></a>", { idOntology : model.get("ontology"), idTerm : model.id, name : model.get(uriPrintAttribut) });
            } else {
                return model.get(uriPrintAttribut);
            }
        };
        var names = [];
        _.each(ids, function (id) {
            var model = collection.get(id);
            if (model == undefined) {
                names.push("Unknown");
            }
            else {
                names.push(getLink(model, param.uriPrintAttribut));
            }

        });
        names = _.sortBy(names, function (name) {
            return name;
        });
        var computeValue = names.join(', ');
        var shortValue = computeValue;
        if (computeValue.length > maxSize) {
            shortValue = computeValue.substring(0, maxSize) + "...";
        }
        return shortValue;
    },
    printJobResult: function (job) {
        if (job == undefined) {
            return;
        }
        var self = this;

        if (window.app.status.currentTermsCollection == undefined) {
            new TermCollection({idProject: self.model.id}).fetch({
                success: function (terms, response) {
                    window.app.status.currentTermsCollection = terms;
                    self.initJobResult(job);
                }
            });
        } else {
            self.initJobResult(job);
        }
    },
    initJobResult: function (job) {


        $("#panelJobResultsDiv").empty();
        var self = this;
        var createJobResultView = function() {
            new JobResultView({
                model: job,
                project: self.model,
                el: $("#panelJobResultsDiv"),
                jobs: self.jobsLight,
                software: self.software,
                terms : window.app.status.currentTermsCollection
            }).render();
        };
        if (window.app.status.currentTermsCollection == undefined) {
            new TermCollection({idProject: self.model.id}).fetch({
                success: function (terms, response) {
                    window.app.status.currentTermsCollection = terms;
                    createJobResultView();
                }
            });
        } else {
            createJobResultView();
        }
    }

});