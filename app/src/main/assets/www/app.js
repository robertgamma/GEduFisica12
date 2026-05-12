/* EduFísica Pro — app.js v3 */
const GRADO_COLORS=['#3b82f6','#8b5cf6','#10b981','#f59e0b','#f43f5e','#06b6d4','#ec4899','#14b8a6'];
const DB_KEY='edufisica_v2';
function loadDB(){try{const r=localStorage.getItem(DB_KEY);if(r)return JSON.parse(r);}catch(e){}return defDB();}
function saveDB(d){localStorage.setItem(DB_KEY,JSON.stringify(d));}
function defDB(){return{config:{escuela:'',profesor:'',anio:'',materia:'Educación Física',escala:20,minima:10},grados:[],asistencias:[],evaluaciones:[]};}
function nC(a){if(!a)return'';if(typeof a==='string')return a;return[a.apellido,a.nombre].filter(Boolean).join(' ');}
function calcIMC(p,e){if(!p||!e)return null;const v=(parseFloat(p)/(parseFloat(e)**2)).toFixed(1);return isNaN(v)?null:v;}
let db=loadDB();
const state={alumnosGrado:null,attGrado:null,attFecha:null,attIndex:0,attRegistros:{},attListMode:false,evalGrado:null,evalActual:null,informesGrado:null};

function goTo(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  var screenEl = document.getElementById('screen-'+id);
  if (screenEl) screenEl.classList.add('active');
  if(id==='home')initHome();if(id==='config')initConfig();if(id==='alumnos')initAlumnos();
  if(id==='asistencia')initAsistencia();if(id==='evaluaciones')initEval();if(id==='informes')initInformes();
}
function toast(m,c){const t=document.getElementById('toast');t.textContent=m;t.style.color=c||'#f1f5f9';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}

/* HOME */
function initHome(){
  const cfg=db.config;
  document.getElementById('hdr-escuela').textContent=cfg.escuela||'EduFísica Pro';
  document.getElementById('hdr-profesor').textContent=cfg.profesor?(cfg.materia+' · '+cfg.profesor):'Toca ⚙ para configurar →';
  document.getElementById('stat-alumnos').textContent=db.grados.reduce((s,g)=>s+g.alumnos.length,0);
  document.getElementById('stat-clases').textContent=db.asistencias.length;
  document.getElementById('stat-evals').textContent=db.evaluaciones.length;
  const c=document.getElementById('home-grados');
  if(!db.grados.length){c.innerHTML='<p class="text-muted small" style="text-align:center;padding:20px">Sin grados. Ve a Alumnos → Agregar Grado.</p>';return;}
  c.innerHTML=db.grados.map((g,i)=>`<div class="grado-home-card" onclick="goTo('alumnos');state.alumnosGrado=${i};renderAlumnosLista()">
    <div class="grado-home-dot" style="background:${g.color}"></div>
    <span class="grado-home-name">${g.nombre}</span>
    <span class="grado-home-count">${g.alumnos.length} alumnos</span>
    <i class="fas fa-chevron-right" style="color:${g.color};font-size:12px"></i></div>`).join('');
}

/* CONFIG */
function initConfig(){const c=db.config;['escuela','profesor','anio','materia'].forEach(k=>document.getElementById('cfg-'+k).value=c[k]||'');document.getElementById('cfg-escala').value=c.escala||20;document.getElementById('cfg-minima').value=c.minima||10;setTimeout(actualizarInfoRespaldo,100);}
function guardarConfig(){
  ['escuela','profesor','anio','materia'].forEach(k=>db.config[k]=document.getElementById('cfg-'+k).value.trim());
  db.config.escala=parseInt(document.getElementById('cfg-escala').value)||20;
  db.config.minima=parseFloat(document.getElementById('cfg-minima').value)||10;
  saveDB(db);toast('✅ Guardado','#34d399');goTo('home');
}

/* ALUMNOS */
function initAlumnos(){_alumnosGrupoFiltro=null;state.alumnosGrado=null;show('alumnos-picker');hide('alumnos-lista-view');document.getElementById('btn-add-alumno').style.display='none';document.getElementById('alumnos-title').textContent='Gestión de Alumnos';renderGradosPicker();}
function renderGradosPicker(){
  const grid=document.getElementById('alumnos-grado-grid');
  let html=`<button class="grado-pick-btn" style="background:#ffffff11;border:2px dashed #334155;color:#64748b" onclick="modalAgregarGrado()">
    <i class="fas fa-plus-circle" style="font-size:22px;color:#3b82f6"></i>Agregar<br>Grado<span class="alumnos-count">Nuevo</span></button>`;
  html+=db.grados.map((g,i)=>`<div style="display:flex;flex-direction:column;gap:4px">
    <button class="grado-pick-btn" style="background:${g.color}22;border-color:${g.color}55;color:${g.color}" onclick="seleccionarGradoAlumnos(${i})">
      <i class="fas fa-users" style="font-size:20px"></i>${g.nombre}<span class="alumnos-count">${g.alumnos.length} alumnos${g.grupos&&g.grupos.length?' · '+g.grupos.length+' grupos':''}</span></button>
    <div class="grado-actions">
      <button class="grado-action-btn edit" onclick="event.stopPropagation();modalEditarGrupos(${i})"><i class="fas fa-layer-group"></i>Grupos</button>
      <button class="grado-action-btn delete" onclick="event.stopPropagation();eliminarGrado(${i})"><i class="fas fa-trash"></i>Eliminar</button>
    </div></div>`).join('');
  grid.innerHTML=html;
}
function modalAgregarGrado(){
  abrirModal(`<p class="modal-title">Nuevo Grado / Sección</p>
    <div class="modal-form">
      <div class="form-group"><label>Nombre del grado</label><input type="text" id="ng-nombre" placeholder="Ej: 1er Grado A"></div>
      <div class="form-group"><label>Color</label><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
        ${GRADO_COLORS.map(c=>`<button onclick="selColorGrado('${c}',this)" data-color="${c}" style="width:34px;height:34px;border-radius:50%;background:${c};border:3px solid transparent;transition:all .2s"></button>`).join('')}
      </div><input type="hidden" id="ng-color" value="${GRADO_COLORS[0]}"></div>
      <div class="form-group"><label>Grupos (opcional)</label>
        <p class="text-muted small mb-2">Ej: Grupo A, Grupo B — uno por línea</p>
        <textarea id="ng-grupos" rows="3" placeholder="Grupo A&#10;Grupo B&#10;Grupo C"></textarea>
      </div>
    </div>
    <button class="btn-primary w-full" onclick="guardarGrado()"><i class="fas fa-plus"></i> Crear Grado</button>`);
  setTimeout(()=>{const b=document.querySelectorAll('#modal-content [data-color]');if(b[0])b[0].style.borderColor='#fff';},100);
}
function selColorGrado(c,btn){document.getElementById('ng-color').value=c;document.querySelectorAll('#modal-content [data-color]').forEach(b=>b.style.borderColor='transparent');btn.style.borderColor='#fff';}
function guardarGrado(){
  const ngNombreEl = document.getElementById('ng-nombre');
  const n = ngNombreEl ? ngNombreEl.value.trim() : '';
  const ngColorEl = document.getElementById('ng-color');
  const c = (ngColorEl ? ngColorEl.value : '') || GRADO_COLORS[0];
  if(!n){toast('⚠️ Escribe el nombre','#f59e0b');return;}
  const ngGruposEl = document.getElementById('ng-grupos');
  const gruposRaw = ngGruposEl ? ngGruposEl.value.trim() : '';
  const grupos=gruposRaw?gruposRaw.split('\n').map(s=>s.trim()).filter(Boolean):[];
  db.grados.push({nombre:n,color:c,alumnos:[],grupos});saveDB(db);cerrarModal();renderGradosPicker();toast('✅ Grado creado','#34d399');
}
function eliminarGrado(idx){
  const g=db.grados[idx];
  if(!confirm(`¿Eliminar "${g.nombre}" con ${g.alumnos.length} alumnos?\nSe borrarán todas sus asistencias y evaluaciones.`))return;
  db.grados.splice(idx,1);
  db.asistencias=db.asistencias.filter(a=>a.gradoIdx!==idx).map(a=>{if(a.gradoIdx>idx)a.gradoIdx--;return a;});
  db.evaluaciones=db.evaluaciones.filter(e=>e.gradoIdx!==idx).map(e=>{if(e.gradoIdx>idx)e.gradoIdx--;return e;});
  saveDB(db);renderGradosPicker();toast('🗑️ Grado eliminado','#f87171');
}
function modalEditarGrupos(idx){
  const g=db.grados[idx];
  const grupos=g.grupos||[];
  const chipsHtml=()=>grupos.map((gr,j)=>`<span class="grupo-chip">${gr}<span class="chip-remove" onclick="quitarGrupoTemp(${j})">✕</span></span>`).join('');
  window._tmpGrupos=[...grupos];
  abrirModal(`<p class="modal-title"><i class="fas fa-layer-group" style="color:#818cf8"></i> Grupos: ${g.nombre}</p>
    <div class="modal-form">
      <div class="form-group"><label>Agregar grupo</label>
        <div style="display:flex;gap:8px">
          <input type="text" id="nuevo-grupo-input" placeholder="Ej: Grupo A" style="flex:1">
          <button class="btn-primary" style="padding:10px 14px;font-size:13px" onclick="agregarGrupoTemp()"><i class="fas fa-plus"></i></button>
        </div>
      </div>
      <div class="grupo-chip-list" id="grupos-chip-list">${chipsHtml()}</div>
    </div>
    <button class="btn-primary w-full mt-3" onclick="guardarGrupos(${idx})"><i class="fas fa-save"></i> Guardar Grupos</button>`);
}
function agregarGrupoTemp(){
  const inp=document.getElementById('nuevo-grupo-input');if(!inp)return;
  const v=inp.value.trim();if(!v)return;
  window._tmpGrupos.push(v);inp.value='';
  document.getElementById('grupos-chip-list').innerHTML=window._tmpGrupos.map((gr,j)=>`<span class="grupo-chip">${gr}<span class="chip-remove" onclick="quitarGrupoTemp(${j})">✕</span></span>`).join('');
}
function quitarGrupoTemp(j){
  window._tmpGrupos.splice(j,1);
  document.getElementById('grupos-chip-list').innerHTML=window._tmpGrupos.map((gr,i)=>`<span class="grupo-chip">${gr}<span class="chip-remove" onclick="quitarGrupoTemp(${i})">✕</span></span>`).join('');
}
function guardarGrupos(idx){
  db.grados[idx].grupos=window._tmpGrupos||[];
  saveDB(db);cerrarModal();renderGradosPicker();toast('✅ Grupos guardados','#34d399');
}
let _alumnosGrupoFiltro=null;
function renderAlumnosLista(){
  const i=state.alumnosGrado,g=db.grados[i];
  hide('alumnos-picker');show('alumnos-lista-view');
  document.getElementById('btn-add-alumno').style.display='flex';
  document.getElementById('alumnos-title').textContent=g.nombre;
  const grupos=g.grupos||[];
  // Filtro por grupo
  let filterBar='';
  if(grupos.length){
    const todos=_alumnosGrupoFiltro===null;
    filterBar=`<div class="grupo-filter-bar">
      <button class="grupo-filter-btn${todos?' active':''}" onclick="filtrarGrupoAlumnos(null)">Todos</button>
      ${grupos.map(gr=>`<button class="grupo-filter-btn${_alumnosGrupoFiltro===gr?' active':''}" onclick="filtrarGrupoAlumnos('${gr.replace(/'/g,"\\'")}')">&#x1F3F7;&#xFE0F; ${gr}</button>`).join('')}
    </div>`;
  }
  const alumnosFiltrados=grupos.length&&_alumnosGrupoFiltro?g.alumnos.filter(a=>typeof a==='object'&&a.grupo===_alumnosGrupoFiltro):g.alumnos;
  document.getElementById('alumnos-banner').innerHTML=`<i class="fas fa-users"></i> ${g.alumnos.length} alumnos${grupos.length?' · '+grupos.length+' grupos':''}${_alumnosGrupoFiltro?' · Viendo: '+_alumnosGrupoFiltro:''}`;
  const lista=document.getElementById('alumnos-lista');
  // Inject filter bar before list
  const filterEl=document.getElementById('alumnos-filter-bar');
  if(filterEl)filterEl.innerHTML=filterBar;
  if(!alumnosFiltrados.length){lista.innerHTML='<p class="text-muted small" style="text-align:center;padding:20px">Sin alumnos'+(_alumnosGrupoFiltro?' en este grupo':'')+'. '+(grupos.length&&_alumnosGrupoFiltro?'':'Toca + para agregar.')+'</p>';return;}
  const allIdx=g.alumnos;
  lista.innerHTML=alumnosFiltrados.map((a)=>{
    const j=allIdx.indexOf(a);
    const nombre=nC(a);
    const imc=typeof a==='object'?calcIMC(a.peso,a.estatura):null;
    const det=typeof a==='object'?[a.fechaNac?`🎂 ${a.fechaNac}`:'',a.peso?`⚖️ ${a.peso}kg`:'',a.estatura?`📏 ${a.estatura}m`:'',imc?`IMC:${imc}`:''].filter(Boolean).join(' · '):'';
    const grupoBadge=a.grupo?`<span class="grupo-badge"><i class="fas fa-layer-group"></i>${a.grupo}</span>`:'';
    return`<div class="student-item" style="flex-direction:column;align-items:flex-start;gap:4px">
      <div style="display:flex;align-items:center;gap:10px;width:100%">
        <div class="student-num">${j+1}</div><span class="student-name" style="flex:1">${nombre} ${grupoBadge}</span>
        <button class="student-edit" onclick="editarAlumno(${i},${j})" title="Editar"><i class="fas fa-edit"></i></button>
        <button class="student-del" onclick="eliminarAlumno(${i},${j})" title="Eliminar"><i class="fas fa-trash"></i></button>
      </div>${det?`<p style="font-size:11px;color:var(--muted);padding-left:34px">${det}</p>`:''}</div>`;
  }).join('');
}
function filtrarGrupoAlumnos(gr){_alumnosGrupoFiltro=gr;renderAlumnosLista();}
function backAlumnos(){if(state.alumnosGrado!==null){state.alumnosGrado=null;initAlumnos();}else goTo('home');}
function modalAlumno(){
  const g=db.grados[state.alumnosGrado];
  const grupos=g.grupos||[];
  const grupoSel=grupos.length?`<div class="form-group"><label>Grupo</label><select id="na-gr"><option value="">Sin grupo</option>${grupos.map(gr=>`<option value="${gr}">${gr}</option>`).join('')}</select></div>`:'';
  abrirModal(`<p class="modal-title">Registrar Alumno</p>
    <div class="modal-form">
      <div class="form-group"><label>Apellido(s) *</label><input type="text" id="na-ap" placeholder="Apellido Apellido"></div>
      <div class="form-group"><label>Nombre(s) *</label><input type="text" id="na-nm" placeholder="Nombre Nombre"></div>
      ${grupoSel}
      <div class="form-group"><label>Fecha de Nacimiento</label><input type="date" id="na-fn"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group"><label>Peso (kg)</label><input type="number" id="na-pe" placeholder="35.0" min="5" step="0.1"></div>
        <div class="form-group"><label>Estatura (m)</label><input type="number" id="na-es" placeholder="1.35" min="0.5" step="0.01"></div>
      </div>
      <div id="na-imc" style="display:none;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.25);border-radius:8px;padding:8px 12px;font-size:12px;color:#a78bfa;font-weight:700;margin-top:6px"></div>
    </div>
    <button class="btn-primary w-full mt-3" onclick="guardarAlumno()"><i class="fas fa-user-plus"></i> Registrar</button>`);
  setTimeout(()=>{
    const upd=()=>{
      const peEl = document.getElementById('na-pe');
      const esEl = document.getElementById('na-es');
      const imc=calcIMC(peEl ? peEl.value : null, esEl ? esEl.value : null);
      const el=document.getElementById('na-imc');
      if(imc&&el){el.style.display='';const cat=imc<18.5?'Bajo peso':imc<25?'Normal ✅':imc<30?'Sobrepeso':'Obesidad';el.innerHTML=`<i class="fas fa-calculator"></i> IMC: <b>${imc}</b> — ${cat}`;}
    };
    const naPe = document.getElementById('na-pe');
    if (naPe) naPe.addEventListener('input',upd);
    const naEs = document.getElementById('na-es');
    if (naEs) naEs.addEventListener('input',upd);
    const naAp = document.getElementById('na-ap');
    if (naAp) naAp.focus();
  },300);
}
function guardarAlumno(){
  const naApEl = document.getElementById('na-ap');
  const naNmEl = document.getElementById('na-nm');
  const ap = naApEl ? naApEl.value.trim() : '';
  const nm = naNmEl ? naNmEl.value.trim() : '';
  if(!ap||!nm){toast('⚠️ Apellido y nombre son obligatorios','#f59e0b');return;}
  const naGrEl = document.getElementById('na-gr');
  const grupo=naGrEl ? naGrEl.value : '';
  const naFnEl = document.getElementById('na-fn');
  const naPeEl = document.getElementById('na-pe');
  const naEsEl = document.getElementById('na-es');
  db.grados[state.alumnosGrado].alumnos.push({
    nombre:nm,
    apellido:ap,
    grupo,
    fechaNac: naFnEl ? naFnEl.value : '',
    peso: naPeEl ? naPeEl.value : '',
    estatura: naEsEl ? naEsEl.value : ''
  });
  saveDB(db);cerrarModal();renderAlumnosLista();toast('✅ Alumno registrado','#34d399');
}
function eliminarAlumno(gi,ai){if(!confirm('¿Eliminar alumno?'))return;db.grados[gi].alumnos.splice(ai,1);saveDB(db);renderAlumnosLista();toast('Eliminado','#f87171');}
function editarAlumno(gi,ai){
  const a=db.grados[gi].alumnos[ai];
  const ap=typeof a==='object'?a.apellido:a;
  const nm=typeof a==='object'?a.nombre:'';
  const fn=typeof a==='object'?a.fechaNac:'';
  const pe=typeof a==='object'?a.peso:'';
  const es=typeof a==='object'?a.estatura:'';
  const grActual=typeof a==='object'?(a.grupo||''):'';
  const grupos=db.grados[gi].grupos||[];
  const grupoSel=grupos.length?`<div class="form-group"><label>Grupo</label><select id="ea-gr"><option value="">Sin grupo</option>${grupos.map(gr=>`<option value="${gr}"${gr===grActual?' selected':''}>${gr}</option>`).join('')}</select></div>`:'';
  abrirModal(`<p class="modal-title">Editar Alumno</p>
    <div class="modal-form">
      <div class="form-group"><label>Apellido(s) *</label><input type="text" id="ea-ap" value="${ap}" placeholder="Apellido Apellido"></div>
      <div class="form-group"><label>Nombre(s) *</label><input type="text" id="ea-nm" value="${nm}" placeholder="Nombre Nombre"></div>
      ${grupoSel}
      <div class="form-group"><label>Fecha de Nacimiento</label><input type="date" id="ea-fn" value="${fn}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group"><label>Peso (kg)</label><input type="number" id="ea-pe" value="${pe}" placeholder="35.0" min="5" step="0.1"></div>
        <div class="form-group"><label>Estatura (m)</label><input type="number" id="ea-es" value="${es}" placeholder="1.35" min="0.5" step="0.01"></div>
      </div>
      <div id="ea-imc" style="display:none;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.25);border-radius:8px;padding:8px 12px;font-size:12px;color:#a78bfa;font-weight:700;margin-top:6px"></div>
    </div>
    <button class="btn-primary w-full mt-3" onclick="guardarEdicionAlumno(${gi},${ai})"><i class="fas fa-save"></i> Guardar Cambios</button>`);
  setTimeout(()=>{
    const upd=()=>{
      const peEl = document.getElementById('ea-pe');
      const esEl = document.getElementById('ea-es');
      const imc=calcIMC(peEl ? peEl.value : null, esEl ? esEl.value : null);
      const el=document.getElementById('ea-imc');
      if(imc&&el){el.style.display='';const cat=imc<18.5?'Bajo peso':imc<25?'Normal ✅':imc<30?'Sobrepeso':'Obesidad';el.innerHTML=`<i class="fas fa-calculator"></i> IMC: <b>${imc}</b> — ${cat}`;}
      else if(el)el.style.display='none';
    };
    const eaPe = document.getElementById('ea-pe');
    if (eaPe) eaPe.addEventListener('input',upd);
    const eaEs = document.getElementById('ea-es');
    if (eaEs) eaEs.addEventListener('input',upd);
    upd();
    const eaAp = document.getElementById('ea-ap');
    if (eaAp) eaAp.focus();
  },300);
}
function guardarEdicionAlumno(gi,ai){
  const eaApEl = document.getElementById('ea-ap');
  const eaNmEl = document.getElementById('ea-nm');
  const ap = eaApEl ? eaApEl.value.trim() : '';
  const nm = eaNmEl ? eaNmEl.value.trim() : '';
  if(!ap||!nm){toast('⚠️ Apellido y nombre son obligatorios','#f59e0b');return;}
  const nombreViejo=nC(db.grados[gi].alumnos[ai]);
  const eaGrEl = document.getElementById('ea-gr');
  const grupo = eaGrEl ? eaGrEl.value : '';
  const eaFnEl = document.getElementById('ea-fn');
  const eaPeEl = document.getElementById('ea-pe');
  const eaEsEl = document.getElementById('ea-es');
  db.grados[gi].alumnos[ai]={
    nombre:nm,
    apellido:ap,
    grupo,
    fechaNac: eaFnEl ? eaFnEl.value : '',
    peso: eaPeEl ? eaPeEl.value : '',
    estatura: eaEsEl ? eaEsEl.value : ''
  };
  const nombreNuevo=nC(db.grados[gi].alumnos[ai]);
  if(nombreViejo!==nombreNuevo){
    db.asistencias.forEach(att=>{if(att.registros[nombreViejo]!==undefined){att.registros[nombreNuevo]=att.registros[nombreViejo];delete att.registros[nombreViejo];}});
    db.evaluaciones.forEach(ev=>{if(ev.notas[nombreViejo]!==undefined){ev.notas[nombreNuevo]=ev.notas[nombreViejo];delete ev.notas[nombreViejo];}});
  }
  saveDB(db);cerrarModal();renderAlumnosLista();toast('✅ Alumno actualizado','#34d399');
}
function agregarBulk(){
  const txt=document.getElementById('bulk-names').value.trim();if(!txt)return;
  txt.split('\n').map(n=>n.trim()).filter(Boolean).forEach(n=>{const p=n.split(' ');db.grados[state.alumnosGrado].alumnos.push({apellido:p[0]||n,nombre:p.slice(1).join(' ')||'',fechaNac:'',peso:'',estatura:''}); });
  saveDB(db);document.getElementById('bulk-names').value='';renderAlumnosLista();toast('✅ Alumnos agregados','#34d399');
}
function evalsPorGrado(i){return db.evaluaciones.filter(e=>e.gradoIdx===i).length;}
function abrirModal(html){document.getElementById('modal-content').innerHTML=html;document.getElementById('modal-overlay').classList.add('open');}
function cerrarModal(){document.getElementById('modal-overlay').classList.remove('open');}
function show(id){const e=document.getElementById(id);if(e)e.style.display='';}
function hide(id){const e=document.getElementById(id);if(e)e.style.display='none';}
/* PANTALLA COMPLETA */
function pedirPantallaCompleta(){
  const el=document.documentElement;
  if(el.requestFullscreen)el.requestFullscreen();
  else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();
}
/* BOTÓN RETROCESO ANDROID */
function pushHistoryState(id){history.pushState({screen:id},'',' ');}
const _goTo=goTo;
goTo=function(id){
  _goTo(id);
  if(id!=='home')pushHistoryState(id);
};
window.addEventListener('popstate',e=>{
  const scr=document.querySelector('.screen.active');
  if(!scr)return;
  const id=scr.id.replace('screen-','');
  if(id==='home'){history.pushState({screen:'home'},'',' ');return;}
  // navegar atrás según pantalla actual
  if(id==='config')_goTo('home');
  else if(id==='alumnos'){if(state.alumnosGrado!==null){state.alumnosGrado=null;initAlumnos();}else _goTo('home');}
  else if(id==='asistencia')backAsistencia();
  else if(id==='evaluaciones')backEval();
  else if(id==='informes')backInformes();
  else _goTo('home');
});
document.addEventListener('DOMContentLoaded',()=>{
  db=loadDB();
  const fd=document.getElementById('att-fecha');
  if(fd)fd.value=new Date().toISOString().split('T')[0];
  // Push estado inicial para capturar popstate
  history.replaceState({screen:'home'},'',' ');
  _goTo('home');
  // Pantalla completa al primer toque
  document.addEventListener('click',pedirPantallaCompleta,{once:true});
});
