import type { AuthSession } from '../../auth/state/auth-session';
import { ApiError } from '../../../lib/http/api-error';
// Focus can coincide with foreground token verification. Wait for its result.
export async function sessionReady(manager: AuthSession, owner: string) {
    if (manager.getSnapshot().busy)
        await new Promise<void>(resolve => { const unsubscribe = manager.subscribe(() => { if (!manager.getSnapshot().busy) {
            unsubscribe();
            resolve();
        } }); });
    if (manager.getSnapshot().user?.id !== owner)
        throw new ApiError('UNAUTHENTICATED');
}

// Keep a user intent while background reads briefly own the session lock.
// Only BUSY is retried here; an uncertain network mutation keeps its original
// Mutation key/payload and requires the existing explicit retry UI.
export async function sessionOperation<T>(manager: AuthSession, owner: string, work: () => Promise<T>, active: () => boolean = () => true): Promise<T> {
    for (let retry = 0; ; retry++) {
        await sessionReady(manager, owner);
        if (!active()) throw new ApiError('CANCELLED');
        try { return await work(); }
        catch (error) {
            if (!(error instanceof ApiError) || error.code !== 'BUSY' || retry >= 3) throw error;
        }
    }
}
