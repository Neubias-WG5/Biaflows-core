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

import be.cytomine.api.UrlApi
import be.cytomine.image.AbstractImage
import be.cytomine.image.ImageInstance
import be.cytomine.image.UploadedFile
import groovy.sql.Sql
import org.hibernate.FetchMode

class DataTablesService {

    //TODO: document this methods + params

    def dataSource
    def cytomineService
    def securityACLService
    def currentRoleServiceProxy

    def process(params, domain, restrictions, returnFields, project) {
        params.max = params['length'] ? params['length'] as int : 10;
        params.offset = params.start ? params.start as int : 0;

        String abstractImageAlias = "ai"
        String _search = params["search[value]"] ? "%"+params["search[value]"]+"%" : "%"

        def col = params["order[0][column]"];
        def sort = params["order[0][dir]"];
        def sortProperty = "columns[$col][data]"
        def property = params[sortProperty]

        if(domain==ImageInstance) {
            List<ImageInstance> images = ImageInstance.createCriteria().list() {
                createAlias("baseImage", abstractImageAlias)
                eq("project", project)
                isNull("parent")
                isNull("deleted")
                fetchMode 'baseImage', FetchMode.JOIN
                ilike(abstractImageAlias + ".originalFilename", _search)
            }

            if(property) {
                images.sort {
                    //id, name,....


                    def data;

                    if(property.equals("numberOfAnnotations")) {
                        data = it.countImageAnnotations
                    } else if(property.equals("numberOfJobAnnotations")) {
                        data = it.countImageJobAnnotations
                    }else if(property.equals("numberOfReviewedAnnotations")) {
                        data = it.countImageReviewedAnnotations
                    }else if(property.equals("originalFilename")) {
                        data = it.baseImage.originalFilename
                    }else if(property.equals("width")) {
                        data = it.baseImage.width
                    }else if(property.equals("height")) {
                        data = it.baseImage.height
                    }else if(property.equals("resolution")) {
                        data = it.baseImage.resolution
                    }else if(property.equals("magnification")) {
                        data = it.baseImage.magnification
                    }else {
                        data = it."$property"
                    }

                    return data
                }

                //if desc order, inverse
                if(sort.equals("desc")) {
                    images = images.reverse()
                }
            }


            return images
        } else if(domain==AbstractImage) {


            //FIRST OF UNION: take all image in project
            //SECOND OF UNION: take all image NOT IN this project

            String request ="""
                    SELECT DISTINCT ai.id, ai.original_filename, ai.created as created, true
                    FROM abstract_image ai LEFT OUTER JOIN image_instance ii ON ii.base_image_id = ai.id ${getAclTable()}
                    WHERE project_id = ${project.id}
                    AND ai.deleted IS NULL
                    AND ii.deleted IS NULL
                    AND ${(_search? "ai.original_filename ilike '%${_search}%'" : "")}
                    ${getAclWhere()}
                    UNION
                    SELECT DISTINCT ai.id, ai.original_filename, ai.created as created, false
                    FROM abstract_image ai ${getAclTable()}
                    WHERE ai.deleted IS NULL
                    AND ai.id NOT IN (SELECT ai.id
                                     FROM abstract_image ai LEFT OUTER JOIN image_instance ii ON ii.base_image_id = ai.id
                                     WHERE project_id = ${project.id}
                                     AND ii.deleted IS NULL)
                    AND ${(_search? "ai.original_filename ilike '%${_search}%'" : "")}
                     ${getAclWhere()}
                    ORDER BY created desc
                """

                log.info request
//
//
//                    "SELECT ai.id, ai.original_filename, ai.created as created, true\n" +
//                    "FROM abstract_image ai LEFT OUTER JOIN image_instance ii ON ii.base_image_id = ai.id\n" +
//                    "WHERE project_id = ${project.id}\n" +
//                    "AND ii.deleted IS NULL\n" +
//                    (_search? "AND ai.original_filename ilike '%${_search}%'" : "") +
//                    "UNION\n" +
//                    "SELECT ai.id, ai.original_filename, ai.created as created, false\n" +
//                    "FROM abstract_image ai\n" +
//                    "WHERE id NOT IN (SELECT ai.id\n" +
//                    "                 FROM abstract_image ai LEFT OUTER JOIN image_instance ii ON ii.base_image_id = ai.id\n" +
//                    "                 WHERE project_id = ${project.id}\n" +
//                    "                 AND ii.deleted IS NULL) " +
//                    (_search? "AND ai.original_filename ilike '%${_search}%'" : "") +
//                    " ORDER BY created desc"


            def data = []
            def sql = new Sql(dataSource)
            sql.eachRow(request) {
                def img = [:]
                img.id=it[0]
                img.originalFilename=it[1]
                img.created=it[2]
                img.thumb = UrlApi.getAbstractImageThumbURL(img.id)
                img.inProject = it[3]
                data << img
            }
            try {
                sql.close()
            }catch (Exception e) {}

            data.sort {
                //id, name,....
                return it."$property"
            }

            //if desc order, inverse
            if(sort.equals("desc")) {
                log.info "reverse"
                data = data.reverse()
            }

            return data
        } else if(domain==UploadedFile) {
            return getUploadedFilesTable(params, _search, col, sort, property)
        }

    }

    private def getUploadedFilesTable(def params, String _search, String col, String sort, String property){
        String order = "uf.created"
        if(property) {
            if(property.equals("size") || property.equals("created")) {
                order = "uf.$property"
            }else {
                order = "$property"
            }
        }
        order += sort.equals("asc") ? " ASC" : " DESC"
        String request =
                "SELECT uf.id, uf.content_type as contentType, uf.created, uf.filename, uf.original_filename as originalFilename, uf.size, uf.status, \n" +
                        "parent.original_filename as parentFilename, uf.parent_id as parentId, \n" +
                        "COUNT(tree.id) as nbChildren, " +
                        "COALESCE(SUM(tree.size),0)+uf.size as globalSize, " +
                        "CASE WHEN COUNT(tree.id) = 0 THEN uf.image_id ELSE MAX(tree.image_id) END as preview_image_id \n" +
                        "FROM uploaded_file uf\n" +
                        "  LEFT JOIN (\n" +
                        "    SELECT * FROM uploaded_file\n" +
                        "  ) tree ON (tree.l_tree <@ uf.l_tree AND tree.id != uf.id)\n" +
                        "  LEFT JOIN (\n" +
                        "    SELECT * FROM uploaded_file\n" +
                        "  ) parent ON parent.id = uf.parent_id\n" +
                        "WHERE uf.content_type NOT similar to '%zip|ome%' AND (uf.parent_id is null OR parent.content_type similar to '%zip|ome%') \n" +
                        "AND uf.user_id = "+cytomineService.currentUser.id+" \n" +
                        "AND uf.original_filename LIKE '"+_search+"' \n" +
                        "GROUP BY uf.id, parent.original_filename \n" +
                        "ORDER BY "+order+"\n" /*+
                        "LIMIT "+params.max+" OFFSET "+ params.offset
        params.max = 0;
        params.offset = 0; ==> will not return the total size so pagination will not work !
        */
        def data = []
        def sql = new Sql(dataSource)
        sql.eachRow(request) {
            def row = [:]
            int i = 0
            row.id = it[i++]

            row.contentType = it[i++]
            row.created = it[i++]
            row.filename = it[i++]
            row.originalFilename = it[i++]
            row.size = it[i++]
            row.status = it[i++]
            row.parentFilename = it[i++]
            row.parentId = it[i++]
            row.nbChildren = it[i++]
            row.globalSize = it[i++]

            Long imageId = it[i++]
            row.thumbURL =  ((row.status == UploadedFile.DEPLOYED || row.status == UploadedFile.CONVERTED) && imageId) ? UrlApi.getAbstractImageThumbURL(imageId) : null
            data << row
        }
        sql.close()

        return data

    }

    private String getAclTable() {
        if(currentRoleServiceProxy.isAdminByNow(cytomineService.currentUser)) {
            return ""
        } else {
            return ", storage_abstract_image, acl_object_identity, acl_entry, acl_sid"
        }
    }

    private String getAclWhere() {
        if(currentRoleServiceProxy.isAdminByNow(cytomineService.currentUser)) {
            return ""
        } else {
            return """
                    AND storage_abstract_image.abstract_image_id = ai.id
                    AND acl_object_identity.object_id_identity = storage_abstract_image.storage_id
                    AND acl_entry.acl_object_identity = acl_object_identity.id
                    AND acl_entry.sid = acl_sid.id
                    AND acl_sid.sid like '${cytomineService.currentUser.username}'
            """
        }
    }
}
