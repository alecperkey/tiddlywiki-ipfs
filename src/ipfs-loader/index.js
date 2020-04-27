import root from "window-or-global";

(function() {
  /*jslint node: true, browser: true */
  "use strict";

  const name = "ipfs-loader";

  const eruda = "https://cdn.jsdelivr.net/npm/eruda@2.2.2/eruda.min.js";
  const eruda_sri = "sha384-DpZY+q2987LFJTTg+f8oByjMwhVQSkHZCc9r0TEXBS23Ld5LrsULQFXMU+f04K4H";

  const ethers = "https://cdn.jsdelivr.net/npm/ethers@4.0.47/dist/ethers.min.js";
  const ethers_sri = "sha384-Gqf9kLa8S94/ZNsQCadoW0KeT6tg+fapxds7gOiSL72KeOtfgTOmHvJENrQljse5";

  const ipfs_http_client = "https://cdn.jsdelivr.net/npm/ipfs-http-client@44.0.0/dist/index.min.js";
  const ipfs_http_client_sri = "sha384-ris+q6J23d31ehRco1HyHYfwUJz4S10N8218wcuw8IZLoM+Q1/TOYVVeDskhoSgM";

  var IpfsLoader = function() {};

  IpfsLoader.prototype.getLogger = function() {
    return root.log.getLogger(name);
  };

  // https://www.srihash.org/
  // https://github.com/liriliri/eruda
  IpfsLoader.prototype.loadErudaLibrary = async function() {
    if (typeof root.eruda === "undefined") {
      await this.loadLibrary("ErudaLibrary", eruda, eruda_sri, true);
      if (typeof root.eruda !== "undefined") {
        this.getLogger().info("Loaded ErudaLibrary:" + "\n " + eruda);
      }
    }
  };

  // https://www.srihash.org/
  // https://github.com/ethers-io/ethers.js/
  IpfsLoader.prototype.loadEtherJsLibrary = async function() {
    if (typeof root.ethers === "undefined") {
      await this.loadLibrary("EtherJsLibrary", ethers, ethers_sri, true);
      if (typeof root.ethers !== "undefined") {
        this.getLogger().info("Loaded EtherJsLibrary:" + "\n " + ethers);
      }
    }
  };

  // https://www.srihash.org/
  // https://github.com/ipfs/js-ipfs-http-client
  IpfsLoader.prototype.loadIpfsHttpLibrary = async function() {
    if (typeof root.IpfsHttpClient === "undefined") {
      await this.loadLibrary("IpfsHttpLibrary", ipfs_http_client, ipfs_http_client_sri, true);
      this.getLogger().info("Loaded IpfsHttpLibrary:" + "\n " + ipfs_http_client);
    }
  };

  // https://gist.github.com/ebidel/3201b36f59f26525eb606663f7b487d0
  IpfsLoader.prototype.supportDynamicImport = function() {
    try {
      new Function('import("")');
      return true;
    } catch (error) {
      return false;
    }
  };

  // https://observablehq.com/@bryangingechen/dynamic-import-polyfill
  IpfsLoader.prototype.loadLibrary = async function(id, url, sri, asModule) {
    // Dynamic import
    if (this.supportDynamicImport()) {
      try {
        return new Function(`return import("${url}")`)();
      } catch (error) {
        // Ignore
      }
    }
    // Fallback
    const self = this;
    return new Promise((resolve, reject) => {
      // Process
      const script = root.document.createElement("script");
      // Functions
      const cleanup = () => {
        try {
          delete root[id];
          script.onerror = null;
          script.onload = null;
          script.remove();
          URL.revokeObjectURL(script.src);
          script.src = "";
        } catch (error) {
          this.getLogger().error(error);
        }
      };
      script.onload = () => {
        if (asModule) {
          self.getLogger(name).info("Loaded Module:" + "\n " + url);
        } else {
          self.getLogger(name).info("Loaded Script:" + "\n " + url);
        }
        resolve(root[id]);
        cleanup();
      };
      script.onerror = () => {
        reject(new Error("Failed to load: " + url));
        cleanup();
      };
      // Attributes
      if (asModule) {
        script.type = "module";
      } else {
        script.type = "text/javascript";
      }
      script.id = id;
      script.async = false;
      script.defer = "defer";
      if (sri) {
        script.integrity = sri;
      }
      script.crossOrigin = "anonymous";
      // URL
      script.src = url.toString();
      // Load
      root.document.head.appendChild(script);
    });
  };

  module.exports = IpfsLoader;
})();