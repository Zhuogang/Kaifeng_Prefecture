"""Native c2 comparisons and the unchanged lead's unmasked tight guide."""
import contextlib,io,json,os,runpy,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
root=Path(os.environ.get('X2_RENDER','out/X2'))
assert root==Path('out/X2') or Path('out/X2') in root.parents
dest=root/'native-crops';dest.mkdir(exist_ok=True)
im=Image.open(root/'view1.png').convert('RGB');ref=Image.open('refs/style/c2.png').convert('RGB')
assert im.size==(1920,1080)
items=[('tower',(1320,120,1900,535),(1190,90,1672,460)),('trunk',(0,290,350,900),(0,240,310,760)),('mid-willow',(1650,280,1900,510),(1090,260,1260,445)),('kerb',(200,750,740,1080),(165,640,650,941)),('bridge',(400,485,1660,650),(420,405,1450,568))]
for name,box,rbox in items:
 a=im.crop(box);b=ref.crop(rbox);a.save(dest/(name+'.png'));b.save(dest/(name+'-c2.png'))
 pair=Image.new('RGB',(a.width+b.width+16,max(a.height,b.height)+28),'#d8d1c1');pair.paste(b,(0,28));pair.paste(a,(b.width+16,28))
 d=ImageDraw.Draw(pair);d.text((6,8),'c2 - native crop',fill='#222222');d.text((b.width+22,8),'X2 view 1 - native 1080p crop',fill='#222222');pair.save(dest/(name+'-vs-c2.png'))
argv=sys.argv;sys.argv=['test/gates/look-zhou.py',str(root/'view1.png')]
with contextlib.redirect_stdout(io.StringIO()):guide=runpy.run_path('test/gates/look-zhou.py')
sys.argv=argv
result={'method':'Unmodified tight-box look-zhou.py; no saturation mask','regions':{}}
for label,path,k in [('c2','refs/style/c2.png',0),('before','out/X2/baseline/view1.png',1),('X2',str(root/'view1.png'),1)]:
 image=guide['load'](path);result['regions'][label]={name:guide['span'](image,pair[k]) for name,pair in guide['BOXES'].items()}
a=json.loads(Path('out/X2/baseline/render-metrics.json').read_text());b=json.loads((root/'render-metrics.json').read_text())
assert a['leafGeometry']==b['leafGeometry'],'accepted leaves retain positions, normals, UV, wind and indices'
result['leafGeometryUnchanged']=True
base={(m['view'],m['fraction']):m for m in a['metrics']}
result['reflection']=[{'view':m['view'],'fraction':m['fraction'],'identical':m['reflection']==base[m['view'],m['fraction']]['reflection']} for m in b['metrics'] if 'reflection' in m]
assert all(r['identical'] for r in result['reflection']),'all sampled complete reflection targets must be unchanged'
result['retainedViews']=[]
for m in b['metrics']:
 if m['view'] not in (5,6):continue
 name=f"view{m['view']}-f{m['fraction']:g}.png"
 aa=np.asarray(Image.open(Path('out/X2/baseline')/name).convert('RGBA'),dtype=np.int16);bb=np.asarray(Image.open(root/name).convert('RGBA'),dtype=np.int16)
 diff=np.abs(aa-bb);row={'view':m['view'],'fraction':m['fraction'],'maxChannelDifference':int(diff.max()),'changedPixels':int(np.any(diff,axis=2).sum())}
 result['retainedViews'].append(row)
(root/'measurements.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
