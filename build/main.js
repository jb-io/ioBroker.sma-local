"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var utils = __toESM(require("@iobroker/adapter-core"));
var import_SmaEnnexosDevice = __toESM(require("./SmaEnnexosDevice"));
var import_SmaLegacyDevice = __toESM(require("./SmaLegacyDevice"));
class SmaLocal extends utils.Adapter {
  adapterIntervals;
  adapterTimeouts;
  constructor(options = {}) {
    super({
      ...options,
      name: "sma-local"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.adapterTimeouts = [];
    this.adapterIntervals = [];
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    await this.setState("info.connection", false, true);
    if (!this.config.host) {
      return;
    }
    let device;
    if (this.config.legacyDevice) {
      device = new import_SmaLegacyDevice.default({
        host: this.config.host,
        password: this.config.password || ""
      });
    } else {
      device = new import_SmaEnnexosDevice.default({
        host: this.config.host,
        username: this.config.username || "",
        password: this.config.password || ""
      });
    }
    device.onAuthenticate((response) => {
      if (this.config.storeSessionToken) {
        this.extendObject("info.session", {
          type: "state",
          common: {
            type: "string",
            name: "Session token",
            role: "text",
            write: false
          }
        });
        this.setState("info.session", {
          val: response.access_token,
          ack: true,
          expire: response.expires_in
        });
      }
      this.setState("info.connection", true, true);
      this.log.info(`Authenticated with token: ${response.access_token}`);
    });
    let authenticated = false;
    if (this.config.storeSessionToken) {
      const session = await this.getStateAsync("info.session");
      if (session && session.ack && session.val) {
        device.setSessionToken(session.val);
        authenticated = true;
      }
    }
    if (!authenticated) {
      await device.authenticate();
    }
    if (this.config.intervalLiveData <= 0) {
      this.log.info(`Will not receive live data because it is disabled in your configuration.`);
    }
    if (this.config.intervalFull <= 0) {
      this.log.info(`Will not receive full data because it is disabled in your configuration.`);
    }
    if (this.config.legacyDevice) {
      await this.setupLegacyDevice(device);
    } else {
      await this.setupEnnexosDevice(device);
    }
  }
  async setupLegacyDevice(device) {
    const objectMetadataCollection = await device.getObjectMetaData();
    const translations = await device.getTagTranslations();
    const getTranslation = (tag) => {
      if (tag in translations) {
        return translations[tag];
      }
      return `${tag}`;
    };
    const dataIdPathMapping = {};
    const getDataIdPathMapping = async (key) => {
      if (!(key in dataIdPathMapping)) {
        const promises = [];
        let path = "Parameter";
        for (const pathItem of objectMetadataCollection[key].TagHier) {
          path += "." + pathItem;
          promises.push(this.extendObject(path, {
            type: "channel",
            common: {
              name: getTranslation(pathItem)
            }
          }));
        }
        await Promise.all(promises);
        dataIdPathMapping[key] = path + "." + key;
      }
      return dataIdPathMapping[key];
    };
    const objectStateConfig = {};
    const getObjectStateConfig = (key) => {
      if (!(key in objectStateConfig)) {
        const metadata = objectMetadataCollection[key];
        const common = {
          role: "state",
          type: "mixed",
          name: getTranslation(metadata.TagId),
          write: metadata.WriteLevel <= 2
        };
        if (metadata.Typ === 0) {
          common.type = "number";
          common.role = "value";
        } else if (metadata.Typ === 2) {
          common.type = "string";
          common.role = "text";
        }
        if (metadata.Unit) {
          common.unit = getTranslation(metadata.Unit);
        }
        objectStateConfig[key] = {
          type: "state",
          common,
          native: { ...metadata }
        };
      }
      return objectStateConfig[key];
    };
    await this.setState("info.connection", true, true);
    const handleGetValuesResponse = async ({ result: devices }) => {
      if (!devices) {
        return;
      }
      const transformDataNodes = (dataNode, objectMetadata) => {
        let data = [];
        if ("0" in dataNode) {
          data = dataNode["0"];
        } else if ("1" in dataNode) {
          data = dataNode["1"];
        } else if ("9" in dataNode) {
          data = dataNode["9"];
        }
        if (data.length <= 0) {
          return null;
        }
        const normalizeValue = (value) => {
          const val = value.val;
          if (Array.isArray(val)) {
            if (val.length > 0) {
              return val.map((x) => getTranslation(x.tag)).join(", ");
            }
            return null;
          }
          if (typeof val === "number" && objectMetadata.Scale) {
            return val * objectMetadata.Scale;
          }
          return val;
        };
        return data.map(normalizeValue);
      };
      const deviceKey = Object.keys(devices)[0];
      const deviceValues = devices[deviceKey];
      const promises = [];
      this.log.debug(`Received Data for keys: ${Object.keys(deviceValues)}`);
      for (const key in deviceValues) {
        const deviceValue = deviceValues[key];
        const objectMetadata = objectMetadataCollection[key];
        const values = transformDataNodes(deviceValue, objectMetadata);
        if (null === values) {
          continue;
        }
        promises.push((async () => {
          const id = await getDataIdPathMapping(key);
          const objPart = getObjectStateConfig(key);
          if (values.length === 1) {
            await this.extendObject(id, objPart).then(() => this.setState(id, values[0], true));
          } else {
            for (let i = 0; i < values.length; i++) {
              const itemId = `${id}.${i}`;
              await this.extendObject(itemId, objPart).then(() => this.setState(itemId, values[i], true));
            }
          }
        })());
      }
      await Promise.all(promises);
    };
    const requestLiveData = async () => {
      this.log.debug("Request Live Data");
      const response = await device.getAllOnlValues().catch((e) => {
        this.log.error(JSON.stringify(e));
        this.setState("info.connection", false, true);
        return null;
      });
      if (response) {
        await this.setState("info.connection", true, true);
        await handleGetValuesResponse(response);
      }
    };
    this.adapterIntervals.push(this.setInterval(requestLiveData, this.config.intervalLiveData * 1e3));
    this.adapterTimeouts.push(this.setTimeout(requestLiveData, 1e3));
    const requestFull = async () => {
      const keys = Object.keys(objectMetadataCollection);
      const chunkSize = 64;
      const chunkCount = Math.ceil(keys.length / chunkSize);
      let offset = 0;
      const timeout = Math.round(this.config.intervalFull * 1e3 / (chunkCount + 1));
      const handleChunk = async () => {
        this.log.debug(`Request Full Data Chunk ${offset} - ${offset + chunkSize} / ${keys.length}`);
        const chunk = keys.slice(offset, offset + chunkSize);
        offset += chunkSize;
        if (offset < keys.length) {
          this.setTimeout(handleChunk, timeout);
        }
        const response = await device.getValues(chunk).catch((e) => {
          this.log.error(JSON.stringify(e));
          this.setState("info.connection", false, true);
          return null;
        });
        if (response) {
          await this.setState("info.connection", true, true);
          await handleGetValuesResponse(response);
        }
      };
      await handleChunk();
    };
    this.adapterIntervals.push(this.setInterval(requestFull, this.config.intervalFull * 1e3));
    this.adapterTimeouts.push(this.setTimeout(requestFull, 2e3));
  }
  async setupEnnexosDevice(device) {
    const devices = await device.getDeviceDefinitions();
    const translations = await device.getTranslations();
    const getTranslation = (key) => {
      if (key in translations) {
        return translations[key];
      }
      return `${key}`;
    };
    const dataIdPathMapping = {};
    const getDataIdPathMapping = async (key) => {
      if (!(key in dataIdPathMapping)) {
        const deviceDefinition = devices[key];
        if (deviceDefinition && deviceDefinition.displayGroup) {
          await this.extendObject(key.replace(/\.[^.]*$/, ""), {
            type: "channel",
            common: {
              name: getTranslation(deviceDefinition.displayGroup)
            }
          });
        }
        dataIdPathMapping[key] = key;
      }
      return dataIdPathMapping[key];
    };
    const objectStateConfig = {};
    const getObjectStateConfig = (key, config = null) => {
      if (!(key in objectStateConfig)) {
        const deviceDefinition = devices[key];
        const common = {
          role: "state",
          type: "mixed",
          write: config && config.editable !== void 0 ? config.editable : false
        };
        const native = {};
        if (deviceDefinition) {
          if (deviceDefinition.translationId) {
            common.name = getTranslation(deviceDefinition.translationId);
          }
          if (deviceDefinition.unit && parseInt(deviceDefinition.unit)) {
            common.unit = getTranslation(deviceDefinition.unit);
          }
          if (deviceDefinition.valueType === "SCALAR") {
            common.type = "number";
            common.role = "value";
          } else if (deviceDefinition.valueType === "TEXT") {
            common.type = "string";
            common.role = "text";
          }
          native.deviceDefinition = deviceDefinition;
        } else {
          this.log.warn(`Device definition for ${key} not found.`);
        }
        if (config) {
          if (config.min !== void 0) {
            common.min = config.min;
          }
          if (config.max !== void 0) {
            common.max = config.max;
          }
          native.config = config;
        }
        objectStateConfig[key] = {
          type: "state",
          common,
          native
        };
      }
      return objectStateConfig[key];
    };
    const handleLiveDataResponse = async (data) => {
      this.log.debug(`Received Live Data Response: ${JSON.stringify(data.map((channel) => channel.channelId))}`);
      await this.setState("info.connection", true, true);
      const promises = [];
      for (const channel of data) {
        if (channel.values.length !== 1) {
          this.log.error(`Could not handle data for ${channel.channelId}: ${JSON.stringify(channel.values)}`);
        }
        const channelData = channel.values[0];
        const normalizedChannelId = channel.channelId.replace(/\[]$/, "");
        promises.push((async () => {
          const id = await getDataIdPathMapping(normalizedChannelId);
          const objPart = getObjectStateConfig(normalizedChannelId);
          if ("value" in channelData && channelData.value !== void 0) {
            await this.extendObject(id, objPart).then(() => this.setState(id, channelData.value || null, true));
          } else if ("values" in channelData && channelData.values !== void 0) {
            for (let index = 0; index < channelData.values.length; index++) {
              const itemId = `${id}.${index}`;
              const value = channelData.values[index] || null;
              await this.extendObject(itemId, objPart).then(() => this.setState(itemId, value, true));
            }
          }
        })());
      }
      await Promise.all(promises);
    };
    const handleParametersResponse = async (data) => {
      this.log.debug(`Received Parameters Response: ${JSON.stringify(data[0].values.map((channel) => channel.channelId))}`);
      await this.setState("info.connection", true, true);
      const promises = [];
      for (const channel of data[0].values) {
        const normalizedChannelId = channel.channelId.replace(/\[]$/, "");
        promises.push((async () => {
          const id = await getDataIdPathMapping(normalizedChannelId);
          const objPart = getObjectStateConfig(normalizedChannelId, channel);
          const transform = (value) => {
            if (channel.min || channel.max || /^\d+(\.\d+)?$/.test(value)) {
              return parseFloat(value);
            }
            if (channel.possibleValues) {
              return getTranslation(value);
            }
            return value;
          };
          if ("value" in channel && channel.value !== void 0) {
            await this.extendObject(id, objPart).then(() => this.setState(id, transform(channel.value), true));
          } else if ("values" in channel && channel.values !== void 0) {
            for (let index = 0; index < channel.values.length; index++) {
              const itemId = `${id}.${index}`;
              await this.extendObject(itemId, objPart).then(() => this.setState(itemId, transform(channel.values[index]), true));
            }
          }
        })());
      }
      await Promise.all(promises);
    };
    const requestLiveData = async () => {
      this.log.debug("Request Live Data");
      const liveMeasurementValues = await device.getLiveMeasurementValues().catch((e) => {
        this.log.error(JSON.stringify(e));
        this.setState("info.connection", false, true);
        return null;
      });
      if (liveMeasurementValues) {
        await handleLiveDataResponse(liveMeasurementValues);
      }
    };
    this.adapterIntervals.push(this.setInterval(requestLiveData, this.config.intervalLiveData * 1e3));
    this.adapterTimeouts.push(this.setTimeout(requestLiveData, 1e3));
    const requestParameters = async () => {
      this.log.debug(`Request Parameters Data`);
      const parametersResponse = await device.getParameters().catch((e) => {
        this.log.error(JSON.stringify(e));
        this.setState("info.connection", false, true);
        return null;
      });
      if (parametersResponse) {
        await handleParametersResponse(parametersResponse);
      }
    };
    this.adapterIntervals.push(this.setInterval(requestParameters, this.config.intervalFull * 1e3));
    this.adapterTimeouts.push(this.setTimeout(requestParameters, 2e3));
  }
  /**
   * Is called if a subscribed state changes
   */
  async onStateChange(id, state) {
    if (state) {
    } else {
      this.log.debug(`state ${id} deleted`);
    }
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   */
  onUnload(callback) {
    try {
      for (const timeout of this.adapterTimeouts) {
        this.clearTimeout(timeout);
      }
      for (const interval of this.adapterIntervals) {
        this.clearInterval(interval);
      }
      callback();
    } catch {
      callback();
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new SmaLocal(options);
} else {
  (() => new SmaLocal())();
}
//# sourceMappingURL=main.js.map
