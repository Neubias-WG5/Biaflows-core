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

import be.cytomine.api.UrlApi
import be.cytomine.command.AddCommand
import be.cytomine.command.Command
import be.cytomine.command.DeleteCommand
import be.cytomine.command.EditCommand
import be.cytomine.command.Transaction
import be.cytomine.image.server.ImageServer
import be.cytomine.security.SecUser
import be.cytomine.security.User
import be.cytomine.security.UserJob
import be.cytomine.utils.ModelService
import be.cytomine.utils.Task
import grails.converters.JSON
import groovy.sql.Sql

class UploadedFileService extends ModelService {

    static transactional = true
    def cytomineService
    def securityACLService
    def dataSource


    def currentDomain() {
        return UploadedFile
    }

    def list() {
        securityACLService.checkAdmin(cytomineService.currentUser)
        def uploadedFiles = UploadedFile.createCriteria().list(sort : "created", order : "desc") {
            isNull("deleted")
        }
        return uploadedFiles
    }

    def list(User user) {
        securityACLService.checkIsSameUser(user, cytomineService.currentUser)
        def uploadedFiles = UploadedFile.createCriteria().list(sort : "created", order : "desc") {
            eq("user.id", user.id)
            isNull("deleted")
        }
        return uploadedFiles
    }

    def list(User user, Long parentId, Boolean onlyRoot) {

        securityACLService.checkIsSameUser(user, cytomineService.currentUser)
        def uploadedFiles = UploadedFile.createCriteria().list(sort : "created", order : "desc") {
            eq("user.id", user.id)
            if(onlyRoot) {
                isNull("parent.id")
            } else if(parentId != null){
                eq("parent.id", parentId)
            }
            isNull("deleted")
        }
        return uploadedFiles
    }

    def listHierarchicalTree(User user, Long rootId){
        UploadedFile root = UploadedFile.get(rootId)

        securityACLService.checkIsSameUser(root.user, cytomineService.currentUser)
        String request =
                "SELECT uf.id, uf.created, uf.original_filename, uf.l_tree, uf.parent_id, uf.size, uf.status, uf.image_id \n" +
                        "FROM uploaded_file uf\n" +
                        "WHERE uf.l_tree <@ '"+root.lTree+"'::text::ltree \n" +
                        "AND uf.user_id = "+user.id+" \n" +
                        "ORDER BY uf.l_tree ASC "

        def data = []
        def sql = new Sql(dataSource)
        sql.eachRow(request) {
            def row = [:]
            int i = 0
            row.id = it[i++]
            row.created = it[i++]
            row.originalFilename = it[i++]
            row.lTree = it[i++].value
            row.parentId = it[i++]
            row.size = it[i++]
            row.status = it[i++]

            Long imageId = it[i++]
            row.image = imageId
            row.thumbURL =  ((row.status == UploadedFile.DEPLOYED || row.status == UploadedFile.CONVERTED) && imageId) ? UrlApi.getAssociatedImage(imageId, "macro") : null
            data << row
        }
        sql.close()

        return data
    }

    UploadedFile get(def id) {
        UploadedFile.get(id)
    }


    /**
     * Add the new domain with JSON data
     * @param json New domain data
     * @return Response structure (created domain data,..)
     */
    def add(def json) {
        SecUser currentUser = cytomineService.getCurrentUser()
        if(currentUser instanceof UserJob) currentUser = ((UserJob)currentUser).user
        securityACLService.checkUser(currentUser)
        return executeCommand(new AddCommand(user: currentUser),null,json)
    }

    /**
     * Update this domain with new data from json
     * @param domain Domain to update
     * @param jsonNewData New domain datas
     * @return  Response structure (new domain data, old domain data..)
     */
    def update(UploadedFile uploadedFile, def jsonNewData, Transaction transaction = null) {
        SecUser currentUser = cytomineService.getCurrentUser()
        securityACLService.checkUser(currentUser)
        securityACLService.checkIsSameUser(uploadedFile.user, currentUser)
        return executeCommand(new EditCommand(user: currentUser, transaction : transaction), uploadedFile,jsonNewData)
    }

    /**
     * Delete this domain
     * @param domain Domain to delete
     * @param transaction Transaction link with this command
     * @param task Task for this command
     * @param printMessage Flag if client will print or not confirm message
     * @return Response structure (code, old domain,..)
     */
    def delete(UploadedFile domain, Transaction transaction = null, Task task = null, boolean printMessage = true) {
        SecUser currentUser = cytomineService.getCurrentUser()
        securityACLService.checkIsSameUser(domain.user, currentUser)
        Command c = new DeleteCommand(user: currentUser,transaction:transaction)
        return executeCommand(c,domain,null)
    }

    def getStringParamsI18n(def domain) {
        return [domain.id, domain.filename]
    }


    def downloadURI(UploadedFile uploadedFile) {
        securityACLService.checkIsSameUser(uploadedFile.user, cytomineService.currentUser)

        String fif = uploadedFile.absolutePath

        if (fif) {
            String downloadURL = ImageServer.list().get(0).url
            downloadURL += "/image/download?fif=$fif"
            if(uploadedFile.image) downloadURL += "&mimeType=${uploadedFile.image.mimeType}"
            return downloadURL
        } else {
            return null
        }

    }

    def abstractImageService

    def deleteDependentAbstractImage(UploadedFile uploadedFile, Transaction transaction,Task task=null) {
        if(uploadedFile.image) abstractImageService.delete(uploadedFile.image,transaction,null,false)
    }

    def deleteDependentUploadedFile(UploadedFile uploadedFile, Transaction transaction,Task task=null) {

        taskService.updateTask(task,task? "Delete ${UploadedFile.countByParent(uploadedFile)} uploadedFile parents":"")

        UploadedFile.findAllByParent(uploadedFile).each {
            it.parent = uploadedFile.parent
            this.update(it,JSON.parse(it.encodeAsJSON()), transaction)
        }
    }
}
