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

/**
 * MB tiles overlays.
 */
define(['map', 'file', 'utils', './database'], function(map, file, utils, db){

    /**
     * MB tiles TMS layer.
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
            var len = data.length;
            db.getTiles(callback, scope, data[len-2], data[len-1], data[len-3], url);
        },
        getURL: function(bounds) {
            return OpenLayers.Layer.TMS.prototype.getURL.apply(this, [bounds]);
        },
    });


return{

    /**
     * @param layersDir Layers DirectoryEntry.
     */
    init: function(layersDir){
        this.layersDir = layersDir;
    },

    /**
     * Display mbtiles layer on map.
     * @param layerName
     */
    showMbTilesLayer: function(layerName){
        var dbname = file.getFilePathWithoutProtocol(this.layersDir) + '/' + layerName;
        var tileLayer = new MapWithLocalMBTiles({
            name: layerName,
            dbname: dbname,
            url: utils.getMapServerUrl(),
            layerName: layerName,
            type: 'png',
            isBaseLayer: false,
            opacity: 1,
            serviceVersion: ''
        });
        map.addMapLayer(tileLayer);
        map.moveLayerUnderAnnotation(tileLayer);
        this.zoomToExtent();
    },

    /**
     * Zoom to the extent of the mbtile layer.
     */
    zoomToExtent: function(){
        db.getBBox(function(data){
            var bounds = new OpenLayers.Bounds(
                map.tile2long(data.minx, data.z),
                map.tileTMS2lat(data.miny, data.z),
                map.tile2long(data.maxx, data.z),
                map.tileTMS2lat(data.maxy, data.z));
            map.zoomToExtent(bounds, true);
        });
    },
};

});
