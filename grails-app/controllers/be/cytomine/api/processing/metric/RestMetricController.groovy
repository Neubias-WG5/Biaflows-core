package be.cytomine.api.processing.metric

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
import be.cytomine.processing.metric.Metric
import be.cytomine.project.Discipline
import grails.converters.JSON
import org.restapidoc.annotation.RestApi
import org.restapidoc.annotation.RestApiMethod
import org.restapidoc.annotation.RestApiParam
import org.restapidoc.annotation.RestApiParams
import org.restapidoc.pojo.RestApiParamType


@RestApi(name = "Processing | metric services", description = "Methods to manage metrics")
class RestMetricController extends RestController {

    def metricService
    def disciplineService

    @RestApiMethod(description="Get metric listing, according to your access", listing = true)
    def list () {
        responseSuccess(metricService.list())
    }

    @RestApiMethod(description="Get metrics for the given discipline", listing = true)
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The discipline id")
    ])
    def listByDiscipline() {
        Discipline discipline = disciplineService.read(params.long('id'))
        if (discipline) {
            responseSuccess(metricService.listByDiscipline(discipline))
        } else {
            responseNotFound("Metric", "Discipline", params.id)
        }
    }
    
    @RestApiMethod(description="Get a metric")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The metric id")
    ])
    def show () {
        Metric metric = metricService.read(params.long('id'))
        if (metric) {
            responseSuccess(metric)
        } else {
            responseNotFound("Metric", params.id)
        }
    }
    
    @RestApiMethod(description="Add a new metric")
    def add () {
        add(metricService, request.JSON)
    }
    
    @RestApiMethod(description="Update a metric")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="int", paramType = RestApiParamType.PATH)
    ])
    def update () {
        update(metricService, request.JSON)
    }
    
    @RestApiMethod(description="Delete a metric")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="int", paramType = RestApiParamType.PATH)
    ])
    def delete () {
        delete(metricService, JSON.parse("{id : $params.id}"),null)
    }

}
