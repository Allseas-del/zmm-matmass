# Builds the downloadable example template webapp/template_product.xml from the empty SAP template "Source data for Product"
# (LTMC, S/4HANA 2023): one HAWA and one SERV product, values taken from the DS4 test run file (1029465, 4502176), plant NL10.
import re, sys
SS = 'urn:schemas-microsoft-com:office:spreadsheet'
raw = open(sys.argv[1], encoding='utf-8').read()
import xml.etree.ElementTree as ET
clean = re.sub(r'</>|<(LS|EM|DS|AL|NP|ZH|ZK|LB|H)>', '', raw.lstrip('﻿').lstrip())
root = ET.fromstring(clean.encode())
cols = {}
for ws in root.findall(f'{{{SS}}}Worksheet'):
    name = ws.get(f'{{{SS}}}Name'); tab = ws.find(f'{{{SS}}}Table')
    if tab is None: continue
    rows = []
    for row in tab.findall(f'{{{SS}}}Row'):
        vals = {}; c = 0
        for cell in row.findall(f'{{{SS}}}Cell'):
            ci = cell.get(f'{{{SS}}}Index')
            if ci: c = int(ci) - 1
            d = cell.find(f'{{{SS}}}Data'); vals[c] = (d.text or '') if d is not None else ''
            c += 1 + int(cell.get(f'{{{SS}}}MergeAcross') or 0)
        rows.append(vals)
    for i, v in enumerate(rows[:15]):
        if (v.get(0) or '').startswith('S_'):
            cols[v[0]] = (name, {f: k for k, f in rows[i + 1].items() if f}); break
D = {
 'S_MARA': [
  dict(PRODUCT='HAWA-001', MTART='HAWA', MATKL='I079-125', MBRSH='M', MAKTX='E-CABLE,HELKMA,EXAMPLE', SPRAS='EN', MEINS='MTR', BISMT='0234114',
       NORMT='LKSM-HF NORMAL', GROES='3X4MM2 0.6/1KV', MSTAE='02', MSTDE='2024-12-19T00:00:00.000', BRGEW='0.2', NTGEW='0.2', GEWEI='KGM', EKWSL='7', VABME='1', TRAGR='STND'),
  dict(PRODUCT='SERV-001', MTART='SERV', MATKL='I037-108', MBRSH='M', MAKTX='SERVICE EXAMPLE', SPRAS='EN', MEINS='C62', MSTAE='02', MSTDE='2026-04-24T00:00:00.000', EKWSL='7', VABME='1'),
 ],
 'S_MARC': [
  dict(PRODUCT='HAWA-001', WERKS='NL10', DISMM='ND', DISPO='002', MTVFP='ST', PRCTR='G100', LADGR='0002', HERKL='NL', EKGRP='300', KAUTB='X', DISLS='EX', BESKZ='F', PERKZ='M'),
  dict(PRODUCT='SERV-001', WERKS='NL10', PRCTR='G100', EKGRP='300', KAUTB='X', PERKZ='M'),
 ],
 'S_MARD': [
  dict(PRODUCT='HAWA-001', WERKS='NL10', LGORT='1000'),
  dict(PRODUCT='HAWA-001', WERKS='NL10', LGORT='1001'),
 ],
 'S_MBEW': [
  dict(PRODUCT='HAWA-001', BWKEY='NL10', MLAST='2', BKLAS='Z519', VPRSV='V', WAERS='EUR', VERPR='4.38', PEINH='1'),
  dict(PRODUCT='SERV-001', BWKEY='NL10', BKLAS='Z270', VPRSV='S', WAERS='EUR', STPRS='1.0', PEINH='1'),
 ],
}
NUM = set('BRGEW NTGEW VERPR STPRS PEINH'.split()); DT = {'MSTDE'}
out = raw
for st, rows in D.items():
    name, col = cols[st]
    xml = ''
    for r in rows:
        t = lambda f: 'Number' if f in NUM else 'DateTime' if f in DT else 'String'
        cells = ''.join(f'<Cell ss:Index="{col[f] + 1}"><Data ss:Type="{t(f)}">{v}</Data></Cell>' for f, v in sorted(r.items(), key=lambda x: col[x[0]]))
        xml += f'<Row>{cells}</Row>\r\n'
    i = out.index(f'ss:Name="{name}"'); j = out.index('</Table>', i)
    out = out[:j] + xml + out[j:]
out = re.sub(r'\s+ss:ExpandedRowCount="\d+"', '', out)
open(sys.argv[2], 'w', encoding='utf-8').write(out)
print('ok', {k: len(v) for k, v in D.items()})
