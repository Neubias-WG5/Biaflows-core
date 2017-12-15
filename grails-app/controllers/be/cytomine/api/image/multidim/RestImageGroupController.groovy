package be.cytomine.api.image.multidim

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
import be.cytomine.image.multidim.ImageGroup
import be.cytomine.image.multidim.ImageGroupHDF5
import be.cytomine.image.multidim.ImageSequence
import be.cytomine.project.Project
import grails.converters.JSON
import groovy.json.JsonSlurper
import org.restapidoc.annotation.RestApi
import org.restapidoc.annotation.RestApiMethod
import org.restapidoc.annotation.RestApiParam
import org.restapidoc.annotation.RestApiParams
import org.restapidoc.annotation.RestApiResponseObject
import org.restapidoc.pojo.RestApiParamType


/**
 * Created by IntelliJ IDEA.
 * User: lrollus
 * Date: 18/05/11
 */
@RestApi(name = "Image | multidim | image group services", description = "Methods for managing image group, a group of image from the same sample in different dimension (channel, zstack,...)")
class RestImageGroupController extends RestController {

    def imageGroupService
    def imageGroupHDF5Service
    def imageSequenceService
    def projectService

    @RestApiMethod(description="Get an image group")
    @RestApiParams(params=[
        @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The image group id")
    ])
    def show() {
        ImageGroup image = imageGroupService.read(params.long('id'))
        if (image) {
            responseSuccess(image)
        } else {
            responseNotFound("ImageGroup", params.id)
        }
    }

    @RestApiMethod(description="Get image group listing by project", listing=true)
    @RestApiParams(params=[
        @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The project id")
    ])
    def listByProject() {
        Project project = projectService.read(params.long('id'))

        if (project)  {
            responseSuccess(imageGroupService.list(project))
        }
        else {
            responseNotFound("ImageGroup", "Project", params.id)
        }
    }

    @RestApiMethod(description="Add a new image group")
    def add () {
        add(imageGroupService, request.JSON)
    }

    @RestApiMethod(description="Update an image group")
    @RestApiParams(params=[
        @RestApiParam(name="id", type="int", paramType = RestApiParamType.PATH, description = "The image group id")
    ])
    def update() {
        update(imageGroupService, request.JSON)
    }

    @RestApiMethod(description="Delete an image group")
    @RestApiParams(params=[
        @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The image group")
    ])
    def delete() {
        ImageGroup image = imageGroupService.read(params.long('id'))
        if (image) {
            ImageGroupHDF5 imageh5 = imageGroupHDF5Service.getByGroup(image)
            if (imageh5)
                delete(imageGroupHDF5Service, JSON.parse("{id : $imageh5.id}"), null)
        }
        delete(imageGroupService, JSON.parse("{id : $params.id}"),null)
    }

    @RestApiMethod(description="Get the different Characteristics for ImageGroup")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The image group")
    ])
    def characteristics() {
        ImageGroup imageGroup = imageGroupService.read(params.long('id'))
        if (imageGroup)  {
            responseSuccess(imageGroupService.characteristics(imageGroup))
        }
        else {
            responseNotFound("ImageGroup", "ImageGroup", params.id)
        }
    }

    /**
     * Get image thumb URL
     */
    @RestApiMethod(description="Get a small image (thumb) for a specific multidimensional image")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The image group id")
    ])
    @RestApiResponseObject(objectIdentifier = "image (bytes)")
    def thumb() {
        response.setHeader("max-age", "86400")
        int maxSize = params.int('maxSize',  512)
        imageGroupService.thumb(params.long('id'), maxSize)
        responseBufferedImage(imageGroupService.thumb(params.long('id'), maxSize))
    }


    @RestApiMethod(description="Add a new image group with hdf5 hyperspectral functionalities")
    def addh5() {
        add(imageGroupHDF5Service, request.JSON)
    }


    @RestApiMethod(description="Get an image group with hdf5 hyperspectral functionalities")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The id")
    ])
    def geth5() {
        ImageGroupHDF5 imageh5 = imageGroupHDF5Service.read(params.id)
        if(imageh5)
            responseSuccess(imageh5)
        else
            responseNotFound("ImageGroupHDF5", params.id)
    }

    @RestApiMethod(description="Delete an HDF5 image group")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The id")
    ])
    def deleteh5() {
        ImageGroupHDF5 imageh5 = imageGroupHDF5Service.read(params.long('id'))
        if(imageh5)
            delete(imageGroupHDF5Service, JSON.parse("{id : $imageh5.id}"), null)
        else
            responseNotFound("ImageGroupHDF5", params.id)
    }


    @RestApiMethod(description="Get an image group with hdf5 hyperspectral functionalities")
    @RestApiParams(params=[
            @RestApiParam(name="group", type="long", paramType = RestApiParamType.PATH,description = "The image group that is link to the iHdf5")
    ])
    def geth5FromImageGroup() {
        ImageGroup image = imageGroupService.read(params.long('group'))
        if (image) {
            ImageGroupHDF5 imageh5 = imageGroupHDF5Service.getByGroup(image)
            if(imageh5)
                responseSuccess(imageh5)
            else
                responseNotFound("ImageGroupHDF5", params.id)
        } else {
            responseNotFound("ImageGroup", params.group)
        }
    }

    @RestApiMethod(description="Delete an HDF5 image group")
    @RestApiParams(params=[
            @RestApiParam(name="group", type="long", paramType = RestApiParamType.PATH,description = "The image group that is link to the iHdf5")
    ])
    def deleteh5FromImageGroup() {
        ImageGroup image = imageGroupService.read(params.long('group'))
        if (image) {
            ImageGroupHDF5 imageh5 = imageGroupHDF5Service.getByGroup(image)
            if(imageh5)
                delete(imageGroupHDF5Service, JSON.parse("{id : $imageh5.id}"), null)
            else
                responseNotFound("ImageGroupHDF5", params.id)
        } else {
            responseNotFound("ImageGroup", params.group)
        }
    }

    def pxlh5(){
        ImageGroup image = imageGroupService.read(params.long('id'))
        if (image) {
            ImageGroupHDF5 imageh5 = imageGroupHDF5Service.getByGroup(image)
            if(imageh5){
                ImageSequence is = ImageSequence.findByImageGroup(image)
                //ImageSequence is = imageSequenceService.get(image,(Integer) imageGroupService.characteristics(image).channel[0],0,0,0)
                def y = is.image.baseImage.height - Integer.parseInt(params.y)

                String fn = imageh5.filenames
                String url = "/multidim/pixel.json?fif=$fn&x=$params.x&y=$y"

                String imageServerURL =  grailsApplication.config.grails.imageServerURL[0]
                log.info "$imageServerURL"+url
                String resp = new URL("$imageServerURL"+url).getText()

                def jsonSlurper = new JsonSlurper()
                def or = jsonSlurper.parseText(resp)
                responseSuccess(or)

            }
            else
                responseNotFound("ImageGroupHDF5", params.id)
        } else {
            responseNotFound("ImageGroup", params.id)
        }
    }
}
