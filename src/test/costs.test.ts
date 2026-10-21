import {describe,it,expect} from 'vitest';
import {parseATQR,lineVAT,totals,monthlyKinds,safeCostName,type CostInvoice,type CostCategory} from '@/lib/costs';
describe('Custos',()=>{
 it('lê campos QR AT e não confunde total com imposto',()=>{const q=parseATQR('A:501234567*B:516245910*F:20261021*G:FT 1/2*H:ABC-2*I1:PT*I3:0.00*I4:0.00*I5:0.00*I6:0.00*I7:100.00*I8:23.00*N:23.00*O:123.00');expect(q?.total_gross).toBe(123);expect(q?.total_vat).toBe(23);expect(q?.supplier_nif).toBe('501234567');expect(q?.invoice_date).toBe('2026-10-21');expect(q?.lines[0].vat_rate).toBe(23);});
 it('recusa QR e datas inválidas',()=>{expect(parseATQR('https://example.com')).toBeNull();expect(parseATQR('A:501234567*F:20260230*G:1')).toBeNull();});
 it('aceita IVA entre 0 e 100 e arredonda cêntimos',()=>{expect(lineVAT(10,0)).toBe(0);expect(lineVAT(10,100)).toBe(10);expect(lineVAT(9.99,23)).toBe(2.30);expect(()=>lineVAT(10,101)).toThrow();expect(()=>lineVAT(10,-1)).toThrow();});
 it('soma base, IVA e total',()=>{expect(totals([{net:100,vat_amount:23} as never,{net:50,vat_amount:3} as never])).toEqual({net:150,vat:26,gross:176});});
 it('mantém investimentos e stock fora da operação',()=>{const invoices=[{total_gross:173,duplicate_of:null,cost_invoice_lines:[{category_code:'O',net:100,vat_amount:23},{category_code:'A',net:30,vat_amount:0},{category_code:'S',net:20,vat_amount:0}]}] as CostInvoice[];const categories=[{code:'O',kind:'opex'},{code:'A',kind:'capex'},{code:'S',kind:'stock'}] as CostCategory[];expect(monthlyKinds(invoices,categories)).toEqual({opex:123,capex:30,stock:20,unclassified:0});});
 it('sanitiza caminhos de ficheiro privados',()=>{expect(safeCostName('../../Fátura teste.png')).toBe('Fatura_teste.png');});
});