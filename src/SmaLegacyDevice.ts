import SmaDevice, {LoginResponse, SmaDeviceConfig} from "./SmaDevice";


type SmaLoginResponse = {
    result: {sid: string}
}

type ObjectValueData = {
    [key: string]: N0DataNode | N1DataNode | N9DataNode;
};

export type N0DataNode = { "0": N0Data[] };
export type N1DataNode = { "1": N1Data[] };
export type N9DataNode = { "9": N9Data[] };
export type N0Data = {
    val: string
}
export type N1Data = {
    val: number
}
export type N9Data = {
    val: number | string | TaggedVal[] | null;
    low?: number|null;
    high?: number|null;
    validVals?: number[];
};
type TaggedVal = {tag: number}

export type GetAllOnlValuesResponse = GetValuesResponse
export type GetValuesResponse =  {
    result: {
        [key: string]: ObjectValueData;
    };
};

type TagTranslationResponse = {
    [key: number|string]: string;
};

export interface ObjectMetadata {
    Prio:             number;
    TagId:            number;
    TagIdEvtMsg:      number | string;
    Unit?:            number;
    DataFrmt:         number;
    Scale?:           number;
    Typ:              number;
    WriteLevel:       number;
    TagHier:          number[];
    Min?:             boolean;
    Max?:             boolean;
    Avg?:             boolean;
    Cnt?:             boolean;
    MinD?:            boolean;
    MaxD?:            boolean;
    Sum?:             boolean;
    SumD?:            boolean;
    Deprecated?:      boolean;
    Len?:             number;
    ParaInfo?:        string;
    Hidden?:          boolean;
    GridGuard?:       boolean;
    AvgD?:            boolean;
    SortTranslation?: boolean;
    GroupChange?:     string[];
}

type ObjectMetadataResponse = {
    [key: string]: ObjectMetadata;
};




export default class SmaLegacyDevice extends SmaDevice {

    constructor(config: SmaDeviceConfig) {
        super(config);

        this._client.interceptors.request.use((config) => {
            if (this._sessionToken) {
                const url = new URL(config.url as string, config.baseURL);
                url.searchParams.append('sid', this._sessionToken);
                config.url = url.toString().replace(config.baseURL as string, '');
            }
            return config;
        });
    }

    protected async login(): Promise<LoginResponse> {
        return this._client.post<SmaLoginResponse>('/dyn/login.json', {
            right: 'istl',
            pass: this._config.password,
        } )
            .then(({data}): LoginResponse => {
                return {
                    access_token: data.result.sid,
                };
            })
    }

    public async getAllOnlValues (): Promise<GetAllOnlValuesResponse> {
        return this._client.post(`/dyn/getAllOnlValues.json`, {"destDev":[]})
            .then(response => response.data)
        ;
    }
    public async getValues (keys: string[]): Promise<GetAllOnlValuesResponse> {
        return this._client.post(`/dyn/getValues.json`, {"destDev":[], "keys": keys})
            .then(response => response.data)
        ;
    }

    public async getObjectMetaData (): Promise<ObjectMetadataResponse> {

        return this._client.get(`/data/ObjectMetadata_Istl.json`)
            .then(response => response.data)
        ;
    }

    public async getTagTranslations (): Promise<TagTranslationResponse> {

        return this._client.get(`/data/l10n/de-DE.json`)
            .then((response) => response.data)
        ;
    }

}
