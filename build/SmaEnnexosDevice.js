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
var SmaEnnexosDevice_exports = {};
__export(SmaEnnexosDevice_exports, {
  default: () => SmaEnnexosDevice
});
module.exports = __toCommonJS(SmaEnnexosDevice_exports);
var import_SmaDevice = __toESM(require("./SmaDevice"));
var import_data = require("./data");
class SmaEnnexosDevice extends import_SmaDevice.default {
  componentId = "IGULD:SELF";
  async login() {
    return this._client.post("/api/v1/token", {
      grant_type: "password",
      username: this._config.username,
      password: this._config.password
    }, {
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      }
    }).then(({ data }) => data);
  }
  async getLiveMeasurementValues() {
    return this._client.post(
      `/api/v1/measurements/live`,
      [{ componentId: this.componentId }]
    ).then(({ data }) => data);
  }
  async getParameters() {
    return this._client.post(
      `/api/v1/parameters/search`,
      { queryItems: [{ componentId: this.componentId }] }
    ).then(({ data }) => data);
  }
  async getWidgets() {
    return this._client.get(
      `/api/v1/dashboard/widgets?componentId=${this.componentId}`
    ).then(({ data }) => data);
  }
  async getWidgetData(name) {
    let url = "";
    switch (name) {
      case "DeviceInfo":
        url = `/api/v1/widgets/deviceinfo?deviceId=${this.componentId}`;
        break;
      case "State":
        url = `/api/v1/widgets/states?componentId=${this.componentId}`;
        break;
      case "EMobilityInformation":
        url = `/api/v1/widgets/emobility?componentId=${this.componentId}`;
        break;
      case "EnergyAndPowerChargingStation":
        url = `/api/v1/widgets/gauge/power?componentId=${this.componentId}&type=ChargingStation`;
        break;
      case "EnergyAndPower":
        url = `/api/v1/widgets/gauge/power?componentId=${this.componentId}&type=PvProduction`;
        break;
      default:
        return null;
    }
    return this._client.get(url).then(({ data }) => data);
  }
  async getDeviceDefinitions() {
    return Promise.resolve((0, import_data.getDevices)("TripowerX"));
  }
  async getTranslations() {
    return Promise.resolve((0, import_data.getMeta)("TripowerX", "de").META);
  }
}
//# sourceMappingURL=SmaEnnexosDevice.js.map
