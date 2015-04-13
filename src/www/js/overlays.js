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
define(['map', 'file', 'utils', 'settings', 'pcapi', 'records', './mbtiles'], function(// jshint ignore:line
    map, file, utils, settings, _pcapi, records, mbtiles){

    var layersDir, root, layers = [];
    var TILES_FOLDER = 'features';

    /**
     * check for layers inside a dir
     * @param dir the name of the directory to look in
     * @callback
     */
    var checkForLayers = function(dir, callback){
        layers = [];
        var directoryReader = dir.createReader();
        directoryReader.readEntries(function(entries){
            for(var i=0;i<entries.length;i++){
                //Android creates automatically a <dbname>.db-journal file when
                //it opens the db. We don't want to list it.
                if(entries[i].name.indexOf("-journal") === -1){
                    layers.push(entries[i].name);
                }
            }
            if(callback){
                callback(layers);
            }
        });
    };

    /**
     * Create layers list on the panel on map page.
     */
    var createLayersListForMap = function(){
        var $layersList = $("#map-page-layers-list");
        $layersList.empty();
        var list = [];
        if(utils.isMobileDevice()){
            list.push('<li data-role="list-divider">Layers</li>');
            if(layers.length>0){
                for(var i=0; i<layers.length; i++){
                    var layer = layers[i];
                    var checked = '';
                    if(map.layerExists(layer)){
                        checked = 'checked';
                    }
                    list.push('<li><label for="flip-checkbox-'+ i +'">'+layer+'</label>\
                          <input data-role="flipswitch"\
                                name="flip-checkbox-'+ i +'"\
                                id="flip-checkbox-'+ i +'"\
                                class="show-layer" type="checkbox" '+ checked +'></li>');
                }
            }
            $layersList.html(list.join(""));
            $('input[data-role="flipswitch"]', "#map-page-layers-list").flipswitch();
            $layersList.listview("refresh");
        }
        else{
            if(pcapi.getUser() !== undefined){
                pcapi.setUserId(pcapi.getUser().id);
                pcapi.getFSItems(TILES_FOLDER).then(function(data){
                    list.push('<li data-role="list-divider">OnLine</li>');
                    $.each(data.metadata, $.proxy(function(i, item){
                        var fileName = item.substring(item.lastIndexOf('/') + 1, item.length);
                        list.push('<li><a href="javascript:void(0)" class="show-layer">'+fileName+'</a></li>');
                    }, this));
                    $layersList.html(list.join(""));
                    $layersList.listview("refresh");
                });
            }
        }
    };

    /**
     * Download layer to disk.
     */
    var downloadLayer = function(event){
        var $target = $(event.target);
        var layer = $("label[for='"+$target.attr('id')+"']").text();

        var itemUrl = pcapi.buildFSUserUrl(utils.getAnonymousUserId(), TILES_FOLDER, layer);
        var target = file.appendFile(layersDir, layer);

        // Download or delete the editor from the device
        if($target.prop('checked')){
            utils.showPageLoadingMsg('Download Layer '+layer);
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
        }else{
            utils.showPageLoadingMsg('Delete Layer '+layer);
            file.deleteFile(layer, layersDir, function(){
                layers.splice($.inArray(layer, layers), 1);
                $.mobile.loading('hide');
            });

        }
    };

    /**
     * create layers list for downloading on download section
     */
    var savedLayersPage = function(){
        var $layersList = $(".layers-list");
        var list = [];

        utils.showPageLoadingMsg('Checking for Layers ');

        //fetch the metadata from mbtiles and add them to the listview
        pcapi.getFSItems(TILES_FOLDER, utils.getAnonymousUserId()).then(function(data){

            $.each(data.metadata, $.proxy(function(i, item){
                var fileName = item.substring(item.lastIndexOf('/') + 1, item.length);
                var checked = '';
                if($.inArray(fileName, layers) > -1){
                    checked = 'checked';
                }
                list.push('<li><label for="flip-checkbox-'+ i +'">'+fileName+'</label>\
                          <input data-role="flipswitch"\
                                name="flip-checkbox-'+ i +'"\
                                id="flip-checkbox-'+ i +'"\
                                class="download-layer" type="checkbox" '+ checked +'></li>');
            }, this));
            $layersList.html(list.join(""));
            $('input[data-role="flipswitch"]', ".layers-list").flipswitch();
            $layersList.listview("refresh");
            $.mobile.loading('hide');
        });
    };

    /**
     * Display overlay.
     */
    var showLayer = function(event){
        var $target = $(event.target);
        var layerName = $("label[for='"+$target.attr('id')+"']").text();

        var layerType;
        if($target.prop('checked')){
            if(!map.layerExists(layerName)){
                layerType = layerName.match(/\.(.*)$/)[1];
                switch(layerType){
                case 'db':
                case 'mbtiles':
                    mbtiles.showMbTilesLayer(layerName);
                    break;
                case 'kml':
                    var kml = file.appendFile(layersDir, layerName);
                    var layer = map.addKMLLayer({
                        'id': layerName,
                        'url': kml
                    });

                    layer.events.register("loadend", this, function(){
                        map.zoomToExtent(layer.getDataExtent());
                    });

                    $('#map-page-layers-panel').panel('close');
                    createLayersListForMap();

                    break;
                default:
                    utils.inform("Don't know how to display " + layerName);
                }
            }
            else{
                map.showLayerByName(layerName);
            }
        }
        else{
            map.hideLayerByName(layerName);
        }
    };

    if(utils.isMobileDevice()){
        // check settings first for defined pcapi root url
        root = settings.get("pcapi-url");
        if(root === undefined){
            root = utils.getPCAPIURL();
        }

        file.createDir({
            'name': TILES_FOLDER,
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
    pcapi.setUserId(utils.getAnonymousUserId());

    $(document).on('pageshow', '#map-page', function(){
        $( "body>[data-role='panel']" ).panel();
        createLayersListForMap();
    });

    $(document).on('pageshow', '#saved-layers-page', savedLayersPage);

    //download layer event
    //$(document).on('vclick', '.download-layer', downloadLayer);
    $(document).on('change', '.download-layer', downloadLayer);

    // click on layer on map side panel
    $(document).on('change', '.show-layer', showLayer);

    $('head').prepend('<link rel="stylesheet" href="plugins/overlays/css/style.css" type="text/css" />');

});
