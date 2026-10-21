import type { Tables } from '@/integrations/supabase/types';
export type CostInvoice = Tables<'cost_invoices'> & { cost_invoice_lines: Tables<'cost_invoice_lines'>[] };
export type CostCategory = Tables<'cost_categories'>;
export type CostLine = Pick<Tables<'cost_invoice_lines'>,'description'|'category_code'|'location_id'|'net'|'vat_rate'|'vat_amount'>;
export const costStatus: Record<string,string> = {to_classify:'Por classificar',classified:'Classificada',paid:'Paga'};
export const eur = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(value);
export const round = (value:number) => Math.round((value + Number.EPSILON)*100)/100;
export function lineVAT(net:number, rate:number) { if (!Number.isFinite(net)||!Number.isFinite(rate)||rate<0||rate>100) throw new Error('IVA deve estar entre 0 e 100'); return round(net*rate/100); }
export const totals = (lines:CostLine[]) => {const net=round(lines.reduce((s,l)=>s+(l.net??0),0));const vat=round(lines.reduce((s,l)=>s+(l.vat_amount??0),0));return {net,vat,gross:round(net+vat)};};
export function monthlyKinds(invoices:CostInvoice[],categories:CostCategory[]) {const result={opex:0,capex:0,stock:0,unclassified:0};for(const i of invoices){if(i.duplicate_of)continue;const t=totals(i.cost_invoice_lines); for(const l of i.cost_invoice_lines){const kind=categories.find(c=>c.code===l.category_code)?.kind; const key=kind==='opex'||kind==='capex'||kind==='stock'?kind:'unclassified'; result[key]+= (l.net??0)+(l.vat_amount??0);} result.unclassified+=(i.total_gross??t.gross)-t.gross;}return Object.fromEntries(Object.entries(result).map(([k,v])=>[k,round(v)])) as typeof result;}
export function safeCostName(name:string) {return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]/g,'_').replace(/^[^A-Za-z0-9]+/,'').slice(-150)||'fatura.pdf';}
export const emptyCostLine = ():CostLine => ({description:'',category_code:null,location_id:null,net:null,vat_rate:null,vat_amount:null});
export function parseATQR(raw:string) {
 const fields=Object.fromEntries(raw.trim().split('*').map(part=>{const p=part.indexOf(':');return [part.slice(0,p),part.slice(p+1)];}));
 if(!/^\d{9}$/.test(fields.A??'')||!/^\d{8}$/.test(fields.F??'')||!fields.G) return null;
 const amount=(key:string)=>fields[key]!==undefined && /^-?\d+(?:[.,]\d+)?$/.test(fields[key])?Number(fields[key].replace(',','.')):null;
 const lines:CostLine[]=[];
 for(const region of ['I','J','K']) {if(!fields[region+'1'])continue; const rates=fields[region+'1']==='PT-AC'?[4,9,16]:fields[region+'1']==='PT-MA'?[5,12,22]:[6,13,23]; const exempt=amount(region+'2'); if(exempt!=null&&exempt!==0)lines.push({...emptyCostLine(),description:'Isento de IVA',net:exempt,vat_rate:0,vat_amount:0});for(let j=0;j<3;j++){const net=amount(region+(3+j*2));const vat=amount(region+(4+j*2)); if(net!=null&&(net!==0||vat))lines.push({...emptyCostLine(),description:`IVA ${rates[j]}%`,net,vat_rate:rates[j],vat_amount:vat??lineVAT(net,rates[j])});}}
 const nonTaxable=amount('L');if(nonTaxable)lines.push({...emptyCostLine(),description:'Operações não sujeitas',net:nonTaxable,vat_rate:0,vat_amount:0});
 const vat=amount('N');const gross=amount('O');const date=`${fields.F.slice(0,4)}-${fields.F.slice(4,6)}-${fields.F.slice(6,8)}`; if(Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)return null;
 return {supplier_name:null as string|null,due_date:null as string|null,supplier_nif:fields.A,invoice_number:fields.G,invoice_date:date,atcud:fields.H??null,total_net:gross!=null&&vat!=null?round(gross-vat):null,total_vat:vat,total_gross:gross,lines};
}