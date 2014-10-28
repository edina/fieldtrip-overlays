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

/**
 * TODO
 */
define(['utils', 'settings', 'config', 'map', 'file', 'plugins/sync/js/download', 'plugins/sync/js/pcapi', './database'], function(// jshint ignore:line
    utils, settings, config, map, file, download, pcapi, db){

    var layersDir, root, layers = [];
    var TILES_FOLDER = "layers";

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
     * create layers list for downloading on download section
     */
    var createLayersListForDownload = function(){
        var $layersList = $(".layers-list");
        var list = [];

        //pcapi.setUserId(login.getUser().id);
        utils.showPageLoadingMsg('Checking for Layers ');
        //fetch the metadata from mbtiles and add them to the listview
        //pcapi.setProvider(localStorage.getItem('cloud-provider'));
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
     * read data from the database
     */
    var MapWithLocalMBTiles = OpenLayers.Class(OpenLayers.Layer.TMS, {
        initialize: function(options) {
            this.serviceVersion = options.serviceVersion;
            this.layername = options.layerName;
            this.type = options.type;
            this.dbname = options.dbname;
            this.isBaseLayer = options.isBaseLayer;
            this.opacity = options.opacity;
            this.visibility = true;

            // this boolean determines which overriden method is called getURLasync
            // or getURL. Using getURLasync was causing the application to freeze,
            // often getting a ANR
            //this.async = typeof(webdb) !== 'undefined';
            this.async = true;
            if(this.async === true){
                db.open(this.dbname);
            }

            OpenLayers.Layer.TMS.prototype.initialize.apply(
                this,
                [options.name, options.url, {}]
            );
        },
        getURLasync: function(bounds, callback, scope) {
            var url = OpenLayers.Layer.TMS.prototype.getURL.apply(this, [bounds]);
            var data = url.match(/\/(\d+)/g).join("").split("/");
            db.getTiles(callback, scope, data[2], data[3], data[1], url);
        },
        getURL: function(bounds) {
            return OpenLayers.Layer.TMS.prototype.getURL.apply(this, [bounds]);
        },
    });

    if(utils.isMobileDevice()){
        // check settings first for defined pcapi root url
        root = settings.get("pcapi-url");
        if(root === undefined){
            root = config.pcapiurl;
        }
        file.createDir({
            'name' : TILES_FOLDER,
            'success': function(dir){
                layersDir = dir;
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
    pcapi.init({"url": root, "version": config.pcapiversion});

    $(document).on('pageshow', '#map-page', function(){
        $( "body>[data-role='panel']" ).panel();
        createLayersListForMap(layers);
    });

    $(document).on('pageshow', '#saved-layers-page', createLayersListForDownload);

    //download layer event
    $(document).off('vclick', '.download-layer');
    $(document).on(
        'vclick',
        '.download-layer',
        function(){
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
            /*jshint multistr: true */
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
                    var options = {"fileName": layer, "remoteDir": "tiles", "localDir": layersDir, "targetName": layer};
                    if(layer.indexOf("mbtiles")){
                        options.targetName = layer.substring(layer.lastIndexOf('/')+1, layer.lastIndexOf('.'))+".db";
                    }

                    //TODO rename the file while downloading it
                    download.downloadItem(options, function(){
                        $.mobile.loading('hide');
                        checkForLayers(layersDir, function(layers){
                            $.mobile.changePage('map.html');
                            createLayersListForMap(layers);
                        });
                    });
                }
            );
        }
    );

    $(document).off('vclick', '.show-layer');
    $(document).on('vclick', '.show-layer', function(event){
        $.mobile.changePage('map.html');
        var layerName = $(this).text();
        var projections;
        var dbname = file.getFilePathWithoutStart(layersDir)+'/'+layerName;
        if(utils.isMobileDevice()){
            if(!map.checkIfLayerExists(layerName)){
                var tileLayer = new MapWithLocalMBTiles({
                    name: layerName,
                    dbname: dbname,
                    url: utils.getMapServerUrl(),
                    layerName: layerName,
                    type: 'png',
                    isBaseLayer: false,
                    opacity: 0.5,
                    serviceVersion: ''
                });
                map.addMapLayer(tileLayer);
                projections = map.getProjections();
                db.open(dbname);
                db.getBBox(function(data){
                    map.zoomToExtent(new OpenLayers.Bounds(map.tile2long(data.minx, data.z),map.tileTMS2lat(data.miny, data.z), map.tile2long(data.maxx, data.z),map.tileTMS2lat(data.maxy, data.z)).transform(projections[1], projections[0]));
                });
            }
        }
        else{
            //TODO get rid of it or get the url externally
            map.addRemoteMBTilesLayer({
                "name": layerName,
                "url": "<url>",
                "db": layerName
            });
            projections = map.getProjections();
            map.zoomToExtent(new OpenLayers.Bounds(-4.2709,52.3857,-3.5184,52.8094).transform(projections[1], projections[0]));
        }
    });

    $('head').prepend('<link rel="stylesheet" href="plugins/overlays/css/style.css" type="text/css" />');
});