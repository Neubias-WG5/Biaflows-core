package be.cytomine.utils.bootstrap

import be.cytomine.image.AbstractImage
import be.cytomine.image.AbstractSlice
import be.cytomine.image.ImageInstance
import be.cytomine.image.Mime
import be.cytomine.image.SliceInstance
import be.cytomine.image.multidim.ImageGroup
import be.cytomine.image.multidim.ImageSequence
import be.cytomine.middleware.ImageServer

/*
* Copyright (c) 2009-2019. Authors: see NOTICE file.
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

import be.cytomine.image.server.Storage
import be.cytomine.image.server.StorageAbstractImage
import be.cytomine.image.UploadedFile
import be.cytomine.middleware.AmqpQueue
import be.cytomine.ontology.AnnotationTrack
import be.cytomine.ontology.Property
import be.cytomine.ontology.Track
import be.cytomine.processing.ImageFilter
import be.cytomine.project.Project
import be.cytomine.security.SecRole
import be.cytomine.security.SecUser
import be.cytomine.security.SecUserSecRole
import be.cytomine.security.User
import be.cytomine.utils.Configuration
import be.cytomine.utils.Version
import grails.converters.JSON
import grails.plugin.springsecurity.SpringSecurityUtils
import grails.util.Holders
import groovy.sql.Sql
import org.apache.commons.io.FilenameUtils

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
    def executorService
    def bootstrapDataService


    void execChangeForOldVersion() {
        def methods = this.metaClass.methods*.name.sort().unique()
        Version version = Version.getLastVersion()

        if(!version.major){
            methods.findAll { it =~ "init[0-9]" }.each { method ->
                Long methodDate = Long.parseLong(method.replace("init", ""))
                if (methodDate > version.number) {
                    log.info "Run code for version > $methodDate"
                    this."init$methodDate"()
                } else {
                    log.info "Skip code for $methodDate"
                }
            }

            version.major = 0
            version.minor = 0
            version.patch = 0
        }
        methods.findAll { it.startsWith("initv") }.each { method ->

            method = method.substring("initv".size())

            Short major = Short.parseShort(method.split("_")[0])
            Short minor = Short.parseShort(method.split("_")[1])
            Short patch = Short.parseShort(method.split("_")[2])

            if(major > version.major || (major == version.major && minor > version.minor)
                    || (major == version.major && minor == version.minor && patch > version.patch)) {
                log.info "Run code for v${method.replace("_",".")} update"
                this."initv$method"()
            } else {
                log.info "Skip code for initv$method"
            }

        }
        Version.setCurrentVersion(Long.parseLong(grailsApplication.metadata.'app.versionDate'), grailsApplication.metadata.'app.version')
    }

    void initv1_8_0() {
        log.info "1.8.0"
        def sql = new Sql(dataSource)
        boolean defaultComputeMetrics = Holders.config.biaflows.workflows.computeMetrics
        sql.executeUpdate("update project set compute_metrics_in_jobs = ${defaultComputeMetrics} where compute_metrics_in_jobs is null;")

        boolean defaultUploadAnnotations = Holders.config.biaflows.workflows.uploadAnnotations
        sql.executeUpdate("update project set upload_job_annotations = ${defaultUploadAnnotations} where upload_job_annotations is null;")
    }

    void initv1_7_1() {
        log.info "1.7.0"
        def sql = new Sql(dataSource)
        def admin = SecUser.findByUsername("admin")
        sql.executeUpdate("update software_user_repository set user_id = ${admin.id} where user_id is null;")
        sql.close()
    }


    def initv1_6_0() {
        log.info "v1.6.0"
        if (Track.count() == 0) {
            def lastImageId = 0
            def lastGroupId = -1
            def trackId = 0
            def sql = new Sql(dataSource)
            sql.eachRow("select p.created, domain_ident, image_id, slice_id, key, value, " +
                    "(select value from property pp where pp.domain_ident = p.domain_ident " +
                    "and pp.key = 'CUSTOM_ANNOTATION_DEFAULT_COLOR') as color, project_id \n" +
                    "from property p\n" +
                    "join algo_annotation a on a.id = p.domain_ident\n" +
                    "where p.key = 'ANNOTATION_GROUP_ID'\n" +
                    "order by image_id asc, value asc;") {
                if (Integer.parseInt(it[5]) < 1000) {
                    if (it[2] != lastImageId || it[5] != lastGroupId ) {
                        lastImageId = it[2]
                        lastGroupId = it[5]
                        log.info "Add track ${lastGroupId} for image ${lastImageId}"
                        trackId = sql.executeInsert("INSERT INTO track(id, created, version, name, color, image_id, project_id)" +
                                "VALUES (nextval('hibernate_sequence'), '${it[0]}', 0, 'Track #${it[5]}', " +
                                "'${it[6]}', ${it[2]}, ${it[7]});")[0][0]
                    }

                    sql.executeInsert("INSERT INTO annotation_track(id, created, version, annotation_class_name, " +
                            "annotation_ident, track_id, slice_id) VALUES " +
                            "(nextval('hibernate_sequence'), '${it[0]}', 0, 'be.cytomine.ontology.AlgoAnnotation', " +
                            "${it[1]}, ${trackId}, ${it[3]});")
                }
            }
        }

        new Sql(dataSource).executeUpdate("ALTER TABLE project ALTER COLUMN ontology_id DROP NOT NULL;")
        new Sql(dataSource).executeUpdate("UPDATE sec_user SET language = 'ENGLISH' WHERE language IS NULL;")
        new Sql(dataSource).executeUpdate("ALTER TABLE sec_user ALTER COLUMN language SET DEFAULT 'ENGLISH';")
        new Sql(dataSource).executeUpdate("ALTER TABLE sec_user ALTER COLUMN language SET NOT NULL;")
        new Sql(dataSource).executeUpdate("ALTER TABLE sec_user DROP COLUMN IF EXISTS skype_account;")
        new Sql(dataSource).executeUpdate("ALTER TABLE sec_user DROP COLUMN IF EXISTS sip_account;")

        new Sql(dataSource).executeUpdate("DROP VIEW user_image;")
        tableService.initTable()
    }

    def checkSqlColumnExistence(def column, def table) {
        def sql = new Sql(dataSource)
        boolean exists = sql.rows("SELECT column_name " +
                "FROM information_schema.columns " +
                "WHERE table_name='${table}' and column_name='${column}';").size() == 1;
        sql.close()
        return exists
    }

    def imagePropertiesService
    void initv1_5_0() {
        log.info "1.5.0"
        log.info "Update configurations"
        List<Configuration> configurations = Configuration.findAllByKeyLike("%.%")
        for(int i = 0; i<configurations.size(); i++){
            configurations[i].key = configurations[i].key.replace(".","_")
            configurations[i].save()
        }
        bootstrapUtilsService.createConfigurations(true)

        // Move old Long[] storages to one storage (only first one is kept)
        def sql = new Sql(dataSource)
        if (checkSqlColumnExistence('storages', 'uploaded_file')) {
            log.info "Update storage references in uploaded_file"
            sql.eachRow("select id, storages from uploaded_file") {
                def ufId = it[0]
                ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(it[1] as byte[]))
                Long[] storages = (Long[]) ois.readObject()
                sql.execute("UPDATE uploaded_file SET storage_id = ${storages.first()} WHERE id = ${ufId};")
            }
            sql.executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS storages;")
        }

        //TODO:
        def server = ImageServer.first()

        // Add image server to uploaded file (TODO: use old ImageServerStorage and StorageAbstractImage)
        log.info "Update image server reference in uploaded_file"
        UploadedFile.executeUpdate("update UploadedFile uf set uf.imageServer = ? where uf.imageServer is null",
                [server])

        // Update all image servers with known base path
        log.info "Update base path in image_server"
        ImageServer.executeUpdate("update ImageServer i set i.basePath = ? where i.basePath is null",
                [grailsApplication.config.storage_path])
        sql.executeUpdate("ALTER TABLE image_server DROP COLUMN IF EXISTS service;")
        sql.executeUpdate("ALTER TABLE image_server DROP COLUMN IF EXISTS class_name;")
        sql.executeUpdate("ALTER TABLE storage DROP COLUMN IF EXISTS base_path;")

        if (AbstractSlice.count() == 0) {
            log.info "Add (0,0,0) abstract slice for all abstract images which are not in an image group"
            def inserts = []
            def i = 0
            def request = "INSERT INTO abstract_slice (id, created, version, image_id, uploaded_file_id, mime_id, channel, z_stack, time) VALUES "
            sql.eachRow("select uploaded_file.id, image_id, mime_id, abstract_image.created " +
                    "from uploaded_file " +
                    "left join abstract_image on abstract_image.id = uploaded_file.image_id " +
                    "where image_id is not null " +
                    "and image_id not in (select base_image_id from image_instance ii right join image_sequence seq on ii.id = seq.image_id)") {
                inserts << "(nextval('hibernate_sequence'), '${it[3]}', 0, ${it[1]}, ${it[0]}, ${it[2]}, 0, 0, 0)"
                if (i > 0 && i % 2000 == 0) {
                    sql.execute(request + inserts.join(",") + ";")
                    inserts = []
                }
                i++
            }

            if (inserts.size() > 0) {
                sql.execute(request + inserts.join(",") + ";")
            }
        }

        if (SliceInstance.count() == 0) {
            log.info "Add (0,0,0) slice instance for all abstract images which are not in an image group"
            def inserts = []
            def i = 0
            def request = "INSERT INTO slice_instance(id, created, version, base_slice_id, image_id, project_id) VALUES "
            sql.eachRow("SELECT image_instance.id as iiid, abstract_slice.id as asid, image_instance.project_id as pid, image_instance.created " +
                    "from image_instance " +
                    "left join abstract_image on abstract_image.id = image_instance.base_image_id " +
                    "left join abstract_slice on abstract_slice.image_id = abstract_image.id " +
                    "left join image_sequence on image_sequence.image_id = image_instance.id " +
                    "where abstract_slice.channel = 0 and abstract_slice.z_stack = 0 and abstract_slice.time = 0 " +
                    "and image_sequence.id is null;") {
                inserts << "(nextval('hibernate_sequence'), '${it[3]}', 0, ${it[1]}, ${it[0]}, ${it[2]})"
                if (i > 0 && i % 2000 == 0) {
                    sql.execute(request + inserts.join(",") + ";")
                    inserts = []
                }
                i++
            }

            if (inserts.size() > 0) {
                sql.execute(request + inserts.join(",") + ";")
            }
        }

        sql.eachRow("select constraint_name from information_schema.table_constraints " +
                "where table_name = 'abstract_image' and constraint_type = 'UNIQUE';") {
            sql.executeUpdate("ALTER TABLE abstract_image DROP CONSTRAINT "+ it.constraint_name +";")
        }

        if (checkSqlColumnExistence('filename', 'abstract_image'))
            sql.executeUpdate("ALTER TABLE abstract_image ALTER COLUMN filename DROP NOT NULL;")

        if (checkSqlColumnExistence('mime_id', 'abstract_image'))
            sql.executeUpdate("ALTER TABLE abstract_image ALTER COLUMN mime_id DROP NOT NULL;")

        if (checkSqlColumnExistence('path', 'abstract_image'))
            sql.executeUpdate("ALTER TABLE abstract_image ALTER COLUMN path DROP NOT NULL;")

        def imageInstancesToSlicesMapping = [:]
        def abstractImagesToSlicesMapping = [:]
        def imageGroupsToImageInstancesMapping = [:]

        if (ImageGroup.count() > 0) {
            log.info "Convert image groups"
            ImageGroup.findAll().each { group ->
                log.info "Convert group ${group.name}"
                def sequence = ImageSequence.findByImageGroup(group)
                def ufId = sql.firstRow("SELECT cast(ltree2text(subltree(l_tree, 0, 1)) as bigint) " +
                        "FROM uploaded_file WHERE image_id = :id", [id: sequence.image.baseImage.id])[0]
                UploadedFile uf = UploadedFile.read(ufId)

                def image = new AbstractImage(uploadedFile: uf, originalFilename: uf.originalFilename).save(failOnError: true, flush: true)
                imagePropertiesService.regenerate(image)

                def project = group.project
                def imageInstance = new ImageInstance(baseImage: image, project: project, user: sequence.image.user).save(failOnError: true, flush: true)

                imageGroupsToImageInstancesMapping << [(group.id): imageInstance.id]

                sql.executeUpdate("update attached_file set domain_class_name = 'be.cytomine.image.ImageInstance', " +
                        "domain_ident = ${imageInstance.id} where domain_ident = ${group.id}")

                sql.executeUpdate("update metric_result set image_instance_id = ${imageInstance.id}, image_group_id = NULL where image_group_id = ${group.id}")

                sql.eachRow("SELECT ai.created, uf.id as ufid, ai.mime_id, seq.channel, seq.z_stack, seq.time, " +
                        "seq.image_id as iiid , ai.id as aiid " +
                        "FROM image_sequence seq " +
                        "LEFT JOIN image_instance ii ON seq.image_id = ii.id " +
                        "LEFT JOIN abstract_image ai ON ii.base_image_id = ai.id " +
                        "LEFT JOIN uploaded_file uf ON ai.id = uf.image_id " +
                        "WHERE seq.image_group_id = :group", [group: group.id]) {
                    // 1) create abstract slice
                    def absSlice = sql.executeInsert("INSERT INTO abstract_slice(id, created, version, image_id, uploaded_file_id," +
                            " mime_id, channel, z_stack, time) VALUES " +
                            "(nextval('hibernate_sequence'), '${it[0]}', 0, ${image.id}, ${it[1]}, ${it[2]}, " +
                            "${it[3]}, ${it[4]}, ${it[5]})")
                    abstractImagesToSlicesMapping << [(it[7]): absSlice[0][0]]

                    // 2) create slice_instance
                    def slice = sql.executeInsert("INSERT INTO slice_instance(id, created, version, project_id, " +
                            "image_id, base_slice_id) VALUES " +
                            "(nextval('hibernate_sequence'), '${it[0]}', 0, ${project.id}, " +
                            "${imageInstance.id}, ${absSlice[0][0]})")
                    imageInstancesToSlicesMapping << [(it[6]): [slice: slice[0][0], image:imageInstance.id]]
                }
            }
        }

        if (checkSqlColumnExistence('image_id', "uploaded_file")) {
            def len = abstractImagesToSlicesMapping.size()
            log.info len
            log.info("Change direction of UF - AI relation and use the root as AI uploaded file")
            sql.executeUpdate("update abstract_image " +
                    "set uploaded_file_id = cast(ltree2text(subltree(uploaded_file.l_tree, 0, 1)) as bigint) " +
                    "from uploaded_file " +
                    "where abstract_image.id = image_id " +
                    "and uploaded_file_id is null " +
                    "and cast(ltree2text(subltree(uploaded_file.l_tree, 0, 1)) as bigint) IN (SELECT id FROM uploaded_file) " +
                    ((len > 0) ? "and abstract_image.id NOT IN (${abstractImagesToSlicesMapping.keySet().join(',')}); " : ";"))
        }

        imageInstancesToSlicesMapping.each { o, n ->
            log.info "Update annotation references to slices for old image instance $o that was linked to image group"
            sql.executeUpdate("update algo_annotation set image_id = ${n.image}, slice_id = ${n.slice} where image_id = ${o};")
            sql.executeUpdate("update user_annotation set image_id = ${n.image}, slice_id = ${n.slice} where image_id = ${o};")
            sql.executeUpdate("update reviewed_annotation set image_id = ${n.image}, slice_id = ${n.slice} where image_id = ${o};")
            sql.executeUpdate("update annotation_index set image_id = ${n.image}, slice_id = ${n.slice} where image_id = ${o};")
        }

        log.info "Update annotation references to slices for 2D images"
        sql.executeUpdate("update algo_annotation " +
                "set slice_id = slice.id " +
                "from slice_instance slice " +
                "where slice.image_id = algo_annotation.image_id " +
                "and slice_id IS NULL")

        sql.executeUpdate("update user_annotation " +
                "set slice_id = slice.id " +
                "from slice_instance slice " +
                "where slice.image_id = user_annotation.image_id " +
                "and slice_id IS NULL")

        sql.executeUpdate("update reviewed_annotation " +
                "set slice_id = slice.id " +
                "from slice_instance slice " +
                "where slice.image_id = reviewed_annotation.image_id " +
                "and slice_id IS NULL")

        if (checkSqlColumnExistence('image_id', 'annotation_index')) {
            sql.executeUpdate("update annotation_index " +
                    "set slice_id = slice.id " +
                    "from slice_instance slice " +
                    "where slice.image_id = annotation_index.image_id " +
                    "and slice_id IS NULL")
        }

        if (imageInstancesToSlicesMapping.size() > 0) {
            log.info "Delete old image instances used in image groups"
            sql.executeUpdate("DELETE FROM image_sequence " +
                    "where image_id IN (${imageInstancesToSlicesMapping.keySet().join(',')})")
            sql.executeUpdate("DELETE FROM image_instance " +
                    "where id IN (${imageInstancesToSlicesMapping.keySet().join(',')})")
            sql.executeUpdate("DELETE FROM image_group;")
        }

        log.info "Drop no more used columns"
        sql.executeUpdate("ALTER TABLE abstract_image DROP COLUMN IF EXISTS filename;")
        sql.executeUpdate("ALTER TABLE abstract_image DROP COLUMN IF EXISTS path;")
        sql.executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS image_id;")
        sql.executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS path;")
        sql.executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS converted;")
        sql.executeUpdate("ALTER TABLE abstract_image DROP COLUMN IF EXISTS mime_id;")
        sql.executeUpdate("ALTER TABLE annotation_index DROP COLUMN IF EXISTS image_id;")
        sql.executeUpdate("ALTER TABLE metric_result DROP COLUMN IF EXISTS image_group_id;")
        sql.executeUpdate("update metric_result set class = 'be.cytomine.processing.metric.ImageInstanceMetricResult';")

        log.info "Delete old image references"
        sql.executeUpdate("DELETE FROM storage_abstract_image;")
        sql.executeUpdate("delete from image_instance where id not in (select image_id from slice_instance);")
        sql.executeUpdate("delete from abstract_image where id not in (select image_id from abstract_slice);")

//        AbstractImage.findAllByDurationIsNull().each {
//            log.info "Regenerate properties for ${it}"
//            imagePropertiesService.regenerate(it)
//        }
        log.info sql.firstRow("select count(*) from abstract_image where depth is not null;")[0]
        sql.executeUpdate("update abstract_image set depth = 1 where depth is null;")
        sql.executeUpdate("update abstract_image set duration = 1 where duration is null;")
        sql.executeUpdate("update abstract_image set channels = 1 where channels is null;")

        log.info "Update mime reference"
        def pyrTiffMime = Mime.findByMimeType("image/pyrtiff")
        def mimeToRemove = ["image/tiff", "image/tif", "zeiss/zvi"]
        mimeToRemove.each {
            def mime = Mime.findByMimeType(it)
            if (mime) {
                sql.executeUpdate("UPDATE abstract_slice SET mime_id = ${pyrTiffMime.id} WHERE mime_id = ${mime.id}")
                sql.executeUpdate("DELETE FROM mime_image_server WHERE mime_id = ${mime.id}")
                mime.delete()
            }
        }

        log.info "Update uploaded file status"
        [[old: 1, "new": 104],
            [old: 2, "new": 100],
            [old: 3, "new": 11],
            [old: 4, "new": 31],
            [old: 5, "new": 20],
            [old: 6, "new": 40],
            [old: 7, "new": 20],
            [old: 8, "new": 41],
            [old: 9, "new": 41]].each {
            sql.executeUpdate("UPDATE uploaded_file SET status = ${it["new"]} WHERE status = ${it["old"]}")
        }

        log.info "Clean uploaded_file by deleting all not finished uploads"
        try {
            sql.executeUpdate("delete from abstract_slice a where uploaded_file_id in (select id from uploaded_file where status < 100);")
            sql.executeUpdate("delete from abstract_image a where uploaded_file_id in (select id from uploaded_file where status < 100);")
        }
        catch(Exception e) {
            log.error("Error during uploaded_file cleaning: ${e}")
        }

        log.info("Recompute project and image counters")
        sql.executeUpdate("UPDATE project p SET " +
                "count_images = (select count(*) from image_instance ii where ii.deleted is null and ii.project_id = p.id), " +
                "count_annotations = (select count(*) from user_annotation ua left join image_instance ii on ii.id = ua.image_id where ua.deleted is null and ua.project_id = p.id and ii.deleted is null), " +
                "count_job_annotations = (select count(*) from algo_annotation aa left join image_instance ii on ii.id = aa.image_id where aa.deleted is null and ii.deleted is null and aa.project_id = p.id), " +
                "count_reviewed_annotations = (select count(*) from reviewed_annotation ra left join image_instance ii on ii.id = ra.image_id where ra.deleted is null and ii.deleted is null and ra.project_id = p.id);")

        sql.executeUpdate("UPDATE image_instance ii SET " +
                "count_image_annotations = (select count(*) from user_annotation ua where ua.deleted is null and ua.image_id = ii.id), " +
                "count_image_job_annotations = (select count(*) from algo_annotation aa where aa.deleted is null and aa.image_id = ii.id), " +
                "count_image_reviewed_annotations = (select count(*) from reviewed_annotation ra where ra.deleted is null and ra.image_id = ii.id);")

        log.info("Delete old attached file thumbs")
        sql.executeUpdate("delete from attached_file where domain_class_name = 'be.cytomine.image.AbstractImage' and name = 'thumb';")

        log.info("Update reference of attached files that are used in description (only for project)")
        sql.executeUpdate("update attached_file set domain_class_name = 'be.cytomine.utils.Description', " +
                "domain_ident = description.id " +
                "from description " +
                "where attached_file.domain_ident = description.domain_ident " +
                "and attached_file.domain_class_name = 'be.cytomine.project.Project';")

        log.info("Update attached files names of job logs to be displayed in webUI")
        sql.executeUpdate("update attached_file set filename = 'log.out', name = 'log.out' " +
                "where domain_class_name = 'be.cytomine.processing.Job' and filename like '%.out';")

        sql.close()
    }

    void init20190204() {
        log.info "20190204"

        boolean exists = new Sql(dataSource).rows("SELECT column_name " +
                "FROM information_schema.columns " +
                "WHERE table_name='job' and column_name='favorite';").size() == 1;
        if (!exists) {
            new Sql(dataSource).executeUpdate("ALTER TABLE job ADD COLUMN favorite boolean NOT NULL DEFAULT false;")
        }
    }

    void init20181206() {
        log.info "20181206"
        bootstrapUtilsService.createDisciplines(bootstrapDataService.defaultDisciplines())
        bootstrapUtilsService.createMetrics(bootstrapDataService.defaultMetrics())
    }

    void init20180904() {
        log.info "20180904"

        boolean exists = new Sql(dataSource).rows("SELECT column_name " +
                "FROM information_schema.columns " +
                "WHERE table_name='version' and column_name='major';").size() == 1;
        if (!exists) {
            new Sql(dataSource).executeUpdate("ALTER TABLE version ADD COLUMN major integer;")
            new Sql(dataSource).executeUpdate("ALTER TABLE version ADD COLUMN minor integer;")
            new Sql(dataSource).executeUpdate("ALTER TABLE version ADD COLUMN patch integer;")
        }
    }

    void init20180701() {
        log.info "20180701"

        boolean exists = new Sql(dataSource).rows("SELECT column_name " +
                "FROM information_schema.columns " +
                "WHERE table_name='configuration' and column_name='reading_role';").size() == 1;
        if (!exists) {
            new Sql(dataSource).executeUpdate("ALTER TABLE configuration ADD COLUMN reading_role varchar(255) NOT NULL DEFAULT 'ADMIN';")

            String request = "SELECT id FROM configuration;"
            def sql = new Sql(dataSource)
            def data = []
            sql.eachRow(request) {
                data << it[0]
            }
            sql.close()
            if(data.size() > 0) new Sql(dataSource).executeUpdate("UPDATE configuration SET reading_role = 'ADMIN' WHERE id IN (" + data.join(",") + ");")

            request = "SELECT id FROM configuration WHERE reading_role_id = "+SecRole.findByAuthority("ROLE_USER").id+";"
            sql = new Sql(dataSource)
            data = []
            sql.eachRow(request) {
                data << it[0]
            }
            sql.close()
            if(data.size() > 0) new Sql(dataSource).executeUpdate("UPDATE configuration SET reading_role = 'USER' WHERE id IN (" + data.join(",") + ");")


            new Sql(dataSource).executeUpdate("ALTER TABLE configuration DROP COLUMN reading_role_id;")
        }
    }

    void init20180409() {
        log.info "20180409"
        //unused domain
        log.info "drop table"
        new Sql(dataSource).executeUpdate("DROP TABLE image_property;")

        // add ltree column
        log.info "add ltree"
        boolean exists = new Sql(dataSource).rows("SELECT column_name " +
                "FROM information_schema.columns " +
                "WHERE table_name='uploaded_file' and column_name='l_tree';").size() == 1;
        if (!exists) {
            new Sql(dataSource).executeUpdate("CREATE EXTENSION ltree;")
            new Sql(dataSource).executeUpdate("ALTER TABLE uploaded_file ADD COLUMN l_tree ltree;")
        }

        // update ltree
        log.info "update ltree : step 1"
        log.info "record to update : "+UploadedFile.countByParentIsNullAndLTreeIsNull()
        UploadedFile.findAllByParentIsNullAndLTreeIsNull().each {
            it.save()
        }
        def ufs
        log.info "update ltree : step 2"
        log.info "record to update : "+UploadedFile.countByParentIsNotNullAndLTreeIsNull()
        UploadedFile.findAllByParentIsNotNullAndLTreeIsNull().each {
            if(it.lTree == null) {
                ufs = [it]
                def current = it
                while(current.parent != null && current.parent.lTree == null){
                    ufs << current
                    current = current.parent
                }
                ufs = ufs.reverse()
                for(int i = 0;i<ufs.size();i++) {
                    ufs[i].save()
                }
            }
        }

        executorService.execute({

            try {
                log.info "create new uploadedfile"
                // recreate uploadedFile from abstractimage
                // only for converted abstract_image
                ufs = UploadedFile.createCriteria().list {
                    join("image")
                    createAlias("image", "i")
                    neProperty("filename", "i.path")

                    isNotNull("image")
                }
                log.info "record to update : "+ufs.size()

                int i = 0;

                ufs.each {
                    def uf = new UploadedFile()

                    uf.contentType = "image/pyrtiff"
                    uf.image = it.image

                    String filename = it.image.originalFilename
                    int index = filename.lastIndexOf('.')
                    filename = filename.substring(0, index) + "_pyr" + filename.substring(index)

                    uf.originalFilename = filename
                    uf.filename = it.image.path
                    uf.parent = it
                    uf.path = it.path
                    uf.ext = FilenameUtils.getExtension(it.image.path)
                    uf.status = 2 //UploadedFile.DEPLOYED
                    uf.user = it.user
                    uf.storages = StorageAbstractImage.findAllByAbstractImage(it.image).collect { it.storage.id }
                    uf.size = 0L

                    uf.save(failOnError: true)

                    it.image = null
                    it.status = 1 //UploadedFile.CONVERTED
                    it.save()

                    if (i % 100 == 0) log.info("done : " + i + "/" + ufs.size())
                    i++
                }
            } catch (Exception e) {
                log.info "Error during migration. Exit application"
                e.printStackTrace()
                System.exit(1)
            }
        } as Runnable)
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

        new Sql(dataSource).executeUpdate("UPDATE software SET deprecated = true WHERE deprecated IS NULL;")
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

    void init20171124() {
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

    void init20170201() {
        boolean exists = new Sql(dataSource).rows("SELECT column_name " +
                "FROM information_schema.columns " +
                "WHERE table_name='shared_annotation' and column_name='annotation_class_name';").size() == 1;
        if (!exists) {
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

    void init20160901() {

        boolean exists = new Sql(dataSource).rows("SELECT column_name " +
                "FROM information_schema.columns " +
                "WHERE table_name='project' and column_name='mode';").size() == 1;
        if (!exists) {
            new Sql(dataSource).executeUpdate("ALTER TABLE project ADD COLUMN mode varchar(255) NOT NULL DEFAULT 'CLASSIC';")

            String request = "SELECT id FROM project WHERE is_read_only;"
            def sql = new Sql(dataSource)
            def data = []
            sql.eachRow(request) {
                data << it[0]
            }
            sql.close()
            new Sql(dataSource).executeUpdate("UPDATE project SET mode = 'READ_ONLY' WHERE id IN (" + data.join(",") + ");")


            exists = new Sql(dataSource).rows("SELECT column_name " +
                    "FROM information_schema.columns " +
                    "WHERE table_name='project' and column_name='is_read_only';").size() == 1;
            if (exists) {
                log.info "reinit table..."
                new Sql(dataSource).executeUpdate("DROP VIEW user_project;")
                new Sql(dataSource).executeUpdate("DROP VIEW admin_project;")
                new Sql(dataSource).executeUpdate("DROP VIEW creator_project;")
                new Sql(dataSource).executeUpdate("ALTER TABLE project DROP COLUMN is_read_only;")
                tableService.initTable()
            }
        }

        List<Property> properties = Property.findAllByDomainClassNameAndKey(Project.name, "@CUSTOM_UI_PROJECT")
        def configProject;
        properties.each { prop ->
            configProject = JSON.parse(prop.value)
            configProject.each {
                it.value["CONTRIBUTOR_PROJECT"] = it.value["GUEST_PROJECT"]
                it.value.remove("GUEST_PROJECT")
                it.value.remove("USER_PROJECT")
            }
            prop.value = configProject.toString()

            prop.save(true)
        }
    }

    void init20160503() {
        bootstrapUtilsService.convertMimeTypes();
    }

    void init20160324() {
        new Sql(dataSource).executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS mime_type;")
        new Sql(dataSource).executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS converted_filename;")
        new Sql(dataSource).executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS converted_ext;")
        new Sql(dataSource).executeUpdate("ALTER TABLE uploaded_file DROP COLUMN IF EXISTS download_parent_id;")
    }

    void init20160224() {
        new Sql(dataSource).executeUpdate("DELETE FROM attached_file WHERE domain_class_name = 'be.cytomine.image.AbstractImage' AND (filename LIKE '%thumb%' OR filename LIKE '%nested%');")
    }
}