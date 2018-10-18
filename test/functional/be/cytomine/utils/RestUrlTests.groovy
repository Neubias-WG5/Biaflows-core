package be.cytomine.utils

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

import be.cytomine.image.*
import be.cytomine.image.server.*
import be.cytomine.laboratory.*
import be.cytomine.ontology.*
import be.cytomine.processing.*
import be.cytomine.project.*
import be.cytomine.search.*
import be.cytomine.security.*
import be.cytomine.test.Infos
import be.cytomine.test.http.DomainAPI
import grails.converters.JSON
import org.codehaus.groovy.grails.web.json.JSONArray

/*
* Will test the Resource Naming Convention for Restful app
* */
class RestUrlTests {

    def classes = [
            [clazz:Storage, filters : []],
            [clazz:AbstractImage, filters : []],
            [clazz:UploadedFile, filters : []],
            [clazz:Sample, filters : []],
            [clazz:AlgoAnnotation, filters : []],
            [clazz:Ontology, filters : []],
            [clazz:Relation, filters : []],
            [clazz:ReviewedAnnotation, filters : []],
            [clazz:Term, filters : []],
            [clazz:UserAnnotation, filters : []],
            [clazz:ImageFilter, filters : []],
            [clazz:ImageFilterProject, filters : []],
            [clazz:Job, filters : []],
            [clazz:JobData, filters : []],
            [clazz:JobParameter, filters : []],
            [clazz:Software, filters : []],
            [clazz:SoftwareParameter, filters : []],
            [clazz:SoftwareProject, filters : []],
            [clazz:Discipline, filters : []],
            [clazz:Project, filters : []],
            [clazz:SearchEngineFilter, filters : []],
            [clazz:Group, filters : []],
            [clazz:User, filters : []],
            [clazz:AttachedFile, filters : []],
            [clazz:Configuration, filters: []],
            [clazz:Description, filters : []],
            [clazz:News, filters : []]
    ]

    public void testUrl() {
        classes.each {
            String URL = Infos.CYTOMINEURL + "api/"+it.clazz.simpleName.toLowerCase()+".json"
            println "URL is $URL"
            def result = DomainAPI.doGET(URL, Infos.SUPERADMINLOGIN, Infos.SUPERADMINPASSWORD)
            assert 200 == result.code
            def json = JSON.parse(result.data)
            assert json.collection instanceof JSONArray
        }

    }

}
