package be.cytomine.processing.metric

import be.cytomine.image.multidim.ImageGroup

class ImageGroupMetricResult extends MetricResult {
    ImageGroup imageGroup

    static constraints = {
    }

    /**
     * Define fields available for JSON response
     * @param domain Domain source for json value
     * @return Map with fields (keys) and their values
     */
    static def getDataFromDomain(def domain) {
        def returnArray = MetricResult.getDataFromDomain(domain)
        returnArray['group'] = domain?.imageGroup?.id // 'image' instead of 'group' ?
        return returnArray
    }
}