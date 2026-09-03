"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var SmaLegacyDevice_exports = {};
__export(SmaLegacyDevice_exports, {
  default: () => SmaLegacyDevice
});
module.exports = __toCommonJS(SmaLegacyDevice_exports);
var import_SmaDevice = __toESM(require("./SmaDevice"));
class SmaLegacyDevice extends import_SmaDevice.default {
  constructor(config) {
    super(config);
    this._client.interceptors.request.use((config2) => {
      if (this._sessionToken) {
        const url = new URL(config2.url, config2.baseURL);
        url.searchParams.set("sid", this._sessionToken);
        config2.url = url.toString().replace(config2.baseURL, "");
      }
      return config2;
    });
  }
  async login() {
    return this._client.post("/dyn/login.json", {
      right: "istl",
      pass: this._config.password
    }).then(({ data }) => {
      return {
        access_token: data.result.sid
      };
    });
  }
  async getAllOnlValues() {
    return this._client.post(`/dyn/getAllOnlValues.json`, { "destDev": [] }).then((response) => response.data);
  }
  async getValues(keys) {
    return this._client.post(`/dyn/getValues.json`, { "destDev": [], "keys": keys }).then((response) => response.data);
  }
  async getObjectMetaData() {
    return this._client.get(`/data/ObjectMetadata_Istl.json`).then((response) => response.data);
  }
  async getTagTranslations() {
    const path = await this.resolveCacheBustedPath("data/l10n/de-DE.json");
    return this._client.get(`/${path}`).then((response) => response.data);
  }
  _cacheBustedPaths = {};
  /**
   * Some firmware versions no longer serve static /data files under their plain name and instead require the
   * cache-busted filename (e.g. `data/l10n/de-DE.<hash>.json`) that is baked into the web UI's script bundle at
   * build time (as the angular "cacheKeys" constant). Resolve it by scraping the currently served bundle instead
   * of hardcoding a hash that changes with every firmware build.
   */
  async resolveCacheBustedPath(path) {
    if (!(path in this._cacheBustedPaths)) {
      this._cacheBustedPaths[path] = this._client.get("/").then(({ data: html }) => {
        const scriptMatch = /scripts\/scripts\.[0-9a-f]+\.js/.exec(html);
        if (!scriptMatch) {
          return path;
        }
        return this._client.get(`/${scriptMatch[0]}`).then(({ data: script }) => {
          const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const cacheKeyMatch = new RegExp(`"${escapedPath}":"([^"]+)"`).exec(script);
          return cacheKeyMatch ? cacheKeyMatch[1] : path;
        });
      }).catch(() => path);
    }
    return this._cacheBustedPaths[path];
  }
}
//# sourceMappingURL=SmaLegacyDevice.js.map
