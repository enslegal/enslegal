(()=>{
const C=window.ESL,$=s=>document.querySelector(s),root=$('#admin');
const el=(t,p={},...k)=>{const e=Object.assign(document.createElement(t),p);k.flat().forEach(c=>e.append(c));return e};
const guess=()=>{if(C.repo)return C.repo;if(location.hostname.endsWith('github.io')){const o=location.hostname.split('.')[0],p=location.pathname.split('/')[1];return o+'/'+(p&&!p.endsWith('.html')?p:location.hostname)}return''};
const S={token:sessionStorage.getItem('esl_t')||'',repo:sessionStorage.getItem('esl_r')||guess(),sha:'',list:[]};
const url=()=>`https://api.github.com/repos/${S.repo}/contents/careers.json`;
const hdr=()=>({Authorization:'Bearer '+S.token,Accept:'application/vnd.github+json'});
const dec=b=>new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g,'')),c=>c.charCodeAt(0)));
const enc=s=>{let b='';new TextEncoder().encode(s).forEach(c=>b+=String.fromCharCode(c));return btoa(b)};
async function load(){
  const r=await fetch(url()+"?ref="+(C.branch||'main'),{headers:hdr(),cache:'no-store'});
  if(!r.ok)throw new Error(r.status===401?"That token isn't valid.":r.status===404?"Repository or careers.json not found, or the token has no access to it.":"GitHub returned an error ("+r.status+").");
  const d=await r.json();S.sha=d.sha;S.list=JSON.parse(dec(d.content));
}
async function save(msg){
  const r=await fetch(url(),{method:'PUT',headers:hdr(),body:JSON.stringify({message:msg,content:enc(JSON.stringify(S.list,null,2)+"\n"),sha:S.sha,branch:C.branch||'main'})});
  if(!r.ok)throw new Error(r.status===403||r.status===404?"The token can't write to this repository. It needs Contents: Read and write.":"Couldn't save ("+r.status+"). Reload the page and try again.");
  S.sha=(await r.json()).content.sha;
}
function login(msg){
  const repo=el('input',{value:S.repo,placeholder:'username/repository',required:true});
  const tok=el('input',{type:'password',placeholder:'github_pat_…',required:true,autocomplete:'off'});
  const st=el('p',{className:'status err',textContent:msg||''});
  const f=el('form',{className:'narrow'},
    el('label',{},'Repository',repo),el('label',{},'Access token',tok),
    el('button',{className:'btn',type:'submit',textContent:'Log in'}),st);
  f.onsubmit=async e=>{e.preventDefault();S.repo=repo.value.trim();S.token=tok.value.trim();st.textContent='Checking…';st.className='status';
    try{await load();sessionStorage.setItem('esl_t',S.token);sessionStorage.setItem('esl_r',S.repo);list()}
    catch(x){st.className='status err';st.textContent=x.message}};
  root.replaceChildren(f);
}
async function init(){
  if(!S.token||!S.repo)return login();
  try{await load();list()}catch(x){sessionStorage.removeItem('esl_t');login(x.message)}
}
function list(msg,bad){
  const st=el('p',{className:'status'+(bad?' err':' ok'),textContent:msg||''});
  const out=el('button',{className:'btn sm alt',textContent:'Log out',onclick:()=>{sessionStorage.clear();S.token='';login()}});
  const add=el('button',{className:'btn sm',textContent:'Add listing',onclick:()=>editor()});
  root.replaceChildren(el('div',{className:'bar'},add,out),st,
    ...(S.list.length?S.list.map(j=>el('div',{className:'row'},el('strong',{textContent:j.title}),el('div',{},
      el('button',{className:'btn sm alt',textContent:'Edit',onclick:()=>editor(j)}),
      el('button',{className:'btn sm danger',textContent:'Remove',onclick:async()=>{
        if(!confirm('Remove "'+j.title+'"?'))return;
        S.list=S.list.filter(x=>x!==j);
        try{await save('Remove listing: '+j.title);list('Removed. The live site updates in about a minute.')}catch(x){await init().catch(()=>{});list(x.message,true)}}})))):[el('div',{className:'note',textContent:'No listings yet. Add your first one.'})]));
}
function qrow(q={}){
  const r=el('div',{className:'qrow'});
  const l=el('input',{placeholder:'Question',value:q.label||'',required:true});
  const t=el('select',{},[['short','Short answer'],['long','Long answer'],['choice','Choice']].map(([v,n])=>el('option',{value:v,textContent:n,selected:q.type===v})));
  const o=el('input',{placeholder:'Options, separated by commas',value:(q.options||[]).join(', '),disabled:q.type!=='choice'});
  t.onchange=()=>o.disabled=t.value!=='choice';
  const req=el('input',{type:'checkbox',checked:q.required!==false});
  r.append(l,t,o,el('label',{},req,'Required'),el('button',{type:'button',className:'btn sm alt',textContent:'Remove',onclick:()=>r.remove()}));
  r.get=()=>({label:l.value.trim(),type:t.value,...(t.value==='choice'?{options:o.value.split(',').map(x=>x.trim()).filter(Boolean)}:{}),required:req.checked});
  return r;
}
function editor(j){
  const title=el('input',{value:j?j.title:'',required:true});
  const desc=el('textarea',{value:j?j.description:'',required:true});
  const reqs=el('textarea',{value:j?j.requirements.join('\n'):'',required:true});
  const qs=el('div',{});(j?j.questions:[]).forEach(q=>qs.append(qrow(q)));
  const st=el('p',{className:'status err'});
  const f=el('form',{},el('h2',{textContent:j?'Edit listing':'New listing'}),
    el('label',{},'Title',title),el('label',{},'Description',desc),
    el('label',{},'Requirements (one per line)',reqs),
    el('h3',{textContent:'Application questions'}),qs,
    el('button',{type:'button',className:'btn sm alt',textContent:'Add question',onclick:()=>qs.append(qrow())}),
    el('div',{className:'btns'},el('button',{type:'submit',className:'btn',textContent:'Save listing'}),
      el('button',{type:'button',className:'btn alt',textContent:'Cancel',onclick:()=>list()})),st);
  f.onsubmit=async e=>{e.preventDefault();
    const n={id:j?j.id:(title.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Math.random().toString(36).slice(2,6)),
      title:title.value.trim(),description:desc.value.trim(),requirements:reqs.value.split('\n').map(x=>x.trim()).filter(Boolean),
      questions:[...qs.children].map(r=>r.get()).filter(q=>q.label)};
    if(j)S.list[S.list.indexOf(j)]=n;else S.list.push(n);
    st.textContent='Saving…';
    try{await save((j?'Edit':'Add')+' listing: '+n.title);list('Saved. The live site updates in about a minute.')}
    catch(x){st.textContent=x.message}};
  root.replaceChildren(f);
}
init();
})();
