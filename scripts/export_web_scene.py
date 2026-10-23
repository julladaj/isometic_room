"""Run in Blender's Python console to export the open studio without changing its source."""
import bpy, math, json, os
from collections import defaultdict
from mathutils import Vector
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'models')
os.makedirs(OUT, exist_ok=True)
original = bpy.context.scene
original_selected = list(bpy.context.selected_objects)
original_active = bpy.context.view_layer.objects.active
objects = list(original.objects)
depsgraph = bpy.context.evaluated_depsgraph_get()
material_cache = {}
created_images = []
created_meshes = []
buckets = {}
pivots = {'chair':(.45,.10,.06),'door':(-1.894,-1.72,0),'rug':(.38,-.47,.043),
          'lamp':(-.43,1.36,.8),'computer':(1.57,1.25,.0255),'monitors':(.66,1.39,.8),
          'mug':(1.30,.99,.8),'books':(-1.36,1.3,1.7),'art':(0,0,0),'sign':(.75,1.93,2.2),'desk':(.66,1.18,.8),'room':(0,0,0)}

def interaction(o):
    name=o.name
    if any(c.name=='Chair' for c in o.users_collection):return 'chair'
    if name.startswith(('Door inset','Acoustic door inset','Handle backplate','Door handle','Door lever')):return 'door'
    if name.startswith(('Lavender woven rug','Rug ')):return 'rug'
    if name.startswith('Lamp '):return 'lamp'
    if name.startswith(('PC ', 'Case grille')):return 'computer'
    if name.startswith(('Main monitor','Portrait monitor')):return 'monitors'
    if name.startswith(('Ceramic mug','Coffee surface','Mug handle')):return 'mug'
    if name.startswith(('Upright book','Book spine','Stacked shelf book','Ring binder','Binder finger','Sideboard stacked book','Faceted ceramic')):return 'books'
    if name.startswith(('Sunset print','Connected nodes','Stacked geometry','Back abstract','Right nodes','Right geometry')):return 'art'
    if name.startswith('LeonBleriot'):return 'sign'
    if name.startswith(('Desk ','Keyboard','Space bar','Wireless mouse','Mouse seam','Phone','Monitor cable')):return 'desk'
    return 'room'

def image_texture(name, rgb):
    height,width=rgb.shape[:2]
    img=bpy.data.images.new(name,width=width,height=height,alpha=True)
    rgba=np.ones((height,width,4),dtype=np.float32);rgba[:,:,:3]=np.clip(rgb,0,1)
    img.pixels.foreach_set(rgba.ravel());img.pack();created_images.append(img)
    return img

def portable_material(src):
    key=src.name if src else 'Default'
    if key in material_cache:return material_cache[key]
    m=bpy.data.materials.new('WEB | '+key);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    sp=next((n for n in src.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) if src and src.use_nodes else None
    if sp:
        for field in ['Base Color','Roughness','Metallic','Emission Color','Emission Strength']:
            p.inputs[field].default_value=sp.inputs[field].default_value
    else:p.inputs['Base Color'].default_value=src.diffuse_color if src else (.6,.6,.6,1)
    rgb=None
    if 'indigo jacquard weave' in key:
        size=1024;y,x=np.mgrid[0:size,0:size]/(size-1)
        xx=(x-.5)*2.85;yy=(y-.5)*2.45
        dx=(xx+.118)%.236-.118;dy=(yy+.118)%.236-.118
        theta=np.arctan2(dy,dx);radius=np.sqrt(dx*dx+dy*dy)
        petals=.073+.017*np.cos(theta*4)
        mask=(np.abs(radius-petals)<.0019)|(np.abs(radius-.018)<.0012)
        mask &= (np.abs(xx)<1.30)&(np.abs(yy)<1.07)
        weave=(np.sin(x*size*math.pi)*np.cos(y*size*math.pi*.97))*.007
        grain=np.random.default_rng(23).random((size,size))*.014
        rgb=np.empty((size,size,3));rgb[:]=(.10,.043,.30)
        rgb+=weave[:,:,None]+grain[:,:,None]
        rgb[mask]=(.26,.12,.51)
        border=(np.abs(xx)>1.388)|(np.abs(yy)>1.188)
        stitches=border&(((np.floor((xx+yy)*75).astype(int))%3)==0)
        rgb[stitches]=(.40,.27,.66)
    elif 'Chair fine woven mesh' in key:
        size=512;y,x=np.mgrid[0:size,0:size]/size
        weave=(.5+.5*np.sin(x*2*math.pi*26))*(.5+.5*np.sin(y*2*math.pi*35))
        rgb=np.array((.055,.045,.105))[None,None,:]+weave[:,:,None]*np.array((.135,.115,.185))[None,None,:]
    elif 'luminous pastel sky' in key:
        size=256;y,x=np.mgrid[0:size,0:size]/(size-1)
        rgb=np.empty((size,size,3))
        for channel,(a,b,c) in enumerate(zip((.025,.07,.50),(.75,.055,.23),(.20,.025,.48))):
            rgb[:,:,channel]=np.interp(y,[0,.48,1],[a,b,c])
    elif 'Whitewashed oak' in key:
        y,x=np.mgrid[0:128,0:512]
        grain=.86+.08*np.sin(y*.8+2*np.sin(x*.015))+.04*np.random.default_rng(23).random((128,512))
        rgb=grain[:,:,None]*np.array(tuple(p.inputs['Base Color'].default_value)[:3])[None,None,:]
    if rgb is not None:
        node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=image_texture('WEB texture | '+key,rgb)
        m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
        # Screen gradients emit their own colour, rather than a uniform old shader value.
        if 'luminous pastel sky' in key:m.node_tree.links.new(node.outputs['Color'],p.inputs['Emission Color'])
    material_cache[key]=m
    return m

for o in objects:
    if o.type not in {'MESH','CURVE','FONT'} or o.hide_render:continue
    if o.name in {'Studio ground','Left wall','Door casing'}:continue
    if o.name.startswith(('Rug jacquard floral medallion','Rug medallion centre','Rug edge stitch')):continue
    kind=interaction(o)
    evaluated=o.evaluated_get(depsgraph)
    mesh=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=depsgraph)
    if not mesh:continue
    world=[o.matrix_world@v.co for v in mesh.vertices]
    if not world:evaluated.to_mesh_clear();continue
    lo=[min(v[i] for v in world) for i in range(3)];hi=[max(v[i] for v in world) for i in range(3)]
    uv=mesh.uv_layers.active
    for poly in mesh.polygons:
        src=mesh.materials[poly.material_index] if mesh.materials else None
        material=portable_material(src)
        key=(kind,material.name)
        if key not in buckets:buckets[key]={'verts':[],'faces':[],'uv':[],'smooth':[],'material':material}
        b=buckets[key];indices=[];p_uv=[]
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index;v=world[vi]
            indices.append(len(b['verts']));b['verts'].append(tuple(v-Vector(pivots[kind])))
            if kind=='rug':p_uv.append(((v.x-(.38-1.425))/2.85,(v.y-(-.47-1.225))/2.45))
            elif 'luminous pastel sky' in (src.name if src else ''):
                p_uv.append(((v.x-lo[0])/max(hi[0]-lo[0],.001),(v.z-lo[2])/max(hi[2]-lo[2],.001)))
            elif 'Whitewashed oak' in (src.name if src else ''):
                p_uv.append(((v.x-lo[0])/max(hi[0]-lo[0],.001),(v.y-lo[1])/max(hi[1]-lo[1],.001)))
            elif uv:p_uv.append(tuple(uv.data[li].uv))
            else:p_uv.append((v.x,v.z))
        b['faces'].append(indices);b['uv'].append(p_uv);b['smooth'].append(poly.use_smooth)
    evaluated.to_mesh_clear()

export_scene=bpy.data.scenes.new('Web export temporary')
roots={}
try:
    for kind,pivot in pivots.items():
        root=bpy.data.objects.new('interactive_'+kind,None);root.location=pivot
        root['interaction']=kind;export_scene.collection.objects.link(root);roots[kind]=root
    for (kind,name),b in buckets.items():
        mesh=bpy.data.meshes.new(name);created_meshes.append(mesh);mesh.from_pydata(b['verts'],[],b['faces']);mesh.update()
        mesh.materials.append(b['material']);uv=mesh.uv_layers.new(name='UVMap')
        for poly,coords,smooth in zip(mesh.polygons,b['uv'],b['smooth']):
            poly.use_smooth=smooth
            for li,co in zip(poly.loop_indices,coords):uv.data[li].uv=co
        obj=bpy.data.objects.new(kind+' | '+name,mesh);obj.parent=roots[kind];export_scene.collection.objects.link(obj)
    # A proper doorway makes the opening animation reveal space rather than a solid wall.
    def block(name,loc,size,material):
        verts=[(sx*size[0]/2,sy*size[1]/2,sz*size[2]/2) for sx,sy,sz in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
        faces=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
        mesh=bpy.data.meshes.new(name);created_meshes.append(mesh);mesh.from_pydata(verts,[],faces);mesh.materials.append(material)
        obj=bpy.data.objects.new(name,mesh);obj.location=loc;obj.parent=roots['room'];export_scene.collection.objects.link(obj)
    wallmat=portable_material(bpy.data.objects['Left wall'].data.materials[0])
    whitemat=portable_material(bpy.data.objects['Door casing'].data.materials[0])
    block('wall_front',(-2.04,-1.935,1.4),(.16,.33,2.8),wallmat)
    block('wall_rear',(-2.04,.725,1.4),(.16,2.75,2.8),wallmat)
    block('wall_door_header',(-2.04,-1.21,2.57),(.16,1.12,.46),wallmat)
    for y in [-1.7375,-.6825]:block('door_frame_jamb',(-1.938,y,1.17),(.065,.065,2.34),whitemat)
    block('door_frame_header',(-1.938,-1.21,2.3075),(.065,1.12,.065),whitemat)
    bpy.context.window.scene=export_scene
    kwargs=dict(filepath=os.path.join(OUT,'studio.glb'),export_format='GLB',use_active_scene=True,
                export_apply=False,export_animations=False,export_lights=False,export_cameras=False,
                export_extras=True,export_yup=True,export_materials='EXPORT',
                export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
    bpy.ops.export_scene.gltf(**kwargs)
    report={'source':'pastel_developer_studio.blend','objects_before':len(objects),'mesh_batches':len(buckets)+6,
            'vertices':sum(len(b['verts']) for b in buckets.values()),'interaction_ids':list(pivots),
            'bytes':os.path.getsize(os.path.join(OUT,'studio.glb')),'lighting':'dynamic web lighting; procedural textiles converted to portable textures'}
    with open(os.path.join(OUT,'studio-report.json'),'w') as f:json.dump(report,f,indent=2)
    print('WEB_EXPORT_COMPLETE',json.dumps(report))
finally:
    bpy.context.window.scene=original
    bpy.data.batch_remove(list(export_scene.objects))
    bpy.data.scenes.remove(export_scene)
    bpy.data.batch_remove([*created_meshes, *material_cache.values(), *created_images])
    for o in original_selected:
        if o.name in original.objects:o.select_set(True)
    if original_active and original_active.name in original.objects:bpy.context.view_layer.objects.active=original_active
