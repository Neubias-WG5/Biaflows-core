package be.cytomine.processing.metric

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

import be.cytomine.Exception.WrongArgumentException
import be.cytomine.command.*
import be.cytomine.project.Discipline
import be.cytomine.security.SecUser
import be.cytomine.utils.ModelService
import be.cytomine.utils.Task

class MetricService extends ModelService {

    static transactional = true
    def cytomineService
    def commandService
    def modelService
    def transactionService
    def securityACLService

    def currentDomain() {
        Metric
    }

    def list() {
        securityACLService.checkGuest(cytomineService.currentUser)
        Metric.list()
    }

    def read(def id) {
        securityACLService.checkGuest(cytomineService.currentUser)
        Metric.read(id)
    }

    def get(def id) {
        securityACLService.checkGuest(cytomineService.currentUser)
        Metric.get(id)
    }

    def listByDiscipline(Discipline discipline) {
        securityACLService.checkGuest(cytomineService.currentUser)
        Metric.findAllByDiscipline(discipline)
    }

    /**
     * Add the new domain with JSON data
     * @param json New domain data
     * @return Response structure (created domain data,..)
     */
    def add(def json) {
        SecUser currentUser = cytomineService.getCurrentUser()
        securityACLService.checkAdmin(currentUser)
        json.disciplines?.each { disciplineId ->
            def discipline = Discipline.read(disciplineId)
            if (!discipline)
                throw new WrongArgumentException("Metric must have a valid set of disciplines: ${json.disciplines}")
        }
        return executeCommand(new AddCommand(user: currentUser),null,json)
    }

    /**
     * Update this domain with new data from json
     * @param domain Domain to update
     * @param jsonNewData New domain datas
     * @return  Response structure (new domain data, old domain data..)
     */
    def update(Metric metric, def jsonNewData) {
        SecUser currentUser = cytomineService.getCurrentUser()
        securityACLService.checkAdmin(currentUser)
        jsonNewData.disciplines?.each { disciplineId ->
            def discipline = Discipline.read(disciplineId)
            if (!discipline)
                throw new WrongArgumentException("Metric must have a valid set of disciplines: ${json.disciplines}")
        }
        return executeCommand(new EditCommand(user: currentUser),metric, jsonNewData)
    }

    /**
     * Delete this domain
     * @param domain Domain to delete
     * @param transaction Transaction link with this command
     * @param task Task for this command
     * @param printMessage Flag if client will print or not confirm message
     * @return Response structure (code, old domain,..)
     */
    def delete(Metric domain, Transaction transaction = null, Task task = null, boolean printMessage = true) {
        SecUser currentUser = cytomineService.getCurrentUser()
        securityACLService.checkAdmin(currentUser)
        Command c = new DeleteCommand(user: currentUser,transaction:transaction)
        return executeCommand(c,domain,null)
    }

    def getStringParamsI18n(def domain) {
        return [domain.id, domain.name]
    }
}
