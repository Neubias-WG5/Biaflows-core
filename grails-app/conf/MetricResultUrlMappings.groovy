/*
* Copyright (c) 2009-2018. Authors: see NOTICE file.
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


class MetricResultUrlMappings {

    static mappings = {
        "/api/imageinstancemetricresult.$format"(controller:"restImageInstanceMetricResult"){
            action = [GET: "list",POST:"add"]
        }
        "/api/imageinstancemetricresult/$id.$format"(controller:"restImageInstanceMetricResult"){
            action = [GET:"show", DELETE:"delete"]
        }
        "/api/job/$id/imageinstancemetricresult.$format"(controller:"restImageInstanceMetricResult"){
            action = [GET:"listByJob"]
        }

        "/api/imagegroupmetricresult.$format"(controller:"restImageGroupMetricResult"){
            action = [GET: "list",POST:"add"]
        }
        "/api/imagegroupmetricresult/$id.$format"(controller:"restImageGroupMetricResult"){
            action = [GET:"show", DELETE:"delete"]
        }
        "/api/job/$id/imagegroupmetricresult.$format"(controller:"restImageGroupMetricResult"){
            action = [GET:"listByJob"]
        }
    }
}
