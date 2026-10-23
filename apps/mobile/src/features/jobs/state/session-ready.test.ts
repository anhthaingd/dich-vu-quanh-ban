import {authFixture,credentials,session} from '../../../../test/helpers/auth';
import {sessionOperation} from './session-ready';
test('queued work cancels on blur and rechecks account identity before reaching the API',async()=>{
 const f=authFixture();await f.manager.login(credentials);
 let finish!:(v:typeof session.user)=>void;f.api.me.mockImplementationOnce(()=>new Promise(r=>{finish=r;}));
 const read=f.manager.verify(),work=jest.fn().mockResolvedValue('sent');let active=true;
 const queued=sessionOperation(f.manager,session.user.id,work,()=>active);const assertion=expect(queued).rejects.toMatchObject({code:'CANCELLED'});
 active=false;finish(session.user);await read;await assertion;expect(work).not.toHaveBeenCalled();
 f.api.me.mockImplementationOnce(()=>new Promise(r=>{finish=r;}));const nextRead=f.manager.verify();
 const next=sessionOperation(f.manager,session.user.id,work),changed=expect(next).rejects.toMatchObject({code:'UNAUTHENTICATED'});
 finish({...session.user,id:'00000000-0000-4000-8000-000000000002'});await nextRead;await changed;expect(work).not.toHaveBeenCalled();
});
