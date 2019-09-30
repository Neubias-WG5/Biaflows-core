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

var ProjectUsersHeatmapView = GraphView.extend({
    initialize: function (options) {
        this.constructor.__super__.initialize.apply(this,[options]);
    },
    render: function () {
        this.constructor.__super__.render.apply(this);
        var self = this;

        var margin = { top: 30, right: 0, bottom: 100, left: 30 },
            width = 960 - margin.left - margin.right,
            height = 430 - margin.top - margin.bottom,
            gridSize = Math.floor(width / 24),
            legendElementWidth = gridSize*2,
            buckets = 9,
            colors = ["#ffffff","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"], // alternatively colorbrewer.YlGnBu[9]
            days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
            times = ["0a", "1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12a", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p"];

        var svg = d3.select(this.el)
            .append("div")
            .classed("svg-container", true) //container class to make it responsive
            .append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox","0 0 960 430")
            .classed("heatmap", true)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var pivot = new Date().getDay();
        if(pivot>0) {
            var toRotate = days.slice(pivot);
            days = days.slice(0,pivot);
            for(var i = toRotate.length-1; i>=0 ;i--) {
                days.unshift(toRotate[i]);
            }
        }

        svg.selectAll(".dayLabel")
            .data(days)
            .enter().append("text")
            .text(function (d) { return d; })
            .attr("x", 0)
            .attr("y", function (d, i) { return i * gridSize; })
            .style("text-anchor", "end")
            .attr("transform", "translate(-6," + gridSize / 1.5 + ")")
            .attr("class", function (d, i) { return ((i >= 0 && i <= 4) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis"); });

        svg.selectAll(".timeLabel")
            .data(times)
            .enter().append("text")
            .text(function(d) { return d; })
            .attr("x", function(d, i) { return i * gridSize; })
            .attr("y", 0)
            .style("text-anchor", "middle")
            .attr("transform", "translate(" + gridSize / 2 + ", -6)")
            .attr("class", function(d, i) { return ((i >= 7 && i <= 16) ? "timeLabel mono axis axis-worktime" : "timeLabel mono axis"); });

        var lastDay = new Date();
        lastDay.setHours(23);
        lastDay.setMinutes(0);
        lastDay.setSeconds(0);
        var firstDay = new Date();
        firstDay.setDate(lastDay.getDate()-6);
        firstDay.setHours(0);
        firstDay.setMinutes(0);
        firstDay.setSeconds(0);

        // TODO use one Model.url() instead
        d3.json("api/project/" + self.model.get('id') + "/connectionFrequency.json?heatmap=true&afterThan="+firstDay.getTime(), function(error, data) {

            data = data.collection;

            data.sort(function(a, b){
                return a.time-b.time;
            });

            // nb of rect
            var arrSize = (Math.floor((lastDay-firstDay)/(1000*60*60*24))+1)*24;

            var newData = [];
            for(var i =0;i<arrSize;i++){
                newData.push(null);
            }

            for(var i =0;i<data.length;i++){
                // count the difference of hours.
                var index = (Math.round((data[i].time-firstDay)/(1000*60*60)));
                // put date[i] at the right place in newData

                var item = {};
                var date = new Date(parseInt(data[i].time));
                item['day'] = date.getDay();
                item['dayOfMonth'] = date.getDate();
                item['hour'] = date.getHours();
                item['value'] = data[i].frequency;

                newData[index] = item;
            }


            if(newData[0] == null) {
                var item = {};

                item['day'] = firstDay.getDay();
                item['dayOfMonth'] = firstDay.getDate();
                item['hour'] = firstDay.getHours();
                item['value'] = 0;

                newData[0] = item;
            }

            for(var i =0;i<arrSize;i++){
                // if null, fill from previous value
                if(newData[i] == null) {
                    var item = {};
                    if(newData[i-1].hour === 23) {
                        item['day'] = (newData[i-1].day+1)%7;
                        // TODO if month will be used
                        //item['dayOfMonth'] = date.getDate();
                        item['hour'] = 0;
                    } else {
                        item['day'] = newData[i-1].day;
                        // TODO if month will be used
                        //item['dayOfMonth'] = date.getDate();
                        item['hour'] = newData[i-1].hour+1;
                    }
                    item['value'] = 0;
                    newData[i] = item;
                }
            }

            data = newData;

            var colorScale = d3.scale.quantile()
                .domain([0, buckets - 1, d3.max(data, function (d) { return d.value; })])
                .range(colors);

            var tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .attr("style", "position: absolute; text-align: center; width: 80px; height: 28px; padding: 2px; font: 12px sans-serif; background: lightsteelblue; border: 0px; border-radius: 8px; pointer-events: none;")
                .style("opacity", 0);




            var cards = svg.selectAll(".hour")
                .data(data, function(d) {return d.day+':'+d.hour;});

            cards.append("title");

            cards.enter().append("rect")
                .attr("x", function(d) { return (d.hour) * gridSize; })
                // because -x%y = -x ...
                // see http://javascript.about.com/od/problemsolving/a/modulobug.htm
                .attr("y", function(d) { return ((((d.day -pivot - 1)%7)+7)%7) * gridSize; })
                .attr("rx", 4)
                .attr("ry", 4)
                .attr("style", "stroke: #E6E6E6;stroke-width:2px;")
                .attr("width", gridSize)
                .attr("height", gridSize)
                .style("fill", colors[0])
                .on("mouseover", function(d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip .html(d.value + " Connections")
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            cards.transition().duration(1000)
                .style("fill", function(d) {
                    return colorScale(d.value);
                });

            cards.select("title").text(function(d) { return d.value; });

            cards.exit().remove();

            var legend = svg.selectAll(".legend")
                .data([0].concat(colorScale.quantiles()), function(d) { return d; });

            legend.enter().append("g")
                .attr("class", "legend");

            legend.append("rect")
                .attr("x", function(d, i) { return legendElementWidth * i; })
                .attr("y", height)
                .attr("width", legendElementWidth)
                .attr("height", gridSize / 2)
                .attr("style", "stroke: #E6E6E6;stroke-width:2px;")
                .style("fill", function(d, i) { return colors[i]; });

            legend.append("text")
                .attr("class", "mono")
                .text(function(d) { return "≥ " + Math.round(d); })
                .attr("x", function(d, i) { return legendElementWidth * i; })
                .attr("y", height + gridSize);

            legend.exit().remove();
        });
    }
});
