# Ateliê Olfativo — KI PARFUM

Página: https://inovaldo.github.io/atelier-olfativo/

Programa independente do questionário Meu DNA Olfativo. Recebe seu relatório JSON, CSV ou PDF e gera seis propostas de bancada e uma pasta Excel com quantidades de produto final para 50 g e 100 g. Três usam somente materiais existentes, três incluem ao menos uma aquisição sugerida. Calcula somente custo de produção, conforme solicitado.

## Acesso e privacidade

A página de entrada e o código genérico são públicos no GitHub Pages. O inventário inicial é publicado exclusivamente como texto cifrado AES-256-GCM, com chave derivada da senha por PBKDF2-SHA256, 600.000 iterações, salt aleatório e IV aleatório por gravação. O usuário é Inovaldo. Não há cadastro público, senha no código, servidor, envio de relatórios ou sincronização. A senha inicial aleatória de 32 caracteres fica no arquivo local `private/ACESSO.txt`, ignorado pelo Git.

O cofre é aberto na memória do navegador. Alterações de inventário e parâmetros são salvas cifradas no armazenamento local. O relatório do cliente e fórmulas geradas ficam somente em memória até o download. O botão Bloquear limpa a sessão e o relatório. Após 15 minutos sem interação a sessão é bloqueada. Relatórios e inventário não devem ser enviados pelo GitHub Issues. Extensões com acesso à página ou alguém usando uma sessão já aberta podem ler os dados; mantenha a sessão bloqueada quando ausente.

Use **Salvar cofre** e guarde o JSON criptografado. Para usar o mesmo inventário em outro dispositivo, selecione **Abrir backup de cofre**, informe a conta e a senha do backup. Os dados não sincronizam entre dispositivos. Limpar os dados do navegador perde alterações que não foram exportadas. O Excel exportado contém informações em texto aberto e deve ser guardado como documento privado. Não é um sistema de autenticação em servidor nem uma página privada do GitHub Enterprise. Para trocar ou revogar a senha do cofre inicial publicado, é necessário recriptografar e republicar esse cofre e atualizar os backups; não há promessa de revogação remota de arquivos já baixados.

## Uso

1. Abra a página e entre com as credenciais fornecidas localmente.
2. Confira **Inventário e cotações**. Os 42 itens vieram da planilha original. Informe densidades reais em g/mL e confirme identidades, diluições e SDS/IFRA. Se faltar densidade, o custo usa **1 g/mL provisoriamente**, marcado na tela e no Excel. O preço representa o lote inteiro; preço zero explícito é permitido, preço ausente fica pendente. Os itens a adquirir têm quantidade e preço vazios, não zero.
3. Ajuste dosagem dos materiais comerciais e despesas. Padrão de trabalho: 20% m/m de materiais comerciais e 80% da Base para perfume existente. Essa dosagem inclui diluições e não representa 20% de ativos puros. A composição e compatibilidade do veículo ainda precisam ser confirmadas. Embalagem e mão de obra começam em zero e ficam fora do custo até preenchidas.
4. Importe o relatório do cliente. Prefira JSON. JSON recalcula as famílias a partir das respostas originais e respeita o modo rápido. CSV usa a tabela de famílias do exportador original. PDF precisa da tabela completa de 12 famílias com evidências/cobertura/confiança; documentos ilegíveis ou sem tabela completa são recusados, com orientação para JSON/CSV. Notas zero contam; ausência e “não sei o cheiro” ficam fora. Relatório sem avaliações ou sem afinidades positivas é recusado para formulação.
5. Gere seis propostas e examine lacunas, famílias menos apreciadas e falta de estoque. Exporte o Excel. Arquivos maiores que 15 MB e PDF com mais de 50 páginas são recusados.

## Modelo e limitações

Heurística determinística, versão 1.0, sem modelo de IA externo ou validação sensorial. Usa as mesmas 12 famílias do questionário. Transforma afinidades acima de 45 em pesos positivos, atenua por confiança (mínimo heurístico 0,3), normaliza e ajusta duas variações priorizando famílias secundárias positivas e diferenças de composição. Ausência de dados não vira rejeição. Material com facetas de família rejeitada recebe penalidade no ajuste; conflitos remanescentes aparecem no resultado. Não há garantia de aceitação pelo cliente nem reprodução de perfume famoso.

Cada material recebe um vetor editorial de famílias, normalizado. A mistura é ajustada por gradiente projetado com soma 100% e tetos olfativos individuais. A representação por massa não mede intensidade olfativa real, interações ou evolução da fragrância. Tetos são pontos de partida conservadores relativos às faixas do inventário, **não limites seguros certificados**. Ao menos 0,2% de uma aquisição aparece em cada proposta com compras; quando não selecionada naturalmente pelo ajuste, serve como sugestão de avaliação, sem prova de melhora. O modelo pode apresentar paleta limitada, especialmente aquática, e solicita revisão.

Fixador Oficiales, Fixador Hedione, Aphermate, Almíscar Sintético Alta Fixação, Bacdanol Sandol e Base Oud começam excluídos por identidade/composição indefinida. Outros materiais comerciais também exigem documentação do fornecedor. Triacetina e veículos não são tratados como notas aromáticas. A Base para perfume entra como veículo; a base com fixador floral não é misturada automaticamente. A seleção pode ser alterada pelo responsável depois da revisão técnica.

Ambroxan solução 10% mantém massa da solução na pesagem e mostra ativo a 10%. Os demais teores ativos ficam não informados; nomes comerciais não provam pureza. Sólidos e quantidades traço exigem diluições de trabalho registradas e correção do balanço de solventes. O aplicativo não automatiza essa pré-diluição. Não usar diretamente na pele: revisar IFRA para produto final/categoria aplicável, constituintes restritos de todas as fontes, alérgenos, fototoxicidade, estabilidade e solubilidade. Não existe declaração de conformidade automática. Fontes: https://ifrafragrance.org/using-the-standards e https://ifrafragrance.org/standards-library

Aquisições propostas nesta versão: Cashmeran (madeira/âmbar), Helional (aquático/floral/verde) e Helvetolide (almíscar/frutado). Justificativas e fontes dos fabricantes acompanham o inventário e a aba Compras. A seleção depende do perfil; nem todos serão usados em um mesmo cliente. Melhora olfativa precisa ser confirmada em fita e com feedback, não é inferida como fato. Não são preços de mercado: é preciso cotar cada compra.

Custo por grama = preço do lote ÷ massa do lote. Para mL, massa do lote = volume × densidade. Custo material = massa pesada × custo/g. Custo de produção = materiais ÷ (1 − perda) + embalagem + mão de obra/despesas. Perda é premissa de custo, não altera a massa nominal listada. O estoque é verificado por proposta e lote nominal isolados; não reserva nem debita estoque e não considera produzir as seis simultaneamente. Sem cotação, custo total e resumo ficam “Pendente”, preservando os custos conhecidos por linha. Não calcula preço de venda.

## Desenvolvimento e publicação

Node 24, dependências fixadas em `package.json` e `pnpm-lock.yaml`. ExcelJS 4.4.0 para importação XLSX e exportação no próprio programa; PDF.js 5.4.624 para leitura de PDF. Bibliotecas são copiadas para `dist/vendor`, com licenças, sem CDN. O catálogo de cheiros é público e copiado do projeto original. `src/workbook.mjs` é a definição comum da planilha, com fórmulas editáveis de massa e custo, valores de cálculo iniciais e referências ao inventário e premissas. Mudança de preferências do cliente exige gerar novas propostas; editar custos e premissas recalcula os valores do Excel, sem reotimizar ingredientes.

```powershell
pnpm install --frozen-lockfile
node --test test/*.test.mjs
node tools/build.mjs
node tools/serve.mjs
```

Primeiro provisionamento local: `python tools/prepare_private.py` lê a planilha no diretório pai e `node tools/provision.mjs` cria cofre cifrado e credenciais. O provisionador recusa sobrescrever cofre existente. Não publicar `private/`, relatórios, exemplos com inventário em claro, arquivos Excel ou senhas. `tools/sample.mjs` cria apenas exemplo explicitamente fictício para teste, usando o inventário privado local. O teste automatizado usa um inventário sintético mínimo, não depende do arquivo particular.

Repositório independente: Inovaldo/atelier-olfativo. Código na branch main; build estático na gh-pages. O push de main não republica automaticamente a página: executar build e enviar `dist` para gh-pages. A planilha original, o cofre em claro e a senha nunca entram no Git. Não editar o aplicativo de clientes para publicar este programa.
