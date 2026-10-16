"""Publica somente o programa genérico e o cofre cifrado. Credencial fica em memória."""
import json,os,subprocess,sys,urllib.request,urllib.error
REPO='Inovaldo/atelier-olfativo'
env=os.environ.copy();env['GIT_TERMINAL_PROMPT']='0';env['GCM_INTERACTIVE']='Never'
result=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,env=env,check=True)
credential=dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
headers={'Authorization':'Bearer '+credential['password'],'Accept':'application/vnd.github+json','User-Agent':'atelier-olfativo-deploy','X-GitHub-Api-Version':'2022-11-28'}
def api(path,method='GET',data=None):
    req=urllib.request.Request('https://api.github.com'+path,headers=headers,method=method,data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req,timeout=40) as response:
            raw=response.read();return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        print(json.dumps({'status':error.code,'message':json.loads(error.read()).get('message')}));raise SystemExit(1)
if api('/user')['login'].lower()!='inovaldo':raise SystemExit('Conta autenticada diferente da esperada.')
if sys.argv[1]=='create':
    r=api('/user/repos','POST',{'name':'atelier-olfativo','private':False,'auto_init':False,'description':'Ateliê Olfativo: formulação exploratória, cofre criptografado local e custos de produção.','homepage':'https://inovaldo.github.io/atelier-olfativo/'})
    print(json.dumps({'repository':r['html_url'],'private':r['private']}))
elif sys.argv[1]=='status':
    r=api('/repos/'+REPO+'/pages');print(json.dumps({'url':r.get('html_url'),'status':r.get('status'),'source':r.get('source')}))
    b=api('/repos/'+REPO+'/pages/builds/latest');print(json.dumps({'build':b.get('status'),'error':b.get('error'),'commit':b.get('commit')}))
