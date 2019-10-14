package be.cytomine.ontology

import be.cytomine.Exception.WrongArgumentException
import be.cytomine.command.AddCommand
import be.cytomine.command.Command
import be.cytomine.command.DeleteCommand
import be.cytomine.command.EditCommand
import be.cytomine.command.Transaction
import be.cytomine.image.ImageInstance
import be.cytomine.image.SliceInstance
import be.cytomine.project.Project
import be.cytomine.security.SecUser
import be.cytomine.utils.ModelService
import be.cytomine.utils.Task

import static org.springframework.security.acls.domain.BasePermission.READ

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

class TrackService extends ModelService {

    static transactional = true

    def securityACLService
    def imageInstanceService

    def currentDomain() {
        Track
    }

    def read(def id) {
        Track track = Track.read(id)
        if (track) {
            securityACLService.check(track, READ)
        }
        track
    }

    def list(ImageInstance image) {
        securityACLService.check(image, READ)
        Track.findAllByImage(image)
    }

    def list(SliceInstance slice) {
        securityACLService.check(slice.container(), READ)
        AnnotationTrack.createCriteria().list {
            eq("slice", slice)
            projection {
                groupProperty("track")
            }
        }
    }

    def list(Project project) {
        securityACLService.check(project, READ)
        Track.findAllByProject(project)
    }

    def count(ImageInstance image) {
        securityACLService.check(image, READ)
        return Track.countByImage(image)
    }

    def countByProject(Project project, Date startDate, Date endDate) {
        securityACLService.check(project, READ)
        String request = "SELECT COUNT(*) FROM Track WHERE project = $project.id " +
                (startDate ? "AND created > '$startDate' " : "") +
                (endDate ? "AND created < '$endDate' " : "")
        def result = Track.executeQuery(request)
        return result[0]
    }

    def add(def json) {
        ImageInstance image = imageInstanceService.read(json.image)
        Project project = image?.project

        if (!project) {
            throw new WrongArgumentException("Track does not have a valid project.")
        }

        if (!json.color) {
            def count = Track.countByImage(image)
            def colors = ["#e6194b",	//	Red
                          "#3cb44b",	//	Green
                          "#ffe119",	//	Yellow
                          "#0082c8",	//	Blue
                          "#f58231",	//	Orange
                          "#911eb4",	//	Purple
                          "#46f0f0",	//	Cyan
                          "#f032e6",	//	Magenta
                          "#d2f53c",	//	Lime
                          "#fabebe",	//	Pink
                          "#008080",	//	Teal
                          "#e6beff",	//	Lavender
                          "#aa6e28",	//	Brown
                          "#fffac8",	//	Beige
                          "#800000",	//	Maroon
                          "#aaffc3",	//	Mint
                          "#808000",	//	Olive
                          "#ffd8b1",	//	Coral
                          "#000080",	//	Navy
                          "#808080",	//	Grey
                          "#FFFFFF",	//	White
                          "#000000"	//	Black
            ]

            json.color = colors[(int) (count%(colors.size()))]
        }

        json.image = image.id
        json.project = project.id

        securityACLService.check(project, READ)
        securityACLService.checkisNotReadOnly(project)

        SecUser currentUser = cytomineService.getCurrentUser()
        Command c = new AddCommand(user: currentUser)
        executeCommand(c, null, json)
    }

    def update(Track track, def json) {
        securityACLService.check(track, READ)
        securityACLService.checkisNotReadOnly(track)
        SecUser currentUser = cytomineService.getCurrentUser()

        ImageInstance image = imageInstanceService.read(json.image)
        Project project = image?.project
        json.project = project.id

        Command c = new EditCommand(user: currentUser)
        executeCommand(c, track, json)
    }

    def delete(Track track, Transaction transaction = null, Task task = null, boolean printMessage = true) {
//        securityACLService.checkAtLeastOne(track, READ)
        //TODO security
        SecUser currentUser = cytomineService.getCurrentUser()
        Command c = new DeleteCommand(user: currentUser, transaction: transaction)
        executeCommand(c, track, null)
    }

    def annotationTrackService
    def deleteDependentAnnotationTrack(Track track, Transaction transaction, Task task = null) {
        AnnotationTrack.findAllByTrack(track).each {
            annotationTrackService.delete(it, transaction, task)
        }
    }

    def getStringParamsI18n(def domain) {
        return [domain.id, domain.name]
    }
}
