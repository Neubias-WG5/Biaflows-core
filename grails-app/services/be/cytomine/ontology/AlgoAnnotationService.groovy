package be.cytomine.ontology

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

import be.cytomine.AnnotationDomain
import be.cytomine.Exception.WrongArgumentException
import be.cytomine.command.*
import be.cytomine.image.ImageInstance
import be.cytomine.processing.Job
import be.cytomine.project.Project
import be.cytomine.security.SecUser
import be.cytomine.security.UserJob
import be.cytomine.sql.AlgoAnnotationListing
import be.cytomine.sql.AnnotationListing
import be.cytomine.utils.JSONUtils
import be.cytomine.utils.ModelService
import be.cytomine.utils.Task
import com.vividsolutions.jts.geom.Geometry
import com.vividsolutions.jts.io.ParseException
import com.vividsolutions.jts.io.WKTReader
import com.vividsolutions.jts.io.WKTWriter
import grails.converters.JSON

import static org.springframework.security.acls.domain.BasePermission.READ

class AlgoAnnotationService extends ModelService {

    static transactional = true
    def propertyService

    def cytomineService
    def transactionService
    def algoAnnotationTermService
    def simplifyGeometryService
    def dataSource
    def reviewedAnnotationService
    def kmeansGeometryService
    def annotationListingService
    def securityACLService
    def sharedAnnotationService
    def imageInstanceService

    def currentDomain() {
        return AlgoAnnotation
    }

    AlgoAnnotation read(def id) {
        def annotation = AlgoAnnotation.read(id)
        if (annotation) {
            securityACLService.check(annotation.container(),READ)
        }
        annotation
    }

    def list(Project project,def propertiesToShow = null) {
        securityACLService.check(project,READ)
        AnnotationListing al = new AlgoAnnotationListing(columnToPrint: propertiesToShow,project : project.id)
        annotationListingService.executeRequest(al)
    }

    def list(Job job,def propertiesToShow = null) {
        securityACLService.check(job.container(),READ)
        List<UserJob> users = UserJob.findAllByJob(job);
        List algoAnnotations = []
        users.each { user ->
            AnnotationListing al = new AlgoAnnotationListing(columnToPrint: propertiesToShow,user : user.id)
            algoAnnotations.addAll(annotationListingService.executeRequest(al))
        }
        return algoAnnotations
    }

    def listIncluded(ImageInstance image, String geometry, SecUser user,  List<Long> terms, AnnotationDomain annotation = null,def propertiesToShow = null) {
        securityACLService.check(image.container(),READ)

        def annotations = []
        AnnotationListing al = new AlgoAnnotationListing(
                columnToPrint: propertiesToShow,
                image : image.id,
                user : user.id,
                suggestedTerms : terms,
                excludedAnnotation : annotation?.id,
                bbox: geometry
        )
        annotations.addAll(annotationListingService.executeRequest(al))
        return annotations
    }



    /**
     * Add the new domain with JSON data
     * @param json New domain data
     * @return Response structure (created domain data,..)
     */
    def add(def json) {
        if (json.isNull('location')) {
            throw new WrongArgumentException("Annotation must have a valid geometry:" + json.location)
        }
        if ((!json.project || json.isNull('project'))) {
            //fill project id thanks to image info
            ImageInstance image = ImageInstance.read(json.image)
            if (image) {
                json.project = image.project.id
            } else {
                throw new WrongArgumentException("Annotation must have a valid project:" + json.project)
            }
        }
        securityACLService.check(json.project, Project, READ)
        SecUser currentUser = cytomineService.getCurrentUser()

        def minPoint = json.minPoint
        def maxPoint = json.maxPoint

        Geometry annotationForm
        try {
            annotationForm = new WKTReader().read(json.location)
        } catch(ParseException e) {
            throw new WrongArgumentException("Annotation location not valid")
        }

        if(!annotationForm.isValid()){
            throw new WrongArgumentException("Annotation location not valid")
        }

        ImageInstance im = imageInstanceService.read(json.image)
        if (!im) {
            throw new WrongArgumentException("Annotation must have a valid image" + json.image)
        }
//        Geometry imageBounds = new WKTReader().read("POLYGON((0 0,0 $im.baseImage.height,$im.baseImage.width $im.baseImage.height,$im.baseImage.width 0,0 0))")

//        annotationForm = annotationForm.intersection(imageBounds)

        //simplify annotation
        try {
            def data = simplifyGeometryService.simplifyPolygon(annotationForm.toString(),minPoint,maxPoint)
            json.location = new WKTWriter().write(data.geometry)
            json.geometryCompression = data.rate
        } catch (Exception e) {
            log.error("Cannot simplify:" + e)
        }
        //Start transaction
        Transaction transaction = transactionService.start()

        //Add annotation user
        json.user = currentUser.id
        //Add Annotation
        log.debug this.toString()
        Command command = new AddCommand(user: currentUser, transaction: transaction)
        def result = executeCommand(command,null,json)

        def annotationID = result?.data?.annotation?.id
        log.info "algoAnnotation=" + annotationID + " json.term=" + json.term
        //Add annotation-term if term
        if (annotationID) {
            def term = JSONUtils.getJSONList(json.term);
            if (term) {
                term.each { idTerm ->
                    algoAnnotationTermService.addAlgoAnnotationTerm(annotationID, idTerm, currentUser.id, currentUser, transaction)
                }
            }

            def properties = JSONUtils.getJSONList(json.property) + JSONUtils.getJSONList(json.properties)
            if (properties) {
                properties.each {
                    def key = it.key as String
                    def value = it.value as String
                    propertyService.add(JSON.parse("""{"domainClassName": "be.cytomine.ontology.AlgoAnnotation", "domainIdent": "$annotationID", "key": "$key", "value": "$value" }"""), transaction)
                }
            }
        }

        return result
    }

    /**
     * Update this domain with new data from json
     * @param domain Domain to update
     * @param jsonNewData New domain datas
     * @return  Response structure (new domain data, old domain data..)
     */
    def update(AlgoAnnotation annotation, def jsonNewData) {
        SecUser currentUser = cytomineService.getCurrentUser()
        securityACLService.checkFullOrRestrictedForOwner(annotation,annotation.user)

        Geometry annotationForm
        try {
            annotationForm = new WKTReader().read(jsonNewData.location)
        } catch(ParseException e) {
            throw new WrongArgumentException("Annotation location not valid")
        }
        if(!annotationForm.isValid()){
            throw new WrongArgumentException("Annotation location not valid")
        }

        ImageInstance im = imageInstanceService.read(jsonNewData.image)
        if (!im) {
            throw new WrongArgumentException("Annotation must have a valid image" + json.image)
        }
        Geometry imageBounds = new WKTReader().read("POLYGON((0 0,0 $im.baseImage.height,$im.baseImage.width $im.baseImage.height,$im.baseImage.width 0,0 0))")

        annotationForm = annotationForm.intersection(imageBounds)

        //simplify annotation
        try {
            def data = simplifyGeometryService.simplifyPolygon(annotationForm.toString(),annotation?.geometryCompression)
            jsonNewData.location = new WKTWriter().write(data.geometry)
        } catch (Exception e) {
            log.error("Cannot simplify:" + e)
        }

        def result = executeCommand(new EditCommand(user: currentUser),annotation,jsonNewData)

        return result
    }

    /**
     * Delete this domain
     * @param domain Domain to delete
     * @param transaction Transaction link with this command
     * @param task Task for this command
     * @param printMessage Flag if client will print or not confirm message
     * @return Response structure (code, old domain,..)
     */
    def delete(AlgoAnnotation domain, Transaction transaction = null, Task task = null, boolean printMessage = true) {
        SecUser currentUser = cytomineService.getCurrentUser()
        securityACLService.checkIsCreator(domain,currentUser)
        Command c = new DeleteCommand(user: currentUser,transaction:transaction)
        return executeCommand(c,domain,null)
    }


    def getStringParamsI18n(def domain) {
        return [domain.user.toString(), domain.image?.baseImage?.filename]
    }

    def afterAdd(def domain, def response) {
        response.data['annotation'] = response.data.algoannotation
        response.data.remove('algoannotation')
    }

    def afterDelete(def domain, def response) {
        response.data['annotation'] = response.data.algoannotation
        response.data.remove('algoannotation')
    }

    def afterUpdate(def domain, def response) {
        response.data['annotation'] = response.data.algoannotation
        response.data.remove('algoannotation')
    }



    def deleteDependentAlgoAnnotationTerm(AlgoAnnotation ao, Transaction transaction, Task task = null) {
        AlgoAnnotationTerm.findAllByAnnotationIdent(ao.id).each {
            algoAnnotationTermService.delete(it,transaction,null,false)
        }
    }

    def deleteDependentReviewedAnnotation(AlgoAnnotation aa, Transaction transaction, Task task = null) {
        ReviewedAnnotation.findAllByParentIdent(aa.id).each {
            reviewedAnnotationService.delete(it,transaction,null,false)
        }
    }

    def deleteDependentProperty(AlgoAnnotation aa, Transaction transaction, Task task = null) {
        Property.findAllByDomainIdent(aa.id).each {
            propertyService.delete(it,transaction,null,false)
        }

    }
    def deleteDependentSharedAnnotation(AlgoAnnotation aa, Transaction transaction, Task task = null) {
        SharedAnnotation.findAllByAnnotationClassNameAndAnnotationIdent(aa.class.name, aa.id).each {
            sharedAnnotationService.delete(it,transaction,null,false)
        }

    }

}
