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
        url.searchParams.append("sid", this._sessionToken);
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
    return this._client.get(`/data/l10n/de-DE.json`).then((response) => response.data);
  }
}
//# sourceMappingURL=SmaLegacyDevice.js.map
