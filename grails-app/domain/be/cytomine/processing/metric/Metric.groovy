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

import be.cytomine.CytomineDomain
import be.cytomine.Exception.AlreadyExistException
import be.cytomine.project.Discipline
import be.cytomine.utils.JSONUtils
import org.restapidoc.annotation.RestApiObject
import org.restapidoc.annotation.RestApiObjectField
import org.restapidoc.annotation.RestApiObjectFields

/**
 * A metric is a thematic for a project
 */
@RestApiObject(name = "Metric", description = "A metric is a way to quantify the result of a job")
class Metric extends CytomineDomain implements Serializable{

    @RestApiObjectField(description = "The name of the metric")
    String name

    @RestApiObjectField(description = "The short name of the metric")
    String shortName

    @RestApiObjectFields(params=[
            @RestApiObjectField(apiFieldName = "disciplines", description = "Disciplines related to this metric",allowedType = "list",useForCreation = true, mandatory = false),
    ])
    static hasMany = [disciplines: Discipline]

    static constraints = {
        name(blank: false, unique: true)
        shortName(nullable: true)
    }
    
    static mapping = {
        id(generator: 'assigned', unique: true)
        sort "id"
        cache true
    }

    

    /**
     * Check if this domain will cause unique constraint fail if saving on database
     */
    void checkAlreadyExist() {
        Metric.withNewSession {
            if(name) {
                Metric metricAlreadyExist = Metric.findByName(name)
                if(metricAlreadyExist && (metricAlreadyExist.id!=id))  {
                    throw new AlreadyExistException("Metric "+name + " already exist!")
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
    static Metric insertDataIntoDomain(def json, def domain = new Metric()) {
        domain.id = JSONUtils.getJSONAttrLong(json,'id',null)
        domain.name = JSONUtils.getJSONAttrStr(json, 'name')
        domain.shortName = JSONUtils.getJSONAttrStr(json, 'shortName')
        json.disciplines?.each { it ->
            def discipline = Discipline.read(it)
            if (discipline) domain.addToDisciplines(discipline)
        }
        return domain;
    }

    /**
     * Define fields available for JSON response
     * @param domain Domain source for json value
     * @return Map with fields (keys) and their values
     */
    static def getDataFromDomain(def domain) {
        def returnArray = CytomineDomain.getDataFromDomain(domain)
        returnArray['name'] = domain?.name
        returnArray['shortName'] = domain?.shortName
        returnArray['disciplines'] = domain?.disciplines?.collect{ it.id }
        return returnArray
    }

}
