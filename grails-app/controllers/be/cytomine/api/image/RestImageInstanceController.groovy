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

import be.cytomine.Exception.CytomineException
import be.cytomine.api.RestController
import be.cytomine.image.AbstractImage
import be.cytomine.image.ImageInstance
import be.cytomine.image.multidim.ImageGroup
import be.cytomine.ontology.Property
import be.cytomine.ontology.UserAnnotation
import be.cytomine.project.Project
import be.cytomine.sql.ReviewedAnnotationListing
import be.cytomine.test.HttpClient
import be.cytomine.utils.Description
import be.cytomine.utils.GeometryUtils
import be.cytomine.utils.Task
import com.vividsolutions.jts.geom.Geometry
import com.vividsolutions.jts.geom.GeometryCollection
import com.vividsolutions.jts.geom.GeometryFactory
import com.vividsolutions.jts.io.WKTReader
import com.vividsolutions.jts.io.WKTWriter
import grails.converters.JSON
import groovy.sql.Sql
import org.restapidoc.annotation.*
import org.restapidoc.pojo.RestApiParamType

import java.awt.image.BufferedImage

/**
 * Created by IntelliJ IDEA.
 * User: lrollus
 * Date: 18/05/11
 * Controller that handle request for project images.
 */
@RestApi(name = "Image | image instance services", description = "Methods for managing an image instance : abstract image linked to a project")
class RestImageInstanceController extends RestController {

    def imageProcessingService
    def imageInstanceService
    def projectService
    def abstractImageService
    def dataTablesService
    def userAnnotationService
    def algoAnnotationService
    def reviewedAnnotationService
    def secUserService
    def termService
    def annotationListingService
    def cytomineService
    def taskService
    def annotationIndexService
    def descriptionService
    def propertyService
    def securityACLService
    def imageGroupService

    final static int MAX_SIZE_WINDOW_REQUEST = 5000 * 5000 //5k by 5k pixels

    @RestApiMethod(description="Get an image instance")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The image instance id")
    ])
    def show() {
        ImageInstance image = imageInstanceService.read(params.long('id'))
        if (image) {
            responseSuccess(image)
        } else {
            responseNotFound("ImageInstance", params.id)
        }
    }

    @RestApiMethod(description="Get all image instance available for the current user", listing = true)
    def listByUser() {
        responseSuccess(imageInstanceService.list(cytomineService.currentUser))
    }

    @RestApiMethod(description="Get the last opened image for the current user", listing = true)
    def listLastOpenImage() {
        def offset = params.long('offset')
        def max =params.long('max')
        params.offset = 0
        params.max = 0
        responseSuccess(imageInstanceService.listLastOpened(cytomineService.currentUser,offset,max))
    }

    @RestApiMethod(description="Get all image instance for a specific project", listing = true)
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The project id"),
    @RestApiParam(name="tree", type="boolean", paramType = RestApiParamType.QUERY, description = "(optional) Get a tree (with parent image as node)"),
    @RestApiParam(name="sortColumn", type="string", paramType = RestApiParamType.QUERY, description = "(optional) Column sort (created by default)"),
    @RestApiParam(name="sortDirection", type="string", paramType = RestApiParamType.QUERY, description = "(optional) Sort direction (desc by default)"),
    @RestApiParam(name="search", type="string", paramType = RestApiParamType.QUERY, description = "(optional) Original filename search filter (all by default)"),
    @RestApiParam(name="withLastActivity", type="boolean", paramType = RestApiParamType.QUERY, description = "(optional) Return the last consultation of current user in each image. Not compatible with tree, excludeimagegroup and datatables parameters ")
    ])
    def listByProject() {
        Project project = projectService.read(params.long('id'))
        if(params.excludeimagegroup){
            String sortColumn = params.sortColumn ? params.sortColumn : "created"
            String sortDirection = params.sortDirection ? params.sortDirection : "desc"
            String search = params.sSearch
            if(params.excludeimagegroup == "any"){
                if(project){
                    responseSuccess(imageInstanceService.listWithoutAnyGroup(project, sortColumn, sortDirection, search))
                }
                else{
                    responseNotFound("ImageInstance", "Project", params.id)
                }
            }
            else{
                ImageGroup group = imageGroupService.read(params.long('excludeimagegroup'))
                if(project && group){
                    responseSuccess(imageInstanceService.listWithoutGroup(project, group, sortColumn, sortDirection, search))
                }
                else{
                    responseNotFound("ImageInstance", "Project", params.id)
                }
            }
        }
        else if (params.datatables) {
            def where = "project_id = ${project.id}"
            def fieldFormat = []
            responseSuccess(dataTablesService.process(params, ImageInstance, where, fieldFormat,project))
        }
        else if (project && !params.tree) {
            String sortColumn = params.sortColumn ? params.sortColumn : "created"
            String sortDirection = params.sortDirection ? params.sortDirection : "desc"
            String search = params.search
            def withoutLabel = params.boolean('withoutLabel', false)
            def extended = [:]
            if(params.withLastActivity) extended.put("withLastActivity",params.withLastActivity)
            def imageList
            if(extended.isEmpty()){
                imageList = imageInstanceService.list(project, sortColumn, sortDirection, search, withoutLabel)
            } else {
                imageList = imageInstanceService.listExtended(project, sortColumn, sortDirection, search, extended, withoutLabel)
            }

            responseSuccess(imageList)
        }
        else if (project && params.tree && params.boolean("tree"))  {
            responseSuccess(imageInstanceService.listTree(project))
        }
        else {
            responseNotFound("ImageInstance", "Project", params.id)
        }
    }




    @RestApiMethod(description="Get the next project image (by instance filename)")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The current image instance id"),
    ])
    def next() {
        def image = imageInstanceService.read(params.long('id'))
        def next = ImageInstance.findByProjectAndInstanceFilenameGreaterThanAndDeletedIsNull(image.project,image.instanceFilename,[sort:'instanceFilename',order:'asc'])
        if(next) {
            responseSuccess(next)
        } else {
            responseSuccess([:])
        }
    }

    @RestApiMethod(description="Get the previous project image (by instance filename)")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The current image instance id"),
    ])
    def previous() {
        def image = imageInstanceService.read(params.long('id'))
        def previous = ImageInstance.findByProjectAndInstanceFilenameLessThanAndDeletedIsNull(image.project,image.instanceFilename,[sort:'instanceFilename',order:'desc'])
        if(previous) {
            responseSuccess(previous)
        } else {
            responseSuccess([:])
        }
    }

    @RestApiMethod(description="Add a new image instance in a project. If we add an image previously deleted, all previous information will be restored.")
    def add() {
        try {
            responseResult(imageInstanceService.add(request.JSON))
        } catch (CytomineException e) {
            log.error(e)
            response([success: false, errors: e.msg], e.code)
        }
    }

    @RestApiMethod(description="Update an image instance")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The image instance id")
    ])
    def update() {
        update(imageInstanceService, request.JSON)
    }

    @RestApiMethod(description="Delete an image from a project)")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH,description = "The image instance id")
    ])
    def delete() {
        delete(imageInstanceService, JSON.parse("{id : $params.id}"),null)
    }

    def dataSource
    /**
     * Get all image id from project
     */
    public def getInfo(String id) {

        //better perf with sql request
        String request = "SELECT a.id, a.version,a.deleted FROM image_instance a WHERE id = $id"
        def data = []
        def sql = new Sql(dataSource)
        sql.eachRow(request) {
            data << it[0] + ", " + it[1] + ", " + it[2]
        }
        try {
            sql.close()
        }catch (Exception e) {}
        return data
    }


    //TODO:APIDOC
    def windowUrl() {
        ImageInstance imageInstance = imageInstanceService.read(params.id)
        params.id = imageInstance.baseImage.id
        responseSuccess([url : abstractImageService.window(params, request.queryString).url])
    }

    //todo : move into a service
    public String getWKTGeometry(ImageInstance imageInstance, params) {
        def geometries = []
        if (params.annotations && !params.reviewed) {
            def idAnnotations = params.annotations.split(',')
            idAnnotations.each { idAnnotation ->
                geometries << userAnnotationService.read(idAnnotation).location
            }
        }
        else if (params.annotations && params.reviewed) {
            def idAnnotations = params.annotations.split(',')
            idAnnotations.each { idAnnotation ->
                geometries << reviewedAnnotationService.read(idAnnotation).location
            }
        } else if (!params.annotations) {
            List<Long> termsIDS = params.terms?.split(',')?.collect {
                Long.parseLong(it)
            }
            if (!termsIDS) { //don't filter by term, take everything
                termsIDS = termService.getAllTermId(imageInstance.getProject())
            }

            List<Long> userIDS = params.users?.split(",")?.collect {
                Long.parseLong(it)
            }
            if (!userIDS) { //don't filter by users, take everything
                userIDS = secUserService.listLayers(imageInstance.getProject()).collect { it.id}
            }
            List<Long> imageIDS = [imageInstance.id]

            log.info params
            //Create a geometry corresponding to the ROI of the request (x,y,w,h)
            int x
            int y
            int w
            int h
            try {
                x = params.int('topLeftX')
                y = params.int('topLeftY')
                w = params.int('width')
                h = params.int('height')
            }catch (Exception e) {
                x = params.int('x')
                y = params.int('y')
                w = params.int('w')
                h = params.int('h')
            }
            Geometry roiGeometry = GeometryUtils.createBoundingBox(
                    x,                                      //minX
                    x + w,                                  //maxX
                    imageInstance.baseImage.getHeight() - (y + h),    //minX
                    imageInstance.baseImage.getHeight() - y           //maxY
            )


            //Fetch annotations with the requested term on the request image

            if (params.review) {
                ReviewedAnnotationListing ral = new ReviewedAnnotationListing(project: imageInstance.getProject().id, terms: termsIDS, reviewUsers: userIDS, images:imageIDS, bbox:roiGeometry, columnToPrint:['basic','meta','wkt','term']  )
                def result = annotationListingService.listGeneric(ral)
                log.info "annotations=${result.size()}"
                geometries = result.collect {
                    new WKTReader().read(it["location"])
                }

            } else {
                log.info "imageInstance=${imageInstance}"
                log.info "roiGeometry=${roiGeometry}"
                log.info "termsIDS=${termsIDS}"
                log.info "userIDS=${userIDS}"
                Collection<UserAnnotation> annotations = userAnnotationService.list(imageInstance, roiGeometry, termsIDS, userIDS)
                log.info "annotations=${annotations.size()}"
                geometries = annotations.collect { geometry ->
                    geometry.getLocation()
                }
            }

            GeometryCollection geometryCollection = new GeometryCollection((Geometry[])geometries, new GeometryFactory())
            return new WKTWriter().write(geometryCollection)
        }
    }

    //TODO:APIDOC
    def window() {
        ImageInstance imageInstance = imageInstanceService.read(params.id)
        params.id = imageInstance.baseImage.id
        if (params.mask || params.alphaMask)
            params.location = getWKTGeometry(imageInstance, params)
        //handle idTerms & idUsers
        def req = abstractImageService.window(params, request.queryString)
        log.info "req.url=${req.url}"
        log.info "req.post=${req.post}"

        def queryString = req.url.split("\\?")
        log.info "queryString=$queryString"
//        queryString = queryString.replace("?", "")
        String imageServerURL = imageInstance.baseImage.getRandomImageServerURL()
        String fif = URLEncoder.encode(imageInstance.baseImage.absolutePath, "UTF-8")
        String mimeType = imageInstance.baseImage.mimeType
        String url
        if(queryString[1].contains("mask=true")) {
            url = "$imageServerURL/image/mask.png?fif=$fif&mimeType=$mimeType&${queryString[1]}&resolution=${imageInstance.baseImage.resolution}" //&scale=$scale
        } else {
            url = "$imageServerURL/image/crop.png?fif=$fif&mimeType=$mimeType&${queryString[1]}&resolution=${imageInstance.baseImage.resolution}" //&scale=$scale
        }


        BufferedImage image = new HttpClient().readBufferedImageFromPOST(url,req.post)
//        redirect(url : url)
        responseBufferedImage(image)
    }

    //TODO:APIDOC
    def cropGeometry() {
        //TODO:: document this method
        String geometrySTR = params.geometry
        def geometry = new WKTReader().read(geometrySTR)
        def annotation = new UserAnnotation(location: geometry)
        annotation.image = ImageInstance.read(params.long("id"))
        String url = annotation.toCropURL(params)
        log.info "redirect $url"
        redirect (url : url)
    }

    def crop() {
        ImageInstance image = ImageInstance.read(params.long('id'))
        AbstractImage abstractImage = image.getBaseImage()
        params.id = abstractImage.id
        String url = abstractImageService.crop(params, request.queryString)
        log.info "redirect $url"
        redirect (url : url )
    }

    @RestApiMethod(description="Copy image metadata (description, properties...) from an image to another one")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The image that get the data"),
    @RestApiParam(name="based", type="long", paramType = RestApiParamType.QUERY, description = "The image source for the data")
    ])
    @RestApiResponseObject(objectIdentifier = "empty")
    def copyMetadata() {
        try {
            ImageInstance based = imageInstanceService.read(params.long('based'))
            ImageInstance image = imageInstanceService.read(params.long('id'))
            if(image && based) {
                securityACLService.checkIsAdminContainer(image.project,cytomineService.currentUser)

                Description.findAllByDomainIdent(based.id).each { description ->
                    def json = JSON.parse(description.encodeAsJSON())
                    json.domainIdent = image.id
                    descriptionService.add(json)
                }

                Property.findAllByDomainIdent(based.id).each { property ->
                    def json = JSON.parse(property.encodeAsJSON())
                    json.domainIdent = image.id
                    propertyService.add(json)
                }

                responseSuccess([])
            } else if(!based) {
                responseNotFound("ImageInstance",params.based)
            }else if(!image) {
                responseNotFound("ImageInstance",params.id)
            }
        } catch (CytomineException e) {
            log.error(e)
            response([success: false, errors: e.msg], e.code)
        }

    }

    /**
     * Check if an abstract image is already map with one or more projects
     * If true, send an array with item {imageinstanceId,layerId,layerName,projectId, projectName, admin}
     */
    @RestApiMethod(description="Get, for an image instance, all the project having the same abstract image with the same layer (user)", listing = true)
    @RestApiResponseObject(objectIdentifier =  "[project_sharing_same_image]")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The image that get the data"),
    @RestApiParam(name="project", type="long", paramType = RestApiParamType.QUERY, description = "The image source for the data")
    ])
    def retrieveSameImageOtherProject() {
        try {
            ImageInstance image = imageInstanceService.read(params.long('id'))
            Project project = projectService.read(params.long('project'))
            if(image) {
                securityACLService.checkIsAdminContainer(image.project,cytomineService.currentUser)
                def layers =  imageInstanceService.getLayersFromAbstractImage(image.baseImage,image, projectService.list(cytomineService.currentUser).collect{it.id},secUserService.listUsers(image.project).collect{it.id},project)
                responseSuccess(layers)
            } else {
                responseNotFound("Abstract Image",params.id)
            }
        } catch (CytomineException e) {
            log.error(e)
            response([success: false, errors: e.msg], e.code)
        }
    }


    /**
     * Copy all annotation (and dedepency: term, description, property,..) to the new image
     * Params must be &layers=IMAGEINSTANCE1_USER1,IMAGE_INSTANCE1_USER2,... which will add annotation
     * from user/image from another project.
     */
    @RestApiMethod(description="Copy all annotation (and term, desc, property,...) from an image to another image", listing = true)
    @RestApiResponseObject(objectIdentifier = "[copy_annotation_image]")
    @RestApiParams(params=[
    @RestApiParam(name="id", type="long", paramType = RestApiParamType.PATH, description = "The image that get the data"),
    @RestApiParam(name="task", type="long", paramType = RestApiParamType.QUERY, description = "(Optional) The id of task that will be update during the request processing"),
    @RestApiParam(name="giveMe", type="boolean", paramType = RestApiParamType.QUERY, description = "If true, copy all annotation on the current user layer. If false or not mentioned, copy all anotation on the same layer as the source image"),
    @RestApiParam(name="layers", type="list (x1_y1,x2_y2,...)", paramType = RestApiParamType.QUERY, description = "List of couple 'idimage_iduser'")
    ])
    def copyAnnotationFromSameAbstractImage() {
        try {
            ImageInstance image = imageInstanceService.read(params.long('id'))
            securityACLService.checkIsAdminContainer(image.project,cytomineService.currentUser)
            Task task = taskService.read(params.getLong("task"))
            Boolean giveMe = params.boolean("giveMe")
            log.info "task ${task} is find for id = ${params.getLong("task")}"
            def layers = params.layers? params.layers.split(",") : ""
            if(image && layers) {
                responseSuccess(imageInstanceService.copyLayers(image,layers,secUserService.listUsers(image.project).collect{it.id},task,cytomineService.currentUser,giveMe))
            } else {
                responseNotFound("Abstract Image",params.id)
            }
        } catch (CytomineException e) {
            log.error(e)
            response([success: false, errors: e.msg], e.code)
        }
    }

    def download() {
        Long id = params.long("id")
        Boolean parent = params.boolean("parent", false)
        ImageInstance imageInstance = imageInstanceService.read(id)
        String downloadURL = abstractImageService.downloadURI(imageInstance.baseImage, parent)
        if (downloadURL) {
            log.info "redirect $downloadURL"
            redirect (url : downloadURL)
        } else
            responseNotFound("Download link for", id)
    }

    /*def metadata() {
        Long id = params.long("id")
        ImageInstance imageInstance = imageInstanceService.read(id)
        def responseData = [:]
        responseData.metadata = abstractImageService.metadata(imageInstance.baseImage)
        response(responseData)
    }*/

    def associated() {
        Long id = params.long("id")
        ImageInstance imageInstance = imageInstanceService.read(id)
        def associated = abstractImageService.getAvailableAssociatedImages(imageInstance.baseImage)
        responseSuccess(associated)
    }

    def label() {
        Long id = params.long("id")
        String label = params.label
        def maxWidth = 1000
        if (params.maxWidth) {
            maxWidth = params.int("maxWidth")
        }
        ImageInstance imageInstance = imageInstanceService.read(id)
        def associatedImage = abstractImageService.getAssociatedImage(imageInstance.baseImage, label, maxWidth)
        if (associatedImage)
            responseBufferedImage(associatedImage)
    }

    def imageProperties() {
        Long id = params.long("id")
        ImageInstance imageInstance = imageInstanceService.read(id)
        responseSuccess(abstractImageService.imageProperties(imageInstance.baseImage))
    }


    //TODO:APIDOC
    def cameraUrl() {
        ImageInstance image = imageInstanceService.read(params.id)
        AbstractImage abstractImage = image.baseImage
        params.id = abstractImage.id
        def url = abstractImageService.window(params, request.queryString,abstractImage.width,abstractImage.height)
        log.info "response $url"
        responseSuccess([url : url.url])
    }


}
