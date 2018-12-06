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

var AdminConfigView = Backbone.View.extend({

    allConfigs : {},

    render: function () {
        var self = this;
        if (!this.rendered) {
            require(["text!application/templates/admin/AdminConfigurations.tpl.html"],
                function (tpl) {
                    self.getValues(function() {
                        self.doLayout(tpl);
                        self.rendered = true;
                    });
                }
            );
        }
    },

    doLayout: function(tpl) {
        var self = this;

        var view = _.template(tpl, {});
        $(this.el).append(view);

        $(self.el).find("#adminWelcomeMessageEditor").html(self.allConfigs["WELCOME"]);

        $("#adminWelcomeMessageEditor").trumbowyg({
            btnsGrps: {
                semantic2: ['strong', 'em', 'underline', 'del'] // Custom nammed group
            },
            btnsDef: {
                // Customizables dropdowns
                align: {
                    dropdown: ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
                    ico: 'justifyLeft'
                }
            },
            tagsToRemove: ['script'],
            btns: [
                ['formatting'],
                'btnGrp-semantic2',
                ['link'],
                ['align'],
                'btnGrp-lists',
                ['insertImage'],
                ['noembed'],
                ['foreColor', 'backColor'],
                ['specialChars'],
                ['horizontalRule'],
                ['removeformat'],
                ['viewHTML']
            ]
        });

        $(self.el).find("#saveWelcomeMessageButton").on("click", function(){
            var text = $("#adminWelcomeMessageEditor").trumbowyg('html');
            text = text.replace("<script>","").replace("</script>","");

            var data = {key: "WELCOME", value: text, readingRole: "all"};

            $.ajax({
                type:"PUT",
                url: "api/configuration/key/"+data.key+".json",
                data: JSON.stringify(data),
                contentType:"application/json; charset=utf-8",
                success : function(){
                    self.allConfigs["WELCOME"] = text;
                    window.app.view.message("Success", "Welcome message has been updated", "success");
                }, error: function (response) {
                    var json = $.parseJSON(response.responseText);
                    window.app.view.message("Error", json.errors, "error");
                }
            });
        });
        $(self.el).find("#deleteWelcomeMessageButton").on("click", function(){
            var config = self.allConfigs["WELCOME"];

            if(config != null) {
                $.ajax({
                    type:"DELETE",
                    url: "api/configuration/key/"+"WELCOME"+".json",
                    contentType:"application/json; charset=utf-8",
                    success : function(){
                        self.allConfigs["WELCOME"] = "";
                        $("#adminWelcomeMessageEditor").trumbowyg('html','');
                        window.app.view.message("Success", "Welcome message has been cleared", "success");
                    }, error: function (response) {
                        var json = $.parseJSON(response.responseText);
                        window.app.view.message("Error", json.errors, "error");
                    }
                });
            }
        });

        return this;
    },

    getValues: function(callback) {

        var self = this;

        $.get( "api/configuration.json", function( data ) {
            self.allConfigs = {};
            $.each(data.collection, function(index,item){
                self.allConfigs[item.key] = item.value;
            });

            callback();

        });
    }
});