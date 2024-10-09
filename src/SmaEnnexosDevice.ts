import SmaDevice from "./SmaDevice";
import {getDevices, getMeta, Devices, MetaItems} from "./data";

interface SmaLoginResponse {
    access_token: string,
    expires_in: number,
    refresh_token: string,
    token_type: string,
    uiIdleTime: number|string,
}


export type LiveRequestResponse = Channels[]

export interface Channels {
    channelId: string
    componentId: string
    values: ParameterValue[]|Values[]
}

// export interface Value {
//     time: string
//     value?: number
// }
export interface Values {
    time: string
    values?: number[]
}



// const WidgetTypeMap: { [key: string]: string } = {
//     State: 'states',
//     EMobilityInformation: 'emobility',
//     EnergyAndPowerChargingStation: 'power',
// }

export type StateWidgetResponse = WidgetStateResponseItem[]

export interface WidgetStateResponseItem {
    componentId: string
    componentType: string
    name: string
    state: number
    stateFunctionTag: number
}

export interface EMobilityInformationWidgetResponse {
    chargeStatus: string
    evStatus: number
    evseName: string
    evseStatus: number
    notificationList: any[]
    power: number
    sessionEnergy: number
}

export interface PowerGaugeWidgetResponse {
    max: number
    min: number
    value: number|'NaN'
    timestamp?: string
}

export interface DeviceInfoWidgetResponse {
    deviceId: string
    deviceInfoFeatures: DeviceInfoFeature[]
    name: string
    plantId: string
    productGroupTagId: number
    productTagId: number
    serial: string
}

export interface DeviceInfoFeature {
    infoWidgetType: string
    value: string
}

type WidgetResponse = {
    'DeviceInfo': DeviceInfoWidgetResponse,
    'State': StateWidgetResponse,
    'EMobilityInformation': EMobilityInformationWidgetResponse
    'EnergyAndPowerChargingStation': PowerGaugeWidgetResponse
    'EnergyAndPower': PowerGaugeWidgetResponse
}

export type WidgetsResponse = WidgetsResponseItem[]

export interface WidgetsResponseItem {
    widgetType: keyof WidgetResponse
}

export type ParametersResponse = ParametersData[]

export interface ParametersData {
    componentId: string
    values: (ParameterValue|ParametersValue)[]
}

export interface ParameterValue {
    channelId: string
    editable: boolean
    state: string
    timestamp: string
    value: string
    possibleValues?: string[]
    max?: number
    min?: number
}
export interface ParametersValue {
    channelId: string
    editable: boolean
    state: string
    timestamp: string
    values: string[]
    possibleValues?: string[]
    max?: number
    min?: number
}


export default class SmaEnnexosDevice extends SmaDevice{

    private componentId = 'IGULD:SELF';

    protected async login(): Promise<SmaLoginResponse> {
        return this._client.post<SmaLoginResponse>('/api/v1/token', {
            grant_type: 'password',
            username: this._config.username,
            password: this._config.password,
        },{
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
        } )
            .then(({data}) => data)
    }

    public async getLiveMeasurementValues (): Promise<LiveRequestResponse> {
        return this._client.post<LiveRequestResponse>(`/api/v1/measurements/live`,
            [{componentId: this.componentId}],
        ).then(({data}) => data)
            ;

    }

    public async getParameters (): Promise<ParametersResponse> {
        return this._client.post<ParametersResponse>(`/api/v1/parameters/search`,
            {queryItems:[{componentId:this.componentId}]},
        ).then(({data}) => data)
            ;

    }

    public async getWidgets (): Promise<WidgetsResponse> {

        return this._client.get<WidgetsResponse>(`/api/v1/dashboard/widgets?componentId=${this.componentId}`,
        ).then(({data}) => data)
            ;
    }

    public async getWidgetData<K extends keyof WidgetResponse>(name: K): Promise<WidgetResponse[K]|null> {
        // const widget = WidgetTypeMap[name];
        let url = '';
        switch (name) {
            case 'DeviceInfo':
                url = `/api/v1/widgets/deviceinfo?deviceId=${this.componentId}`;
                break;
            case 'State':
                url = `/api/v1/widgets/states?componentId=${this.componentId}`;
                break;
            case 'EMobilityInformation':
                url = `/api/v1/widgets/emobility?componentId=${this.componentId}`;
                break;
            case 'EnergyAndPowerChargingStation':
                url = `/api/v1/widgets/gauge/power?componentId=${this.componentId}&type=ChargingStation`;
                break;
            case 'EnergyAndPower':
                url = `/api/v1/widgets/gauge/power?componentId=${this.componentId}&type=PvProduction`;
                break;
            default:
                return null;
        }

        return this._client.get<WidgetResponse[K]>(url)
            .then(({data}) => data)
        ;
    }

    public async getDeviceDefinitions(): Promise<Devices> {
        return Promise.resolve(getDevices('TripowerX'));
    }
    public async getTranslations(): Promise<MetaItems> {
        return Promise.resolve(getMeta('TripowerX', 'de').META);
    }
}


