import fs from 'node:fs/promises';import {prepareInventory,PURCHASES,DEFAULTS,FAMILIES,validateProfile,generate,batch} from '../src/engine.mjs';import {workbookSpec,exportExcel} from '../src/workbook.mjs';import ExcelJS from 'exceljs';
const inv=prepareInventory(JSON.parse(await fs.readFile(new URL('../private/inventory-rows.json',import.meta.url),'utf8'))).concat(PURCHASES);
const profile=validateProfile(FAMILIES.map((family,i)=>({family,score:[88,75,70,62,35,55,80,45,66,58,48,40][i],confidence:.6,evidence:8})),'Exemplo fictício, não é um cliente real');
const formulas=generate(profile,inv,DEFAULTS);const spec=workbookSpec(formulas,inv,'EXEMPLO FICTÍCIO · não utilizar como recomendação para cliente real');
await fs.writeFile(new URL('../private/sample-spec.json',import.meta.url),JSON.stringify(spec));
await fs.writeFile(new URL('../private/exemplo-runtime.xlsx',import.meta.url),await exportExcel(spec,ExcelJS));
console.log(JSON.stringify(formulas.map(f=>({id:f.id,ingredients:f.lines.length,cost50:batch(f,50).production,cost100:batch(f,100).production,newMaterials:f.lines.filter(l=>!l.item.owned).map(l=>l.item.name)}))));
// Client-format examples exercise the native import path without disclosing any real customer.
const catalog=JSON.parse(await fs.readFile(new URL('../data/odores_157.json',import.meta.url),'utf8'));
const ratings=Object.fromEntries(catalog.odors.map(o=>[o.id,{value:Math.round((({Amadeirado:9,Ambarado:8,Cítrico:8,Floral:7,Gourmand:3,Almiscarado:7,Verde:6,Aquático:5,Aromático:7,Frutado:6,Especiado:5,Terroso:4})[o.primaryFamily]??5)*2)/2,updatedAt:'2026-10-15T12:00:00Z'}]));
await fs.writeFile(new URL('../private/relatorio-ficticio.json',import.meta.url),JSON.stringify({schemaVersion:1,questionnaireMode:'detailed',ratings,unknownOdors:{}},null,2));
