"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var serializeError_exports = {};
__export(serializeError_exports, {
  default: () => serializeError
});
module.exports = __toCommonJS(serializeError_exports);
function stringifyValue(value, maxLength = 500) {
  var _a;
  let text;
  try {
    text = typeof value === "string" ? value : (_a = JSON.stringify(value)) != null ? _a : String(value);
  } catch {
    text = "[unserializable]";
  }
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}
function serializeError(error) {
  var _a, _b, _c, _d;
  if (error === null || typeof error !== "object") {
    return String(error);
  }
  const candidate = error;
  const parts = [];
  if (typeof candidate.message === "string" && candidate.message) {
    parts.push(typeof candidate.name === "string" && candidate.name ? `${candidate.name}: ${candidate.message}` : candidate.message);
  }
  if (candidate.code !== void 0) {
    parts.push(`code=${stringifyValue(candidate.code)}`);
  }
  const status = (_b = (_a = candidate.response) == null ? void 0 : _a.status) != null ? _b : candidate.status;
  if (status !== void 0) {
    parts.push(`status=${stringifyValue(status)}`);
  }
  if (((_c = candidate.config) == null ? void 0 : _c.url) !== void 0) {
    const method = typeof candidate.config.method === "string" ? candidate.config.method.toUpperCase() : "request";
    parts.push(`${method} ${stringifyValue(candidate.config.url)}`);
  }
  if (((_d = candidate.response) == null ? void 0 : _d.data) !== void 0) {
    parts.push(`body=${stringifyValue(candidate.response.data)}`);
  }
  return parts.length ? parts.join(", ") : stringifyValue(error);
}
//# sourceMappingURL=serializeError.js.map
