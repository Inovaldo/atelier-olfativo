import fs from 'node:fs/promises';
import {prepareInventory,PURCHASES,DEFAULTS} from '../src/engine.mjs';
import {seal} from '../src/crypto.mjs';
import {randomBytes} from 'node:crypto';
try{await fs.access(new URL('../vault.enc.json',import.meta.url));throw Error('Cofre já existente. Preserve os dados e credenciais; não sobrescreva o cofre.');}catch(e){if(e.code!=='ENOENT')throw e;}
const rows=JSON.parse(await fs.readFile(new URL('../private/inventory-rows.json',import.meta.url),'utf8'));
const inventory=prepareInventory(rows).concat(PURCHASES);
const password=randomBytes(24).toString('base64url');
const vault=await seal({inventory,settings:DEFAULTS},'Inovaldo',password);
await fs.writeFile(new URL('../vault.enc.json',import.meta.url),JSON.stringify(vault));
await fs.writeFile(new URL('../private/ACESSO.txt',import.meta.url),'ATELIÊ OLFATIVO\nPágina: https://inovaldo.github.io/atelier-olfativo/\nConta: Inovaldo\nSenha: '+password+'\n\nGuarde este arquivo fora do GitHub. Senha gerada aleatoriamente. O cofre inicial está criptografado na página; alterações são locais ao navegador. Exporte o cofre para backup ou uso em outro dispositivo.\n');
console.log('Cofre criptografado criado. Credenciais salvas somente em private/ACESSO.txt.');
