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
var SmaDevice_exports = {};
__export(SmaDevice_exports, {
  default: () => SmaDevice
});
module.exports = __toCommonJS(SmaDevice_exports);
var import_axios = __toESM(require("axios"));
var import_https = __toESM(require("https"));
class SmaDevice {
  _config;
  _client;
  _sessionToken = null;
  _onAuthenticate = null;
  constructor(config) {
    this._config = config;
    this._client = import_axios.default.create({
      baseURL: "https://" + config.host,
      headers: {
        "accept": "application/json",
        "content-type": "application/json"
      },
      httpsAgent: new import_https.default.Agent({
        rejectUnauthorized: false,
        keepAlive: true
      }),
      withCredentials: true
    });
    let isRetryAttempt = false;
    this._client.interceptors.response.use(
      (response) => {
        const data = response.data;
        if (typeof data === "object" && "err" in data && data.err === 401) {
          response.status = 401;
          return Promise.reject({
            status: 401,
            response
          });
        }
        return response;
      },
      (error) => {
        if (error.response && error.response.status === 500 && error.config.headers.Authorization) {
          error.status = 401;
          error.response.status = 401;
          return Promise.reject(error);
        }
        return Promise.reject(error);
      }
    );
    this._client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.status === 401 || error.response && error.response.status === 401) {
          if (!isRetryAttempt) {
            isRetryAttempt = true;
            try {
              await this.authenticate();
              const originalRequest = error.config;
              return this._client(originalRequest);
            } catch (tokenError) {
              return Promise.reject(tokenError);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }
  async authenticate() {
    this.setSessionToken(null);
    const response = await this.login().catch(() => null);
    if (response) {
      if (this._onAuthenticate) {
        this._onAuthenticate(response);
      }
      this.setSessionToken(response.access_token);
    }
    return response;
  }
  onAuthenticate(handler) {
    this._onAuthenticate = handler;
  }
  setSessionToken(token) {
    this._sessionToken = token;
    this._client.defaults.headers.common["Authorization"] = token ? `Bearer ${token}` : null;
  }
}
//# sourceMappingURL=SmaDevice.js.map
