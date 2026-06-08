
const menu=document.querySelector('.menu-btn');
const links=document.querySelector('.links');
if(menu){menu.addEventListener('click',()=>links.classList.toggle('open'))}
const reveal=()=>{document.querySelectorAll('.reveal').forEach((el,i)=>{const r=el.getBoundingClientRect();if(r.top<window.innerHeight-85){setTimeout(()=>el.classList.add('visible'),Math.min(i*36,260))}})};
reveal();window.addEventListener('scroll',reveal,{passive:true});
const checkoutBtns=document.querySelectorAll('[data-add]');
checkoutBtns.forEach(btn=>btn.addEventListener('click',()=>{const product=btn.getAttribute('data-add');const target=document.querySelector('#checkout-item');if(target)target.textContent=product;document.querySelector('#checkout')?.scrollIntoView({behavior:'smooth'});}));


// v8 consultation flow
const flowState={instrument:'',level:'',goal:''};
const flowSteps=[...document.querySelectorAll('.flow-step')];
const progressSteps=[...document.querySelectorAll('.progress-step')];
function setFlowStep(n){
  flowSteps.forEach(s=>s.classList.toggle('active',Number(s.dataset.step)===n));
  progressSteps.forEach(s=>s.classList.toggle('active',Number(s.dataset.step)===n));
  const top=document.querySelector('.consult-flow'); if(top) top.scrollIntoView({behavior:'smooth',block:'start'});
}
document.querySelectorAll('[data-flow-choice]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const group=btn.dataset.group; flowState[group]=btn.dataset.value;
    document.querySelectorAll(`[data-group="${group}"]`).forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    const next=Number(btn.closest('.flow-step')?.dataset.step||1)+1;
    setFlowStep(next);
    const sum=document.querySelector('#flowSummary');
    if(sum) sum.textContent=`Interest: ${flowState.instrument||'Not selected'} • Level: ${flowState.level||'Not selected'} • Goal: ${flowState.goal||'Not selected'}`;
  });
});
document.querySelectorAll('[data-flow-next]').forEach(btn=>btn.addEventListener('click',()=>setFlowStep(Number(btn.dataset.flowNext))));
document.querySelectorAll('[data-flow-back]').forEach(btn=>btn.addEventListener('click',()=>setFlowStep(Number(btn.dataset.flowBack))));

// v11 hoodie gallery controls
(function(){
  document.querySelectorAll('.product-gallery').forEach(card=>{
    const main=card.querySelector('.gallery-main');
    const thumbs=[...card.querySelectorAll('.thumb')];
    const rotate=card.querySelector('.gallery-arrow');
    let index=0;
    const show=(i)=>{index=i; const src=thumbs[index].dataset.img; main.style.opacity=.35; setTimeout(()=>{main.src=src; main.style.opacity=1;},120); thumbs.forEach((t,n)=>t.classList.toggle('active',n===index));};
    thumbs.forEach((btn,i)=>btn.addEventListener('click',()=>show(i)));
    rotate?.addEventListener('click',()=>show((index+1)%thumbs.length));
    main?.addEventListener('click',()=>show((index+1)%thumbs.length));
  });
})();

// ORDS portal role and permission controls
(function(){
  const roleCopy={
    student:{
      title:'Good afternoon, Mateo.',
      subtitle:'Your homework, announcements, progress, and approved reschedule requests in one focused workspace.',
      settings:'Student',
      schedule:'Students can request a new lesson time from their assigned instructor’s available openings.'
    },
    parent:{
      title:'Good afternoon, Parent.',
      subtitle:'View student progress, billing status, settings, and reschedule request status without internal staff tools.',
      settings:'Parent',
      schedule:'Parents can request a new lesson time from the assigned teacher’s available openings.'
    },
    client:{
      title:'Welcome back, Jordan.',
      subtitle:'View assigned homework, announcements, and reschedule requests for your coaching sessions.',
      settings:'Independent Client',
      schedule:'Independent clients can request schedule changes from approved instructor availability.'
    },
    instructor:{
      title:'Instructor operations dashboard.',
      subtitle:'Manage assigned students, clock-ins, lesson reports, homework, and reschedule approvals.',
      settings:'Instructor',
      schedule:'Instructors can manage students, homework, reports, clock-in records, and request approvals.'
    },
    admin:{
      title:'ORDS operations dashboard.',
      subtitle:'Instructor accountability, scheduling control, login records, communication proof, and report completion in one organized workspace.',
      settings:'Admin',
      schedule:'Admins can view and manage the full academy schedule across instructors, rooms, and programs.'
    }
  };
  const sectionButtons=[...document.querySelectorAll('[data-portal-section]')];
  const sections=[...document.querySelectorAll('[data-section]')];
  const roleTabs=[...document.querySelectorAll('[data-role]')];
  const dashboards=[...document.querySelectorAll('[data-dashboard]')];
  const roleActions=[...document.querySelectorAll('[data-action-roles]')];
  const title=document.querySelector('#portalRoleTitle');
  const subtitle=document.querySelector('#portalRoleSubtitle');
  const settingsRole=document.querySelector('#settingsRole');
  const permissionNote=document.querySelector('[data-permission-note]');
  const portalActions=document.querySelector('.portal-actions');
  let currentRole='admin';

  const canSee=(btn,role)=>(btn.dataset.roles||'').split(' ').includes(role);
  const actionCanSee=(item,role)=>(item.dataset.actionRoles||'').split(' ').includes(role);
  const showSection=(target)=>{
    const allowed=sectionButtons.find(btn=>btn.dataset.portalSection===target && !btn.classList.contains('is-hidden'));
    const next=allowed ? target : 'dashboard';
    sectionButtons.forEach(item=>item.classList.toggle('active',item.dataset.portalSection===next));
    sections.forEach(section=>section.classList.toggle('active',section.dataset.section===next));
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const setRole=(role)=>{
    currentRole=role;
    roleTabs.forEach(item=>item.classList.toggle('active',item.dataset.role===role));
    dashboards.forEach(panel=>panel.classList.toggle('active',panel.dataset.dashboard===role));
    sectionButtons.forEach(btn=>btn.classList.toggle('is-hidden',!canSee(btn,role)));
    roleActions.forEach(item=>item.classList.toggle('role-hidden',!actionCanSee(item,role)));
    if(portalActions) portalActions.classList.toggle('role-hidden',[...portalActions.children].every(child=>child.classList.contains('role-hidden')));
    if(title) title.textContent=roleCopy[role].title;
    if(subtitle) subtitle.textContent=roleCopy[role].subtitle;
    if(settingsRole) settingsRole.value=roleCopy[role].settings;
    if(permissionNote) permissionNote.textContent=roleCopy[role].schedule;
    const active=document.querySelector('.portal-nav-item.active');
    if(!active || active.classList.contains('is-hidden')) showSection('dashboard');
  };

  sectionButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(!canSee(btn,currentRole)) return;
      showSection(btn.dataset.portalSection);
    });
  });
  document.querySelectorAll('[data-portal-section-jump]').forEach(btn=>{
    btn.addEventListener('click',()=>showSection(btn.dataset.portalSectionJump));
  });
  roleTabs.forEach(tab=>tab.addEventListener('click',()=>setRole(tab.dataset.role)));
  if(roleTabs.length) setRole(currentRole);
})();

// ORDS portal interactions
(function(){
  const toast=document.querySelector('#portalToast');
  const showToast=(message)=>{
    if(!toast) return;
    toast.textContent=message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer=window.setTimeout(()=>toast.classList.remove('show'),2600);
  };
  const updateTime=()=>{
    const now=new Date();
    const value=now.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
    document.querySelectorAll('#portalTime,#portalTimeInstructor').forEach(el=>{el.textContent=value});
  };
  updateTime();
  window.setInterval(updateTime,30000);

  const setClockStatus=(label,cls)=>{
    document.querySelectorAll('#clockStatus,#instructorClockStatus').forEach(el=>{
      el.textContent=label;
      el.classList.remove('clocked-in','clocked-out');
      if(cls) el.classList.add(cls);
    });
  };
  document.querySelectorAll('[data-clock-action]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const now=new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
      if(btn.dataset.clockAction==='in'){
        setClockStatus(`Clocked in at ${now}`,'clocked-in');
        showToast('Clock-in saved. Location captured for this clock event.');
      }else{
        setClockStatus(`Clocked out at ${now}`,'clocked-out');
        showToast('Clock-out saved. Location captured for this clock event.');
      }
    });
  });

  document.querySelectorAll('[data-portal-toast]').forEach(btn=>{
    btn.addEventListener('click',()=>showToast(btn.dataset.portalToast));
  });
  document.querySelectorAll('[data-request-decision]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const row=btn.closest('.ops-table > div');
      const badge=row?.querySelector('.badge');
      if(badge){
        badge.textContent=btn.dataset.requestDecision;
        badge.className=`badge ${btn.dataset.requestDecision==='Approved'?'good':'danger'}`;
      }
      showToast(`Reschedule request ${btn.dataset.requestDecision.toLowerCase()} in the approval queue.`);
    });
  });
})();
