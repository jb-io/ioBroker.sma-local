// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            host: string;
            legacyDevice: boolean;
            username: string|null,
            password: string,
            storeSessionToken: boolean;
            intervalFull: number
            intervalLiveData: number
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
