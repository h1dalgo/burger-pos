"""Convierte una foto de pizza vista desde arriba (fondo blanco) en las texturas y
alturas del 3D: public/food/pizza/.  Uso:  python scripts/bake-pizza.py public/food/pizza foto.webp
"""
import numpy as np, json, sys
from PIL import Image
from scipy import ndimage as nd
SRC = sys.argv[2] if len(sys.argv) > 2 else r'C:\Users\joseo\AppData\Local\Temp\claude\d5beeb8ed2fd2817\9bc3886a-5918-44b2-bd79-412f9da64c7e\images\6.webp'
OUT = sys.argv[1]
im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
H,W,_ = im.shape
r,g,b = im[...,0],im[...,1],im[...,2]
mx = im.max(-1); mn = im.min(-1); sat=(mx-mn)/np.maximum(mx,1)
fg = (sat>0.2)&(mx>50); fg = nd.binary_closing(fg, iterations=4); fg = nd.binary_opening(fg, iterations=3); fg = nd.binary_fill_holes(fg)
lab,n = nd.label(fg); sizes = nd.sum(fg, lab, range(1,n+1)); fg = lab==(1+np.argmax(sizes))
ys,xs=np.nonzero(fg); cx,cy=xs.mean(),ys.mean()
sauce = (r-g>80)&(r>140)
basil = (g>r*1.02)&(g>b*1.1)&(sat>0.3)
basil = nd.binary_dilation(nd.binary_opening(basil,iterations=1), iterations=3)
L0 = 0.3*r+0.59*g+0.11*b
shade = nd.binary_dilation(basil, iterations=10) & (L0 < 95)
mozz = (mx>215)&(sat<0.25)&fg
mozz = nd.binary_opening(mozz, iterations=2)

NA = 360
def at(x,y): return int(min(H-1,max(0,round(y)))), int(min(W-1,max(0,round(x))))
ro = np.zeros(NA); ri = np.zeros(NA)
for k in range(NA):
    a = 2*np.pi*k/NA; o=0
    for rr in np.arange(250,480,0.5):
        yy,xx = at(cx+np.cos(a)*rr, cy+np.sin(a)*rr)
        if fg[yy,xx]: o=rr
    ro[k]=o; run=0; ri[k]=o*0.82
    for rr in np.arange(o-15,o*0.6,-0.5):
        yy,xx = at(cx+np.cos(a)*rr, cy+np.sin(a)*rr)
        run = run+1 if (sauce[yy,xx] or basil[yy,xx]) else 0
        if run>=6: ri[k]=rr+3; break
def circ_smooth(v, w):
    p = np.concatenate([v[-w:],v,v[:w]])
    med = np.array([np.median(p[i:i+2*w+1]) for i in range(len(v))])
    return nd.gaussian_filter1d(med, w/2, mode='wrap')
ro = circ_smooth(ro, 3) - 2.0
ri = np.clip(circ_smooth(ri, 12), ro*0.8, ro*0.87)
Rn = ro.max()
print('ro', ro.min(), ro.max(), 'ri/ro', (ri/ro).min(), (ri/ro).max())

# ---- texturas de color: cuadro centrado, fuera de la pizza se extiende el borde ----
T = 1024; HALF = Rn*1.03
gx, gy = np.meshgrid(np.arange(T), np.arange(T))
px = cx + (gx+0.5-T/2)/(T/2)*HALF; py = cy + (gy+0.5-T/2)/(T/2)*HALF
def sample(arr, px, py, order=1):
    if arr.ndim==3: return np.stack([nd.map_coordinates(arr[...,c], [py,px], order=order, mode='nearest') for c in range(arr.shape[2])], -1)
    return nd.map_coordinates(arr.astype(float), [py,px], order=order, mode='nearest')
# relleno del fondo: cada píxel de fondo toma el color del píxel de pizza más cercano (algo hacia adentro)
inner = nd.binary_erosion(fg, iterations=4)
_, (iy, ix) = nd.distance_transform_edt(~inner, return_indices=True)
filled = im[iy, ix]

def inpaint(img, mask):
    """Tapa la máscara copiando la pizza girada (la salsa y el queso se parecen en todo el círculo)."""
    res = img.copy(); todo = mask.copy()
    yy, xx = np.nonzero(todo)
    dx, dy = xx-cx, yy-cy
    rad = np.hypot(dx, dy); ang = np.arctan2(dy, dx)
    got = np.zeros(len(yy), bool); src = np.zeros((len(yy),3))
    bad = nd.binary_dilation(basil|shade|mozz, iterations=6) | ~nd.binary_erosion(fg, iterations=60)
    cands = [('t', dx_, dy_) for dx_, dy_ in [(150,40),(-140,60),(60,-150),(-50,150),(170,-90),(-160,-100),(110,130),(-120,-150)]]
    cands += [('r', deg, 0) for deg in [37, 73, 109, 151, 197, 241, 283, 323, 19, 55, 91, 131, 173, 217, 263, 307]]
    center = rad < 140
    for kind, p1, p2 in cands:
        if kind == 't':
            sx, sy = xx + p1, yy + p2; use = center
        else:
            a2 = ang + np.radians(p1)
            sx, sy = cx+np.cos(a2)*rad, cy+np.sin(a2)*rad; use = ~center
        sx = np.clip(np.round(sx).astype(int),0,W-1); sy = np.clip(np.round(sy).astype(int),0,H-1)
        ok = ~got & use & ~bad[sy,sx]
        src[ok] = img[sy[ok], sx[ok]]; got |= ok
    for kind, p1, p2 in cands:  # lo que quede, de donde sea
        if kind != 't': continue
        sx = np.clip(xx+p1,0,W-1); sy = np.clip(yy+p2,0,H-1)
        ok = ~got & ~bad[sy,sx]; src[ok] = img[sy[ok], sx[ok]]; got |= ok
    res[yy, xx] = src
    # costura suave
    feather = nd.gaussian_filter(mask.astype(float), 2.5)[...,None]
    blur = nd.gaussian_filter(res, (1.2,1.2,0))
    edge = (feather>0.05)&(feather<0.95)
    res = np.where(edge, blur, res)
    return res

basil_big = nd.binary_dilation(basil|shade, iterations=4)
nob = inpaint(filled, basil_big)
# blanca (cuatro quesos): la salsa se vuelve queso derretido dorado
lum = (0.3*nob[...,0]+0.59*nob[...,1]+0.11*nob[...,2])
redness = np.clip((nob[...,0]-nob[...,1]-40)/50,0,1)
YY, XX = np.mgrid[0:H, 0:W]
angi = ((np.arctan2(YY-cy, XX-cx) % (2*np.pi))/(2*np.pi)*NA).astype(int) % NA
interior = np.hypot(XX-cx, YY-cy) < (ri[angi] - 16)
redness = redness*interior
redness = nd.gaussian_filter(redness, 1.5)
ln = (lum - lum[redness>0.5].mean())/ (lum[redness>0.5].std()+1e-6)
k = np.clip(0.92 + ln*0.08, 0.7, 1.1)[...,None]
cheese = np.array([250, 232, 182])[None,None,:]*k
brown = np.clip(nd.gaussian_filter(np.random.default_rng(5).random(lum.shape), 6)*8-3.6, 0, 1)[...,None]
gold = np.clip(nd.gaussian_filter(np.random.default_rng(9).random(lum.shape), 3)*10-4.6, 0, 1)[...,None]
cheese = cheese*(1-gold*0.6) + np.array([238,176,72])*gold*0.6
cheese = cheese*(1-brown*0.35) + np.array([196,128,58])*brown*0.35
bianca = nob*(1-redness[...,None]) + cheese*redness[...,None]

for name, img in [('pizza-margarita', filled), ('pizza-base', nob), ('pizza-blanca', bianca)]:
    t = sample(img, px, py).clip(0,255).astype(np.uint8)
    Image.fromarray(t).save(f'{OUT}/{name}.webp', quality=88, method=6)

# ---- textura auxiliar: R = relieve fino, G = rugosidad ----
L = (0.3*filled[...,0]+0.59*filled[...,1]+0.11*filled[...,2])
fine = np.clip(128 + (L - nd.gaussian_filter(L, 4))*2.2, 0, 255)
wet = np.clip((r-g-50)/60,0,1)  # salsa: brillante
leaf = basil.astype(float)
dry = 1 - np.maximum(wet, leaf*0.8)
rough = np.clip(0.38 + dry*0.42 - mozz*0.1, 0, 1)*255
rough = nd.gaussian_filter(rough, 2)
fill2 = lambda a: a[iy, ix]
aux = np.stack([fill2(fine), fill2(rough), np.zeros_like(L)], -1)
Image.fromarray(sample(aux, px, py).clip(0,255).astype(np.uint8)).resize((512,512), Image.LANCZOS).save(f'{OUT}/pizza-aux.webp', quality=90, method=6)

# ---- alturas en coordenadas polares: filas = radio normalizado (0..1 de ro), columnas = ángulo ----
NR, NT = 128, 360
def heights(with_basil):
    hm = np.zeros((NR, NT))
    mozz_s = nd.gaussian_filter(mozz.astype(float), 3)
    basil_s = nd.gaussian_filter(basil.astype(float), 2.5)
    Ls = nd.gaussian_filter(L, 2)
    darkcrust = np.clip((170 - Ls)/80, 0, 1)
    for k in range(NT):
        a = 2*np.pi*k/NT
        for i in range(NR):
            rho = i/(NR-1)
            rr = rho*ro[k]
            x, y = cx+np.cos(a)*rr, cy+np.sin(a)*rr
            yy, xx = at(x,y)
            s = (rr - ri[k])/(ro[k]-ri[k])
            base = 0.035
            if s <= 0:
                h = base
                h += mozz_s[yy,xx]*0.03
                if with_basil: h += basil_s[yy,xx]*0.022
                h += (Ls[yy,xx]-150)/255*0.008
            else:
                PEAK, EDGE = 0.13, 0.075
                if s < 0.5:
                    t = s/0.5; h = base + (PEAK-base)*np.sin(t*np.pi/2)
                else:
                    u = (s-0.5)/0.5; h = PEAK - (PEAK-EDGE)*u*u
                h += darkcrust[yy,xx]*0.02*np.sin(np.pi*s)
            hm[i,k]=h
    return hm
out = {}
for nm, wb in [('pizza-h-margarita', True), ('pizza-h-base', False)]:
    hm = heights(wb)
    out[nm] = float(hm.max())
    Image.fromarray((hm/0.24*255).clip(0,255).astype(np.uint8)).save(f'{OUT}/{nm}.png', optimize=True)
meta = {'ro': [round(v/Rn,4) for v in ro], 'half': 1.03, 'hmax': 0.24}
json.dump(meta, open(f'{OUT}/meta.json','w'))
print('ok', out)
