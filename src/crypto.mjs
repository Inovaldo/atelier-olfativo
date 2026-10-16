const enc=new TextEncoder(),dec=new TextDecoder();
const to64=b=>{let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s);};
const from64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function seal(payload,username,password){
  if(password.length<16)throw Error('Use uma senha de pelo menos 16 caracteres.');
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await derive(password,salt);const header={version:1,username,iterations:600000,kdf:'PBKDF2-SHA256',cipher:'AES-256-GCM'};
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(JSON.stringify(header))},key,enc.encode(JSON.stringify(payload)));
  return {...header,salt:to64(salt),iv:to64(iv),data:to64(new Uint8Array(cipher))};
}
async function derive(password,salt){const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function unseal(vault,username,password){
  if(vault.version!==1||vault.iterations!==600000||vault.kdf!=='PBKDF2-SHA256'||vault.cipher!=='AES-256-GCM')throw Error('Cofre incompatível.');
  if(vault.username!==username)throw Error('Conta ou senha incorreta.');
  const {version,iterations,kdf,cipher}=vault;const header={version,username,iterations,kdf,cipher};
  try{const key=await derive(password,from64(vault.salt));const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(vault.iv),additionalData:enc.encode(JSON.stringify(header))},key,from64(vault.data));return JSON.parse(dec.decode(clear));}catch{throw Error('Conta, senha ou integridade do cofre inválida.');}
}
