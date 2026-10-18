import {recordEvent} from './lib/observability';
export async function onRequestError(error:unknown,request:{path:string},context:{routePath:string}){const digest=error&&typeof error==='object'&&'digest' in error?String(error.digest):undefined;await recordEvent('server_error',context.routePath||request.path,digest);}
