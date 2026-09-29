from PIL import Image, ImageDraw
from pathlib import Path
folder=Path(__file__).parent
im=Image.new('RGBA',(256,256),(0,0,0,0)); d=ImageDraw.Draw(im)
d.rounded_rectangle((8,8,248,248),radius=48,fill='#254fc4')
for y,w in [(62,132),(112,92),(162,132)]:d.rounded_rectangle((60,y,60+w,y+26),radius=5,fill='white')
d.ellipse((172,111,198,137),fill='#70decd')
(folder/'build').mkdir(exist_ok=True)
im.save(folder/'build'/'icon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
im.save(folder/'ui'/'icon.png')
