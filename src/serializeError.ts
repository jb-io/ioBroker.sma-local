function stringifyValue(value: unknown, maxLength = 500): string {
    let text: string;
    try {
        // Request errors (e.g. AxiosError) can contain circular references (e.g. via the http
        // agent), which JSON.stringify throws on.
        text = typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
    } catch {
        text = '[unserializable]';
    }
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

// Errors arrive here as Error instances (AxiosError included) as well as plain rejection
// objects. Summarize what is useful about either: JSON.stringify yields "{}" for an Error,
// because its message and stack are not enumerable, and String() yields "[object Object]"
// for a plain object. Dumping the whole error is no alternative - an AxiosError carries the
// full request config, including the device password.
export default function serializeError(error: unknown): string {
    if (error === null || typeof error !== 'object') {
        return String(error);
    }

    const candidate = error as {
        name?: unknown,
        message?: unknown,
        code?: unknown,
        status?: unknown,
        config?: {method?: unknown, url?: unknown},
        response?: {status?: unknown, data?: unknown},
    };
    const parts: string[] = [];

    if (typeof candidate.message === 'string' && candidate.message) {
        parts.push(typeof candidate.name === 'string' && candidate.name
            ? `${candidate.name}: ${candidate.message}`
            : candidate.message);
    }
    if (candidate.code !== undefined) {
        parts.push(`code=${stringifyValue(candidate.code)}`);
    }
    const status = candidate.response?.status ?? candidate.status;
    if (status !== undefined) {
        parts.push(`status=${stringifyValue(status)}`);
    }
    if (candidate.config?.url !== undefined) {
        const method = typeof candidate.config.method === 'string' ? candidate.config.method.toUpperCase() : 'request';
        parts.push(`${method} ${stringifyValue(candidate.config.url)}`);
    }
    if (candidate.response?.data !== undefined) {
        parts.push(`body=${stringifyValue(candidate.response.data)}`);
    }

    // Nothing recognizable: fall back to the enumerable properties, which is all a plain
    // rejection object has to offer anyway.
    return parts.length ? parts.join(', ') : stringifyValue(error);
}

