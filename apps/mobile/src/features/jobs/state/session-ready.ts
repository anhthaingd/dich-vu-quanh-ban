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
