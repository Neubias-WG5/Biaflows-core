package be.cytomine.processing.metric

import be.cytomine.Exception.AlreadyExistException
import be.cytomine.image.multidim.ImageGroup
import be.cytomine.processing.Job
import be.cytomine.utils.JSONUtils

class ImageGroupMetricResult extends MetricResult {
    ImageGroup imageGroup

    static constraints = {
        imageGroup(nullable: false)
    }
    void checkAlreadyExist() {
        ImageGroupMetricResult.withNewSession {
            if(job && metric && imageGroup) {
                ImageGroupMetricResult metricAlreadyExist = ImageGroupMetricResult.findByMetricAndJobAndImageGroup(metric, job, imageGroup)
                if(metricAlreadyExist && (metricAlreadyExist.id!=id))  {
                    throw new AlreadyExistException("MetricResult for job "+ job.id + " and metric "+ metric.name + " on image "+ imageGroup.id +" already exist!")
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
        returnArray['image'] = domain?.imageGroup?.id // 'image' instead of 'group' ?
        return returnArray
    }

    /**
     * Insert JSON data into domain in param
     * @param domain Domain that must be filled
     * @param json JSON containing data
     * @return Domain with json data filled
     */
    static ImageGroupMetricResult insertDataIntoDomain(def json, def domain = new ImageGroupMetricResult()) {
        domain.id = JSONUtils.getJSONAttrLong(json,'id',null)
        domain.imageGroup = JSONUtils.getJSONAttrDomain(json, "image", new ImageGroup(), true)
        domain.job = JSONUtils.getJSONAttrDomain(json, "job", new Job(), true)
        domain.metric = JSONUtils.getJSONAttrDomain(json, "metric", new Metric(), true)
        domain.value = JSONUtils.getJSONAttrDouble(json, 'value', 0)
        return domain;
    }
}