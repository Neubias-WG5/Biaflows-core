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

var AnnotationPropertyLayer = function (imageID, layer, browseImageView, key) {

    var self = this;
    this.idImage = imageID;
    this.layer = layer;
    this.idUser = layer.userID;

    this.browseImageView = browseImageView;
    this.map = browseImageView.map;
    this.vectorLayer = null;
    this.key = key;

    this.color = localStorage.getItem("colorAnnotationProperty-"+self.idImage);
    if(self.color == null) {
        self.color = "black";
    }

    this.styleMap = new OpenLayers.StyleMap({'default':{
        label : "${value}",
        fontColor: "#"+self.color,
        fontSize: "24pt",
        fontWeight: "bold",
        labelAlign:"lt"
    }});

    this.vectorLayer = new OpenLayers.Layer.Vector("annotationPropertyValue", {
        styleMap : self.styleMap,
        onFeatureInsert: function(	feature	) {$("text > tspan").attr("font-size","30px")}, //="48pt"
        strategies: [
            new OpenLayers.Strategy.BBOX({resFactor: 1})
        ],
        protocol: new OpenLayers.Protocol.Script({
            url: new AnnotationPropertyTextCollection({idUser: this.idUser, idImage: this.idImage, key: this.key}).url().replace("json", "jsonp"),
            format: new OpenLayers.Format.AnnotationProperty({annotationPropertyLayer: this}),
            callbackKey: "callback"
        })
    });

    this.addToMap = function() {
        this.map.addLayer(this.vectorLayer);
    };

    this.setZIndex = function(index) {
        this.vectorLayer.setZIndex( index );
    };

    this.removeFromMap = function() {
        this.map.removeLayer(this.vectorLayer);
    };
}

OpenLayers.Format.AnnotationProperty = OpenLayers.Class(OpenLayers.Format, {
    read: function (collection) {

        var self = this;

        var idAnnotations = $.map(self.annotationPropertyLayer.layer.vectorsLayer.features, function( n, i ) {
            return ( n.attributes.idAnnotation);
        });

        var nestedCollection = collection.collection;

        var featuresMap = {}

        _.each(nestedCollection, function (result) {

            // only add properties on visible annotations
            if($.inArray(result.idAnnotation, idAnnotations) > -1) {
                var samePointValue = featuresMap[result.x + "_" + result.y];
                if(samePointValue) {
                    featuresMap[result.x + "_" + result.y] = samePointValue + " ; " + result.value
                } else {
                    featuresMap[result.x + "_" + result.y] = result.value
                }
            }
        });
        console.log("featuresMap");
        console.log(featuresMap);

        var features = [];

              for (var prop in featuresMap) {
                 // important check that this is objects own property
                 // not from prototype prop inherited
                 if(featuresMap.hasOwnProperty(prop)){
                     var x = parseFloat(prop.split("_")[0]);
                     var y = parseFloat(prop.split("_")[1]);
                     var value = featuresMap[prop];
                     var format = new OpenLayers.Format.WKT();
                     var geom = "POINT("+(x)+" " + (y)+")";
                     console.log(geom);
                     var pointFeature = new OpenLayers.Feature.Vector(format.read(geom).geometry);
                     pointFeature.attributes = { value: value};
                     features.push(pointFeature);
                 }
              }
        console.log("features");
        console.log(features);



        return features;




    }
});

