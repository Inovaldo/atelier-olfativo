import {prepareInventory as legacy,FAMILIES,normalize,PURCHASES} from './engine.mjs';

// Identity keys ignore typography, never concentration or descriptive identity.
export const materialKey = name => normalize(name).replace(/[^a-z0-9%]+/g,' ').trim();
const text = value => {
  if(value===null||value===undefined)return '';
  if(typeof value!=='object')return String(value).trim();
  if('result' in value)return text(value.result);
  if(value.richText)return value.richText.map(v=>v.text).join('').trim();
  if(value.text)return text(value.text);
  throw Error('Célula sem valor utilizável; recalcule as fórmulas no Excel.');
};
const number = value => {
  const s=text(value).replace(/R\$\s*/g,'').replace(/\s/g,'');
  if(!s)return null;
  const n=Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s);
  if(!Number.isFinite(n)||n<0)throw Error('Valor numérico inválido: '+text(value));
  return n;
};
const coconut = k => /^(aldeido c ?18(?: coco)?|gamma nonalactone|gama nonalactona)$/.test(k);
const inferredWeights = description => {
  const s=normalize(description),weights={};
  const patterns=[/amadeir|madeira/,/ambar|oriental|resinos/,/almiscar|musk/,/floral|flor /,/gourmand|lacton|coco|baunilha|doce/,/verde/,/citric/,/aquatic|marinh|ozonic/,/aromatic|lavanda/,/frutad|frutal/,/especiad/,/terros|musgo/];
  FAMILIES.forEach((f,i)=>{if(patterns[i].test(s))weights[f]=1;});
  const sum=Object.values(weights).reduce((a,b)=>a+b,0);
  return Object.fromEntries(Object.entries(weights).map(([f,w])=>[f,w/sum]));
};
export function prepareInventory(rows,{source='Planilha importada',headers=[]}={}){
  const seen=new Set();
  return rows.filter(r=>text(r[0])).map((raw,i)=>{
    const r=raw.map(text),name=r[0],key=materialKey(name);
    if(seen.has(key))throw Error('Ingrediente duplicado: '+name);seen.add(key);
    const match=r[1]?.match(/^(\d+(?:[.,]\d+)?)\s*(ml|g|kg|l)$/i);
    if(!match)throw Error('Quantidade ou unidade inválida: '+name);
    const unit=match[2].toLowerCase(),quantity=Number(match[1].replace(',','.'))*(unit==='kg'||unit==='l'?1000:1),price=number(raw[2]);
    const old=legacy([[name,quantity+' '+(unit==='l'?'ml':unit==='kg'?'g':unit),price??0,...r.slice(3)]])[0];
    let weights=old.weights,cap=old.cap,enabled=old.enabled,kind='aromático',reviewReason='';
    const description=[r[3],r[4],r[5],r[6],r[13]].join(' ');
    if(/^(base para perfume)$/.test(key))kind='veículo';
    else if(/^(triacetina|dipropilenoglicol|dpg|alcool(?: de cereais| etilico)?|etanol)$/.test(key))kind='solvente';
    else if(/^(base|fixador|essencia)\b/.test(key)||/aphermate|almiscar sintetico alta fixacao|bacdanol sandol/.test(key))kind='composição a confirmar';
    if(coconut(key)){
      weights={Gourmand:.65,Frutado:.35};cap=1;enabled=true;
      reviewReason='Perfil lactônico de coco. Teto editorial de bancada de 1%, não limite IFRA. Confirmar identidade, teor e ficha do lote.';
    }else if(!Object.keys(weights).length){
      weights=inferredWeights(description);cap=0;enabled=false;
      reviewReason=kind==='veículo'||kind==='solvente'?'Material funcional, fora da seleção de notas.':'Perfil sugerido pela classificação; identidade e teto de bancada aguardam revisão.';
    }else if(!enabled)reviewReason='Identidade ou composição comercial a confirmar.';
    return {...old,id:'inv-'+encodeURIComponent(key),name,quantity,price,weights,cap,enabled,kind,reviewReason,
      classification:r[4]||null,olfactoryMemory:r[6]||null,metadata:raw.map((value,j)=>({column:headers[j]||String(j+1),value:text(value)})),
      source:source+' / linha '+(raw.sourceRow??i+2),profileSource:coconut(key)?'https://chemical.kao.com/global/fragrances-and-aromas/products/gamma_nonalactone/':null};
  });
}

// Locate columns by header instead of silently truncating to fourteen cells.
export function readInventoryWorkbook(wb,source='Inventário XLSX'){
  const aliases=[['ingrediente','material','nome','materia prima'],['quantidade','quantidade comprada','quantidade lote','qtd'],['preco','preco r$','preco total','preco pago','valor','valor pago','custo'],['familia olfativa','familia','grupo olfativo'],['classificacao'],['classe de odores','classe de odor','descricao olfativa','descricao'],['lembranca olfativa'],['nota','nota olfativa','volatilidade'],[],[],[],[],['cuidado','cuidados','observacoes','restricoes'],['funcao','papel','funcao na formula']];
  const candidates=[];
  for(const sh of wb.worksheets){
    for(let n=1;n<=Math.min(sh.rowCount,30);n++){
      const h=Array.from({length:sh.columnCount},(_,i)=>text(sh.getRow(n).getCell(i+1).value)),keys=h.map(materialKey);
      const columns=aliases.map(list=>keys.findIndex(k=>list.some(a=>k===materialKey(a)||k.startsWith(materialKey(a)+' '))));
      if(columns.slice(0,3).every(i=>i>=0))candidates.push({sh,n,h,columns});
    }
  }
  const preferred=candidates.filter(c=>normalize(c.sh.name)==='inventario detalhado');
  const selected=preferred.length===1?preferred[0]:candidates.length===1?candidates[0]:null;
  if(!selected)throw Error(candidates.length?'Mais de uma tabela de inventário encontrada. Use uma aba Inventário detalhado inequívoca.':'Cabeçalhos de ingrediente, quantidade e preço não encontrados.');
  const {sh,n,h,columns}=selected,rows=[];
  for(let j=n+1;j<=sh.rowCount;j++){
    const sourceRow=sh.getRow(j),cells=h.map((_,i)=>sourceRow.getCell(i+1).value);
    if(!text(cells[columns[0]]))continue;
    const row=columns.map(i=>i<0?null:cells[i]);row.sourceRow=j;
    // Extra columns are retained with their original headings.
    const extra=h.map((_,i)=>i).filter(i=>!columns.includes(i));
    row.push(...extra.map(i=>cells[i]));rows.push(row);
  }
  if(!rows.length||rows.length>3000)throw Error('Inventário vazio ou muito grande.');
  const extra=h.map((_,i)=>i).filter(i=>!columns.includes(i));
  return prepareInventory(rows,{source:source+' / '+sh.name,headers:[...columns.map(i=>h[i]??''),...extra.map(i=>h[i])]});
}

export function mergeInventory(existing,incoming){
  const result=structuredClone(existing),positions=new Map(result.map((x,i)=>[materialKey(x.name),i]));
  let added=0,updated=0;
  for(const item of incoming){
    const i=positions.get(materialKey(item.name));
    if(i===undefined){positions.set(materialKey(item.name),result.length);result.push(structuredClone(item));added++;continue;}
    const previous=result[i],next={...previous,...structuredClone(item),id:previous.id,owned:true};
    for(const field of ['density','active'])if(previous[field]!==null&&previous[field]!==undefined)next[field]=previous[field];
    if(previous.cap>0&&Object.keys(previous.weights??{}).length){
      next.cap=previous.cap;next.weights=previous.weights;next.enabled=previous.enabled;
    }
    if(previous.kind==='veículo'||previous.kind==='solvente'){next.enabled=false;next.cap=0;}
    result[i]=next;updated++;
  }
  for(const p of PURCHASES)if(!result.some(x=>x.id===p.id||materialKey(x.name)===materialKey(p.name)))result.push(structuredClone(p));
  return {inventory:result,added,updated,retained:existing.filter(x=>x.owned&&!incoming.some(y=>materialKey(x.name)===materialKey(y.name))).length};
}

export function inventorySummary(items){
  const owned=items.filter(x=>x.owned);
  return {total:owned.length,enabled:owned.filter(x=>x.enabled&&x.cap>0).length,pending:owned.filter(x=>!x.enabled&&x.kind!=='solvente'&&x.kind!=='veículo').length,functional:owned.filter(x=>x.kind==='solvente'||x.kind==='veículo').length,purchases:items.length-owned.length};
}
