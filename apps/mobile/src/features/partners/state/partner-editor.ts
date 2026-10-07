import { randomUUID } from 'expo-crypto';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
import type { AuthSession } from '../../auth/state/auth-session';
import type { Partner, PartnerCreate, PartnerEdit } from '../models';
type State = {
  value: Partner | null;
  busy: boolean;
  pending: boolean;
  error: ApiErrorCode | null;
  saved: boolean;
};
export class PartnerEditor {
  private state: State = {
    value: null,
    busy: false,
    pending: false,
    error: null,
    saved: false
  };
  private listeners = new Set<() => void>();
  private attempt: {
    key: string;
    work: (key: string) => Promise<Partner>;
  } | null = null;
  constructor(
    private auth: AuthSession,
    private owner: string,
    private id?: string
  ) {}
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private update(s: Partial<State>) {
    this.state = { ...this.state, ...s };
    this.listeners.forEach((fn) => fn());
  }
  load = async () => {
    if (!this.id || this.state.busy || this.attempt) return;
    this.update({ busy: true, error: null, saved: false });
    try {
      this.update({ value: await this.auth.loadPartner(this.owner, this.id) });
    } catch (e) {
      this.update({ error: e instanceof ApiError ? e.code : 'NETWORK' });
    } finally {
      this.update({ busy: false });
    }
  };
  create = (input: PartnerCreate) =>
    this.save((key) => this.auth.createPartner(this.owner, input, key));
  edit = (input: PartnerEdit) =>
    this.save((key) => this.auth.editPartner(this.owner, this.id!, input, key));
  retry = () => this.save();
  private async save(work?: (key: string) => Promise<Partner>) {
    if (this.state.busy) return;
    if (!this.attempt && work) this.attempt = { key: randomUUID(), work };
    if (!this.attempt) return;
    this.update({ busy: true, pending: true, error: null, saved: false });
    try {
      const value = await this.attempt.work(this.attempt.key);
      this.id = value.id;
      this.attempt = null;
      this.update({ value, pending: false, saved: true });
    } catch (e) {
      const error = e instanceof ApiError ? e.code : 'NETWORK';
      if (
        [
          'VALIDATION',
          'FORBIDDEN',
          'NOT_FOUND',
          'UNAUTHENTICATED',
          'VERSION_CONFLICT',
          'IDEMPOTENCY_MISMATCH',
          'BUSY'
        ].includes(error)
      )
        this.attempt = null;
      this.update({ error, pending: !!this.attempt });
    } finally {
      this.update({ busy: false });
    }
  }
}
