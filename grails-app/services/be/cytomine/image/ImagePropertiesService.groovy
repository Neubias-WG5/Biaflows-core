package be.cytomine.image

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

import be.cytomine.ontology.Property
import grails.converters.JSON

/**
 * Cytomine
 * User: stevben
 * Date: 19/07/11
 * Time: 15:19
 * TODOSTEVBEN: doc + clean + refactor
 */
class ImagePropertiesService implements Serializable{

    def grailsApplication
    def abstractImageService

    def clear(AbstractImage image) {
        Property.findAllByDomainIdent(image.id)?.each {
            it.delete()
        }
    }

    def populate(AbstractImage abstractImage) {
        String imageServerURL = abstractImage.getRandomImageServerURL()
        String fif = abstractImage.absolutePath
        String mimeType = abstractImage.mimeType

        String uri = "$imageServerURL/image/properties?fif="+URLEncoder.encode(fif, "UTF-8")+"&mimeType=$mimeType"
        println uri
        def properties = JSON.parse(new URL(uri).text)
        println properties
        properties.each {
            String value = it.value
            if (it.value && value.size() < 256) {
                def property = Property.findByDomainIdentAndKey(abstractImage.id, it.key)
                if (!property) {
                    property = new Property(key: it.key, value: it.value, domainIdent: abstractImage.id,domainClassName: abstractImage.class.name)
                    log.info("new property, $it.key => $it.value")
                    property.save(failOnError: true)
                }
            }
        }
        abstractImage.save()
    }


    def extractUseful(AbstractImage image) {
        def magnificationProperty = Property.findByDomainIdentAndKey(image.id, "cytomine.magnification")
        if (magnificationProperty) image.setMagnification(Integer.parseInt(magnificationProperty.getValue()))
        else log.info "magnificationProperty is null"
        //Width
        def widthProperty = Property.findByDomainIdentAndKey(image.id, "cytomine.width")
        if (widthProperty) image.setWidth(Integer.parseInt(widthProperty.getValue()))
        else log.error "widthProperty is null"
        //Height
        def heightProperty = Property.findByDomainIdentAndKey(image.id, "cytomine.height")
        if (heightProperty) image.setHeight(Integer.parseInt(heightProperty.getValue()))
        else log.error "heightProperty is null"
        //Resolution
        def resolutionProperty = Property.findByDomainIdentAndKey(image.id, "cytomine.resolution")
        if (resolutionProperty) image.setResolution(Float.parseFloat(resolutionProperty.getValue()))
        else log.info "resolutionProperty is null"
        //Bit depth
        def bitdepthProperty = Property.findByDomainIdentAndKey(image.id, "cytomine.bitdepth")
        if (bitdepthProperty) image.setBitDepth(Integer.parseInt(bitdepthProperty.getValue()))
        else log.error "bitdepthProperty is null"
        //Colorspace
        def colorspaceProperty = Property.findByDomainIdentAndKey(image.id, "cytomine.colorspace")
        if (colorspaceProperty) image.setColorspace(colorspaceProperty.getValue())
        else log.error "colorspaceProperty is null"
        image.save(flush:true, failOnError: true)
    }
}
