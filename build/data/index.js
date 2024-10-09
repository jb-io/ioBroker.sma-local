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
var data_exports = {};
__export(data_exports, {
  getDevices: () => getDevices,
  getMessages: () => getMessages,
  getMeta: () => getMeta
});
module.exports = __toCommonJS(data_exports);
var import_ev_charger = __toESM(require("./ev-charger.devices"));
var import_tripower_x = __toESM(require("./tripower-x.device"));
var import_ev_charger_messages = __toESM(require("./ev-charger.messages.de"));
var import_ev_charger_messages2 = __toESM(require("./ev-charger.messages.en"));
var import_tripower_x_messages = __toESM(require("./tripower-x.messages.de"));
var import_tripower_x_messages2 = __toESM(require("./tripower-x.messages.en"));
var import_ev_charger_meta = __toESM(require("./ev-charger.meta.de"));
var import_ev_charger_meta2 = __toESM(require("./ev-charger.meta.en"));
var import_tripower_x_meta = __toESM(require("./tripower-x.meta.de"));
var import_tripower_x_meta2 = __toESM(require("./tripower-x.meta.en"));
function getDevices(type) {
  const data = {
    TripowerX: import_tripower_x.default,
    EvCharger: import_ev_charger.default
  };
  return data[type];
}
function getMessages(type, lang) {
  const data = {
    TripowerX: {
      de: import_tripower_x_messages.default,
      en: import_tripower_x_messages2.default
    },
    EvCharger: {
      de: import_ev_charger_messages.default,
      en: import_ev_charger_messages2.default
    }
  };
  return data[type][lang];
}
function getMeta(type, lang) {
  const data = {
    TripowerX: {
      de: import_tripower_x_meta.default,
      en: import_tripower_x_meta2.default
    },
    EvCharger: {
      de: import_ev_charger_meta.default,
      en: import_ev_charger_meta2.default
    }
  };
  return data[type][lang];
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getDevices,
  getMessages,
  getMeta
});
//# sourceMappingURL=index.js.map
