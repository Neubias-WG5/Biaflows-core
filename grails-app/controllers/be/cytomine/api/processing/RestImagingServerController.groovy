package be.cytomine.api.processing

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

import be.cytomine.api.RestController
import be.cytomine.processing.ImagingServer
import grails.converters.JSON
import org.restapidoc.annotation.RestApi
import org.restapidoc.annotation.RestApiMethod
import org.restapidoc.annotation.RestApiParam
import org.restapidoc.annotation.RestApiParams
import org.restapidoc.pojo.RestApiParamType

/**
 * TODO:: comment this controller. Explain the "processing server goal"
 */
@RestApi(name="Imaging | imaging server", description="Methods to manage imaging servers")
class RestImagingServerController extends RestController {

    def imagingServerService

    @RestApiMethod(description="List the imaging servers", listing=true)
    def list() {
        responseSuccess(imagingServerService.list())
    }

    @RestApiMethod(description="Get an imaging server")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The imaging server id")
    ])
    def show() {
        ImagingServer imagingServer = imagingServerService.read(params.long('id'))
        if (imagingServer) {
            responseSuccess(imagingServer)
        } else {
            responseNotFound("ImagingServer", params.id)
        }
    }

    @RestApiMethod(description="Add a new imaging server to cytomine.")
    def add() {
        add(imagingServerService, request.JSON)
    }

    @RestApiMethod(description="Delete an imaging server.", listing = true)
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The imaging server id")
    ])
    def delete() {
        delete(imagingServerService, JSON.parse("{id : $params.id}"),null)
    }

}
