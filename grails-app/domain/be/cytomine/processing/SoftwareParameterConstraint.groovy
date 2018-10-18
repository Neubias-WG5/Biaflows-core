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

@RestApiObject(name = "Software parameter constraint", description = "The association between a software parameter and a parameter constraint")
class SoftwareParameterConstraint extends CytomineDomain {

    @RestApiObjectField(description = "The value af a given constraint")
    String value

    static belongsTo = [parameterConstraint: ParameterConstraint, softwareParameter: SoftwareParameter]

    static constraints = {
        value(nullable: true)
    }

    @Override
    void checkAlreadyExist() {
        SoftwareParameterConstraint.withNewSession {
            SoftwareParameterConstraint softwareParameterConstraint = SoftwareParameterConstraint.findByParameterConstraintAndSoftwareParameter(parameterConstraint, softwareParameter)
            if (softwareParameterConstraint != null && softwareParameterConstraint.id != id) {
                throw new AlreadyExistException("Constraint ${parameterConstraint?.name} already exist for software parameter ${softwareParameter?.name}")
            }
        }
    }

    /**
     * Insert JSON data into domain in param
     * @param domain Domain that must be filled
     * @param json JSON containing data
     * @return Domain with json data filled
     */
    static SoftwareParameterConstraint insertDataIntoDomain(def json, def domain = new SoftwareParameterConstraint()) {
        domain.id = JSONUtils.getJSONAttrLong(json, 'id', null)
        domain.value = JSONUtils.getJSONAttrStr(json, 'value')
        domain.parameterConstraint = JSONUtils.getJSONAttrDomain(json, 'parameterConstraint', new ParameterConstraint(), true)
        domain.softwareParameter = JSONUtils.getJSONAttrDomain(json, 'softwareParameter', new SoftwareParameter(), true)
        return domain
    }

    /**
     * Define fields available for JSON response
     * @param domain Domain source for json value
     * @return Map with fields (keys) and their values
     */
    static def getDataFromDomain(def domain) {
        def returnArray = CytomineDomain.getDataFromDomain(domain)
        returnArray['value'] = domain?.value
        returnArray['parameterConstraint'] = domain?.parameterConstraint?.id
        returnArray['softwareParameter'] = domain?.softwareParameter?.id
        return returnArray
    }

}
