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

/* global pcapi */

// TODO - currently no support for requirejs in pcapi
require.config({
    paths: {
        "pcapi": "../plugins/overlays/js/ext/pcapi",
    }
});

/**
 * TODO
 */
define(['map', 'file', 'utils', 'settings', 'pcapi', './mbtiles'], function(// jshint ignore:line
    map, file, utils, settings, _pcapi, mbtiles){

    var layersDir, root, layers = [];
    var TILES_FOLDER = 'layers';

    /**
     * check for layers inside a dir
     * @param dir the name of the directory to look in
     * @callback
     */
    var checkForLayers = function(dir, callback){
        var directoryReader = dir.createReader();
        directoryReader.readEntries(function(entries){
            for(var i=0;i<entries.length;i++){
                //Android creates automatically a <dbname>.db-journal file when
                //it opens the db. We don't want to list it.
                if(entries[i].name.indexOf("db-journal") === -1){
                    layers.push(entries[i].name);
                }
            }
            if(callback){
                callback(layers);
            }
        });
    };

    /**
     * create layers list on the panel on map page
     * @param layers
     */
    var createLayersListForMap = function(layers){
        var $layersList = $(".layers-list");
        var list = [];
        if(utils.isMobileDevice()){
            list.push('<li data-role="list-divider">On device</li>');
            if(layers.length>0){
                for(var i=0; i<layers.length; i++){
                    list.push('<li><a href="javascript:void(0)" class="show-layer">'+layers[i]+'</a></li>');
                }
            }
            $layersList.html(list.join(""));
            $layersList.listview("refresh");
        }
        else{
            if(pcapi.getUser() !== undefined){
                pcapi.setUserId(pcapi.getUser().id);
                pcapi.getFSItems(TILES_FOLDER, function(success, data){
                    list.push('<li data-role="list-divider">OnLine</li>');
                    if(success){
                        $.each(data.metadata, $.proxy(function(i, item){
                            var fileName = item.substring(item.lastIndexOf('/') + 1, item.length);
                            list.push('<li><a href="javascript:void(0)" class="show-layer">'+fileName+'</a></li>');
                        }, this));
                        $layersList.html(list.join(""));
                        $layersList.listview("refresh");
                    }
                    else{
                        utils.inform('No layers to sync');
                    }
                });
            }
        }
    };

    /**
     * Download layer to disk.
     */
    var downloadLayer = function(){
        var layer = $(this).text();
        var $popup = $('#saved-layers-download-popup');
        var text;
        if($.inArray(layer, layers) !== -1){
            text = "The layer "+layer+" already exists. Do you still want to download it?";
        }
        else{
            text = "You are going to download layer "+layer;
        }
        $popup.empty();
        /*jshint multistr: true */
        $popup.append(
            '<div data-theme="d" class="ui-corner-all ui-content">\
               <p>'+text+'</p>\
               <a href="#"\
                  data-theme="a"\
                  data-role="button"\
                  data-inline="true"\
                  data-rel="back">Cancel</a>\
               <a id="download-layer-confirm"\
                  data-theme="a"\
                  href="#"\
                  data-role="button"\
                  data-inline="true">Continue</a>\
             </div>').trigger('create');
        $popup.popup('open');

        $('#download-layer-confirm').click(function(event){
            event.preventDefault();
            $popup.popup('close');

            utils.showPageLoadingMsg('Download Layer '+layer);

            var targetName = layer;
            if(layer.endsWith("mbtiles")){
                targetName = layer.substring(layer.lastIndexOf('/') + 1,
                                             layer.lastIndexOf('.')) + ".db";
            }

            var itemUrl = pcapi.buildFSUrl(TILES_FOLDER, layer);
            var target = file.appendFile(layersDir, targetName);

            file.ftDownload(
                itemUrl,
                target,
                function(){
                    $.mobile.loading('hide');
                    checkForLayers(layersDir, function(layers){
                        $.mobile.changePage('map.html');
                    });
                }
            );
        });
    };

    /**
     * create layers list for downloading on download section
     */
    var savedLayersPage = function(){
        var $layersList = $(".layers-list");
        var list = [];

        utils.showPageLoadingMsg('Checking for Layers ');

        //fetch the metadata from mbtiles and add them to the listview
        pcapi.getFSItems(TILES_FOLDER, function(success, data){
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
                }, this));
            }
            else{
                utils.inform('No layers to sync');
            }
            $layersList.html(list.join(""));
            $layersList.listview("refresh");
            $.mobile.loading('hide');
        });
    };

    /**
     * Display overlay.
     */
    var showlayer = function(){
        var layerName = $(this).text();
        if(!map.checkIfLayerExists(layerName)){
            switch(layerName.substr(layerName.length - 3)){
            case '.db':
                mbtiles.showMbTilesLayer(layerName);
                break;
            case 'kml':
                var kml = file.appendFile(layersDir, layerName);
                var layer = map.addKMLLayer({
                    'id': layerName,
                    'url': kml
                });
                $('#map-page-layers-panel').panel('close');
                map.zoomToExtent(layer.getExtent());

                break;
            default:
                utils.inform("Don't know how to display " + layerName);
            }
        }
    };

    if(utils.isMobileDevice()){
        // check settings first for defined pcapi root url
        root = settings.get("pcapi-url");
        if(root === undefined){
            root = utils.getPCAPIURL();
        }
        file.createDir({
            'name' : TILES_FOLDER,
            'success': function(dir){
                layersDir = dir;
                mbtiles.init(layersDir);
                checkForLayers(layersDir);
            }
        });
    }
    else{
        root = 'http://' + location.hostname;
        if(location.port){
            root += ':' + location.port;
        }
    }

    //initialize pcapi
    pcapi.init({"url": root, "version": utils.getPCAPIVersion()});

    $(document).on('pageshow', '#map-page', function(){
        $( "body>[data-role='panel']" ).panel();
        createLayersListForMap(layers);
    });

    $(document).on('pageshow', '#saved-layers-page', savedLayersPage);

    //download layer event
    $(document).on('vclick', '.download-layer', downloadLayer);

    // click on layer on map side panel
    $(document).on('vclick', '.show-layer', showlayer);

    $('head').prepend('<link rel="stylesheet" href="plugins/overlays/css/style.css" type="text/css" />');
});
