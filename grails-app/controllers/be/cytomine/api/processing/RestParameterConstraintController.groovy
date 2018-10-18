package be.cytomine.api.processing

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
import be.cytomine.processing.ParameterConstraint
import com.mongodb.util.JSON
import org.restapidoc.annotation.RestApiMethod
import org.restapidoc.annotation.RestApiObject
import org.restapidoc.annotation.RestApiParam
import org.restapidoc.annotation.RestApiParams
import org.restapidoc.pojo.RestApiParamType

@RestApiObject(name = "Parameter constraint services", description = "Methods for managing parameter constraints")
class RestParameterConstraintController extends RestController {

    def parameterConstraintService

    @RestApiMethod(description = "Get all the parameter constraints available in Cytomine")
    def list() {
        responseSuccess(parameterConstraintService.list())
    }

    @RestApiMethod(description = "Get a parameter constraint")
    @RestApiParams(params = [
            @RestApiParam(name = "id", type = "long", paramType = RestApiParamType.PATH, description = "The parameter constraint id")
    ])
    def show() {
        ParameterConstraint parameterConstraint = parameterConstraintService.read(params.long('id'))
        if (parameterConstraint) {
            responseSuccess(parameterConstraint)
        } else {
            responseNotFound("ParameterConstraint", params.id)
        }
    }

    @RestApiMethod(description = "Add a new parameter constraint to Cytomine")
    def add() {
        add(parameterConstraintService, request.JSON)
    }

    @RestApiMethod(description = "Update a parameter constraint available on Cytomine")
    @RestApiParams(params = [
        @RestApiParam(name = "id", type = "long", paramType = RestApiParamType.PATH, description = "The container id")
    ])
    def update() {
        update(parameterConstraintService, request.JSON)
    }

    @RestApiMethod(description = "Delete a parameter constraint", listing = true)
    @RestApiParams(params = [
        @RestApiParam(name = "id", type = "long", paramType = RestApiParamType.PATH, description = "The container id")
    ])
    def delete() {
        delete(parameterConstraintService, JSON.parse("{id : $params.id}"), null)
    }

}
