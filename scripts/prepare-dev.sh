#!/bin/bash
# cleanup
rm -f -R ./ipfs/plugins > /dev/null 2>&1
# ipfs directories
mkdir -p ./ipfs/plugins/ipfs > /dev/null 2>&1
# ipfs scripts
cp ./src/ipfs-saver.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-startup.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-utils.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-version.js ./ipfs/plugins/ipfs > /dev/null 2>&1
cp ./src/ipfs-wrapper.js ./ipfs/plugins/ipfs > /dev/null 2>&1
# plugin.info
cp ./src/plugin.info ./ipfs/plugins/ipfs > /dev/null 2>&1