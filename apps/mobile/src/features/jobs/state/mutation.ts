import { randomUUID } from 'expo-crypto';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
// Retain the same immutable operation and key until its result is known.
export class Mutation<T> {
    private state: {
        busy: boolean;
        pending: boolean;
        error: ApiErrorCode | null;
        value: T | null;
    } = { busy: false, pending: false, error: null, value: null };
    private listeners = new Set<() => void>();
    private attempt: {
        key: string;
        work: (key: string) => Promise<T>;
    } | null = null;
    getSnapshot = () => this.state;
    subscribe = (f: () => void) => { this.listeners.add(f); return () => { this.listeners.delete(f); }; };
    private update(v: Partial<typeof this.state>) { this.state = { ...this.state, ...v }; this.listeners.forEach(f => f()); }
    run = async (work?: (key: string) => Promise<T>) => {
        if (this.state.busy)
            return null;
        if (!this.attempt && work)
            this.attempt = { key: randomUUID(), work };
        if (!this.attempt)
            return null;
        this.update({ busy: true, pending: true, error: null, value: null });
        try {
            const value = await this.attempt.work(this.attempt.key);
            this.attempt = null;
            this.update({ value, pending: false });
            return value;
        }
        catch (e) {
            const error = e instanceof ApiError ? e.code : 'NETWORK';
            if (['INSUFFICIENT_POINTS', 'PARTNER_FUNDING_REQUIRED', 'VALIDATION', 'FORBIDDEN', 'NOT_FOUND', 'UNAUTHENTICATED', 'VERSION_CONFLICT', 'STATE_CONFLICT', 'IDEMPOTENCY_MISMATCH', 'BUSY'].includes(error))
                this.attempt = null;
            this.update({ error, pending: !!this.attempt });
            return null;
        }
        finally {
            this.update({ busy: false });
        }
    };
}
