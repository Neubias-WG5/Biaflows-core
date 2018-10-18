package be.cytomine.utils.bootstrap

import be.cytomine.image.AbstractImage

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

import be.cytomine.image.UploadedFile
import be.cytomine.image.multidim.ImageGroup
import be.cytomine.image.multidim.ImageSequence
import be.cytomine.image.server.ImageServer
import be.cytomine.image.server.Storage
import be.cytomine.middleware.AmqpQueue
import be.cytomine.ontology.Property
import be.cytomine.processing.ImageFilter
import be.cytomine.processing.ImagingServer
import be.cytomine.project.Project
import be.cytomine.security.SecRole
import be.cytomine.security.SecUser
import be.cytomine.security.SecUserSecRole
import be.cytomine.security.User
import be.cytomine.utils.Version
import grails.converters.JSON
import grails.plugin.springsecurity.SpringSecurityUtils
import groovy.sql.Sql
import org.apache.commons.lang.RandomStringUtils

/**
 * Cytomine
 * User: lrollus
 * This class contains all code when you want to change the database dataset.
 * E.g.: add new rows for a specific version, drop a column, ...
 *
 * The main method ("execChangeForOldVersion") is called by the bootstrap.
 * This method automatically run all initYYYYMMDD() methods from this class where YYYYMMDD is lt version number
 *
 * E.g. init20150115() will be call if the current version is init20150201.
 * init20150101() won't be call because: 20150101 < 20150115 < 20150201.
 *
 * At the end of the execChangeForOldVersion, the current version will be set thanks to the grailsApplication.metadata.'app.version' config
 */
class BootstrapOldVersionService {

    def grailsApplication
    def bootstrapUtilsService
    def dataSource
    def storageService
    def tableService
    def mongo
    def noSQLCollectionService
    def imagePropertiesService

    void execChangeForOldVersion() {
        def methods = this.metaClass.methods*.name.sort().unique()
        Version version = Version.getLastVersion()
        methods.each { method ->
            if(method.startsWith("init")) {
                Long methodDate = Long.parseLong(method.replace("init",""))
                if(methodDate>version.number) {
                    log.info "Run code for version > $methodDate"
                    this."init$methodDate"()
                } else {
                    log.info "Skip code for $methodDate"
                }
            }
        }

        Version.setCurrentVersion(Long.parseLong(grailsApplication.metadata.'app.version'))
    }

    void init20180710() {
        ImageGroup.findAll().each {
            if (it.id.toString() == it.name) {
                def sequence = ImageSequence.findByImageGroup(it)

                List<UploadedFile> files = UploadedFile.findAllByImage(sequence.image.baseImage)
                UploadedFile file = files.size() == 1 ? files[0] : files.find{it.parent!=null}
                while(file.parent) {
                    file = file.parent
                }

                it.setName(file.originalFilename)
                it.save(flush: true)
            }
        }
    }

    void init20180613() {
        boolean exists = new Sql(dataSource).rows("SELECT COLUMN_NAME " +
                "FROM INFORMATION_SCHEMA.COLUMNS " +
                "WHERE TABLE_NAME = 'image_filter' and COLUMN_NAME = 'processing_server_id';").size() == 1
        if (exists) {
            new Sql(dataSource).executeUpdate("UPDATE image_filter SET processing_server_id = NULL;")
            new Sql(dataSource).executeUpdate("ALTER TABLE image_filter DROP COLUMN IF EXISTS processing_server_id;")
        }
        def imagingServer = bootstrapUtilsService.createNewImagingServer()
        ImageFilter.findAll().each {
            it.imagingServer = imagingServer
            it.save(flush: true)
        }

        exists = new Sql(dataSource).rows("SELECT COLUMN_NAME " +
                "FROM INFORMATION_SCHEMA.COLUMNS " +
                "WHERE TABLE_NAME = 'processing_server' and COLUMN_NAME = 'url';").size() == 1
        if (exists) {
            new Sql(dataSource).executeUpdate("ALTER TABLE processing_server DROP COLUMN IF EXISTS url;")
            new Sql(dataSource).executeUpdate("DELETE FROM processing_server;")
        }

        new Sql(dataSource).executeUpdate("ALTER TABLE software DROP COLUMN IF EXISTS service_name;")
        new Sql(dataSource).executeUpdate("ALTER TABLE software DROP COLUMN IF EXISTS result_sample;")

        new Sql(dataSource).executeUpdate("UPDATE software SET deprecated = false WHERE deprecated IS NULL;")
        new Sql(dataSource).executeUpdate("UPDATE software_parameter SET server_parameter = false WHERE server_parameter IS NULL;")

        if(SecUser.findByUsername("rabbitmq")) {
            def rabbitmqUser = SecUser.findByUsername("rabbitmq")
            def superAdmin = SecRole.findByAuthority("ROLE_SUPER_ADMIN")
            if(!SecUserSecRole.findBySecUserAndSecRole(rabbitmqUser,superAdmin)) {
                new SecUserSecRole(secUser: rabbitmqUser,secRole: superAdmin).save(flush:true)
            }
        }

        AmqpQueue.findAllByNameLike("queueSoftware%").each {it.delete(flush: true)}

        bootstrapUtilsService.addDefaultProcessingServer()
        bootstrapUtilsService.addDefaultConstraints()
    }

    void init20180301() {
        boolean exists = new Sql(dataSource).rows("SELECT column_name "+
                "FROM information_schema.columns "+
                "WHERE table_name='abstract_image' and column_name='colorspace';").size() == 1;
        if(!exists){
            // add columns
            new Sql(dataSource).executeUpdate("ALTER TABLE abstract_image ADD COLUMN bit_depth integer;")
            new Sql(dataSource).executeUpdate("ALTER TABLE abstract_image ADD COLUMN colorspace varchar(255);")
        }

//        List<AbstractImage> abstractImages = AbstractImage.findAllByDeletedIsNullAndBitDepthIsNull()
//        log.info "${abstractImages.size()} image to populate"
//        abstractImages.eachWithIndex { image, index ->
//            if(index%100==0) {
//                log.info "Populate image properties: ${(index/abstractImages.size())*100}"
//            }
//            imagePropertiesService.populate(image)
//            imagePropertiesService.extractUseful(image)
//        }

    }

    void init20171219() {
        boolean exists = new Sql(dataSource).rows("SELECT column_name "+
                "FROM information_schema.columns "+
                "WHERE table_name='image_grouphdf5' and column_name='progress';").size() == 1;
        if(!exists){
            // add columns
            new Sql(dataSource).executeUpdate("ALTER TABLE image_grouphdf5 ADD COLUMN progress integer DEFAULT 0;")
            new Sql(dataSource).executeUpdate("ALTER TABLE image_grouphdf5 ADD COLUMN status integer DEFAULT 0;")
            new Sql(dataSource).executeUpdate("ALTER TABLE image_grouphdf5 RENAME filenames TO filename;")
        }
    }

    void init20171124(){
        def db = mongo.getDB(noSQLCollectionService.getDatabaseName())
        db.annotationAction.update([:], [$rename:[annotation:'annotationIdent']], false, true)
        db.annotationAction.update([:], [$set:[annotationClassName: 'be.cytomine.ontology.UserAnnotation']], false, true)
        db.annotationAction.update([:], [$unset:[annotation:'']], false, true)
    }

    void init20170714(){
        bootstrapUtilsService.fillProjectConnections();
        bootstrapUtilsService.fillImageConsultations();
        log.info "generate missing storage !"
        for (user in User.findAll()) {
            if (!Storage.findByUser(user)) {
                log.info "generate missing storage for $user"
                SpringSecurityUtils.doWithAuth("admin", {
                    storageService.initUserStorage(user)
                });
            }
        }
    }

    void init20170201(){
        boolean exists = new Sql(dataSource).rows("SELECT column_name "+
                "FROM information_schema.columns "+
                "WHERE table_name='shared_annotation' and column_name='annotation_class_name';").size() == 1;
        if(!exists){
            // add columns
            new Sql(dataSource).executeUpdate("ALTER TABLE shared_annotation ADD COLUMN annotation_class_name varchar(255);")
            new Sql(dataSource).executeUpdate("ALTER TABLE shared_annotation ADD COLUMN annotation_ident bigint;")

            //update all rows
            new Sql(dataSource).executeUpdate("UPDATE shared_annotation SET annotation_ident = user_annotation_id;")
            new Sql(dataSource).executeUpdate("UPDATE shared_annotation SET annotation_class_name = 'be.cytomine.ontology.UserAnnotation';")

            //add constraints
            new Sql(dataSource).executeUpdate("ALTER TABLE shared_annotation ALTER COLUMN annotation_ident SET NOT NULL;")
            new Sql(dataSource).executeUpdate("ALTER TABLE shared_annotation ALTER COLUMN annotation_class_name SET NOT NULL;")

            //delete
            new Sql(dataSource).executeUpdate("ALTER TABLE shared_annotation DROP COLUMN IF EXISTS user_annotation_id;")
        }
    }

    void init20160901(){

        boolean exists = new Sql(dataSource).rows("SELECT column_name "+
                "FROM information_schema.columns "+
                "WHERE table_name='project' and column_name='mode';").size() == 1;
        if(!exists){
            new Sql(dataSource).executeUpdate("ALTER TABLE project ADD COLUMN mode varchar(255) NOT NULL DEFAULT 'CLASSIC';")

            String request = "SELECT id FROM project WHERE is_read_only;"
            def sql = new Sql(dataSource)
            def data = []
            sql.eachRow(request) {
                data << it[0]
            }
            sql.close()
            new Sql(dataSource).executeUpdate("UPDATE project SET mode = 'READ_ONLY' WHERE id IN ("+data.join(",")+");")


            exists = new Sql(dataSource).rows("SELECT column_name "+
                    "FROM information_schema.columns "+
                    "WHERE table_name='project' and column_name='is_read_only';").size() == 1;
            if(exists){
                log.info "reinit table..."
                new Sql(dataSource).executeUpdate("DROP VIEW user_project;")
                new Sql(dataSource).executeUpdate("DROP VIEW admin_project;")
                new Sql(dataSource).executeUpdate("DROP VIEW creator_project;")
                new Sql(dataSource).executeUpdate("ALTER TABLE project DROP COLUMN is_read_only;")
                tableService.initTable()
            }
        }

        List<Property> properties = Property.findAllByDomainClassNameAndKey(Project.name,"@CUSTOM_UI_PROJECT")
        def configProject;
        properties.each { prop ->
            configProject = JSON.parse(prop.value)
            configProject.each{
                it.value["CONTRIBUTOR_PROJECT"] = it.value["GUEST_PROJECT"]
                it.value.remove("GUEST_PROJECT")
                it.value.remove("USER_PROJECT")
            }
            prop.value = configProject.toString()

            prop.save(true)
        }
    }

    void init20160503(){
        bootstrapUtilsService.convertMimeTypes();
    }
    void init20160324(){
        new Sql(dataSource).executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS mime_type;")
        new Sql(dataSource).executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS converted_filename;")
        new Sql(dataSource).executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS converted_ext;")
        new Sql(dataSource).executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS download_parent_id;")
    }
    void init20160224(){
        new Sql(dataSource).executeUpdate("DELETE FROM attached_file WHERE domain_class_name = 'be.cytomine.image.AbstractImage' AND (filename LIKE '%thumb%' OR filename LIKE '%nested%');")
    }
    void init20150729(){
        new Sql(dataSource).executeUpdate("ALTER TABLE job_parameter ALTER COLUMN value TYPE varchar(5000);")
    }
    void init20150728(){
        new Sql(dataSource).executeUpdate("ALTER TABLE storage DROP COLUMN IF EXISTS port;")
        new Sql(dataSource).executeUpdate("ALTER TABLE storage DROP COLUMN IF EXISTS ip;")
        new Sql(dataSource).executeUpdate("ALTER TABLE storage DROP COLUMN IF EXISTS key_file;")
        new Sql(dataSource).executeUpdate("ALTER TABLE storage DROP COLUMN IF EXISTS username;")
        new Sql(dataSource).executeUpdate("ALTER TABLE storage DROP COLUMN IF EXISTS password;")

        log.info "generate missing storage !"
        for (user in User.findAll()) {
            if (!Storage.findByUser(user)) {
                log.info "generate missing storage for $user"
                storageService.initUserStorage(user)
            }
        }
    }
    void init20150604(){
        if(!SecUser.findByUsername("rabbitmq")) {
            bootstrapUtilsService.createUsers([[username : 'rabbitmq', firstname : 'rabbitmq', lastname : 'user', email : grailsApplication.config.grails.admin.email, group : [[name : "Cytomine"]], password : RandomStringUtils.random(32,  (('A'..'Z') + ('0'..'0')).join().toCharArray()), color : "#FF0000", roles : ["ROLE_USER", "ROLE_SUPER_ADMIN"]]])
            SecUser rabbitMQUser = SecUser.findByUsername("rabbitmq")
            rabbitMQUser.setPrivateKey(grailsApplication.config.grails.rabbitMQPrivateKey)
            rabbitMQUser.setPublicKey(grailsApplication.config.grails.rabbitMQPublicKey)
            rabbitMQUser.save(flush : true)
        }
    }
    void init20150529(){
        new Sql(dataSource).executeUpdate("ALTER TABLE sec_user ADD CONSTRAINT unique_public_key UNIQUE (public_key);")
    }
    void init20150101() {
        if(!SecUser.findByUsername("admin")) {
            bootstrapUtilsService.createUsers([[username : 'admin', firstname : 'Admin', lastname : 'Master', email : grailsApplication.config.grails.admin.email, group : [[name : "Cytomine"]], password : grailsApplication.config.grails.adminPassword, color : "#FF0000", roles : ["ROLE_USER", "ROLE_ADMIN"]]])
        }
        if(!SecUser.findByUsername("superadmin")) {
            bootstrapUtilsService.createUsers([[username: 'superadmin', firstname: 'Super', lastname: 'Admin', email: grailsApplication.config.grails.admin.email, group: [[name: "Cytomine"]], password: grailsApplication.config.grails.adminPassword, color: "#FF0000", roles: ["ROLE_USER", "ROLE_ADMIN", "ROLE_SUPER_ADMIN"]]])
        }
        if(!SecUser.findByUsername("monitoring")) {
            bootstrapUtilsService.createUsers([[username : 'monitoring', firstname : 'Monitoring', lastname : 'Monitoring', email : grailsApplication.config.grails.admin.email, group : [[name : "Cytomine"]], password : RandomStringUtils.random(32,  (('A'..'Z') + ('0'..'0')).join().toCharArray()), color : "#FF0000", roles : ["ROLE_USER","ROLE_SUPER_ADMIN"]]])
        }
    }

    void init20140925() {
        bootstrapUtilsService.addMimeVentanaTiff()
    }

    void  init20140717() {
        bootstrapUtilsService.addMimePhilipsTiff()
    }

    void  init20140716() {
        bootstrapUtilsService.addMimePyrTiff()
    }

    void  init20140630() {
        bootstrapUtilsService.transfertProperty()
    }

    void  init20140625() {
        if((UploadedFile.count() == 0 || UploadedFile.findByImageIsNull()?.size > 0)) {
            bootstrapUtilsService.checkImages()
        }
    }

    void  init20140601() {
        //version>2014 05 12
        if(!SecRole.findByAuthority("ROLE_SUPER_ADMIN")) {
            SecRole role = new SecRole(authority:"ROLE_SUPER_ADMIN")
            role.save(flush:true,failOnError: true)
        }

        //version>2014 05 12  OTOD: DO THIS FOR IFRES,...
        if(SecUser.findByUsername("ImageServer1")) {
            def imageUser = SecUser.findByUsername("ImageServer1")
            def superAdmin = SecRole.findByAuthority("ROLE_SUPER_ADMIN")
            if(!SecUserSecRole.findBySecUserAndSecRole(imageUser,superAdmin)) {
                new SecUserSecRole(secUser: imageUser,secRole: superAdmin).save(flush:true)
            }

        }
    }


}
