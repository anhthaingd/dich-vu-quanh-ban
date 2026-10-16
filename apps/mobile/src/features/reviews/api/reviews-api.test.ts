import {createReviewsApi,isReview} from './reviews-api';
const review={id:'r',job_id:'j',author_id:'a',direction:'customer_to_partner',stars:5,body:'DEMO',hidden:false,removed:false,version:1};
test('review API validates data and preserves mutation keys, versions and private/public routes',async()=>{
 const transport=jest.fn().mockImplementation(async()=>new Response(JSON.stringify(review))),api=createReviewsApi('http://local/v1',transport);
 expect(isReview({...review,stars:0})).toBe(false);expect(isReview({...review,version:0})).toBe(false);
 expect(isReview({...review,hidden:'false'})).toBe(false);expect(isReview({...review,direction:'admin'})).toBe(false);
 await api.create('token','j',{stars:5,body:'DEMO'},'same-key');expect(transport.mock.calls.at(-1)?.[1]).toMatchObject({method:'POST',headers:expect.objectContaining({'Idempotency-Key':'same-key',Authorization:'Bearer token'})});
 await api.edit('token','r',{stars:4,body:'edit',expected_version:1},'edit-key');expect(JSON.parse(transport.mock.calls.at(-1)?.[1].body)).toMatchObject({expected_version:1});
 await api.visibility('token','r',2,true,'visibility-key');expect(JSON.parse(transport.mock.calls.at(-1)?.[1].body)).toEqual({expected_version:2,removed:true});
 transport.mockImplementation(async()=>new Response(JSON.stringify({items:[review],next_cursor:null})));await api.list('token','j','cursor');expect(transport.mock.calls.at(-1)?.[0]).toBe('http://local/v1/jobs/j/reviews?cursor=cursor');
 await api.publicList('p');expect(transport.mock.calls.at(-1)?.[1].headers.Authorization).toBeUndefined();
 transport.mockResolvedValue(new Response(JSON.stringify({items:[{...review,stars:6}],next_cursor:null})));await expect(api.publicList('p')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 await expect(createReviewsApi(undefined).publicList('p')).rejects.toMatchObject({code:'CONFIG'});
});
