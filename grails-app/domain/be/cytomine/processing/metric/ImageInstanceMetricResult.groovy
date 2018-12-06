package be.cytomine.processing.metric

import be.cytomine.Exception.AlreadyExistException
import be.cytomine.image.ImageInstance
import be.cytomine.processing.Job
import be.cytomine.processing.Software
import be.cytomine.utils.JSONUtils

class ImageInstanceMetricResult extends MetricResult {
    ImageInstance imageInstance

    static constraints = {
        imageInstance(nullable: false)
    }

    void checkAlreadyExist() {
        ImageInstanceMetricResult.withNewSession {
            if(job && metric && imageInstance) {
                ImageInstanceMetricResult metricAlreadyExist = ImageInstanceMetricResult.findByMetricAndJobAndImageInstance(metric, job, imageInstance)
                if(metricAlreadyExist && (metricAlreadyExist.id!=id))  {
                    throw new AlreadyExistException("MetricResult for job "+ job.id + " and metric "+ metric.name + " on image "+ imageInstance.id +" already exist!")
                }
            }
        }
    }

    /**
     * Define fields available for JSON response
     * @param domain Domain source for json value
     * @return Map with fields (keys) and their values
     */
    static def getDataFromDomain(def domain) {
        def returnArray = MetricResult.getDataFromDomain(domain)
        returnArray['image'] = domain?.imageInstance?.id
        return returnArray
    }


    /**
     * Insert JSON data into domain in param
     * @param domain Domain that must be filled
     * @param json JSON containing data
     * @return Domain with json data filled
     */
    static ImageInstanceMetricResult insertDataIntoDomain(def json, def domain = new ImageInstanceMetricResult()) {
        domain.id = JSONUtils.getJSONAttrLong(json,'id',null)
        domain.imageInstance = JSONUtils.getJSONAttrDomain(json, "image", new ImageInstance(), true)
        domain.job = JSONUtils.getJSONAttrDomain(json, "job", new Job(), true)
        domain.metric = JSONUtils.getJSONAttrDomain(json, "metric", new Metric(), true)
        domain.value = JSONUtils.getJSONAttrDouble(json, 'value', 0)
        return domain;
    }
}
