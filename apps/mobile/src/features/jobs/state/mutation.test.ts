import { Mutation } from './mutation';
import { ApiError } from '../../../lib/http/api-error';
import { appointment } from './appointment';
test('uncertain retry preserves original request and key; known conflict permits a new draft', async () => {
    const mutation = new Mutation<number>(), first = jest.fn().mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValueOnce(7), replacement = jest.fn().mockResolvedValue(8);
    expect(await mutation.run(first)).toBeNull();
    expect(mutation.getSnapshot().pending).toBe(true);
    expect(await mutation.run(replacement)).toBe(7);
    expect(replacement).not.toHaveBeenCalled();
    expect(first.mock.calls[0][0]).toBe(first.mock.calls[1][0]);
    await mutation.run(async () => { throw new ApiError('VERSION_CONFLICT'); });
    expect(mutation.getSnapshot().pending).toBe(false);
    expect(await mutation.run(replacement)).toBe(8);
});
test('Vietnam appointment validates calendar instead of rolling dates', () => {
    expect(appointment('2030-12-10', '10:30')).toBe('2030-12-10T03:30:00.000Z');
    expect(appointment('2030-02-30', '10:30')).toBeNull();
    expect(appointment('2030-12-10', '25:30')).toBeNull();
});
