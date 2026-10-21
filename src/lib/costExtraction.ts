import {supabase} from '@/integrations/supabase/client';
import type {CostLine} from './costs';
export type CostSuggestion={supplier_name:string|null;supplier_nif:string|null;invoice_number:string|null;invoice_date:string|null;due_date:string|null;atcud:string|null;total_net:number|null;total_vat:number|null;total_gross:number|null;lines:CostLine[]};
export async function extractCost(invoiceId:string,images:string[]):Promise<CostSuggestion>{
 const {data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session)throw new Error('Sessão expirada');
 const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-cost-invoice`,{method:'POST',headers:{Authorization:`Bearer ${data.session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({invoiceId,images})});
 if(!response.ok){const body=await response.json().catch(()=>({error:'Leitura indisponível'}));throw new Error(body.error??body.message??'Leitura indisponível');}
 const reader=response.body?.getReader();if(!reader)throw new Error('Resposta vazia');const decoder=new TextDecoder();let buffer='';let result:CostSuggestion|undefined;
 while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const rows=buffer.split('\n');buffer=rows.pop()??'';for(const row of rows){if(!row.trim())continue;const msg=JSON.parse(row);if(msg.error)throw new Error(msg.error);if(msg.result)result=msg.result;}}
 if(!result)throw new Error('Não foi possível extrair os dados');return result;
}