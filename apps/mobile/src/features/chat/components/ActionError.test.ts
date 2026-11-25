import {ApiError} from '../../../lib/http/api-error';
import {captureError,withDetail} from './ActionError';
test('captureError keeps the exact reason beside the Mutation code and clears it on success',async()=>{
 const set=jest.fn();
 await expect(captureError(async()=>{throw new ApiError('NOT_FOUND',404,undefined,undefined,undefined,'CHAT_CONVERSATION_NOT_FOUND');},set)('k')).rejects.toBeInstanceOf(ApiError);
 expect(set).toHaveBeenLastCalledWith({code:'NOT_FOUND',reason:'CHAT_CONVERSATION_NOT_FOUND'});
 await expect(captureError(async k=>k,set)('k')).resolves.toBe('k');expect(set).toHaveBeenLastCalledWith(null);
 expect(withDetail(null,{code:'NOT_FOUND'})).toBeNull();
 expect(withDetail('NOT_FOUND',{code:'NOT_FOUND',reason:'X'})).toEqual({code:'NOT_FOUND',reason:'X'});
 expect(withDetail('NETWORK',{code:'NOT_FOUND',reason:'X'})).toBe('NETWORK');
});
