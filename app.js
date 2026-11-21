(()=>{
const C=window.ESL, $=s=>document.querySelector(s);
const el=(t,p={},...k)=>{const e=Object.assign(document.createElement(t),p);k.flat().forEach(c=>e.append(c));return e};
document.querySelectorAll('[data-discord]').forEach(a=>{a.href=C.discord;a.rel="noopener"});
const page=document.body.dataset.page;

async function team(){
  const G="https://groups.roproxy.com/v1/groups/"+C.groupId, T="https://thumbnails.roproxy.com/v1/users/avatar-headshot";
  const root=$('#team');
  try{
    const roles=(await (await fetch(G+"/roles")).json()).roles.filter(r=>r.rank>=C.minRank).sort((a,b)=>b.rank-a.rank);
    for(const r of roles){
      r.users=[];let cur="";
      do{const d=await (await fetch(`${G}/roles/${r.id}/users?limit=100&sortOrder=Asc${cur?"&cursor="+cur:""}`)).json();
        r.users.push(...d.data);cur=d.nextPageCursor||""}while(cur);
    }
    const all=roles.flatMap(r=>r.users), img={};
    for(let i=0;i<all.length;i+=100){
      const ids=all.slice(i,i+100).map(u=>u.userId).join(",");
      (await (await fetch(`${T}?userIds=${ids}&size=150x150&format=Png&isCircular=false`)).json()).data.forEach(x=>img[x.targetId]=x.imageUrl);
    }
    root.replaceChildren();const chips=$('#chips');
    roles.filter(r=>r.users.length).forEach(r=>{
      const id="r"+r.id;
      chips.append(el('a',{href:"#"+id,textContent:r.name}));
      root.append(el('div',{className:'role',id},
        el('h2',{},r.name,el('small',{textContent:r.users.length})),
        el('div',{className:'grid'},r.users.map(u=>el('a',{className:'person',href:"https://www.roblox.com/users/"+u.userId+"/profile",rel:"noopener",dataset:{n:u.username.toLowerCase()}},
          el('img',{src:img[u.userId]||"",alt:"",loading:"lazy",width:96,height:96}),u.username)))));
    });
    $('#q').addEventListener('input',e=>{
      const v=e.target.value.trim().toLowerCase();
      document.querySelectorAll('.person').forEach(p=>p.hidden=!p.dataset.n.includes(v));
      document.querySelectorAll('.role').forEach(s=>s.hidden=!s.querySelector('.person:not([hidden])'));
    });
  }catch(e){
    root.replaceChildren(el('div',{className:'note'},"We couldn't load the team list. ",el('a',{href:"https://www.roblox.com/communities/"+C.groupId+"/E-S-Legal#!/about",textContent:"View it on our Roblox group."})));
  }
}

async function jobs(){
  const root=$('#jobs');
  try{
    const list=await (await fetch("careers.json",{cache:"no-store"})).json();
    if(!list.length){root.replaceChildren(el('div',{className:'note'},"No positions are open right now. Join our Discord to hear when that changes."));return}
    root.replaceChildren(...list.map(job));
  }catch(e){root.replaceChildren(el('div',{className:'note'},"We couldn't load the job listings. Refresh the page or ask in our Discord."))}
}

function job(j){
  const body=el('div',{className:'body',id:'b-'+j.id},
    el('p',{textContent:j.description}),el('h3',{textContent:'Requirements'}),
    el('ul',{},j.requirements.map(r=>el('li',{textContent:r}))));
  const btn=el('button',{type:'button',textContent:j.title,ariaExpanded:'false'});
  btn.setAttribute('aria-controls',body.id);
  const box=el('article',{className:'job'},btn,body);
  btn.onclick=()=>{const o=box.classList.toggle('open');btn.setAttribute('aria-expanded',o)};
  const apply=el('button',{type:'button',className:'btn',textContent:'Apply for this position'});
  let form=null;
  apply.onclick=()=>{if(!form){form=makeForm(j);body.append(form)}form.hidden=!form.hidden;if(!form.hidden)form.querySelector('input').focus()};
  body.append(apply);return box;
}

function makeForm(j){
  const qs=[{label:"Roblox username",type:"short",required:true},{label:"Discord username",type:"short",required:true},...j.questions];
  const f=el('form'), status=el('p',{className:'status',role:'status'});
  qs.forEach((q,i)=>{
    let inp;
    if(q.type==="long")inp=el('textarea',{maxLength:1000});
    else if(q.type==="choice"){inp=el('select',{},el('option',{value:'',textContent:'Select…'}),(q.options||[]).map(o=>el('option',{textContent:o,value:o})))}
    else inp=el('input',{type:'text',maxLength:300});
    inp.name="q"+i;inp.required=!!q.required;
    f.append(el('label',{},q.label+(q.required?"":" (optional)"),inp));
  });
  f.append(el('input',{className:'hp',name:'website',tabIndex:-1,autocomplete:'off',ariaHidden:'true'}));
  const send=el('button',{type:'submit',className:'btn',textContent:'Submit application'});
  f.append(send,status);
  f.onsubmit=async e=>{
    e.preventDefault();status.className='status';
    if(f.website.value)return;
    const key="applied:"+j.id;
    if(localStorage.getItem(key)&&Date.now()-localStorage.getItem(key)<864e5){status.textContent="You already applied for this position today.";status.classList.add('err');return}
    if(!C.webhook){status.textContent="Applications aren't set up yet. Please contact us on Discord.";status.classList.add('err');return}
    send.disabled=true;status.textContent="Sending…";
    const fields=qs.map((q,i)=>({name:q.label.slice(0,256),value:(f["q"+i].value.trim()||"No answer").slice(0,1024)})).slice(0,25);
    try{
      const r=await fetch(C.webhook,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"E&S Legal Applications",embeds:[{title:"New application: "+j.title,color:0x1e50d8,fields,timestamp:new Date().toISOString()}]})});
      if(!r.ok)throw 0;
      localStorage.setItem(key,Date.now());f.reset();status.textContent="Application sent. We'll contact you on Discord.";status.classList.add('ok');
    }catch(_){status.textContent="Your application didn't send. Check your connection and try again.";status.classList.add('err')}
    send.disabled=false;
  };
  return f;
}
if(page==="team")team();if(page==="careers")jobs();
})();
