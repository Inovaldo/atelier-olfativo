import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {prepareInventory,readInventoryWorkbook,mergeInventory,inventorySummary} from '../src/inventory.mjs';
import {generate,validateProfile,FAMILIES} from '../src/engine.mjs';
import {seal,unseal} from '../src/crypto.mjs';

test('C-18: nome acentuado, perfil lactônico, preço ausente e zero distintos',()=>{
 const item=prepareInventory([['Aldeído C-18 Côco','2,5 mL','R$ 1,23','Lactônico']])[0];
 assert.equal(item.name,'Aldeído C-18 Côco');assert.equal(item.quantity,2.5);assert.equal(item.price,1.23);assert.equal(item.enabled,true);assert.equal(item.cap,1);assert.ok(item.weights.Gourmand>0);
 assert.equal(prepareInventory([['Aldeído C18','1 g',null]])[0].price,null);
 assert.equal(prepareInventory([['Aldeído C18','1 g',0]])[0].price,0);
 assert.throws(()=>prepareInventory([['Aldeído C18','1 gotas',1]]));
});
test('XLSX real: título, colunas reordenadas, células formatadas e extras preservados',async()=>{
 const wb=new ExcelJS.Workbook(),sh=wb.addWorksheet('Inventário detalhado');
 sh.addRow(['Inventário de teste']);sh.addRow(['Preço R$','Ingrediente','Quantidade','Família olfativa','Lembrança olfativa','Fornecedor']);
 sh.addRow([{formula:'1+1',result:2},{richText:[{text:'Aldeído C-18 Côco'}]},'1 ml','Lactônico','Coco cremoso','FICTÍCIO']);
 const reopened=new ExcelJS.Workbook();await reopened.xlsx.load(await wb.xlsx.writeBuffer());
 const rows=readInventoryWorkbook(reopened,'Teste');assert.equal(rows.length,1);assert.equal(rows[0].price,2);assert.equal(rows[0].olfactoryMemory,'Coco cremoso');assert.ok(rows[0].metadata.some(x=>x.column==='Fornecedor'&&x.value==='FICTÍCIO'));
});
test('não perde linhas desconhecidas; distingue funcional e pendente; rejeita duplicação',()=>{
 const rows=prepareInventory([['Material de teste','1 g',1,'Floral'],['Triacetina','1 ml',1],['Base para perfume','1 l',1]]);
 assert.equal(rows.length,3);assert.ok(rows[0].weights.Floral);assert.equal(rows[0].cap,0);assert.equal(rows[0].enabled,false);
 assert.equal(rows[1].kind,'solvente');assert.equal(rows[2].kind,'veículo');assert.equal(rows[2].quantity,1000);
 assert.equal(inventorySummary(rows).functional,2);
 assert.throws(()=>prepareInventory([['Aldeído C-18 Côco','1 ml',1],['aldeido c 18 coco','2 ml',2]]));
});
test('reimportação idempotente preserva configurações, materiais ausentes e cotações',async()=>{
 const old=prepareInventory([['Hedione','2 ml',2],['Iso E Super','3 ml',3]]);
 old[0].enabled=false;old[0].density=.9;old[0].cap=17;
 const incoming=prepareInventory([['Hedione','5 ml',4],['Aldeído C18','1 ml',1]]);
 const a=mergeInventory(old,incoming),b=mergeInventory(a.inventory,incoming);
 assert.equal(a.added,1);assert.equal(a.updated,1);assert.equal(a.retained,1);assert.deepEqual(a.inventory,b.inventory);
 assert.equal(a.inventory[0].enabled,false);assert.equal(a.inventory[0].density,.9);assert.equal(a.inventory[0].cap,17);assert.equal(a.inventory[0].quantity,5);
 const payload={inventory:a.inventory,settings:{concentration:20}};
 const encrypted=await seal(payload,'Teste','senha-ficticia-de-teste');
 assert.ok(!JSON.stringify(encrypted).includes('Hedione'));assert.deepEqual(await unseal(encrypted,'Teste','senha-ficticia-de-teste'),payload);
});
test('novos materiais participam do algoritmo; preferências mudam fórmulas',()=>{
 const inv=mergeInventory([],prepareInventory([['Iso E Super','10 ml',1],['Hedione','10 ml',1],['Etileno Brassilato','10 ml',1],['Sandalore','10 ml',1],['Bergamota','10 ml',1],['Aldeído C-18 Côco','1 ml',1],['Base para perfume','1 l',1]])).inventory;
 const profile=focus=>validateProfile(FAMILIES.map(f=>({family:f,score:f===focus?100:55,confidence:1,evidence:10})));
 const sweet=generate(profile('Gourmand'),inv),wood=generate(profile('Amadeirado'),inv);
 assert.equal(sweet.length,6);assert.ok(sweet.some(f=>f.lines.some(l=>l.item.name==='Aldeído C-18 Côco'&&l.percent>0)));
 assert.notDeepEqual(sweet[0].lines,wood[0].lines);
});

test('repetição idêntica preserva ambas as descrições sem dobrar saldo; conflito é recusado',()=>{
 const wb=new ExcelJS.Workbook(),sh=wb.addWorksheet('Inventário detalhado');
 sh.addRow(['Ingrediente','Quantidade','Preço','Família principal','Facetas secundárias','Descrição olfativa detalhada','Evocação / memória']);
 sh.addRow(['Bacdanol Sandol','1 ml',1,'Amadeirado','Sândalo','Primeira descrição','Memória A']);
 sh.addRow(['Bacdanol Sandol','1 ml',1,'Amadeirado','Sândalo','Outra descrição','Memória B']);
 const rows=readInventoryWorkbook(wb);
 assert.equal(rows.length,1);assert.equal(rows.importSummary.sourceRows,2);assert.equal(rows.importSummary.duplicates,1);assert.equal(rows[0].quantity,1);
 assert.equal(rows[0].description,'Primeira descrição');assert.equal(rows[0].olfactoryMemory,'Memória A');
 assert.ok(rows[0].duplicateRows[0].metadata.some(x=>x.value==='Memória B'));
 sh.getCell('B3').value='2 ml';assert.throws(()=>readInventoryWorkbook(wb),/Duplicata com quantidades/);
});

test('gr é convertido; aquisição já possuída deixa de ser sugerida',()=>{
 const rows=prepareInventory([['Habanolide','2 gr',1],['Helional','3 ml',1]]);
 assert.equal(rows[0].unit,'g');assert.equal(rows[0].quantity,2);assert.ok(rows.every(x=>x.enabled));
 const merged=mergeInventory([],rows);
 assert.equal(merged.inventory.filter(x=>/helional/i.test(x.name)).length,1);
 assert.equal(merged.inventory.filter(x=>!x.owned).length,2);
});
