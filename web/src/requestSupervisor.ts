export type DaiSupervisorChannel =
  | 'chat-connect'
  | 'tts'
  | 'transcription'
  | 'live-token'
  | 'research';

export type DaiSupervisorContext = {
  attempt:number;
  maxAttempts:number;
  channel:DaiSupervisorChannel;
};

export type DaiSupervisorFailure = {
  code:string;
  status:number;
  retryable:boolean;
  aborted:boolean;
};

export type DaiSupervisorHealth = {
  channel:DaiSupervisorChannel;
  attempts:number;
  retries:number;
  successes:number;
  failures:number;
  consecutiveFailures:number;
  lastErrorCode:string;
  lastFailureAt:number;
  lastSuccessAt:number;
  circuitUntil:number;
};

type RunOptions = {
  maxAttempts?:number;
  baseDelayMs?:number;
  maxDelayMs?:number;
  breakerThreshold?:number;
  breakerCooldownMs?:number;
  onRetry?:(failure:DaiSupervisorFailure,context:DaiSupervisorContext)=>void;
  shouldRetry?:(failure:DaiSupervisorFailure,context:DaiSupervisorContext)=>boolean;
};

type ErrorOptions = {
  status?:number;
  retryable?:boolean;
  cause?:unknown;
};

export class DaiSupervisorError extends Error {
  code:string;
  status:number;
  retryable:boolean;
  constructor(code:string,message=code,options:ErrorOptions={}){
    super(message,{cause:options.cause});
    this.name='DaiSupervisorError';
    this.code=code;
    this.status=Number(options.status)||0;
    this.retryable=options.retryable!==false;
  }
}

const DEFAULTS:Record<DaiSupervisorChannel,Required<Pick<RunOptions,
  'maxAttempts'|'baseDelayMs'|'maxDelayMs'|'breakerThreshold'|'breakerCooldownMs'
>>>={
  'chat-connect':{maxAttempts:3,baseDelayMs:260,maxDelayMs:1200,breakerThreshold:5,breakerCooldownMs:9000},
  tts:{maxAttempts:3,baseDelayMs:220,maxDelayMs:900,breakerThreshold:5,breakerCooldownMs:8000},
  transcription:{maxAttempts:3,baseDelayMs:300,maxDelayMs:1200,breakerThreshold:4,breakerCooldownMs:9000},
  'live-token':{maxAttempts:3,baseDelayMs:300,maxDelayMs:1200,breakerThreshold:4,breakerCooldownMs:9000},
  research:{maxAttempts:2,baseDelayMs:350,maxDelayMs:1000,breakerThreshold:4,breakerCooldownMs:10000}
};

const health=new Map<DaiSupervisorChannel,DaiSupervisorHealth>();

function initialHealth(channel:DaiSupervisorChannel):DaiSupervisorHealth{
  return {
    channel,
    attempts:0,
    retries:0,
    successes:0,
    failures:0,
    consecutiveFailures:0,
    lastErrorCode:'',
    lastFailureAt:0,
    lastSuccessAt:0,
    circuitUntil:0
  };
}

function state(channel:DaiSupervisorChannel){
  let value=health.get(channel);
  if(!value){
    value=initialHealth(channel);
    health.set(channel,value);
  }
  return value;
}

function numberStatus(error:any){
  const direct=Number(error?.status||error?.statusCode||error?.context?.status||0);
  return Number.isFinite(direct)?direct:0;
}

export function classifySupervisorError(error:unknown):DaiSupervisorFailure{
  const value:any=error;
  const status=numberStatus(value);
  const rawCode=String(value?.code||value?.name||value?.message||'DAI_REQUEST_FAILED');
  const normalized=rawCode.toUpperCase().replace(/[^A-Z0-9_-]+/g,'_').slice(0,80)||'DAI_REQUEST_FAILED';
  const aborted=value?.name==='AbortError'||/CANCELLED|CANCELED|USER_ABORT/i.test(rawCode);

  if(value instanceof DaiSupervisorError){
    return {
      code:value.code,
      status:value.status,
      retryable:value.retryable&&!aborted,
      aborted
    };
  }

  if(aborted)return {code:'ABORTED',status,retryable:false,aborted:true};

  if(status){
    const retryable=status===401||status===408||status===425||status===429||status>=500;
    return {code:'HTTP_'+status,status,retryable,aborted:false};
  }

  const nonRetryable=/INVALID|VALIDATION|TOO_LARGE|PERMISSION|FORBIDDEN|NOT_ALLOWED|EMPTY_RECORDING/i.test(rawCode);
  const retryable=
    !nonRetryable&&(
      value instanceof TypeError||
      /TIMEOUT|TIMED_OUT|NETWORK|FETCH|CONNECTION|SOCKET|TEMPORAR|UNAVAILABLE|FAILED|FUNCTIONSHTTPERROR|EMPTY_TRANSCRIPT/i.test(rawCode)
    );

  return {
    code:normalized,
    status:0,
    retryable,
    aborted:false
  };
}

export function supervisorHttpError(status:number,code='HTTP_ERROR',message=code){
  const retryable=status===401||status===408||status===425||status===429||status>=500;
  return new DaiSupervisorError(code,message,{status,retryable});
}

function sleep(ms:number){
  if(ms<=0)return Promise.resolve();
  return new Promise<void>(resolve=>setTimeout(resolve,ms));
}

export async function runSupervised<T>(
  channel:DaiSupervisorChannel,
  operation:(context:DaiSupervisorContext)=>Promise<T>,
  options:RunOptions={}
):Promise<T>{
  const defaults=DEFAULTS[channel];
  const maxAttempts=Math.max(1,Math.round(options.maxAttempts??defaults.maxAttempts));
  const baseDelayMs=Math.max(0,options.baseDelayMs??defaults.baseDelayMs);
  const maxDelayMs=Math.max(baseDelayMs,options.maxDelayMs??defaults.maxDelayMs);
  const breakerThreshold=Math.max(2,options.breakerThreshold??defaults.breakerThreshold);
  const breakerCooldownMs=Math.max(1000,options.breakerCooldownMs??defaults.breakerCooldownMs);
  const h=state(channel);
  const now=Date.now();

  if(h.circuitUntil>now){
    throw new DaiSupervisorError(
      'CIRCUIT_OPEN',
      'DAI service is cooling down after repeated failures.',
      {retryable:false}
    );
  }

  let lastError:unknown;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    const context={attempt,maxAttempts,channel} as DaiSupervisorContext;
    h.attempts++;

    try{
      const result=await operation(context);
      h.successes++;
      h.consecutiveFailures=0;
      h.lastSuccessAt=Date.now();
      h.circuitUntil=0;
      return result;
    }catch(error){
      lastError=error;
      const failure=classifySupervisorError(error);
      h.failures++;
      h.consecutiveFailures++;
      h.lastFailureAt=Date.now();
      h.lastErrorCode=failure.code;

      const allowed=options.shouldRetry
        ? options.shouldRetry(failure,context)
        : failure.retryable;
      const canRetry=allowed&&!failure.aborted&&attempt<maxAttempts;

      if(!canRetry){
        if(h.consecutiveFailures>=breakerThreshold){
          h.circuitUntil=Date.now()+breakerCooldownMs;
        }
        throw error;
      }

      h.retries++;
      options.onRetry?.(failure,context);
      const delay=Math.min(maxDelayMs,baseDelayMs*Math.pow(2,attempt-1));
      await sleep(delay);
    }
  }

  throw lastError instanceof Error?lastError:new Error('DAI_REQUEST_FAILED');
}

export function getSupervisorHealth():DaiSupervisorHealth[]{
  return (Object.keys(DEFAULTS) as DaiSupervisorChannel[])
    .map(channel=>({...state(channel)}));
}

export function resetSupervisorHealth(channel?:DaiSupervisorChannel){
  if(channel){
    health.set(channel,initialHealth(channel));
    return;
  }
  health.clear();
}
