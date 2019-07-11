package be.cytomine.spring

import grails.util.Holders

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.security.web.RedirectStrategy

import org.springframework.security.web.util.UrlUtils;

public class CustomDefaultRedirectStrategy implements RedirectStrategy {
    protected final Log logger = LogFactory.getLog(this.getClass());
    private boolean contextRelative;

    public CustomDefaultRedirectStrategy() {
    }

    public void sendRedirect(HttpServletRequest request, HttpServletResponse response, String url) throws IOException {

        String redirectUrl = this.calculateRedirectUrl(request.getContextPath(), url);

        if(Holders.getGrailsApplication().config.grails.serverURL.contains("https")
            && redirectUrl.contains(Holders.getGrailsApplication().config.grails.serverURL.replace("https://",""))){
            redirectUrl = "https://" + redirectUrl
        } else if(redirectUrl.contains(Holders.getGrailsApplication().config.grails.serverURL.replace("http://",""))){
            redirectUrl = "http://" + redirectUrl
        }

        redirectUrl = response.encodeRedirectURL(redirectUrl);

        if (this.logger.isDebugEnabled()) {
            this.logger.debug("Redirecting to '" + redirectUrl + "'");
        }

        response.sendRedirect(redirectUrl);
    }

    private String calculateRedirectUrl(String contextPath, String url) {

        if (!UrlUtils.isAbsoluteUrl(url)) {
            return this.contextRelative ? url : contextPath + url;
        } else if (!this.contextRelative) {
            return url;
        } else {
            url = url.substring(url.lastIndexOf("://") + 3);
            url = url.substring(url.indexOf(contextPath) + contextPath.length());
            if (url.length() > 1 && url.charAt(0) == '/') {
                url = url.substring(1);
            }
            return url;
        }
    }

    public void setContextRelative(boolean useRelativeContext) {
        this.contextRelative = useRelativeContext;
    }
}
