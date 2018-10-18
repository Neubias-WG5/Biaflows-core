package be.cytomine.security

import be.cytomine.processing.Job
import be.cytomine.project.Project

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

import be.cytomine.test.BasicInstanceBuilder
import be.cytomine.test.http.AttachedFileAPI
import be.cytomine.test.http.JobAPI
import be.cytomine.test.http.ProjectAPI
import be.cytomine.utils.AttachedFile
import com.mongodb.util.JSON

class AttachedFileSecurityTests extends SecurityTestsAbstract{


    void testAttachedFileForDomainOwner() {

        //Get user1
        User user1 = getUser1()

        def result = ProjectAPI.create(BasicInstanceBuilder.getProjectNotExist().encodeAsJSON(),SecurityTestsAbstract.USERNAME1,SecurityTestsAbstract.PASSWORD1)
        assert 200 == result.code
        Project project = result.data

        //Add job instance to project
        Job job = BasicInstanceBuilder.getJobNotExist()
        job.project = project

        result = JobAPI.create(job.encodeAsJSON(), SecurityTestsAbstract.USERNAME1,SecurityTestsAbstract.PASSWORD1)
        assert 200 == result.code
        job = result.data

        AttachedFile attachedFile = BasicInstanceBuilder.getAttachedFileNotExist()
        attachedFile.domain = job
        result = AttachedFileAPI.upload(attachedFile.domainClassName,attachedFile.domainIdent,new File("test/functional/be/cytomine/utils/simpleFile.txt"),SecurityTestsAbstract.USERNAME1,SecurityTestsAbstract.PASSWORD1)
        assert 200 == result.code
        Long idAttachedFile = JSON.parse(result.data).id

        result = AttachedFileAPI.download(idAttachedFile,SecurityTestsAbstract.USERNAME1,SecurityTestsAbstract.PASSWORD1)
        assert 200 == result.code

        result = AttachedFileAPI.delete(idAttachedFile,SecurityTestsAbstract.USERNAME1,SecurityTestsAbstract.PASSWORD1)
        assert 200 == result.code

    }

    void testAttachedFileForNotDomainOwner() {

        //Get user1
        User user1 = getUser1()

        //Get user2
        User user2 = getUser2()

        def result = ProjectAPI.create(BasicInstanceBuilder.getProjectNotExist().encodeAsJSON(),SecurityTestsAbstract.USERNAME1,SecurityTestsAbstract.PASSWORD1)
        assert 200 == result.code
        Project project = result.data

        //Add job instance to project
        Job job = BasicInstanceBuilder.getJobNotExist()
        job.project = project

        result = JobAPI.create(job.encodeAsJSON(), SecurityTestsAbstract.USERNAME1,SecurityTestsAbstract.PASSWORD1)
        assert 200 == result.code
        job = result.data

        AttachedFile attachedFile = BasicInstanceBuilder.getAttachedFileNotExist()
        attachedFile.domain = job
        result = AttachedFileAPI.upload(attachedFile.domainClassName,attachedFile.domainIdent,new File("test/functional/be/cytomine/utils/simpleFile.txt"),SecurityTestsAbstract.USERNAME2,SecurityTestsAbstract.PASSWORD2)
        assert 403 == result.code

        result = AttachedFileAPI.upload(attachedFile.domainClassName,attachedFile.domainIdent,new File("test/functional/be/cytomine/utils/simpleFile.txt"),SecurityTestsAbstract.USERNAME1,SecurityTestsAbstract.PASSWORD1)
        assert 200 == result.code
        Long idAttachedFile = JSON.parse(result.data).id

        result = AttachedFileAPI.show(idAttachedFile,SecurityTestsAbstract.USERNAME2,SecurityTestsAbstract.PASSWORD2)
        assert 403 == result.code

        result = AttachedFileAPI.download(idAttachedFile,SecurityTestsAbstract.USERNAME2,SecurityTestsAbstract.PASSWORD2)
        assert 403 == result.code

        result = AttachedFileAPI.delete(idAttachedFile,SecurityTestsAbstract.USERNAME2,SecurityTestsAbstract.PASSWORD2)
        assert 403 == result.code

    }
}
