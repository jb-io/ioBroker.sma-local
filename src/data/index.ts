import evChargerDevices from './ev-charger.devices';
import tripowerXDevices from './tripower-x.device';

import evChargerMessagesDe from './ev-charger.messages.de';
import evChargerMessagesEn from './ev-charger.messages.en';
import tripowerXMessagesDe from './tripower-x.messages.de';
import tripowerXMessagesEn from './tripower-x.messages.en';

import evChargerMetaDe from './ev-charger.meta.de';
import evChargerMetaEn from './ev-charger.meta.en';
import tripowerXMetaDe from './tripower-x.meta.de';
import tripowerXMetaEn from './tripower-x.meta.en';

export type Device = {
    unit: string
    displayGroup: string
    translationId: string
    displayPrecision: number
    valueType: string
}
export type Devices = {[key: string]: Device};

export type MetaItems = {[key: number|string]:string}
export type Meta = {META: MetaItems}

export type Messages = {[key: string]: {[key: string]:string}}

type DeviceType = 'TripowerX' | 'EvCharger';
type Language = 'de' | 'en';

export function getDevices(type: DeviceType): Devices {
    const data = {
        TripowerX: tripowerXDevices,
        EvCharger: evChargerDevices,
    }
    return data[type];
}

export function getMessages(type: DeviceType, lang: Language): Messages {
    const data = {
        TripowerX: {
            de: tripowerXMessagesDe,
            en: tripowerXMessagesEn,
        },
        EvCharger: {
            de: evChargerMessagesDe,
            en: evChargerMessagesEn,
        },
    }
    return data[type][lang];
}

export function getMeta(type: DeviceType, lang: Language): Meta {
    const data = {
        TripowerX: {
            de: tripowerXMetaDe,
            en: tripowerXMetaEn,
        },
        EvCharger: {
            de: evChargerMetaDe,
            en: evChargerMetaEn,
        },
    }
    return data[type][lang];
}
