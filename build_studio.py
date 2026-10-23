import bpy, math, random, os, sys
from mathutils import Vector
from math import pi, sin, cos

ROOT = os.path.dirname(os.path.abspath(__file__))
random.seed(23)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection': bpy.data.collections.remove(c)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
collections={}
for name in ['Architecture','Furniture','Chair','Equipment','Decorations','Lighting','Cameras']:
    c=bpy.data.collections.new(name); scene.collection.children.link(c); collections[name]=c
group='Architecture'
def organize(o):
    for c in list(o.users_collection): c.objects.unlink(o)
    collections[group].objects.link(o)
    return o
def mat(name,color,rough=.5,metal=0,emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
    return m
white=mat('Warm porcelain | furniture',(.79,.77,.79),.32)
edge=mat('Soft white | chair frame',(.84,.83,.86),.34)
wall=mat('Muted blue violet plaster',(.12,.15,.26),.82)
trim=mat('Deep lavender wall edges',(.11,.14,.26),.65)
black=mat('Graphite satin',(.018,.021,.027),.33)
rubber=mat('Soft charcoal rubber',(.035,.035,.042),.9)
silver=mat('Brushed aluminium',(.44,.46,.5),.28,.65)
lav=mat('Indigo woven upholstery',(.13,.095,.36),.88)
paper=mat('Warm art paper',(.88,.83,.84),.85)
pink=mat('Orchid pink',(.65,.045,.20),.55)
blue=mat('Cobalt violet',(.095,.09,.57),.55)
peach=mat('Warm neon', (1,.27,.075),.25,emission=3)
palette=[mat('Book pastel %02d'%i,col) for i,col in enumerate([(.24,.105,.57),(.43,.22,.65),(.80,.19,.43),(.10,.29,.69),(.53,.58,.77),(.085,.075,.28)])]
def cube(name,loc,scale,material,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=organize(bpy.context.object); o.name=name
    o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if material:o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('Soft manufactured edges','BEVEL'); mod.width=bevel; mod.segments=3
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def uv(name,loc,scale,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc);o=organize(bpy.context.object);o.name=name;o.scale=scale;o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    return o
def cyl(name,loc,radius,depth,material,rotation=None,vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc);o=organize(bpy.context.object);o.name=name
    if rotation:o.rotation_euler=rotation
    o.data.materials.append(material); b=o.modifiers.new('Edge radius','BEVEL');b.width=.006;b.segments=3
    o.modifiers.new('Normals','WEIGHTED_NORMAL')
    return o
def rod(name,a,b,r,material):
    a,b=Vector(a),Vector(b);o=cyl(name,(a+b)/2,r,(b-a).length,material);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def curve(name,points,r,material,cyclic=False):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.bevel_depth=r;d.bevel_resolution=3
    s=d.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    s.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,d);collections[group].objects.link(o);d.materials.append(material);return o
def noise_bump(m,scale,strength,distance,stretch=None):
    n=m.node_tree.nodes;l=m.node_tree.links;p=next(x for x in n if x.type=='BSDF_PRINCIPLED')
    tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=scale;tex.inputs['Detail'].default_value=3
    if stretch:
        co=n.new('ShaderNodeTexCoord');v=n.new('ShaderNodeVectorMath');v.operation='MULTIPLY';v.inputs[1].default_value=stretch;l.new(co.outputs['Generated'],v.inputs[0]);l.new(v.outputs[0],tex.inputs['Vector'])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=strength;bump.inputs['Distance'].default_value=distance;l.new(tex.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
noise_bump(wall,130,.12,.012)
noise_bump(lav,180,.35,.014)
# The corner is at (-2,2); the open front faces the camera.
cube('Raised diorama foundation',(0,0,-.13),(4.24,4.24,.26),trim,.025)
cube('Left wall',(-2.04,0,1.4),(.16,4.2,2.8),wall,.008)
cube('Back wall',(0,2.04,1.4),(4.2,.16,2.8),wall,.008)
cube('Left wall top',(-2.04,0,2.805),(.18,4.2,.035),trim,.004)
cube('Corner cap',(-2.04,2.04,2.805),(.18,.18,.035),trim,.004)
cube('Back wall top',(0,2.04,2.805),(4.2,.18,.035),trim,.004)
woods=[]
for i in range(7):
    w=mat('Whitewashed oak %d'%i,(.32+i*.012,.215+i*.010,.15+i*.009),.57);noise_bump(w,5,.23,.008,(3,140,4));woods.append(w)
for j in range(22):
    y=-1.91+j*.182
    breaks=[-1.96]+([-.9,.72] if j%3==0 else [-.1,1.45] if j%3==1 else [-1.4,.3])+[1.96]
    for i,(a,b) in enumerate(zip(breaks,breaks[1:])):cube('Oak plank %02d %d'%(j,i),((a+b)/2,y,.012),(b-a-.008,.175,.027),random.choice(woods),.003)
cube('Back skirting',(0,1.938,.065),(3.98,.035,.13),white,.005)
cube('Left skirting',(-1.938,0,.065),(.035,3.98,.13),white,.005)
# Door lies on the left wall.
cube('Door casing',(-1.938,-1.21,1.17),(.065,1.12,2.34),white,.012)
cube('Door inset',(-1.894,-1.21,1.15),(.033,.97,2.22),paper,.008)
for y,z,h in [(-1.51,1.21,1.77),(-1.24,1.21,1.77),(-.97,1.2,1.2)]:cube('Acoustic door inset',(-1.868,y,z),(.026,.19,h),rubber,.006)
for z in [.26,1.18,2.12]:cyl('Door hinge',(-1.85,-1.72,z),.016,.1,black)
cube('Handle backplate',(-1.85,-1.59,.91),(.025,.055,.14),silver,.008)
rod('Door handle',(-1.82,-1.59,.92),(-1.76,-1.59,.92),.018,black)
rod('Door lever',(-1.76,-1.59,.92),(-1.76,-1.44,.92),.018,black)
group='Furniture'
FLOOR_TOP = .0255
RUG_TOP = .060

def rounded_outline(cx,cy,w,h,r,z,steps=12):
    points=[]
    for x,y,start in [(cx+w/2-r,cy+h/2-r,0),(cx-w/2+r,cy+h/2-r,90),
                      (cx-w/2+r,cy-h/2+r,180),(cx+w/2-r,cy-h/2+r,270)]:
        for i in range(steps+1):
            a=math.radians(start+90*i/steps)
            points.append((x+r*cos(a),y+r*sin(a),z))
    return points

def rounded_slab(name,center,w,h,depth,r,material):
    x,y,z=center
    bottom=rounded_outline(x,y,w,h,r,z-depth/2)
    top=rounded_outline(x,y,w,h,r,z+depth/2)
    n=len(top);verts=bottom+top
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);collections[group].objects.link(o);mesh.materials.append(material)
    bevel=o.modifiers.new('Soft textile edge','BEVEL');bevel.width=.003;bevel.segments=3
    o.modifiers.new('Textile normals','WEIGHTED_NORMAL')
    return o

rugmat=mat('Rug | indigo jacquard weave',(.16,.10,.43),.96)
n=rugmat.node_tree.nodes;l=rugmat.node_tree.links
p=next(a for a in n if a.type=='BSDF_PRINCIPLED')
p.inputs['Sheen Weight'].default_value=.28
co=n.new('ShaderNodeTexCoord')
noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=19;noise.inputs['Detail'].default_value=3
l.new(co.outputs['Object'],noise.inputs['Vector'])
ramp=n.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].color=(.035,.015,.16,1)
ramp.color_ramp.elements[1].color=(.13,.06,.38,1)
l.new(noise.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],p.inputs['Base Color'])
weaves=[]
for direction in ['X','Y']:
    wave=n.new('ShaderNodeTexWave');wave.wave_type='BANDS';wave.bands_direction=direction
    wave.inputs['Scale'].default_value=155;wave.inputs['Distortion'].default_value=1.2
    l.new(co.outputs['Object'],wave.inputs['Vector']);weaves.append(wave)
mix=n.new('ShaderNodeMath');mix.operation='MULTIPLY'
for i,wave in enumerate(weaves):l.new(wave.outputs['Fac'],mix.inputs[i])
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.32;bump.inputs['Distance'].default_value=.0015
l.new(mix.outputs[0],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
rounded_slab('Lavender woven rug',(.38,-.47,.043),2.85,2.45,.034,.075,rugmat)
thread=mat('Rug | raised floral thread',(.26,.12,.51),.97)
binding=mat('Rug | dark bound edge',(.075,.045,.20),.95)
stitch=mat('Rug | lavender stitching',(.47,.35,.72),.95)
curve('Rug bound perimeter',rounded_outline(.38,-.47,2.826,2.426,.07,.054),.005,binding,True)
curve('Rug inner woven border',rounded_outline(.38,-.47,2.71,2.31,.065,.060),.0015,stitch,True)
for ix in range(11):
    for iy in range(9):
        x=.38+(ix-5)*.236;y=-.47+(iy-4)*.236
        pts=[]
        for k in range(65):
            t=2*pi*k/64;r=.073+.017*cos(4*t)
            pts.append((x+r*cos(t),y+r*sin(t),RUG_TOP+.0004))
        curve('Rug jacquard floral medallion',pts,.0012,thread,True)
        curve('Rug medallion centre',[(x+.018*cos(k*pi/12),y+.018*sin(k*pi/12),RUG_TOP+.0004) for k in range(24)],.0008,thread,True)
# Real short stitches along the bound edge, visible in detail views.
outline=rounded_outline(.38,-.47,2.79,2.39,.07,.060,steps=32)
for a,b in zip(outline,outline[1:]+outline[:1]):
    a,b=Vector(a),Vector(b);length=(b-a).length
    for i in range(max(1,int(length/.018))):
        t=(i+.25)/max(1,int(length/.018));u=min(1,t+.35/max(1,int(length/.018)))
        curve('Rug edge stitch',[a.lerp(b,t),a.lerp(b,u)],.0008,stitch)

# Cabinet at the rear left.
cx=-1.36;cy=1.43
cube('Bookshelf back',(cx,1.754,1.33),(1.12,.045,2.56),white)
for x in [cx-.56,cx+.56]:cube('Bookshelf side',(x,cy,1.32),(.055,.69,2.6),white)
for z in [.065,1.15,1.68,2.62]:cube('Bookshelf shelf',(cx,cy,z),(1.15,.71,.05),white)
for x in [cx-.285,cx+.285]:cube('Bookshelf lower cabinet door',(x,1.068,.62),(.559,.035,1.03),white,.008)
cube('Bookshelf toe kick',(cx,1.45,.055),(1.05,.58,.1),white)
# Sideboard against left wall.
cube('Side cabinet carcass',(-1.66,-.02,.44),(.56,1.31,.84),white)
cube('Side cabinet top',(-1.64,-.02,.88),(.61,1.36,.045),white)
for y in [-.45,-.02,.41]:cube('Sideboard door',(-1.365,y,.45),(.025,.419,.79),white,.006)
# Desk.
cube('Desk top',(.66,1.18,.93),(2.55,.86,.065),white,.018)
for x in [-.56,1.88]:
    for y in [.82,1.54]:cube('Desk square leg',(x,y,.465),(.045,.045,.9),white,.007)
cube('Desk rear apron',(.66,1.54,.79),(2.42,.035,.21),white,.008)
cube('Desk left apron',(-.56,1.18,.81),(.035,.7,.17),white,.008)
group='Decorations'
for i in range(10):
    x=-1.86+i*.066
    o=cube('Upright book %02d'%i,(x,1.42,2.09),(.056,.37,.66-random.uniform(0,.08)),palette[i%6],.005)
    cube('Book spine line',(x,1.229,1.9),(.041,.004,.009),paper,.001)
for i in range(3):cube('Stacked shelf book',(-1.62,1.36,1.205+i*.061),(.37,.34,.053),palette[3-i],.006)
for i in range(4):
    x=-1.15+i*.097;cube('Ring binder',(x,1.36,1.415),(.085,.34,.43),palette[4],.004)
    cyl('Binder finger ring',(x,1.185,1.29),.014,.006,black,(pi/2,0,0))
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=.115,location=(-.99,1.41,1.82));o=organize(bpy.context.object);o.name='Faceted ceramic sculpture';o.scale=(.8,.8,1.2);o.data.materials.append(paper)
for i in range(3):cube('Sideboard stacked book',(-1.59,-.35,.94+i*.054),(.36,.4,.049),palette[i],.008)
cube('Pencil cup',(-1.58,.39,1),(.13,.13,.21),paper,.005)
cube('Cup hollow opening',(-1.58,.39,1.107),(.105,.105,.003),wall,.002)
# Framed artwork, constructed as local x/z planes looking towards -y.
def polygon(name,verts,material):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[list(range(len(verts)))]);mesh.update();o=bpy.data.objects.new(name,mesh);collections[group].objects.link(o);mesh.materials.append(material);return o
def art(name,loc,w,h,kind='abstract',left=False):
    before=set(bpy.data.objects)
    cube(name+' frame',(0,0,0),(w,.028,h),black,.008)
    cube(name+' mat',(0,-.019,0),(w-.027,.012,h-.027),paper,.002)
    aw=w*.77;ah=h*.77
    cube(name+' field',(0,-.027,0),(aw,.003,ah),palette[1],.001)
    if kind=='landscape':
        cyl(name+' sunset',(-aw*.23,-.031,ah*.18),aw*.19,.003,mat(name+' sun',(.95,.67,.71)),(pi/2,0,0))
        for k in range(3):
            pts=[(-aw/2,-.034-k*.002,-ah/2)]+[( -aw/2+aw*i/8,-.034-k*.002,-ah*.12+ah*.21*sin(i*1.7+k)+k*-.11) for i in range(9)]+[(aw/2,-.034-k*.002,-ah/2)]
            polygon(name+' mountains',pts,palette[3 if k==0 else 0 if k==1 else 5])
    elif kind=='nodes':
        for i in range(3):
            x=-aw*.28+i*aw*.28;rod(name+' connector',(x,-.035,-ah*.34),(x,-.035,ah*.34),.003,blue)
            for z in [-ah*.33,ah*.30]:cyl(name+' node',(x,-.038,z),aw*.055,.004,blue,(pi/2,0,0))
        cyl(name+' disc',(0,-.034,-ah*.1),aw*.44,.003,palette[0],(pi/2,0,0))
    else:
        for i in range(4):cube(name+' geometric shape',(-aw*.18+i*aw*.1,-.034-i*.002,ah*.2-i*ah*.14),(aw*.43,.002,ah*.36),palette[[3,0,2,5][i]],.001)
    made=set(bpy.data.objects)-before
    from mathutils import Matrix
    rot=Matrix.Rotation(pi/2,4,'Z') if left else Matrix.Identity(4)
    for o in made:o.matrix_world=Matrix.Translation(Vector(loc))@rot@o.matrix_world
art('Sunset print',(-1.89,-.33,1.93),.65,1.01,'landscape',True)
art('Connected nodes',(-1.89,.30,2.25),.32,.65,'nodes',True)
art('Stacked geometry',(-1.89,.30,1.61),.34,.51,'abstract',True)
art('Back abstract',(-.38,1.933,2.21),.53,.66)
art('Right nodes',(1.7,1.933,2.17),.43,.73,'nodes')
art('Right geometry',(1.7,1.933,1.5),.43,.44)
# Lettering: text plane local XY, front normal towards the room.
font='/System/Library/Fonts/Supplemental/Arial.ttf'
d=bpy.data.curves.new('LeonBleriot lettering','FONT');d.body='LeonBleriot';d.size=.32;d.extrude=.003;d.bevel_depth=.0015
if os.path.exists(font):d.font=bpy.data.fonts.load(font)
o=bpy.data.objects.new('LeonBleriot | glowing wall sign',d);collections[group].objects.link(o);o.location=(.0,1.925,2.07);o.rotation_euler=(pi/2,0,0);d.materials.append(peach)
group='Equipment'
# Procedural monitor landscapes in local coordinates.
def screen(name,x,y,z,w,h):
    cube(name+' bezel',(x,y,z),(w,.044,h),black,.012)
    sky=mat(name+' luminous pastel sky',(.5,.38,.7),.5,emission=.65)
    n=sky.node_tree.nodes;l=sky.node_tree.links;p=next(a for a in n if a.type=='BSDF_PRINCIPLED');tc=n.new('ShaderNodeTexCoord');sep=n.new('ShaderNodeSeparateXYZ');r=n.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(.025,.07,.50,1);r.color_ramp.elements[1].color=(.20,.025,.48,1);e=r.color_ramp.elements.new(.48);e.color=(.75,.055,.23,1);l.new(tc.outputs['Generated'],sep.inputs[0]);l.new(sep.outputs['Z'],r.inputs[0]);l.new(r.outputs[0],p.inputs['Base Color']);l.new(r.outputs[0],p.inputs['Emission Color'])
    cube(name+' display',(x,y-.024,z),(w-.026,.003,h-.026),sky,.002)
    for k in range(4):
        base=z-h/2+.014; yy=y-.028-k*.001
        verts=[(x-w/2+.014,yy,base)]
        for i in range(14):
            xx=x-w/2+.014+(w-.028)*i/13
            zz=z-h*.13-k*h*.085+h*(.11*sin(i*1.41+k)+.035*cos(i*3.1))
            verts.append((xx,yy,zz))
        verts.append((x+w/2-.014,yy,base));m=mat(name+' mountain %d'%k,[(.20,.10,.52),(.10,.12,.43),(.045,.085,.32),(.045,.17,.43)][k],.6,emission=.35);polygon(name+' mountain ridge',verts,m)
    cube(name+' stem',(x,y+.02,1.06),(.055,.06,.2),silver,.008)
    cube(name+' foot',(x,y-.02,.981),(.28,.19,.022),silver,.014)
screen('Main monitor',.29,1.39,1.43,1.03,.6)
screen('Portrait monitor',1.065,1.4,1.43,.42,.75)
cube('Keyboard base',(.4,1.035,.981),(.62,.225,.019),silver,.012)
for row in range(5):
    for col in range(14):cube('Keyboard key %d %d'%(row,col),(.115+col*.043, .947+row*.04,.996),(.037,.032,.009),edge,.004)
cube('Space bar',(.41,.946,1.002),(.23,.029,.006),edge,.004)
uv('Wireless mouse',(.94,.995,.986),(.055,.08,.021),edge)
curve('Mouse seam',[(.94,.96,1.005),(.94,1.025,1.005)],.001,silver)
phone=cube('Phone',(-.21,1.04,.978),(.12,.22,.015),silver,.013);phone.rotation_euler.z=-.17
phone=cube('Phone glass',(-.21,1.04,.988),(.108,.202,.005),black,.012);phone.rotation_euler.z=-.17
# Hollow ceramic mug.
def mug():
    verts=[];faces=[];N=48
    for radius,z in [(.052,.967),(.054,1.107),(.046,1.107),(.044,.98)]:
        verts += [(1.30+radius*cos(i*2*pi/N),.99+radius*sin(i*2*pi/N),z) for i in range(N)]
    for j in range(3):
        for i in range(N):a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
    mesh=bpy.data.meshes.new('Mug shell');mesh.from_pydata(verts,[],faces);mesh.materials.append(edge);o=bpy.data.objects.new('Ceramic mug',mesh);collections[group].objects.link(o)
    for p in mesh.polygons:p.use_smooth=True
    coffee=mat('Coffee',(.065,.028,.014),.24);cyl('Coffee surface',(1.3,.99,1.086),.045,.002,coffee)
    curve('Mug handle',[(1.349+.045*sin(t),.99,1.04+.046*cos(t)) for t in [i*pi/24 for i in range(25)]],.009,edge)
mug()
cyl('Lamp base',(-.43,1.36,.982),.105,.024,white)
rod('Lamp upright',(-.43,1.39,.99),(-.43,1.39,1.37),.009,silver)
cyl('Lamp shade',(-.43,1.36,1.39),.087,.025,white)
cyl('Lamp light diffuser',(-.43,1.36,1.375),.074,.005,peach)
cube('PC case',(1.57,1.25,.36),(.34,.58,.68),white,.02)
cube('PC front grille',(1.57,.953,.36),(.285,.012,.57),black,.008)
for i in range(18):
    for j in range(6):cube('Case grille perforation',(1.455+j*.045,.945,.103+i*.029),(.019,.003,.008),silver,.002)
for x in [1.49,1.54]:cube('PC top port',(x,1.03,.706),(.025,.045,.004),black,.003)
for x in [1.45,1.69]:
    for y in [1.04,1.46]:cube('PC foot',(x,y,.025),(.045,.07,.04),rubber,.005)
# Ergonomic chair: caster contact is derived from the finished rug height.
group='Chair'
chairx=.45;chairy=.10
def cp(x,y,z):return (chairx+x,chairy+y,z)
wheel_radius=.047
wheel_z=RUG_TOP+wheel_radius
cyl('Gas lift',cp(0,0,.312),.031,.245,black)
cyl('Gas lift collar',cp(0,0,.385),.043,.075,silver)
rounded_slab('Seat tilt mechanism',cp(0,0,.415),.26,.24,.035,.025,black)
rod('Seat height lever',cp(.09,.03,.413),cp(.26,.035,.405),.008,black)
cube('Seat lever grip',cp(.26,.035,.405),(.065,.027,.018),rubber,.008)
for i in range(5):
    a=2*pi*i/5+.2
    radial=Vector((cos(a),sin(a),0));axle=Vector((-sin(a),cos(a),0))
    end=Vector(cp(.34*cos(a),.34*sin(a),.165))
    curve('Chair tapered base spoke',[cp(0,0,.215),cp(.18*cos(a),.18*sin(a),.19),end],.021,edge)
    cyl('Caster swivel stem',(end.x,end.y,.155),.012,.045,silver)
    cube('Caster fork bridge',(end.x,end.y,.14),(.034,.034,.027),black,.008)
    hub=Vector((end.x,end.y,wheel_z))
    rod('Caster axle',hub-axle*.035,hub+axle*.035,.010,silver)
    for side in [-1,1]:
        centre=hub+axle*(side*.022)
        o=cyl('Caster wheel',centre,wheel_radius,.025,rubber,vertices=48)
        o.rotation_euler=axle.to_track_quat('Z','Y').to_euler()
        o=cyl('Caster hub cap',centre+axle*(side*.014),.021,.003,black)
        o.rotation_euler=axle.to_track_quat('Z','Y').to_euler()
rounded_slab('Seat underside',cp(0,0,.432),.51,.47,.05,.075,edge)
rounded_slab('Seat cushion',cp(0,-.015,.484),.50,.46,.073,.085,lav)
curve('Seat upholstery piping',rounded_outline(chairx,chairy-.015,.488,.448,.08,.492),.0025,pink,True)
# Explicit UV coordinates keep the mesh pattern stable across the curved surface.
def backpoint(u,v):
    corner=(abs(u)/.235)**10
    z=.53+.61*v-.024*corner*v**12+.018*corner*(1-v)**12
    return cp(u*(1+.08*v),-.205-.11*v+.065*(u/.26)**2,z)
verts=[];faces=[];nx=32;nz=36
for j in range(nz+1):
    for i in range(nx+1):verts.append(backpoint(-.235+.47*i/nx,j/nz))
for j in range(nz):
    for i in range(nx):
        a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
mesh=bpy.data.meshes.new('Chair UV woven back');mesh.from_pydata(verts,[],faces);mesh.update()
u=mesh.uv_layers.new(name='Woven fabric UV')
for face in mesh.polygons:
    for li in face.loop_indices:
        vi=mesh.loops[li].vertex_index;u.data[li].uv=(vi%(nx+1)/nx,vi//(nx+1)/nz)
o=bpy.data.objects.new('Chair curved mesh back',mesh);collections[group].objects.link(o)
meshmat=mat('Chair fine woven mesh',(.10,.09,.18),.9)
n=meshmat.node_tree.nodes;l=meshmat.node_tree.links;p=next(a for a in n if a.type=='BSDF_PRINCIPLED')
p.inputs['Sheen Weight'].default_value=.22
uvnode=n.new('ShaderNodeTexCoord');waves=[]
for direction,scale in [('X',8),('Y',11)]:
    w=n.new('ShaderNodeTexWave');w.wave_type='BANDS';w.bands_direction=direction;w.inputs['Scale'].default_value=scale
    l.new(uvnode.outputs['UV'],w.inputs['Vector']);waves.append(w)
multiply=n.new('ShaderNodeMath');multiply.operation='MULTIPLY'
for i,w in enumerate(waves):l.new(w.outputs['Fac'],multiply.inputs[i])
r=n.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(.055,.045,.105,1);r.color_ramp.elements[1].color=(.19,.16,.29,1)
l.new(multiply.outputs[0],r.inputs[0]);l.new(r.outputs[0],p.inputs['Base Color'])
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.2;bump.inputs['Distance'].default_value=.0007
l.new(multiply.outputs[0],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal']);mesh.materials.append(meshmat)
for poly in mesh.polygons:poly.use_smooth=True
border=[backpoint(-.235,i/30) for i in range(31)]+[backpoint(-.235+.47*i/30,1) for i in range(31)]+[backpoint(.235,1-i/30) for i in range(31)]+[backpoint(.235-.47*i/30,0) for i in range(31)]
curve('Chair back perimeter',border,.019,edge,True)
for side in [-1,1]:
    curve('Chair back support',[cp(side*.18,.10,.432),cp(side*.26,-.17,.50),cp(side*.24,-.275,.74)],.016,edge)
    curve('Armrest support',[cp(side*.23,0,.435),cp(side*.30,.04,.57),cp(side*.30,.04,.65)],.013,edge)
    rounded_slab('Padded armrest',cp(side*.30,.025,.67),.085,.27,.035,.036,edge)
curve('Lumbar support',[backpoint(-.21,.23),backpoint(0,.20),backpoint(.21,.23)],.012,lav)
group='Lighting'
ground=mat('Powder blue backdrop',(.68,.74,.85),.85)
cube('Studio ground',(0,0,-.29),(200,200,.05),ground,.0)
def light(name,typ,loc,energy,color,size=1,target=None):
    d=bpy.data.lights.new(name,typ);d.energy=energy;d.color=color
    if typ=='AREA':d.shape='DISK';d.size=size
    if typ=='POINT':d.shadow_soft_size=size
    o=bpy.data.objects.new(name,d);collections[group].objects.link(o);o.location=loc
    if target:o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    return o
light('Large softbox','AREA',(1,-3,7),650,(.84,.88,1),5,(0,0,0))
light('Warm window','AREA',(-3,-4,4),850,(1,.77,.58),2.1,(0,0,.5))
light('Gentle rim fill','AREA',(3,1,5),350,(.76,.8,1),3,(0,1,1))
sun=light('Late afternoon sunlight','SUN',(-3,-4,5),1.5,(1,.8,.62),target=(1,1,0));sun.data.angle=.11
light('Desk lamp pool','POINT',(-.43,1.34,1.31),7,(1,.66,.36),.07)
light('Pink desk backlight','AREA',(1.25,1.79,1.04),18,(1,.20,.43),.85,(1.25,2,1.3))
light('Sign wall wash','AREA',(.75,1.77,2.2),10,(1,.49,.27),1.3,(.75,2,2.2))
scene.world.color=(.25,.25,.25)
scene.world.use_nodes=True
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.65,.72,.88,1);bg.inputs[1].default_value=.2
group='Cameras'
bpy.ops.object.camera_add(location=(6,-8,6.4));camera=organize(bpy.context.object);camera.name='Reference isometric camera';camera.rotation_euler=(Vector((0,0,1.16))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=6.45;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=256;scene.cycles.use_denoising=True
scene.render.resolution_x=1536;scene.render.resolution_y=1536;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=os.path.join(ROOT,'pastel_developer_studio.png')
scene.view_settings.view_transform='AgX'
scene.view_settings.exposure=0
# A subtle optical bloom from emissive lettering.
if hasattr(scene,'compositing_node_group'):
    tree=bpy.data.node_groups.new('Studio bloom','CompositorNodeTree');scene.compositing_node_group=tree
    tree.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
    n=tree.nodes;rl=n.new('CompositorNodeRLayers');gl=n.new('CompositorNodeGlare');gl.inputs['Type'].default_value='Fog Glow';gl.inputs['Threshold'].default_value=1.8;gl.inputs['Strength'].default_value=.25;out=n.new('NodeGroupOutput');tree.links.new(rl.outputs['Image'],gl.inputs['Image']);tree.links.new(gl.outputs['Image'],out.inputs['Image'])
# Final visual refinements from reference-camera previews.
for name in ['Left wall top','Back wall top','Corner cap']:
    if name in bpy.data.objects:bpy.data.objects.remove(bpy.data.objects[name],do_unlink=True)
o=bpy.data.objects['Back wall'];o.location.x=.08;o.dimensions.x=4.08
for name,power in [('Large softbox',250),('Warm window',350),('Gentle rim fill',160),('Late afternoon sunlight',2.0)]:bpy.data.lights[name].energy=power
for o in bpy.data.objects:
    if o.type=='MESH' and 'Sunset print mountains' in o.name:
        for v in o.data.vertices:v.co.z=max(-.38885,min(.38885,v.co.z))
# Final physical placement and detail pass.
DESK_TOP = .800
DESK_SHIFT = DESK_TOP - .9625
for o in collections['Furniture'].objects:
    if o.name.startswith('Desk'):
        if o.name.startswith('Desk square leg'):
            top=DESK_TOP-.065
            o.location.z=(FLOOR_TOP+top)/2;o.dimensions.z=top-FLOOR_TOP
        else:o.location.z+=DESK_SHIFT
# Every desktop accessory moves together; the tower stays on the floor.
for o in collections['Equipment'].objects:
    if o.name.startswith(('PC ', 'Case grille')):o.location.z+=.0205
    else:o.location.z-=.167
for name in ['Desk lamp pool','Pink desk backlight']:
    bpy.data.objects[name].location.z-=.167
# Handles, book cover details, a real keyboard layout, and a discreet cable route.
group='Decorations'
for x in [-1.42,-1.30]:
    rod('Bookshelf recessed pull',(x,1.043,.68),(x,1.043,.80),.006,silver)
for y in [-.45,-.02,.41]:
    rod('Sideboard handle',(-1.343,y-.055,.70),(-1.343,y+.055,.70),.006,silver)
# Seat shelf contents on their supporting surfaces.
for o in list(collections['Decorations'].objects):
    if o.name.startswith('Upright book'):
        o.location.z=1.705+o.dimensions.z/2
        x=o.location.x
        cube('Book spine gilded title',(x,1.228,2.16),(.034,.003,.008),paper,.001)
        cube('Book spine lower band',(x,1.228,1.88),(.039,.003,.006),paper,.001)
    elif o.name.startswith('Ring binder'):
        o.location.z=1.175+o.dimensions.z/2
    elif o.name.startswith('Sideboard stacked book'):
        o.location.z-=.013
    elif o.name in ['Pencil cup','Cup hollow opening']:
        o.location.z+=.0075
    elif o.name=='Faceted ceramic sculpture':
        o.location.z+=.023
        o.location.x=-1.04;o.location.y=1.17
# Give the abstract prints clear pink and blue accents.
for o in collections['Decorations'].objects:
    if 'geometric shape' in o.name and o.type=='MESH':
        idx=int(o.name.rsplit('.',1)[1]) if '.' in o.name else 0
        o.data.materials[0]=[blue,pink,palette[0],palette[3]][idx%4]
group='Equipment'
# Avoid the original space bar overlapping a full row of keys.
for o in list(collections['Equipment'].objects):
    if o.name.startswith('Keyboard key 0 ') and 4<=int(o.name.rsplit(' ',1)[1])<=9:
        bpy.data.objects.remove(o,do_unlink=True)
for name in ['Keyboard key 4 0','Keyboard key 3 0','Keyboard key 0 13']:
    bpy.data.objects[name].data.materials[0]=palette[0]
# Cup colour is deliberately distinct from the white desk.
bpy.data.objects['Ceramic mug'].data.materials[0]=pink
bpy.data.objects['Mug handle'].data.materials[0]=pink
cyl('PC power button',(1.63,1.04,.7285),.010,.003,blue)
# Keep a realistic ventilation gap above the mid-tower case.
vent=mat('PC | graphite perforated panel',(.055,.065,.09),.65)
vent_hole=mat('PC | recessed vent openings',(.002,.003,.006),.85)
for o in collections['Equipment'].objects:
    if o.name.startswith(('PC ', 'Case grille')):
        o.location.x=1.57+(o.location.x-1.57)*.9
        o.location.y=1.25+(o.location.y-1.25)*.9
        o.location.z=FLOOR_TOP+(o.location.z-FLOOR_TOP)*.82
        o.scale.x*=.9;o.scale.y*=.9;o.scale.z*=.82
        if o.name=='PC front grille':o.data.materials[0]=vent
        elif o.name.startswith('Case grille'):o.data.materials[0]=vent_hole
        if o.name.startswith(('PC top port','PC power button')):o.location.z=.5971
    elif o.name.startswith(('Main monitor','Portrait monitor','Lamp ')):o.location.z-=.003
    elif o.name.startswith('Keyboard'):o.location.z-=.0045
    elif o.name.startswith('Phone'):o.location.z-=.0035
    elif o.name in ['Wireless mouse','Mouse seam']:o.location.z+=.002
bpy.data.objects['Space bar'].location.z-=.0045
bpy.data.objects['Desk lamp pool'].location.z-=.003
curve('Monitor cable under desk',[(.29,1.43,.86),(.29,1.52,.72),(.8,1.52,.69),(1.48,1.48,.58)],.004,black)
curve('Desk cable tray',[(-.3,1.49,.695),(1.35,1.49,.695)],.015,white)
# A neutral key keeps saturated materials readable; coloured light is local.
for name,power in [('Large softbox',210),('Warm window',180),('Gentle rim fill',120),('Late afternoon sunlight',1.3)]:
    bpy.data.lights[name].energy=power
bpy.data.lights['Large softbox'].color=(.91,.95,1)
bpy.data.lights['Warm window'].color=(1,.86,.72)
bpy.data.lights['Late afternoon sunlight'].color=(1,.89,.77)
bpy.data.lights['Pink desk backlight'].energy=30
bpy.data.lights['Pink desk backlight'].color=(1,.045,.27)
bpy.data.lights['Sign wall wash'].energy=6
bg.inputs[1].default_value=.16
scene.view_settings.exposure=-.25
try:scene.view_settings.look='AgX - Medium High Contrast'
except TypeError:pass
# Validate evaluated contact geometry before saving or rendering.
bpy.context.view_layer.update()
def bounds(o):
    evaluated=o.evaluated_get(bpy.context.evaluated_depsgraph_get())
    return [evaluated.matrix_world@Vector(v) for v in evaluated.bound_box]
for o in collections['Chair'].objects:
    if o.name.startswith('Caster wheel'):
        assert abs(min(v.z for v in bounds(o))-RUG_TOP)<.001, 'Caster does not meet rug: '+o.name
for o in collections['Furniture'].objects:
    if o.name.startswith('Desk square leg'):
        assert abs(min(v.z for v in bounds(o))-FLOOR_TOP)<.001, 'Desk leg contact: '+o.name
assert abs(max(v.z for v in bounds(bpy.data.objects['Desk top']))-DESK_TOP)<.001
assert .49 < max(v.z for v in bounds(bpy.data.objects['Seat cushion'])) < .53
assert min(v.z for v in bounds(bpy.data.objects['Desk top']))-max(v.z for v in bounds(bpy.data.objects['PC case'])) > .12
for o in collections['Equipment'].objects:
    if o.name.startswith('PC foot'):
        assert abs(min(v.z for v in bounds(o))-FLOOR_TOP)<.001
for o in collections['Decorations'].objects:
    if o.name.startswith('Upright book'):
        assert abs(min(v.z for v in bounds(o))-1.705)<.001
print('STUDIO_CONTACT_CHECKS_PASSED')
bpy.ops.file.pack_all()
for screen_area in bpy.context.screen.areas if bpy.context.screen else []:
    if screen_area.type=='VIEW_3D':screen_area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'pastel_developer_studio.blend'))
if '--preview' in sys.argv:
    scene.render.resolution_percentage=50;scene.cycles.samples=32;scene.render.filepath=os.path.join(ROOT,'preview.png')
if '--render' in sys.argv or '--preview' in sys.argv:
    bpy.ops.render.render(write_still=True)
    print('STUDIO_RENDER_COMPLETE')
