# Inserts test rows into the original (unsanitized) SAP template, so the tool's sanitizer is tested as well.
import re, xml.etree.ElementTree as ET, sys
SS='urn:schemas-microsoft-com:office:spreadsheet'
raw=open(sys.argv[1],encoding='utf-8').read()
clean=re.sub(r'</>|<(LS|EM|DS|AL|NP|ZH|ZK|LB|H)>','',raw.lstrip('﻿').lstrip())
root=ET.fromstring(clean.encode())
cols={}
for ws in root.findall(f'{{{SS}}}Worksheet'):
    name=ws.get(f'{{{SS}}}Name'); tab=ws.find(f'{{{SS}}}Table')
    if tab is None: continue
    rows=[]; 
    for row in tab.findall(f'{{{SS}}}Row'):
        vals={}; c=0
        for cell in row.findall(f'{{{SS}}}Cell'):
            ci=cell.get(f'{{{SS}}}Index')
            if ci: c=int(ci)-1
            d=cell.find(f'{{{SS}}}Data'); vals[c]=(d.text or '') if d is not None else ''
            c+=1+int(cell.get(f'{{{SS}}}MergeAcross') or 0)
        rows.append(vals)
    for i,v in enumerate(rows[:15]):
        if (v.get(0) or '').startswith('S_'):
            cols[v[0]]=(name,{f:k for k,f in rows[i+1].items() if f})
            break
D={
 'S_MARA':[
  dict(PRODUCT='ZTEST-001',MTART='ZSPA',MATKL='P1010',MBRSH='M',MAKTX='Test bolt M12 x 40',SPRAS='EN',MEINS='PCE',GROES='M12X40',BRGEW='0.05',NTGEW='0.045',GEWEI='KGM',XCHPF='',MFRPN='ABC-123',ZZ1_MFRPN_PRD='ABC-123',ZZ1_NMOD_PRD='BOLT, HEX',ZZ1_SERNP_PRD='X',BSTME='PCE',MSTAE='',TRAGR='0001',RAUBE='01'),
  dict(PRODUCT='ZTEST-002',MTART='ZSPA',MATKL='P1010',MBRSH='M',MAKTX='Test gasket DN50',SPRAS='EN',MEINS='PCE',BRGEW='0.2',GEWEI='KGM',ZZ1_MATRL_PRD='EPDM'),
  dict(PRODUCT='ZTEST-003',MTART='ZSPA',MATKL='P1010',MBRSH='M',MAKTX='Test valve with wrong plant',SPRAS='EN',MEINS='PCE'),
 ],
 'S_MAKT':[dict(PRODUCT='ZTEST-001',SPRAS='NL',MAKTX='Testbout M12 x 40')],
 'S_MARM':[dict(PRODUCT='ZTEST-001',MEINH='BX',UMREZ='50',UMREN='1',BRGEW='2.5',GEWEI='KGM')],
 'S_MEAN':[dict(PRODUCT='ZTEST-001',MEINH='BX',EAN11='4006381333931',EANTP='HE')],
 'S_MARC':[
  dict(PRODUCT='ZTEST-001',WERKS='NL01',DISMM='PD',DISPO='001',EKGRP='100',PLIFZ='14',MINBE='10',XMCNG=''),
  dict(PRODUCT='ZTEST-002',WERKS='NL01',DISMM='ND',EKGRP='100'),
  dict(PRODUCT='ZTEST-003',WERKS='ZZZZ',DISMM='ND')],
 'S_MARD':[dict(PRODUCT='ZTEST-001',WERKS='NL01',LGORT='0001',LGPBE='A-01-01')],
 'S_MBEW':[dict(PRODUCT='ZTEST-001',BWKEY='NL01',BKLAS='3000',VPRSV='V',WAERS='EUR',VERPR='1.25',PEINH='1'),
           dict(PRODUCT='ZTEST-002',BWKEY='NL01',BKLAS='3000',VPRSV='V',WAERS='EUR',VERPR='12.5',PEINH='1')],
 'S_CLASS':[dict(PRODUCT='ZTEST-001',CLASS='ZSPARE',CLASSTYPE='001')],
}
NUM=set('BRGEW NTGEW UMREZ UMREN PLIFZ MINBE VERPR PEINH'.split())
out=raw
for st,rows in D.items():
    name,col=cols[st]
    xml=''
    for r in rows:
        cells=''.join(f'<Cell ss:Index="{col[f]+1}"><Data ss:Type="{"Number" if f in NUM else "String"}">{v}</Data></Cell>' for f,v in sorted(r.items(),key=lambda x:col[x[0]]) if v!='')
        xml+=f'<Row>{cells}</Row>\r\n'
    i=out.index(f'ss:Name="{name}"'); j=out.index('</Table>',i)
    out=out[:j]+xml+out[j:]
# Excel's ExpandedRowCount would be too small now; drop it (SAP/Excel do not need it)
out=re.sub(r'\s+ss:ExpandedRowCount="\d+"','',out)
open(sys.argv[2],'w',encoding='utf-8').write(out)
print('ok', {k:len(v) for k,v in D.items()})
