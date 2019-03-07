package be.cytomine.image

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
import be.cytomine.Exception.ForbiddenException
import be.cytomine.Exception.WrongArgumentException
import be.cytomine.api.UrlApi
import be.cytomine.command.AddCommand
import be.cytomine.command.Command
import be.cytomine.command.EditCommand
import be.cytomine.command.Transaction
import be.cytomine.image.server.Storage
import be.cytomine.image.server.StorageAbstractImage
import be.cytomine.project.Project
import be.cytomine.security.SecUser
import be.cytomine.security.User
import be.cytomine.utils.AttachedFile
import be.cytomine.utils.ModelService
import be.cytomine.utils.Task
import grails.converters.JSON

import javax.imageio.ImageIO
import java.awt.image.BufferedImage

import static org.springframework.security.acls.domain.BasePermission.READ
import static org.springframework.security.acls.domain.BasePermission.WRITE

class AbstractImageService extends ModelService {

    static transactional = true

    def commandService
    def cytomineService
    def imagePropertiesService
    def transactionService
    def storageService
    def groupService
    def imageInstanceService
    def attachedFileService
    def currentRoleServiceProxy
    def securityACLService
    def storageAbstractImageService

    def currentDomain() {
        return AbstractImage
    }

    AbstractImage read(def id) {
        AbstractImage abstractImage = AbstractImage.read(id)
        if(abstractImage) {
            //securityACLService.checkAtLeastOne(abstractImage, READ)
            if(!hasRightToReadAbstractImageWithProject(abstractImage) && !hasRightToReadAbstractImageWithStorage(abstractImage)) {
                throw new ForbiddenException("You don't have the right to read or modity this resource! ${abstractImage} ${id}")
            }
        }
        abstractImage
    }

    AbstractImage get(def id) {
        AbstractImage abstractImage = AbstractImage.get(id)
        if(abstractImage) {
            //securityACLService.checkAtLeastOne(abstractImage, READ)
            if(!hasRightToReadAbstractImageWithProject(abstractImage) && !hasRightToReadAbstractImageWithStorage(abstractImage)) {
                throw new ForbiddenException("You don't have the right to read or modity this resource! ${abstractImage} ${id}")
            }
        }
        abstractImage
    }

    boolean hasRightToReadAbstractImageWithProject(AbstractImage image) {
        if(currentRoleServiceProxy.isAdminByNow(cytomineService.currentUser)) return true
        List<ImageInstance> imageInstances = ImageInstance.findAllByBaseImage(image)
        List<Project> projects = imageInstances.collect{it.project}
        for(Project project : projects) {
            if(project.hasACLPermission(project,READ)) return true
        }
        return false
    }

    boolean hasRightToReadAbstractImageWithStorage(AbstractImage image) {
        if(currentRoleServiceProxy.isAdminByNow(cytomineService.currentUser)) return true
        List<Storage> storages = StorageAbstractImage.findAllByAbstractImage(image).collect{it.storage}
        for(Storage storage : storages) {
            if(storage.hasACLPermission(storage,READ)) return true
        }
        return false
    }

    def list(Project project) {
        securityACLService.check(project,READ)
        ImageInstance.createCriteria().list {
            eq("project", project)
            projections {
                groupProperty("baseImage")
            }
        }
    }

    def list(SecUser user) {
        if(currentRoleServiceProxy.isAdminByNow(user)) {
            return AbstractImage.list()
        } else {
            List<Storage> storages = securityACLService.getStorageList(cytomineService.currentUser)
            List<AbstractImage> images = StorageAbstractImage.findAllByStorageInList(storages).collect{it.abstractImage}
            return images.findAll{!it.deleted}
        }
    }

    /**
     * Add the new domain with JSON data
     * @param json New domain data
     * @return Response structure (created domain data,..)
     */
    def add(def json) throws CytomineException {
        transactionService.start()
        SecUser currentUser = cytomineService.getCurrentUser()
        Command c = new AddCommand(user: currentUser)
        def res = executeCommand(c,null,json)
        //AbstractImage abstractImage = retrieve(res.data.abstractimage)
        AbstractImage abstractImage = res.object

        json.storage.each { storageID ->
            Storage storage = storageService.read(storageID)
            securityACLService.check(storage,WRITE)
            //CHECK WRITE ON STORAGE
            StorageAbstractImage sai = new StorageAbstractImage(storage:storage,abstractImage:abstractImage)
            sai.save(flush:true,failOnError: true)
        }
        imagePropertiesService.extractUseful(abstractImage)
        abstractImage.save(flush : true)
        //Stop transaction

        return res
    }

    /**
     * Update this domain with new data from json
     * @param domain Domain to update
     * @param jsonNewData New domain datas
     * @return  Response structure (new domain data, old domain data..)
     */
    def update(AbstractImage image,def jsonNewData) throws CytomineException {
        securityACLService.checkAtLeastOne(image,WRITE)
        transactionService.start()
        SecUser currentUser = cytomineService.getCurrentUser()
        def res = executeCommand(new EditCommand(user: currentUser), image,jsonNewData)
        AbstractImage abstractImage = res.object

        if(jsonNewData.storage) {
            StorageAbstractImage.findAllByAbstractImage(abstractImage).each { storageAbstractImage ->
                securityACLService.check(storageAbstractImage.storage,WRITE)
                def sai = StorageAbstractImage.findByStorageAndAbstractImage(storageAbstractImage.storage, abstractImage)
                sai.delete(flush:true)
            }
            jsonNewData.storage.each { storageID ->
                Storage storage = storageService.read(storageID)
                securityACLService.check(storage,WRITE)
                StorageAbstractImage sai = new StorageAbstractImage(storage:storage,abstractImage:abstractImage)
                sai.save(flush:true,failOnError: true)
            }
        }
        return res
    }

    def getUploaderOfImage(long id){
        AbstractImage img = AbstractImage.get(id)
        if(!img){
            return null
        }
        return UploadedFile.findByImage(img).user
    }

    /**
     * Check if some instances of this image exists and are still active
     */
    def isUsed(def id) {
        AbstractImage domain = AbstractImage.read(id);
        boolean usedByImageInstance = ImageInstance.findAllByBaseImageAndDeletedIsNull(domain).size() != 0
        boolean usedByNestedFile = NestedFile.findAllByAbstractImage(domain).size() != 0

        return usedByImageInstance || usedByNestedFile
    }

    /**
     * Returns the list of all the unused abstract images
     */
    def listUnused(User user) {
        def result = []
        def abstractList = list(user);
        abstractList.each {
            image ->
                if(!isUsed(image.id)) result << image;
        }
        return result;
    }

    /**
     * Delete this domain
     * @param domain Domain to delete
     * @param transaction Transaction link with this command
     * @param task Task for this command
     * @param printMessage Flag if client will print or not confirm message
     * @return Response structure (code, old domain,..)
     */
    def delete(AbstractImage domain, Transaction transaction = null, Task task = null, boolean printMessage = true) {
        //We don't delete domain, we juste change a flag
        securityACLService.checkAtLeastOne(domain,WRITE)

        if (!isUsed(domain.id)) {
            def jsonNewData = JSON.parse(domain.encodeAsJSON())
            jsonNewData.deleted = new Date().time
            SecUser currentUser = cytomineService.getCurrentUser()
            Command c = new EditCommand(user: currentUser, transaction: transaction)
            c.delete = true
            return executeCommand(c,domain,jsonNewData)
        } else{
            def instances = ImageInstance.findAllByBaseImageAndDeletedIsNull(domain)
            throw new ForbiddenException("Abstract Image has instances in active projects : "+instances.collect{it.project.name}.join(",")
                    +" with the following names : "+instances.collect{it.instanceFilename}.unique().join(","));
        }
    }


    def crop(params, queryString) {
        queryString = queryString.replace("?", "")
        AbstractImage abstractImage = read(params.id)
        String imageServerURL = abstractImage.getRandomImageServerURL()
        String fif = URLEncoder.encode(abstractImage.absolutePath, "UTF-8")
        String mimeType = abstractImage.mimeType
        return "$imageServerURL/image/crop.${params.format}?fif=$fif&mimeType=$mimeType&$queryString&resolution=${abstractImage.resolution}" //&scale=$scale
    }

    def getCropIMSUrl(params) {
        AbstractImage abstractImage = read(params.id)
        params.remove("id")
        String imageServerURL = abstractImage.getRandomImageServerURL()
        String fif = URLEncoder.encode(abstractImage.absolutePath, "UTF-8")
        String mimeType = abstractImage.mimeType
        String url = "$imageServerURL/image/crop.${params.format}?fif=$fif&mimeType=$mimeType"

        String query = params.collect { key, value ->
            if (value instanceof String)
                value = URLEncoder.encode(value, "UTF-8")
            "$key=$value"
        }.join("&")
        url += "&$query"
        url += "&resolution=${abstractImage.resolution}"
        return url
    }

    def window(def params, String queryString, Long width = null, Long height = null) {
        Long id = params.long('id')
        AbstractImage abstractImage = read(id)
        int x = params.int('x')
        int y = params.int('y')
        int w = params.int('w')
        int h = params.int('h')
        def parameters = [:]
        parameters.topLeftX = Math.max(x,0)
        parameters.topLeftY = Math.max(y,0)
        parameters.width = w
        parameters.height = h
        parameters.imageWidth = abstractImage.getWidth()
        parameters.imageHeight = abstractImage.getHeight()

        if(width && (parameters.width+parameters.topLeftX)>width) {
            //for camera, don't take the part outsite the real image
            parameters.width = width - parameters.topLeftX
        }
        if(height && (parameters.height+parameters.topLeftY)>height) {
            //for camera, don't take the part outsite the real image
            parameters.height = height - parameters.topLeftY
        }
        parameters.topLeftY = Math.max(abstractImage.getHeight() - parameters.topLeftY,0)

        if (params.zoom) parameters.zoom = params.zoom
        if (params.maxSize) parameters.maxSize = params.maxSize
        if (params.mask) parameters.mask = params.mask
        if (params.alphaMask) parameters.alphaMask = params.alphaMask

        def post = """
            {"location": "${params.location}"}
        """

        return [url:UrlApi.getCropURL(id, parameters, params.format), post: post]
    }



    /**
     * Get all image servers for an image id
     */
    def imageServers(def id) {
        AbstractImage image = read(id)
        def urls = []
        for (imageServerStorage in image.getImageServersStorage()) {
            urls << [imageServerStorage.getZoomifyUrl(), image.getPath()].join(File.separator) + "/" //+ "&mimeType=${uploadedFile.mimeType}"
        }


        return [imageServersURLs : urls]
    }

    /**
     * Get thumb image URL
     */
    def thumb(long id, int maxSize, def params=null, boolean refresh = false) {
        AbstractImage abstractImage = AbstractImage.read(id)

        def parameters= [:]

        parameters.fif = URLEncoder.encode(abstractImage.absolutePath, "UTF-8")
        parameters.mimeType = abstractImage.mimeType
        parameters.maxSize = maxSize

        def format = "jpg"
        if (params)  {
            if (params.format) format = params.format
            if (params.colormap) parameters.colormap = params.colormap
            if (params.inverse) parameters.inverse = params.inverse
            if (params.contrast) parameters.contrast = params.contrast
            if (params.gamma) parameters.gamma = params.gamma
            if (params.bits) {
                if (params.bits == "max") parameters.bits = abstractImage.bitDepth ?: 8
                else parameters.bits = params.bits
            }
        }

        String url = "/image/thumb.$format?" + parameters.collect {k, v -> "$k=$v"}.join("&")

        AttachedFile attachedFile = AttachedFile.findByDomainIdentAndFilename(id, url)
        if (!attachedFile || refresh) {
            String imageServerURL = abstractImage.getRandomImageServerURL()
            log.info "$imageServerURL"+url
            byte[] imageData = new URL("$imageServerURL"+url).getBytes()
            BufferedImage bufferedImage = ImageIO.read(new ByteArrayInputStream(imageData))
            attachedFileService.add(url, imageData, abstractImage.id, AbstractImage.class.getName(), "thumb")
            return bufferedImage
        } else {
            return ImageIO.read(new ByteArrayInputStream(attachedFile.getData()))
        }
    }

    /**
     * Get Preview image URL
     */
    def preview(def id, def params=null) {
        thumb(id, 1024, params)
    }

    def getMainUploadedFile(AbstractImage abstractImage) {
        List<UploadedFile> uploadedfiles = UploadedFile.findAllByImage(abstractImage)

        if(uploadedfiles.size()==1) {
            return uploadedfiles.first()
        } else {
            //get the first uploadedfile...
            return uploadedfiles.find{ main ->
                 //...that is not present in parent (must be the 'last' child)
                 uploadedfiles.find{ second -> second.parent?.id==main.id}==null;
             }
        }

//
//        if (uploadedfile?.parent && !uploadedfile?.parent?.ext?.equals("png") && !uploadedfile?.parent?.ext?.equals("jpg")) {
//            return uploadedfile.parent
//        }
//        else return uploadedfile

    }

    def downloadURI(AbstractImage abstractImage, boolean downloadParent) {
        List<UploadedFile> files = UploadedFile.findAllByImage(abstractImage)
        UploadedFile file = files.size() == 1 ? files[0] : files.find{it.parent!=null}

        if (downloadParent) {
            while(file.parent) {
                file = file.parent
            }
        }

        String fif = file?.absolutePath
        if (fif) {
            String imageServerURL = abstractImage.getRandomImageServerURL()
            return "$imageServerURL/image/download?fif=$fif&mimeType=${abstractImage.mimeType}"
        } else {
            return null
        }

    }

    def getAvailableAssociatedImages(AbstractImage abstractImage) {
        String imageServerURL = abstractImage.getRandomImageServerURL()
        String fif = URLEncoder.encode(abstractImage.absolutePath, "UTF-8")
        String mimeType = abstractImage.mimeType
        String url = "$imageServerURL/image/associated.json?fif=$fif&mimeType=$mimeType"
        return JSON.parse( new URL(url).text )
    }

    def getAssociatedImage(AbstractImage abstractImage, String label, def maxWidth) {
        String fif = URLEncoder.encode(abstractImage.absolutePath, "UTF-8")
        String mimeType = abstractImage.mimeType
        String url = "/image/nested.jpg?fif=$fif&mimeType=$mimeType&label=$label&maxSize=$maxWidth"

        AttachedFile attachedFile = AttachedFile.findByDomainIdentAndFilename(abstractImage.id, url)
        if (attachedFile) {
            return ImageIO.read(new ByteArrayInputStream(attachedFile.getData()))
        } else {
            String imageServerURL = abstractImage.getRandomImageServerURL()
            byte[] imageData = new URL("$imageServerURL"+url).getBytes()
            BufferedImage bufferedImage =  ImageIO.read(new ByteArrayInputStream(imageData))
            attachedFileService.add(url, imageData, abstractImage.id, AbstractImage.class.getName(), "nested")
            return bufferedImage
        }

    }

    def uploadedFileService
    def deleteFile(AbstractImage ai, Transaction transaction = null){
        UploadedFile uf = UploadedFile.findByImage(ai)
        uploadedFileService.delete(uf)

        while(uf.parent){
            if(UploadedFile.countByParentAndDeletedIsNull(uf.parent) == 0){
                uploadedFileService.delete(uf.parent, transaction)
                uf = uf.parent
            } else {
                break
            }
        }
    }

    def getStringParamsI18n(def domain) {
        return [domain.id, domain.originalFilename]
    }

    def deleteDependentImageInstance(AbstractImage ai, Transaction transaction,Task task=null) {
        def images = ImageInstance.findAllByBaseImageAndDeletedIsNull(ai);
        if(!images.isEmpty()) {
            throw new WrongArgumentException("You cannot delete this image, it has already been insert in projects " + images.collect{it.project.name})
        }
    }

    def deleteDependentAttachedFile(AbstractImage ai, Transaction transaction,Task task=null) {
        AttachedFile.findAllByDomainIdentAndDomainClassName(ai.id, ai.class.getName()).each {
            attachedFileService.delete(it,transaction,null,false)
        }
    }


    def deleteDependentNestedFile(AbstractImage ai, Transaction transaction,Task task=null) {
        //TODO: implement this with command (nestedFileService should be create)
        NestedFile.findAllByAbstractImage(ai).each {
            it.delete(flush: true)
        }
    }

    def deleteDependentStorageAbstractImage(AbstractImage ai, Transaction transaction,Task task=null) {
        //TODO: implement this with command (storage abst image should be create)
        StorageAbstractImage.findAllByAbstractImage(ai).each {
            storageAbstractImageService.delete(it,transaction,null)
        }
    }

    def deleteDependentNestedImageInstance(AbstractImage ai, Transaction transaction,Task task=null) {
        NestedImageInstance.findAllByBaseImage(ai).each {
            it.delete(flush: true)
        }
    }
}
