import * as THREE from 'three';

// Coordinate convention: +Z is the face, +Y is up; one connected closed torso.
export function buildZhuzha() {
  const bee = new THREE.Group(); bee.name = 'Zhuzha';
  const solid = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .72, flatShading: true, ...options });
  const brown = solid('#66351c');
  const bodyMaterial = solid('#ffffff', { vertexColors: true });
  const rings = [
    [1.37,.015,.015,.33], [1.24,.58,.45,.34], [.99,.86,.65,.30],
    [.63,1.04,.79,.23], [.20,1.18,.90,.12], [-.28,1.20,.96,-.04],
    [-.69,1.08,.89,-.21], [-1.01,.81,.70,-.29], [-1.22,.43,.40,-.29], [-1.30,.015,.015,-.26]
  ];
  const n = 16, vertices = [], faces = [], colors = [];
  const rand = (a,b) => { const v=Math.sin(a*127.1+b*311.7)*43758.5453; return v-Math.floor(v); };
  rings.forEach(([y,rx,rz,cz],j) => {
    for(let i=0;i<n;i++) {
      const theta = i*2*Math.PI/n + (j%2 ? .18 : 0) + (rand(i,j)-.5)*.07;
      const c = Math.cos(theta), s = Math.sin(theta);
      const jitter = 1 + (rand(i+8,j)-.5)*.045;
      // Band boundaries dip over the face and rise toward the back.
      const dy = j===5 ? .07-.24*c*c : j===6 ? .05-.18*c*c : j===7 ? .03-.10*c*c : j>0&&j<5 ? (rand(i,j+4)-.5)*.09 : 0;
      vertices.push(new THREE.Vector3(rx*s*jitter,y+dy,cz+rz*c*jitter));
    }
  });
  const positions=[];
  function triangle(a,b,c,j,i) {
    faces.push([a,b,c]);
    let col = new THREE.Color(j===5||j>=7 ? '#754930' : j===6 ? '#ffbd21' : j<3 ? '#ffd342' : '#ffbd21');
    const k = .91 + rand(i,j)*.19;
    col.multiplyScalar(k);
    for(const index of [a,b,c]) { positions.push(...vertices[index].toArray()); colors.push(col.r,col.g,col.b); }
  }
  for(let j=0;j<rings.length-1;j++) for(let i=0;i<n;i++) {
    const a=j*n+i, b=j*n+(i+1)%n, c=(j+1)*n+i, d=(j+1)*n+(i+1)%n;
    if((j+i)%2) { triangle(a,c,b,j,i); triangle(b,c,d,j,i+1); }
    else { triangle(a,d,b,j,i); triangle(a,c,d,j,i+1); }
  }
  // Caps close the mesh; tiny end rings avoid a repeated polar fan on visible facets.
  for(const [j,reverse] of [[0,true],[rings.length-1,false]]) {
    for(let i=1;i<n-1;i++) reverse ? triangle(j*n,j*n+i,j*n+i+1,j, i) : triangle(j*n,j*n+i+1,j*n+i,j-1,i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); geo.computeVertexNormals();
  const body = new THREE.Mesh(geo,bodyMaterial); body.name='Body'; bee.add(body);
  function ellipsoid(name,position,scale,mat,segments=10,rings=6) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1,segments,rings),mat);
    mesh.name=name; mesh.position.set(...position); mesh.scale.set(...scale); bee.add(mesh); return mesh;
  }
  function tube(name,points,radius,mat,parent=bee,steps=14) {
    const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve,steps,radius,6,false),mat);
    mesh.name=name; parent.add(mesh); return mesh;
  }
  const black = solid('#191613',{roughness:.35});
  const shine = new THREE.MeshBasicMaterial({color:'#fffaf0'});
  for(const sign of [-1,1]) {
    const eye = ellipsoid(sign<0?'EyeLeft':'EyeRight',[sign*.46,.28,.975],[.20,.265,.09],black,10,7);
    eye.rotation.y=sign*.23;
    const highlight = new THREE.Mesh(new THREE.IcosahedronGeometry(.048,0),shine);
    highlight.name='EyeHighlight'; highlight.position.set(-.25,.42,.88); eye.add(highlight);
    // Keep highlights world-sized despite ellipsoid scale.
    highlight.scale.set(1/.20,1/.265,1/.09);
    const cheek = ellipsoid(sign<0?'CheekLeft':'CheekRight',[sign*.73,.02,.85],[.13,.125,.018],solid('#ff7278'),24,12);
    cheek.rotation.y=sign*.4;
    tube('Antenna'+sign,[[sign*.46,1.24,.27],[sign*.55,1.61,.26],[sign*.73,1.95,.24],[sign*.94,2.18,.22]],.065,brown);
    const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(.16,1),brown); tip.position.set(sign*.94,2.18,.22); tip.name='AntennaTip'+sign; bee.add(tip);
  }
  tube('Smile',[[-.18,-.06,1.005],[-.10,-.12,.992],[0,-.14,.985],[.10,-.12,.992],[.18,-.06,1.005]],.026,black);
  for(const side of [-1,1]) for(const front of [-1,1]) {
    const foot=ellipsoid(`Foot_${side}_${front}`,[side*.57,-1.24,front*.43-.12],[.14,.20,.14],brown,8,5);
    foot.rotation.z=side*-.30; foot.rotation.x=front*.2;
  }
  const wings=[];
  for(const sign of [-1,1]) {
    const wing = new THREE.Group(); wing.name=sign<0?'WingLeft':'WingRight'; wing.position.set(sign*.89,.56,-.43);
    wing.rotation.y=sign*.35; bee.add(wing); wings.push(wing);
    const outline=[[0,0],[.14,-.22],[.72,-.19],[1.09,.19],[.96,.70],[.47,.88],[.08,.47]];
    const center=[.48,.31]; const pos=[], col=[];
    for(let i=0;i<outline.length;i++) {
      const a=outline[i],b=outline[(i+1)%outline.length];
      for(const p of [center,a,b]) pos.push(sign*p[0],p[1],0);
      const color=new THREE.Color(['#fff4ce','#ffefc2','#fff8e6','#f5e5bd','#fff2d2','#fff9e6','#f7eac9'][i]);
      for(let k=0;k<3;k++) col.push(color.r,color.g,color.b);
    }
    const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(col,3)); geometry.computeVertexNormals();
    const membrane=new THREE.Mesh(geometry,solid('#ffffff',{vertexColors:true,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false,roughness:.55,emissive:'#fff1ca',emissiveIntensity:.16}));
    membrane.name='Membrane'; membrane.renderOrder=2; wing.add(membrane);
    const gold=solid('#e6ae3e',{roughness:.55});
    for(let i=0;i<outline.length;i++) {
      const a=outline[i],b=outline[(i+1)%outline.length];
      tube('WingEdge'+i,[[sign*a[0],a[1],0],[sign*b[0],b[1],0]],.012,gold,wing,1);
      tube('WingVein'+i,[[sign*center[0],center[1],.002],[sign*a[0],a[1],.002]],.0045,gold,wing,1);
    }
  }
  bee.userData={bodyTriangles:geo.attributes.position.count/3,feet:4,wingCount:2,referenceRevision:6};
  return {bee,body,wings};
}
