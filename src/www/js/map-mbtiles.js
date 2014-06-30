/*
Copyright (c) 2014, EDINA.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this
   list of conditions and the following disclaimer in the documentation and/or
   other materials provided with the distribution.
3. All advertising materials mentioning features or use of this software must
   display the following acknowledgement: This product includes software
   developed by the EDINA.
4. Neither the name of the EDINA nor the names of its contributors may be used to
   endorse or promote products derived from this software without specific prior
   written permission.

THIS SOFTWARE IS PROVIDED BY EDINA ''AS IS'' AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
SHALL EDINA BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
DAMAGE.
*/

"use strict";

define(['utils', 'settings', 'config', 'plugins/sync/js/login',
        'plugins/sync/js/download',
        'plugins/sync/js/pcapi'],
       function(utils, settings, config, login, download, pcapi){

    var layersDir, root, layers = new Array();

    var createLayersListForDownload = function(){
        var $layersList = $(".layers-list");
        var list = new Array();

        pcapi.setUserId(login.getUser().id);
        utils.showPageLoadingMsg('Checking for Layers ');
        //fetch the metadata from mbtiles and add them to the listview
        pcapi.getItems('tiles', function(success, data){
            list.push('<li data-role="list-divider">On device</li>');
            if(layers.length>0){
                for(var i=0; i<layers.length; i++){
                    list.push('<li><a href="javascript:void(0)" class="show-layer">'+layers[i]+'</a></li>');
                }
            }
            list.push('<li data-role="list-divider">On cloud</li>');
            if(success){
                $.each(data.metadata, $.proxy(function(i, item){
                    var fileName = item.substring(item.lastIndexOf('/') + 1, item.length);
                    list.push('<li><a href="javascript:void(0)" class="download-layer">'+fileName+'</a></li>');
                }, this))
            }
            else{
                utils.inform('No layers to sync');
            }
            $layersList.html(list.join(""));
            $layersList.listview("refresh");
            $.mobile.hidePageLoadingMsg();
        });
    };

    var createLayersListForMap = function(){
        var $layersList = $(".layers-list");
        var list = new Array();f
        list.push('<li data-role="list-divider">On device</li>');
        if(layers.length>0){
            for(var i=0; i<layers.length; i++){
                list.push('<li><a href="javascript:void(0)" class="show-layer">'+layers[i]+'</a></li>');
            }
        }
        $layersList.html(list.join(""));
        $layersList.listview("refresh");
    };

    if(utils.isMobileDevice()){
        // check settings first for defined pcapi root url
        root = settings.get("pcapi-url");
        if(root === undefined){
            root = config.pcapiurl;
        }
        // create directory structure for layers
        utils.createDir('tiles', function(dir){
            layersDir = dir;
            var directoryReader = layersDir.createReader();
            directoryReader.readEntries(function(entries){
                for(var i=0;i<entries.length;i++){
                    layers.push(entries[i].name);
                }
            });
        });
    }
    else{
        root = 'http://' + location.hostname;
        if(location.port){
            root += ':' + location.port;
        }
    }
    pcapi.init({"url": root, "version": config.pcapiversion});
    pcapi.setProvider('dropbox');

    $(document).on('pageshow', '#map-page', createLayersListForMap);
    $(document).on('pageshow', '#saved-layers-page', createLayersListForDownoad);

    $(document).off('vclick', '.download-layer');
    $(document).on(
        'vclick',
        '.download-layer',
        function(){
            console.log('skata')
            var layer = $(this).text();
            var $popup = $('#saved-layers-download-popup');
            var text;
            if($.inArray(layer, layers)){
                text = "The layer "+layer+" already exists. Do you still want to download it?";
            }
            else{
                text = "You are going to download layer "+layer;
            }
            $popup.empty();
            $popup.append(
                '<div data-theme="d" class="ui-corner-all ui-content">\
                <p>'+text+'\
                </p>\
                <a href="#"\
                  data-theme="a"\
                  data-role="button"\
                  data-inline="true"\
                  data-rel="back">Cancel</a>\
                <a class="download-layer-confirm"\
                  data-theme="a"\
                  href="#"\
                  data-role="button"\
                  data-inline="true">Continue</a>\
                </div>').trigger('create');
            $popup.popup('open');

            $(document).off('vmousedown', '.download-layer-confirm');
            $(document).on(
                'vmousedown',
                '.download-layer-confirm',
                function(event){
                    event.preventDefault();
                    $popup.popup('close');

                    utils.showPageLoadingMsg('Download Layer '+layer);
                    var options = {"fileName": layer, "remoteDir": "tiles", "localDir": layersDir};
                    download.downloadItem(options, function(){
                        $.mobile.hidePageLoadingMsg();
                        $.mobile.changePage('map.html');
                        createLayersList(downloads);
                    });
                }
            );
        }
    );

    $('head').prepend('<link rel="stylesheet" href="plugins/map-mbtiles/css/style.css" type="text/css" />');
});