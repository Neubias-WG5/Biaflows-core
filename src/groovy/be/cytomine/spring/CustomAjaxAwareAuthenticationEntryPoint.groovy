package be.cytomine.spring

import grails.plugin.springsecurity.SpringSecurityUtils
import grails.plugin.springsecurity.web.authentication.AjaxAwareAuthenticationEntryPoint
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.DefaultRedirectStrategy
import org.springframework.security.web.RedirectStrategy
import org.springframework.util.Assert

import javax.servlet.RequestDispatcher
import javax.servlet.ServletException
import javax.servlet.http.HttpServletRequest
import javax.servlet.http.HttpServletResponse

public class CustomAjaxAwareAuthenticationEntryPoint extends AjaxAwareAuthenticationEntryPoint {

    def grailsApplication

    protected String ajaxLoginFormUrl;
    private String loginFormUrl;
    private final RedirectStrategy redirectStrategy = new DefaultRedirectStrategy();

    public CustomAjaxAwareAuthenticationEntryPoint(String loginFormUrl) {
        super(loginFormUrl);
        this.loginFormUrl = loginFormUrl
    }

    @Override
    protected String determineUrlToUseForThisRequest(final HttpServletRequest request,
                                                     final HttpServletResponse response, final AuthenticationException e) {

        if (ajaxLoginFormUrl != null && SpringSecurityUtils.isAjax(request)) {
            return ajaxLoginFormUrl;
        }
        return getLoginFormUrl();
    }

    @Override
    public void commence(final HttpServletRequest req, final HttpServletResponse res, final AuthenticationException e) throws IOException, ServletException {

        if ("true".equalsIgnoreCase(req.getHeader("nopage"))) {
            res.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String redirectUrl = null;
        if (this.useForward) {
            if (this.forceHttps && "http".equals(req.getScheme())) {
                redirectUrl = this.buildHttpsRedirectUrlForRequest(req);
            }

            if (redirectUrl == null) {
                String loginForm = this.determineUrlToUseForThisRequest(req, res, e);
                if (logger.isDebugEnabled()) {
                    logger.debug("Server side forward to: " + loginForm);
                }

                RequestDispatcher dispatcher = req.getRequestDispatcher(loginForm);
                dispatcher.forward(req, res);
                return;
            }
        } else {
            //redirectUrl = this.buildRedirectUrlToLoginPage(req, res, e);
            redirectUrl = grailsApplication.config.grails.serverURL + loginFormUrl
        }

        this.redirectStrategy.sendRedirect(req, res, redirectUrl);

    }

    /**
     * Dependency injection for the Ajax login form url, e.g. '/login/authAjax'.
     * @param url the url
     */
    public void setAjaxLoginFormUrl(final String url) {
        Assert.isTrue(url == null || url.startsWith("/"), "ajaxLoginFormUrl must begin with '/'");
        ajaxLoginFormUrl = url;
    }
}