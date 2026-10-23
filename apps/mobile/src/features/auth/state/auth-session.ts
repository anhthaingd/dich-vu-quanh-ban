import {createGalleryApi} from '../../partners/api/gallery-api';
import type {VerificationApi,VerificationInput} from '../../verification/api/verification-api';
import type {SupportApi} from '../../support/api/support-api';
import type {ReportInput} from '../../support/models';
import type {ReviewsApi} from '../../reviews/api/reviews-api';
import type {ReviewInput} from '../../reviews/models';
import type {RealtimeClient} from '../../../lib/realtime/realtime-client';
import type {NotificationsApi,NotificationSettings} from '../../notifications/api/notifications-api';
import type {OrganizationsApi} from '../../organizations/api/organizations-api';
import type { InvoicesApi } from '../../invoices/api/invoices-api';
import type { InvoiceDraft,InvoiceAction,InvoiceChange } from '../../invoices/models';
import type { JobsApi } from '../../jobs/api/jobs-api';
import type { JobCreate,JobAction,JobChange } from '../../jobs/models';
import type { ChatApi } from '../../chat/api/chat-api';
import type { MessageInput } from '../../chat/models';
import type { PartnersApi } from '../../partners/api/partners-api';
import type { PartnerCreate, PartnerEdit } from '../../partners/models';
import type { Locale } from '../../../lib/i18n';
import type { AccountsApi, ProfileEdit } from '../../accounts/api/accounts-api';
import type { AddressInput } from '../../accounts/models';
import { ApiError } from '../../../lib/http/api-error';
import type { AuthApi, Credentials, Me, Registration, Session, TokenStorage } from '../models/auth.types';
export type AuthErrorCode = 'UNAUTHENTICATED' | 'RATE_LIMITED' | 'VALIDATION' | 'SESSION_UNAVAILABLE';
type Snapshot = { phase: 'loading' | 'anonymous' | 'authenticated' | 'restore-error'; user: Me | null; busy: boolean; error: AuthErrorCode | null };
export class AuthSession {
  private session: Session | null = null;
  private snapshot: Snapshot = { phase: 'loading', user: null, busy: false, error: null };
  private readonly listeners = new Set<() => void>();
  constructor(private readonly api: AuthApi, private readonly storage: TokenStorage, private readonly accounts?: AccountsApi, private readonly partners?: PartnersApi, private readonly jobs?: JobsApi, private readonly chat?: ChatApi, private readonly invoices?: InvoicesApi, private readonly organizations?: OrganizationsApi, private readonly notifications?:NotificationsApi, private readonly reviews?:ReviewsApi,private readonly support?:SupportApi,private readonly verification?:VerificationApi) {}
  bindRealtime(client:RealtimeClient){
    const update=()=>client.setSession(this.session&&this.snapshot.user?.status==='active'?{owner:this.session.user.id,token:this.session.access_token,expiresAt:Date.parse(this.session.expires_at)}:null);
    client.setRefresh(async()=>{const owner=this.session?.user.id;if(!owner)throw new ApiError('UNAUTHENTICATED');await this.accountOperation(owner,async()=>{await this.rotate();});});
    const unsubscribe=this.subscribe(update);update();return unsubscribe;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(values: Partial<Snapshot>) { this.snapshot = { ...this.snapshot, ...values }; this.listeners.forEach(fn => fn()); }
  // One account operation at a time prevents double submit and a late refresh
  // resurrecting a session after logout. Tokens never enter React state.
  private async run(work: () => Promise<void>) {
    if (this.snapshot.busy) return;
    this.update({ busy: true, error: null });
    try { await work(); }
    catch (error) {
      const code = error instanceof ApiError ? error.code : undefined;
      this.update({ error: code === 'UNAUTHENTICATED' || code === 'RATE_LIMITED' || code === 'VALIDATION' ? code : 'SESSION_UNAVAILABLE' });
    } finally { this.update({ busy: false }); }
  }
  private async accept(session: Session) {
    try { await this.storage.write(session.refresh_token); }
    catch (error) {
      // If secure persistence fails, don't display a successful login.
      try { await this.api.logout(session.access_token); } catch { /* server expiry remains the fallback */ }
      throw error;
    }
    this.session = session;
    this.update({ phase: 'authenticated', user: session.user });
  }
  private async forget() {
    this.session = null;
    this.update({ phase: 'anonymous', user: null });
    await this.storage.clear();
  }
  restore = () => this.run(async () => {
    this.update({ phase: 'loading' });
    try {
      const token = await this.storage.read();
      if (!token) { this.update({ phase: 'anonymous', user: null }); return; }
      await this.accept(await this.api.refresh(token));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') { await this.forget(); return; }
      this.update({ phase: 'restore-error', user: null }); throw error;
    }
  });
  login = (input: Credentials) => this.run(async () => { await this.accept(await this.api.login(input)); });
  loginWithCode = (exchange: () => Promise<Session>) => this.run(async () => { await this.accept(await exchange()); });
  register = (input: Registration) => this.run(async () => { await this.accept(await this.api.register(input)); });
  private async rotate() {
    if (!this.session) return;
    try { await this.accept(await this.api.refresh(this.session.refresh_token)); }
    catch (error) { if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') await this.forget(); throw error; }
  }
  verify = () => {
    // iOS keyboard/autofill can foreground the app during a form interaction.
    // An anonymous foreground check must not acquire the submit lock.
    const session = this.session;
    if (!session) return Promise.resolve();
    return this.run(async () => {
      if (Date.parse(session.expires_at) <= Date.now()) await this.rotate();
      try { this.update({ user: await this.api.me(this.session!.access_token) }); }
      catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'UNAUTHENTICATED') throw error;
        await this.rotate();
        try { this.update({ user: await this.api.me(this.session!.access_token) }); }
        catch (retryError) { if (retryError instanceof ApiError && retryError.code === 'UNAUTHENTICATED') await this.forget(); throw retryError; }
      }
    });
  };
  // Profile mutations use the same lock and refresh path as login/logout.
  // The caller retains the mutation key; retry after 401 uses that exact key.
  private async accountOperation<T>(owner: string, work: (token: string) => Promise<T>): Promise<T> {
    if (this.snapshot.busy) throw new ApiError('BUSY');
    if (!this.session || this.snapshot.user?.id !== owner) throw new ApiError('UNAUTHENTICATED');
    this.update({ busy: true, error: null });
    try {
      if (Date.parse(this.session.expires_at) <= Date.now()) await this.rotate();
      let result: T;
      try { result = await work(this.session!.access_token); }
      catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'UNAUTHENTICATED') throw error;
        await this.rotate();
        try { result = await work(this.session!.access_token); }
        catch (retryError) {
          if (retryError instanceof ApiError && retryError.code === 'UNAUTHENTICATED') await this.forget();
          throw retryError;
        }
      }
      if (this.snapshot.user?.id !== owner) throw new ApiError('UNAUTHENTICATED');
      return result;
    } finally { this.update({ busy: false }); }
  }
  private async profileOperation(owner: string, work: (token: string) => Promise<Me>): Promise<Me> {
    const user = await this.accountOperation(owner, work);
    if (user.id !== owner || this.snapshot.user?.id !== owner) throw new ApiError('INVALID_RESPONSE');
    if (user.version >= this.snapshot.user.version) {
      this.session = { ...this.session!, user }; this.update({ user });
    }
    return user;
  }
  // Admin uses the same refresh family; MFA stays in memory in its own client.
  featureOperation<T>(owner: string, work: (token: string) => Promise<T>, read = false): Promise<T> {
    return read ? this.passiveRead(owner, work) : this.accountOperation(owner, work);
  }
  adminOperation<T>(owner: string, work: (token: string) => Promise<T>, read = false): Promise<T> {
    if (!this.snapshot.user?.admin_permissions?.length) return Promise.reject(new ApiError('FORBIDDEN'));
    return read ? this.passiveRead(owner, work) : this.accountOperation(owner, work);
  }
  private notificationApi(){if(!this.notifications)throw new ApiError('CONFIG');return this.notifications;}
  // Passive badge/inbox polling must not take the submit lock from an active form.
  // Refresh still uses the serialized session path; never return another account's result.
  private async passiveRead<T>(o:string,work:(token:string)=>Promise<T>):Promise<T>{
    if(!this.session || this.snapshot.user?.id!==o)throw new ApiError('UNAUTHENTICATED');
    let result;
    if(Date.parse(this.session.expires_at)<=Date.now())result=await this.accountOperation(o,work);
    else try{result=await work(this.session.access_token);}catch(e){
      if(!(e instanceof ApiError)||e.code!=='UNAUTHENTICATED')throw e;
      result=await this.accountOperation(o,work);
    }
    if(this.snapshot.user?.id!==o)throw new ApiError('UNAUTHENTICATED');
    return result;
  }
  listNotifications=(o:string,c?:string)=>this.passiveRead(o,t=>this.notificationApi().list(t,c));
  unreadConversations=(o:string,c?:string)=>this.passiveRead(o,t=>this.chatApi().list(t,c));
  readNotification=(o:string,id:string,k:string)=>this.accountOperation(o,t=>this.notificationApi().read(t,id,k));
  notificationSettings=(o:string)=>this.accountOperation(o,t=>this.notificationApi().settings(t));
  saveNotificationSettings=(o:string,b:NotificationSettings,k:string)=>this.accountOperation(o,t=>this.notificationApi().save(t,b,k));
  private teamApi(){if(!this.organizations)throw new ApiError('CONFIG');return this.organizations;}
  myMemberships=(o:string,c?:string)=>this.passiveRead(o,t=>this.teamApi().memberships(t,c));
  teamInvitations=(o:string,p:string,c?:string)=>this.accountOperation(o,t=>this.teamApi().invitations(t,p,c));
  inviteMember=(o:string,p:string,contact:string,k:string)=>this.accountOperation(o,t=>this.teamApi().invite(t,p,contact,k));
  acceptInvitation=(o:string,token:string,k:string)=>this.accountOperation(o,t=>this.teamApi().accept(t,token,k));
  changeInvitation=(o:string,id:string,a:'resend'|'revoke',v:number,r:string,k:string)=>this.accountOperation(o,t=>this.teamApi().invitationChange(t,id,a,v,r,k));
  departurePreview=(o:string,id:string,c?:string)=>this.accountOperation(o,t=>this.teamApi().preview(t,id,c));
  leaveTeam=(o:string,id:string,v:number,r:string,k:string)=>this.accountOperation(o,t=>this.teamApi().leave(t,id,v,r,k));
  removeMember=(o:string,id:string,v:number,r:string,k:string)=>this.accountOperation(o,t=>this.teamApi().remove(t,id,v,r,k));
  reauthenticate=(o:string,password:string)=>this.accountOperation(o,t=>this.teamApi().reauth(t,password));
  editMemberGrants=(o:string,id:string,v:number,p:string[],r:string,g:string,k:string)=>this.accountOperation(o,t=>this.teamApi().grants(t,id,v,p,r,g,k));
  teamContact=(o:string,p:string)=>this.accountOperation(o,t=>this.teamApi().contact(t,p));
  setTeamContact=(o:string,p:string,id:string|null,v:number,k:string)=>this.accountOperation(o,t=>this.teamApi().setContact(t,p,id,v,k));
  requestChallenge=(o:string,contact:string)=>this.accountOperation(o,t=>this.teamApi().challenge(t,contact));
  verifyChallenge=(o:string,id:string,code:string)=>this.accountOperation(o,t=>this.teamApi().verify(t,id,code));
  private verificationApi(){if(!this.verification)throw new ApiError('CONFIG');return this.verification;}
  listVerifications=(o:string,id:string,c?:string)=>this.accountOperation(o,t=>this.verificationApi().list(t,id,c));
  submitVerification=(o:string,id:string,b:VerificationInput,k:string)=>this.accountOperation(o,t=>this.verificationApi().submit(t,id,b,k));
  gallery=(o:string,id:string)=>this.passiveRead(o,t=>createGalleryApi(process.env.EXPO_PUBLIC_API_URL).list(id,t));
  saveGallery=(o:string,id:string,v:number,ids:string[],k:string)=>this.accountOperation(o,t=>createGalleryApi(process.env.EXPO_PUBLIC_API_URL).save(t,id,v,ids,k));
  uploadGallery=(o:string,b:Blob,k:string)=>this.accountOperation(o,t=>createGalleryApi(process.env.EXPO_PUBLIC_API_URL).upload(t,b,k));
  galleryAsset=(o:string,id:string)=>this.passiveRead(o,t=>createGalleryApi(process.env.EXPO_PUBLIC_API_URL).asset(id,t));
  uploadVerification=(o:string,b:Blob,k:string)=>this.accountOperation(o,t=>this.verificationApi().upload(t,b,k));
  verificationAsset=(o:string,id:string)=>this.passiveRead(o,t=>this.verificationApi().asset(t,id));
  private supportApi(){if(!this.support)throw new ApiError('CONFIG');return this.support;}
  listReports=(o:string,c?:string)=>this.accountOperation(o,t=>this.supportApi().list(t,c));
  getReport=(o:string,id:string)=>this.accountOperation(o,t=>this.supportApi().get(t,id));
  createReport=(o:string,b:ReportInput,k:string)=>this.accountOperation(o,t=>this.supportApi().create(t,b,k));
  replyReport=(o:string,id:string,body:string,ids:string[],k:string)=>this.accountOperation(o,t=>this.supportApi().reply(t,id,body,ids,k));
  uploadEvidence=(o:string,blob:Blob,k:string)=>this.accountOperation(o,t=>this.supportApi().upload(t,blob,k));
  evidenceAsset=(o:string,id:string)=>this.passiveRead(o,t=>this.supportApi().asset(t,id));
  private reviewsApi(){if(!this.reviews)throw new ApiError('CONFIG');return this.reviews;}
  replyReview=(o:string,id:string,v:number,body:string,k:string)=>this.accountOperation(o,t=>this.reviewsApi().reply(t,id,v,body,k));
  uploadReview=(o:string,blob:Blob,k:string)=>this.accountOperation(o,t=>this.reviewsApi().upload(t,blob,k));
  customerReviews=(o:string,j:string,c?:string)=>this.accountOperation(o,t=>this.reviewsApi().customerHistory(t,j,c));
  registerPushDevice=(o:string,device:{token:string;platform:string},key:string)=>this.accountOperation(o,t=>this.notificationApi().registerDevice(t,device,key));
  jobReviews=(o:string,j:string,c?:string)=>this.accountOperation(o,t=>this.reviewsApi().list(t,j,c));
  createReview=(o:string,j:string,b:ReviewInput,k:string)=>this.accountOperation(o,t=>this.reviewsApi().create(t,j,b,k));
  editReview=(o:string,id:string,b:ReviewInput,k:string)=>this.accountOperation(o,t=>this.reviewsApi().edit(t,id,b,k));
  reviewVisibility=(o:string,id:string,v:number,removed:boolean,k:string)=>this.accountOperation(o,t=>this.reviewsApi().visibility(t,id,v,removed,k));
  private invoicesApi(){if(!this.invoices)throw new ApiError('CONFIG');return this.invoices;}
  getInvoice=(owner:string,job:string)=>this.accountOperation(owner,t=>this.invoicesApi().get(t,job));
  saveInvoice=(owner:string,job:string,input:InvoiceDraft,key:string)=>this.accountOperation(owner,t=>this.invoicesApi().save(t,job,input,key));
  changeInvoice=(owner:string,id:string,action:InvoiceAction,input:InvoiceChange,key:string)=>this.accountOperation(owner,t=>this.invoicesApi().change(t,id,action,input,key));
  getPoints=(owner:string)=>this.accountOperation(owner,t=>this.invoicesApi().points(t));
  getLedger=(owner:string,partner?:string,cursor?:string)=>this.accountOperation(owner,t=>this.invoicesApi().ledger(t,partner,cursor));
  getWallet=(owner:string,partner:string)=>this.accountOperation(owner,t=>this.invoicesApi().wallet(t,partner));
  uploadResult=(owner:string,blob:Blob,key:string)=>this.accountOperation(owner,t=>this.invoicesApi().upload(t,blob,key));
  getAsset=(owner:string,id:string)=>this.accountOperation(owner,t=>this.invoicesApi().asset(t,id));
  private jobsApi(){if(!this.jobs)throw new ApiError('CONFIG');return this.jobs;}
  private chatApi(){if(!this.chat)throw new ApiError('CONFIG');return this.chat;}
  createJob=(owner:string,input:JobCreate,key:string)=>this.accountOperation(owner,t=>this.jobsApi().create(t,input,key));
  getJob=(owner:string,id:string)=>this.accountOperation(owner,t=>this.jobsApi().get(t,id));
  listJobs=(owner:string,partner?:string,cursor?:string)=>this.accountOperation(owner,t=>this.jobsApi().list(t,partner,cursor));
  changeJob=(owner:string,id:string,action:JobAction,input:JobChange,key:string)=>this.accountOperation(owner,t=>this.jobsApi().change(t,id,action,input,key));
  jobMembers=(owner:string,partner:string,cursor?:string)=>this.accountOperation(owner,t=>this.jobsApi().members(t,partner,cursor));
  openConversation=(owner:string,input:{partner_id?:string;peer_user_id?:string},key:string)=>this.accountOperation(owner,t=>this.chatApi().open(t,input,key));
  listConversations=(owner:string,cursor?:string)=>this.accountOperation(owner,t=>this.chatApi().list(t,cursor));
  listMessages=(owner:string,id:string,after?:number,cursor?:string)=>this.accountOperation(owner,t=>this.chatApi().messages(t,id,after,cursor));
  sendMessage=(owner:string,id:string,input:MessageInput,key:string)=>this.accountOperation(owner,t=>this.chatApi().send(t,id,input,key));
  readConversation=(owner:string,id:string,last:number,key:string)=>this.accountOperation(owner,t=>this.chatApi().read(t,id,last,key));
  private partnerApi() { if (!this.partners) throw new ApiError('CONFIG'); return this.partners; }
  createPartner = (owner:string,input:PartnerCreate,key:string) => this.accountOperation(owner,token=>this.partnerApi().create(token,input,key));
  loadPartner = (owner:string,id:string) => this.accountOperation(owner,token=>this.partnerApi().management(token,id));
  editPartner = (owner:string,id:string,input:PartnerEdit,key:string) => this.accountOperation(owner,token=>this.partnerApi().edit(token,id,input,key));
  partnerProfile = (owner:string,id:string,locale:Locale,signal?:AbortSignal) => this.accountOperation(owner,token=>this.partnerApi().profile(id,locale,signal,token));
  private accountApi() { if (!this.accounts) throw new ApiError('CONFIG'); return this.accounts; }
  listAddresses = (owner: string, cursor?: string) => this.accountOperation(owner, token => this.accountApi().addresses(token,cursor));
  saveAddress = (owner: string, id: string | null, input: AddressInput, key: string) => this.accountOperation(owner, token => this.accountApi().saveAddress(token,id,input,key));
  archiveAddress = (owner: string, id: string, key: string) => this.accountOperation(owner, token => this.accountApi().archiveAddress(token,id,key));
  listSessions = (owner: string, cursor?: string) => this.accountOperation(owner, token => this.accountApi().sessions(token,cursor));
  revokeSession = async (owner: string, id: string, isCurrent: boolean, key: string) => {
    const result = await this.accountOperation(owner, token => this.accountApi().revokeSession(token,id,key));
    if (isCurrent) await this.forget();
    return result;
  };
  loadProfile = (owner: string) => this.profileOperation(owner, token => this.api.me(token));
  editProfile = (owner: string, input: ProfileEdit, key: string) => this.profileOperation(owner, token => {
    if (!this.accounts) throw new ApiError('CONFIG');
    return this.accounts.edit(token, input, key);
  });
  logout = () => this.run(async () => {
    if (!this.session) return;
    try {
      if (Date.parse(this.session.expires_at) <= Date.now()) await this.rotate();
      await this.api.logout(this.session!.access_token);
    } catch (error) {
      // Already revoked/expired means no authenticated server session remains.
      // A network failure keeps the session and offers retry; don't claim
      // server-side logout while offline.
      if (!(error instanceof ApiError) || error.code !== 'UNAUTHENTICATED') throw error;
    }
    await this.forget();
  });
}
