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
  SmaUnauthorizedError: () => SmaUnauthorizedError,
  default: () => SmaDevice
});
module.exports = __toCommonJS(SmaDevice_exports);
var import_axios = __toESM(require("axios"));
var import_https = __toESM(require("https"));
class SmaUnauthorizedError extends Error {
  status = 401;
  response;
  config;
  constructor(response) {
    var _a;
    super(`Request to ${((_a = response.config) == null ? void 0 : _a.url) || "the device"} was answered with err 401 (unauthorized)`);
    this.name = "SmaUnauthorizedError";
    this.response = response;
    this.config = response.config;
  }
}
class SmaDevice {
  _config;
  _client;
  _sessionToken = null;
  _onAuthenticate = null;
  _pendingAuthentication = null;
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
    this._client.interceptors.response.use(
      (response) => {
        const data = response.data;
        if (typeof data === "object" && "err" in data && data.err === 401) {
          response.status = 401;
          return Promise.reject(new SmaUnauthorizedError(response));
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
          const originalRequest = error.config;
          if (originalRequest && !originalRequest.smaSkipReauthentication && !originalRequest.smaIsRetryAttempt) {
            originalRequest.smaIsRetryAttempt = true;
            try {
              await this.authenticateOnce();
            } catch (tokenError) {
              return Promise.reject(tokenError);
            }
            originalRequest.headers.Authorization = this._client.defaults.headers.common["Authorization"];
            return this._client(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );
  }
  async authenticate() {
    this.setSessionToken(null);
    const response = await this.login();
    if (response) {
      if (this._onAuthenticate) {
        await this._onAuthenticate(response);
      }
      this.setSessionToken(response.access_token);
    }
    return response;
  }
  /**
   * Authenticate, but let concurrent callers share one in-flight login instead of each
   * requesting a token of its own (and invalidating the others' token in the process).
   */
  authenticateOnce() {
    if (!this._pendingAuthentication) {
      this._pendingAuthentication = this.authenticate().finally(() => {
        this._pendingAuthentication = null;
      });
    }
    return this._pendingAuthentication;
  }
  onAuthenticate(handler) {
    this._onAuthenticate = handler;
  }
  setSessionToken(token) {
    this._sessionToken = token;
    this._client.defaults.headers.common["Authorization"] = token ? `Bearer ${token}` : null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SmaUnauthorizedError
});
//# sourceMappingURL=SmaDevice.js.map
