/*\
title: $:/plugins/ipfs/ipfs-startup.js
type: application/javascript
tags: $:/ipfs/core
module-type: startup

Startup initialisation

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const EnsAction = require("$:/plugins/ipfs/ens-action.js").EnsAction;
const IpfsAction = require("$:/plugins/ipfs/ipfs-action.js").IpfsAction;
const IpfsTiddler = require("$:/plugins/ipfs/ipfs-tiddler.js").IpfsTiddler;

exports.platforms = ["browser"];
exports.after = ["startup"];
exports.synchronous = true;

exports.startup = async function() {

  // Logger name
  const name = "ipfs-startup";

  // Requirement
  if($tw.wiki.getTiddler("$:/plugins/bimlas/locator") == undefined) {
    $tw.utils.alert(
      name,
      "The plugin [ext[IPFS with TiddlyWiki|https://bluelightav.eth.link/#%24%3A%2Fplugins%2Fipfs]] requires the [ext[Locator plugin by bimlas|https://bimlas.gitlab.io/tw5-locator/#%24%3A%2Fplugins%2Fbimlas%2Flocator]] to be installed"
    );
  }

  // Missing Media Types
  $tw.utils.registerFileType("audio/mpeg","base64",".mp2");
  $tw.utils.registerFileType("image/jpeg","base64",".jpeg",{flags:["image"]});
  $tw.utils.registerFileType("image/jpg","base64",".jpg",{flags:["image"]});
  $tw.utils.registerFileType("video/ogg","base64",[".ogm",".ogv",".ogg"]);
  $tw.utils.registerFileType("video/quicktime","base64",[".mov",".qt"]);
  $tw.utils.registerFileType("video/webm","base64",".webm");

  // Listener
  this.ensAction = new EnsAction();
  this.ipfsAction = new IpfsAction();
  this.ipfsTiddler = new IpfsTiddler();

  // Init event listeners
  this.ensAction.init();
  this.ipfsAction.init();
  this.ipfsTiddler.init();

  // Log
  const logger = window.log.getLogger(name);
  logger.info("ipfs-startup is starting up...");

};

})();
