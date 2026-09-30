/* global http, TEST_CONTROL_URL, MODE */
const response = http.post(TEST_CONTROL_URL + '/' + MODE, { body: '' });
if (!response.ok) throw new Error('Failed to set native test API mode: ' + response.status);
