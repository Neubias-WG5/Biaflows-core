package be.cytomine.api.ontology

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

import be.cytomine.Exception.CytomineException
import be.cytomine.Exception.ObjectNotFoundException
import be.cytomine.Exception.WrongArgumentException
import be.cytomine.api.RestController
import be.cytomine.image.ImageInstance
import be.cytomine.ontology.SharedAnnotation
import be.cytomine.ontology.UserAnnotation
import be.cytomine.project.Project
import be.cytomine.security.SecUser
import grails.converters.JSON
import groovyx.net.http.HTTPBuilder
import org.apache.commons.io.IOUtils
import org.codehaus.groovy.grails.web.json.JSONArray
import org.restapidoc.annotation.*
import org.restapidoc.pojo.RestApiParamType


/**
 * Controller for annotation created by user
 */
@RestApi(name = "Ontology | user annotation services", description = "Methods for managing an annotation created by a human user")
class RestUserAnnotationController extends RestController {

    def userAnnotationService
    def termService
    def imageInstanceService
    def secUserService
    def projectService
    def cytomineService
    def annotationListingService
    def reportService
    def imageProcessingService
    def securityACLService
    def abstractImageService

    /**
     * List all annotation with light format
     */
    @RestApiMethod(description="List all annotation (very light format)", listing = true)
    def list() {
        responseSuccess(userAnnotationService.listLightForRetrieval())
    }

    @RestApiMethod(description="Count the number of annotation for the current user")
    @RestApiResponseObject(objectIdentifier = "[total:x]")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The user id (mandatory)"),
            @RestApiParam(name="project", type="long", paramType = RestApiParamType.PATH,description = "The project id"),
    ])
    def countByUser() {
        SecUser user = secUserService.read(params.id)
        Project project = projectService.read(params.project)

        if(params.project && !project) throw new ObjectNotFoundException("ACL error: domain is null! Unable to process project auth checking")

        if(project){
            securityACLService.checkIsSameUserOrAdminContainer(project, user, cytomineService.currentUser)
        } else {
            securityACLService.checkIsSameUser(user, cytomineService.currentUser)
        }
        responseSuccess([total:userAnnotationService.count(user, project)])
    }

    /**
     * Download report with annotation
     */
    @RestApiMethod(description="Download a report (pdf, xls,...) with user annotation data from a specific project")
    @RestApiResponseObject(objectIdentifier =  "file")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The project id"),
    @RestApiParam(name="terms", type="list", paramType = RestApiParamType.QUERY,description = "The annotation terms id (if empty: all terms)"),
    @RestApiParam(name="users", type="list", paramType = RestApiParamType.QUERY,description = "The annotation users id (if empty: all users)"),
    @RestApiParam(name="images", type="list", paramType = RestApiParamType.QUERY,description = "The annotation images id (if empty: all images)"),
    @RestApiParam(name="format", type="string", paramType = RestApiParamType.QUERY,description = "The report format (pdf, xls,...)")
    ])
    def downloadDocumentByProject() {
        reportService.createAnnotationDocuments(params.long('id'),params.terms,params.users,params.images,params.format,response,"USERANNOTATION")
    }

    def bootstrapUtilsService
    def sharedAnnotationService
    /**
     * Add comment on an annotation to other user
     */
    @RestApiMethod(description="Add comment on an annotation to other user and send a mail to users")
    @RestApiResponseObject(objectIdentifier = "empty")
    @RestApiParams(params=[
    @RestApiParam(name="annotation", type="long", paramType = RestApiParamType.PATH,description = "The annotation id"),
    @RestApiParam(name="POST JSON: subject", type="string", paramType = RestApiParamType.PATH,description = "The subject"),
    @RestApiParam(name="POST JSON: message", type="string", paramType = RestApiParamType.PATH,description = "TODO:APIDOC, DIFF WITH COMMENT?"),
    @RestApiParam(name="POST JSON: users", type="list", paramType = RestApiParamType.PATH,description = "The list of user (id) to send the mail"),
    @RestApiParam(name="POST JSON: comment", type="string", paramType = RestApiParamType.PATH,description = "TODO:APIDOC, DIFF WITH MESSAGE?"),
    ])
    def addComment() {

        UserAnnotation annotation = userAnnotationService.read(params.getLong('annotation'))
        def result = sharedAnnotationService.add(request.JSON, annotation, params)
        if(result) {
            responseResult(result)
        }
    }

    /**
     * Show a single comment for an annotation
     */
    //TODO : duplicated code in AlgoAnnotation
    @RestApiMethod(description="Get a specific comment")
    @RestApiParams(params=[
    @RestApiParam(name="annotation", type="long", paramType = RestApiParamType.PATH,description = "The annotation id"),
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The comment id"),
    ])
    def showComment() {
        UserAnnotation annotation = userAnnotationService.read(params.long('annotation'))
        if (!annotation) {
            responseNotFound("Annotation", params.annotation)
        }
        def sharedAnnotation = SharedAnnotation.findById(params.long('id'))
        if (sharedAnnotation) {
            responseSuccess(sharedAnnotation)
        } else {
            responseNotFound("SharedAnnotation", params.id)
        }
    }

    /**
     * List all comments for an annotation
     */
    @RestApiMethod(description="Get all comments on annotation", listing=true)
    @RestApiParams(params=[
    @RestApiParam(name="annotation", type="long", paramType = RestApiParamType.PATH,description = "The annotation id")
    ])
    def listComments() {
        UserAnnotation annotation = userAnnotationService.read(params.long('annotation'))
        if (annotation) {
            responseSuccess(sharedAnnotationService.listComments(annotation))
        } else {
            responseNotFound("Annotation", params.id)
        }
    }

    /**
     * Get a single annotation
     */
    @RestApiMethod(description="Get a user annotation")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The annotation id")
    ])
    def show() {
        UserAnnotation annotation = userAnnotationService.read(params.long('id'))
        if (annotation) {
            responseSuccess(annotation)
        }
        else responseNotFound("Annotation", params.id)
    }


    /**
     * Add annotation created by user
     */
    @RestApiMethod(description="Add an annotation created by user")
    def add(){
        def json = request.JSON
        if (json instanceof JSONArray) {
            responseResult(addMultiple(userAnnotationService, json))
        } else {
            responseResult(addOne(userAnnotationService, json))
        }
    }


    /**
     * Get annotation user crop (image area that frame annotation)
     * (Use this service if you know the annotation type)
     */
    @RestApiMethod(description="Get annotation user crop (image area that frame annotation)")
    @RestApiResponseObject(objectIdentifier = "file")
    @RestApiParams(params=[
            @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The annotation id"),
            @RestApiParam(name="maxSize", type="int", paramType = RestApiParamType.PATH,description = "Maximum size of the crop image (w and h)"),
            @RestApiParam(name="zoom", type="int", paramType = RestApiParamType.PATH,description = "Zoom level"),
            @RestApiParam(name="draw", type="boolean", paramType = RestApiParamType.PATH,description = "Draw annotation form border on the image"),
            @RestApiParam(name="complete", type="boolean", paramType = RestApiParamType.PATH,description = "Do not simplify the annotation form")
    ])
    def crop() {
        UserAnnotation annotation = UserAnnotation.read(params.long("id"))
        if (annotation) {
            String url = annotation.toCropURL(params)
            if(url.length()<2000){
                log.info "redirect to ${url}"
                redirect (url : url)
            } else {
                def parameters = annotation.toCropParams(params)
                url = abstractImageService.getCropIMSUrl(parameters)

                //POST request
                URL destination = new URL(url)

                def postBody = [:]
                for(String parameter : destination.query.split("&")){
                    String[] tmp = parameter.split('=');
                    postBody.put(tmp[0], URLDecoder.decode(tmp[1]))
                }

                def http = new HTTPBuilder( "http://"+destination.host)
                log.info "URL too long "+url.length()+". Post request to ${destination.host}${destination.path}"
                http.post( path: destination.path, requestContentType: groovyx.net.http.ContentType.URLENC,
                        body : postBody) { resp,json ->

                    // response handler for a success response code:

                    byte[] bytesOut = IOUtils.toByteArray(resp.getEntity().getContent());
                    response.contentLength = bytesOut.length;
                    response.setHeader("Connection", "Keep-Alive")
                    response.setHeader("Accept-Ranges", "bytes")
                    response.setHeader("Content-Type", "image/png")
                    response.getOutputStream() << bytesOut
                    response.getOutputStream().flush()

                }
            }
        } else {
            responseNotFound("Annotation", params.id)
        }

    }

    //TODO:APIDOC
    def cropMask () {
        UserAnnotation annotation = UserAnnotation.read(params.long("id"))
        if (annotation) {
            params.mask = true
            // redirect to AbstractImageController crop
            redirect (url : annotation.toCropURL(params))
        } else {
            responseNotFound("UserAnnotation", params.id)
        }

    }

    //TODO:APIDOC
    def cropAlphaMask () {
        UserAnnotation annotation = UserAnnotation.read(params.long("id"))
        if (annotation) {
            params.alphaMask = true
            // redirect to AbstractImageController crop
            redirect (url : annotation.toCropURL(params))
        } else {
            responseNotFound("UserAnnotation", params.id)
        }

    }




    public Object addOne(def service, def json) {
        def minPoint = params.getLong('minPoint')
        def maxPoint = params.getLong('maxPoint')

        def result = userAnnotationService.add(json,minPoint,maxPoint)
        return result
    }

    /**
     * Update annotation created by user
     */
    @RestApiMethod(description="Update an annotation")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The annotation id")
    ])
    def update() {
        def json = request.JSON
        try {
            def domain = userAnnotationService.retrieve(json)
            def result = userAnnotationService.update(domain,json)
            responseResult(result)
        } catch (CytomineException e) {
            log.error(e)
            response([success: false, errors: e.msg], e.code)
        }
    }

    /**
     * Delete annotation created by user
     */
    @RestApiMethod(description="Delete an annotation")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The annotation id")
    ])
    def delete() {
        def json = JSON.parse("{id : $params.id}")
        delete(userAnnotationService, json,null)
    }
}
