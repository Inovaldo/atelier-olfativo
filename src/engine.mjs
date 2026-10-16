export const FAMILIES=['Amadeirado','Ambarado','Almiscarado','Floral','Gourmand','Verde','Cítrico','Aquático','Aromático','Frutado','Especiado','Terroso'];
export const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const QUICK=new Set([1,2,16,20,29,30,42,50,56,59,71,72,85,86,97,98,113,114,121,125,134,136,146,153]);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function validateProfile(rows,source='Relatório'){
  if(!Array.isArray(rows))throw Error('Relatório sem tabela de famílias.');
  const seen=new Set(); const scores=rows.map(r=>{
    const family=FAMILIES.find(f=>normalize(f)===normalize(r.family));
    if(!family||seen.has(family))throw Error('Família desconhecida ou duplicada no relatório.'); seen.add(family);
    const score=r.score===null||r.score===''?null:r.score;
    if(score!==null&&(!finite(score)||score<0||score>100))throw Error('Afinidade deve estar entre 0 e 100.');
    const confidence=r.confidence??null;
    if(confidence!==null&&(!finite(confidence)||confidence<0||confidence>1))throw Error('Confiança inválida.');
    const evidence=r.evidence??null;if(evidence!==null&&(!Number.isInteger(evidence)||evidence<0))throw Error('Número de evidências inválido.');
    return {family,score,confidence,evidence};
  });
  for(const family of FAMILIES)if(!seen.has(family))scores.push({family,score:null,confidence:null,evidence:null});
  if(!scores.some(s=>s.score!==null))throw Error('Relatório sem avaliações utilizáveis.');
  return {source,scores,warnings:scores.some(s=>s.confidence===null&&s.score!==null)?['Relatório sem confiança: afinidades serão usadas com peso reduzido.']:Math.max(...scores.map(s=>s.confidence??0))<.2?['Baixa confiança nas famílias: propostas apenas exploratórias. Peça mais avaliações.']:[]};
}
export function calculateProfile(data,catalog){
  if(data.schemaVersion!==1||!data.ratings||typeof data.ratings!=='object'||Array.isArray(data.ratings))throw Error('JSON incompatível: exporte o relatório JSON do Meu DNA Olfativo.');
  if(data.catalogVersion!==undefined&&data.catalogVersion!==1)throw Error('Versão de catálogo incompatível.');
  if(data.questionnaireMode!==undefined&&!['quick','detailed'].includes(data.questionnaireMode))throw Error('Modo do questionário inválido.');
  const byId=new Map(catalog.odors.map(o=>[String(o.id),o]));const ratings=[];
  for(const [id,r] of Object.entries(data.ratings)){
    if(!byId.has(id))throw Error('O relatório contém cheiros de outro catálogo.');
    if(Object.hasOwn(data.unknownOdors??{},id))throw Error('Cheiro marcado como avaliado e desconhecido.');
    if(!finite(r.value)||r.value<0||r.value>10||r.value*2!==Math.round(r.value*2))throw Error('Nota inválida no JSON.');
    if(data.questionnaireMode!=='quick'||QUICK.has(Number(id)))ratings.push([byId.get(id),r.value]);
  }
  const rows=FAMILIES.map(f=>{
    let n=0,w=0,sum=0; const total=catalog.odors.filter(o=>(o.weights[f]??0)>0).length;
    for(const [o,value] of ratings){const a=o.weights[f]??0;if(a>0){n++;w+=a;sum+=a*(value-5)/5;}}
    return {family:f,score:w?50+50*sum/w:null,evidence:n,confidence:Math.min(1,n/8)*Math.sqrt(total?n/total:0)};
  });
  const p=validateProfile(rows,'JSON');p.ratedCount=ratings.length;
  if(ratings.length<8)p.warnings.push('Poucas respostas: propostas exploratórias.');
  return p;
}
export function parseCsv(text){
  text=text.replace(/^\uFEFF/,'');const sep=text.split(/\r?\n/)[0].includes(';')?';':',';
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===sep||c==='\n')){row.push(cell.replace(/\r$/,''));cell='';if(c==='\n'){rows.push(row);row=[];}}else cell+=c;}
  if(quoted)throw Error('CSV com aspas incompletas.');if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}
  const head=rows.shift();const index=n=>head.indexOf(n);if(index('tipo')<0||index('nome')<0||index('nota')<0)throw Error('CSV incompatível.');
  const number=s=>s===''||s===undefined?null:Number(s.replace(',','.'));
  return validateProfile(rows.filter(r=>r[index('tipo')]==='familia').map(r=>({family:r[index('nome')],score:number(r[index('nota')]),confidence:number(r[index('confianca')]),evidence:number(r[index('evidencias')])})),'CSV');
}
export function parsePdfRows(pages){
  const found=[];
  for(const lines of pages)for(const line of lines){
    const tokens=line.trim().split(/\s+/);const family=FAMILIES.find(f=>normalize(tokens[0])===normalize(f));
    if(!family||found.some(r=>r.family===family))continue;
    const rest=tokens.slice(1).join(' ');
    // Use only rows from the report's five-column table, never prose or chart labels.
    const m=rest.match(/^(Sem dados|\d+(?:[.,]\d+)?)\s+(\d+)\s+(\d+)%\s+(\d+)%$/i);
    if(m)found.push({family,score:/sem/i.test(m[1])?null:Number(m[1].replace(',','.')),evidence:Number(m[2]),confidence:Number(m[4])/100});
  }
  if(found.length!==12)throw Error('Não foi possível ler as 12 famílias do PDF. Envie a exportação JSON ou CSV para evitar interpretações incorretas.');
  return validateProfile(found,'PDF');
}
const MAP={
  'iso e super':{Amadeirado:1,Ambarado:.2},'hedione':{Floral:1,Cítrico:.08},'ambroxan solucao 10%':{Ambarado:1,Amadeirado:.45},
  'etileno brassilato':{Almiscarado:1,Floral:.15},'cedro':{Amadeirado:1,Terroso:.1},'dihidromircenol':{Aromático:1,Cítrico:.6},
  'linalol floral citrico':{Floral:.65,Cítrico:.4,Aromático:.4},'sandalore':{Amadeirado:1,Floral:.1},'limao siciliano':{Cítrico:1,Verde:.2},
  'etil vanilina po 100%':{Gourmand:1,Ambarado:.2},'acetato de benzila':{Floral:1,Frutado:.45},'antranilato de metila':{Floral:.7,Frutado:1},
  'aldeido c10':{Cítrico:1,Almiscarado:.2},'pimenta rosa':{Especiado:1,Cítrico:.25},'rosas vermelhas oleo':{Floral:1},
  'essencia alfazema':{Aromático:1,Floral:.3},'cheiro de talco':{Almiscarado:1,Floral:.4},'lavanda':{Aromático:1,Floral:.4},
  'patchouli':{Terroso:1,Amadeirado:.6,Ambarado:.15},'baunilha':{Gourmand:1,Ambarado:.25},'bergamota':{Cítrico:1,Verde:.2,Floral:.1},
  'benjoim':{Ambarado:1,Gourmand:.5},'ylang ylang':{Floral:1,Frutado:.25},'vetiver puro':{Terroso:1,Amadeirado:.8,Verde:.25},
  'olibano':{Ambarado:1,Amadeirado:.4,Cítrico:.15},'etil maltol po 100%':{Gourmand:1,Frutado:.2},'cumarina':{Aromático:.5,Gourmand:.5,Terroso:.2},
  'ionona violeta floral':{Floral:1,Amadeirado:.3},'boisambrene':{Amadeirado:1,Ambarado:.7},'acetato de estiralila':{Verde:1,Floral:.3,Frutado:.2},
  'bacdanol sandol':{Amadeirado:1},'base oud amadeirado':{Amadeirado:1,Ambarado:.5,Terroso:.2},'geraniol floral rosado':{Floral:1,Verde:.2},
  'metil ionona violeta sofisticada':{Floral:1,Amadeirado:.3},'veramoss':{Terroso:1,Amadeirado:.4,Verde:.15}
};
const CAPS={'iso e super':35,'hedione':30,'ambroxan solucao 10%':20,'etileno brassilato':20,'cedro':8,'dihidromircenol':12,'linalol floral citrico':5,'sandalore':10,'limao siciliano':6,'etil vanilina po 100%':.3,'acetato de benzila':6,'antranilato de metila':.2,'aldeido c10':.1,'pimenta rosa':2,'rosas vermelhas oleo':6,'essencia alfazema':6,'cheiro de talco':6,'lavanda':8,'patchouli':6,'baunilha':6,'bergamota':10,'benjoim':6,'ylang ylang':2,'vetiver puro':3,'olibano':4,'etil maltol po 100%':.1,'cumarina':1,'ionona violeta floral':4,'boisambrene':3,'acetato de estiralila':2,'bacdanol sandol':6,'base oud amadeirado':5,'geraniol floral rosado':3,'metil ionona violeta sofisticada':6,'veramoss':.5};
const BLOCKED=['fixador oficiales','fixador hedione','aphermate','almiscar sintetico alta fixacao','bacdanol sandol','base oud amadeirado'];
export function prepareInventory(rows){
  const seen=new Set();return rows.filter(r=>r[0]).map((r,i)=>{
    const name=String(r[0]),key=normalize(name);if(seen.has(key))throw Error('Ingrediente duplicado: '+name);seen.add(key);
    const q=String(r[1]).match(/^(\d+(?:[.,]\d+)?)\s*(ml|g)$/i);if(!q)throw Error('Quantidade inválida: '+name);
    const price=r[2];if(!finite(price)||price<0)throw Error('Preço inválido: '+name);
    const weights=MAP[key]??{};const sum=Object.values(weights).reduce((a,b)=>a+b,0);
    return {id:'inv-'+(i+1),name,quantity:Number(q[1].replace(',','.')),unit:q[2].toLowerCase(),price,density:null,family:r[3]??null,description:r[5]??null,note:r[7]??null,caution:r[12]??null,role:r[13]??null,weights:Object.fromEntries(Object.entries(weights).map(([f,w])=>[f,w/sum])),cap:CAPS[key]??0,enabled:!!sum&&!BLOCKED.includes(key),active:key==='ambroxan solucao 10%'?.1:null,owned:true,source:'inventario_perfumaria_classificado.xlsx / Inventário detalhado / linha '+(i+2)};
  });
}
export const PURCHASES=[
  {id:'buy-cashmeran',name:'Cashmeran (identidade documentada)',weights:{Amadeirado:.6,Ambarado:.3,Especiado:.1},cap:3,note:'Fundo',reason:'Madeira e âmbar com textura; alternativa às bases de composição indefinida.',source:'https://www.iff.com/scent/ingredients-compendium/cashmeran/'},
  {id:'buy-helional',name:'Helional (identidade documentada)',weights:{Aquático:.6,Floral:.25,Verde:.15},cap:4,note:'Coração',reason:'Acrescenta faceta aquática, ausente no estoque classificado.',source:'https://www.iff.com/es/scent/ingredients-compendium/helional/'},
  {id:'buy-helvetolide',name:'Helvetolide (identidade documentada)',weights:{Almiscarado:.8,Frutado:.2},cap:12,note:'Fundo',reason:'Amplia o almíscar com nuance frutada e identidade definida.',source:'https://www.firmenich.com/sites/default/files/uploads/files/ingredients/Catalogue_leaflet_Perfumery_Ingredients_2019_.pdf'}
].map(p=>({...p,owned:false,enabled:true,quantity:null,unit:'g',price:null,density:null,active:null,caution:'Cotação, SDS e conformidade para o produto final pendentes.'}));
export const DEFAULTS={concentration:20,loss:0,pack50:0,pack100:0,labor50:0,labor100:0};
export function validateSettings(s){for(const k of Object.keys(DEFAULTS))if(!finite(s[k])||s[k]<0)throw Error('Parâmetro inválido: '+k);if(s.concentration<=0||s.concentration>40||s.loss>=100)throw Error('Revise concentração e perdas.');}
export function costPerGram(item){if(!finite(item.price)||!finite(item.quantity)||item.quantity<=0)return null;return item.price/(item.quantity*(item.unit==='ml'?(item.density??1):1));}
function project(v,caps){if(caps.reduce((a,b)=>a+b,0)<1-1e-10)throw Error('Estoque habilitado insuficiente para fechar 100% dentro das faixas.');let lo=Math.min(...v)-1,hi=Math.max(...v)+1;for(let n=0;n<70;n++){const m=(lo+hi)/2,sum=v.reduce((a,x,i)=>a+Math.min(caps[i],Math.max(0,x-m)),0);if(sum>1)lo=m;else hi=m;}return v.map((x,i)=>Math.min(caps[i],Math.max(0,x-(lo+hi)/2)));}
export function generate(profile,inventory,settings={...DEFAULTS}){
  validateSettings(settings);profile=validateProfile(profile.scores,profile.source);
  const base=inventory.find(x=>normalize(x.name)==='base para perfume');if(!base)throw Error('Importe a Base para perfume no inventário.');
  const prefs=FAMILIES.map(f=>profile.scores.find(x=>x.family===f));
  const signal=prefs.map(s=>s.score===null?0:Math.max(0,(s.score-45)/55)*(.3+.7*(s.confidence??.25)));
  const exploratory=signal.every(x=>x===0);if(exploratory)throw Error('Não há afinidades positivas suficientes. Peça mais avaliações ao cliente antes de formular.');
  const positive=signal.map((v,i)=>[v,i]).filter(([v])=>v>0).sort((a,b)=>b[0]-a[0]);
  const support=positive[1]?.[1]??positive[0][1];
  const results=[];
  for(const upgraded of [false,true])for(let variant=0;variant<3;variant++){
    const target=[...signal];if(variant===1){target[positive[0][1]]*=.7;target[support]*=1.5;}if(variant===2){target[positive[0][1]]*=.8;target[support]*=1.3;const next=positive[2]?.[1]??support;target[next]*=1.8;}
    const total=target.reduce((a,b)=>a+b,0);for(let i=0;i<target.length;i++)target[i]/=total;
    const pool=inventory.filter(x=>x.enabled&&x.cap>0&&x.owned&&x.quantity>0).concat(upgraded?PURCHASES.filter(p=>!inventory.some(i=>normalize(i.name)===normalize(p.name))).map(p=>({...p,...(inventory.find(i=>i.id===p.id)??{})})):[]);
    // Purchases stored as editable quotations in the inventory retain owned=false.
    if(upgraded)for(const p of PURCHASES){const edited=inventory.find(i=>i.id===p.id);if(edited&&!pool.some(i=>i.id===p.id))pool.push(edited);}
    const utility=x=>FAMILIES.reduce((a,f,i)=>a+(x.weights[f]??0)*(target[i]-(prefs[i].score!==null&&prefs[i].score<40?(40-prefs[i].score)/30:0)),0);
    pool.sort((a,b)=>utility(b)-utility(a)||a.id.localeCompare(b.id));
    const selected=[];let capTotal=0;for(const x of pool){if(selected.length<14||capTotal<1.05){selected.push(x);capTotal+=x.cap/100;}}
    if(upgraded&&!selected.some(x=>!x.owned)){const p=pool.filter(x=>!x.owned).sort((a,b)=>utility(b)-utility(a))[0];if(p)selected.push(p);}
    const caps=selected.map(x=>x.cap/100);let proportions=project(selected.map(()=>1/selected.length),caps);
    for(let step=0;step<700;step++){
      const actual=FAMILIES.map(f=>selected.reduce((a,x,j)=>a+proportions[j]*(x.weights[f]??0),0));
      const grad=selected.map((x,j)=>FAMILIES.reduce((a,f,i)=>a+2*(actual[i]-target[i])*(x.weights[f]??0)*(prefs[i].score!==null&&prefs[i].score<40?5:1),0)+.025*proportions[j]+(variant===1?.025*(normalize(x.note).includes('fundo')?1:-1):variant===2?.035*Math.sin(j+1):0));
      proportions=project(proportions.map((v,j)=>v-.15*grad[j]),caps);
    }
    // An acquisition variant always demonstrates a real new material (at least 0.2% if feasible).
    if(upgraded){const j=selected.findIndex(x=>!x.owned);if(j>=0&&proportions[j]<.002){const remaining=project(proportions.filter((_,i)=>i!==j),caps.filter((_,i)=>i!==j).map(c=>c/(1-.002)));let n=0;proportions=selected.map((_,i)=>i===j?.002:remaining[n++]*(1-.002));}}
    const lines=selected.map((item,j)=>({item,percent:100*proportions[j]})).filter(l=>l.percent>1e-7);
    const familyMix=FAMILIES.map(f=>({family:f,share:lines.reduce((a,l)=>a+l.percent*(l.item.weights[f]??0),0)}));
    const shortages=familyMix.filter((m,i)=>target[i]>.1&&m.share<target[i]*100*.4).map(m=>m.family);
    const aversions=familyMix.filter((m,i)=>prefs[i].score!==null&&prefs[i].score<40&&m.share>5).map(m=>m.family);
    results.push({id:(upgraded?'C':'E')+(variant+1),title:['Mais alinhada','Alternativa','Nova combinação'][variant],upgraded,lines,familyMix,shortages,aversions,base,settings,profile,benchOnly:true});
  }
  return results;
}
export function batch(formula,mass){
  const s=formula.settings;const rows=formula.lines.map(l=>{const grams=mass*s.concentration/100*l.percent/100;const c=costPerGram(l.item);return {...l,grams,cost:c===null?null:grams*c,activeGrams:l.item.active===null?null:grams*l.item.active,stockGrams:l.item.owned?l.item.quantity*(l.item.unit==='ml'?(l.item.density??1):1):null};});
  const baseGrams=mass*(1-s.concentration/100),baseCost=costPerGram(formula.base);const missing=rows.some(r=>r.cost===null)||baseCost===null;
  const materials=missing?null:rows.reduce((a,r)=>a+r.cost,0)+baseGrams*baseCost;
  const production=materials===null?null:materials/(1-s.loss/100)+(mass===50?s.pack50+s.labor50:s.pack100+s.labor100);
  return {rows,baseGrams,baseCost:baseCost===null?null:baseGrams*baseCost,materials,production,provisional:rows.some(r=>r.item.unit==='ml'&&r.item.density===null)||formula.base.density===null,missing,shortStock:rows.filter(r=>r.item.owned&&r.grams>r.stockGrams).map(r=>r.item.name).concat(baseGrams>formula.base.quantity*(formula.base.density??1)?[formula.base.name]:[])};
}
