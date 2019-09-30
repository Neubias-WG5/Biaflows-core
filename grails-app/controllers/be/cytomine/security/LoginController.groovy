package be.cytomine.security

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

import be.cytomine.api.RestController
import be.cytomine.utils.JSONUtils
import grails.converters.JSON
import grails.plugin.springsecurity.SpringSecurityUtils
import net.oauth.OAuthAccessor
import net.oauth.OAuthConsumer
import net.oauth.OAuthException
import net.oauth.OAuthMessage
import net.oauth.OAuthValidator
import net.oauth.SimpleOAuthValidator
import net.oauth.server.OAuthServlet
import org.apache.commons.lang.RandomStringUtils
import org.imsglobal.lti.launch.LtiError
import org.imsglobal.lti.launch.LtiLaunch
import org.imsglobal.lti.launch.LtiVerificationResult
import org.springframework.security.authentication.AccountExpiredException
import org.springframework.security.authentication.CredentialsExpiredException
import org.springframework.security.authentication.DisabledException
import org.springframework.security.authentication.LockedException
import org.springframework.security.core.context.SecurityContextHolder as SCH
import org.springframework.security.web.authentication.AbstractAuthenticationProcessingFilter
import be.cytomine.Exception.CytomineException
import org.springframework.web.context.request.RequestContextHolder

import javax.servlet.http.HttpServletResponse

class LoginController extends RestController {

    def secUserService
    def projectService
    def secRoleService
    def secUserSecRoleService
    def currentRoleServiceProxy
    def cytomineService
    def storageService

    static final long ONE_MINUTE_IN_MILLIS=60000;//millisecs

    /**
     * Dependency injection for the authenticationTrustResolver.
     */
    def authenticationTrustResolver

    /**
     * Dependency injection for the springSecurityService.
     */
    def springSecurityService
    def notificationService

    def loginWithoutLDAP () {
        log.info "loginWithoutLDAP"
        if (springSecurityService.isLoggedIn()) {
            redirect uri: SpringSecurityUtils.securityConfig.successHandler.defaultTargetUrl
        }
        else {
            render(view:'login')
        }

        //render view: "index", model: [postUrl: postUrl,
        //   rememberMeParameter: config.rememberMe.parameter]
    }

    /**
     * Default action; redirects to 'defaultTargetUrl' if logged in, /login/auth otherwise.
     */
    def index () {
        if (springSecurityService.isLoggedIn()) {
            redirect uri: SpringSecurityUtils.securityConfig.successHandler.defaultTargetUrl
        }
        else {
            redirect action: "auth", params: params
        }
    }

    /**
     * Show the login page.
     */
    def auth () {
        def config = SpringSecurityUtils.securityConfig

        println "auth:$config"

        if (springSecurityService.isLoggedIn()) {
            redirect uri: config.successHandler.defaultTargetUrl
            return
        }
        String view = 'auth'
        String postUrl = "${request.contextPath}${config.apf.filterProcessesUrl}"
        render view: view, model: [postUrl: postUrl,
                                   rememberMeParameter: config.rememberMe.parameter]
    }

    /**
     * Show denied page.
     */
    def denied () {
        if (springSecurityService.isLoggedIn() &&
                authenticationTrustResolver.isRememberMe(SCH.context?.authentication)) {
            // have cookie but the page is guarded with IS_AUTHENTICATED_FULLY
            redirect action: "full", params: params
        }
    }

    /**
     * Login page for users with a remember-me cookie but accessing a IS_AUTHENTICATED_FULLY page.
     */
    def full () {
        def config = SpringSecurityUtils.securityConfig
        render view: 'auth', params: params,
                model: [hasCookie: authenticationTrustResolver.isRememberMe(SCH.context?.authentication),
                        postUrl: "${request.contextPath}${config.apf.filterProcessesUrl}"]
    }

    /**
     * Callback after a failed login. Redirects to the auth page with a warning message.
     */
    def authfail () {
        log.info "springSecurityService.isLoggedIn()="+springSecurityService.isLoggedIn()
        def msg = ''
        Throwable exception = session[AbstractAuthenticationProcessingFilter.SPRING_SECURITY_LAST_EXCEPTION_KEY]
        if(exception.getCause()) exception = exception.getCause()

        if (exception) {
            //:todo put error messages in i18n
            if (exception instanceof AccountExpiredException) {
                msg = "Account expired"
            }
            else if (exception instanceof CredentialsExpiredException) {
                msg = "Password expired"
            }
            else if (exception instanceof DisabledException) {
                msg = "Account disabled"
            }
            else if (exception instanceof LockedException) {
                msg = "Account locked"
            }
            else {
                msg = "Bad login or password"
            }
        }

        if (springSecurityService.isAjax(request)) {
            response.status = 403
            render([success: false, message: msg] as JSON)
        } else {
            redirect (uri : "/")
        }
    }

    /**
     * The Ajax success redirect url.
     */
    /* def ajaxSuccess = {
      response.status = 200
      render([success: true, username: springSecurityService.authentication.name, followUrl : grailsApplication.config.grails.serverURL] as JSON)
    }*/


    def authAjax () {
        response.sendError HttpServletResponse.SC_UNAUTHORIZED
    }

    /**
     * The Ajax success redirect url.
     */
    def ajaxSuccess () {
        User user = User.read(springSecurityService.currentUser.id)

        //log.info springSecurityService.principal.id
        log.info RequestContextHolder.currentRequestAttributes().getSessionId()
        render([success: true, id: user.id, fullname: user.firstname + " " + user.lastname] as JSON)
    }

    /**
     * The Ajax denied redirect url.
     */
    def ajaxDenied () {
        render([error: 'access denied'] as JSON)
    }

    def forgotUsername () {
        User user = User.findByEmail(params.j_email)
        if (user) {
            notificationService.notifyForgotUsername(user)
            response([success: true, message: "Check your inbox"], 200)
        } else {
            response([success: false, message: "User not found with email $params.j_email"], 400)
        }
    }

    def loginWithToken() {
        String username = params.username
        String tokenKey = params.tokenKey
        User user = User.findByUsername(username) //we are not logged, we bypass the service


        AuthWithToken authToken = AuthWithToken.findByTokenKeyAndUser(tokenKey, user)
        ForgotPasswordToken forgotPasswordToken = ForgotPasswordToken.findByTokenKeyAndUser(tokenKey, user)

        //check first if a entry is made for this token
        if (authToken && authToken.isValid())  {
            user = authToken.user
            SpringSecurityUtils.reauthenticate user.username, null
            if (params.redirect) {
                redirect (uri : params.redirect)
            } else {
                redirect (uri : "/")
            }
        } else if (forgotPasswordToken && forgotPasswordToken.isValid())  {
            user = forgotPasswordToken.user
            user.setPasswordExpired(true)
            user.save(flush :  true)
            SpringSecurityUtils.reauthenticate user.username, null
            if (params.redirect) {
                redirect (uri : params.redirect)
            } else {
                redirect (uri : "/")
            }

        } else {
            response([success: false, message: "Error : token invalid"], 400)
        }
    }

    // TODO add a custom_parameter to know on which project the user has access.
    def loginWithLTI() {

        log.info "params"
        log.info params
        log.info params.keySet()

        String consumerName = params.tool_consumer_instance_name
        log.info "loginWithLTI by $consumerName"

        def consumer = grailsApplication.config.grails.LTIConsumer.find{it.key == params.oauth_consumer_key}
        log.info consumer

        String privateKey = consumer?.secret

        if(!privateKey) {
            response([success: false, message: "Untrusted LTI Consumer"], 400)
            return
        }

        log.info "lti version : "+request.getParameter("lti_version")
        log.info "oauth_version : "+request.getParameter("oauth_version")

        // check LTI/Oauth validity
        //Content of https://github.com/IMSGlobal/basiclti-util-java/blob/master/src/main/java/org/imsglobal/lti/launch/LtiOauthVerifier.java#L31
        // instead of direct call because for grails, getRequestUrl is not good (add .dispatch at the end).
        def verify = {
            OAuthMessage oam = OAuthServlet.getMessage(request, grailsApplication.config.grails.serverURL+request.forwardURI);
            String oauth_consumer_key;
            try {
                oauth_consumer_key = oam.getConsumerKey();
            } catch (IOException e) {
                return new LtiVerificationResult(false, LtiError.BAD_REQUEST, "Unable to find consumer key in message");
            }

            OAuthValidator oav = new SimpleOAuthValidator();
            OAuthConsumer cons = new OAuthConsumer(null, oauth_consumer_key, privateKey, null);
            OAuthAccessor acc = new OAuthAccessor(cons);

            try {
                oav.validateMessage(oam, acc);
            } catch (OAuthException  | IOException | java.net.URISyntaxException e) {
                return new LtiVerificationResult(false, LtiError.BAD_REQUEST, "Failed to validate: " + e.getLocalizedMessage());
            }
            return new LtiVerificationResult(true, new LtiLaunch(request));
        }

        LtiVerificationResult ltiResult = verify();

        if(!ltiResult.getSuccess()){
            response([success: false, message: "LTI verification failed"], 400)
            return
        }

        String username = params.lis_person_sourcedid
        String firstname = params.lis_person_name_given ?: username
        String lastname = params.lis_person_name_family ?: consumer.name
        //if valid, check if all the need value are set
        if(! (firstname && lastname && username)) {
            response([success: false, message: "Not enough information for LTI connexion. Parameters are : "+params], 400)
            return
        }
        if(!params.lis_person_contact_email_primary) {
            response([success: false, message: "Email not found. Parameters are : "+params], 400)
            return
        }

        def roles = params.roles?.split(",")

        String email = params.lis_person_contact_email_primary
        log.info "loginWithLTI :$firstname $lastname $email  $roles"

        User user = User.findByUsername(username) //we are not logged, so we bypass the service

        request.getParameterNames().each {
            println "key : "+it+" value : "+request.getParameter(it)
        }

        if(!user){
            if(!email){
                response([success: false, message: "Not enough information to create a LTI profil"], 400)
                return
            }

            SpringSecurityUtils.reauthenticate "superadmin", null
            log.info "LTI connexion. Create new user "+username

            user = new User(
                    firstname : firstname,
                    lastname : lastname,
                    email: email,
                    username: username,
                    password: RandomStringUtils.random(32,  (('A'..'Z') + ('0'..'0')).join().toCharArray()),
                    enabled: true
            ).save(flush : true, failOnError: true)

            if(roles?.contains("Instructor")) {
                SecUserSecRole.create(user, SecRole.findByAuthority("ROLE_USER"))
            }else {
                SecUserSecRole.create(user, SecRole.findByAuthority("ROLE_GUEST"))
            }
            storageService.initUserStorage(user)

        }

        SpringSecurityUtils.reauthenticate user.username, null

        redirect (url : params.get("custom_redirect"))
    }

    def buildToken() {
        String username = params.username
        Double validityMin = params.double('validity',60d)
        User user = User.findByUsername(username)

        if(currentRoleServiceProxy.isAdminByNow(cytomineService.currentUser)) {
            String tokenKey = UUID.randomUUID().toString()
            AuthWithToken token = new AuthWithToken(
                    user : user,
                    expiryDate: new Date((long)new Date().getTime() + (validityMin * ONE_MINUTE_IN_MILLIS)),
                    tokenKey: tokenKey
            ).save(flush : true)
            response([success: true, token:token], 200)
        } else {
            response([success: false, message: "You must be an admin/superadmin!"], 403)
        }

    }

    def forgotPassword () {
        String username = params.j_username
        if (username) {
            User user = User.findByUsername(username) //we are not logged, so we bypass the service
            if (user) {
                String tokenKey = UUID.randomUUID().toString()
                ForgotPasswordToken forgotPasswordToken = new ForgotPasswordToken(
                        user : user,
                        expiryDate: new Date() + 1, //tomorrow
                        tokenKey: tokenKey
                ).save(flush : true)

                notificationService.notifyForgotPassword(user, forgotPasswordToken)

                response([success: true, message: "Check your inbox"], 200)
            }

        }
    }
    /*def createAccount () {
        String username = params.j_username
        String email = params.j_email

        if (username && email) {

            def creation = {
                try {
                    def guestUser = [name: username, firstname: 'Firstname', lastname: 'Lastname',
                                     mail: email, password: 'passwordExpired', color: "#FF0000"]

                    User user = projectService.inviteUser(null, JSON.parse(JSONUtils.toJSONString(guestUser)));
                    SecRole secRole = secRoleService.findByAuthority("ROLE_USER")
                    def userRole = secUserSecRoleService.get(user, secRole)
                    if(userRole) secUserSecRoleService.delete(userRole);
                    response([success: true, message: "Check your inbox"], 200)
                } catch (CytomineException e) {
                    log.error(e)
                    response([success: false, errors: e.msg], e.code)
                }
            }

            SpringSecurityUtils.doWithAuth("superadmin", creation)
        } else if (username) {
            response([success: false, errors: "The email cannot be blank"], 400)
        } else {
            response([success: false, errors: "The username cannot be blank"], 400)
        }
    }*/

}
