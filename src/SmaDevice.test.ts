import { expect } from 'chai';
import axios from 'axios';
import SmaDevice, { LoginResponse } from './SmaDevice';

/**
 * A device whose login and whose requests are served by a stubbed axios adapter, so the
 * re-authentication interceptor of SmaDevice can be tested without a real SMA device.
 */
class TestDevice extends SmaDevice {

    public loginCount = 0;
    public requestCount = 0;
    /** The token the stubbed login hands out. */
    public issuedToken = 'token-2';
    /** The token the stubbed endpoints accept. */
    public validToken = 'token-2';

    constructor() {
        super({host: 'sma.invalid', username: 'user', password: 'secret'});

        this._client.defaults.adapter = async (config) => {
            if (config.url === '/api/v1/token') {
                this.loginCount++;
                return this.respond(config, 200, {access_token: this.issuedToken});
            }
            this.requestCount++;
            if (config.headers.Authorization !== `Bearer ${this.validToken}`) {
                throw Object.assign(new Error('Request failed with status code 401'), {
                    config: config,
                    response: this.respond(config, 401, {}),
                });
            }
            return this.respond(config, 200, {ok: config.url});
        };
    }

    private respond(config: axios.InternalAxiosRequestConfig, status: number, data: unknown): axios.AxiosResponse {
        return {status, statusText: '', data, headers: {}, config};
    }

    protected async login(): Promise<LoginResponse> {
        return this._client.post<LoginResponse>('/api/v1/token', {}, {
            smaSkipReauthentication: true,
        }).then(({data}) => data);
    }

    public get(url: string): Promise<axios.AxiosResponse> {
        return this._client.get(url);
    }
}

describe('SmaDevice => re-authentication on 401', () => {

    it('retries every concurrent request that ran into the expired token', async () => {
        const device = new TestDevice();
        device.setSessionToken('token-1');

        const responses = await Promise.all([
            device.get('/live'),
            device.get('/parameters'),
        ]);

        expect(responses.map(({status}) => status)).to.deep.equal([200, 200]);
        expect(responses.map(({data}) => (data as {ok: string}).ok)).to.deep.equal(['/live', '/parameters']);
        // Both requests failed, both were replayed - and they shared a single login.
        expect(device.requestCount).to.equal(4);
        expect(device.loginCount).to.equal(1);
    });

    it('retries a request only once', async () => {
        const device = new TestDevice();
        device.setSessionToken('token-1');
        // The endpoints never accept the token the login hands out, so the replay fails again.
        device.issuedToken = 'token-3';

        let error: unknown = null;
        await device.get('/live').catch((e) => {
            error = e;
        });

        expect(error).to.not.equal(null);
        expect(device.requestCount).to.equal(2);
        expect(device.loginCount).to.equal(1);
    });
});
