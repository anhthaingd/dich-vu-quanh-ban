/* global module */
module.exports = ({config}) => {
  const projectId=process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if(!projectId)return config;
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId))throw Error('EXPO_PUBLIC_EAS_PROJECT_ID must be the Expo project UUID');
  return {...config,extra:{...config.extra,eas:{...config.extra?.eas,projectId}}};
};
