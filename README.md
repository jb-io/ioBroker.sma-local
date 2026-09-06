![Logo](admin/sma-local.png)
# ioBroker.sma-local

[![NPM version](https://img.shields.io/npm/v/iobroker.sma-local.svg)](https://www.npmjs.com/package/iobroker.sma-local)
[![Downloads](https://img.shields.io/npm/dm/iobroker.sma-local.svg)](https://www.npmjs.com/package/iobroker.sma-local)
![Number of Installations](https://iobroker.live/badges/sma-local-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/sma-local-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.sma-local.png?downloads=true)](https://nodei.co/npm/iobroker.sma-local/)

**Tests:** ![Test and Release](https://github.com/jb-io/ioBroker.sma-local/workflows/Test%20and%20Release/badge.svg)

## sma-local adapter for ioBroker

Integration of Local SMA devices without cloud connection

## Description

The **ioBroker SMA Local Device Adapter** allows you to regularly monitor and control your SMA device without using the Cloud API

## Compatible Devices:

https://www.sma.de/produkte

* Sunny Tripower X
* Sunny Tripower Smart Energy
* SMA EV Charger

**Unknown Compatibility:**
* Sunny Tripower
* Sunny Boy 
* Sunny Boy Smart Energy
* SMA eCharger
* SMA EV Charger Business





## Changelog
<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
* [ENH] Rework the instance configuration: the settings are now split into a "Connection" tab (device type, host, login) and an "Advanced" tab (polling intervals, session token), and follow the order in which they are needed - pick the device type first, then enter host and credentials
* [ENH] Show screenshots of both device generations next to the device type selection - login page and dashboard, click to enlarge - so it is obvious which type to pick: ennexOS asks for user name and password and shows a dashboard of tiles, legacy devices ask for a user group and a password and show the classic navigation bar
* [ENH] Better labels and help texts for every setting, a placeholder and a validation hint for the host name (no `http://`, no path), and sensible limits for the two polling intervals; all texts are translated into the 11 adapter languages
* [ENH] Refresh the Sunny Tripower X channel definitions and DE/EN translations from a current ennexOS firmware (3329 -> 3977 channels), so newer parameters and measurements (off-grid/backup operation, grid connection point, battery and charging channels) are no longer reported as `Device definition ... not found` and get a proper name, unit and type
* [FIX] Write values with the type the channel declares: SCALAR channels are converted to numbers on the live data path too (previously written as raw strings), and TEXT channels such as serial numbers and hardware revisions stay strings instead of being parsed into numbers. This removes the `State value to set for ... has to be type ...` messages
* [FIX] Treat the `"NaN"` a device reports for a channel it currently has no value for as an empty state instead of writing it to a numeric state
* [FIX] Re-authenticate and retry per request instead of once per client: when the token expired, only the first of the concurrently running polls was retried, the others failed with a logged `401` until the next poll. Concurrent requests now share a single re-authentication and are all replayed
* [TASK] Fix the findings of the ioBroker adapter checker: require js-controller >= 5.0.19, shrink the adapter logo to 512x512, update `@iobroker/adapter-core` to 3.4.x, add device related keywords (plus `ioBroker` in `package.json` only, as `common.keywords` must not repeat it), encrypt the configured password (`encryptedNative`) and drop the deprecated `common.main` from `io-package.json`
* [TASK] Remove `src/script.ts`, a fully commented-out prototype scratchpad from the initial commit that was never imported and still carried a device password in plain text

### 0.3.0 (2026-09-05)
* [TASK] Require Node.js >= 22 and run the CI tests on Node 22.x and 24.x
* [TASK] Migrate ESLint to the flat `eslint.config.js` format so `npm run lint` works again with ESLint 9
* [FIX] Don't crash on startup when the configured host is not a valid host name (e.g. the unchanged `SMA[serial number].local` default); log a configuration error instead
* [FIX] Report authentication and device setup failures as adapter errors instead of terminating the instance with an unhandled promise rejection

### 0.2.0 (2026-09-05)
* [FIX] Re-apply Authorization header when retrying requests after re-authentication
* [ENH] Detect Ennexos device environment (TripowerX/EV-Charger) instead of hardcoding TripowerX
* [FIX] Resolve the cache-busted filename of the legacy device's tag translation file (e.g. `data/l10n/de-DE.<hash>.json`) instead of the plain, non-existent `data/l10n/de-DE.json`, which some firmware versions reject with HTTP 400; also don't crash the adapter if translations still can't be fetched, falling back to raw tag ids instead
* [FIX] Fix duplicate `sid` query parameter on legacy devices when retrying a request after re-authentication, which caused the retried request to fail with HTTP 400
* [ENH] Log out of legacy devices (`POST /dyn/logout.json`) when the adapter unloads, freeing the session slot on the device
* [FIX] Await the creation of the `info.session` object before writing the session token, avoiding the "State ... has no existing object" warning
* [FIX] Don't crash the adapter when logging a request error whose object contains circular references (`JSON.stringify` threw `Converting circular structure to JSON`), falling back to the error message instead

### 0.1.0 (2024-10-09)
* [TASK] initial release

## License

[Licensed under GPLv3](LICENSE) Copyright (c) 2024-2026 jb-io
