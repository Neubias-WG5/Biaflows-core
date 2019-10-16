package be.cytomine.utils

/*
* Copyright (c) 2009-2019. Authors: see NOTICE file.
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

import be.cytomine.CytomineDomain
import be.cytomine.Exception.CytomineException
import be.cytomine.Exception.InvalidRequestException
import be.cytomine.Exception.ObjectNotFoundException
import be.cytomine.Exception.ServerException
import be.cytomine.Exception.WrongArgumentException
import be.cytomine.command.Command
import be.cytomine.command.DeleteCommand
import be.cytomine.ontology.AlgoAnnotation
import be.cytomine.ontology.UserAnnotation
import grails.util.GrailsNameUtils
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

import java.sql.ResultSet
import java.sql.ResultSetMetaData

import static org.springframework.security.acls.domain.BasePermission.READ

abstract class ModelService {

    static transactional = true

    def responseService
    def commandService
    def cytomineService
    def grailsApplication
    def taskService
    //def securityACLService
    boolean saveOnUndoRedoStack = true

    /**
     * Save a domain on database, throw error if cannot save
     */
    def saveDomain(def newObject) {
        newObject.checkAlreadyExist()

        if (!newObject.validate()) {
            log.error newObject.errors
            log.error newObject.retrieveErrors().toString()
            throw new WrongArgumentException(newObject.retrieveErrors().toString())
        }
        if (!newObject.save(flush: true, failOnError: true)) {
            log.error "error"
            throw new InvalidRequestException(newObject.retrieveErrors().toString())
        }
    }

    def saveAndReturnDomain(def newObject) {
        newObject.checkAlreadyExist()
        if (!newObject.validate()) {
            log.error newObject.errors
            log.error newObject.retrieveErrors().toString()
            throw new WrongArgumentException(newObject.retrieveErrors().toString())
        }
        if (!newObject.save(flush: true, failOnError: true)) {
            log.error "error"
            throw new InvalidRequestException(newObject.retrieveErrors().toString())
        }
        newObject
    }

    def checkDeleted(CytomineDomain domain) {
        if(domain.checkDeleted()) {
            throw new ObjectNotFoundException("The domain " + domain + " has been deleted on ${domain.deleted}!")
        }
    }

    /**
     * Delete a domain from database
     */
    def removeDomain(def oldObject) {
        try {
            oldObject.refresh()
            oldObject.delete(flush: true, failOnError: true)
        } catch (Exception e) {
            log.error e.toString()
            throw new InvalidRequestException(e.toString())
        }
    }

    /**
     * Add command info for the new domain concerned by the command
     * @param newObject New domain
     * @param message Message build for the command
     */
     def fillDomainWithData(def object, def json) {
        def domain = object.get(json.id)
        domain = object.insertDataIntoDomain(json,domain)
        domain.id = json.id
        return domain
    }

    /**
     * Get the name of the service (project,...)
     */
    public String getServiceName() {
        return GrailsNameUtils.getPropertyName(GrailsNameUtils.getShortName(this.getClass()))
    }

     def executeCommand(Command c, CytomineDomain domain, def json, Task task = null) {
        //bug, cannot do new XXXCommand(domain:domain, json:...) => new XXXCommand(); c.domain = domain; c.json = ...
        c.domain = domain
        c.json = json
        executeCommand(c,task)
    }

    /**
     * Execute command with JSON data
     */
     def executeCommand(Command c, Task task = null) {
        log.info "Command ${c.class} with flag ${c.delete}"
        if(c instanceof DeleteCommand || c.delete) {
            def domainToDelete = c.domain
            //Create a backup (for 'undo' op)
            //We create before for deleteCommand to keep data from HasMany inside json (data will be deleted later)
            if(c instanceof DeleteCommand) {
                def backup = domainToDelete.encodeAsJSON()
                c.backup = backup
            }
            //remove all dependent domains
            def allServiceMethods = this.metaClass.methods*.name
            int numberOfDirectDependence = 0
            def dependencyMethodName = []
            allServiceMethods.each {
                if(it.startsWith("deleteDependent")) {
                    numberOfDirectDependence++
                    dependencyMethodName << "$it"
                }
            }
            dependencyMethodName.unique().eachWithIndex { method, index ->
                taskService.updateTask(task, (int)((double)index/(double)numberOfDirectDependence)*100, "")
                this."$method"(domainToDelete,c.transaction,task)
            }
            task

        }
        initCommandService()
        c.saveOnUndoRedoStack = this.isSaveOnUndoRedoStack() //need to use getter method, to get child value
        c.service = this
        c.serviceName = getServiceName()
        return commandService.processCommand(c)
    }


    private void initCommandService() {
        if (!commandService) {
            commandService =grailsApplication.getMainContext().getBean("commandService")
        }

    }

//     def retrieve(def json) {
//        throw new NotYetImplementedException("The retrieve method must be implement in service "+ this.class)
//    }
    /**
     * Retrieve domain thanks to a JSON object
     * @param map MAP with new domain info
     * @return domain retrieve thanks to json
     */
    def retrieve(Map json) {

        CytomineDomain domain = null
        if(json.id && !json.id.toString().equals("null")) {
            domain = currentDomain().get(json.id)
        }

        if (!domain) {
            throw new ObjectNotFoundException("${currentDomain().class} " + json.id + " not found")
        }
        def container = domain.container()
        if (container) {
            //we only check security if container is defined
            securityACLService.check(container,READ)
        }
        return domain
    }



    /**
     * Create domain from JSON object
     * @param json JSON with new domain info
     * @return new domain
     */
    CytomineDomain createFromJSON(def json) {
        return currentDomain().insertDataIntoDomain(json)
    }




    /**
     * Create new domain in database
     * @param json JSON data for the new domain
     * @param printMessage Flag to specify if confirmation message must be show in client
     * Usefull when we create a lot of data, just print the root command message
     * @return Response structure (status, object data,...)
     */
    def create(Map json, boolean printMessage) {
        create(currentDomain().insertDataIntoDomain(json), printMessage)
    }

    /**
     * Create new domain in database
     * @param domain Domain to store
     * @param printMessage Flag to specify if confirmation message must be show in client
     * @return Response structure (status, object data,...)
     */
    def create(CytomineDomain domain, boolean printMessage) {
        //Save new object
        beforeAdd(domain)
        saveDomain(domain)

        def response = responseService.createResponseMessage(domain, getStringParamsI18n(domain), printMessage, "Add", domain.getCallBack())
        afterAdd(domain,response)
        //Build response message
        return response
    }


    /**
     * Edit domain from database
     * @param json domain data in json
     * @param printMessage Flag to specify if confirmation message must be show in client
     * @return Response structure (status, object data,...)
     */
    def edit(Map json, boolean printMessage) {
        //Rebuilt previous state of object that was previoulsy edited
        edit(fillDomainWithData(currentDomain().newInstance(), json), printMessage)
    }

    /**
     * Edit domain from database
     * @param domain Domain to update
     * @param printMessage Flag to specify if confirmation message must be show in client
     * @return Response structure (status, object data,...)
     */
    def edit(CytomineDomain domain, boolean printMessage) {
        //Build response message
        log.info "edit"

        log.info "beforeUpdate"
        beforeUpdate(domain)
        log.info "saveDomain"
        saveDomain(domain)
        log.info "afterUpdate"
        def response = responseService.createResponseMessage(domain, getStringParamsI18n(domain), printMessage, "Edit", domain.getCallBack())
        afterUpdate(domain,response)
        log.info "response"
        return response
    }


    @Transactional(propagation=Propagation.REQUIRES_NEW)
    def addOne(def json){
        return add(json)
    }

    def addMultiple(def json) {
        def result = []
        def errors = []
        for(int i=0;i<json.size();i++){
            def resp = [:]
            try{
                resp = addOne(json[i])

                String objectName;
                if(currentDomain() == AlgoAnnotation || currentDomain() == UserAnnotation){
                    objectName = "annotation"
                } else {
                    objectName = currentDomain().toString().toLowerCase().split("\\.").last()
                }
                resp = [domain:resp.data.get(objectName).id, status : resp.status]
            } catch(WrongArgumentException | CytomineException e){
                log.info e.printStackTrace()
                errors << [data:json[i], message : e.msg]
                resp = [message : e.msg, status : e.code]
            } catch(Exception e) {
                log.info e
                log.info e.printStackTrace()
                resp = [message : e.toString(), status : 500]
            }

            result << resp
            //sometimes, call clean cache (improve very well perf for big set)
            if (i % 100 == 0) cleanUpGorm()
        }

        def response = [:]

        def succeeded = result.findAll{it?.status >= 200 && it?.status < 300}

        if(succeeded == result) {
            response.data = [message: currentDomain().toString().toLowerCase().split("\\.").last()+"s "+succeeded.collect{it.domain}.join(",")+" added"]
            response.status = 200
        } else if(succeeded.size() == 0) {
            response.data = [success: false, message: "No entry saved", errors: errors]
            response.status = 400
        } else {
            response.data = [success: false, message: "Only part of the entries ("+currentDomain().toString().toLowerCase().split("\\.").last()+"s "+succeeded.collect{it.domain}.join(",")+") added.", errors: errors]
            response.status = 206
        }

        cleanUpGorm()
        response
    }


    def sessionFactory
    def propertyInstanceMap = org.codehaus.groovy.grails.plugins.DomainClassGrailsPlugin.PROPERTY_INSTANCE_MAP
    /**
     * Clean GORM cache
     */
     void cleanUpGorm() {
        propertyInstanceMap.get().clear()
        def session = sessionFactory.currentSession
        session.flush()
        session.clear()
    }


    /**
     * Destroy domain from database
     * @param json JSON with domain data (to retrieve it)
     * @param printMessage Flag to specify if confirmation message must be show in client
     * @return Response structure (status, object data,...)
     */
    def destroy(Map json, boolean printMessage) {
        //Get object to delete
        destroy(currentDomain().get(json.id), printMessage)
    }

    /**
     * Destroy domain from database
     * @param domain Domain to remove
     * @param printMessage Flag to specify if confirmation message must be show in client
     * @return Response structure (status, object data,...)
     */
    def destroy(CytomineDomain domain, boolean printMessage) {
        //Build response message
        def response = responseService.createResponseMessage(domain, getStringParamsI18n(domain), printMessage, "Delete", domain.getCallBack())
        beforeDelete(domain)
        //Delete object
        removeDomain(domain)
        afterDelete(domain,response)
        return response
    }


     def beforeAdd(def domain) {

    }

     def beforeDelete(def domain) {

    }

     def beforeUpdate(def domain) {

    }

     def afterAdd(def domain, def response) {

    }

     def afterDelete(def domain, def response) {

    }

     def afterUpdate(def domain, def response) {

    }


    def currentDomain() {
        throw new ServerException("currentDomain must be implemented!")
    }


    def aclUtilService


    def getStringParamsI18n(def domain) {
        throw new ServerException("getStringParamsI18n must be implemented for $this!")
    }


     boolean columnExist(ResultSet rs, String column) {
        ResultSetMetaData rsMetaData = rs.getMetaData();
        int numberOfColumns = rsMetaData.getColumnCount();

        // get the column names; column indexes start from 1
        for (int i = 1; i < numberOfColumns + 1; i++) {
            String columnName = rsMetaData.getColumnName(i);
            // Get the name of the column's table name
            if (column.toLowerCase().equals(columnName.toLowerCase())) {
                return true
            }
        }
        return false
    }

}
