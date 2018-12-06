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


import be.cytomine.command.*
import be.cytomine.processing.Job
import be.cytomine.security.SecUser
import be.cytomine.utils.ModelService
import be.cytomine.utils.Task
import groovy.sql.GroovyResultSet
import groovy.sql.Sql

import static org.springframework.security.acls.domain.BasePermission.READ

class ImageInstanceMetricResultService extends ModelService {

    static transactional = true
    def cytomineService
    def commandService
    def modelService
    def transactionService
    def securityACLService
    def dataSource

    def currentDomain() {
        ImageInstanceMetricResult
    }

    def list(Job job, def aggregate) {
        if (aggregate) {
            list([job], [], aggregate)
        }
        else {
            securityACLService.check(job.container(),READ)
            ImageInstanceMetricResult.findAllByJob(job)
        }
    }

    def list(def jobs, def images, def aggregate) {
        securityACLService.checkGuest(cytomineService.currentUser)
        if (aggregate) {
            def jobIds = jobs.collect { it.id }
            def imageIds = images.collect { it.id }
            String select = "SELECT mr.metric_id as metric, mr.job_id as job, j.software_id as software "
            String from = "FROM metric_result mr " +
                    "LEFT JOIN job j ON j.id = mr.job_id "
            String where = "WHERE mr.job_id IN (" + jobIds.join(",") + ") "
            String groupby = "GROUP BY mr.metric_id, mr.job_id, j.software_id "

            if (images?.size() > 0) {
                select += ", mr.image_instance_id as image "
                where += "AND mr.image_instance_id IN (" + imageIds.join(",") + ") "
                groupby += ", mr.image_instance_id "
            }

            select += ", min(value) as minimum" +
                    ", max(value) as maximum" +
                    ", avg(value) as average" +
                    ", COALESCE(stddev_samp(value),0) as stddev "

            def query = select + from + where + groupby

            def sql = new Sql(dataSource)
            def data = []
            sql.eachRow(query) {
                def map = [:]

                for(int i =1; i<=((GroovyResultSet) it).getMetaData().getColumnCount(); i++){
                    String key = ((GroovyResultSet) it).getMetaData().getColumnName(i)
                    String objectKey = key.replaceAll( "(_)([A-Za-z0-9])", { Object[] test -> test[2].toUpperCase() } )
                    map.putAt(objectKey, it[key])
                }
                data << map
            }
            sql.close()

            return data
        }
        ImageInstanceMetricResult.findAllByJobInListAndImageInstanceInList(jobs, images)
    }

    def read(def id) {
        securityACLService.checkGuest(cytomineService.currentUser)
        ImageInstanceMetricResult.read(id)
    }

    def get(def id) {
        securityACLService.checkGuest(cytomineService.currentUser)
        ImageInstanceMetricResult.get(id)
    }

    /**
     * Add the new domain with JSON data
     * @param json New domain data
     * @return Response structure (created domain data,..)
     */
    def add(def json) {
        SecUser currentUser = cytomineService.getCurrentUser()
        securityACLService.checkAdmin(currentUser)
        return executeCommand(new AddCommand(user: currentUser),null,json)
    }

    /**
     * Delete this domain
     * @param domain Domain to delete
     * @param transaction Transaction link with this command
     * @param task Task for this command
     * @param printMessage Flag if client will print or not confirm message
     * @return Response structure (code, old domain,..)
     */
    def delete(ImageInstanceMetricResult domain, Transaction transaction = null, Task task = null, boolean printMessage = true) {
        SecUser currentUser = cytomineService.getCurrentUser()
        securityACLService.checkAdmin(currentUser)
        Command c = new DeleteCommand(user: currentUser,transaction:transaction)
        return executeCommand(c,domain,null)
    }

    def getStringParamsI18n(def domain) {
        return [domain.id]
    }
}
