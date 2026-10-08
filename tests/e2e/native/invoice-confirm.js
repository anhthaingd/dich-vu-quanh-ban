/* global http, TEST_CONTROL_URL */
var result = http.post(TEST_CONTROL_URL + '/invoice-confirm', {body: '{}'});
if (result.status !== 200) throw new Error('Invoice test control failed: ' + result.status);
