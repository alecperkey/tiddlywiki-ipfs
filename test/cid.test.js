/* global jest, beforeAll, describe, it, expect */
"use strict";

const log = require("loglevel");
const root = require("window-or-global");

const IpfsLibrary = require("../build/plugins/ipfs/ipfs-library.js").IpfsLibrary;
const IpfsModule = require("../build/plugins/ipfs/ipfs-module.js").IpfsModule;

beforeAll(() => {
  const ipfsModule = new IpfsModule();
  root.ipfsModule = ipfsModule;
  root.log = log;
  ipfsModule.getLogger().setLevel("warn", false);
});

describe("CID", () => {

  it("Resolve CID. Undefined pathname.", async () => {
    const ipfsLibrary = new IpfsLibrary();
    var { protocol, cid } = ipfsLibrary.decodeCid();
    expect(
      protocol == null
      && cid == null
    ).toBeTruthy()
    var { protocol, cid } = ipfsLibrary.decodeCid("");
    expect(
      protocol == null
      && cid == null
    ).toBeTruthy()
    var { protocol, cid } = ipfsLibrary.decodeCid("/");
    expect(
      protocol == null
      && cid == null
    ).toBeTruthy()
  });

  it("Resolve CID. Incorrect pathname.", async () => {
    const ipfsLibrary = new IpfsLibrary();
    var { protocol, cid } = ipfsLibrary.decodeCid("Hello World");
    expect(
      protocol == null
      && cid == null
    ).toBeTruthy()
    var { protocol, cid } = ipfsLibrary.decodeCid("/Hello/World");
    expect(
      protocol == null
      && cid == null
    ).toBeTruthy()
  });

  it("Resolve CID. Invalid CID.", async () => {
    const ipfsLibrary = new IpfsLibrary();
    var { protocol, cid } = ipfsLibrary.decodeCid("/ipfs/Hello World");
    expect(
      protocol == "ipfs"
      && cid == null
    ).toBeTruthy()
    var { protocol, cid } = ipfsLibrary.decodeCid("/ipns/Hello World");
    expect(
      protocol == "ipns"
      && cid == null
    ).toBeTruthy()
  });

  it("Resolve CID.", async () => {
    const ipfsLibrary = new IpfsLibrary();
    var { protocol, cid } = ipfsLibrary.decodeCid("/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
    expect(
      protocol === "ipfs"
      && cid === "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
    ).toBeTruthy()
    var { protocol, cid } = ipfsLibrary.decodeCid("/ipns/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
    expect(
      protocol === "ipns"
      && cid === "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
    ).toBeTruthy()
  });

});
