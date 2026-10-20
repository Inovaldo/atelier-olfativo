import {batch,costPerGram,FAMILIES} from './engine.mjs';
const val=x=>typeof x==='string'&&/^[=+@-]/.test(x)?"'"+x:x;
const fx=(formula,result)=>({formula,result:result??'Pendente'});
export function workbookSpec(formulas,inventory,label='Cliente'){
  const sheets=[];const add=(name,title,headers,rows,widths)=>{const s={name,title,headers,rows,widths};sheets.push(s);return s;};
  const s=formulas[0].settings;
  const settings=add('Premissas','Parâmetros editáveis',['Parâmetro','Valor','Unidade ou observação'],[
    ['Dosagem dos materiais comerciais',s.concentration/100,'Fração em massa do produto final. Inclui diluições já compradas.'],
    ['Perda de processo',s.loss/100,'Perda sobre custo dos materiais. Não aumenta a massa nominal da fórmula.'],
    ['Embalagem 50 g',s.pack50,'R$ por unidade. Zero = não informado / não incluído.'],
    ['Embalagem 100 g',s.pack100,'R$ por unidade. Zero = não informado / não incluído.'],
    ['Mão de obra / despesas 50 g',s.labor50,'R$ por unidade. Zero = não informado / não incluído.'],
    ['Mão de obra / despesas 100 g',s.labor100,'R$ por unidade. Zero = não informado / não incluído.'],
    ['Densidade padrão provisória',1,'g/mL, aplicada apenas onde não existe densidade informada. Substitua por medição ou ficha.'],
  ],[42,20,105]);
  settings.formats={B5:'0.0%',B6:'0.0%',B7:'"R$" #,##0.00',B8:'"R$" #,##0.00',B9:'"R$" #,##0.00',B10:'"R$" #,##0.00',B11:'0.000'};
  const all=[...inventory];const invRows=new Map(all.map((x,i)=>[x.id,i+5]));
  const inv=add('Inventario','Materiais e custos de origem',['Material','Quantidade','Unidade','Preço lote R$','Densidade g/mL','Densidade usada','R$/g','Estoque g','Seleção automática','Teto olfativo %','Teor ativo informado','Cuidado / pendência','Fonte','Família','Classe de odores','Lembrança olfativa','Nota','Função','Tipo de material','Motivo de revisão','Metadados da planilha'],all.map((x,i)=>{
    const r=i+5,d=x.unit==='ml'?(x.density??1):1,c=costPerGram(x);
    return [val(x.name),x.quantity,x.unit,x.price,x.density,fx(`IF(C${r}="ml",IF(ISNUMBER(E${r}),E${r},Premissas!$B$11),1)`,d),fx(`IF(OR(NOT(ISNUMBER(D${r})),NOT(ISNUMBER(B${r})),B${r}<=0),"Pendente",D${r}/(B${r}*F${r}))`,c),fx(`IF(ISNUMBER(B${r}),B${r}*F${r},"A comprar")`,x.quantity===null?'A comprar':x.quantity*d),x.enabled?'Habilitado':'Excluído',x.cap/100,x.active,val((x.unit==='ml'&&x.density===null?'Densidade não informada; custo provisório. ':'')+(x.caution??'')),val(x.source),val(x.family),val(x.description),val(x.olfactoryMemory),val(x.note),val(x.role),val(x.kind),val(x.reviewReason),val(JSON.stringify(x.metadata??[]))];
  }),[42,14,11,16,18,18,16,16,22,20,22,75,90,25,40,40,20,40,25,70,90]);
  inv.formats={['D5:D'+(all.length+4)]:'"R$" #,##0.00',['E5:H'+(all.length+4)]:'0.0000',['J5:K'+(all.length+4)]:'0.00%'};
  const summaryRows=[];const purchases=new Map();
  for(const f of formulas){
    const a=batch(f,50),b=batch(f,100);const lines=[...f.lines,{item:f.base,percent:null}];
    const rows=lines.map((l,i)=>{
      const r=i+5,ir=invRows.get(l.item.id),isBase=l.percent===null,ga=isBase?a.baseGrams:a.rows[i].grams,gb=isBase?b.baseGrams:b.rows[i].grams;
      const unit=costPerGram(l.item),pa=isBase?1-s.concentration/100:l.percent/100*s.concentration/100;
      if(!l.item.owned)purchases.set(l.item.id,{item:l.item,reason:l.item.reason,uses:[...(purchases.get(l.item.id)?.uses??[]),f.id]});
      return [fx(`Inventario!A${ir}`,l.item.name),isBase?null:l.percent/100,fx(isBase?'1-Premissas!$B$5':`B${r}*Premissas!$B$5`,pa),fx(`C${r}*50`,ga),fx(`C${r}*100`,gb),fx(`Inventario!G${ir}`,unit),fx(`IF(ISNUMBER(F${r}),D${r}*F${r},"Pendente")`,unit===null?null:ga*unit),fx(`IF(ISNUMBER(F${r}),E${r}*F${r},"Pendente")`,unit===null?null:gb*unit),l.item.active===null?'Não informado':fx(`C${r}*Inventario!K${ir}`,pa*l.item.active),l.item.owned?'Estoque':'Comprar',val(l.item.note??'Veículo')];
    });
    const end=rows.length+4;
    const totalRow=end+1,rawRow=end+3,costRow=end+4;
    rows.push(['Massa total e soma concentrado',fx(`SUM(B5:B${end})`,1),fx(`SUM(C5:C${end})`,1),fx(`SUM(D5:D${end})`,50),fx(`SUM(E5:E${end})`,100),null,null,null,null,null,null]);
    rows.push(Array(11).fill(null));
    rows.push(['Custo dos materiais',null,null,null,null,null,fx(`IF(COUNT(G5:G${end})=${lines.length},SUM(G5:G${end}),"Pendente")`,a.materials),fx(`IF(COUNT(H5:H${end})=${lines.length},SUM(H5:H${end}),"Pendente")`,b.materials),null,null,null]);
    rows.push(['Custo de produção',null,null,null,null,null,fx(`IF(ISNUMBER(G${rawRow}),G${rawRow}/(1-Premissas!$B$6)+Premissas!$B$7+Premissas!$B$9,"Pendente")`,a.production),fx(`IF(ISNUMBER(H${rawRow}),H${rawRow}/(1-Premissas!$B$6)+Premissas!$B$8+Premissas!$B$10,"Pendente")`,b.production),null,null,null]);
    rows.push(['Status',a.missing?'Cotação pendente':a.provisional?'Custo provisório: densidade assumida':'Custo calculado',null,null,null,null,null,null,null,null,null]);
    rows.push(['Teste de bancada', 'Proposta heurística. Validar odor, solubilidade, estabilidade, SDS, alérgenos e IFRA antes de uso na pele.',null,null,null,null,null,null,null,null,null]);
    rows.push(['Cobertura limitada',f.shortages.join(', ')||'Sem lacuna dominante identificada pelo modelo',null,null,null,null,null,null,null,null,null]);
    rows.push(['Famílias rejeitadas presentes',f.aversions.join(', ')||'Nenhuma acima de 5% de representação editorial',null,null,null,null,null,null,null,null,null]);
    rows.push(['Estoque para 100 g',b.shortStock.join(', ')||'Suficiente por proposta isolada (densidades provisórias onde ausentes)',null,null,null,null,null,null,null,null,null]);
    const sheet=add(f.id,`${f.id} · ${f.title}${f.upgraded?' · com aquisições':' · estoque atual'}`,['Material comercial','% concentrado','% produto final','g / 50 g','g / 100 g','R$/g','R$ / 50 g','R$ / 100 g','Ativo no produto','Origem','Nota'],rows,[44,18,18,16,16,17,18,18,22,16,22]);
    sheet.formats={[`B5:C${totalRow}`]:'0.0000%',[`D5:F${end}`]:'0.0000',[`G5:H${costRow}`]:'"R$" #,##0.0000',[`I5:I${end}`]:'0.0000%'};
    summaryRows.push([f.id,f.title,f.upgraded?'Com aquisições':'Estoque atual',fx(`'${f.id}'!G${costRow}`,a.production),fx(`'${f.id}'!H${costRow}`,b.production),a.missing?'Cotação pendente':a.provisional?'Provisório (densidade)':'Calculado',f.shortages.join(', ')||'—']);
  }
  const profile=formulas[0].profile;
  summaryRows.push(Array(7).fill(null),['Mapa do cliente','Afinidade /100','Confiança','Evidências',null,null,null]);
  for(const family of FAMILIES){const p=profile.scores.find(x=>x.family===family);summaryRows.push([family,p.score===null?'Sem dados':p.score,p.confidence===null?'Não informada':p.confidence,p.evidence??'Não informado',null,null,null]);}
  summaryRows.push(Array(7).fill(null),['Método','Heurística determinística por afinidade e representação editorial. Não prevê aceitação real nem reproduz perfumes comerciais.',null,null,null,null,null],['Massa','50 g e 100 g são massas do produto final, incluindo veículo. Não são mL.',null,null,null,null,null],['Densidade','Custos em mL usam 1 g/mL provisório onde não há ficha ou medição. Corrija em Inventario.',null,null,null,null,null],['Produção','Mão de obra e embalagem iniciam em zero; completar Premissas para custo completo.',null,null,null,null,null],['Segurança','Todos os protótipos exigem revisão de identidade, concentração ativa, IFRA, alérgenos e estabilidade.',null,null,null,null,null],['Custos de compras','Sem cotação, o custo da proposta permanece pendente; não representa material gratuito.',null,null,null,null,null],['Arquivo recebido',val(label),null,null,null,null,null]);
  const summary=add('Resumo',label.toUpperCase().includes('FICTÍCIO')?'Ateliê Olfativo · exemplo fictício':'Ateliê Olfativo · seis propostas',['Código','Variação','Cenário','Custo 50 g R$','Custo 100 g R$','Situação do custo','Famílias com cobertura limitada'],summaryRows,[18,46,26,24,24,32,50]);
  summary.formats={'D5:E10':'"R$" #,##0.00','B13:B24':'0.0','C13:C24':'0%'};
  add('Compras','Aquisições sugeridas para este cliente',['Material','Usado em','Por que avaliar','Preço lote R$','Quantidade g','Fonte técnica'],[...purchases.values()].map(p=>[val(p.item.name),p.uses.join(', '),val(p.reason),p.item.price,p.item.quantity,val(p.item.source)]),[44,20,92,20,20,110]);
  return [summary,settings,inv,...sheets.filter(x=>/^([EC][123])$/.test(x.name)),sheets.find(x=>x.name==='Compras')];
}
export async function exportExcel(spec,ExcelJS){
  const wb=new ExcelJS.Workbook();wb.creator='Ateliê Olfativo';wb.calcProperties.fullCalcOnLoad=true;
  for(const s of spec){const sh=wb.addWorksheet(s.name,{views:[{showGridLines:false,state:'frozen',ySplit:4}]});
    sh.columns=s.widths.map(width=>({width}));sh.getCell('A2').value=s.title;sh.getCell('A2').font={name:'Arial',size:15,bold:true,color:{argb:'FF24382D'}};
    sh.getRow(4).values=s.headers;for(let i=0;i<s.rows.length;i++)sh.getRow(i+5).values=s.rows[i];
    sh.eachRow((row,ri)=>{row.height=24;row.eachCell(c=>{if(ri!==2)c.font={name:'Arial',size:10};c.alignment={vertical:'middle',wrapText:false};});});
    sh.getRow(4).height=34;sh.getRow(4).eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF24382D'}};c.font={name:'Arial',size:10,bold:true,color:{argb:'FFFFFFFF'}};c.alignment={horizontal:'center',vertical:'middle',wrapText:true};});
    for(const [range,fmt] of Object.entries(s.formats??{})){const [a,b=a]=range.split(':');const start=sh.getCell(a),end=sh.getCell(b);for(let r=start.row;r<=end.row;r++)for(let c=start.col;c<=end.col;c++){sh.getCell(r,c).numFmt=fmt;sh.getCell(r,c).alignment={horizontal:'right',vertical:'middle'};}}
    if(s.name==='Inventario')for(let r=5;r<=s.rows.length+4;r++)for(const c of [2,4,5])sh.getCell(r,c).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF1CE'}};
    if(s.name==='Premissas'){for(let r=5;r<=11;r++)sh.getCell(r,2).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF1CE'}};sh.getCell('B5').dataValidation={type:'decimal',operator:'between',formulae:[.01,.4],showErrorMessage:true};}
    sh.autoFilter={from:{row:4,column:1},to:{row:4,column:s.headers.length}};
  }
  return wb.xlsx.writeBuffer();
}
