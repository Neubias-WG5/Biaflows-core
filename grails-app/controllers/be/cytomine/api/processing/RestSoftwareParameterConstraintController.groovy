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
import be.cytomine.processing.SoftwareParameter
import be.cytomine.processing.SoftwareParameterConstraint
import com.mongodb.util.JSON
import org.restapidoc.annotation.RestApiMethod
import org.restapidoc.annotation.RestApiObject
import org.restapidoc.annotation.RestApiParam
import org.restapidoc.annotation.RestApiParams
import org.restapidoc.pojo.RestApiParamType

@RestApiObject(name = "Software parameter constraint services", description = "Methods for managing software parameter constraints")
class RestSoftwareParameterConstraintController extends RestController {

    def softwareParameterConstraintService
    def softwareParameterService

    @RestApiMethod(description = "Get all the constraints for a given software parameter")
    @RestApiParams(params = [
            @RestApiParam(name = "idParameter", type = "long", paramType = RestApiParamType.PATH, description = "The software parameter id")
    ])
    def listBySoftwareParameter() {
        SoftwareParameter softwareParameter = softwareParameterService.read(params.get('idParameter'))
        if (!softwareParameter) {
            responseNotFound("Software Parameter Constraint", "SoftwareParameter", params.idParameter)
        }

        responseSuccess(softwareParameterConstraintService.list(softwareParameter))
    }

    @RestApiMethod(description = "Get a specific software parameter constraint")
    @RestApiParams(params = [
            @RestApiParam(name = "id", type = "long", paramType = RestApiParamType.PATH, description = "The constraint id")
    ])
    def show() {
        SoftwareParameterConstraint softwareParameterConstraint = SoftwareParameterConstraint.read(params.long('id'))
        if (softwareParameterConstraint) {
            responseSuccess(softwareParameterConstraint)
        } else {
            responseNotFound("SoftwareParameterConstraint", params.id)
        }
    }

    @RestApiMethod(description = "Add a new software parameter constraint to Cytomine")
    def add() {
        add(softwareParameterConstraintService, request.JSON)
    }

    @RestApiMethod(description = "Update a software parameter constraint")
    @RestApiParams(params = [
            @RestApiParam(name = "id", type = "long", paramType = RestApiParamType.PATH, description = "The container id")
    ])
    def update() {
        update(softwareParameterConstraintService, request.JSON)
    }

    @RestApiMethod(description = "Delete a software parameter constraint", listing = true)
    @RestApiParams(params = [
            @RestApiParam(name = "id", type = "long", paramType = RestApiParamType.PATH, description = "The container id")
    ])
    def delete() {
        delete(softwareParameterConstraintService, JSON.parse("{id : $params.id}"), null)
    }

    @RestApiMethod(description = "Evaluate a software parameter constraint")
    @RestApiParams(params = [
            @RestApiParam(name = "id", type = "long", paramType = RestApiParamType.PATH, description = "The software constraint id"),
            @RestApiParam(name = "value", type = "string", paramType = RestApiParamType.PATH, description = "The constraint's value")
    ])
    def evaluate() {
        SoftwareParameterConstraint softwareParameterConstraint = SoftwareParameterConstraint.read(params.long('id'))
        def value = params.get('value')

        if (softwareParameterConstraint && value) {
            responseSuccess([result: softwareParameterConstraintService.evaluate(softwareParameterConstraint, value)])
        } else {
            responseNotFound("SoftwareParameterConstraint", params.id)
        }
    }

}
