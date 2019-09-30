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

var ProjectUsersTotalActivitiesGraph = Backbone.View.extend({
    initialize: function () {
        this.url = this.options.url;
        this.property = this.options.property;
    },
    render: function () {
        var self = this;

        var diameter = 500,
            format = d3.format(",d"),
            color = d3.scale.category20c();

        var bubble = d3.layout.pack()
            .sort(null)
            .size([diameter, diameter])
            .padding(1.5);

        var svg = d3.select(this.el)
            .append("div")
            .classed("svg-container", true) //container class to make it responsive
            .append("svg")
            //responsive SVG needs these 2 attributes and no width and height attr
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox","0 0 500 500")


        var data;
        d3.json(self.url, function(error, root) {
            if (error) throw error;

            data = root;

            var node = svg.selectAll(".node")
                .data(bubble.nodes(classes(root))
                    .filter(function(d) { return !d.children; }))
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", function(d) {return "translate(" + d.x + "," + d.y + ")"; });

            node.append("title")
                .text(function(d) {return d.className + ": " + format(d.value); });

            node.append("circle")
                .attr("r", function(d) { return d.r; })
                .style("fill", function(d) { return color(d.packageName); });

            node.append("text")
                .attr("dy", ".3em")
                .style("text-anchor", "middle")
                .text(function(d) { return d.className.substring(0, d.r / 3); });
        });

        function classes(root) {
            var classes = [];

            for(var i=0; i<root.collection.length;i++) {
                classes.push({packageName: root.collection[i].username, className: root.collection[i].username, value: root.collection[i][self.property]});
            }

            return {children: classes};
        }

    }
});
