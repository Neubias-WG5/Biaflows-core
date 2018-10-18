package be.cytomine.processing

/*
 * Copyright (c) 2009-2018. Authors: see NOTICE file.
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
import be.cytomine.Exception.SoftwareParameterConstraintException
import be.cytomine.command.AddCommand
import be.cytomine.command.DeleteCommand
import be.cytomine.command.EditCommand
import be.cytomine.command.Transaction
import be.cytomine.security.SecUser
import be.cytomine.utils.ModelService
import be.cytomine.utils.Task

class SoftwareParameterConstraintService extends ModelService {

    static final separator = "ð"

    static transactional = true

    def transactionService
    def securityACLService
    def amqpQueueService

    @Override
    def currentDomain() {
        return SoftwareParameterConstraint
    }

    def list(SoftwareParameter softwareParameter) {
        securityACLService.checkUser(cytomineService.getCurrentUser())
        return SoftwareParameterConstraint.findAllBySoftwareParameter(softwareParameter)
    }

    SoftwareParameterConstraint get(def id) {
        securityACLService.checkUser(cytomineService.getCurrentUser()) //TODO: security
        return SoftwareParameterConstraint.get(id)
    }

    SoftwareParameterConstraint read(def id) {
        securityACLService.checkUser(cytomineService.getCurrentUser()) //TODO: security
        return SoftwareParameterConstraint.read(id)
    }

    def add(def json) throws CytomineException {
        SecUser currentUser = cytomineService.getCurrentUser() //TODO: security
        securityACLService.checkAdmin(currentUser)
        return executeCommand(new AddCommand(user: currentUser), null, json)
    }

    def update(SoftwareParameterConstraint domain, def jsonNewData) {
        SecUser currentUser = cytomineService.getCurrentUser() //TODO: security
        securityACLService.checkAdmin(currentUser)
        return executeCommand(new EditCommand(user: currentUser), domain, jsonNewData)
    }

    def delete(SoftwareParameterConstraint domain, Transaction transaction = null, Task task = null, boolean printMessage = true) {
        SecUser currentUser = cytomineService.getCurrentUser() //TODO: security
        securityACLService.checkAdmin(currentUser)
        return executeCommand(new DeleteCommand(user: currentUser, transaction: transaction), domain, null)
    }

    @Override
    def getStringParamsI18n(def domain) {
        return [domain.softwareParameter, domain.parameterConstraint]
    }

    @Override
    def beforeAdd(def domain) {
        SoftwareParameterConstraint softwareParameterConstraint = domain as SoftwareParameterConstraint

        String parameterType = softwareParameterConstraint.softwareParameter.type
        String constraintType = softwareParameterConstraint.parameterConstraint.dataType

        if (parameterType.trim().toLowerCase() != constraintType.trim().toLowerCase()) {
            throw new SoftwareParameterConstraintException("Incompatible data types !")
        }
    }

    def evaluate(SoftwareParameterConstraint domain, def parameterValue) {
        ParameterConstraint currentParameterConstraint = domain.parameterConstraint
        SoftwareParameter currentSoftwareParameter = domain.softwareParameter

        def expression = currentParameterConstraint.expression
        expression = expression
                .replaceAll("\\[value]", domain.value)
                .replaceAll("\\[separator]", separator)
                .replaceAll("\\[parameterValue]", parameterValue as String)

        log.info("Expression ${expression}")

        return Eval.me(expression)
    }

}
