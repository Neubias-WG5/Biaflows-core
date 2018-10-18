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

import be.cytomine.CytomineDomain
import be.cytomine.Exception.AlreadyExistException
import be.cytomine.utils.JSONUtils
import org.restapidoc.annotation.RestApiObject
import org.restapidoc.annotation.RestApiObjectField

@RestApiObject(name = "Parameter constraint", description = "Representation of a constraint applicable to a software parameter")
class ParameterConstraint extends CytomineDomain {

    @RestApiObjectField(description = "The name of the parameter constraint")
    String name

    @RestApiObjectField(description = "The expression used to evaluate the parameter constraint")
    String expression

    @RestApiObjectField(description = "The data type associated with the parameter constraint (Number, Boolean, String, Date, ...)")
    String dataType

    static constraints = {
        name(nullable: false, blank: false, unique: false)
        expression(nullable: false, blank: false)
        dataType(nullable: false, blank: false)
    }

    @Override
    void checkAlreadyExist() {
        ParameterConstraint.withNewSession {
            if (name && dataType) {
                ParameterConstraint parameterConstraint = ParameterConstraint.findByNameAndDataType(name, dataType)
                if (parameterConstraint != null && parameterConstraint.id != id) {
                    throw new AlreadyExistException("The parameter constraint [${name} - ${dataType}] already exist !")
                }
            }
        }
    }

    /**
     * Insert JSON data into domain in param
     * @param domain Domain that must be filled
     * @param json JSON containing data
     * @return Domain with json data filled
     */
    static ParameterConstraint insertDataIntoDomain(def json, def domain = new ParameterConstraint()) {
        domain.id = JSONUtils.getJSONAttrLong(json, 'id', null)
        domain.name = JSONUtils.getJSONAttrStr(json, 'name')
        domain.expression = JSONUtils.getJSONAttrStr(json, 'expression')
        domain.dataType = JSONUtils.getJSONAttrStr(json, 'dataType')
        return domain
    }

    /**
     * Define fields available for JSON response
     * @param domain Domain source for json value
     * @return Map with fields (keys) and their values
     */
    static def getDataFromDomain(def domain) {
        def returnArray = CytomineDomain.getDataFromDomain(domain)
        returnArray['name'] = domain?.name
        returnArray['expression'] = domain?.expression
        returnArray['dataType'] = domain?.dataType
        return returnArray
    }
}
