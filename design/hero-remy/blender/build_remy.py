"""Native Blender cutout rig. Original artwork, articulated limbs, shared contact.
Run: blender --background --factory-startup --python build_remy.py
"""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector, Matrix

HERE=Path(__file__).resolve().parent
ART=HERE.parent/'motion-prototype'
OUT=Path('/tmp/eat-this-remy-blender'); OUT.mkdir(exist_ok=True)
FPS=60; DURATION=8.4; W=1440; H=1000; SCALE=3.2
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=4
scene.cycles.use_denoising=False
scene.render.resolution_x=W; scene.render.resolution_y=H; scene.render.resolution_percentage=60
scene.render.fps=FPS; scene.frame_start=1; scene.frame_end=round(DURATION*FPS)+1
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=True
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
scene.world.color=(.1,.1,.1)

def smooth(a,b,t):
    u=max(0,min(1,(t-a)/(b-a))); return u*u*(3-2*u)
def mix(a,b,u): return a+(b-a)*u
def v(p,depth=0): return Vector((p[0]/SCALE,depth,-p[1]/SCALE))
def target(p,depth=0): return Vector((p[0],depth,-p[1]))

images={}
def image_mat(file,name=None):
    mat=bpy.data.materials.new(name or file); mat.use_nodes=True
    nodes=mat.node_tree.nodes; nodes.clear(); links=mat.node_tree.links
    image=images.setdefault(file,bpy.data.images.load(str(ART/file),check_existing=True))
    tex=nodes.new('ShaderNodeTexImage'); tex.image=image; tex.interpolation='Linear'
    emission=nodes.new('ShaderNodeEmission'); links.new(tex.outputs['Color'],emission.inputs['Color'])
    transparent=nodes.new('ShaderNodeBsdfTransparent'); blend=nodes.new('ShaderNodeMixShader')
    strength=nodes.new('ShaderNodeMath'); strength.operation='MULTIPLY'; strength.inputs[1].default_value=1
    links.new(tex.outputs['Alpha'],strength.inputs[0]); links.new(strength.outputs[0],blend.inputs[0])
    links.new(transparent.outputs[0],blend.inputs[1]); links.new(emission.outputs[0],blend.inputs[2])
    output=nodes.new('ShaderNodeOutputMaterial'); links.new(blend.outputs[0],output.inputs['Surface'])
    return mat,strength.inputs[1]

def color_mat(name,color):
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    n=mat.node_tree.nodes; n.clear(); e=n.new('ShaderNodeEmission'); e.inputs['Color'].default_value=(*color,1)
    o=n.new('ShaderNodeOutputMaterial'); mat.node_tree.links.new(e.outputs[0],o.inputs['Surface']); return mat

skin=color_mat('Joint fill - skin',(1,.715,.515)); cloth=color_mat('Joint fill - trousers',(.14,.14,.15))
base_mat,_=image_mat('remy-turn-v2.png')

arm=bpy.data.armatures.new('Remy articulated skeleton'); rig=bpy.data.objects.new('Remy | character rig',arm); scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
bone_data={
 'spine':([550,680],[545,345],0),
 'hips':([550,780],[550,680],1),
 'upper_arm_near':([410,385],[350,585],-4),
 'forearm_near':([350,585],[385,765],-5),
 'hand_near':([385,765],[385,835],-6),
 'upper_arm_far':([660,390],[720,600],3),
 'forearm_far':([720,600],[790,760],2),
 'hand_far':([790,760],[800,835],1),
 'thigh_near':([500,730],[530,1020],0),
 'shin_near':([530,1020],[490,1320],-1),
 'foot_near':([490,1320],[490,1380],-2),
 'thigh_far':([625,730],[665,1020],3),
 'shin_far':([665,1020],[650,1320],2),
 'foot_far':([650,1320],[650,1380],1),
 'head':([545,345],[545,100],-3),
}
for name,(a,b,depth) in bone_data.items():
    bone=arm.edit_bones.new(name); bone.head=v(a,depth); bone.tail=v(b,depth)
bpy.ops.object.mode_set(mode='OBJECT'); rig.select_set(False)
rig.show_in_front=True; arm.display_type='STICK'

def mesh_obj(name,vertices,faces,mat,uvs=None,bone=None):
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj); obj.data.materials.append(mat)
    if uvs:
        uv=mesh.uv_layers.new(name='Artwork UV')
        for loop in mesh.loops: uv.data[loop.index].uv=uvs[loop.vertex_index]
    if bone:
        group=obj.vertex_groups.new(name=bone); group.add(list(range(len(vertices))),1,'REPLACE')
        mod=obj.modifiers.new('Native articulated skeleton','ARMATURE'); mod.object=rig
        obj.parent=rig
    return obj

def cutout(name,bone,poly,depth,mat=base_mat):
    return mesh_obj(name,[v(p,depth) for p in poly],[list(range(len(poly)))],mat,[(p[0]/1086,1-p[1]/1448) for p in poly],bone)

cutout('Vest - original ribbed drawing','spine',[(453,350),(607,347),(660,375),(670,470),(648,550),(658,635),(646,680),(459,680),(450,634),(461,590),(431,510),(430,435)],-1)
cutout('Waist and belt','hips',[(453,635),(650,635),(676,750),(644,825),(550,805),(466,825),(436,750)],-1)
cutout('Near upper arm','upper_arm_near',[(390,365),(455,355),(465,410),(420,510),(392,585),(355,625),(310,610),(305,560),(330,460)],-4)
cutout('Near forearm','forearm_near',[(315,560),(380,565),(402,650),(405,720),(420,785),(370,805),(340,730),(330,650)],-5)
relaxed_near=cutout('Near relaxed fingers','hand_near',[(345,730),(410,730),(425,780),(427,830),(400,855),(365,842),(340,800)],-6)
cutout('Far upper arm','upper_arm_far',[(650,365),(695,380),(704,480),(728,560),(744,620),(700,630),(670,550),(650,470)],3)
cutout('Far forearm','forearm_far',[(695,560),(743,570),(765,660),(810,730),(814,795),(765,810),(743,730),(710,665)],2)
relaxed_far=cutout('Far relaxed fingers','hand_far',[(750,730),(805,720),(832,770),(828,820),(805,855),(782,840),(767,790)],1)
cutout('Near trouser thigh','thigh_near',[(444,700),(555,710),(585,845),(583,1015),(550,1050),(481,1040),(450,920),(438,800)],0)
cutout('Near trouser shin','shin_near',[(480,995),(585,1010),(566,1120),(555,1240),(546,1330),(440,1330),(447,1230),(450,1150),(478,1070)],-1)
cutout('Near loafer','foot_near',[(437,1305),(549,1305),(568,1340),(601,1365),(600,1402),(432,1402)],-2)
cutout('Far trouser thigh','thigh_far',[(550,700),(660,700),(672,850),(712,1005),(690,1050),(610,1050),(590,960),(575,870)],3)
cutout('Far trouser shin','shin_far',[(610,995),(714,1000),(697,1140),(692,1260),(686,1330),(580,1330),(592,1210),(600,1130)],2)
cutout('Far loafer','foot_far',[(580,1305),(686,1305),(722,1330),(768,1355),(772,1390),(578,1390)],1)

def joint(name,bone,p,r,depth,mat):
    points=[v((p[0]+r*math.cos(i*math.tau/32),p[1]+r*math.sin(i*math.tau/32)),depth) for i in range(32)]
    mesh_obj(name,points,[list(range(32))],mat,bone=bone)
joint('Near elbow continuity','forearm_near',[350,585],30,-3.8,skin)
joint('Far elbow continuity','forearm_far',[720,600],27,3.2,skin)
joint('Near knee continuity','shin_near',[530,1020],36,.2,cloth)
joint('Far knee continuity','shin_far',[665,1020],36,3.2,cloth)
joint('Near shoulder continuity','upper_arm_near',[410,385],38,-2.5,skin)
joint('Far shoulder continuity','upper_arm_far',[660,390],32,4,skin)

# Head artwork is aligned once to the same neck pivot, then follows one bone.
head_layers=[]
for name,file,pivot,rect in [
 ('Effort facing right','remy-hand-effort.png',(720,350),(535,45,880,350)),
 ('Turning head','remy-turn-v2.png',(545,345),(410,35,670,345)),
 ('Effort facing left','remy-back-effort.png',(750,380),(595,55,885,380)),
 ('Satisfied smile','remy-thumbs-up.png',(555,345),(425,30,690,345))]:
    mat,alpha=image_mat(file,name); x1,y1,x2,y2=rect; src=[(x1,y1),(x2,y1),(x2,y2),(x1,y2)]
    align=[(p[0]-pivot[0]+545,p[1]-pivot[1]+345) for p in src]
    obj=mesh_obj(name,[v(p,-8) for p in align],[(0,1,2,3)],mat,[(p[0]/1086,1-p[1]/1448) for p in src],'head')
    head_layers.append(alpha)

# A drawn thumbs-up hand attaches to the same wrist, not a replacement body pose.
thumb_mat,thumb_alpha=image_mat('remy-thumbs-up.png','Thumb gesture')
poly=[(348,303),(403,303),(410,345),(435,356),(438,430),(408,459),(348,450),(337,400)]
aligned=[(x-375+385,y-445+765) for x,y in poly]
thumb=mesh_obj('Thumb up - original artwork',[v(p,-8) for p in aligned],[list(range(len(poly)))],thumb_mat,[(x/1086,1-y/1448) for x,y in poly],'hand_near')

def quad(name,x1,z1,x2,z2,depth,mat):
    return mesh_obj(name,[(x1,depth,z1),(x2,depth,z1),(x2,depth,z2),(x1,depth,z2)],[(0,1,2,3)],mat,[(0,0),(1,0),(1,1),(0,1)])
bgmat,_=image_mat('home-desktop.png','Website preview')
quad('Website reference - preview only',0,0,W,H,100,bgmat)
black=color_mat('Curtain black',(0,0,0)); curtain=quad('Black page | contact locked',0,0,W,H,50,black)

cam_data=bpy.data.cameras.new('Desktop camera'); camera=bpy.data.objects.new('Desktop camera',cam_data); scene.collection.objects.link(camera)
camera.location=(W/2,-2200,H/2); camera.rotation_euler=(math.pi/2,0,0); cam_data.type='ORTHO'; cam_data.ortho_scale=W; cam_data.clip_end=5000; scene.camera=camera

push=[[211,110],[179,128],[217,130],[132,225],[171,225],[68,332],[240,329],[22,421],[208,421],[228,194],[258,167],[315,190],[315,152]]
release=[[170,105],[145,128],[188,128],[133,225],[171,225],[100,330],[202,330],[78,421],[193,421],[135,211],[214,208],[212,176],[246,190]]
turn=[[161,105],[132,128],[191,128],[138,225],[177,225],[142,333],[186,333],[137,421],[191,421],[120,204],[204,204],[137,258],[221,258]]
brace=[[231,107],[220,128],[285,128],[188,225],[225,225],[143,330],[214,335],[148,421],[253,421],[181,213],[285,213],[151,246],[225,246]]
back=[[267,112],[255,132],[295,132],[215,225],[251,225],[124,328],[180,344],[129,421],[253,421],[204,215],[284,216],[163,245],[220,250]]
thumb_pose=[[161,105],[132,128],[191,128],[138,225],[177,225],[142,333],[186,333],[137,421],[191,421],[105,192],[204,204],[117,144],[221,258]]
keys=[(0,push),(1.55,push),(1.95,release),(2.35,turn),(2.73,brace),(3.12,back),(5.40,back),(5.80,brace),(6.12,turn),(6.45,thumb_pose),(7.15,thumb_pose),(DURATION,thumb_pose)]

def joints(t):
    index=next((i for i in range(1,len(keys)) if t<=keys[i][0]),len(keys)-1)
    ta,a=keys[index-1]; tb,b=keys[index]; tp,prev=keys[max(0,index-2)]; tn,nxt=keys[min(len(keys)-1,index+1)]
    u=max(0,min(1,(t-ta)/(tb-ta))); dt=tb-ta
    h00=2*u**3-3*u*u+1; h10=u**3-2*u*u+u; h01=-2*u**3+3*u*u; h11=u**3-u*u
    points=[]
    for j in range(len(a)):
        q=[]
        for axis in range(2):
            va=0 if a is b or prev is a else (b[j][axis]-prev[j][axis])/(tb-tp)
            vb=0 if a is b or nxt is b else (nxt[j][axis]-a[j][axis])/(tn-ta)
            q.append(h00*a[j][axis]+h10*dt*va+h01*b[j][axis]+h11*dt*vb)
        points.append(q)
    return points

def pose_bone(name,a,b,frame):
    rest=arm.bones[name]; depth=bone_data[name][2]
    pa=target(a,depth); pb=target(b,depth); vec=pb-pa
    delta=(rest.tail_local-rest.head_local).rotation_difference(vec)
    rot=delta @ rest.matrix_local.to_quaternion()
    matrix=Matrix.LocRotScale(pa,rot,Vector((1,vec.length/rest.length,1)))
    bone=rig.pose.bones[name]; bone.rotation_mode='QUATERNION'; bone.matrix=matrix
    bone.keyframe_insert('location',frame=frame); bone.keyframe_insert('rotation_quaternion',frame=frame); bone.keyframe_insert('scale',frame=frame)

contact_log=[]
for frame in range(1,scene.frame_end+1):
    t=(frame-1)/FPS; scene.frame_set(frame); p=joints(t)
    edge=mix(0,W*.54,smooth(0,1.75,t)) if t<1.75 else W*.54 if t<3.12 else mix(W*.54,W+1,smooth(3.12,5.40,t))
    actor=edge
    if t>5.40: actor-=70*smooth(5.40,6.12,t)
    if t>7.15: actor+=430*smooth(7.15,DURATION,t)
    rig.location=(actor-315,0,447); rig.keyframe_insert('location',frame=frame)
    curtain.location.x=edge; curtain.keyframe_insert('location',frame=frame)
    effort=(math.sin(t*7)*.5+.5) if t<1.55 or 3.12<t<5.4 else 0
    p[3][1]+=effort*3; p[4][1]+=effort*3
    if t<1.55 or 3.12<t<5.4 or t>7.15:
        step=math.sin(t*10);p[7][1]-=max(0,step)*3;p[8][1]-=max(0,-step)*3;p[5][0]+=step*4;p[6][0]-=step*4
    hip=[(p[3][0]+p[4][0])/2,(p[3][1]+p[4][1])/2]
    pose_bone('spine',hip,p[0],frame);pose_bone('hips',[hip[0],hip[1]+30],hip,frame)
    for suffix,shoulder,elbow,wrist,hip_i,knee,ankle in [('near',1,9,11,3,5,7),('far',2,10,12,4,6,8)]:
        pose_bone('upper_arm_'+suffix,p[shoulder],p[elbow],frame)
        pose_bone('forearm_'+suffix,p[elbow],p[wrist],frame)
        pose_bone('hand_'+suffix,p[wrist],[p[wrist][0],p[wrist][1]+22],frame)
        pose_bone('thigh_'+suffix,p[hip_i],p[knee],frame);pose_bone('shin_'+suffix,p[knee],p[ankle],frame)
        pose_bone('foot_'+suffix,p[ankle],[p[ankle][0],p[ankle][1]+20],frame)
    pose_bone('head',p[0],[p[0][0],p[0][1]-76],frame)
    turn_in=smooth(1.85,2.25,t);back_in=smooth(2.55,2.95,t);relax=smooth(5.5,5.95,t);smile=smooth(6.05,6.35,t)
    for alpha,value in zip(head_layers,[1-turn_in,turn_in*(1-back_in)+relax*(1-smile),back_in*(1-relax),smile]):
        alpha.default_value=value;alpha.keyframe_insert('default_value',frame=frame)
    thumb_alpha.default_value=smooth(6.12,6.45,t);thumb_alpha.keyframe_insert('default_value',frame=frame)
    relaxed_near.hide_render=t>=6.35;relaxed_near.keyframe_insert('hide_render',frame=frame)
    if 3.12<=t<=5.4: contact_log.append({'t':t,'edge':edge,'contact_controller':actor,'gap':edge-actor})

# Keep all sources with the project. No external dependencies after packing.
scene['description']='Remy original-art cutout armature; 60fps continuous joints; black page shares contact controller.'
scene['preview_only']=True
scene.frame_set(round(3.8*FPS)+1)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Remy-articulated.blend'))
(OUT/'contact-check.json').write_text(json.dumps({'max_controller_gap':max(abs(x['gap']) for x in contact_log),'samples':len(contact_log)},indent=2))
for t in [1.2,2.2,3.8,5.25,6.7]:
    scene.frame_set(round(t*FPS)+1); scene.render.filepath=str(OUT/f'frame-{t}.png'); bpy.ops.render.render(write_still=True)
print('REMY_BLEND_READY',str(HERE/'Remy-articulated.blend'))
