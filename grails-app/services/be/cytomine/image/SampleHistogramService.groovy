package be.cytomine.image

import be.cytomine.Exception.ConstraintException
import be.cytomine.command.AddCommand
import be.cytomine.command.Command
import be.cytomine.command.DeleteCommand
import be.cytomine.command.EditCommand
import be.cytomine.command.Transaction
import be.cytomine.security.SecUser
import be.cytomine.utils.ModelService
import be.cytomine.utils.Task
import groovy.sql.Sql

import static org.springframework.security.acls.domain.BasePermission.READ
import static org.springframework.security.acls.domain.BasePermission.WRITE

class SampleHistogramService extends ModelService {

    static transactional = true

    def cytomineService
    def securityACLService
    def imageServerService
    def dataSource

    def currentDomain() {
        return SampleHistogram
    }

    def read(def id) {
        SampleHistogram hist = SampleHistogram.read(id)
        if (hist) {
            securityACLService.checkAtLeastOne(hist, READ)
        }
        hist
    }

    def list(AbstractSlice slice) {
        securityACLService.checkAtLeastOne(slice, READ)
        SampleHistogram.findAllBySlice(slice)
    }

    def list(SliceInstance slice) {
        securityACLService.check(slice, READ)
        SampleHistogram.findAllBySlice(slice.baseSlice)
    }


    def add(def json) {
        SecUser currentUser = cytomineService.getCurrentUser()
        securityACLService.checkUser(currentUser)

        Command c = new AddCommand(user: currentUser)
        executeCommand(c, null, json)
    }

    def update(SampleHistogram hist, def json) {
        securityACLService.checkAtLeastOne(hist, WRITE)
        SecUser currentUser = cytomineService.getCurrentUser()

        Command c = new EditCommand(user: currentUser)
        executeCommand(c, hist, json)
    }

    def delete(SampleHistogram hist, Transaction transaction = null, Task task = null, boolean printMessage = true) {
        securityACLService.checkAtLeastOne(hist, READ)
        SecUser currentUser = cytomineService.getCurrentUser()
        Command c = new DeleteCommand(user: currentUser, transaction: transaction)
        executeCommand(c, hist, null)
    }

    @Override
    def getStringParamsI18n(Object domain) {
        return [domain.id, domain.slice.id, domain.sample]
    }

    def histogramStats(AbstractImage image) {
        String query = "SELECT sample, MIN(min) as minimum, MAX(max) as maximum " +
                "FROM sample_histogram sh LEFT JOIN abstract_slice asl ON asl.id = sh.slice_id " +
                "WHERE asl.image_id = ${image.id} " +
                "GROUP BY sample"

        def sql = new Sql(dataSource)
        def data = []
        sql.eachRow(query) { row ->
            data << [sample: row.sample, min: row.minimum, max: row.maximum]
        }
        return data
    }

    def extractHistogram(AbstractImage image) {
        log.info "Extract histogram"
        AbstractSlice.findAllByImage(image).each { slice ->
            def sampleHistograms = imageServerService.sampleHistograms(slice)
            sampleHistograms.each { data ->
                data.slice = slice.id
                SampleHistogram sh = new SampleHistogram(data)
                sh.checkAlreadyExist()
                sh.save(flush: true, failOnError: true)
            }
        }
    }
}
