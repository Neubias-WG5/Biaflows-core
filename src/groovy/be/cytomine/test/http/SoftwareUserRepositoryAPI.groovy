package be.cytomine.test.http

import be.cytomine.processing.SoftwareUserRepository
import be.cytomine.test.Infos
import grails.converters.JSON

class SoftwareUserRepositoryAPI extends DomainAPI {

    static def show(Long id, String username, String password) {
        String URL = Infos.CYTOMINEURL + "api/software_user_repository/" + id + ".json"
        return doGET(URL, username, password)
    }

    static def list(String username, String password) {
        String URL = Infos.CYTOMINEURL + "api/software_user_repository.json"
        return doGET(URL, username, password)
    }

    static def create(String json, String username, String password) {
        String URL = Infos.CYTOMINEURL + "api/software_user_repository.json"
        def result = doPOST(URL, json, username, password)
        result.data = SoftwareUserRepository.get(JSON.parse(result.data)?.softwareuserrepository?.id)
        return result
    }

    static def update(def id, def jsonSoftwareUserRepository, String username, String password) {
        String URL = Infos.CYTOMINEURL + "/api/software_user_repository/" + id + ".json"
        return doPUT(URL, jsonSoftwareUserRepository, username, password)
    }

    static def delete(def id, String username, String password) {
        String URL = Infos.CYTOMINEURL + "/api/software_user_repository/" + id + ".json"
        return doDELETE(URL, username, password)
    }

}
