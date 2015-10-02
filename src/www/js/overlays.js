/*
Copyright (c) 2015, EDINA
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this
  list of conditions and the following disclaimer in the documentation and/or
  other materials provided with the distribution.
* Neither the name of EDINA nor the names of its contributors may be used to
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

    var layersDir;
    var TILES_FOLDER = 'features';
    var LAYER_TYPE = 'mbtiles';

    /**
     * check for layers inside a dir
     * @param dir the name of the directory to look in
     * @callback
     */
    var checkForLayers = function(dir, callback) {
        var directoryReader = dir.createReader();
        directoryReader.readEntries(function(entries) {
            var id, name, options, fileEntry;

            for (var i = 0; i < entries.length; i++) {
                fileEntry = entries[i];

                if (fileEntry.name.indexOf('-journal') === -1) {
                    id = fileEntry.name;
                    name = fileEntry.name;
                    options = {
                        fileURL: fileEntry.toURL()
                    };

                    map.addLayerToLayersList(id, name, LAYER_TYPE, options);
                }
            }
        });
    };

    /**
     * Download layer to disk.
     */
    var downloadLayer = function(event){
        var $target = $(event.target);
        var layer = $("label[for='"+$target.attr('id')+"']").text();

        var itemUrl;

        // COBWEB uses the anonymous user id for downloading layers,
        // so if its defined use it.
        var annonUserId = utils.getAnonymousUserId();
        if(annonUserId){
            itemUrl = pcapi.buildFSUserUrl(utils.getAnonymousUserId(), TILES_FOLDER, layer);
        }
        else{
            itemUrl = pcapi.buildFSUrl(TILES_FOLDER, layer);
        }

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
                map.removeLayersFromLayerList(layer);
                $.mobile.loading('hide');
            });

        }
    };

    /**
     * create layers list for downloading on download section
     */
    var savedLayersPage = function(){
        var $layersList = $(".layers-list");
        var layers = map.getLayersFromLayerList();
        var list = [];

        utils.showPageLoadingMsg('Checking for Layers ');

        //fetch the metadata from mbtiles and add them to the listview
        pcapi.getFSItems(TILES_FOLDER, utils.getAnonymousUserId()).then(function(data){

            $.each(data.metadata, $.proxy(function(i, item){
                var fileName = item.substring(item.lastIndexOf('/') + 1, item.length);
                var checked = '';
                if (layers.hasOwnProperty(fileName)) {
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
     * Show a POI layer adding it if necessary
     * @param layerMetadata {Object}
     *     - id {String} layer identifier
     *     - name {String} layer name
     *     - options {Object} options for the layer
     */
    var showLayer = function(layerMetadata) {
        var $target = $(event.target);
        //var layerName = $("label[for='"+$target.attr('id')+"']").text();
        var layerName = layerMetadata.name;

        var layerType;
        // if($target.prop('checked')){
        if (!map.layerExists(layerName)) {
            layerType = layerName.match(/\.(.*)$/)[1];

            switch (layerType) {
                case 'db':
                case 'mbtiles':
                    mbtiles.showMbTilesLayer(layerName);
                    break;
                case 'kml':
                    var kml = file.appendFile(layersDir, layerName);
                    var layer = map.addKMLLayer({
                        id: layerName,
                        url: kml
                    });

                    layer.events.register('loadend', this, function() {
                        map.zoomToExtent(layer.getDataExtent());
                    });

                    $('#map-page-layers-panel').panel('close');
                    break;
                default:
                    utils.inform('Don\'t know how to display ' + layerName);
            }
        }
        else {
            map.showLayerByName(layerName);
        }
    };

    /**
     * Hide a layer
     * @param layerMetadata {Object}
     *     - id {String} layer identifier
     *     - name {String} layer name
     *     - options {Object} options for the layer
     */
    var hideLayer = function(layerMetadata) {
        var layerName = layerMetadata.name;
        map.hideLayerByName(layerName);
    };

    /**
     * Zom to the extent of the layer
     * @param layerMetadata {Object}
     *     - id {String} layer identifier
     *     - name {String} layer name
     *     - options {Object} options for the layer
     */
    var zoomToExtentLayer = function(layerMetadata) {
        var layerName = layerMetadata.name;
        var layer = map.getLayerByName(layerName);
        if (layer) {
            map.zoomToExtent(layer);
        }
    };

    /**
     * Initialize the tiles directory and scan for tiles
     */
    var initLayersLocation = function() {
        var root;

        if (utils.isMobileDevice()) {
            // check settings first for defined pcapi root url
            root = settings.get('pcapi-url');

            if (root === undefined) {
                root = utils.getPCAPIURL();
            }

            file.createDir({
                name: TILES_FOLDER,
                success: function(dir) {
                    layersDir = dir;
                    mbtiles.init(layersDir);
                    checkForLayers(layersDir);

                }
            });

        }
        else {
            root = 'http://' + location.hostname;
            if (location.port) {
                root += ':' + location.port;
            }
        }

        //initialize pcapi
        pcapi.init({url: root, version: utils.getPCAPIVersion()});
    };

   /**
     * Perform initialization actions for the the plugin
     */
    var initPlugin = function() {
        initLayersLocation();

        // Listen for on/off events in the layer list
        map.suscribeToLayersControl({
            enableLayer: function(event, layerMetadata) {
                if (layerMetadata.type === LAYER_TYPE) {
                    showLayer(layerMetadata);
                }
            },
            disableLayer: function(event, layerMetadata) {
                if (layerMetadata.type === LAYER_TYPE) {
                    hideLayer(layerMetadata);
                }
            },
            clickLayer: function(event, layerMetadata) {
                if (layerMetadata.type === LAYER_TYPE) {
                    zoomToExtentLayer(layerMetadata);
                }
            }
        });

        $(document).on('pageshow', '#saved-layers-page', savedLayersPage);

        //download layer event
        $(document).on('change', '.download-layer', downloadLayer);

        // click on layer on map side panel
        $(document).on('change', '.show-layer', showLayer);

        $('head').prepend('<link rel="stylesheet" href="plugins/overlays/css/style.css" type="text/css" />');
    };

    initPlugin();

});
