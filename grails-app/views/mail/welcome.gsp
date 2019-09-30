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
                                Click <a href='<%= by %>/#/account?token=<%= tokenKey %>&username=<%= username %>'> here</a> to sign in, set your firstname, lastname and change your password. <br />
                                Please note that this link will expire on <%= expiryDate %>.
                            </p>
                            
                            <p>
                            For more information about Cytomine open-source project, please <a href='https://www.cytomine.org/'>visit our website</a>.
                            </p>

                            <!-- social & contact -->
                            <g:render template="/mail/social" model="[website :website, mailFrom: mailFrom, phoneNumber:phoneNumber]"/>

                        </td>
                    </tr>
                </table>
            </div><!-- /content -->

        </td>
        <td></td>
    </tr>
</table><!-- /BODY -->

<g:render template="/mail/footer" model="[by : by]"/>
