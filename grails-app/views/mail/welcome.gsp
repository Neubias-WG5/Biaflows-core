<g:render template="/mail/header" model="[]"/>

<!-- BODY -->
<table class="body-wrap">
    <tr>
        <td></td>
        <td class="container" bgcolor="#FFFFFF">

            <div class="content">
                <table>
                    <tr>
                        <td>
                            <h3>Dear Madam/Sir,</h3>

                            <p class="lead">
                                You receive this email because <%= senderFirstname %> <%= senderLastname %> (<%=  senderEmail %>) invited you to join Cytomine, a rich internet application for collaborative analysis of multi-gigapixel images. Welcome !
                            </p>

                            <p class="callout">
                                Your Cytomine username is <%= username %>
                            </p>

                            <p>
                                Click <a href='<%= by %>/login/loginWithToken?tokenKey=<%= tokenKey %>&username=<%= username %>&redirect=#account'> here</a> to sign in, set your firstname, lastname and change your password. <br />
                                Please note that this link will expire on <%= expiryDate %>. You can request a new one by clicking <a href="<%= by %>/#forgotPassword">here</a> and enter your username.
                            </p>
                            
                            <p>
                            For more information about Cytomine open-source project, please <a href='http://www.cytomine.org/'>visit our website</a>.<br>
                            <a href='http://www.cytomine.org/'><img src="http://www.cytomine.be/cytominelogo.png" align="left" height="100"></a>
                            </p>

                            <!-- social & contact -->
                            <g:render template="/mail/social" model="[]"/>

                        </td>
                    </tr>
                </table>
            </div><!-- /content -->

        </td>
        <td></td>
    </tr>
</table><!-- /BODY -->

<g:render template="/mail/footer" model="[by : by]"/>
