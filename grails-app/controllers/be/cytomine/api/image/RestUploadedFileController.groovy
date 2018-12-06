package be.cytomine.api.image

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
import be.cytomine.image.AbstractImage
import be.cytomine.image.ImageInstance
import be.cytomine.image.Mime
import be.cytomine.image.UploadedFile
import be.cytomine.image.server.Storage
import be.cytomine.laboratory.Sample
import be.cytomine.project.Project
import be.cytomine.security.User
import be.cytomine.utils.JSONUtils
import grails.converters.JSON
import org.restapidoc.annotation.*
import org.restapidoc.pojo.RestApiParamType

import javax.activation.MimetypesFileTypeMap

/**
 * Controller that handle request on file uploading (when a file is uploaded, list uploaded files...)
 */
@RestApi(name = "Image | uploaded file services", description = "Methods for managing an uploaded image file.")
class RestUploadedFileController extends RestController {

    def imageProcessingService
    def cytomineService
    def imagePropertiesService
    def projectService
    def storageService
    def grailsApplication
    def uploadedFileService
    def storageAbstractImageService
    def imageInstanceService
    def abstractImageService
    def notificationService
    def securityACLService
    def secUserService

    static allowedMethods = [image: 'POST']

    def dataTablesService
    @RestApiMethod(description="Get all uploaded file made by the current user")
    def list() {

        Long root
        def uploadedFiles
        if(params.root) {
            root = Long.parseLong(params.root)
            uploadedFiles = uploadedFileService.listHierarchicalTree((User)cytomineService.getCurrentUser(), root)
            //if view is datatables, change way to store data
        } else if (params.datatables) {
            uploadedFiles = dataTablesService.process(params, UploadedFile, null, null, null)
        } else {
            Boolean onlyRoots
            if(params.onlyRoots) {
                onlyRoots = Boolean.parseBoolean(params.onlyRoots)
            }
            Long parent
            if(params.parent){
                parent = Long.parseLong(params.parent)
            }
            if(params.all){
                uploadedFiles = uploadedFileService.list()
            } else {
                uploadedFiles = uploadedFileService.list((User)secUserService.getUser(cytomineService.getCurrentUser().id), parent, onlyRoots)
            }
        }


        responseSuccess(uploadedFiles)
    }

    @RestApiMethod(description="Delete all file properties for an image")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The image id")
    ])
    @RestApiResponseObject(objectIdentifier = "empty")
    def clearProperties () {
        AbstractImage abstractImage = abstractImageService.read(params.long('id'))
        imagePropertiesService.clear(abstractImage)
        responseSuccess([:])
    }

    @RestApiMethod(description="Get all file properties for an image")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The image id")
    ])
    @RestApiResponseObject(objectIdentifier = "empty")
    def populateProperties () {
        AbstractImage abstractImage = abstractImageService.read(params.long('id'))
        imagePropertiesService.populate(abstractImage)
        responseSuccess([:])
    }

    @RestApiMethod(description="Fill image field (magn, width,...) with all file properties")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The image id")
    ])
    @RestApiResponseObject(objectIdentifier = "empty")
    def extractProperties () {
        AbstractImage abstractImage = abstractImageService.read(params.long('id'))
        imagePropertiesService.extractUseful(abstractImage)
        responseSuccess([:])
    }


    @RestApiMethod(description="Get an uploaded file")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The uploaded file id")
    ])
    def show () {
        UploadedFile up = uploadedFileService.get(params.long('id'))
        if (up) {
            securityACLService.checkIsSameUser(up.user, cytomineService.getCurrentUser())
            responseSuccess(up)
        } else {
            responseNotFound("UploadedFile", params.id)
        }
    }

    /**
     * Add a new image
     * TODO:: how to manage security here?
     *
     */
    @RestApiMethod(description="Add a new uploaded file. This DOES NOT upload the file, just create the domain.")
    def add () {
        add(uploadedFileService, request.JSON)
    }

    /**
     * Update a new image
     * TODO:: how to manage security here?
     */
    @RestApiMethod(description="Edit an uploaded file domain (usefull to edit its status during upload)")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The uploaded file id")
    ])
    def update () {
        update(uploadedFileService, request.JSON)
    }

    /**
     * Delete a new image
     * TODO:: how to manage security here?
     */
    @RestApiMethod(description="Delete an uploaded file domain. This do not delete the file on disk.")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The uploaded file id")
    ])
    def delete () {
        delete(uploadedFileService, JSON.parse("{id : $params.id}"),null)
    }

    @RestApiMethod(description="Get the uploaded file of a given Abstract image")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The uploaded file id")
    ])
    def getByAbstractImage () {
        AbstractImage im = abstractImageService.read(params.long('idimage'))
        UploadedFile up = UploadedFile.findByImage(im);
        if (up) {
            responseSuccess(up)
        } else {
            responseNotFound("UploadedFile", params.id)
        }
    }

    def upRedirect () {
        redirect(url: "http://localhost:9090/upload")
    }

    @RestApiMethod(description="Download the uploaded file")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The uploaded file id")
    ])
    def downloadUploadedFile(){
        UploadedFile up = uploadedFileService.get(params.long('id'));
        if (up) {
            String url = uploadedFileService.downloadURI(up)
            log.info "redirect url"
            redirect (url : url)
        } else {
            responseNotFound("UploadedFile", params.id)
        }
    }

    @RestApiMethod(description="Create an image thanks to an uploaded file domain. THis add the image in the good storage and the project (if needed). This send too an email at the end to the uploader and the project managers.")
    @RestApiParams(params=[
    @RestApiParam(name="uploadedFile", type="long", paramType = RestApiParamType.PATH,description = "The uploaded file id")
    ])
    @RestApiResponseObject(objectIdentifier = "[abstractimage.|abstract image|]")
    def createImage () {
        long timestamp = new Date().getTime()
        def currentUser = cytomineService.currentUser
        securityACLService.checkUser(currentUser)
        UploadedFile uploadedFile = UploadedFile.read(params.long('uploadedFile'))
        String path = request.JSON.path ?: uploadedFile.getFilename();
        String filename = request.JSON.filename ?: uploadedFile.getFilename();
        String originalFilename = request.JSON.originalFilename ?: uploadedFile.getOriginalFilename();
        String mimeType = request.JSON.mimeType;
        Collection<Storage> storages = []
        uploadedFile.getStorages()?.each {
            storages << storageService.read(it)
        }

        Sample sample = new Sample(name : timestamp.toString() + "-" + uploadedFile.getOriginalFilename())

        def projects = []
        //create domains instance
        def ext = uploadedFile.getExt()
        Mime mime = Mime.findByMimeType(mimeType)
        if (!mime) {
            MimetypesFileTypeMap mimeTypesMap = new MimetypesFileTypeMap();
            // TODO : We are not sure than we will have the same mimetype in uploadedFile
            mimeType = mimeTypesMap.getContentType(uploadedFile.getAbsolutePath())
            mime = new Mime(extension: ext, mimeType : mimeType)
            mime.save(failOnError: true)
        }
        log.info "#################################################################"
        log.info "#################################################################"
        log.info "##############CREATE IMAGE#################"
        log.info "#################################################################"
        log.info "#################################################################"
        AbstractImage abstractImage = new AbstractImage(
                filename: filename,
                originalFilename:  originalFilename,
                scanner: null,
                sample: sample,
                path: path,
                mime: mime)

        if (sample.validate() && abstractImage.validate()) {
            sample.save(flush : true,failOnError: true)
            sample.refresh()
            abstractImage.setSample(sample)
            abstractImage.save(flush: true,failOnError: true)

            storages.each { storage ->
                storageAbstractImageService.add(JSON.parse(JSONUtils.toJSONString([storage : storage.id, abstractimage : abstractImage.id])))
            }

            log.info "Map image ${abstractImage.id} to uploaded file ${uploadedFile.id}"
            uploadedFile.image = abstractImage
            uploadedFile.save(flush:true,failOnError: true)

            imagePropertiesService.clear(abstractImage)
            imagePropertiesService.populate(abstractImage)
            imagePropertiesService.extractUseful(abstractImage)
            abstractImage.save(flush: true,failOnError: true)
            log.info "Image = ${uploadedFile.image?.id}"

            uploadedFile.getProjects()?.each { project_id ->
                Project project = projectService.read(project_id)
                projects << project
                ImageInstance imageInstance = new ImageInstance( baseImage : abstractImage, project:  project, user :currentUser)
                imageInstanceService.add(JSON.parse(imageInstance.encodeAsJSON()))
            }



        } else {
            sample.errors?.each {
                log.info "Sample error : " + it
            }
            abstractImage.errors?.each {
                log.info "Sample error : " + it
            }
        }
        //notificationService.notifyNewImageAvailable(currentUser,abstractImage,projects)
        responseSuccess([abstractimage: abstractImage])
    }




}
