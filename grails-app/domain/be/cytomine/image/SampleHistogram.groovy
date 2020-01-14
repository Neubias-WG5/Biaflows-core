package be.cytomine.image

import be.cytomine.CytomineDomain
import be.cytomine.Exception.AlreadyExistException
import be.cytomine.utils.JSONUtils

class SampleHistogram extends CytomineDomain implements Serializable {

    AbstractSlice slice

    Integer sample

    Integer min

    Integer max

    Long[] histogram

    Long[] histogram256

    static belongsTo = [AbstractSlice]

    static mapping = {
        id(generator: 'assigned', unique: true)
    }

    static constraints = {
    }

    void checkAlreadyExist() {
        SampleHistogram.withNewSession {
            SampleHistogram sh = SampleHistogram.findBySliceAndSample(slice, sample)
            if (sh?.id != id)
                throw new AlreadyExistException("SampleHistogram (sample: $sample) already exists for AbstractSlice ${slice?.id}")
        }
    }

    static SampleHistogram insertDataIntoDomain(def json, def domain = new SampleHistogram()) {
        domain.id = JSONUtils.getJSONAttrLong(json,'id',null)
        domain.created = JSONUtils.getJSONAttrDate(json,'created')
        domain.updated = JSONUtils.getJSONAttrDate(json,'updated')
        domain.deleted = JSONUtils.getJSONAttrDate(json, "deleted")

        domain.slice = JSONUtils.getJSONAttrDomain(json, "slice", new AbstractSlice(), true)
        domain.sample = JSONUtils.getJSONAttrInteger(json, "sample", 0)
        domain.min = JSONUtils.getJSONAttrInteger(json, "min", 0)
        domain.max = JSONUtils.getJSONAttrInteger(json, "max", 0)

        domain.histogram = JSONUtils.getJSONAttrListLong(json, "histogram")
        domain.histogram256 = JSONUtils.getJSONAttrListLong(json, "histogram256")

        domain
    }

    static def getDataFromDomain(def domain) {
        def returnArray = CytomineDomain.getDataFromDomain(domain)
        returnArray['slice'] = domain?.slice?.id
        returnArray['sample'] = domain?.sample
        returnArray['min'] = domain?.min
        returnArray['max'] = domain?.max
        returnArray['histogram'] = domain?.histogram
        returnArray['histogram256'] = domain?.histogram256

        returnArray
    }

    CytomineDomain[] containers() {
        return slice?.containers()
    }
}
