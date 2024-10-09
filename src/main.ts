/*
 * Created with @iobroker/create-adapter v2.6.3
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';

// Load your modules here:
// import _ from 'lodash';
import SmaDevice, {LoginResponse} from "./SmaDevice";
import SmaEnnexosDevice, {LiveRequestResponse, ParametersResponse} from "./SmaEnnexosDevice";
import SmaLegacyDevice, {GetValuesResponse, N0Data, N0DataNode, N1Data, N1DataNode, N9Data, N9DataNode, ObjectMetadata} from "./SmaLegacyDevice";
import {Device} from "./data";


class SmaLocal extends utils.Adapter {


   private readonly adapterIntervals: (ioBroker.Interval | undefined)[] ;
   private readonly adapterTimeouts: (ioBroker.Timeout | undefined)[];


    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'sma-local',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));

        this.adapterTimeouts = [];
        this.adapterIntervals = [];
    }



    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        // Initialize your adapter here

        // Reset the connection indicator during startup
        await this.setState('info.connection', false, true);

        if (!this.config.host) {
            return;
        }

        let device: SmaDevice;
        if (this.config.legacyDevice) {
            device = new SmaLegacyDevice({
                host: this.config.host,
                password: this.config.password || '',
            });
        } else {
            device = new SmaEnnexosDevice({
                host: this.config.host,
                username: this.config.username || '',
                password: this.config.password || '',
            })
        }

        device.onAuthenticate((response: LoginResponse) => {
            if (this.config.storeSessionToken) {
                this.extendObject('info.session', {
                    type: 'state',
                    common: {
                        type: 'string',
                        name: 'Session token',
                        role: 'text',
                        write: false,
                    },
                });
                this.setState('info.session', {
                    val: response.access_token,
                    ack: true,
                    expire: response.expires_in,
                })
            }
            this.setState('info.connection', true, true);
            this.log.info(`Authenticated with token: ${response.access_token}`);
        })

        let authenticated = false;
        if (this.config.storeSessionToken) {
            const session = await this.getStateAsync('info.session');
            if (session && session.ack && session.val) {
                device.setSessionToken(session.val as string);
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
            await this.setupLegacyDevice(device as SmaLegacyDevice);
        } else {
            await this.setupEnnexosDevice(device as SmaEnnexosDevice);
        }

    }

    private async setupLegacyDevice(device: SmaLegacyDevice): Promise<void> {

        type ObjectKey = keyof typeof objectMetadataCollection;
        const objectMetadataCollection = await device.getObjectMetaData();

        const translations = await device.getTagTranslations();
        const getTranslation = (tag: number|string): string => {
            if (tag in translations) {
                return translations[tag];
            }
            return `${tag}`;
        }

        const dataIdPathMapping: {[key: ObjectKey]: string} = {};
        const getDataIdPathMapping = async (key: ObjectKey): Promise<string> => {
            if (!(key in dataIdPathMapping)) {
                const promises: Promise<any>[] = [];
                let path = 'Parameter';
                for (const pathItem of objectMetadataCollection[key].TagHier) {
                    path += '.' + pathItem ;
                    promises.push(this.extendObject(path, {
                        type: 'channel',
                        common: {
                            name: getTranslation(pathItem),
                        }
                    }));
                }
                await Promise.all(promises);
                dataIdPathMapping[key] = path + '.' + key;
            }

            return dataIdPathMapping[key];
        }

        const objectStateConfig: {[key: ObjectKey]: ioBroker.PartialObject} = {};
        const getObjectStateConfig = (key: ObjectKey): ioBroker.PartialObject => {
            if (!(key in objectStateConfig)) {
                const metadata = objectMetadataCollection[key];
                const common: Partial<ioBroker.StateCommon> = {
                    role: 'state',
                    type: 'mixed',
                    name: getTranslation(metadata.TagId),
                    write: metadata.WriteLevel <= 2,
                };
                if (metadata.Typ === 0) {
                    common.type = 'number';
                    common.role = 'value';
                } else if (metadata.Typ === 2) {
                    common.type = 'string';
                    common.role = 'text'
                }

                if (metadata.Unit) {
                    common.unit = getTranslation(metadata.Unit);
                }

                objectStateConfig[key] = {
                    type: 'state',
                    common: common,
                    native: {...metadata}
                };
            }

            return objectStateConfig[key];
        }

        await this.setState('info.connection', true, true);

        const handleGetValuesResponse = async ({result: devices}: GetValuesResponse): Promise<void> => {
            if (!devices) {
                return
            }

            const transformDataNodes = (dataNode: N0DataNode|N1DataNode|N9DataNode, objectMetadata: ObjectMetadata): Array<ioBroker.StateValue>|null => {
                let data: N0Data[]|N1Data[]|N9Data[] = [];
                if ("0" in dataNode) {
                    data = (dataNode as N0DataNode)["0"];
                } else if ("1" in dataNode) {
                    data = (dataNode as N1DataNode)["1"];
                } else if ("9" in dataNode) {
                    data = (dataNode as N9DataNode)["9"];
                }

                if (data.length <= 0) {
                    return null;
                }

                const normalizeValue = (value: N0Data|N1Data|N9Data): number|string|null => {
                    const val = value.val;
                    if (Array.isArray(val)) {
                        if (val.length > 0) {
                            return val.map((x) => getTranslation(x.tag)).join(', ');
                        }
                        return null;
                    }

                    if (typeof val === 'number' && objectMetadata.Scale) {
                        return  val * objectMetadata.Scale;
                    }
                    return val;
                }

                return data.map(normalizeValue);
            };

            const deviceKey = Object.keys(devices)[0];
            const deviceValues = devices[deviceKey];
            const promises : Promise<any>[] = [];

            this.log.debug(`Received Data for keys: ${Object.keys(deviceValues)}`);

            for (const key in deviceValues) {

                const deviceValue = deviceValues[key];
                const objectMetadata = objectMetadataCollection[key];

                const values = transformDataNodes(deviceValue, objectMetadata);
                if (null === values) {
                    continue;
                }

                promises.push((async (): Promise<any> => {
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
        }

        const requestLiveData = async () => {
            this.log.debug('Request Live Data');
            const response = await device.getAllOnlValues().catch((e) => {
                this.log.error(JSON.stringify(e));
                this.setState('info.connection', false, true);
                return null;
            });
            if (response) {
                await this.setState('info.connection', true, true);
                await handleGetValuesResponse(response);
            }
        };
        this.adapterIntervals.push(this.setInterval(requestLiveData, this.config.intervalLiveData * 1000));
        this.adapterTimeouts.push(this.setTimeout(requestLiveData, 1000));

        const requestFull = async () => {
            const keys = Object.keys(objectMetadataCollection);
            const chunkSize = 64;
            const chunkCount = Math.ceil(keys.length / chunkSize);
            let offset = 0;

            const timeout = Math.round((this.config.intervalFull * 1000) / (chunkCount + 1));

            const handleChunk = async () => {
                this.log.debug(`Request Full Data Chunk ${offset} - ${offset + chunkSize} / ${keys.length}`);
                const chunk = keys.slice(offset, offset + chunkSize);
                offset += chunkSize;
                if (offset < keys.length) {
                    this.setTimeout(handleChunk, timeout);
                }

                const response = await device.getValues(chunk).catch((e) => {
                    this.log.error(JSON.stringify(e));
                    this.setState('info.connection', false, true);
                    return null;
                });
                if (response) {
                    await this.setState('info.connection', true, true);
                    await handleGetValuesResponse(response);
                }
            }
            await handleChunk();
        };
        this.adapterIntervals.push(this.setInterval(requestFull, this.config.intervalFull * 1000));
        this.adapterTimeouts.push(this.setTimeout(requestFull, 2000));

    }

    private async setupEnnexosDevice(device: SmaEnnexosDevice): Promise<void> {


        /* Widget Data
        const widgets = (await device.getWidgets()).map(item => item.widgetType);
        for (const widget of widgets) {
            this.log.info(widget);
            const widgetData = await device.getWidgetData(widget);
            this.log.info(JSON.stringify(widgetData));
        }
        END Widget Data */

        const devices = await device.getDeviceDefinitions();

        const translations = await device.getTranslations();
        const getTranslation = (key: string|number): string => {
            if (key in translations) {
                return translations[key];
            }
            return `${key}`;
        }

        const dataIdPathMapping: {[key: string]: string} = {};
        const getDataIdPathMapping = async (key: string): Promise<string> => {
            if (!(key in dataIdPathMapping)) {
                const deviceDefinition = devices[key];
                if (deviceDefinition && deviceDefinition.displayGroup) {
                    await this.extendObject(key.replace(/\.[^.]*$/, ''), {
                        type: 'channel',
                        common: {
                            name: getTranslation(deviceDefinition.displayGroup),
                        }
                    });
                }
                dataIdPathMapping[key] = key;
            }

            return dataIdPathMapping[key];
        }


        const objectStateConfig: {[key: string]: ioBroker.PartialObject} = {};
        const getObjectStateConfig = (key: string, config: {editable?: boolean,min?: number, max?:number, possibleValues?: string[]}|null = null): ioBroker.PartialObject => {
            if (!(key in objectStateConfig)) {
                const deviceDefinition: Device|undefined = devices[key];
                const common: Partial<ioBroker.StateCommon> = {
                    role: 'state',
                    type: 'mixed',
                    write: (config && config.editable !== undefined) ? config.editable : false,
                };
                const native: any = {};

                if (deviceDefinition) {
                    if (deviceDefinition.translationId) {
                        common.name = getTranslation(deviceDefinition.translationId)
                    }
                    if (deviceDefinition.unit && parseInt(deviceDefinition.unit)) {
                        common.unit = getTranslation(deviceDefinition.unit);
                    }
                    if (deviceDefinition.valueType === 'SCALAR') {
                        common.type = 'number';
                        common.role = 'value';
                    } else if (deviceDefinition.valueType === 'TEXT') {
                        common.type = 'string';
                        common.role = 'text'
                    }
                    native.deviceDefinition = deviceDefinition;
                } else {
                    this.log.warn(`Device definition for ${key} not found.`);
                }

                if (config) {
                    if (config.min !== undefined) {
                        common.min = config.min;
                    }
                    if (config.max !== undefined) {
                        common.max = config.max;
                    }
                    native.config = config;
                }


                objectStateConfig[key] = {
                    type: 'state',
                    common: common,
                    native: native
                };
            }

            return objectStateConfig[key];
        }

        const handleLiveDataResponse = async (data : LiveRequestResponse): Promise<void> => {
            this.log.debug(`Received Live Data Response: ${JSON.stringify(data.map((channel) => channel.channelId))}`);
            await this.setState('info.connection', true, true);
            const promises : Promise<any>[] = [];

            for (const channel of data) {
                if (channel.values.length !== 1) {
                    this.log.error(`Could not handle data for ${channel.channelId}: ${JSON.stringify(channel.values)}`);
                }

                const channelData = channel.values[0];
                const normalizedChannelId = channel.channelId.replace(/\[]$/, '');

                promises.push((async (): Promise<any> => {
                    const id = await getDataIdPathMapping(normalizedChannelId);
                    const objPart = getObjectStateConfig(normalizedChannelId);
                    if ("value" in channelData && channelData.value !== undefined) {
                        await this.extendObject(id, objPart).then(() => this.setState(id, channelData.value || null, true));
                    } else if ("values" in channelData && channelData.values !== undefined) {
                        for (let index = 0; index < channelData.values.length; index++) {
                            const itemId = `${id}.${index}`;
                            const value = channelData.values[index] || null;
                            await this.extendObject(itemId, objPart).then(() => this.setState(itemId, value, true));
                        }
                    }
                })());

            }

            await Promise.all(promises);
        }

        const handleParametersResponse = async (data : ParametersResponse): Promise<void> => {
            this.log.debug(`Received Parameters Response: ${JSON.stringify(data[0].values.map((channel) => channel.channelId))}`);
            await this.setState('info.connection', true, true);
            const promises : Promise<any>[] = [];

            for (const channel of data[0].values) {

                const normalizedChannelId = channel.channelId.replace(/\[]$/, '');

                promises.push((async (): Promise<any> => {
                    const id = await getDataIdPathMapping(normalizedChannelId);
                    const objPart = getObjectStateConfig(normalizedChannelId, channel);

                    const transform = (value: string): ioBroker.StateValue => {
                        if (channel.min || channel.max || /^\d+(\.\d+)?$/.test(value)) {
                            return parseFloat(value);
                        }
                        if (channel.possibleValues) {
                            return getTranslation(value);
                        }
                        return value;
                    }
                    if ("value" in channel && channel.value !== undefined) {
                        await this.extendObject(id, objPart).then(() => this.setState(id, transform(channel.value), true));
                    } else if ("values" in channel && channel.values !== undefined) {
                        for (let index = 0; index < channel.values.length; index++) {
                            const itemId = `${id}.${index}`;
                            await this.extendObject(itemId, objPart).then(() => this.setState(itemId, transform(channel.values[index]), true));
                        }
                    }
                })());

            }

            await Promise.all(promises);
        }

        const requestLiveData = async () => {
            this.log.debug('Request Live Data');
            const liveMeasurementValues = await device.getLiveMeasurementValues().catch((e) => {
                this.log.error(JSON.stringify(e));
                this.setState('info.connection', false, true);
                return null;
            });
            if (liveMeasurementValues) {
                await handleLiveDataResponse(liveMeasurementValues);
            }
        };
        this.adapterIntervals.push(this.setInterval(requestLiveData, this.config.intervalLiveData * 1000));
        this.adapterTimeouts.push(this.setTimeout(requestLiveData, 1000));

        const requestParameters = async () => {
            this.log.debug(`Request Parameters Data`);
            const parametersResponse = await device.getParameters().catch((e) => {
                this.log.error(JSON.stringify(e));
                this.setState('info.connection', false, true);
                return null;
            });
            if (parametersResponse) {
                await handleParametersResponse(parametersResponse);
            }

        };
        this.adapterIntervals.push(this.setInterval(requestParameters, this.config.intervalFull * 1000));
        this.adapterTimeouts.push(this.setTimeout(requestParameters, 2000));
    }


    /**
     * Is called if a subscribed state changes
     */
    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (state) {


        } else {
            // The state was deleted
            this.log.debug(`state ${id} deleted`);
            // this.setTimeout(this.createStates.bind(this), 1000);
        }
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
            // Here you must clear all timeouts or intervals that may still be active
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
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new SmaLocal(options);
} else {
    // otherwise start the instance directly
    (() => new SmaLocal())();
}
