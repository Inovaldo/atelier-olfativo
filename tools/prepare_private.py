import json,pathlib,openpyxl
root=pathlib.Path(__file__).resolve().parents[1]
w=openpyxl.load_workbook(root.parent/'inventario_perfumaria_classificado.xlsx',data_only=True)
rows=list(w['Inventário detalhado'].values)[1:]
(root/'private'/'inventory-rows.json').write_text(json.dumps(rows,ensure_ascii=False),encoding='utf-8')
print(f'Inventário local extraído: {len(rows)} materiais. Nenhum dado publicado.')
