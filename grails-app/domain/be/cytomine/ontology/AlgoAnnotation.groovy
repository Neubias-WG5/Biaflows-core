package be.cytomine.ontology

import be.cytomine.AnnotationDomain
import be.cytomine.Exception.WrongArgumentException
import be.cytomine.api.UrlApi
import be.cytomine.image.ImageInstance
import be.cytomine.project.Project
import be.cytomine.security.SecUser
import be.cytomine.security.UserJob
import be.cytomine.utils.JSONUtils
import com.vividsolutions.jts.io.WKTReader
import grails.converters.JSON
import jsondoc.annotation.ApiObjectFieldsLight
import org.apache.log4j.Logger
import jsondoc.annotation.ApiObjectFieldLight
import org.apache.log4j.Logger
import org.jsondoc.core.annotation.ApiObject

/**
 * Annotation added by a job (software)
 * Extend AnnotationDomain that provide generic Annotation properties (location,...)
 */
@ApiObject(name = "algo annotation")
class AlgoAnnotation extends AnnotationDomain implements Serializable {

    /**
     * Virtual user that create annotation
     */
    @ApiObjectFieldLight(description = "The user job that add this annotation")
    UserJob user

    /**
     * Number of reviewed annotation
     * Rem: With UI client, it can only be 0 or 1
     */
    @ApiObjectFieldLight(description = "The number of reviewed annotations for this annotation")
    Integer countReviewedAnnotations = 0

    @ApiObjectFieldsLight(params=[
        @ApiObjectFieldLight(apiFieldName = "cropURL", description = "URL to get the annotation crop",allowedType = "string",useForCreation = false),
        @ApiObjectFieldLight(apiFieldName = "smallCropURL", description = "URL to get a small annotation crop (<256px)",allowedType = "string",useForCreation = false),
        @ApiObjectFieldLight(apiFieldName = "url", description = "URL to go to the annotation on the image",allowedType = "string",useForCreation = false),
        @ApiObjectFieldLight(apiFieldName = "imageURL", description = "URL to go to the image",allowedType = "string",useForCreation = false),
        @ApiObjectFieldLight(apiFieldName = "reviewed", description = "True if annotation has at least one review",allowedType = "boolean",useForCreation = false),
    ])
    static constraints = {
    }

    static mapping = {
        id generator: "assigned"
        columns {
            location type: org.hibernatespatial.GeometryUserType
        }
        wktLocation(type: 'text')
        sort "id"
    }

    def beforeInsert() {
        super.beforeInsert()
    }

    def beforeUpdate() {
        super.beforeUpdate()
    }

    /**
     * Get all terms map with the annotation
     * @return list of terms
     */
    def terms() {
        def criteria = AlgoAnnotationTerm.withCriteria() {
            eq('annotationIdent', id)
            projections {
                groupProperty("term")
            }
        }
        return criteria
    }

    /**
     * Get all terms id map with annotation
     * TODO: could be optim with single SQL request
     * @return list of terms id
     */
    def termsId() {
        terms().collect {it.id}
    }

    def getCropUrl() {
        UrlApi.getAlgoAnnotationCropWithAnnotationId(id)
    }

    /**
     * Check if annotation is an algo annotation
     */
    boolean isAlgoAnnotation() {
        return true
    }

    /**
     * Check if annotation is a reviewed annotation
     * Rem: Even if this annotation is review, this is still algo annotation
     */
    boolean isReviewedAnnotation() {
        return false
    }

    /**
     * Get all terms to map with annotation if automatic review.
     * For AlgoAnnotation, we take AlgoAnnotationTerm created by this user
     * @return Term List
     */
    List<Term> termsForReview() {
        AlgoAnnotationTerm.findAllByAnnotationIdentAndUserJob(id, user).collect {it.term}.unique()
    }

    /**
     * Check if annotation has been reviewed
     * @return True if annotation has at least 1 reviewed annotation, otherwise false
     */
    boolean hasReviewedAnnotation() {
        return countReviewedAnnotations > 0
    }

    /**
     * Insert JSON data into domain in param
     * @param domain Domain that must be filled
     * @param json JSON containing data
     * @return Domain with json data filled
     */
    static AlgoAnnotation insertDataIntoDomain(def json, def domain = new AlgoAnnotation()) {
        try {
            domain.id = JSONUtils.getJSONAttrLong(json,'id',null)
            domain.geometryCompression = JSONUtils.getJSONAttrDouble(json, 'geometryCompression', 0)
            domain.created = JSONUtils.getJSONAttrDate(json, 'created')
            domain.updated = JSONUtils.getJSONAttrDate(json, 'updated')
            domain.location = new WKTReader().read(json.location)
            domain.image = JSONUtils.getJSONAttrDomain(json, "image", new ImageInstance(), true)
            domain.project = JSONUtils.getJSONAttrDomain(json, "project", new Project(), true)
            domain.user = JSONUtils.getJSONAttrDomain(json, "user", new UserJob(), true)

            if (!domain.location) {
                throw new WrongArgumentException("Geo is null: 0 points")
            }
            if (domain.location.getNumPoints() < 1) {
                throw new WrongArgumentException("Geometry is empty:" + domain.location.getNumPoints() + " points")
            }

        } catch (com.vividsolutions.jts.io.ParseException ex) {
            throw new WrongArgumentException(ex.toString())
        }
        return domain;
    }

    /**
     * Define fields available for JSON response
     * This Method is called during application start
     */
    static void registerMarshaller() {
        Logger.getLogger(this).info("Register custom JSON renderer for " + this.class)
        JSON.registerObjectMarshaller(AlgoAnnotation) { domain ->
            return getDataFromDomain(domain)
        }
    }

    /**
     * Define fields available for JSON response
     * @param domain Domain source for json value
     * @return Map with fields (keys) and their values
     */
    static def getDataFromDomain(def domain) {
        def returnArray = AnnotationDomain.getDataFromDomain(domain)
        ImageInstance imageinstance = domain?.image
        returnArray['cropURL'] = UrlApi.getAlgoAnnotationCropWithAnnotationId(domain?.id)
        returnArray['smallCropURL'] = UrlApi.getAlgoAnnotationCropWithAnnotationIdWithMaxWithOrHeight(domain?.id, 256)
        returnArray['url'] = UrlApi.getAlgoAnnotationCropWithAnnotationId(domain?.id)
        returnArray['imageURL'] = UrlApi.getAnnotationURL(imageinstance?.project?.id, imageinstance?.id, domain?.id)
        returnArray['reviewed'] = domain?.hasReviewedAnnotation()
        return returnArray
    }


    /**
     * Return domain user (annotation user, image user...)
     * By default, a domain has no user.
     * You need to override userDomainCreator() in domain class
     * @return Domain user
     */
    public SecUser userDomainCreator() {
        return user;
    }
}
