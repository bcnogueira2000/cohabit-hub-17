import jsQR from 'jsqr';
import {parseATQR} from './costs';
export async function costDocumentImages(file:File) {
 const images:string[]=[];let qr:ReturnType<typeof parseATQR>=null;
 const inspect=(canvas:HTMLCanvasElement)=>{const ctx=canvas.getContext('2d');if(!ctx)return;const data=ctx.getImageData(0,0,canvas.width,canvas.height); const code=jsQR(data.data,data.width,data.height);if(code&&!qr)qr=parseATQR(code.data);images.push(canvas.toDataURL('image/jpeg',0.85));};
 if(file.type==='application/pdf'){
  const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).href;
  const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
  try{if(pdf.numPages>20)throw new Error('Leitura automática limitada a 20 páginas; pode preencher manualmente.'); for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);const viewport=page.getViewport({scale:1.7});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível ler o PDF');await page.render({canvasContext:ctx,viewport}).promise;inspect(canvas);page.cleanup();}}finally{await pdf.destroy();}
 }else{const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));canvas.width=bitmap.width*scale;canvas.height=bitmap.height*scale;canvas.getContext('2d')?.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();inspect(canvas);}
 return {images,qr};
}