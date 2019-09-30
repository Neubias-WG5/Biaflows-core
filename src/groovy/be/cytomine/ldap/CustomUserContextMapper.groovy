package be.cytomine.ldap

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

import be.cytomine.security.User
import be.cytomine.security.SecRole
import be.cytomine.security.SecUserSecRole;
import grails.plugin.springsecurity.SpringSecurityUtils
import org.apache.commons.lang.RandomStringUtils
import org.apache.log4j.Logger;
import org.springframework.ldap.core.DirContextAdapter;
import org.springframework.ldap.core.DirContextOperations;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.ldap.userdetails.UserDetailsContextMapper;
import grails.util.Holders

public class CustomUserContextMapper implements UserDetailsContextMapper {

    Logger log = Logger.getLogger(getClass())

    @Override
    public UserDetails mapUserFromContext(DirContextOperations ctx, String username, Collection<? extends GrantedAuthority> grantedAuthorities) {

        User user = User.findByUsername(username);

        if(!user){

            String firstname = ctx.originalAttrs.attrs['givenname'].values[0];
            String lastname = ctx.originalAttrs.attrs['sn'].values[0];
            String mail = ctx.originalAttrs.attrs['mail'].values[0];


            user = new User()
            user.username = username
            user.lastname = lastname
            user.firstname = firstname
            user.email = mail
            user.enabled = true
            user.password = RandomStringUtils.random(32,  (('A'..'Z') + ('0'..'0')).join().toCharArray()) //not used by the user
            user.generateKeys()
            if (user.validate()) {
                user.save(flush: true)
                user.refresh()

                // Assign the default role of client
                SecRole userRole;
                userRole = SecRole.findByAuthority("ROLE_GUEST")
                SecUserSecRole secUsersecRole = new SecUserSecRole()
                secUsersecRole.secUser = user
                secUsersecRole.secRole = userRole
                secUsersecRole.save(flush: true)
            } else {
                user.errors.each {
                    log.info it
                }
            }

            def storageService = Holders.grailsApplication.mainContext.getBean 'storageService'

            SpringSecurityUtils.doWithAuth("admin", {
                storageService.initUserStorage(user)
            });
        }

        return new org.springframework.security.core.userdetails.User(username, user.password, true, true, true, true, grantedAuthorities)
    }

    @Override
    public void mapUserToContext(UserDetails user, DirContextAdapter ctx) {
    }
}
