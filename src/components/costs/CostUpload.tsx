import {useRef,useState} from 'react';
import {Upload,Camera,Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {supabase} from '@/integrations/supabase/client';
import {safeCostName,type CostInvoice} from '@/lib/costs';
import {costDocumentImages} from '@/lib/costFileReader';
import {saveCost,useRefreshCosts} from '@/hooks/useCosts';
import {toast} from 'sonner';
import {useNavigate} from 'react-router-dom';
import {extractCost} from '@/lib/costExtraction';
export function CostUpload(){
 const files=useRef<HTMLInputElement>(null);const camera=useRef<HTMLInputElement>(null);const [busy,setBusy]=useState(false);const [progress,setProgress]=useState('');const refresh=useRefreshCosts();const navigate=useNavigate();
 async function upload(list:FileList|null){if(!list?.length)return;setBusy(true);let count=0;let failed=0;let lastId='';
  for(const file of Array.from(list)){setProgress(file.name);try{
   if(!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>10*1024*1024||file.size===0)throw new Error('Apenas PDF, JPG ou PNG até 10 MB');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const existing=await supabase.from('cost_invoices').select('id').eq('file_hash',hash).maybeSingle();if(existing.error)throw existing.error;if(existing.data){toast.warning(`${file.name}: ficheiro já carregado`);continue;}
   const now=new Date();const id=crypto.randomUUID();const path=`${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${id}-${safeCostName(file.name)}`;
   const stored=await supabase.storage.from('cost-invoices').upload(path,file,{contentType:file.type,upsert:false});if(stored.error)throw stored.error;
   const created=await supabase.from('cost_invoices').insert({id,file_name:file.name,file_path:path,file_hash:hash,file_type:file.type,status:'to_classify'}).select('*,cost_invoice_lines(*)').single();if(created.error)throw created.error;
   count++;lastId=id;await refresh();
   try{setProgress(`A ler ${file.name}…`);const read=await costDocumentImages(file);let suggestion;
    try {const ai=await extractCost(id,read.images);suggestion=read.qr?{...ai,...read.qr,supplier_name:ai.supplier_name,due_date:ai.due_date,lines:ai.lines.length?ai.lines:read.qr.lines}:ai;} catch(e){if(!read.qr)throw e;suggestion=read.qr;toast.warning('QR lido; não foi possível completar os restantes campos automaticamente.');}
    const latest=await supabase.from('cost_invoices').select('*,cost_invoice_lines(*)').eq('id',id).single();if(latest.error)throw latest.error;
    if(latest.data.updated_at!==created.data.updated_at){toast.info('Leitura concluída; os dados editados manualmente foram preservados.');continue;}
    const {lines,...header}=suggestion;
    const suppliers=await supabase.from('suppliers').select('*').eq('nif',suggestion.supplier_nif??'');if(suppliers.error)throw suppliers.error;const supplier=suppliers.data.length===1?suppliers.data[0]:null;
    const duplicates=await supabase.from('cost_invoices').select('id').eq('supplier_nif',suggestion.supplier_nif??'').eq('invoice_number',suggestion.invoice_number??'').neq('id',id);if(duplicates.data?.length)toast.warning('Possível duplicado: confirme o número da fatura.');
    await saveCost(latest.data as CostInvoice,{...header,supplier_id:supplier?.id??null,supplier_name:supplier?.name??header.supplier_name??null},lines.map(l=>({...l,category_code:supplier?.default_category_code??null,location_id:supplier?.default_location_id??null})),'to_classify');
    const source=read.qr?'qr':'ai';const marked=await supabase.from('cost_invoices').update({extraction_source:source,extraction_confidence:{supplier_nif:source==='qr'?'high':'low',invoice_number:source==='qr'?'high':'low',total_gross:source==='qr'?'high':'low'}}).eq('id',id);if(marked.error)throw marked.error;
    const event=await supabase.from('cost_invoice_events').insert({invoice_id:id,action:'extracted',details:{source}});if(event.error)throw event.error;await refresh();
   }catch(e){toast.warning(`${file.name}: ${e instanceof Error?e.message:'não foi possível ler automaticamente'}. O rascunho foi guardado.`);}
  }catch(e){failed++;toast.error(`${file.name}: ${e instanceof Error?e.message:'erro no carregamento'}`);}}
  setBusy(false);setProgress('');if(files.current)files.current.value='';if(camera.current)camera.current.value='';await refresh();if(count)toast.success(`${count} fatura(s) guardada(s)${failed?` · ${failed} falharam`:''}`);if(count===1&&lastId)navigate(`/finance/costs/${lastId}`);
 }
 return <div className="flex flex-wrap items-center gap-2"><input ref={files} type="file" multiple accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={e=>void upload(e.target.files)}/><input ref={camera} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={e=>void upload(e.target.files)}/><Button disabled={busy} onClick={()=>files.current?.click()} className="gap-2">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Upload className="h-4 w-4"/>}Carregar faturas</Button><Button variant="outline" disabled={busy} onClick={()=>camera.current?.click()} aria-label="Tirar fotografia" title="Tirar fotografia"><Camera className="h-4 w-4"/></Button>{busy&&<span className="text-xs text-muted-foreground max-w-64 truncate">{progress}</span>}</div>;
}