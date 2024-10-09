// var request = require('request');
//
// const id = `javascript.0.sma.login`;
//
// interface SmaDeviceConfig {
//     host: string,
//     username: string,
//     password: string,
//     componentId: string,
//     alias?: string,
//     type: 'ChargingStation'|'PvProduction',
// }
//
// interface SmaDataObject {
//     channelId: string,
//     componentId: string,
//     values: Array<{
//         time: string,
//         value?: number,
//         values?: Array<number>,
//     }>,
// }
//
// type SmaLegacyDataObject = {[key: string]: {[key: string]: {}}};
//
//
// class SmaDevice {
//
//     protected config: SmaDeviceConfig;
//     protected idPrefix: string;
//
//     constructor(config: SmaDeviceConfig) {
//         this.config = config;
//         this.idPrefix = `javascript.0.sma.${config.alias || config.host}`;
//     }
//
//     protected async setAccessToken(accessToken: null|string, expire: null|number): Promise<any> {
//
//         return setStateAsync(`${this.idPrefix}.auth.access_token`, {
//             ack: true,
//             val: accessToken,
//             expire: expire,
//         });
//     }
//
//     protected async getAccessToken(): Promise<string> {
//         await assertStateExistsAsync(`${this.idPrefix}.auth.access_token`, {
//             desc: 'Access token for api',
//         });
//
//         return new Promise(async (resolve, reject) => {
//             const state = await getStateAsync(`${this.idPrefix}.auth.access_token`);
//
//             if (state && state.val) {
//                 resolve(state.val);
//                 return;
//             }
//
//             return this.login();
//         });
//     }
//
//     protected async login(): Promise<string> {
//         return new Promise((resolve, reject) => {
//             request({
//                 url: `https://${this.config.host}/api/v1/token`,
//                 method: 'POST',
//                 headers: {
//                     "accept": "application/json, text/plain, */*",
//                     "content-type": "application/x-www-form-urlencoded",
//                 },
//                 body: `grant_type=password&username=${this.config.username}&password=${this.config.password}`,
//                 rejectUnauthorized: false ,
//             }, async (error, response, body) => {
//                 if (error || response.statusCode != 200) {
//                     reject(error);
//                 } else {
//                     const data = JSON.parse(body);
//
//                     await this.setAccessToken(data.access_token, 3600);
//                     resolve(data.access_token);
//                 }
//             });
//         });
//     }
//
//     public async getCurrentMeasurementValues (): Promise<void> {
//
//         const accessToken = await this.getAccessToken();
//
//         return new Promise ((resolve, reject) => {
//             request(`https://${this.config.host}/api/v1/measurements/live`, {
//                 "headers": {
//                     "accept": "application/json, text/plain, */*",
//                     "authorization": `Bearer ${accessToken}`,
//                     "content-type": "application/json",
//                 },
//                 "body": `[{"componentId":"${this.config.componentId}"}]`,
//                 "method": "POST",
//                 "mode": "cors",
//                 "credentials": "include",
//                 rejectUnauthorized: false ,
//             }, async (error, response, body) => {
//                 if (response.statusCode === 401) {
//                     await this.setAccessToken(null, 0);
//
//                     reject(error);
//                 } else {
//                     await this.handleDataResponse(JSON.parse(body));
//                     resolve();
//                 }
//             });
//
//         });
//     }
//
//     public async getLiveMeasurementValues (): Promise<void> {
//
//         const accessToken = await this.getAccessToken();
//
//         if (this.config.type === 'ChargingStation') {
//             const data = await this.requestJson(`/api/v1/widgets/emobility?componentId=${this.config.componentId}`);
//             this.writeDataArray(data, 'live.emobility');
//         }
//         if (this.config.type === 'PvProduction' || this.config.type === 'ChargingStation') {
//             const data = await this.requestJson(`/api/v1/widgets/gauge/power?componentId=${this.config.componentId}&type=${this.config.type}`);
//             this.writeDataArray(data, 'live.gauge_power');
//         }
//
//     }
//
//     protected async requestJson(uri: string, method: 'GET'|'POST' = 'GET', body: object|null = null): Promise<object> {
//         return new Promise(async (resolve, reject) => {
//             const accessToken = await this.getAccessToken();
//             request(`https://${this.config.host}${uri}`, {
//                 "headers": {
//                     "accept": "application/json, text/plain, */*",
//                     "authorization": `Bearer ${accessToken}`,
//                     "content-type": "application/json",
//                 },
//                 "method": method,
//                 "mode": "cors",
//                 "credentials": "include",
//                 rejectUnauthorized: false ,
//             }, async (error, response, body) => {
//                 if (response.statusCode === 401) {
//                     await this.setAccessToken(null, 0);
//
//                     reject(error);
//                 } else {
//                     resolve(JSON.parse(body));
//                 }
//             });
//         });
//     }
//
//     protected async writeDataArray(data: object, prefix: string): Promise<any> {
//         for (const key in data) {
//             if (Object.prototype.hasOwnProperty.call(data, key)) {
//                 const element = data[key];
//
//                 await this.writeDataPointState(`${prefix}.${key}`, element);
//             }
//         }
//
//     }
//
//     protected async writeDataPointState(id: string, value: any): Promise<any> {
//
//         const stateId = `${this.idPrefix}.${id}`;
//
//         await assertStateExistsAsync(stateId, {
//             desc: id,
//         })
//
//         const previousState = await getStateAsync(stateId);
//
//         if (!previousState.ack || previousState.val !== value) {
//             const stateVal = (typeof value === 'object') ? JSON.stringify(value) : value;
//             return await setStateAsync(stateId, stateVal, true);
//         }
//         return value;
//     }
//
//     protected async writeDataPoint(id: string, time:string|null, value: number|undefined): Promise<any> {
//         if (typeof value === 'undefined') {
//             return;
//         }
//         const stateId = `${this.idPrefix}.data.${id}`
//
//         return await this.writeDataPointState(`data.${id}`, value);
//     }
//
//     protected async handleDataResponse(data: Array<SmaDataObject>): Promise<void> {
//         const promies: Array<Promise<any>> = [];
//         for (const element of data) {
//
//             const channelId = element.channelId as string;
//             const values = element.values[0];
//
//             if (channelId.endsWith('[]')) {
//                 const valueElements = values.values as Array<number>;
//                 for (let index = 0; index < valueElements.length; index++) {
//                     promies.push(this.writeDataPoint(channelId.replace('[]', `.${index}.value`), values.time, valueElements[index]));
//                 }
//             } else {
//                 promies.push(this.writeDataPoint(channelId + '.value', values.time, values.value));
//             }
//         }
//         await Promise.all(promies);
//     }
//
//     public subscibe(): void {
//         const randomPrime = () => {
//             const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
//             return primes[Math.floor(Math.random() * primes.length)];
//         }
//         setInterval(() => {
//             this.getCurrentMeasurementValues();
//         }, 60*1000+randomPrime());
//
//         setInterval(() => {
//             this.getLiveMeasurementValues();
//         }, 3000+randomPrime());
//     }
// }
//
// class SmaLegacyDevice extends SmaDevice {
//
//
//     protected async login(): Promise<string> {
//         return new Promise((resolve, reject) => {
//             request({
//                 "url": `https://${this.config.host}/dyn/login.json`,
//                 "headers": {
//                     "accept": "application/json, text/plain, */*",
//                     "content-type": "application/json;charset=UTF-8",
//                 },
//                 "body": JSON.stringify({"right":"istl","pass":this.config.password}),
//                 "method": "POST",
//                 "rejectUnauthorized": false
//             }, async (error, response, body) => {
//                 if (error || response.statusCode != 200) {
//                     reject(error);
//                 } else {
//                     const data = JSON.parse(body);
//
//                     await this.setAccessToken(data.result.sid, 600);
//                     resolve(data.result.sid);
//                 }
//             });
//         });
//     }
//
//
//     public async getCurrentMeasurementValues (): Promise<void> {
//
//         const accessToken = await this.getAccessToken();
//
//         return new Promise ((resolve, reject) => {
//             request(`https://${this.config.host}/dyn/getAllOnlValues.json?sid=${accessToken}`, {
//                 "headers": {
//                     "accept": "application/json, text/plain, */*",
//                     "authorization": `Bearer ${accessToken}`,
//                     "content-type": "application/json",
//                 },
//                 "body": "{\"destDev\":[]}",
//                 "method": "POST",
//                 "mode": "cors",
//                 "credentials": "include",
//                 rejectUnauthorized: false ,
//             }, async (error, response, body) => {
//                 if (response.statusCode === 401) {
//                     await this.setAccessToken(null, 0);
//
//                     reject(error);
//                 } else {
//                     await this.handleLegacyDataResponse(JSON.parse(body).result);
//                     resolve();
//                 }
//             });
//         });
//     }
//
//     protected async handleLegacyDataResponse(data: Array<SmaLegacyDataObject>): Promise<void> {
//         const promies: Array<Promise<any>> = [];
//
//         for (const deviceId in data) {
//             if (Object.prototype.hasOwnProperty.call(data, deviceId)) {
//                 const device = data[deviceId];
//
//                 for (const key in device) {
//                     if (Object.prototype.hasOwnProperty.call(device, key)) {
//                         const element = device[key];
//
//                         if (Object.prototype.hasOwnProperty.call(element, "9")) {
//                             if (element["9"][0]) {
//                                 promies.push(this.writeDataPoint(`${deviceId}.${key}.value`, null, element["9"][0].val));
//                             }
//                         }
//                         if (Object.prototype.hasOwnProperty.call(element, "1")) {
//                             const values = element["1"] as Array<{val: number}>
//                             for (let index = 0; index < values.length; index++) {
//                                 promies.push(this.writeDataPoint(`${deviceId}.${key}.${index}.value`, null, values[index].val));
//                             }
//                         }
//
//                     }
//                 }
//             }
//         }
//         await Promise.all(promies);
//     }
//
//     public subscibe(): void {
//         setInterval(() => {
//             this.getCurrentMeasurementValues();
//         }, 10000 + 113);
//     }
// }
//
//
// (new SmaDevice({
//     host: '192.168.178.34',
//     //host: '192.168.110.171',
//     username: 'Damm-Solar',
//     password: 'Damm-solar1',
//     alias: 'wallbox-garage',
//     componentId: 'Plant:1',
//     type: 'ChargingStation',
// })).subscibe();
//
//
// (new SmaDevice({
//     host: '192.168.178.26',
//     //host: '192.168.110.172',
//     username: 'Damm-Solar',
//     password: 'Damm-solar1',
//     alias: 'tripower-x-15',
//     componentId: 'IGULD:SELF',
//     type: 'PvProduction',
// })).subscibe();
//
//
// (new SmaLegacyDevice({
//     //host: '192.168.110.173',
//     host: '192.168.178.32',
//     username: 'Damm-Solar',
//     password: 'Damm-solar1',
//     alias: 'tripower-10se',
//     componentId: '',
//     type: 'PvProduction',
// })).subscibe();
// // */
