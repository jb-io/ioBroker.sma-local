import axios from 'axios';
import https from 'https';

declare module 'axios' {
    interface AxiosRequestConfig {
        /** Set on the login request itself so a 401 there does not recurse into authenticate(). */
        smaSkipReauthentication?: boolean,
        /** Set once a request has been replayed after a re-authentication. */
        smaIsRetryAttempt?: boolean,
    }
}

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
    private _pendingAuthentication: Promise<LoginResponse | null> | null = null;

    constructor(config: SmaDeviceConfig) {
        this._config = config;

        this._client = axios.create({
            baseURL: 'https://' + config.host,
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
                keepAlive: true,
            }),
            withCredentials: true,
        });

        this._client.interceptors.response.use(
            (response) => {
                const data = response.data;
                if ((typeof data === 'object') && 'err' in data && data.err === 401) {
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
                    const originalRequest = error.config as axios.InternalAxiosRequestConfig | undefined;
                    // The retry state lives on the request, not on the client: the polls run
                    // concurrently, so a shared flag would let the first 401 swallow the retry of
                    // every other request that ran into the same expired token.
                    if (originalRequest && !originalRequest.smaSkipReauthentication && !originalRequest.smaIsRetryAttempt) {
                        originalRequest.smaIsRetryAttempt = true;
                        try {
                            await this.authenticateOnce();
                        } catch (tokenError) {
                            return Promise.reject(tokenError);
                        }
                        // Re-read the header: authenticate() has just replaced it, the one the
                        // original request carries is the expired token.
                        originalRequest.headers.Authorization = this._client.defaults.headers.common['Authorization'];
                        return this._client(originalRequest);
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    protected abstract login(): Promise<LoginResponse>;

    public async authenticate(): Promise<LoginResponse | null> {
        this.setSessionToken(null);
        // Do not swallow the reason here: the caller logs it and stops the setup instead of
        // continuing with an unauthenticated client whose every request then fails.
        const response = await this.login();
        if (response) {
            if (this._onAuthenticate) {
                await this._onAuthenticate(response);
            }
            this.setSessionToken(response.access_token);
        }

        return response;
    }

    /**
     * Authenticate, but let concurrent callers share one in-flight login instead of each
     * requesting a token of its own (and invalidating the others' token in the process).
     */
    private authenticateOnce(): Promise<LoginResponse | null> {
        if (!this._pendingAuthentication) {
            this._pendingAuthentication = this.authenticate()
                .finally(() => {
                    this._pendingAuthentication = null;
                });
        }
        return this._pendingAuthentication;
    }

    public onAuthenticate(handler: (response: LoginResponse) => void | Promise<void>): void {
        this._onAuthenticate = handler;
    }

    public setSessionToken(token: null|string): void {
        this._sessionToken = token;
        this._client.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : null;
    }


}


