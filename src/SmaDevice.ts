import axios from 'axios';
import https from 'https';

export interface LoginResponse {
    access_token: string,
    expires_in?: number,
}

export interface SmaDeviceConfig {
    host: string,
    username?: string,
    password: string,
}

type OnHandler<T> = (data: T) => void | Promise<void>;
type OnAuthenticationHandler = OnHandler<LoginResponse>;

export default abstract class SmaDevice {

    protected _config: SmaDeviceConfig;
    protected _client: axios.AxiosInstance;
    protected _sessionToken: string | null = null;

    private _onAuthenticate: OnAuthenticationHandler | null = null;

    constructor(config: SmaDeviceConfig) {
        this._config = config;

        this._client = axios.create({
            baseURL: 'https://' + config.host,
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
                keepAlive: true,
            }),
            withCredentials: true,
        });

        let isRetryAttempt = false;

        this._client.interceptors.response.use(
            (response) => {
                const data = response.data;
                if ((typeof data === 'object') && "err" in data && data.err === 401) {
                    response.status = 401;
                    return Promise.reject({
                        status: 401,
                        response: response,
                    });
                }
                return response;
            },
            (error) => {
                if (error.response && error.response.status === 500 && error.config.headers.Authorization) {
                    error.status = 401;
                    error.response.status = 401;
                    return Promise.reject(error);
                }
                return Promise.reject(error);
            }
        );
        this._client.interceptors.response.use(
            response => response,
            async (error) => {
                // 401 (Unauthorized)
                if (error.status === 401 || (error.response && error.response.status === 401)) {
                    if (!isRetryAttempt) {
                        isRetryAttempt = true;
                        try {
                            await this.authenticate();
                            const originalRequest = error.config;
                            return this._client(originalRequest);
                        } catch (tokenError) {
                            return Promise.reject(tokenError);
                        }
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    protected abstract login(): Promise<LoginResponse>;

    public async authenticate(): Promise<LoginResponse | null> {
        this.setSessionToken(null);
        const response = await this.login().catch(() => null);
        if (response) {
            if (this._onAuthenticate) {
                this._onAuthenticate(response);
            }
            this.setSessionToken(response.access_token);
        }

        return response;
    }

    public onAuthenticate(handler: (response: LoginResponse) => void | Promise<void>): void {
        this._onAuthenticate = handler;
    }

    public setSessionToken(token: null|string): void {
        this._sessionToken = token;
        this._client.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : null;
    }


}


