/*\
title: $:/plugins/ipfs/ipfs-library.js
type: application/javascript
module-type: library

IpfsLibrary

\*/

import CID  from "cids";
import getIpfs from "ipfs-provider";
import toMultiaddr from "uri-to-multiaddr";
import Readable from "readable-stream";

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Ipfs Library
*/
var IpfsLibrary = function() {};

// https://www.srihash.org/
// https://github.com/ipfs/js-ipfs-http-client
IpfsLibrary.prototype.loadIpfsHttpLibrary = async function() {
	await $tw.utils.loadLibrary(
		"IpfsHttpLibrary",
		"https://cdn.jsdelivr.net/npm/ipfs-http-client@39.0.2/dist/index.js",
		"sha384-SbtgpGuHo4HmMg8ZeX2IrF1c4cDnmBTsW84gipxDCzeFhIZaisgrVQbn3WUQsd0e",
		true
	);
}

IpfsLibrary.prototype.decodePathname = async function(pathname) {
	// Check
	if (pathname == undefined || pathname == null || pathname.trim() === "") {
		return {
			protocol: null,
			cid: null
		};
	}
	// Check
	if (pathname.startsWith("/ipfs/") == false && pathname.startsWith("/ipns/") == false) {
		return {
			protocol: null,
			cid: null
		};
	}
	// Extract
	var cid = null;
	var protocol = null;
	try  {
		protocol = pathname.substring(1, 5);
		cid = pathname.substring(6);
	} catch (error) {
		return {
			protocol: null,
			cid: null
		};
	}
	// Check
	if (await this.isCid(cid) == false) {
		return {
			protocol: null,
			cid: null
		};
	}
	// All good
	return {
		protocol: protocol,
		cid: cid
	}
}

IpfsLibrary.prototype.isCid = async function(cid) {
	try {
		return CID.isCID(new CID(cid));
	} catch (error) {
		return false;
	}
}

// Default
IpfsLibrary.prototype.getDefaultIpfs = async function() {
	// Multiaddr
	const apiUrl = $tw.utils.getIpfsApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() === "") {
		throw new Error("Undefined Ipfs Api Url...");
	}
	let multi;
	try {
		 multi = toMultiaddr(apiUrl);
	} catch (error) {
		console.error(error.message);
		throw new Error("Invalid Ipfs Api Url: " + apiUrl);
	}
	// Load Web3 if applicable
	if (typeof window.IpfsHttpClient === "undefined") {
		await this.loadIpfsHttpLibrary();
	}
	// Getting
	try {
		let { ipfs, provider } = await getIpfs({
			// These is the defaults
			tryWebExt: false,
			tryWindow: true,
			permissions: {},
			tryApi: true,
			apiIpfsOpts: {
				apiUrl: this.defaultApiUrl,
				apiAddress: multi,
				IpfsApi: window.IpfsHttpClient
			},
			tryJsIpfs: false,
			getJsIpfs: null,
			jsIpfsOpts: {}
		});
		// Enhance provider message
		provider = provider + ", " + multi;
		return { ipfs, provider };
	} catch (error) {
		console.error(error.message);
		throw new Error("Unable to connect. Check Ipfs Companion and your Api Url...");
	}
}

// window.enable
IpfsLibrary.prototype.getWindowIpfs = async function() {
	// Getting
	try {
		const { ipfs, provider } = await getIpfs({
			// These is window only
			tryWebExt: false,
			tryWindow: true,
			permissions: {},
			tryApi: false,
			apiIpfsOpts: {},
			tryJsIpfs: false,
			getJsIpfs: null,
			jsIpfsOpts: {}
		});
		return { ipfs, provider };
	} catch (error) {
		console.error(error.message);
		throw new Error("Unable to connect. Check Ipfs Companion...");
	}
}

// ipfs-http-client
IpfsLibrary.prototype.getHttpIpfs = async function() {
	// Multiaddr
	const apiUrl = $tw.utils.getIpfsApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() == "") {
		throw new Error("Undefined Ipfs Api Url...");
	}
	let multi;
	try {
		 multi = toMultiaddr(apiUrl);
	} catch (error) {
		console.error(error.message);
		throw new Error("Invalid Ipfs Api Url: " + apiUrl);
	}
	// Load Web3 if applicable
	if (typeof window.IpfsHttpClient === "undefined") {
		await this.loadIpfsHttpLibrary();
	}
	// Getting
	try {
		var { ipfs, provider } = await getIpfs({
			// These is the defaults
			tryWebExt: false,
			tryWindow: false,
			permissions: {},
			tryApi: true,
			apiIpfsOpts: {
				apiUrl: this.defaultApiUrl,
				apiAddress: multi,
				IpfsApi: window.IpfsHttpClient
			},
			tryJsIpfs: false,
			getJsIpfs: null,
			jsIpfsOpts: {}
		});
		// Enhance provider message
		provider = provider + ", " + multi;
		return { ipfs, provider };
	} catch (error) {
		console.error(error.message);
		throw new Error("Unable to connect. Check your Api Url...");
	}
}

IpfsLibrary.prototype.add = async function(client, content) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (content == undefined) {
		throw new Error("Undefined content...");
	}
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["add"]});
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to enable Ipfs add...");
		}
	}
	// Process
	if (client !== undefined && client.add !== undefined) {
		try {
			// Build stream
			const stream = new Readable();
			stream.push(Buffer.from(content));
			stream.push(null);
			// Process
			if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipfs add...");
			// https://github.com/ipfs/go-ipfs/issues/5683
			// chunker: "size-262144"
			// chunker: "rabin-262144-524288-1048576"
			const result = await client.add(stream, { pin: false, progress: function(len) {
					if ($tw.utils.getIpfsVerbose()) console.info("Ipfs upload progress:", len);
				}
			});
			return result;
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to Ipfs add...");
		}
	}
}

IpfsLibrary.prototype.get = async function(client, cid) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["get"]});
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to enable Ipfs get...");
		}
	}
	// Process
	if (client !== undefined && client.get !== undefined) {
		try {
			if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipfs get...");
			const result = await client.get(cid);
			return result;
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to Ipfs get...");
		}
	}
	throw new Error("Undefined Ipfs get...");
}

IpfsLibrary.prototype.cat = async function(client, cid) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["cat"]});
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to enable Ipfs cat...");
		}
	}
	// Process
	if (client !== undefined && client.cat !== undefined) {
		try {
			if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipfs cat...");
			const result = await client.cat(cid);
			return result;
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to Ipfs cat...");
		}
	}
	throw new Error("Undefined Ipfs cat...");
}

IpfsLibrary.prototype.pin = async function(client, cid) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["pin"]});
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to enable Ipfs pin...");
		}
	}
	// Process
	if (client !== undefined && client.pin !== undefined && client.pin.add !== undefined) {
		try {
			if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipfs pin...");
			const result = await client.pin.add(cid);
			return result;
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to Ipfs pin...");
		}
	}
	throw new Error("Undefined Ipfs pin...");
}

IpfsLibrary.prototype.unpin = async function(client, cid) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["pin"]});
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to enable Ipfs pin...");
		}
	}
	// Process
	if (client !== undefined && client.pin !== undefined && client.pin.rm !== undefined) {
		try {
			if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipfs unpin...");
			const result = await client.pin.rm(cid);
			return result;
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to Ipfs unpin...");
		}
	}
	throw new Error("Undefined Ipfs unpin");
}

IpfsLibrary.prototype.publish = async function(client, name, cid) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (name == undefined || name == null || name.trim() === "") {
		throw new Error("Undefined Ipns name...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["name"]});
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to enable Ipns name...");
		}
	}
	if (client !== undefined && client.name !== undefined && client.name.publish !== undefined) {
		try {
			if ($tw.utils.getIpfsVerbose()) console.info("Processing publish Ipns name...");
			const result = await client.name.publish(cid, { key: name });
			return result;
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to publish Ipns name...");
		}
	}
	throw new Error("Undefined Ipns publish name...");
}

IpfsLibrary.prototype.resolve = async function(client, cid) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["name"]});
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to enable Ipns name...");
		}
	}
	if (client !== undefined && client.name !== undefined && client.name.resolve !== undefined) {
		try {
			if ($tw.utils.getIpfsVerbose()) console.info("Processing resolve Ipns name...");
			const result = await client.name.resolve(cid);
			return result;
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to resolve Ipns name...");
		}
	}
	throw new Error("Undefined Ipns name resolve...");
}

IpfsLibrary.prototype.id = async function(client) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["id"]});
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to enable Ipfs id...");
		}
	}
	if (client !== undefined && client.id !== undefined) {
		try {
			if ($tw.utils.getIpfsVerbose()) console.info("Processing id...");
			const result = await client.id();
			return result;
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to Ipfs id...");
		}
	}
	throw new Error("Undefined Ipfs id...");
}

IpfsLibrary.prototype.keys = async function(client) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["key"]});
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to enable Ipfs key...");
		}
	}
	if (client !== undefined && client.key !== undefined && client.key.list !== undefined) {
		try {
			if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipns keys...");
			const result = await client.key.list();
			return result;
		} catch (error) {
			console.error(error.message);
			throw new Error("Unable to process Ipns keys...");
		}
	}
	throw new Error("Undefined Ipfs keys...");
}

exports.IpfsLibrary = IpfsLibrary;

})();
