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
import be.cytomine.api.UrlApi
import be.cytomine.command.AddCommand
import be.cytomine.command.Command
import be.cytomine.command.EditCommand
import be.cytomine.command.Transaction
import be.cytomine.image.multidim.ImageGroup
import be.cytomine.image.multidim.ImageSequence
import be.cytomine.ontology.AnnotationTerm
import be.cytomine.ontology.Property
import be.cytomine.ontology.UserAnnotation
import be.cytomine.project.Project
import be.cytomine.security.SecUser
import be.cytomine.security.User
import be.cytomine.utils.Description
import be.cytomine.utils.ModelService
import be.cytomine.utils.Task
import grails.converters.JSON
import groovy.sql.Sql
import org.hibernate.FetchMode

import static org.springframework.security.acls.domain.BasePermission.ADMINISTRATION
import static org.springframework.security.acls.domain.BasePermission.READ

/**
 * TODO:: refactor + doc!!!!!!!
 */
class ImageInstanceService extends ModelService {

    static transactional = false

    def cytomineService
    def transactionService
    def userAnnotationService
    def algoAnnotationService
    def dataSource
    def reviewedAnnotationService
    def imageSequenceService
    def propertyService
    def annotationIndexService
    def securityACLService
    def mongo
    def noSQLCollectionService

    def currentDomain() {
        return ImageInstance
    }

    def read(def id) {
        def image = ImageInstance.read(id)
        if(image) {
            securityACLService.check(image.container(),READ)
            checkDeleted(image)
        }
        image
    }

    def readMany(def ids) {
        def images = ImageInstance.findAllByIdInList(ids)
        if(images) {
            images.each { image ->
                securityACLService.check(image.container(),READ)
                checkDeleted(image)
            }
        }
        images
    }


    def list(Project project, def withoutLabel) {
        securityACLService.check(project,READ)
        String _noLabel = (withoutLabel) ? "%_lbl.%" : ""

        def images = ImageInstance.createCriteria().list {
            createAlias("baseImage", "i")
            eq("project", project)
            isNull("parent")
            order("i.created", "desc")
            fetchMode 'baseImage', FetchMode.JOIN
            isNull("deleted")
            not {
                ilike("i.originalFilename", _noLabel)
            }
        }
        return images
    }

    /**
     * Get all image id from project
     */
    public List<Long> getAllImageId(Project project) {
        securityACLService.check(project,READ)

        //better perf with sql request
        String request = "SELECT a.id FROM image_instance a WHERE project_id="+project.id  + " AND parent_id IS NULL AND deleted IS NULL"
        def data = []
        def sql = new Sql(dataSource)
        sql.eachRow(request) {
            data << it[0]
        }
        sql.close()
        return data
    }

    def list(User user) {
        securityACLService.checkIsSameUser(user,cytomineService.currentUser)
        def data = []

        //user_image already filter nested image
        def sql = new Sql(dataSource)
         sql.eachRow("select * from user_image where user_image_id = ? order by original_filename",[user.id]) {
            data << [id:it.id, filename:it.filename, originalFilename: it.original_filename, projectName:it.project_name,  project:it.project_id]
        }
        sql.close()
        return data
    }

    def listLastOpened(User user, Long offset = null, Long max = null) {
        //get id of last open image
        securityACLService.checkIsSameUser(user,cytomineService.currentUser)
        def data = []

        def db = mongo.getDB(noSQLCollectionService.getDatabaseName())

        def result = db.persistentImageConsultation.aggregate(
                [$match : [ user : user.id]],
                [$group : [_id : '$image', "date":[$max:'$created']]],
                [$sort : [ date : -1]],
                [$limit: (max==null? 5 : max)]
        )
        //result = result.results().collect{it['_id']}.collect{[it["image"],it["user"]]}
        result.results().each {
            try {
                ImageInstance image = read(it['_id'])
                String filename;
                filename = image.instanceFilename == null ? image.baseImage.originalFilename : image.instanceFilename;
                if(image.project.blindMode) filename = "[BLIND]"+image.baseImage.id
                 data << [id:it['_id'],date:it['date'], thumb: UrlApi.getAbstractImageThumbURL(image.baseImage.id),instanceFilename:filename,project:image.project.id]
            } catch(CytomineException e) {
               //if user has data but has no access to picture,  ImageInstance.read will throw a forbiddenException
            }
        }
        data = data.sort{-it.date.getTime()}
        return data
    }





    def listTree(Project project) {
        securityACLService.check(project,READ)

        def children = []
        list(project, true).each { image->
            children << [ id : image.id, key : image.id, title : image.instanceFilename, isFolder : false, children : []]
        }
        def tree = [:]
        tree.isFolder = true
        tree.hideCheckbox = true
        tree.name = project.getName()
        tree.title = project.getName();
        tree.key = project.getId()
        tree.id = project.getId()
        tree.children = children
        return tree
    }

    def list(Project project, String sortColumn, String sortDirection, String search, def withoutLabel) {
        securityACLService.check(project,READ)

        String abstractImageAlias = "ai"
        String _sortColumn = ImageInstance.hasProperty(sortColumn) ? sortColumn : "created"
        _sortColumn = AbstractImage.hasProperty(sortColumn) ? abstractImageAlias + "." + sortColumn : "created"
        String _search = (search != null && search != "") ? "%"+search+"%" : "%"
        String _noLabel = (withoutLabel) ? "%_lbl.%" : ""

        return ImageInstance.createCriteria().list() {
            createAlias("baseImage", abstractImageAlias)
            eq("project", project)
            isNull("parent")
            isNull("deleted")
            fetchMode 'baseImage', FetchMode.JOIN
            ilike(abstractImageAlias + ".originalFilename", _search)
            not {
                ilike(abstractImageAlias + ".originalFilename", _noLabel)
            }
            order(_sortColumn, sortDirection)
        }


    }

    def listExtended(Project project, String sortColumn, String sortDirection, String search, def extended, def withoutLabel) {

        def data = []
        def images = list(project, sortColumn, sortDirection, search, withoutLabel)

        //get last activity grouped by images
        def user = cytomineService.currentUser

        def db = mongo.getDB(noSQLCollectionService.getDatabaseName())
        def result = db.persistentImageConsultation.aggregate(
                [$match : [ user : user.id]],
                [$sort : [ created : -1]],
                [$group : [_id : '$image', created:[$max:'$created'], user:[$first: '$user']]],
                [$sort : [ _id : 1]]
        )

        def consultations = result.results().collect{[imageId : it['_id'],lastActivity:it['created'], user:it['user']]}

        // we sorted to apply binary search instead of a simple "find" method. => performance
        def binSearchI = { aList, property, target ->
            def a = aList
            def offSet = 0
            while (!a.empty) {
                def n = a.size()
                def m = n.intdiv(2)
                if(a[m]."$property" > target) {
                    a = a[0..<m]
                } else if (a[m]."$property" < target) {
                    a = a[(m + 1)..<n]
                    offSet += m + 1
                } else {
                    return (offSet + m)
                }
            }
            return -1
        }

        images.each { image ->
            def index
            def line = ImageInstance.getDataFromDomain(image)
            if(extended.withLastActivity) {
                index = binSearchI(consultations, "imageId", image.id)
                if(index >= 0){
                    line.putAt("lastActivity", consultations[index].lastActivity)
                } else {
                    line.putAt("lastActivity", null)
                }
            }
            data << line
        }
        return data
    }

    private long copyAnnotationLayer(ImageInstance image, User user, ImageInstance based, def usersProject,Task task, double total, double alreadyDone,SecUser currentUser, Boolean giveMe ) {
        log.info "copyAnnotationLayer=$image | $user "
         def alreadyDoneLocal = alreadyDone
         UserAnnotation.findAllByImageAndUser(image,user).each {
             copyAnnotation(it,based,usersProject,currentUser,giveMe)
             log.info "alreadyDone=$alreadyDone total=$total"
             taskService.updateTask(task,Math.min(100,((alreadyDoneLocal/total)*100d).intValue()),"Start to copy ${total.intValue()} annotations...")
             alreadyDoneLocal = alreadyDoneLocal +1
         }
        alreadyDoneLocal
    }


    private def copyAnnotation(UserAnnotation based, ImageInstance dest,def usersProject,SecUser currentUser,Boolean giveMe) {
        log.info "copyAnnotationLayer=${based.id}"

        //copy annotation
        UserAnnotation annotation = new UserAnnotation()
        annotation.created = based.created
        annotation.geometryCompression = based.geometryCompression
        annotation.image = dest
        annotation.location = based.location
        annotation.project = dest.project
        annotation.updated =  based.updated
        annotation.user = (giveMe? currentUser : based.user)
        annotation.wktLocation = based.wktLocation
        userAnnotationService.saveDomain(annotation)

        //copy term

        AnnotationTerm.findAllByUserAnnotation(based).each { basedAT ->
            if(usersProject.contains(basedAT.user.id) && basedAT.term.ontology==dest.project.ontology) {
                AnnotationTerm at = new AnnotationTerm()
                at.user = basedAT.user
                at.term = basedAT.term
                at.userAnnotation = annotation
                userAnnotationService.saveDomain(at)
            }
        }

        //copy description
        Description.findAllByDomainIdent(based.id).each {
            Description description = new Description()
            description.data = it.data
            description.domainClassName = it.domainClassName
            description.domainIdent = annotation.id
            userAnnotationService.saveDomain(description)
        }

        //copy properties
        Property.findAllByDomainIdent(based.id).each {
            Property property = new Property()
            property.key = it.key
            property.value = it.value
            property.domainClassName = it.domainClassName
            property.domainIdent = annotation.id
            userAnnotationService.saveDomain(property)
        }

    }

    public def copyLayers(ImageInstance image,def layers,def usersProject,Task task, SecUser currentUser,Boolean giveMe) {
        taskService.updateTask(task, 0, "Start to copy...")
        double total = 0
        if (task) {
            layers.each { couple ->
                def idImage = Long.parseLong(couple.split("_")[0])
                def idUser = Long.parseLong(couple.split("_")[1])
                def number = annotationIndexService.count(ImageInstance.read(idImage), SecUser.read(idUser))
                total = total + number
            }
        }
        taskService.updateTask(task, 0, "Start to copy $total annotations...")
        double alreadyDone = 0
        layers.each { couple ->
            def idImage = Long.parseLong(couple.split("_")[0])
            def idUser = Long.parseLong(couple.split("_")[1])
            alreadyDone = copyAnnotationLayer(ImageInstance.read(idImage), SecUser.read(idUser), image, usersProject,task, total, alreadyDone,currentUser,giveMe)
        }
        return []
    }


    def getLayersFromAbstractImage(AbstractImage image, ImageInstance exclude, def currentUsersProject,def layerFromNewImage, Project project = null) {
           //get id of last open image

           def layers = []
           def adminsMap = [:]

           def req1 = getLayersFromAbtrsactImageSQLRequestStr(true,project)
           def sql = new Sql(dataSource)
            sql.eachRow(req1,[image.id,exclude.id]) {
               if(currentUsersProject.contains(it.project) && layerFromNewImage.contains(it.user)) {
                   layers << [image:it.image,user:it.user,projectName:it.projectName,project:it.project,lastname:it.lastname,firstname:it.firstname,username:it.username,admin:it.admin]
                   adminsMap.put(it.image+"_"+it.user,true)
               }

           }
        sql.close()

        def req2 = getLayersFromAbtrsactImageSQLRequestStr(false,project)

        sql = new Sql(dataSource)
        sql.eachRow(req2,[image.id,exclude.id]) {
            if(!adminsMap.get(it.image+"_"+it.user) && currentUsersProject.contains(it.project) && layerFromNewImage.contains(it.user)) {
                layers << [image:it.image,user:it.user,projectName:it.projectName,project:it.project,lastname:it.lastname,firstname:it.firstname,username:it.username,admin:it.admin]
            }

        }
        sql.close()

        return layers

    }

    private String getLayersFromAbtrsactImageSQLRequestStr(boolean admin,Project project = null) {
        return """
            SELECT ii.id as image,su.id as user,p.name as projectName, p.id as project, su.lastname as lastname, su.firstname as firstname, su.username as username, '${admin}' as admin, count_annotation as annotations
            FROM image_instance ii, project p, ${admin? "admin_project" : "user_project" } up, sec_user su, annotation_index ai
            WHERE base_image_id = ?
            AND ii.id <> ?
            AND ii.deleted IS NULL
            AND ii.parent_id IS NULL
            AND ii.project_id = p.id
            AND up.id = p.id
            AND up.user_id = su.id
            AND ai.user_id = su.id
            AND ai.image_id = ii.id
            ${project? "AND p.id = " + project.id  : ""}
            ORDER BY p.name, su.lastname,su.firstname,su.username;
        """

    }



    /**
     * Add the new domain with JSON data
     * @param json New domain data
     * @return Response structure (created domain data,..)
     */
    def add(def json) {
        securityACLService.check(json.project,Project,READ)
        securityACLService.checkisNotReadOnly(json.project,Project)
        SecUser currentUser = cytomineService.getCurrentUser()
        json.user = currentUser.id
        log.info "json=$json"
        def project = Project.read(json.project)
        def baseImage = AbstractImage.read(json.baseImage)
        log.info "project=$project baseImage=$baseImage"
        def alreadyExist = ImageInstance.findByProjectAndBaseImage(project,baseImage)

        log.info "alreadyExist=${alreadyExist}"
        if(alreadyExist && alreadyExist.checkDeleted()) {
            //Image was previously deleted, restore it
            securityACLService.check(alreadyExist.container(),ADMINISTRATION)
            securityACLService.checkisNotReadOnly(alreadyExist.container())
            def jsonNewData = JSON.parse(alreadyExist.encodeAsJSON())
            jsonNewData.deleted = null
            Command c = new EditCommand(user: currentUser)
            return executeCommand(c,alreadyExist,jsonNewData)
        } else {
            synchronized (this.getClass()) {
                Command c = new AddCommand(user: currentUser)
                return executeCommand(c,null,json)
            }
        }



    }

    /**
     * Update this domain with new data from json
     * @param domain Domain to update
     * @param jsonNewData New domain datas
     * @return  Response structure (new domain data, old domain data..)
     */
    def update(ImageInstance domain, def jsonNewData) {
        securityACLService.check(domain.container(),READ)
        securityACLService.check(jsonNewData.project,Project,READ)
        securityACLService.checkFullOrRestrictedForOwner(domain.container(),domain.user)
        securityACLService.checkisNotReadOnly(domain.container())
        securityACLService.checkisNotReadOnly(jsonNewData.project,Project)
        SecUser currentUser = cytomineService.getCurrentUser()
        Command c = new EditCommand(user: currentUser)
        executeCommand(c,domain,jsonNewData)
    }

    /**
     * Delete this domain
     * @param domain Domain to delete
     * @param transaction Transaction link with this command
     * @param task Task for this command
     * @param printMessage Flag if client will print or not confirm message
     * @return Response structure (code, old domain,..)
     */
    def delete(ImageInstance domain, Transaction transaction = null, Task task = null, boolean printMessage = true) {
//        securityACLService.check(domain.container(),READ)
//        securityACLService.checkisNotReadOnly(domain.container())
//        SecUser currentUser = cytomineService.getCurrentUser()
//        Command c = new DeleteCommand(user: currentUser,transaction:transaction)
//        return executeCommand(c,domain,null)

        //We don't delete domain, we juste change a flag
        securityACLService.checkFullOrRestrictedForOwner(domain.container(),domain.user)
        def jsonNewData = JSON.parse(domain.encodeAsJSON())
        jsonNewData.deleted = new Date().time
        SecUser currentUser = cytomineService.getCurrentUser()
        Command c = new EditCommand(user: currentUser)
        c.delete = true
        return executeCommand(c,domain,jsonNewData)
    }

    def getStringParamsI18n(def domain) {
        return [domain.id, domain.instanceFilename == null ? domain.baseImage?.originalFilename : domain.instanceFilename, domain.project.name]
    }

//    def deleteDependentAlgoAnnotation(ImageInstance image,Transaction transaction, Task task = null) {
//        AlgoAnnotation.findAllByImage(image).each {
//            algoAnnotationService.delete(it,transaction)
//        }
//    }
//
//    def deleteDependentReviewedAnnotation(ImageInstance image,Transaction transaction, Task task = null) {
//        ReviewedAnnotation.findAllByImage(image).each {
//            reviewedAnnotationService.delete(it,transaction,null,false)
//        }
//    }
//
//    def deleteDependentUserAnnotation(ImageInstance image,Transaction transaction, Task task = null) {
//        UserAnnotation.findAllByImage(image).each {
//            userAnnotationService.delete(it,transaction,null,false)
//        }
//    }
//
//    def deleteDependentUserPosition(ImageInstance image,Transaction transaction, Task task = null) {
//        UserPosition.findAllByImage(image).each {
//            it.delete()
//        }
//    }
//
//    def deleteDependentAnnotationIndex(ImageInstance image,Transaction transaction, Task task = null) {
//        AnnotationIndex.findAllByImage(image).each {
//            it.delete()
//         }
//    }
//
//    def deleteDependentImageSequence(ImageInstance image, Transaction transaction, Task task = null) {
//        ImageSequence.findAllByImage(image).each {
//            imageSequenceService.delete(it,transaction,null,false)
//        }
//    }
//
//    def deleteDependentProperty(ImageInstance image, Transaction transaction, Task task = null) {
//        Property.findAllByDomainIdent(image.id).each {
//            propertyService.delete(it,transaction,null,false)
//        }
//
//    }
//
//    def deleteDependentNestedImageInstance(ImageInstance image, Transaction transaction,Task task=null) {
//        NestedImageInstance.findAllByParent(image).each {
//            it.delete(flush: true)
//        }
//    }
    def listWithoutGroup(Project project, ImageGroup imageGroup, String sortColumn, String sortDirection, String search) {
        def listout = [];
        ImageSequence.findAllByImageGroup(imageGroup).each{
            listout << it.image.id
        }

        if(listout.size() == 0)
            return list(project, sortColumn, sortDirection, search, false);


        String abstractImageAlias = "ai"
        String _sortColumn = ImageInstance.hasProperty(sortColumn) ? sortColumn : "created"
        _sortColumn = AbstractImage.hasProperty(sortColumn) ? abstractImageAlias + "." + sortColumn : "created"
        String _search = (search != null && search != "") ? "%"+search+"%" : "%"

        return ImageInstance.createCriteria().list() {
            createAlias("baseImage", abstractImageAlias)
            eq("project", project)
            isNull("parent")
            isNull("deleted")
            fetchMode 'baseImage', FetchMode.JOIN
            not {'in'("id", listout)}
            ilike(abstractImageAlias + ".originalFilename", _search)
            order(_sortColumn, sortDirection)
        }

       // return ImageInstance.findAllByProjectAndIdNotInList(project, listout);
    }

    def listWithoutAnyGroup(Project project,String sortColumn, String sortDirection, String search ){
        def listImageOut = [];
        ImageGroup.findAllByProject(project).each { group ->
            ImageSequence.findAllByImageGroup(group).each{ imageSequence ->
                listImageOut << imageSequence.image.id
            }
        }

        if(listImageOut.size() == 0)
            return list(project, sortColumn, sortDirection, search, false);


        String abstractImageAlias = "ai"
        String _sortColumn = ImageInstance.hasProperty(sortColumn) ? sortColumn : "created"
        _sortColumn = AbstractImage.hasProperty(sortColumn) ? abstractImageAlias + "." + sortColumn : "created"
        String _search = (search != null && search != "") ? "%"+search+"%" : "%"

        return ImageInstance.createCriteria().list() {
            createAlias("baseImage", abstractImageAlias)
            eq("project", project)
            isNull("parent")
            isNull("deleted")
            fetchMode 'baseImage', FetchMode.JOIN
            not {'in'("id", listImageOut)}
            ilike(abstractImageAlias + ".originalFilename", _search)
            order(_sortColumn, sortDirection)
        }

    }
}
