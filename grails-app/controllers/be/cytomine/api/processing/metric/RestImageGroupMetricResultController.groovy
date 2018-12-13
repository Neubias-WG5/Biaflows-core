package be.cytomine.api.processing.metric

import be.cytomine.Exception.WrongArgumentException

/*
* Copyright (c) 2009-2018. Authors: see NOTICE file.
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

import be.cytomine.api.RestController
import be.cytomine.processing.Job
import be.cytomine.processing.metric.ImageGroupMetricResult
import be.cytomine.project.Project
import grails.converters.JSON
import org.restapidoc.annotation.RestApi
import org.restapidoc.annotation.RestApiMethod
import org.restapidoc.annotation.RestApiParam
import org.restapidoc.annotation.RestApiParams
import org.restapidoc.pojo.RestApiParamType


@RestApi(name = "Processing | metric result services", description = "Methods to manage metric results")
class RestImageGroupMetricResultController extends RestController {

    def imageGroupMetricResultService
    def jobService
    def imageGroupService
    def projectService

    @RestApiMethod(description="Get metric result listing, according to your access", listing = true)
    @RestApiParams(params=[
            @RestApiParam(name="jobs", type="long", paramType = RestApiParamType.QUERY, required = false, description = "A list of job id to filter"),
            @RestApiParam(name="images", type="long", paramType = RestApiParamType.QUERY, required = false, description = "A list of image id to filter")
    ])
    def list() {
        def jobIds = params.jobs ? params.jobs.split(',').collect { Long.parseLong(it) } : null
        def imageIds = params.images ? params.images.split(',').collect { Long.parseLong(it) } : null
        def aggregate = params.boolean("aggregate", false)

        Project project = projectService.read(params.long('project'))
        if (!project) {
            throw new WrongArgumentException("Project is mandatory")
        }

        def jobs = (jobIds) ? jobService.readMany(jobIds) : jobService.list([project])
        def images = (imageIds) ? imageGroupService.readMany(imageIds) : imageGroupService.list(project, true)

        responseSuccess(imageGroupMetricResultService.list(jobs, images, aggregate))
    }

    @RestApiMethod(description="Get metric results for a job", listing = true)
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The job id")
    ])
    def listByJob() {
        Job job = jobService.read(params.long('id'))
        if(job) {
            def aggregate = params.boolean("aggregate", false)
            responseSuccess(imageGroupMetricResultService.list(job, aggregate))
        } else {
            responseNotFound("Job", params.id)
        }
    }

    @RestApiMethod(description="Get a metric result")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The metric result id")
    ])
    def show () {
        ImageGroupMetricResult metricResult = imageGroupMetricResultService.read(params.long('id'))
        if (metricResult) {
            responseSuccess(metricResult)
        } else {
            responseNotFound("ImageGroupMetricResult", params.id)
        }
    }

    @RestApiMethod(description="Add a new metric result")
    def add () {
        add(imageGroupMetricResultService, request.JSON)
    }

    @RestApiMethod(description="Delete a metric result")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="int", paramType = RestApiParamType.PATH)
    ])
    def delete () {
        delete(imageGroupMetricResultService, JSON.parse("{id : $params.id}"),null)
    }

}
