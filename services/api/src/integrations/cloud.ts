import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import type { LocalMessage } from './local-messages.js';

export interface AssetStore {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

// Credentials come from the ECS task role. Never accept a public object ACL.
export class S3Assets implements AssetStore {
  constructor(private readonly bucket: string, private readonly client = new S3Client({ maxAttempts: 3 })) {}
  private key(key: string) {
    if (!/^[a-f0-9-]{36}\.(raw|png)$/.test(key)) throw new Error('Invalid asset key');
    return `assets/${key}`;
  }
  async put(key: string, data: Buffer) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: this.key(key), Body: data,
      ServerSideEncryption: 'AES256', ContentType: 'application/octet-stream' }), { abortSignal: AbortSignal.timeout(15000) });
  }
  async get(key: string) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.key(key) }), { abortSignal: AbortSignal.timeout(15000) });
    if (!result.Body) throw new Error('Asset missing');
    return Buffer.from(await result.Body.transformToByteArray());
  }
}

export function sesTransport(from: string, client = new SESv2Client({ maxAttempts: 1 })) {
  return async (_id: string, message: LocalMessage) => {
    if (message.contact.startsWith('+')) throw new Error('SMS provider not enabled');
    // Durable outbox owns retries. SES can accept an email before a timeout;
    // delivery is at-least-once, while the verification code stays single-use.
    await client.send(new SendEmailCommand({ FromEmailAddress: from,
      Destination: { ToAddresses: [message.contact] }, Content: { Simple: {
        Subject: { Data: message.subject.replace(' — DEMO', ''), Charset: 'UTF-8' },
        Body: { Text: { Data: message.text.replace('Chỉ dùng trong DEMO local/test.', '').replace('DEMO local/test.', ''), Charset: 'UTF-8' } },
      } } }), { abortSignal: AbortSignal.timeout(5000) });
  };
}

export function cloudTransport(from:string, phones:string[], smsEnabled:boolean, email=sesTransport(from), sns=new SNSClient({maxAttempts:1})) {
  return async(id:string,message:LocalMessage)=>{
    if(!message.contact.startsWith('+'))return email(id,message);
    if(!smsEnabled||!phones.includes(message.contact))throw new Error('SMS recipient not enabled');
    const code=message.text.match(/\b[0-9]{6}\b/)?.[0];
    // Short ASCII OTP avoids multiple Unicode SMS segments. Invitations retain their token.
    const text=code?`DVQB: Ma xac minh ${code}. Hieu luc 5 phut. Khong chia se ma nay.`:message.text.replace('Chỉ dùng trong DEMO local/test.','');
    await sns.send(new PublishCommand({PhoneNumber:message.contact,Message:text,
      MessageAttributes:{'AWS.SNS.SMS.SMSType':{DataType:'String',StringValue:'Transactional'}}}),{abortSignal:AbortSignal.timeout(5000)});
  };
}

// The durable delivery ID makes retries after an ambiguous timeout idempotent.
export function resendTransport(from:string, apiKey:string, transport:typeof fetch=fetch) {
  return async(id:string,message:LocalMessage)=>{
    if(message.contact.startsWith('+'))throw new Error('Email transport cannot send SMS');
    const response=await transport('https://api.resend.com/emails',{
      method:'POST',signal:AbortSignal.timeout(5000),
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`dvqb-email/${id}`},
      body:JSON.stringify({from,to:[message.contact],subject:message.subject.replace(' — DEMO',''),
        text:message.text.replace('Chỉ dùng trong DEMO local/test.','').replace('DEMO local/test.','')})
    });
    // Provider response bodies may contain private recipient details: never log them.
    if(!response.ok)throw new Error('Email provider rejected delivery');
    const result:unknown=await response.json();
    if(!result||typeof result!=='object'||!('id' in result)||typeof result.id!=='string'||!result.id)throw new Error('Email provider did not acknowledge delivery');
  };
}
