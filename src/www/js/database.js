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

define(['utils'], function(utils){
    var localdb, dbname;
    
    var initDB = function(name){
        console.log("init db");
        dbname = utils.getPersistentRoot()+"/tiles/"+name;
        if(!window.sqlitePlugin){
            console.log("The is something wrong with slqite phonegap plugin");
        }else{
            localdb = window.sqlitePlugin.openDatabase({name: dbname});
            console.log("success opening db: "+dbname);
        }
    };

    var onError = function(tx, e) {
        console.warn("There has been an error: " + e.message);
    };

    var getCachedTilePath = function(callback, scope, x, y, z, url ){

        var resultsCallback = function(tx, rs) {
            //console.log('resultsCallback *********************' );
            //console.log('rs.rows.length ' + rs.rows.length);
            
            if(callback) {
                console.log(rs.rows.length);
                if( rs.rows.length > 0 ) {
                    console.log("rows big 0")

                    var rowOutput  = rs.rows.item(0);
                    var tile_data = rowOutput['tile_data'];
                    callback.call(scope,"data:image/png;base64,"+tile_data);
                } else {
                    callback.call(scope, "img/empty.png");
                }
            }
        }
    
        localdb.transaction(function(tx) {
            tx.executeSql("SELECT tile_data as tile_data FROM tiles where zoom_level=? AND tile_column=? AND tile_row=?", [z,x,y], resultsCallback, onError);
        });
    };

    return {
        "open": initDB,
        "getTiles": getCachedTilePath
    }
});