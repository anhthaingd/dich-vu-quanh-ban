import { execFileSync } from 'node:child_process';
const run=(command,args,options={})=>execFileSync(command,args,{encoding:'utf8',...options});
const config=JSON.parse(run('terraform',['-chdir=infra/aws','output','-json','deployment']));
const aws=(args)=>JSON.parse(run('aws',[...args,'--region',config.region,'--output','json','--no-cli-pager']));
if(aws(['sts','get-caller-identity']).Account!==config.account_id)throw Error('AWS account does not match Terraform');
const [action,command,email]=process.argv.slice(2);
if(action==='ops'){
  if(!['bootstrap','migrate','bootstrap-admin'].includes(command))throw Error('Expected ops bootstrap|migrate|bootstrap-admin');
  const overrides={containerOverrides:[{name:'ops',command:['node','scripts/aws/database.mjs',command,...(email?[email]:[])]}]};
  const network={awsvpcConfiguration:{subnets:config.subnets,securityGroups:[config.security_group],assignPublicIp:'ENABLED'}};
  const result=aws(['ecs','run-task','--cluster',config.cluster,'--task-definition',config.ops_task,'--launch-type','FARGATE','--network-configuration',JSON.stringify(network),'--overrides',JSON.stringify(overrides)]);
  if(result.failures?.length||result.tasks?.length!==1)throw Error('ECS rejected ops task');
  const task=result.tasks[0].taskArn;
  console.log(`Started ${task}; waiting for the recorded exit code.`);
  run('aws',['ecs','wait','tasks-stopped','--cluster',config.cluster,'--tasks',task,'--region',config.region],{stdio:'inherit'});
  const stopped=aws(['ecs','describe-tasks','--cluster',config.cluster,'--tasks',task]);
  if(stopped.tasks?.[0]?.containers?.find(c=>c.name==='ops')?.exitCode!==0)throw Error(`Ops failed; inspect ${config.log_group} ops stream. Do not enable the service.`);
  console.log('Ops completed successfully.');
}else if(action==='publish-web'){
  // Backend must already be ready. Build with the cloud origin; never ship localhost.
  const response=await fetch(`${config.api_origin}/v1/ready`,{signal:globalThis.AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('API not ready');
  const env={...process.env,EXPO_PUBLIC_API_URL:`${config.api_origin}/v1`,EXPO_PUBLIC_REALTIME_ENABLED:'0',EXPO_PUBLIC_PUSH_ENABLED:'0',VITE_API_URL:`${config.api_origin}/v1`,EXPO_NO_TELEMETRY:'1'};
  run('npx',['expo','export','--platform','web'],{cwd:'apps/mobile',env,stdio:'inherit'});
  run('npm',['run','build','--workspace','apps/admin'],{env,stdio:'inherit'});
  for(const [key,dir] of [['web','apps/mobile/dist'],['admin','apps/admin/dist']]){
    const target=config.web[key];
    // Upload dependencies first, entry point last; retain older hashed files for old clients.
    run('aws',['s3','sync',dir,`s3://${target.bucket}`,'--exclude','index.html','--cache-control','public,max-age=3600','--region',config.region],{stdio:'inherit'});
    run('aws',['s3','cp',`${dir}/index.html`,`s3://${target.bucket}/index.html`,'--cache-control','no-cache,no-store,must-revalidate','--content-type','text/html','--region',config.region],{stdio:'inherit'});
    aws(['cloudfront','create-invalidation','--distribution-id',target.distribution_id,'--paths','/*']);
    console.log(target.url);
  }
}else if(action==='smoke'){
  for(const url of [`${config.api_origin}/v1/health`,`${config.api_origin}/v1/ready`,`${config.api_origin}/v1/categories`,config.web.web.url,config.web.admin.url]){
    const response=await fetch(url,{signal:globalThis.AbortSignal.timeout(15000)});
    if(!response.ok)throw Error(`HTTP ${response.status}: ${url}`);
    console.log(`OK ${url}`);
  }
}else throw Error('Expected ops, publish-web or smoke');
