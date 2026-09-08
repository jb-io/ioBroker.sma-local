import {expect} from 'chai';
import axios from 'axios';
import https from 'https';
import serializeError from './serializeError';
import {SmaUnauthorizedError} from './SmaDevice';

describe('serializeError', () => {

    it('keeps name and message of an Error, which JSON.stringify drops', () => {
        expect(serializeError(new Error('boom'))).to.equal('Error: boom');
    });

    it('describes the plain rejection objects of a legacy device instead of "[object Object]"', () => {
        const error = {status: 401, response: {status: 401, data: {err: 401}}};

        const result = serializeError(error);

        expect(result).to.not.include('[object Object]');
        expect(result).to.include('status=401');
        expect(result).to.include('{"err":401}');
    });

    it('summarizes a request error carrying circular references without dumping the password', () => {
        const config = {method: 'post', url: '/api/v1/token', data: 'grant_type=password&password=secret'};
        const error = Object.assign(new Error('connect ETIMEDOUT 192.168.0.1:443'), {
            code: 'ETIMEDOUT',
            config: config,
            // The https agent makes the real thing circular, which JSON.stringify throws on.
            httpsAgent: new https.Agent(),
        });
        (error.httpsAgent as unknown as {self: unknown}).self = error.httpsAgent;

        const result = serializeError(error);

        expect(result).to.equal('Error: connect ETIMEDOUT 192.168.0.1:443, code=ETIMEDOUT, POST /api/v1/token');
        expect(result).to.not.include('secret');
    });

    it('reports the response of an SmaUnauthorizedError', () => {
        const config = {url: '/dyn/getValues.json', headers: {}} as axios.InternalAxiosRequestConfig;
        const response = {status: 401, statusText: '', data: {err: 401}, headers: {}, config} as axios.AxiosResponse;

        const result = serializeError(new SmaUnauthorizedError(response));

        expect(result).to.include('SmaUnauthorizedError: Request to /dyn/getValues.json');
        expect(result).to.include('status=401');
    });

    it('handles values that are not objects', () => {
        expect(serializeError('plain text')).to.equal('plain text');
        expect(serializeError(undefined)).to.equal('undefined');
    });

    it('truncates an oversized response body', () => {
        const error = {response: {status: 200, data: 'x'.repeat(2000)}};

        expect(serializeError(error)).to.have.length.below(600);
    });
});
