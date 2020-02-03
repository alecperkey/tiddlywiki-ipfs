/*\
title: $:/plugins/ipfs/ipfs-action.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsAction

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const log = require("$:/plugins/ipfs/loglevel/loglevel.js");
const root = require("$:/plugins/ipfs/window-or-global/index.js");

const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
const IpfsUri = require("$:/plugins/ipfs/ipfs-uri.js").IpfsUri;
const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

const fileProtocol = "file:";
const ipfsKeyword = "ipfs";
const ipnsKeyword = "ipns";

const name = "ipfs-action";

var IpfsAction = function() {
  this.once = false;
  this.ensWrapper = new EnsWrapper();
  this.ipfsUri = new IpfsUri();
  this.ipfsWrapper = new IpfsWrapper();
  this.ipnsName = $tw.utils.getIpfsIpnsName();
  this.ipnsKey = $tw.utils.getIpfsIpnsKey();
};

IpfsAction.prototype.getLogger = function() {
  return log.getLogger(name);
}

IpfsAction.prototype.init = function() {
  // Init once
  if (this.once) {
    return;
  }
  const self = this;
  // Widget
  $tw.rootWidget.addEventListener("tm-export-to-ipfs", function(event) {
    return self.handleExportToIpfs(event);
  });
  $tw.rootWidget.addEventListener("tm-fetch-ipns-key", function(event) {
    return self.handleFetchIpnsKey(event);
  });
  $tw.rootWidget.addEventListener("tm-generate-ipns-key", function(event) {
    return self.handleGenerateIpnsKey(event);
  });
  $tw.rootWidget.addEventListener("tm-ipfs-pin", function(event) {
    return self.handleIpfsPin(event);
  });
  $tw.rootWidget.addEventListener("tm-ipfs-unpin", function(event) {
    return self.handleIpfsUnpin(event);
  });
  $tw.rootWidget.addEventListener("tm-mobile-console", function(event) {
    return self.handleMobileConsole(event);
  });
  $tw.rootWidget.addEventListener("tm-publish-to-ipfs", function(event) {
    return self.handlePublishToIpfs(event);
  });
  $tw.rootWidget.addEventListener("tm-publish-to-ipns", function(event) {
    return self.handlePublishToIpns(event);
  });
  $tw.rootWidget.addEventListener("tm-remove-ipns-key", function(event) {
    return self.handleRemoveIpnsKey(event);
  });
  $tw.rootWidget.addEventListener("tm-rename-ipns-name", function(event) {
    return self.handleRenameIpnsName(event);
  });
  $tw.rootWidget.addEventListener("tm-resolve-ipns-key-and-open", function(event) {
    return self.handleResolveIpnsKeyAndOpen(event);
  });
  // Init once
  this.once = true;
}

IpfsAction.prototype.handleExportToIpfs = async function(event) {

  try {

    const title = event.tiddlerTitle;

    var unpin = [];
    var fields = [];
    var ipfsUri = null;
    var ipnsKey = null;
    var ipnsName = null;
    var ipnsContent = null;
    var web3Provider = null;
    var ipfs = null;
    var account = null;
    var ensDomain = null;
    var ensContent = null;

    // Load tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      $tw.utils.alert(name, "Unknown Tiddler...");
      return false;
    }

    // Type
    var type = tiddler.getFieldString("type");
    // Default
    if (type == undefined || type == null || type.trim() === "") {
      type = "text/vnd.tiddlywiki";
    }

    // Content Type
    const info = $tw.config.contentTypeInfo[type];
    // Check
    if (info == undefined || info == null)  {
      $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
      return false;
    }

    // Check
    if (info.encoding !== "base64" && type !== "image/svg+xml" && type !== "text/vnd.tiddlywiki")  {
      $tw.utils.alert(name, "Unsupported Tiddler Content Type...\nLook at the documentation...");
      return null;
    }

    // Retrieve fields
    ipfsUri = tiddler.getFieldString("_ipfs_uri");
    // Check
    if (ipfsUri == undefined || ipfsUri == null || ipfsUri.trim() === "") {
      ipfsUri = null;
    }
    ipnsName = tiddler.getFieldString("_ipns_name");
    // Check
    if (ipnsName == undefined || ipnsName == null || ipnsName.trim() === "") {
      ipnsName = null;
    }
    ipnsKey = tiddler.getFieldString("_ipns_key");
    // Check
    if (ipnsKey == undefined || ipnsKey == null || ipnsKey.trim() === "") {
      ipnsKey = null;
    }
    ensDomain = tiddler.getFieldString("_ens_domain");
    // Check
    if (ensDomain == undefined || ensDomain == null || ensDomain.trim() === "") {
      ensDomain = null;
    }

    // IPFS client
    var { ipfs } = await this.ipfsWrapper.getIpfsClient(this.ipfsUri.getIpfsApiUrl());

    // Unpin current
    if (ipfsUri !== null) {
      // Decode
      const parsed = this.ipfsUri.getUrl(ipfsUri.trim());
      if (parsed.pathname === "/") {
        $tw.utils.alert(name, "Unknown pathname...");
        return false;
      }
      const { cid } = this.ipfsWrapper.decodeCid(parsed.pathname);
      if ($tw.utils.getIpfsUnpin()
        && cid !== null
        && root.unpin.indexOf(cid) == -1
      ) {
        unpin.push(cid);
        this.getLogger().info(
          "Request to unpin IPFS Tiddler:"
          + "\n "
          + this.ipfsUri.normalizeUrl("/" + ipfsKeyword + "/" + cid)
        );
      }
    }

    // Analyse IPNS
    if (ipnsName !== null || ipnsKey !== null) {
      this.getLogger().info("Processing IPNS Tiddler...");
      var { ipnsKey } = await this.ipfsWrapper.fetchIpns(ipfs, ipnsKey, ipnsName);
      try {
        ipnsContent = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
      } catch (error) {
        // Log and continue
        this.getLogger().warning(error.message);
        ipnsContent = null;
      }
      // Store to unpin previous if any
      if (
        $tw.utils.getIpfsUnpin()
        && ipnsContent !== null
        && root.unpin.indexOf(ipnsContent) == -1
      ) {
        unpin.push(ipnsContent);
        this.getLogger().info(
          "Request to unpin IPNS Tiddler:"
          + "\n "
          + this.ipfsUri.normalizeUrl("/" + ipfsKeyword + "/" + ipnsContent)
        );
      }
    }

    // Analyse ENS
    if (ensDomain !== null) {
      // Retrieve a Web3 provider
      var { web3Provider, account } = await this.ensWrapper.getWeb3Provider();
      // Fetch ENS domain content
      const { content } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
      // Store to unpin previous if any
      if (
        $tw.utils.getIpfsUnpin()
        && content !== null
        && root.unpin.indexOf(content) == -1
      ) {
        unpin.push(content);
        this.getLogger().info(
          "Request to unpin ENS domain content:"
          + "\n "
          + this.ipfsUri.normalizeUrl("/" + ipfsKeyword + "/" + content)
        );
      }
    }

    // Getting content
    const content = this.ipfsWrapper.getTiddlerAsTid(tiddler);
    // Check
    if (content == null) {
      return false;
    }

    this.getLogger().info(
      "Uploading Tiddler: "
      + content.length
      + " bytes"
    );

    // Add
    const { added } = await this.ipfsWrapper.addToIpfs(ipfs, content);
    fields.push( { key: "_ipfs_uri", value: "/" + ipfsKeyword + "/" + added } );

    // Pin, if failure log and continue
    try {
      await this.ipfsWrapper.pinToIpfs(ipfs, added);
    } catch (error)  {
      this.getLogger().warning(error);
      $tw.utils.alert(name, error.message);
    }

    // Publish to IPNS
    if (ipnsName !== null && ipnsKey !== null) {
      this.getLogger().info(
        "Publishing IPNS Tiddler: "
        + ipnsName
      );
      try {
        await this.ipfsWrapper.publishToIpns(ipfs, ipnsName, added);
        fields.push( { key: "_ipfs_uri", value: "/" + ipnsKeyword + "/" + ipnsKey } );
      } catch (error)  {
        // Log and continue
        this.getLogger().warning(error);
        $tw.utils.alert(name, error.message);
        // Remove from unpin
        const index = unpin.indexOf(ipnsContent);
        if (index !== -1) {
          unpin.splice(index, 1);
        }
        // Log
        if (index !== -1) {
          this.getLogger().info(
            "Discard request to unpin IPNS Tiddler:"
            + "\n "
            + this.ipfsUri.normalizeUrl("/" + ipfsKeyword + "/" + ipnsContent)
          );
        }
      }
    }

    // Publish to ENS
    if (ensDomain !== null) {
      this.getLogger().info(
        "Publishing ENS domain content: "
        + ensDomain
      );
      try {
        await this.ensWrapper.setContenthash(ensDomain, added, web3Provider, account);
        fields.push( { key: "_ipfs_uri", value: "https://" + ensDomain } );
      } catch (error) {
        // Log and continue
        this.getLogger().error(error.message);
        $tw.utils.alert(name, error.message);
        // Discard unpin
        const index = unpin.indexOf(ensContent);
        if (index !== -1) {
          unpin.splice(index, 1);
        }
        // Log
        if (index !== -1) {
          this.getLogger().info(
            "Discard request to unpin ENS domain content:"
            + "\n "
            + this.ipfsUri.normalizeUrl("/" + ipfsKeyword + "/" + ensContent)
          );
        }
      }
    }

    // Unpin
    if ($tw.utils.getIpfsUnpin()) {
      for (var i = 0; i < unpin.length; i++) {
        try {
          await this.ipfsWrapper.unpinFromIpfs(ipfs, unpin[i]);
        } catch (error)  {
          // Log and continue
          this.getLogger().warning(error);
          $tw.utils.alert(name, error.message);
        }
      }
      unpin = [];
    }

    // Update Tiddler
    var addTags = [];
    if ($tw.crypto.hasPassword()) {
      addTags = ["$:/isEncrypted", "$:/isExported", "$:/isIpfs"];
    } else {
      addTags = ["$:/isExported", "$:/isIpfs"];
    }
    // Update
    const updatedTiddler = $tw.utils.updateTiddler({
      tiddler: tiddler,
      addTags: addTags,
      fields: fields
    });

    if (updatedTiddler !== null) {
      $tw.wiki.addTiddler(updatedTiddler);
    } else {
      return false;
    }

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

IpfsAction.prototype.handlePublishToIpfs = async function(event) {

  const title = event.tiddlerTitle;

  // Load tiddler
  const tiddler = $tw.wiki.getTiddler(title);
  if (tiddler == undefined || tiddler == null) {
    $tw.utils.alert(name, "Unknown Tiddler...");
    return false;
  }

  // Type
  var type = tiddler.getFieldString("type");
  // Default
  if (type == undefined || type == null || type.trim() === "") {
    type = "text/vnd.tiddlywiki";
  }

  // Content Type
  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
    return false;
  }

  // Check
  if (info.encoding !== "base64" && type !== "image/svg+xml")  {
    $tw.utils.alert(name, "This Tiddler do not contain any attachment...");
    return false;
  }

  // Do not process if _canonical_uri is set
  const canonical_uri = tiddler.getFieldString("_canonical_uri");
  if (canonical_uri !== undefined && canonical_uri !== null && canonical_uri.trim() !== "") {
    $tw.utils.alert(name, "Attachment is already published...");
    return false;
  }

  // Getting content
  const content = this.ipfsWrapper.getTiddlerContent(tiddler);
  // Check
  if (content == null) {
    return false;
  }

  try {

    // IPFS client
    const { ipfs } = await this.ipfsWrapper.getIpfsClient(this.ipfsUri.getIpfsApiUrl());

    this.getLogger().info(
      "Uploading attachment: "
      + content.length
      + " bytes"
    );

    // Add
    const { added } = await this.ipfsWrapper.addToIpfs(ipfs, content);

    // Pin, if failure log and continue
    try {
      await this.ipfsWrapper.pinToIpfs(ipfs, added);
    } catch (error)  {
      this.getLogger().warning(error);
      $tw.utils.alert(name, error.message);
    }

    var addTags = [];
    var removeTags = [];
    if ($tw.crypto.hasPassword()) {
      addTags = ["$:/isAttachment", "$:/isEncrypted", "$:/isIpfs"];
      removeTags = ["$:/isEmbedded"];
    } else {
      addTags = ["$:/isAttachment", "$:/isIpfs"];
      removeTags = ["$:/isEmbedded"];
    }
    // Update
    const updatedTiddler = $tw.utils.updateTiddler({
      tiddler: tiddler,
      addTags: addTags,
      removeTags: removeTags,
      fields: [
        { key: "text", value: "" },
        { key: "_canonical_uri", value: "/" + ipfsKeyword + "/" + added }
      ]
    });
    if (updatedTiddler !== null) {
      $tw.wiki.addTiddler(updatedTiddler);
    } else {
      return false;
    }

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

IpfsAction.prototype.handleIpfsPin = async function(event) {

  try {

    var parsed = null;
    var cid = null;

    if (event.param !== undefined && event.param !== null) {
      const title = event.tiddlerTitle;
      // current tiddler
      const tiddler = $tw.wiki.getTiddler(title);
      if (tiddler == undefined || tiddler == null) {
        $tw.utils.alert(name, "Unknown tiddler: " + title);
        return false;
      }
      // Process if _canonical_uri is set
      const uri = tiddler.getFieldString("_canonical_uri");
      if (uri == undefined || uri == null || uri.trim() === "") {
        $tw.utils.alert(name, "This Tiddler is not an external resource...");
        return false;
      }
      // decode _canonical_uri
      parsed = this.ipfsUri.getUrl(uri.trim());
    } else {
      // decode document URL
      parsed = this.ipfsUri.getDocumentUrl();
    }

    // Check
    if (parsed.protocol === fileProtocol) {
      $tw.utils.alert(name, "Undefined IPFS wiki...");
      return false;
    }
    if (parsed.pathname === "/") {
      $tw.utils.alert(name, "Unknown pathname...");
      return false;
    }

    // Extract and check URL IPFS protocol and cid
    var { protocol, cid } = this.ipfsWrapper.decodeCid(parsed.pathname);

    // Check
    if (protocol == null) {
      $tw.utils.alert(name, "Unknown IPFS protocol...");
      return false;
    }
    if (cid == null) {
      $tw.utils.alert(name, "Unknown IPFS identifier...");
      return false;
    }

    // IPFS client
    const { ipfs } = await this.ipfsWrapper.getIpfsClient(this.ipfsUri.getIpfsApiUrl());

    // Resolve ipns key if applicable
    if (protocol === ipnsKeyword) {
      const { ipnsKey } = await this.ipfsWrapper.fetchIpns(ipfs, cid);
      try {
        cid = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
      } catch (error) {
        // Log and continue
        this.getLogger().warning(error.message);
        $tw.utils.alert(error.message);
        cid = null;
      }
    }

    this.getLogger().info(
      "Pinning:"
      + "\n "
      + this.ipfsUri.normalizeUrl("/" + ipfsKeyword + "/" + cid)
    );

    await this.ipfsWrapper.pinToIpfs(ipfs, cid);

    const index = root.unpin.indexOf(cid);
    if ($tw.utils.getIpfsUnpin() && index !== -1) {
      root.unpin.splice(index, 1);
      this.getLogger().info(
        "Discard request to unpin:"
        + "\n "
        + this.ipfsUri.normalizeUrl("/" + ipfsKeyword + "/" + cid)
      );
    }

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

IpfsAction.prototype.handleIpfsUnpin = async function(event) {

  try {

    var parsed = null;
    var cid = null;

    if (event.param !== undefined && event.param !== null) {
      const title = event.tiddlerTitle;
      // current tiddler
      const tiddler = $tw.wiki.getTiddler(title);
      if (tiddler == undefined || tiddler == null) {
        $tw.utils.alert(name, "Unknown tiddler: " + title);
        return false;
      }
      // Process if _canonical_uri is set
      const uri = tiddler.getFieldString("_canonical_uri");
      if (uri == undefined || uri == null || uri.trim() === "") {
        $tw.utils.alert(name, "This Tiddler is not an external resource...");
        return false;
      }
      // decode _canonical_uri
      parsed = this.ipfsUri.getUrl(uri.trim());
    } else {
      // decode document URL
      parsed = this.ipfsUri.getDocumentUrl();
    }

    // Check
    if (parsed.protocol === fileProtocol) {
      $tw.utils.alert(name, "Undefined IPFS wiki...");
      return false;
    }
    if (parsed.pathname === "/") {
      $tw.utils.alert(name, "Unknown pathname...");
      return false;
    }

    // Extract and check URL IPFS protocol and cid
    var { protocol, cid } = this.ipfsWrapper.decodeCid(parsed.pathname);

    // Check
    if (protocol == null) {
      $tw.utils.alert(name, "Unknown IPFS protocol...");
      return false;
    }
    if (cid == null) {
      $tw.utils.alert(name, "Unknown IPFS identifier...");
      return false;
    }

    // IPFS client
    const { ipfs } = await this.ipfsWrapper.getIpfsClient(this.ipfsUri.getIpfsApiUrl());

    // Resolve IPNS key if applicable
    if (protocol === ipnsKeyword) {
      const { ipnsKey } = await this.ipfsWrapper.fetchIpns(ipfs, cid);
      cid = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
    }

    this.getLogger().info(
      "Unpinning:"
      + "\n "
      + this.ipfsUri.normalizeUrl("/" + ipfsKeyword + "/" + cid)
    );

    await this.ipfsWrapper.unpinFromIpfs(ipfs, cid);

    const index = root.unpin.indexOf(cid);
    if ($tw.utils.getIpfsUnpin() && root.unpin.indexOf(cid) !== -1) {
      root.unpin.splice(index, 1);
    }

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

IpfsAction.prototype.handleRenameIpnsName = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();

  // Check
  if (ipnsName == null) {
    $tw.utils.alert(name, "Undefined IPNS name....");
    return false;
  }
  if (this.ipnsName == null || this.ipnsName === ipnsName) {
    $tw.utils.alert(name, "Nothing to rename....");
    return false;
  }

  try {

    // IPFS client
    const { ipfs } = await this.ipfsWrapper.getIpfsClient(this.ipfsUri.getIpfsApiUrl());

    // Rename IPNS name
    const { key } = await this.ipfsWrapper.renameIpnsName(ipfs, this.ipnsName, ipnsName);

    // Update Tiddler
    const tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined) {
      $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [
          { key: "text", value: key }
        ]
      });
    }

    // Successfully renamed
    this.ipnsName = ipnsName;
    this.ipnsKey = key;

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

IpfsAction.prototype.handleGenerateIpnsKey = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();

  // Check
  if (ipnsName == null) {
    $tw.utils.alert(name, "Undefined IPNS name....");
    return false;
  }

  try {

    // IPFS client
    const { ipfs } = await this.ipfsWrapper.getIpfsClient(this.ipfsUri.getIpfsApiUrl());

    // Generate IPNS key
    const key = await this.ipfsWrapper.generateIpnsKey(ipfs, ipnsName);

    // Update Tiddler
    const tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined) {
      $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [
          { key: "text", value: key }
        ]
      });
    }

    // Successfully generated
    this.ipnsName = ipnsName;
    this.ipnsKey = key;

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

IpfsAction.prototype.handleRemoveIpnsKey = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();
  var ipnsKey = $tw.utils.getIpfsIpnsKey();

  // Check
  if (ipnsName == null) {
    $tw.utils.alert(name, "Undefined IPNS name....");
    return false;
  }

  try {

    // IPFS client
    const { ipfs } = await this.ipfsWrapper.getIpfsClient(this.ipfsUri.getIpfsApiUrl());

    // Resolve CID,
    var { ipnsKey, ipnsName } = await this.ipfsWrapper.fetchIpns(ipfs, ipnsKey, ipnsName);
    const resolved = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);

    // Unpin previous
    if ($tw.utils.getIpfsUnpin() && resolved != null) {
      this.getLogger().info(
        "Request to unpin:"
        + "\n "
        + this.ipfsUri.normalizeUrl("/" + ipfsKeyword + "/" + resolved)
      );
      try {
        await this.ipfsWrapper.unpinFromIpfs(ipfs, resolved);
      } catch (error)  {
        // Log and continue
        this.getLogger().warning(error);
        $tw.utils.alert(name, error.message);
      }
    }

    // Remove IPNS key
    await this.ipfsWrapper.removeIpnsKey(ipfs, ipnsName);

    // Update Tiddlers
    var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name");
    if (tiddler !== undefined) {
      $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [
          { key: "text", value: "" }
        ]
      });
    }
    tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined && $tw.utils.getIpfsIpnsKey() !== null) {
      $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [
          { key: "text", value: "" }
        ]
      });
    }

    // Successfully removed
    this.ipnsName = null;
    this.ipnsKey = null;

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

IpfsAction.prototype.handleFetchIpnsKey = async function(event) {

  // Retrieve default IPNS name
  var ipnsName = $tw.utils.getIpfsIpnsName();
  var ipnsKey = $tw.utils.getIpfsIpnsKey();

  // Check
  if (ipnsName == null) {
    $tw.utils.alert(name, "Undefined IPNS name....");
    return false;
  }

  try {

    // IPFS client
    const { ipfs } = await this.ipfsWrapper.getIpfsClient(this.ipfsUri.getIpfsApiUrl());

    // Fetch
    const { ipnsKey: resolvedIpnsKey } = await this.ipfsWrapper.fetchIpns(ipfs, ipnsKey, ipnsName);

    // Update Tiddler
    var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined && this.ipnsKey !== resolvedIpnsKey) {
      $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [
          { key: "text", value: resolvedIpnsKey }
        ]
      });
      this.ipnsKey = resolvedIpnsKey;
    }
    this.ipnsName = ipnsName;

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

IpfsAction.prototype.handleResolveIpnsKeyAndOpen = async function(event) {

  try {

    // Retrieve default IPNS name
    var ipnsName = $tw.utils.getIpfsIpnsName();
    var ipnsKey = $tw.utils.getIpfsIpnsKey();

    // Check
    if (ipnsName == null) {
      $tw.utils.alert(name, "Undefined IPNS name....");
      return false;
    }

    // Retrieve Gateway URL
    const gateway = this.ipfsUri.getIpfsGatewayUrl();

    // IPFS client
    const { ipfs } = await this.ipfsWrapper.getIpfsClient(this.ipfsUri.getIpfsApiUrl());

    // Resolve CID
    var { ipnsKey, ipnsName } = await this.ipfsWrapper.fetchIpns(ipfs, ipnsKey, ipnsName);
    const resolved = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);

    // Update Tiddler
    var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [
          { key: "text", value: ipnsKey }
        ]
      });
      this.ipnsKey = ipnsKey;
    }
    this.ipnsName = ipnsName;

    if (resolved !== null) {
      // Resolved IPFS URL
      const url = gateway.protocol
        + "//"
        + gateway.host
        + "/"
        + ipfsKeyword
        + "/"
        + resolved;
      root.open(url, "_blank", "noopener");
    }

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

IpfsAction.prototype.handleMobileConsole = async function(tiddler) {
  // Load mobile console if applicable
  if (typeof root.eruda === "undefined") {
    await root.ipfsLoader.loadErudaLibrary();
    const eruda = root.document.createElement("div");
    root.document.body.appendChild(eruda);
    root.eruda.init({
      container: eruda,
      tool: ["console"],
      useShadowDom: false,
      autoScale: false
    });
    // Preserve user preference if any, default is 80
    if (root.eruda.get().config.get("displaySize") === 80) {
      root.eruda.get().config.set("displaySize", 40);
    }
    // Preserve user preference if any, default is 0.95
    if (root.eruda.get().config.get("transparency") === 0.95) {
      root.eruda.get().config.set("transparency", 1);
    }
    this.getLogger().log("Mobile console has been loaded...");
  } else {
    root.eruda.destroy();
    delete root.eruda;
    this.getLogger().log("Mobile console has been unloaded...");
  }
}

IpfsAction.prototype.handlePublishToIpns = async function(event) {

  try {

    // Process document URL
    const wiki = this.ipfsUri.getDocumentUrl();

    // Check
    if (wiki.protocol === fileProtocol) {
      $tw.utils.alert(name, "Undefined IPFS identifier...");
      return false;
    }
    if (wiki.pathname === "/") {
      $tw.utils.alert(name, "Unknown pathname...");
      return false;
    }

    // Extract and check URL IPFS protocol and CID
    var { protocol, cid } = this.ipfsWrapper.decodeCid(wiki.pathname);

    // Check
    if (protocol == null) {
      $tw.utils.alert(name, "Unknown IPFS protocol...");
      return false;
    }
    if (cid == null) {
      $tw.utils.alert(name, "Unknown IPFS identifier...");
      return false;
    }

    // IPFS client
    const { ipfs } = await this.ipfsWrapper.getIpfsClient(this.ipfsUri.getIpfsApiUrl());

    // Default IPNS key and IPNS name
    var ipnsKey = $tw.utils.getIpfsIpnsKey();
    var ipnsName = $tw.utils.getIpfsIpnsName();
    var resolved = null;

    // Check
    if (ipnsKey == null) {
      $tw.utils.alert(name, "Undefined default IPNS key....");
      return false;
    }

    if (protocol === ipnsKeyword) {
      // Check
      if (ipnsKey === cid) {
        $tw.utils.alert(name, "Default IPNS key matches current IPNS key....");
        return false;
      }
      // Resolve current IPNS key
      this.getLogger().info("Processing current IPNS...");
      const { ipnsKey: currentIpnsKey } = await this.ipfsWrapper.fetchIpns(ipfs, cid);
      cid = await this.ipfsWrapper.resolveIpnsKey(ipfs, currentIpnsKey);
    }

    // Resolve default IPNS key and IPNS name
    this.getLogger().info("Processing default IPNS...");
    var { ipnsKey, ipnsName } = await this.ipfsWrapper.fetchIpns(ipfs, ipnsKey, ipnsName);
    try {
      resolved = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
    } catch (error) {
      // Log and continue
      this.getLogger().warning(error.message);
      $tw.utils.alert(error.message);
    }

    // Check
    if (resolved === cid) {
      $tw.utils.alert(name, "IPFS identifiers are matching....");
      return false;
    }

    this.getLogger().info(
      "Publishing IPNS wiki: "
      + ipnsName
    );

    await this.ipfsWrapper.publishToIpns(ipfs, ipnsName, cid);

    // Unpin previous
    if ($tw.utils.getIpfsUnpin() && resolved != null) {
      this.getLogger().info(
        "Request to unpin IPNS wiki:"
        + "\n "
        + this.ipfsUri.normalizeUrl("/" + ipfsKeyword + "/" + resolved)
      );
      try {
        await this.ipfsWrapper.unpinFromIpfs(ipfs, resolved);
      } catch (error)  {
        // Log and continue
        this.getLogger().warning(error);
        $tw.utils.alert(name, error.message);
      }
    }

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

exports.IpfsAction = IpfsAction;

})();