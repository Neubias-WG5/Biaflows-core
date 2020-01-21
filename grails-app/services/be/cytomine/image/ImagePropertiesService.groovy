package be.cytomine.image

import be.cytomine.ontology.Property

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

class ImagePropertiesService implements Serializable {

    def grailsApplication
    def abstractImageService
    def imageServerService

    def keys() {
        def parseString = { x -> x }
        def parseInt = { x -> Integer.parseInt(x) }
        def parseDouble = { x -> Double.parseDouble(x) }
        return [
                width        : [name: 'cytomine.width', parser: parseInt],
                height       : [name: 'cytomine.height', parser: parseInt],
                depth        : [name: 'cytomine.depth', parser: parseInt],
                duration     : [name: 'cytomine.duration', parser: parseInt],
                channels     : [name: 'cytomine.channels', parser: parseInt],
                physicalSizeX: [name: 'cytomine.physicalSizeX', parser: parseDouble],
                physicalSizeY: [name: 'cytomine.physicalSizeY', parser: parseDouble],
                physicalSizeZ: [name: 'cytomine.physicalSizeZ', parser: parseDouble],
                fps          : [name: 'cytomine.fps', parser: parseDouble],
                bitPerSample : [name: 'cytomine.bitPerSample', parser: parseInt],
                samplePerPixel: [name: 'cytomine.samplePerPixel', parser: parseInt],
                colorspace   : [name: 'cytomine.colorspace', parser: parseString],
                magnification: [name: 'cytomine.magnification', parser: parseInt],
                resolution   : [name: 'cytomine.resolution', parser: parseDouble]
        ]
    }

    def clear(AbstractImage image) {
        def propertyKeys = keys().collect { it.value.name }
        Property.findAllByDomainIdentAndKeyInList(image.id, propertyKeys)?.each {
            it.delete()
        }
    }

    def populate(AbstractImage image) {
        try {
            def properties = imageServerService.properties(image)
            properties.each {
                String key = it?.key?.toString()?.trim()
                String value = it?.value?.toString()?.trim()
                if (key && value) {
                    def property = Property.findByDomainIdentAndKey(image.id, key)
                    if (!property) {
                        log.info("New property: $key => $value for abstract image $image")
                        property = new Property(key: key, value: value, domainIdent: image.id, domainClassName: image.class.name)
                        property.save(failOnError: true)
                    }
                }
            }
        } catch(Exception e) {
            log.error(e)
        }
    }

    def extractUseful(AbstractImage image) {
        keys().each { k, v ->
            def property = Property.findByDomainIdentAndKey(image.id, v.name)
            if (property)
                image[k] = v.parser(property.value)
            else
                log.info "No property ${v.name} for abstract image $image"

            image.save(flush: true, failOnError: true)
        }
    }

    def regenerate(AbstractImage image) {
        clear(image)
        populate(image)
        extractUseful(image)
    }
}
