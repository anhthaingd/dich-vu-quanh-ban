// CloudFront viewer-request runtime. No secrets or personal data are logged.
function handler(event) {
  var request = event.request;
  // Replace every client-supplied value; CloudFront/ALB append trusted hops later.
  request.headers['x-forwarded-for'] = { value: event.viewer.ip };
  delete request.headers.forwarded;
  delete request.headers['x-forwarded-host'];
  delete request.headers['x-dvqb-origin'];
  return request;
}
