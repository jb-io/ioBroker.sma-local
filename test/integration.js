const path = require('path');
const { tests } = require('@iobroker/testing');

// The harness installs the adapter into a temp directory, where neither this repo's .npmrc
// nor its lock file apply. With a globally configured `legacy-peer-deps=true`, npm would skip
// @iobroker/adapter-core's peer dependencies there and the adapter fails to start with
// "Cannot find module '@iobroker/types'". CI already defaults to false; pin it for local runs.
process.env.NPM_CONFIG_LEGACY_PEER_DEPS = 'false';

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, '..'));