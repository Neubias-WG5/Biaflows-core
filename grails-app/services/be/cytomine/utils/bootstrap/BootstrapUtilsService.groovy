package be.cytomine.utils.bootstrap

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

import be.cytomine.Exception.InvalidRequestException
import be.cytomine.Exception.WrongArgumentException
import be.cytomine.image.AbstractImage
import be.cytomine.image.ImageInstance
import be.cytomine.image.Mime
import be.cytomine.image.UploadedFile
import be.cytomine.image.server.*
import be.cytomine.middleware.AmqpQueue
import be.cytomine.middleware.MessageBrokerServer
import be.cytomine.ontology.Property
import be.cytomine.ontology.Relation
import be.cytomine.ontology.RelationTerm
import be.cytomine.processing.ImageFilter
import be.cytomine.processing.ImagingServer
import be.cytomine.processing.ParameterConstraint
import be.cytomine.processing.ProcessingServer
import be.cytomine.processing.metric.Metric
import be.cytomine.project.Discipline
import be.cytomine.security.*
import be.cytomine.social.PersistentImageConsultation
import be.cytomine.social.PersistentProjectConnection
import be.cytomine.utils.Configuration
import grails.plugin.springsecurity.SpringSecurityUtils
import grails.util.Environment
import groovy.json.JsonBuilder
import groovy.sql.Sql
import org.json.simple.JSONObject

/**
 * Cytomine
 * User: stevben
 * Date: 13/03/13
 * Time: 11:59
 */
class BootstrapUtilsService {

    def cytomineService
    def sessionFactory
    def propertyInstanceMap = org.codehaus.groovy.grails.plugins.DomainClassGrailsPlugin.PROPERTY_INSTANCE_MAP
    def grailsApplication
    def dataSource
    def amqpQueueService
    def amqpQueueConfigService
    def rabbitConnectionService
    def storageService
    def processingServerService
    def configurationService

    public def createUsers(def usersSamples) {

        SecRole.findByAuthority("ROLE_USER") ?: new SecRole(authority: "ROLE_USER").save(flush: true)
        SecRole.findByAuthority("ROLE_ADMIN") ?: new SecRole(authority: "ROLE_ADMIN").save(flush: true)
        SecRole.findByAuthority("ROLE_SUPER_ADMIN") ?: new SecRole(authority: "ROLE_SUPER_ADMIN").save(flush: true)
        SecRole.findByAuthority("ROLE_GUEST") ?: new SecRole(authority: "ROLE_GUEST").save(flush: true)

        def usersCreated = []
        usersSamples.each { item ->
            User user = User.findByUsername(item.username)
            if (user)  return
            user = new User(
                    username: item.username,
                    firstname: item.firstname,
                    lastname: item.lastname,
                    email: item.email,
                    color: item.color,
                    password: item.password,
                    enabled: true)
            user.generateKeys()


            log.info "Before validating ${user.username}..."
            if (user.validate()) {
                log.info "Creating user ${user.username}..."

                try {
                    user.save(flush: true)
                } catch(Exception e) {
                    log.info e
                }
                log.info "Save ${user.username}..."

                usersCreated << user

                /* Add Roles */
                item.roles.each { authority ->
                    log.info "Add SecRole " + authority + " for user " + user.username
                    SecRole secRole = SecRole.findByAuthority(authority)
                    if (secRole) SecUserSecRole.create(user, secRole)
                }
            } else {
                log.info("\n\n\n Errors in account boostrap for ${item.username}!\n\n\n")
                user.errors.each {
                    err -> log.info(err)
                }
            }
        }

        SpringSecurityUtils.reauthenticate "admin", null

        usersCreated.each { user ->
            /*Create Storage*/
            storageService.initUserStorage(user)
        }
        return usersCreated
    }

    public def createRelation() {
        def relationSamples = [
                [name: RelationTerm.names.PARENT],
                [name: RelationTerm.names.SYNONYM]
        ]

        log.info("createRelation")
        relationSamples.each { item ->
            if (Relation.findByName(item.name)) return
            def relation = new Relation(name: item.name)
            log.info("create relation=" + relation.name)

            if (relation.validate()) {
                log.info("Creating relation : ${relation.name}...")
                relation.save(flush: true)

            } else {
                log.info("\n\n\n Errors in account boostrap for ${item.name}!\n\n\n")
                relation.errors.each {
                    err -> log.info err
                }

            }
        }
    }

    def createFilters(def filters) {
        filters.each {
            if (!ImageFilter.findByName(it.name)) {
                ImageFilter filter = new ImageFilter(name: it.name, baseUrl: it.baseUrl, imagingServer: it.imagingServer)
                if (filter.validate()) {
                    filter.save(flush:true)
                } else {
                    filter.errors?.each {
                        log.info it
                    }
                }
            }
        }
    }

    public def createMimes(def mimeSamples) {
        mimeSamples.each {
            if(!Mime.findByMimeType(it.mimeType)) {
                Mime mime = new Mime(extension : it.extension, mimeType: it.mimeType)
                if (mime.validate()) {
                    mime.save(flush:true)
                } else {
                    mime.errors?.each {
                        log.info it
                    }
                }
            }

        }
    }

    def createDisciplines(def disciplineSamples) {
        disciplineSamples.each {
            Discipline discipline = Discipline.findByShortName(it.shortName)
            if (!discipline) {
                discipline = new Discipline(name: it.name, shortName: it.shortName)
            }
            else {
                discipline.name = it.name
                discipline.shortName = it.shortName
            }

            if (discipline.validate()) {
                discipline.save(flush: true)
            } else {
                discipline.errors?.each {
                    log.info it
                }
            }
        }
    }

    def createMetrics(def metricSamples) {
        def disciplines = Discipline.findAll()
        
        metricSamples.each {
            def disciplineIds = disciplines.findAll { d -> d.shortName in it.disciplines }
            Metric metric = Metric.findByShortName(it.shortName)
            if (!metric) {
                metric = new Metric(name: it.name, shortName: it.shortName, disciplines: disciplineIds)
            }
            else {
                metric.name = it.name
                metric.shortName = it.shortName
                metric.disciplines = disciplineIds
            }

            if (metric.validate()) {
                metric.save(flush: true)
            } else {
                metric.errors?.each {
                    log.info it
                }
            }
        }
    }

    def createConfigurations(){
        Configuration.Role adminRole = Configuration.Role.ADMIN
        Configuration.Role allUsers = Configuration.Role.ALL

        def configs = []

        configs << new Configuration(key: "WELCOME", value: "<p>Welcome to the Cytomine software.</p><p>This software is supported by the <a href='https://cytomine.coop'>Cytomine company</a></p>", readingRole: allUsers)

        configs << new Configuration(key: "retrieval.enabled", value: true, readingRole: allUsers)

        configs << new Configuration(key: "admin.email", value: grailsApplication.config.grails.admin.email, readingRole: adminRole)

        //SMTP values
        configs << new Configuration(key: "notification.email", value: grailsApplication.config.grails.notification.email, readingRole: adminRole)
        configs << new Configuration(key: "notification.password", value: grailsApplication.config.grails.notification.password, readingRole: adminRole)
        configs << new Configuration(key: "notification.smtp.host", value: grailsApplication.config.grails.notification.smtp.host, readingRole: adminRole)
        configs << new Configuration(key: "notification.smtp.port", value: grailsApplication.config.grails.notification.smtp.port, readingRole: adminRole)


        //Default project values
        //configs << new Configuration(key: , value: , readingRole: )

        //LDAP values
        configs << new Configuration(key: "ldap.active", value: grailsApplication.config.grails.plugin.springsecurity.ldap.active, readingRole: allUsers)
        if(grailsApplication.config.grails.plugin.springsecurity.ldap.active) {
            configs << new Configuration(key: "ldap.context.server", value: grailsApplication.config.grails.plugin.springsecurity.ldap.context.server, readingRole: adminRole)
            configs << new Configuration(key: "ldap.search.base", value: grailsApplication.config.grails.plugin.springsecurity.ldap.search.base, readingRole: adminRole)
            configs << new Configuration(key: "ldap.context.managerDn", value: grailsApplication.config.grails.plugin.springsecurity.ldap.context.managerDn, readingRole: adminRole)
            configs << new Configuration(key: "ldap.context.managerPassword", value: grailsApplication.config.grails.plugin.springsecurity.ldap.context.managerPassword, readingRole: adminRole)
            //grails.plugin.springsecurity.ldap.authorities.groupSearchBase = ''
        }

        //LTI values
        //grailsApplication.config.grails.LTIConsumer.each{}
        //add key secret and name
        //role invited user values


        configs.each { config ->
            if (config.validate()) {
                config.save()
            } else {
                config.errors?.each {
                    log.info it
                }
            }
        }
    }

    def saveDomain(def newObject, boolean flush = true) {
        if (!newObject.validate()) {
            log.error newObject.errors
            log.error newObject.retrieveErrors().toString()
            throw new WrongArgumentException(newObject.retrieveErrors().toString())
        }
        if (!newObject.save(flush: flush)) {
            throw new InvalidRequestException(newObject.retrieveErrors().toString())
        }
    }

    def createMultipleRetrieval() {
        Configuration retrieval = Configuration.findByKey("retrieval.enabled")
        if(retrieval && retrieval.value.equals("false")){
            RetrievalServer.list().each { server ->
                server.delete()
            }
            return
        }

        RetrievalServer.list().each { server ->
            if(!grailsApplication.config.grails.retrievalServerURL.contains(server.url)) {
                log.info server.url + " is not in config, drop it"
                log.info "delete Retrieval $server"
                server.delete()
            }

        }

        if (Environment.getCurrent() != Environment.TEST) {

            grailsApplication.config.grails.retrievalServerURL.eachWithIndex { it, index ->

                if (!RetrievalServer.findByUrl(it)) {
                    RetrievalServer server =
                            new RetrievalServer(
                                    description: "retrieval $index",
                                    url: "${it}",
                                    path: '/retrieval-web/api/resource.json',
                                    username: grailsApplication.config.grails.retrievalUsername,
                                    password: grailsApplication.config.grails.retrievalPassword
                            )
                    if (server.validate()) {
                        server.save()
                    } else {
                        server.errors?.each {
                            log.info it
                        }
                    }
                }

            }
        }
    }

    def createMultipleIS() {

        ImageServer.list().each { server ->
            if(!grailsApplication.config.grails.imageServerURL.contains(server.url)) {
                log.info server.url + " is not in config, drop it"
                MimeImageServer.findAllByImageServer(server).each {
                    log.info "delete $it"
                    it.delete()
                }

                ImageServerStorage.findAllByImageServer(server).each {
                    log.info "delete $it"
                    it.delete()
                }
                log.info "delete IS $server"
                server.delete()
            }

        }



        grailsApplication.config.grails.imageServerURL.eachWithIndex { it, index ->
            createNewIS(index+"",it)
        }
    }


    def createNewIS(String name = "", String url) {

        if(!ImageServer.findByUrl(url)) {
            log.info "Create new IMS: $url"
            def IIPImageServer = [className : 'IIPResolver', name : 'IIP'+name, service : '/image/tile', url : url, available : true]
            ImageServer imageServer = new ImageServer(
                    className: IIPImageServer.className,
                    name: IIPImageServer.name,
                    service : IIPImageServer.service,
                    url : IIPImageServer.url,
                    available : IIPImageServer.available
            )

            if (imageServer.validate()) {
                imageServer.save()
            } else {
                imageServer.errors?.each {
                    log.info it
                }
            }

            Storage.list().each {
                new ImageServerStorage(
                        storage : it,
                        imageServer: imageServer
                ).save()
            }

            Mime.list().each {
                new MimeImageServer(
                        mime : it,
                        imageServer: imageServer
                ).save()
            }
        }
    }

    def createNewImagingServer() {
        def url = grailsApplication.config.grails.imageServerURL[0]
        def imagingServer = ImagingServer.findByUrl(url)
        if(!imagingServer) {
            return new ImagingServer(url: grailsApplication.config.grails.imageServerURL[0]).save(flush: true,
                    failOnError: true)
        }

        return imagingServer
    }

    void convertMimeTypes(){
        SpringSecurityUtils.doWithAuth("admin", {

            Mime oldTif = Mime.findByMimeType("image/tif");
            Mime oldTiff = Mime.findByMimeType("image/tiff");
            Mime newTiff = Mime.findByMimeType("image/pyrtiff");

            List<AbstractImage> abstractImages = AbstractImage.findAllByMimeInList([oldTif, oldTiff]);
            log.info "images to convert : "+abstractImages.size()

            abstractImages.each {
                it.mime = newTiff;
                it.save();
            }
        })
    }

    void initRabbitMq() {
        log.info "init RabbitMQ connection..."
        MessageBrokerServer mbs = MessageBrokerServer.first()
        boolean toUpdate = false

        MessageBrokerServer.list().each { messageBroker ->
            if(!grailsApplication.config.grails.messageBrokerServerURL.equals(messageBroker.host+":"+messageBroker.port)) {
                toUpdate = true
                log.info messageBroker.host + "is not in config, drop it"
                log.info "delete Message Broker Server " + messageBroker
                messageBroker.delete(flush: true)
            }
        }

        String messageBrokerURL = grailsApplication.config.grails.messageBrokerServerURL
        def splittedURL = messageBrokerURL.split(':')
        if(toUpdate || (mbs == null)) {
            // create MBS
            mbs = new MessageBrokerServer(name: "MessageBrokerServer", host: splittedURL[0], port: splittedURL[1].toInteger())
            if (mbs.validate()) {
                mbs.save()
            } else {
                mbs.errors?.each {
                    log.info it
                }
            }

            // Update the queues
            AmqpQueue.findAll().each {
                it.host = mbs.host
                it.save(failOnError:true)
                if(!amqpQueueService.checkRabbitQueueExists("queueCommunication",mbs)) {
                    AmqpQueue queueCommunication = amqpQueueService.read("queueCommunication")
                    amqpQueueService.createAmqpQueueDefault(queueCommunication)
                }
            }
        }

        // Initialize default configurations for amqp queues
        amqpQueueConfigService.initAmqpQueueConfigDefaultValues()

        // Initialize RabbitMQ queue to communicate software added
        if(!AmqpQueue.findByName("queueCommunication")) {
            AmqpQueue queueCommunication = new AmqpQueue(name: "queueCommunication", host: mbs.host, exchange: "exchangeCommunication")
            queueCommunication.save(failOnError: true, flush: true)
            amqpQueueService.createAmqpQueueDefault(queueCommunication)
        }
        else if(!amqpQueueService.checkRabbitQueueExists("queueCommunication",mbs)) {
            AmqpQueue queueCommunication = amqpQueueService.read("queueCommunication")
            amqpQueueService.createAmqpQueueDefault(queueCommunication)
        }

        //Inserting a MessageBrokerServer for testing purpose
        if (Environment.getCurrent() == Environment.TEST) {
            rabbitConnectionService.getRabbitConnection(mbs)
        }
    }

    void initProcessingServerQueues() {
        log.info "init RabbitMQ connection for processing servers..."
        MessageBrokerServer mbs = MessageBrokerServer.first()
        ProcessingServer.list().each {
            if (it.name != null) {
                String queueName = amqpQueueService.queuePrefixProcessingServer + ((it as ProcessingServer).name).capitalize()
                if(!amqpQueueService.checkAmqpQueueDomainExists(queueName)) {
                    String exchangeName = amqpQueueService.exchangePrefixProcessingServer + ((it as ProcessingServer).name).capitalize()
                    String brokerServerURL = (MessageBrokerServer.findByName("MessageBrokerServer")).host
                    AmqpQueue aq = new AmqpQueue(name: queueName, host: brokerServerURL, exchange: exchangeName)
                    aq.save(failOnError: true)
                }
                if(!amqpQueueService.checkRabbitQueueExists(queueName,mbs)) {
                    AmqpQueue aq = amqpQueueService.read(queueName)

                    // Creates the queue on the rabbit server
                    amqpQueueService.createAmqpQueueDefault(aq)

                    // Notify the queueCommunication that a software has been added
                    def mapInfosQueue = [name: aq.name, host: aq.host, exchange: aq.exchange]
                    JsonBuilder builder = new JsonBuilder()
                    builder(mapInfosQueue)
                    amqpQueueService.publishMessage(AmqpQueue.findByName("queueCommunication"), builder.toString())
                }
            }
        }
    }

    def mongo
    def noSQLCollectionService
    def imageConsultationService
    void fillProjectConnections() {
        SpringSecurityUtils.doWithAuth("superadmin", {
            Date before = new Date();

            def connections = PersistentProjectConnection.findAllByTimeIsNullOrCountCreatedAnnotationsIsNullOrCountViewedImagesIsNull(sort: 'created', order: 'desc', max: Integer.MAX_VALUE)
            log.info "project connections to update " + connections.size()

            def sql = new Sql(dataSource)

            for (PersistentProjectConnection projectConnection : connections) {
                Date after = projectConnection.created;

                // collect {it.created.getTime} is really slow. I just want the getTime of PersistentConnection
                def db = mongo.getDB(noSQLCollectionService.getDatabaseName())
                def lastConnection = db.persistentConnection.aggregate(
                        [$match: [project: projectConnection.project, user: projectConnection.user, $and : [[created: [$gte: after]],[created: [$lte: before]]]]],
                        [$sort: [created: 1]],
                        [$project: [dateInMillis: [$subtract: ['$created', new Date(0L)]]]]
                );

                def continuousConnections = lastConnection.results().collect { it.dateInMillis }

                //we calculate the gaps between connections to identify the period of non activity
                def continuousConnectionIntervals = []

                continuousConnections.inject(projectConnection.created.time) { result, i ->
                    continuousConnectionIntervals << (i-result)
                    i
                }

                projectConnection.time = continuousConnectionIntervals.split{it < 30000}[0].sum()
                if(projectConnection.time == null) projectConnection.time=0;

                // count viewed images
                projectConnection.countViewedImages = imageConsultationService.getImagesOfUsersByProjectBetween(projectConnection.user, projectConnection.project,after, before).size()

                db.persistentImageConsultation.update(
                        [$and :[ [project:projectConnection.project],[user:projectConnection.user],[created:[$gte:after]],[created:[$lte:before]]]],
                        [$set: [projectConnection: projectConnection.id]])

                // count created annotations
                String request = "SELECT COUNT(*) FROM user_annotation a WHERE a.project_id = ${projectConnection.project} AND a.user_id = ${projectConnection.user} AND a.created < '${before}' AND a.created > '${after}'"

                sql.eachRow(request) {
                    projectConnection.countCreatedAnnotations = it[0];
                }

                projectConnection.save(flush : true, failOnError: true)
                before = projectConnection.created
            }
            sql.close()
        });
    }
    void fillImageConsultations() {
        SpringSecurityUtils.doWithAuth("superadmin", {
            Date before = new Date();

            def consultations = PersistentImageConsultation.findAllByTimeIsNullOrCountCreatedAnnotationsIsNull(sort: 'created', order: 'desc', max: Integer.MAX_VALUE)
            log.info "image consultations to update " + consultations.size()

            def sql = new Sql(dataSource)

            for (PersistentImageConsultation consultation : consultations) {
                Date after = consultation.created;

                // collect {it.created.getTime} is really slow. I just want the getTime of PersistentConnection
                def db = mongo.getDB(noSQLCollectionService.getDatabaseName())
                def positions = db.persistentUserPosition.aggregate(
                        [$match: [project: consultation.project, user: consultation.user, image: consultation.image, $and : [[created: [$gte: after]],[created: [$lte: before]]]]],
                        [$sort: [created: 1]],
                        [$project: [dateInMillis: [$subtract: ['$created', new Date(0L)]]]]
                );

                def continuousConnections = positions.results().collect { it.dateInMillis }

                //we calculate the gaps between connections to identify the period of non activity
                def continuousConnectionIntervals = []

                continuousConnections.inject(consultation.created.time) { result, i ->
                    continuousConnectionIntervals << (i-result)
                    i
                }

                consultation.time = continuousConnectionIntervals.split{it < 30000}[0].sum()
                if(consultation.time == null) consultation.time=0;

                // count created annotations
                String request = "SELECT COUNT(*) FROM user_annotation a WHERE " +
                        "a.project_id = ${consultation.project} " +
                        "AND a.user_id = ${consultation.user} " +
                        "AND a.image_id = ${consultation.image} " +
                        "AND a.created < '${before}' AND a.created > '${after}'"

                sql.eachRow(request) {
                    consultation.countCreatedAnnotations = it[0];
                }

                consultation.save(flush : true, failOnError: true)
                before = consultation.created
            }
            sql.close()
        });
    }

    public void cleanUpGorm() {
        def session = sessionFactory.currentSession
        session.flush()
        session.clear()
        propertyInstanceMap.get().clear()
    }

    void addDefaultProcessingServer() {
        log.info("Add the default processing server")

        SpringSecurityUtils.doWithAuth {
            if (!ProcessingServer.findByName("local-server")) {
                ProcessingServer processingServer = new ProcessingServer(
                        name: "local-server",
                        host: "slurm",
                        username: "cytomine",
                        port: 22,
                        type: "cpu",
                        processingMethodName: "SlurmProcessingMethod",
                        persistentDirectory: grailsApplication.config.cytomine.software.path.softwareImages,
                        index: 1
                )

                String processingServerName = processingServer.name.capitalize()
                String queueName = amqpQueueService.queuePrefixProcessingServer + processingServerName

                if (!amqpQueueService.checkAmqpQueueDomainExists(queueName)) {
                    // Creation of the default processing server queue
                    String exchangeName = amqpQueueService.exchangePrefixProcessingServer + processingServerName
                    String brokerServerURL = (MessageBrokerServer.findByName("MessageBrokerServer")).host
                    AmqpQueue amqpQueue = new AmqpQueue(name: queueName, host: brokerServerURL, exchange: exchangeName)
                    amqpQueue.save(flush: true, failOnError: true)

                    amqpQueueService.createAmqpQueueDefault(amqpQueue)

                    // Associates the processing server to an amqp queue
                    processingServer.amqpQueue = amqpQueue
                    processingServer.save(flush: true)

                    // Sends a message on the communication queue to warn the software router a new queue has been created
                    def message = [requestType: "addProcessingServer",
                                   name: amqpQueue.name,
                                   host: amqpQueue.host,
                                   exchange: amqpQueue.exchange,
                                   processingServerId: processingServer.id]

                    JsonBuilder jsonBuilder = new JsonBuilder()
                    jsonBuilder(message)

                    amqpQueueService.publishMessage(AmqpQueue.findByName("queueCommunication"), jsonBuilder.toString())
                }
            }
        }
    }

    void addDefaultConstraints() {
        log.info("Add the default constraints")

        SpringSecurityUtils.doWithAuth {
            def constraints = []

            // "Number" dataType
            log.info("Add Number constraints")
            constraints.add(new ParameterConstraint(name: "integer", expression: '("[value]".isInteger()', dataType: "Number"))
            constraints.add(new ParameterConstraint(name: "minimum", expression: '(Double.valueOf("[parameterValue]") as Number) <= (Double.valueOf("[value]") as Number)', dataType: "Number"))
            constraints.add(new ParameterConstraint(name: "maximum", expression: '(Double.valueOf("[parameterValue]") as Number) >= (Double.valueOf("[value]") as Number)', dataType: "Number"))
            constraints.add(new ParameterConstraint(name: "equals", expression: '(Double.valueOf("[parameterValue]") as Number) == (Double.valueOf("[value]") as Number)', dataType: "Number"))
            constraints.add(new ParameterConstraint(name: "in", expression: '"[value]".tokenize("[separator]").find { elem -> (Double.valueOf(elem) as Number) == (Double.valueOf("[parameterValue]") as Number) } != null', dataType: "Number"))

            // "String" dataType
            log.info("Add String constraints")
            constraints.add(new ParameterConstraint(name: "minimum", expression: '"[parameterValue]".length() < [value]', dataType: "String"))
            constraints.add(new ParameterConstraint(name: "maximum", expression: '"[parameterValue]".length() > [value]', dataType: "String"))
            constraints.add(new ParameterConstraint(name: "equals", expression: '"[parameterValue]" == "[value]"', dataType: "String"))
            constraints.add(new ParameterConstraint(name: "in", expression: '"[value]".tokenize("[separator]").contains("[parameterValue]")', dataType: "String"))

            // "Boolean" dataType
            log.info("Add Boolean constraints")
            constraints.add(new ParameterConstraint(name: "equals", expression: 'Boolean.parseBoolean("[value]") == Boolean.parseBoolean("[parameterValue]")', dataType: "Boolean"))

            // "Date" dataType
            log.info("Add Date constraints")
            constraints.add(new ParameterConstraint(name: "minimum", expression: 'new Date().parse("HH:mm:ss", "[parameterValue]").format("HH:mm:ss") < new Date().parse("HH:mm:ss", "[value]").format("HH:mm:ss")', dataType: "Date"))
            constraints.add(new ParameterConstraint(name: "maximum", expression: 'new Date().parse("HH:mm:ss", "[parameterValue]").format("HH:mm:ss") > new Date().parse("HH:mm:ss", "[value]").format("HH:mm:ss")', dataType: "Date"))
            constraints.add(new ParameterConstraint(name: "equals", expression: 'new Date().parse("HH:mm:ss", "[parameterValue]").format("HH:mm:ss") == new Date().parse("HH:mm:ss", "[value]").format("HH:mm:ss")', dataType: "Date"))
            constraints.add(new ParameterConstraint(name: "in", expression: '"[value]".tokenize("[separator]").contains("[parameterValue]")', dataType: "Date"))

            // dateMin, dateMax, timeEquals, timeIn
            constraints.each { constraint ->
                if (!ParameterConstraint.findByNameAndDataType(constraint.name as String, constraint.dataType as String)) {
                    constraint.save(flush: true)
                }
            }

        }
    }

}
