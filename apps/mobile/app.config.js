/* global module */
module.exports = ({config}) => {
  const projectId=process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const googleServicesFile=process.env.GOOGLE_SERVICES_JSON;
  if(projectId&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId))throw Error('EXPO_PUBLIC_EAS_PROJECT_ID must be the Expo project UUID');
  if(!projectId&&!googleServicesFile)return config;
  return {...config,
    ...(googleServicesFile?{android:{...config.android,googleServicesFile}}:{}),
    ...(projectId?{extra:{...config.extra,eas:{...config.extra?.eas,projectId}}}:{})};
};
