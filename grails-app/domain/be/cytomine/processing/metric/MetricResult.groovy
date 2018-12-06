package be.cytomine.processing.metric

import be.cytomine.CytomineDomain
import be.cytomine.Exception.AlreadyExistException
import be.cytomine.processing.Job
import be.cytomine.processing.metric.Metric
import be.cytomine.utils.JSONUtils

class MetricResult extends CytomineDomain {

    Metric metric

    Job job

    Double value

    static belongsTo = [Metric, Job]

    static constraints = {
        metric(nullable: false)
        job(nullable: false)
        value(nullable: false)
    }

    static mapping = {
        id(generator: 'assigned', unique: true)
        sort "id"
    }

    /**
     * Define fields available for JSON response
     * @param domain Domain source for json value
     * @return Map with fields (keys) and their values
     */
    static def getDataFromDomain(def domain) {
        def returnArray = CytomineDomain.getDataFromDomain(domain)
        returnArray['job'] = domain?.job?.id
        returnArray['software'] = domain?.job?.software?.id
        returnArray['metric'] = domain?.metric?.id
//        returnArray['metricName'] = domain?.metric?.name
        returnArray['value'] = domain?.value
        return returnArray
    }

}
