package be.cytomine.test.http

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

import be.cytomine.test.Infos

class AnnotationActionAPI extends DomainAPI {

    static def create(def json, String username, String password) {
        String URL = Infos.CYTOMINEURL + "/api/annotationaction.json"
        def result = doPOST(URL,json,username,password)
        return result
    }

    static def countByProject(Long id, String username, String password, Long startDate=null, Long endDate=null) {
        String URL = Infos.CYTOMINEURL + "/api/project/$id/annotationaction/count.json?" +
                (startDate ? "&startDate=$startDate" : "") +
                (endDate ? "&endDate=$endDate" : "")
        return doGET(URL, username, password)
    }

    static def listByImage(Long idImage, String username, String password, Long afterThan = null, Long beforeThan = null) {
        String URL = Infos.CYTOMINEURL + "/api/imageinstance/$idImage/annotationactions.json?showDetails=true"
        if(afterThan) URL += "&afterThan=$afterThan"
        if(beforeThan) URL += "&beforeThan=$beforeThan"
        return doGET(URL, username, password)
    }

    static def listByImageAndUser(Long idImage,Long idUser, String username, String password, Long afterThan = null, Long beforeThan = null) {
        String URL = Infos.CYTOMINEURL + "/api/imageinstance/$idImage/annotationactions.json?user=$idUser&showDetails=true"
        if(afterThan) URL += "&afterThan=$afterThan"
        if(beforeThan) URL += "&beforeThan=$beforeThan"
        return doGET(URL, username, password)
    }
}
