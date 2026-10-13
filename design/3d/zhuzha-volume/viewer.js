import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildZhuzha} from './model.js';

const stage=document.querySelector('#stage');
const scene=new THREE.Scene(); scene.background=new THREE.Color('#eef5d8');
const camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,100);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping;
stage.append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.target.set(0,.42,0); controls.enableDamping=true;
controls.minZoom=.7; controls.maxZoom=2.3; controls.enablePan=false;
scene.add(new THREE.HemisphereLight('#fff8e9','#c99848',1.7));
const key=new THREE.DirectionalLight('#fff0cb',2.0); key.position.set(-3,5,5); scene.add(key);
const fill=new THREE.DirectionalLight('#ffffff',.7); fill.position.set(4,1,-2); scene.add(fill);
const {bee,body,wings}=buildZhuzha(); scene.add(bee);
const originalMaterials=new Map(); bee.traverse(o=>{if(o.isMesh)originalMaterials.set(o,o.material)});
const clay=new THREE.MeshStandardMaterial({color:'#e1c7a1',flatShading:true,roughness:.85,side:THREE.DoubleSide});
let spinning=false,moving=false,isClay=false;
const poses={front:[0,.12,8], 'q3-front':[-4.3,1,7],side:[-8,.25,0],'q3-back':[-4.3,.6,-7],back:[0,.12,-8],top:[0,8,.01],bottom:[0,-8,.01]};
const labels={front:'Спереди','q3-front':'Три четверти спереди',side:'Профиль','q3-back':'Три четверти сзади',back:'Со спины',top:'Сверху',bottom:'Снизу'};
function setView(name){
  moving=false;spinning=false; document.querySelector('#motion').setAttribute('aria-pressed','false'); document.querySelector('#rotate').setAttribute('aria-pressed','false');
  bee.position.y=0; bee.rotation.set(0,0,0); wings.forEach((w,i)=>{w.rotation.y=(i===0?-1:1)*.35;w.rotation.z=0});
  controls.enableDamping=false; camera.position.set(...poses[name]).add(controls.target); camera.up.set(0,1,0); camera.lookAt(controls.target);controls.update();
  document.querySelector('#reference').src=`refs/${name}.png`; document.querySelector('#ref-label').textContent=`Рисунок · ${labels[name]}`;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));
  renderer.render(scene,camera);
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.querySelector('#rotate').onclick=e=>{spinning=!spinning;e.currentTarget.setAttribute('aria-pressed',String(spinning))};
document.querySelector('#motion').onclick=e=>{moving=!moving;e.currentTarget.setAttribute('aria-pressed',String(moving));if(!moving){bee.position.y=0;bee.rotation.z=0;wings.forEach(w=>w.rotation.z=0)}};
document.querySelector('#clay').onclick=e=>{isClay=!isClay;e.currentTarget.setAttribute('aria-pressed',String(isClay));originalMaterials.forEach((mat,o)=>o.material=isClay?clay:mat)};
async function exportModel(){
  const clone=bee.clone(true); clone.position.set(0,0,0);clone.rotation.set(0,0,0);
  const originals=[];bee.traverse(o=>{if(o.isMesh)originals.push(originalMaterials.get(o))}); let i=0;
  clone.traverse(o=>{if(o.isMesh)o.material=originals[i++];if(o.name==='WingLeft')o.rotation.set(0,-.35,0);if(o.name==='WingRight')o.rotation.set(0,.35,0)});
  return await new GLTFExporter().parseAsync(clone,{binary:true,onlyVisible:true});
}
document.querySelector('#download').onclick=async()=>{try{const data=await exportModel();const url=URL.createObjectURL(new Blob([data],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download='zhuzha-volume.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}catch(e){document.querySelector('#status').textContent='Не удалось сохранить модель: '+e.message}};
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);const aspect=w/h;camera.left=-2.15*aspect;camera.right=2.15*aspect;camera.top=2.15;camera.bottom=-2.15;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(stage);resize();setView('q3-front');
let previousTime=0;
renderer.setAnimationLoop(ms=>{const t=ms/1000,dt=Math.min(.05,t-previousTime);previousTime=t;if(spinning)bee.rotation.y+=dt*.48;if(moving){bee.position.y=Math.sin(t*2.3)*.06;bee.rotation.z=Math.sin(t*1.8)*.025;wings.forEach((w,i)=>w.rotation.z=(i===0?-1:1)*Math.sin(t*2*Math.PI*7)*.38)}controls.update();renderer.render(scene,camera)});
document.querySelector('#status').textContent='Готово · можно вращать и выбирать ракурсы';
window.zhuzha={scene,camera,renderer,bee,body,wings,controls,setView,exportModel,stats:bee.userData};
