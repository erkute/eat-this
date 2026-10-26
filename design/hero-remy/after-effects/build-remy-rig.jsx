/* Native After Effects motion study. Run with File > Scripts > Run Script File.
   Creates editable shape paths and imported head art; never closes an existing project. */
(function () {
    app.beginUndoGroup('Remy articulated character');
    var base = File($.fileName).parent;
    var assets = new Folder(base.parent.fsName + '/motion-prototype');
    if (!app.project) app.newProject();
    var folder = app.project.items.addFolder('Remy - articulated motion study');
    var W = 1440, H = 1000, FPS = 60, D = 8.4;
    var comp = app.project.items.addComp('Remy - push, turn, thumbs up', W, H, 1, D, FPS);
    comp.parentFolder = folder; comp.bgColor = [0.94,0.93,0.9]; comp.motionBlur = true; comp.shutterAngle = 90;
    var skin=[1,.705,.50], ink=[.075,.075,.075], trousers=[.15,.15,.16], white=[.985,.985,.98];
    function clamp(x){return Math.max(0,Math.min(1,x));}
    function smooth(a,b,t){var x=clamp((t-a)/(b-a));return x*x*(3-2*x);}
    function mix(a,b,x){return a+(b-a)*x;}
    function add(a,b){return [a[0]+b[0],a[1]+b[1]];}
    function sub(a,b){return [a[0]-b[0],a[1]-b[1]];}
    function mul(a,k){return [a[0]*k,a[1]*k];}
    function norm(a){var l=Math.sqrt(a[0]*a[0]+a[1]*a[1])||1;return [a[0]/l,a[1]/l];}
    function perp(a,b){var n=norm(sub(b,a));return [-n[1],n[0]];}
    function shape(v,closed){var s=new Shape();s.vertices=v;s.closed=closed;s.inTangents=[];s.outTangents=[];for(var i=0;i<v.length;i++){s.inTangents.push([0,0]);s.outTangents.push([0,0]);}return s;}
    function makePath(name,color,width,closed){
        var l=comp.layers.addShape();l.name=name;l.motionBlur=true;l.property('ADBE Transform Group').property('ADBE Position').setValue([0,0]);
        var group=l.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');group.name=name;
        var c=group.property('ADBE Vectors Group');var path=c.addProperty('ADBE Vector Shape - Group');
        if(color){var f=c.addProperty('ADBE Vector Graphic - Fill');f.property('ADBE Vector Fill Color').setValue(color);}
        if(width){var stroke=c.addProperty('ADBE Vector Graphic - Stroke');stroke.property('ADBE Vector Stroke Color').setValue(ink);stroke.property('ADBE Vector Stroke Width').setValue(width);stroke.property('ADBE Vector Stroke Line Join').setValue(2);}
        return {layer:l,path:c.property(1).property('ADBE Vector Shape'),values:[],closed:closed};
    }
    function importArt(name){var f=new File(assets.fsName+'/'+name);if(!f.exists)throw Error('Missing source: '+f.fsName);var it=app.project.importFile(new ImportOptions(f));it.parentFolder=folder;return it;}
    var background=comp.layers.add(importArt('home-desktop.png'));background.name='Website - preview only';background.property('ADBE Transform Group').property('ADBE Scale').setValue([100,100]);
    var curtain=comp.layers.addSolid([0,0,0],'Black page - shared back contact',W,H,1,D);
    curtain.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([0,0]);
    var rearLeg=makePath('Rear leg',trousers,1.7,true), rearShoe=makePath('Rear loafer',[.055,.055,.06],1.7,true);
    var frontLeg=makePath('Front leg',trousers,1.7,true), frontShoe=makePath('Front loafer',[.055,.055,.06],1.7,true);
    var farArm=makePath('Far arm',skin,1.7,true),farHand=makePath('Far hand',skin,1.5,true);
    var neck=makePath('Neck',skin,1.6,true),torso=makePath('Ribbed vest',white,1.6,true),belt=makePath('Waistband',[.10,.10,.11],1.5,true);
    var ribs=[];for(var r=0;r<15;r++){var rib=makePath('Fine rib '+(r+1),null,.45,false);rib.layer.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group').property(2).property('ADBE Vector Stroke Color').setValue([.80,.80,.80]);ribs.push(rib);}
    var nearArm=makePath('Near arm',skin,1.7,true),nearHand=makePath('Near hand and thumb',skin,1.5,true);
    var headSpecs=[['remy-hand-effort.png',[720,350],[510,30,900,355]],['remy-turn-v2.png',[545,345],[400,30,680,345]],['remy-back-effort.png',[750,380],[590,45,885,380]],['remy-thumbs-up.png',[555,345],[425,30,690,345]]];
    var heads=[];for(var j=0;j<headSpecs.length;j++){
        var h=comp.layers.add(importArt(headSpecs[j][0]));h.name=['Head - effort right','Head - turning','Head - effort left','Head - pleased'][j];h.motionBlur=true;
        var b=headSpecs[j][2],mask=h.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');mask.property('ADBE Mask Shape').setValue(shape([[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]],true));mask.property('ADBE Mask Feather').setValue([.5,.5]);
        h.property('ADBE Transform Group').property('ADBE Anchor Point').setValue(headSpecs[j][1]);h.property('ADBE Transform Group').property('ADBE Scale').setValue([30,30]);heads.push(h);
    }
    // Joint coordinates: neck, near shoulder, far shoulder, hips, knees,
    // ankles, near elbow, far elbow, near hand, far hand. Same topology throughout.
    var push=[[211,110],[179,128],[217,130],[132,248],[171,248],[68,332],[240,329],[22,421],[208,421],[228,194],[258,167],[315,190],[315,152]];
    var release=[[170,105],[145,128],[188,128],[133,248],[171,248],[100,330],[202,330],[78,421],[193,421],[135,211],[214,208],[212,176],[246,190]];
    var turn=[[161,105],[132,128],[191,128],[138,248],[177,248],[142,333],[186,333],[137,421],[191,421],[120,204],[204,204],[137,258],[221,258]];
    var brace=[[231,107],[220,128],[285,128],[188,248],[225,248],[143,330],[214,335],[148,421],[253,421],[181,213],[285,213],[151,246],[225,246]];
    var back=[[267,112],[255,132],[295,132],[215,248],[251,248],[124,328],[180,344],[129,421],[253,421],[204,215],[284,216],[163,245],[220,250]];
    var thumb=[[161,105],[132,128],[191,128],[138,248],[177,248],[142,333],[186,333],[137,421],[191,421],[105,192],[204,204],[117,144],[221,258]];
    var keys=[[0,push],[1.55,push],[1.95,release],[2.35,turn],[2.73,brace],[3.12,back],[5.40,back],[5.80,brace],[6.12,turn],[6.45,thumb],[7.15,thumb],[D,thumb]];
    function joints(t){
        var index=keys.length-1;for(var i=1;i<keys.length;i++)if(t<=keys[i][0]){index=i;break;}
        var left=keys[index-1],right=keys[index],prev=keys[Math.max(0,index-2)],next=keys[Math.min(keys.length-1,index+1)];
        var a=left[1],b=right[1],dt=right[0]-left[0],u=clamp((t-left[0])/dt),out=[];
        var h00=2*u*u*u-3*u*u+1,h10=u*u*u-2*u*u+u,h01=-2*u*u*u+3*u*u,h11=u*u*u-u*u;
        for(var j=0;j<a.length;j++){var point=[];for(var axis=0;axis<2;axis++){
            var va=(a===b||prev[1]===a)?0:(b[j][axis]-prev[1][j][axis])/(right[0]-prev[0]);
            var vb=(a===b||next[1]===b)?0:(next[1][j][axis]-a[j][axis])/(next[0]-left[0]);
            point.push(h00*a[j][axis]+h10*dt*va+h01*b[j][axis]+h11*dt*vb);
        }out.push(point);}return out;
    }
    function limb(a,b,c,w1,w2,w3){var n1=perp(a,b),n2=perp(b,c),nm=norm(add(n1,n2));return [add(a,mul(n1,w1)),add(b,mul(nm,w2)),add(c,mul(n2,w3)),add(c,mul(n2,-w3)),add(b,mul(nm,-w2)),add(a,mul(n1,-w1))];}
    var all=[rearLeg,rearShoe,frontLeg,frontShoe,farArm,farHand,neck,torso,belt,nearArm,nearHand].concat(ribs),times=[],positions=[],headPositions=[],headRotations=[],headOpacities=[[],[],[],[]];
    for(var f=0;f<=Math.round(D*FPS);f++){
        var t=Math.min(D,f/FPS),p=joints(t),edge=t<1.75?mix(0,W*.54,smooth(0,1.75,t)):t<3.12?W*.54:mix(W*.54,W+1,smooth(3.12,5.40,t));
        var actor=edge; // Contact never separates during the loaded stroke.
        if(t>5.40)actor-=70*smooth(5.40,6.12,t);if(t>7.15)actor+=430*smooth(7.15,D,t);
        var root=[actor-315,H-429],load=(t<1.55||t>3.12&&t<5.40)?Math.sin(t*7)*.5+.5:0;
        p[3][1]+=load*3;p[4][1]+=load*3;
        if(t<1.55||t>3.12&&t<5.40||t>7.15){var step=Math.sin(t*10),lift=3; p[7][1]-=Math.max(0,step)*lift;p[8][1]-=Math.max(0,-step)*lift;p[5][0]+=step*4;p[6][0]-=step*4;}
        function emit(part,v){var world=[];for(var q=0;q<v.length;q++)world.push(add(v[q],root));part.values.push(shape(world,part.closed));}
        emit(rearLeg,limb(p[3],p[5],p[7],24,20,19));emit(frontLeg,limb(p[4],p[6],p[8],24,22,19));
        function shoe(a,dir){return [[a[0]-19,a[1]-10],[a[0]+19,a[1]-10],[a[0]+dir*40,a[1]-1],[a[0]+dir*45,a[1]+8],[a[0]-19,a[1]+8]];}
        var dir=1-2*smooth(2.1,3,t);emit(rearShoe,shoe(p[7],dir));emit(frontShoe,shoe(p[8],dir));
        emit(farArm,limb(p[2],p[10],p[12],18,14,10));emit(nearArm,limb(p[1],p[9],p[11],20,15,10));
        function hand(a,thumbAmount){return [[a[0]-10,a[1]-4],[a[0]-7,a[1]-18-thumbAmount*13],[a[0]+1,a[1]-20-thumbAmount*15],[a[0]+5,a[1]-8],[a[0]+14,a[1]-9],[a[0]+16,a[1]+13],[a[0]+8,a[1]+20],[a[0]-9,a[1]+13]];}
        emit(farHand,hand(p[12],0));emit(nearHand,hand(p[11],smooth(6.12,6.45,t)));
        emit(neck,[[p[0][0]-13,p[0][1]-18],[p[0][0]+15,p[0][1]-18],[p[2][0]-6,p[2][1]+28],[p[1][0]+12,p[1][1]+28]]);
        emit(torso,[[p[1][0]-4,p[1][1]-8],[p[1][0]+10,p[1][1]-10],[p[0][0]-4,p[0][1]+51],[p[2][0]-13,p[2][1]-9],[p[2][0]+3,p[2][1]-8],[p[2][0]+2,p[2][1]+45],[p[4][0]+24,p[4][1]-8],[p[3][0]-24,p[3][1]-8],[p[1][0]-5,p[1][1]+45]]);
        emit(belt,[[p[3][0]-24,p[3][1]-13],[p[4][0]+24,p[4][1]-13],[p[4][0]+24,p[4][1]+1],[p[3][0]-24,p[3][1]+1]]);
        for(var r=0;r<ribs.length;r++){var u=(r+1)/(ribs.length+1),sx=mix(p[1][0]+4,p[2][0]-4,u),sy=Math.max(p[1][1],p[2][1])+46,bx=mix(p[3][0]-18,p[4][0]+18,u),by=p[3][1]-16;emit(ribs[r],[[sx,sy],[mix(sx,bx,.52),mix(sy,by,.52)],[bx,by]]);}
        times.push(t);positions.push([edge,0]);headPositions.push(add(p[0],root));headRotations.push(t<1.55?-3*load:t>6.45&&t<7.15?2*Math.sin((t-6.45)*6):0);
        var turnIn=smooth(1.85,2.25,t),backIn=smooth(2.55,2.95,t),relax=smooth(5.50,5.95,t),smile=smooth(6.05,6.35,t);
        headOpacities[0].push(100*(1-turnIn));headOpacities[1].push(100*(turnIn*(1-backIn)+relax*(1-smile)));headOpacities[2].push(100*backIn*(1-relax));headOpacities[3].push(100*smile);
    }
    for(var i=0;i<all.length;i++)all[i].path.setValuesAtTimes(times,all[i].values);
    curtain.property('ADBE Transform Group').property('ADBE Position').setValuesAtTimes(times,positions);
    for(var j=0;j<heads.length;j++){var tr=heads[j].property('ADBE Transform Group');tr.property('ADBE Position').setValuesAtTimes(times,headPositions);tr.property('ADBE Rotate Z').setValuesAtTimes(times,headRotations);tr.property('ADBE Opacity').setValuesAtTimes(times,headOpacities[j]);}
    var label=comp.layers.addText('REMY / NATIVE RIG STUDY');label.name='Study label';label.guideLayer=true;label.enabled=false;
    comp.time=3.8;comp.openInViewer();app.endUndoGroup();
    alert('Remy rig created. Save this project as Remy-native-rig.aep. All body paths are editable. Preview and refine the artwork before production use.');
}());
