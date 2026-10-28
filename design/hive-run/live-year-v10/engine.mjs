// Standalone, intentionally small prototype economy. No imports from the real game.
export const RULES=Object.freeze({season:30,year:120,quota:80,feedEvery:12,feedPerBees:4,tripEvery:8,makeEvery:6,hatchEvery:30,boostCost:8,boostSeconds:10,boostCooldown:5,cellCapacity:8,maxBees:30});
export const HONEY=['Цветочный','Лесной'];
export function createRun(seed=410){return {seed:seed>>>0,status:'ready',time:0,population:8,foragers:3,workers:5,pollen:[12,0],jar:[20,0],cells:Array.from({length:6},(_,i)=>({type:0,amount:i===0?2:i===1?1:0})),meadow:0,trip:0,make:0,feed:0,brood:0,cooldown:0,hunger:0,metrics:{gathered:0,made:0,collected:0,eaten:0,boostSpent:0,born:0,lost:0,quotaPaid:0},events:[]};}
export const sum=a=>a.reduce((x,y)=>x+y,0);
export const seasonIndex=s=>Math.min(3,Math.floor(s.time/RULES.season));
export const feedCost=s=>Math.ceil(s.population/RULES.feedPerBees);
export const idle=s=>s.population-s.foragers-s.workers;
function emit(s,type,data={}){s.events.push({type,...data});if(s.events.length>80)s.events.shift();}
function rnd(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function debit(s,n){if(sum(s.jar)<n)return false;let left=n;for(let i=0;i<2;i++){const v=Math.min(s.jar[i],left);s.jar[i]-=v;left-=v;}return true;}
function lose(s,from){if(!s.population)return;if(from==='forage'&&s.foragers>0)s.foragers--;else if(s.workers>0)s.workers--;else if(s.foragers>0)s.foragers--;s.population--;s.metrics.lost++;emit(s,'loss',{from});}
function hatch(s){if(s.population>=RULES.maxBees){s.brood=RULES.hatchEvery;return;}s.brood-=RULES.hatchEvery;s.population++;s.workers++;s.metrics.born++;emit(s,'birth');}
export function start(s){if(s.status!=='ready')return false;s.status='running';emit(s,'start');return true;}
export function collect(s,index){if(s.status==='won'||s.status==='lost')return 0;const c=s.cells[index];if(!c||!c.amount)return 0;const n=c.amount,type=c.type;s.jar[type]+=n;c.amount=0;s.metrics.collected+=n;emit(s,'collect',{index,amount:n,honeyType:type});return n;}
export function boost(s){if(s.status!=='running'||s.cooldown||s.population>=RULES.maxBees||!debit(s,RULES.boostCost))return false;s.metrics.boostSpent+=RULES.boostCost;s.brood+=RULES.boostSeconds;s.cooldown=RULES.boostCooldown;emit(s,'boost');if(s.brood>=RULES.hatchEvery)hatch(s);return true;}
export function allocate(s,foragers,workers){if(!['ready','running'].includes(s.status)||!Number.isInteger(foragers)||!Number.isInteger(workers)||foragers<0||workers<0||foragers+workers>s.population)return false;s.foragers=foragers;s.workers=workers;emit(s,'allocation');return true;}
export function setMeadow(s,index){if(![0,1].includes(index)||!['ready','running'].includes(s.status))return false;s.meadow=index;s.trip=0;emit(s,'meadow');return true;}
export function tick(s,seconds=1){if(!Number.isInteger(seconds)||seconds<0)throw new Error('seconds must be a nonnegative integer');for(let k=0;k<seconds&&s.status==='running';k++){
 const previous=seasonIndex(s);s.time++;s.cooldown=Math.max(0,s.cooldown-1);s.trip++;s.make++;s.feed++;s.brood++;
 if(s.trip>=RULES.tripEvery){s.trip=0;if(s.foragers){const amount=s.foragers*(s.meadow?4:2);s.pollen[s.meadow]+=amount;s.metrics.gathered+=amount;emit(s,'forage',{amount,honeyType:s.meadow});if(s.meadow&&rnd(s)<.2)lose(s,'forage');}}
 if(s.make>=RULES.makeEvery){s.make=0;for(let i=0;i<s.workers;i++){const type=s.pollen[0]>0?0:s.pollen[1]>0?1:-1;if(type<0)break;const cell=s.cells.filter(c=>c.amount<RULES.cellCapacity&&(c.amount===0||c.type===type)).sort((a,b)=>a.amount-b.amount)[0];if(!cell)break;s.pollen[type]--;cell.type=type;cell.amount++;s.metrics.made++;}emit(s,'production');}
 if(s.brood>=RULES.hatchEvery)hatch(s);
 if(s.feed>=RULES.feedEvery){s.feed=0;const cost=feedCost(s);if(debit(s,cost)){s.metrics.eaten+=cost;s.hunger=0;emit(s,'feeding',{amount:cost});}else{s.hunger++;emit(s,'hungry',{amount:cost});if(s.hunger>=2){lose(s,'hunger');s.hunger=0;}}}
 if(s.population===0){s.status='lost';emit(s,'end',{reason:'bees'});break;}
 if(s.time>=RULES.year){if(debit(s,RULES.quota)){s.metrics.quotaPaid=RULES.quota;s.status='won';emit(s,'end',{reason:'quota'});}else{s.status='lost';emit(s,'end',{reason:'quota'});}break;}
 if(seasonIndex(s)!==previous)emit(s,'season',{season:seasonIndex(s)});
 }return s;
}
