/*\
title: $:/plugins/ipfs/ipfs-saver.js
type: application/javascript
tags: $:/ipfs/core
module-type: saver

IPFS Saver

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const log = require("$:/plugins/ipfs/loglevel/loglevel.js");

  const EnsAction = require("$:/plugins/ipfs/ens-action.js").EnsAction;
  const IpfsAction = require("$:/plugins/ipfs/ipfs-action.js").IpfsAction;
  const IpfsController = require("$:/plugins/ipfs/ipfs-controller.js").IpfsController;
  const IpfsTiddler = require("$:/plugins/ipfs/ipfs-tiddler.js").IpfsTiddler;

  const fileProtocol = "file:";
  const ensKeyword = "ens";
  const ipfsKeyword = "ipfs";
  const ipnsKeyword = "ipns";

  const name = "ipfs-saver";

  /*
   * Select the appropriate saver module and set it up
   */
  var IpfsSaver = function (wiki) {
    this.wiki = wiki;
    this.apiUrl = null;
    this.ipfsProvider = null;
    // Loglevel
    if (window.log == undefined || window.log == null) {
      // Init
      window.log = log;
      if ($tw.utils.getIpfsVerbose()) {
        log.setLevel("info", false);
      } else {
        log.setLevel("warn", false);
      }
    }
    // Controller
    this.ipfsController = new IpfsController();
    // Global Object
    $tw.ipfsController = this.ipfsController;
    // Listener
    this.ensAction = new EnsAction(this.ipfsController);
    this.ipfsAction = new IpfsAction(this.ipfsController);
    this.ipfsTiddler = new IpfsTiddler(this.ipfsController);
    // Init
    this.ensAction.init();
    this.ipfsAction.init();
    this.ipfsTiddler.init();
    // Logger
    const logger = window.log.getLogger(name);
    // Log
    logger.info("ipfs-saver is starting up...");
    // Log url policy
    const base = this.ipfsController.getIpfsBaseUrl();
    if ($tw.utils.getIpfsUrlPolicy() === "origin") {
      logger.info("Origin base URL:" + "\n " + base.toString());
    } else {
      logger.info("Gateway base URL:" + "\n " + base.toString());
    }
  };

  IpfsSaver.prototype.getLogger = function () {
    return window.log.getLogger(name);
  };

  IpfsSaver.prototype.save = async function (text, method, callback, options) {
    // Is there anything to do
    if ($tw.saverHandler.isDirty() == false) {
      return false;
    }

    try {
      // Init
      var ipfsProtocol = null;
      var ipnsKey = null;
      var ipnsName = null;
      var ipnsCid = null;
      var cid = null;
      var ensDomain = null;
      var ensContent = null;
      var options = options || {};
      // Process document URL
      const wiki = this.ipfsController.getDocumentUrl();
      // Retrieve base URL
      const base = this.ipfsController.getIpfsBaseUrl();
      // Next
      const nextWiki = this.ipfsController.getUrl(wiki);
      nextWiki.protocol = base.protocol;
      nextWiki.hostname = base.hostname;
      nextWiki.port = base.port;
      // URL Analysis
      if (wiki.protocol !== fileProtocol) {
        // Decode pathname
        var { protocol, cid } = this.ipfsController.decodeCid(wiki.pathname);
        // Check
        if (protocol != null && cid != null) {
          // Store current protocol
          ipfsProtocol = protocol;
          // Request to unpin
          if ($tw.utils.getIpfsUnpin() && ipfsProtocol === ipfsKeyword) {
            await this.ipfsController.requestToUnpin(cid);
          }
        }
      }
      // IPNS
      if (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword) {
        // Resolve current IPNS
        if (ipfsProtocol === ipnsKeyword) {
          this.getLogger().info("Processing current IPNS key...");
          var { ipnsKey, ipnsName } = await this.ipfsController.getIpnsIdentifiers(cid);
          try {
            ipnsCid = await this.ipfsController.resolveIpnsKey(ipnsKey);
          } catch (error) {
            // Log and continue
            if (ipnsName == null || ipnsKey == null) {
              this.getLogger().error(error);
            } else {
              this.getLogger().warn(error);
            }
            $tw.utils.alert(name, error.message);
            // Fallback to default
            if (ipnsName === null && ipnsKey === null && $tw.utils.getIpfsProtocol() === ipnsKeyword) {
              ipnsName = $tw.utils.getIpfsIpnsName();
              ipnsKey = $tw.utils.getIpfsIpnsKey();
              this.getLogger().info("Processing default IPNS...");
              var { ipnsKey, ipnsName } = await this.ipfsController.getIpnsIdentifiers(ipnsKey, ipnsName);
              try {
                ipnsCid = await this.ipfsController.resolveIpnsKey(ipnsKey);
              } catch (error) {
                // Log and continue
                this.getLogger().warn(error);
                $tw.utils.alert(name, error.message);
              }
            }
          }
          // Resolve default IPNS
        } else {
          ipnsName = $tw.utils.getIpfsIpnsName();
          ipnsKey = $tw.utils.getIpfsIpnsKey();
          this.getLogger().info("Processing default IPNS name and IPNS key...");
          var { ipnsKey, ipnsName } = await this.ipfsController.getIpnsIdentifiers(ipnsKey, ipnsName);
          try {
            ipnsCid = await this.ipfsController.resolveIpnsKey(ipnsKey);
          } catch (error) {
            // Log and continue
            this.getLogger().warn(error);
            $tw.utils.alert(name, error.message);
          }
        }
        // Request to unpin
        if ($tw.utils.getIpfsUnpin() && ipnsCid !== null) {
          await this.ipfsController.requestToUnpin(ipnsCid);
        }
      }
      // ENS Analysis
      if ($tw.utils.getIpfsProtocol() === ensKeyword) {
        // Getting default ens domain
        ensDomain = $tw.utils.getIpfsEnsDomain();
        // Check
        if (ensDomain == null) {
          callback("Undefined ENS domain...");
          return false;
        }
        // Fetch ENS domain content
        const { content } = await this.ipfsController.resolveEns(ensDomain);
        // Request to unpin
        if ($tw.utils.getIpfsUnpin() && content !== null) {
          await this.ipfsController.requestToUnpin(content);
        }
      }
      // Upload  current document
      this.getLogger().info("Uploading wiki: " + text.length + " bytes");
      // Add
      const { added } = await this.ipfsController.addToIpfs(text);
      // Default next
      nextWiki.pathname = "/" + ipfsKeyword + "/" + added;
      // Pin, if failure log and continue
      try {
        await this.ipfsController.pinToIpfs(added);
      } catch (error) {
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
      }
      // Publish to IPNS
      if (ipnsName !== null && (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword)) {
        this.getLogger().info("Publishing IPNS name: " + ipnsName);
        /*
         * Publishing is failing as the server is behind a nat
         * However the local server is getting the update ????
         **/
        try {
          await this.ipfsController.publishToIpns(ipnsKey, ipnsName, added);
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
        // IPNS next
        nextWiki.pathname = "/" + ipnsKeyword + "/" + ipnsKey;
      }
      // Publish to ENS
      if ($tw.utils.getIpfsProtocol() === ensKeyword) {
        try {
          await this.ipfsController.setEns(ensDomain, added);
          // ENS next
          nextWiki.protocol = "https:";
          nextWiki.host = ensDomain;
        } catch (error) {
          // Log and continue
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          // Discard unpin request
          if (ipfsProtocol === ipnsKeyword && $tw.utils.getIpfsUnpin() && ensContent !== null) {
            this.ipfsController.discardRequestToUnpin(ensContent);
          }
        }
      }
      // Unpin
      if ($tw.utils.getIpfsUnpin()) {
        for (var i = this.ipfsController.unpin.length - 1; i >= 0; i--) {
          try {
            const unpin = this.ipfsController.unpin[i];
            await this.ipfsController.unpinFromIpfs(unpin);
            // Remove unpin request
            this.ipfsController.removeFromUnpin(unpin);
          } catch (error) {
            // Log and continue
            this.getLogger().warn(error);
            $tw.utils.alert(name, error.message);
          }
        }
      }
      // Done
      callback(null);
      // Next
      if (nextWiki.toString() !== wiki.toString()) {
        window.location.assign(nextWiki.toString());
      }
    } catch (error) {
      this.getLogger().error(error);
      callback(error.message);
      return false;
    }
    return true;
  };

  /*
   * Information about this saver
   */
  IpfsSaver.prototype.info = {
    name: "Ipfs",
    priority: 3100,
    capabilities: ["save"],
  };

  /*
   * Static method that returns true if this saver is capable of working
   */
  exports.canSave = function (wiki) {
    return true;
  };

  /*
   * Create an instance of this saver
   */
  exports.create = function (wiki) {
    return new IpfsSaver(wiki);
  };
})();
