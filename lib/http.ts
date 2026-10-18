/** Bound actual bytes, including chunked requests with no Content-Length. */
export async function readBoundedText(request: Request, maxBytes: number) {
 const declared=Number(request.headers.get('content-length'));if(Number.isFinite(declared)&&declared>maxBytes)throw new Error('Request too large');
 if(!request.body)return '';const reader=request.body.getReader(),decoder=new TextDecoder();let size=0,text='';
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new Error('Request too large');}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}

/** Application API responses must be JSON objects, including on HTTP errors. */
export async function readApiJson<T extends object = { error?: string }>(response: Response): Promise<T & { error?: string }> {
 const value: unknown = await response.json();
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Sunucu yanıtı okunamadı.');
 if ('error' in value && value.error !== undefined && typeof value.error !== 'string') throw new Error('Sunucu yanıtı okunamadı.');
 return value as T & { error?: string };
}
