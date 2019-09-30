package be.cytomine.social

import be.cytomine.Exception.CytomineException
import be.cytomine.api.UrlApi
import be.cytomine.image.ImageInstance
import be.cytomine.project.Project
import be.cytomine.security.SecUser
import be.cytomine.security.User
import be.cytomine.sql.AnnotationListing
import be.cytomine.sql.UserAnnotationListing
import be.cytomine.utils.JSONUtils
import be.cytomine.utils.ModelService
import grails.transaction.Transactional
import org.springframework.web.context.request.RequestContextHolder

import static org.springframework.security.acls.domain.BasePermission.READ

@Transactional
class ImageConsultationService extends ModelService {

    def securityACLService
    def dataSource
    def mongo
    def noSQLCollectionService
    def projectService

    private getProjectConnectionService() {
        grailsApplication.mainContext.projectConnectionService
    }

    def add(def json){

        SecUser user = cytomineService.getCurrentUser()
        Long imageId = JSONUtils.getJSONAttrLong(json,"image",-1)
        ImageInstance image = ImageInstance.read(imageId)

        securityACLService.check(image.project,READ)

        closeLastImageConsultation(user.id, imageId, new Date())
        PersistentImageConsultation consultation = new PersistentImageConsultation()
        consultation.user = user.id
        consultation.image = image.id
        consultation.project = image.project.id
        consultation.session = RequestContextHolder.currentRequestAttributes().getSessionId()
        consultation.projectConnection = projectConnectionService.lastConnectionInProject(image.project, user.id)[0].id
        consultation.mode = JSONUtils.getJSONAttrStr(json,"mode",true)
        consultation.created = new Date()
        consultation.imageName = image.getBlindInstanceFilename()
        consultation.imageThumb = UrlApi.getImageInstanceThumbUrlWithMaxSize(image.id, 256)
        consultation.insert(flush:true, failOnError : true) //don't use save (stateless collection)

        return consultation
    }

    def listImageConsultationByProjectAndUser(Long project, Long user, boolean distinctImages = false, Integer max = 0, Integer offset = 0) {
        if(max != 0) max += offset;

        if(distinctImages) {

            def data = []
            def db = mongo.getDB(noSQLCollectionService.getDatabaseName())

            def request = []
            request << [$match : [ user : user, project : project]]
            request << [$group : [_id : '$image', "date":[$max:'$created'], "time":[$first:'$time'], "countCreatedAnnotations":[$first:'$countCreatedAnnotations']]]
            request << [$sort : [ date : -1]]
            if(max > 0) request << [$limit: max]

            def result = db.persistentImageConsultation.aggregate(request)

            LinkedHashMap<Long, ImageInstance> imageInstancesMap = new LinkedHashMap<>();

            result.results().each {
                try {
                    Long imageInstanceId = it['_id']
                    ImageInstance image = imageInstancesMap.get(imageInstanceId)
                    if(! image){
                        image = ImageInstance.read(imageInstanceId)
                        imageInstancesMap.put(imageInstanceId, image)
                    }

                    String filename;
                    if(image) {
                        filename = image.instanceFilename == null ? image.baseImage.originalFilename : image.instanceFilename;
                        if(image.project.blindMode) filename = image.getBlindedName()
                    } else {
                        filename = "Image "+imageInstanceId
                    }
                    data << [
                            created:it['date'],
                            user:user,
                            image:it['_id'],
                            time:it['time'],
                            imageThumb: UrlApi.getImageInstanceThumbUrl(image.id),
                            imageName:filename,
                            project:image.project.id,
                            countCreatedAnnotations:it['countCreatedAnnotations']
                    ]
                } catch(CytomineException e) {
                    //if user has data but has no access to picture,  ImageInstance.read will throw a forbiddenException
                }
            }
            data = data.sort{-it.created.getTime()}
            return data
        } else {
            return PersistentImageConsultation.findAllByProjectAndUser(project, user, [sort: 'created', order: 'desc', max: max ])
        }
    }

    def lastImageOfUsersByProject(Project project){

        securityACLService.check(project,READ)

        def db = mongo.getDB(noSQLCollectionService.getDatabaseName())

        def results = []
        def images = db.persistentImageConsultation.aggregate(
                [$match:[project : project.id]],
                [$sort : [created:-1]],
                [$group : [_id : '$user', created : [$max :'$created'], image : [$first: '$image'], imageName : [$first: '$imageName'], user : [$first: '$user']]]);


        ImageInstance image;
        String filename;
        images.results().each {
            if(!image){
                image = ImageInstance.read(it["image"])
                if(image) {
                    filename = image.instanceFilename == null ? image.baseImage.originalFilename : image.instanceFilename;
                    if(image.project.blindMode) filename = image.getBlindedName()
                } else {
                    filename = "Image "+it["image"]
                }
            }
            results << [user: it["_id"], created : it["created"], image : it["image"], imageName: filename]
        }
        return results
    }

    def getImagesOfUsersByProjectBetween(User user, Project project, Date after = null, Date before = null){
        return getImagesOfUsersByProjectBetween(user.id, project.id, after, before)
    }

    def getImagesOfUsersByProjectBetween(Long userId, Long projectId, Date after = null, Date before = null){
        def results = [];
        def db = mongo.getDB(noSQLCollectionService.getDatabaseName())
        def match;
        if(after && before){
            match = [$match:[$and : [[created: [$lt: before]], [created: [$gte: after]], [project : projectId], [user:userId]]]]
        } else if(after){
            match = [$match:[project : projectId, user:userId, created: [$gte: after]]]
        } else if(before){
            match = [$match:[project : projectId, user:userId, created: [$lt: before]]]
        } else {
            match = [$match:[project : projectId, user:userId]]
        }

        def images = db.persistentImageConsultation.aggregate(
                match,
                [$sort : [created:-1]]
        );

        LinkedHashMap<Long, ImageInstance> imageInstancesMap = new LinkedHashMap<>();

        images.results().each {
            Long imageInstanceId = it['image']
            ImageInstance image = imageInstancesMap.get(imageInstanceId)
            if(! image){
                image = ImageInstance.read(imageInstanceId)
                imageInstancesMap.put(imageInstanceId, image)
            }
            String filename;
            if(image) {
                filename = image.instanceFilename == null ? image.baseImage.originalFilename : image.instanceFilename;
                if(image.project.blindMode) filename = image.getBlindedName()
            } else {
                filename = "Image "+imageInstanceId
            }

            results << [user: it["user"], project: it["project"], created : it["created"], image : it["image"], imageName: filename, mode: it["mode"]]
        }
        return results
    }

    private void closeLastImageConsultation(Long user, Long image, Date before){
        PersistentImageConsultation consultation = PersistentImageConsultation.findByUserAndImageAndCreatedLessThan(user, image, before, [sort: 'created', order: 'desc', max: 1])

        //first consultation
        if(consultation == null) return;

        //last consultation already closed
        if(consultation.time) return;

        fillImageConsultation(consultation, before)

        consultation.save(flush : true, failOnError : true)
    }
    def annotationListingService
    private void fillImageConsultation(PersistentImageConsultation consultation, Date before = new Date()){
        Date after = consultation.created;

        // collect {it.created.getTime} is really slow. I just want the getTime of PersistentConnection
        def db = mongo.getDB(noSQLCollectionService.getDatabaseName())
        def positions = db.persistentUserPosition.aggregate(
                [$match: [project: consultation.project, user: consultation.user, image: consultation.image, $and : [[created: [$gte: after]],[created: [$lte: before]]]]],
                [$sort: [created: 1]],
                [$project: [dateInMillis: [$subtract: ['$created', new Date(0L)]]]]
        );

        def continuousConnections = positions.results().collect { it.dateInMillis }

        //we calculated the gaps between connections to identify the period of non activity
        def continuousConnectionIntervals = []

        continuousConnections.inject(consultation.created.time) { result, i ->
            continuousConnectionIntervals << (i-result)
            i
        }

        consultation.time = continuousConnectionIntervals.split{it < 15000}[0].sum()
        if(consultation.time == null) consultation.time=0;

        AnnotationListing al = new UserAnnotationListing()
        al.project = consultation.project
        al.user = consultation.user
        al.image = consultation.image
        al.beforeThan = before
        al.afterThan = after

        // count created annotations
        consultation.countCreatedAnnotations = annotationListingService.listGeneric(al).size()
    }

    def resumeByUserAndProject(Long userId, Long projectId) {
        Project project = projectService.read(projectId)
        securityACLService.check(project,READ)

        // groupByImageId et get last imagename et imagethumb et
        def db = mongo.getDB(noSQLCollectionService.getDatabaseName())
        def consultations = db.persistentImageConsultation.aggregate(
                [$match: [project: projectId, user: userId]],
                [$sort: [created: 1]],
                [$group : [_id : [project : '$project', user : '$user', image: '$image'], time : [$sum : '$time'], frequency : [$sum : 1], countCreatedAnnotations : [$sum : '$countCreatedAnnotations'], first : [$first: '$created'], last : [$last: '$created'], imageName : [$last: '$imageName'], imageThumb : [$last: '$imageThumb']]]
        );

        def results = []
        consultations.results().each{

            ImageInstance image = ImageInstance.read(it["_id"].image)
            String filename;
            if(image) {
                filename = image.instanceFilename == null ? image.baseImage.originalFilename : image.instanceFilename;
                if(image.project.blindMode) filename = image.getBlindedName()
            } else {
                filename = "Image "+it["_id"].image
            }


            results << [project : it["_id"].project,
                        user : it["_id"].user,
                        image : it["_id"].image,
                        time : it.time,
                        countCreatedAnnotations : it.countCreatedAnnotations,
                        first : it.first,
                        last : it.last,
                        frequency : it.frequency,
                        imageName : filename,
                        imageThumb : it.imageThumb
            ]
        }

        return results;

    }

    def countByProject(Project project, Long startDate = null, Long endDate = null) {
        def result = PersistentImageConsultation.createCriteria().get {
            eq("project", project)
            if(startDate) {
                gt("created", new Date(startDate))
            }
            if(endDate) {
                lt("created", new Date(endDate))
            }
            projections {
                rowCount()
            }
        }

        return [total: result]
    }
}
