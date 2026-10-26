/* BOC - Cricket controls update - Animesh - 26.10.2026 */
(function () {
 'use strict';
 var C = window.CRK, R = C.Rosters;
 var U = window.CRKUpdate = {};
 function get(k, fallback) { try { var v = window.LAB && LAB.store ? LAB.store.get('crk.update.'+k, null) : localStorage.getItem('crk.update.'+k); return v == null ? fallback : (typeof v === 'string' ? JSON.parse(v) : v); } catch (_) { return fallback; } }
 function put(k,v) { try { var t=JSON.stringify(v); if(window.LAB && LAB.store) LAB.store.set('crk.update.'+k,t); else localStorage.setItem('crk.update.'+k,t); return true; } catch (_) { return false; } }
 var names=get('names',{}); if(!names || typeof names!=='object' || Array.isArray(names)) names={};
 var originals={}; Object.keys(R.PLAYERS).forEach(function(id){ originals[id]=R.PLAYERS[id].name; });
 // Cosmetic name overrides never change identity, nationality, eligibility or squad membership.
 function applyNames() {
  Object.keys(R.PLAYERS).forEach(function(id){ R.PLAYERS[id].name=names[id] || originals[id]; });
  var g=window.__crkDebug;
  [g && g.setup && g.setup.teams,g && g.m && g.m.s.teams].forEach(function(ts){ if(ts) ts.forEach(function(t){Object.keys(t.players).forEach(function(id){ if(originals[id]) t.players[id].name=names[id] || originals[id]; });}); });
 }
 // Balancing override, applied to the existing identity records before team copies are created.
 var fav=R.team('intl','NEP'); if(fav) fav.squad.forEach(function(id){ var p=R.PLAYERS[id]; p.displayRatings={bt:p.bt,bw:p.bw}; ['bt','bw','fd','rs','pw'].forEach(function(k){p[k]=0.99;}); });
 U.refresh=function(g){applyNames(); [g && g.setup && g.setup.teams,g && g.m && g.m.s.teams].forEach(function(ts){if(ts)ts.forEach(function(t){Object.keys(t.players).forEach(function(id){if(originals[id])t.players[id].name=names[id]||originals[id];if(fav && fav.squad.includes(id)){var p=t.players[id];p.displayRatings=R.PLAYERS[id].displayRatings;['bt','bw','fd','rs','pw'].forEach(function(k){p[k]=.99;});}});});});};
 applyNames();
 function node(tag,text){var e=document.createElement(tag); if(text!=null)e.textContent=text; return e;}
 function button(text,fn){var b=node('button',text); b.type='button'; b.className='crk-btn'; b.onclick=fn; return b;}
 function slider(label,min,max,step,value,fn){
  var wrap=node('label'), out=node('output'), input=node('input'); wrap.className='cu-slider';
  input.type='range'; input.min=min; input.max=max; input.step=step; input.value=value; input.setAttribute('aria-label',label);
  wrap.append(node('span',label),input,out); input.oninput=function(){fn(Number(input.value));}; return {wrap:wrap,input:input,out:out};
 }
 var controls=null;
 U.sync=function(g){if(!controls || !g.target)return;
  controls.line.input.value=g.target.x; controls.line.out.textContent=Number(g.target.x).toFixed(2)+' m';
  controls.length.input.value=g.target.len; controls.length.out.textContent=Number(g.target.len).toFixed(1)+' m';
  controls.speed.input.value=g.deliverySpeed || 1;
  var inn=C.cur(g.m.s), b=g.m.s.teams[inn.bowl].players[inn.bowler];
  var base={RF:39.5,LF:39,RFM:36.5,LFM:36,RM:33,LM:32.5,OB:23.5,SLA:23.5,LB:22.5,LWS:22.5}[b.bowl] || 32;
  var factor={slower:.78,flighted:.88,quicker:1.13,cutter:.86,yorker:1.01,bouncer:1.02,outswing:.98,inswing:.98,arm:1.04}[g.bowlType] || 1;
  controls.speed.out.textContent=Math.round(base*factor*(g.deliverySpeed || 1)*3.6)+' km/h target';
 };
 U.bowling=function(g){
  if(!controls){
   var host=node('div'); host.className='cu-bowling'; host.id='cu-bowling';
   controls={};
   controls.line=slider('Line (- left / + right in world coordinates)',-1.6,1.6,.05,0,function(v){g.target.x=v;U.sync(g);});
   controls.length=slider('Length (metres before batter stumps)',.2,13.5,.1,6,function(v){g.target.len=v;U.sync(g);});
   controls.speed=slider('Speed',.7,1.15,.01,1,function(v){g.deliverySpeed=v;U.sync(g);});
   [controls.line,controls.length,controls.speed].forEach(function(s){host.appendChild(s.wrap);});
   var hint=node('small','Set type, line, length and speed, then release in the green. Poor timing scatters line and length.'); host.appendChild(hint);
   var ctl=document.getElementById('ctl-bowl'); ctl.insertBefore(host,document.getElementById('bowl-hint'));
  }
  U.sync(g);
 };
 function editor(){
  var dlg=node('dialog');dlg.className='cu-dialog'; var h=node('h2','Edit player names');
  var hint=node('p','Names are local display aliases. Player identities and squad eligibility stay unchanged.');
  var filter=node('input');filter.type='search';filter.placeholder='Search players';filter.setAttribute('aria-label','Search players');
  var list=node('div');list.className='cu-name-list'; var pending=Object.assign({},names);
  function render(){list.replaceChildren(); var q=filter.value.toLowerCase();
   Object.keys(R.PLAYERS).filter(function(id){return (originals[id]+' '+(pending[id]||'')).toLowerCase().includes(q);}).forEach(function(id){
    var row=node('label');row.appendChild(node('span',originals[id]));var input=node('input');input.value=pending[id]||originals[id];input.maxLength=60;input.setAttribute('aria-label','Display name for '+originals[id]);
    input.oninput=function(){var v=input.value.trim(); if(v && v!==originals[id])pending[id]=v;else delete pending[id];};row.appendChild(input);list.appendChild(row);
   });
  }
  filter.oninput=render;var status=node('p');
  dlg.append(h,hint,filter,list,status,
   button('Save names',function(){if(!put('names',pending)){status.textContent='Storage unavailable; names were not saved.';return;}names=pending;applyNames();dlg.close();dlg.remove();}),
   button('Restore original names',function(){pending={};render();}),
   button('Cancel',function(){dlg.close();dlg.remove();}));
  document.getElementById('crk').appendChild(dlg);render();dlg.showModal();
 }
 document.addEventListener('DOMContentLoaded',function(){
  var menu=document.querySelector('#scr-home .crk-menu--small');if(menu)menu.appendChild(button('Edit player names',editor));
  var form=document.getElementById('settings-form'); if(form){
   var auto=form.querySelector('[name=autoNext]');if(auto && auto.parentElement)auto.parentElement.hidden=true;
   var ps=form.querySelectorAll('p');ps.forEach(function(p){if(p.textContent.includes('Batting:'))p.textContent='Batting: WASD / arrows aim (combine keys for diagonals); Space leave; Shift loft; Caps Lock ground; Tab defend; R run; E return. Bowling: 1–6 type; WASD / arrows line and length; Space release. P / Escape pause; C scorecard. Tab remains normal navigation outside batting.';});
  }
  var map={ground:'Ground shot (Caps Lock)',loft:'Lofted shot (Shift)',defend:'Defend (Tab)',leave:'Leave (Space)'};
  document.querySelectorAll('[data-shot]').forEach(function(b){b.setAttribute('aria-label',map[b.dataset.shot]);});
  var stage=document.getElementById('stage');if(stage)stage.addEventListener('pointerup',function(){var g=window.__crkDebug;if(g && g.phase==='bowlAim')U.sync(g);});
  var style=node('style');style.textContent=`
   .crk .cu-bowling{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;background:#0c1222ed;padding:8px;border-radius:10px}
   .crk .cu-slider{display:grid;gap:3px;font-size:12px;color:#fff;min-width:0}
   .crk .cu-slider input{width:100%;height:32px;accent-color:#ffcf4a;touch-action:pan-x}
   .crk .cu-bowling small{grid-column:1/-1;color:#c9d2ea}
   .crk .cu-dialog{color:#fff;background:#141c33;border:2px solid #ffcf4a;border-radius:16px;width:min(94vw,760px);max-height:90svh}
   .crk .cu-dialog::backdrop{background:#000b}.crk .cu-dialog input{background:#0c1222;color:#fff;border:1px solid #6076a8;padding:10px;border-radius:6px;min-height:44px}
   .crk .cu-name-list{max-height:52svh;overflow:auto;margin:12px 0}.crk .cu-name-list label{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;margin:6px 0}
   @media(max-width:480px){.crk .cu-bowling{gap:4px}.crk .cu-slider{font-size:10px}.crk .cu-name-list label{grid-template-columns:1fr}}
   @media(max-height:520px){.crk .cu-bowling{padding:3px}.crk .cu-slider input{height:22px}.crk .cu-bowling small{display:none}.crk .crk-ctl--bowl .crk-hint{display:none}}
  `;document.head.appendChild(style);
 });
})();
/* EOC - Cricket controls update - Animesh - 26.10.2026 */
