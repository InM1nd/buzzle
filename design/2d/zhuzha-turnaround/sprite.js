export const normalize = a => ((a % 360) + 360) % 360;
export const delta = (a,b) => ((b-a+540)%360)-180;
export function direction(angle, previous = null) {
  const next = Math.round(normalize(angle)/45)%8;
  return previous !== null && Math.abs(delta(previous*45,normalize(angle))) < 28 ? previous : next;
}
const definitions = [
 ['front','Спереди',[680,680],1,[[[100,300],[330,300],[430,430],[435,540],[420,600],[300,660],[100,620]],[[935,470],[970,310],[1110,300],[1220,340],[1260,500],[1200,620],[1080,660],[957,590]]],[[422,531],[942,530]]],
 ['q3-front','Три четверти',[742,705],.94,[[[100,375],[360,375],[465,490],[477,603],[447,665],[375,745],[100,745]],[[970,420],[1100,250],[1285,290],[1330,470],[1250,600],[1080,630],[1050,563],[1030,513]]],[[470,605],[1040,519]]],
 ['side','Профиль',[760,700],.96,[[[380,330],[410,260],[515,300],[608,410],[618,476],[578,501],[390,375]],[[250,345],[480,345],[560,450],[616,566],[570,626],[513,665],[380,616],[285,485]]],[[582,453],[595,548]]],
 ['q3-back','Три четверти сзади',[710,685],.98,[[[150,410],[225,280],[410,270],[520,405],[530,500],[490,550],[389,625],[275,555]],[[926,541],[989,484],[1075,438],[1195,443],[1277,546],[1138,674],[1029,684],[961,624]]],[[503,478],[947,578]]],
 ['back','Со спины',[680,680],1,[[[100,290],[330,290],[430,430],[435,540],[420,600],[300,660],[100,620]],[[935,470],[970,290],[1110,290],[1220,330],[1260,500],[1200,620],[1080,660],[957,590]]],[[422,516],[947,521]]]
];
const canvas = () => Object.assign(document.createElement('canvas'),{width:1366,height:1151});
function polygon(ctx, points) {ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
export async function loadSprites() {
 const sprites = await Promise.all(definitions.map(async ([file,label,anchor,scale,masks,roots])=>{
  const img = new Image();img.src=`../../3d/turnaround/${file}.png`;await img.decode();
  const body=canvas(), bc=body.getContext('2d');bc.drawImage(img,0,0);
  const wings=masks.map((points,i)=>{
   const mask=canvas(),mc=mask.getContext('2d');polygon(mc,points);mc.fill();mc.lineWidth=4;mc.lineJoin='round';mc.stroke();
   const layer=canvas(),lc=layer.getContext('2d');lc.drawImage(img,0,0);lc.globalCompositeOperation='destination-in';lc.drawImage(mask,0,0);
   // The rear wing's overlapped pixels belong to the near wing only.
   if(file==='side' && i===0){lc.globalCompositeOperation='destination-out';polygon(lc,masks[1]);lc.fill();}
   bc.globalCompositeOperation='destination-out';bc.drawImage(mask,0,0);return layer;
  });
  return {file,label,anchor,scale,body,wings,roots,img};
 }));
 return [sprites[0],sprites[1],sprites[2],sprites[3],sprites[4],sprites[3],sprites[2],sprites[1]].map((s,i)=>({...s,mirror:i>4}));
}
export function drawBee(ctx,s,x,y,size,time,{flap=true,motion=true,bank=0}={}) {
 ctx.save();ctx.translate(x,y+(motion?Math.sin(time*2.6)*size*.013:0));ctx.rotate(bank+(motion?Math.sin(time*2)*.012:0));
 const scale=size/1366*s.scale;ctx.scale((s.mirror?-1:1)*scale,scale);ctx.translate(-s.anchor[0],-s.anchor[1]);
 // Keep wing roots in place. A restrained squash represents a 2D wing stroke.
 const wave=flap?Math.sin(time*Math.PI*2*8):0;
 function wing(i){const [rx,ry]=s.roots[i];ctx.save();ctx.translate(rx,ry);ctx.rotate(wave*.06*(i?1:-1));ctx.scale(1,flap?.93+wave*.07:1);ctx.drawImage(s.wings[i],-rx,-ry);ctx.restore();}
 wing(0);wing(1);ctx.drawImage(s.body,0,0);
 
 ctx.restore();
}
