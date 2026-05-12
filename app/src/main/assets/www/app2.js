/* HELPER: nota a letra A-E */
function notaALetra(nota, escala) {
  if (nota === null || nota === undefined) return {letra:'E', desc:'No Vino', color:'#64748b'};
  const n = parseFloat(nota);
  if (isNaN(n)) return {letra:'E', desc:'No Vino', color:'#64748b'};
  const pct = (n / (escala || 20)) * 100;
  if (pct >= 90) return {letra:'A', desc:'Superador', color:'#10b981'};
  if (pct >= 75) return {letra:'B', desc:'Alcanzado', color:'#3b82f6'};
  if (pct >= 60) return {letra:'C', desc:'En Proceso', color:'#f59e0b'};
  if (pct >= 40) return {letra:'D', desc:'Inicio', color:'#f97316'};
  return {letra:'E', desc:'No Vino', color:'#64748b'};
}
/* HELPER: nota final de un alumno en una evaluación */
function getNotaEval(ev, alumno) {
  const e = (ev.notas && ev.notas[alumno]) ? ev.notas[alumno] : null;
  if (e === null || e === undefined || e === '') return null;
  if (typeof e === 'object') {
    const vals = Object.values(e).map(parseFloat).filter(v => !isNaN(v));
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  }
  const f = parseFloat(e);
  return isNaN(f) ? null : f;
}
/* ASISTENCIA */
function initAsistencia(){
  state.attGrado=null;state.attIndex=0;state.attRegistros={};
  show('att-setup');hide('att-card-mode');hide('att-list-mode');hide('att-summary');
  document.getElementById('asistencia-title').textContent='Asistencia';
  document.getElementById('att-progress-badge').style.display='none';
  if(!document.getElementById('att-fecha').value)document.getElementById('att-fecha').value=new Date().toISOString().split('T')[0];
  const grid=document.getElementById('att-grado-grid');
  if(!db.grados.length){grid.innerHTML='<p class="text-muted small" style="text-align:center;padding:20px">Sin grados. Ve a Alumnos y crea un grado primero.</p>';return;}
  grid.innerHTML=db.grados.map((g,i)=>`<button class="grado-pick-btn" style="background:${g.color}22;border-color:${g.color}55;color:${g.color}" onclick="iniciarAsistencia(${i})">
    <i class="fas fa-clipboard-check" style="font-size:20px"></i>${g.nombre}<span class="alumnos-count">${g.alumnos.length} alumnos</span></button>`).join('');
}
function iniciarAsistencia(i){
  const g=db.grados[i];
  if(!g.alumnos.length){toast('⚠️ Grado sin alumnos','#f59e0b');return;}
  const fecha=document.getElementById('att-fecha').value;
  if(!fecha){toast('⚠️ Selecciona una fecha','#f59e0b');return;}
  state.attGrado=i;state.attFecha=fecha;state.attIndex=0;state.attRegistros={};
  hide('att-setup');show('att-card-mode');
  document.getElementById('asistencia-title').textContent=g.nombre;
  actualizarTarjeta();
}
function actualizarTarjeta(){
  const g=db.grados[state.attGrado],n=g.alumnos.length,i=state.attIndex;
  const badge=document.getElementById('att-progress-badge');
  badge.style.display='flex';badge.textContent=`${i+1} / ${n}`;
  document.getElementById('att-counter').textContent=`Alumno ${i+1} de ${n}`;
  document.getElementById('att-name').textContent=nC(g.alumnos[i]);
}
function marcarAtt(pres){
  const g=db.grados[state.attGrado],nombre=nC(g.alumnos[state.attIndex]);
  state.attRegistros[nombre]=pres;state.attIndex++;
  if(state.attIndex>=g.alumnos.length){finalizarAsistencia();return;}
  actualizarTarjeta();
}
function toggleModoLista(){
  state.attListMode=!state.attListMode;
  if(state.attListMode){hide('att-card-mode');show('att-list-mode');renderListaCompleta();}
  else{
    hide('att-list-mode');show('att-card-mode');
    const g=db.grados[state.attGrado];
    state.attIndex=g.alumnos.findIndex(a=>!(nC(a) in state.attRegistros));
    if(state.attIndex<0)state.attIndex=g.alumnos.length-1;
    actualizarTarjeta();
  }
}
function renderListaCompleta(){
  const g=db.grados[state.attGrado];
  document.getElementById('att-full-list').innerHTML=g.alumnos.map((a,i)=>{
    const nombre=nC(a),marcado=nombre in state.attRegistros,pres=state.attRegistros[nombre];
    const cls=marcado?(pres?'presente':'ausente'):'';
    return`<div class="att-list-item ${cls}" onclick="toggleAttItem(this,'${nombre.replace(/'/g,"\\'")}')">
      <div class="student-num">${i+1}</div>
      <span class="att-list-name">${nombre}</span>
      <span class="att-list-badge ${marcado?(pres?'p':'a'):''}">${marcado?(pres?'P':'A'):'—'}</span></div>`;
  }).join('');
}
function toggleAttItem(el,nombre){
  state.attRegistros[nombre]=!state.attRegistros[nombre];
  const p=state.attRegistros[nombre];
  el.className='att-list-item '+(p?'presente':'ausente');
  const b=el.querySelector('.att-list-badge');b.textContent=p?'P':'A';b.className='att-list-badge '+(p?'p':'a');
}
function finalizarAsistencia(){
  const g=db.grados[state.attGrado];
  g.alumnos.forEach(a=>{const n=nC(a);if(!(n in state.attRegistros))state.attRegistros[n]=false;});
  const pres=Object.values(state.attRegistros).filter(Boolean).length,aus=g.alumnos.length-pres;
  db.asistencias.push({id:Date.now(),gradoIdx:state.attGrado,fecha:state.attFecha,registros:{...state.attRegistros}});
  saveDB(db);hide('att-card-mode');hide('att-list-mode');show('att-summary');
  document.getElementById('att-progress-badge').style.display='none';
  document.getElementById('asistencia-title').textContent='¡Listo!';
  document.getElementById('att-summary-text').textContent=`${g.nombre} · ${state.attFecha} · ${pres} presentes, ${aus} ausentes`;
  document.getElementById('att-summary-list').innerHTML=g.alumnos.map(a=>{
    const n=nC(a),p=state.attRegistros[n];
    return`<div class="summary-row ${p?'p':'a'}"><span>${n}</span><span class="att-list-badge ${p?'p':'a'}">${p?'PRESENTE':'AUSENTE'}</span></div>`;
  }).join('');
}
function backAsistencia(){if(state.attGrado!==null)initAsistencia();else goTo('home');}
function nuevaAsistencia(){initAsistencia();}

/* EVALUACIONES */
function initEval(){
  state.evalGrado=null;state.evalActual=null;
  show('eval-picker');hide('eval-list-view');hide('eval-entry-view');
  document.getElementById('eval-title').textContent='Evaluaciones';
  document.getElementById('btn-add-eval').style.display='none';
  const grid=document.getElementById('eval-grado-grid');
  if(!db.grados.length){grid.innerHTML='<p class="text-muted small" style="text-align:center;padding:20px">Sin grados creados.</p>';return;}
  grid.innerHTML=db.grados.map((g,i)=>`<button class="grado-pick-btn" style="background:${g.color}22;border-color:${g.color}55;color:${g.color}" onclick="seleccionarGradoEval(${i})">
    <i class="fas fa-star-half-alt" style="font-size:20px"></i>${g.nombre}<span class="alumnos-count">${evalsPorGrado(i)} evals</span></button>`).join('');
}
function seleccionarGradoEval(i){
  state.evalGrado=i;hide('eval-picker');show('eval-list-view');hide('eval-entry-view');
  document.getElementById('eval-title').textContent=db.grados[i].nombre;
  document.getElementById('btn-add-eval').style.display='flex';
  renderEvalLista();
}
function renderEvalLista(){
  const evs=db.evaluaciones.filter(e=>e.gradoIdx===state.evalGrado);
  const sumativas=evs.filter(e=>e.tipo==='sumativa');
  const formativas=evs.filter(e=>e.tipo==='formativa');
  const tpSum=sumativas.reduce((s,e)=>s+(e.peso||0),0);
  const hasAmbo=sumativas.length>0&&formativas.length>0;
  document.getElementById('eval-ponderado-total').innerHTML=
    `<i class="fas fa-info-circle"></i> `+
    (hasAmbo?`Sumativas: <b>${tpSum}%</b> · Formativas promediadas · Nota final = <b>50% Sum + 50% Form</b>`
    :sumativas.length?`Sumativas: <b>${tpSum}%</b> · Valen 100% de la nota final`
    :formativas.length?`Solo formativas · Su promedio = <b>100%</b> de la nota final`
    :'Sin evaluaciones');
  const lista=document.getElementById('eval-lista');
  if(!evs.length){lista.innerHTML='<p class="text-muted small" style="text-align:center;padding:20px">Sin evaluaciones. Toca + para crear.</p>';return;}
  lista.innerHTML=evs.map(e=>{
    const notas=Object.values(e.notas||{}).map(v=>getNotaEval({notas:{x:v},'indicadores':e.indicadores},'x')).filter(v=>v!==null);
    const prom=notas.length?(notas.reduce((a,b)=>a+b,0)/notas.length).toFixed(1):'—';
    const inds=(e.indicadores && e.indicadores.length) ? `<span style="font-size:10px;color:var(--muted)">(${e.indicadores.length} indicadores)</span>` : ''
    return`<div class="eval-item" onclick="abrirEntradaNotas(${e.id})">
      <span class="eval-tipo-badge ${e.tipo==='sumativa'?'pond':'form'}">${e.tipo==='sumativa'?'Sumativa':'Formativa'}</span>
      <span class="eval-name">${e.nombre} ${inds}</span>
      <span class="eval-peso">${e.tipo==='sumativa'?e.peso+'%':''} x̄${prom}</span>
      <button class="eval-del" onclick="event.stopPropagation();eliminarEval(${e.id})"><i class="fas fa-trash"></i></button></div>`;
  }).join('');
}
function backEval(){
  if(state.evalActual!==null){state.evalActual=null;show('eval-list-view');hide('eval-entry-view');renderEvalLista();}
  else if(state.evalGrado!==null){state.evalGrado=null;initEval();}
  else goTo('home');
}
function modalEval(){
  abrirModal(`<p class="modal-title">Nueva Evaluación</p>
    <div class="modal-form">
      <div class="form-group"><label>Nombre de la evaluación</label><input type="text" id="ne-nombre" placeholder="Ej: Resistencia, Salto largo..."></div>
      <div class="form-group"><label>Tipo</label><select id="ne-tipo" onchange="document.getElementById('ne-peso-f').style.display=this.value==='sumativa'?'':'none'">
        <option value="sumativa">Sumativa (contribuye con peso % a la nota)</option>
        <option value="formativa">Formativa (promediada, vale 50% si hay sumativas)</option></select></div>
      <div class="form-group" id="ne-peso-f"><label>Peso (%) en nota final</label><input type="number" id="ne-peso" placeholder="Ej: 30" min="1" max="100"></div>
      <div class="form-group">
        <label>Indicadores (uno por línea, opcional)</label>
        <p class="text-muted small mb-2">Si agregas indicadores, la nota de cada alumno será el promedio de ellos.</p>
        <textarea id="ne-inds" rows="4" placeholder="Ej:\nCoordinación\nVelocidad\nActitud\nFlexibilidad"></textarea>
      </div>
    </div>
    <button class="btn-primary w-full" onclick="guardarEval()"><i class="fas fa-plus"></i> Crear</button>`);}
function guardarEval(){
  const neNombre = document.getElementById('ne-nombre');
  const nombre = neNombre ? neNombre.value.trim() : '';
  const neTipo = document.getElementById('ne-tipo');
  const tipo = neTipo ? neTipo.value : '';
  const nePeso = document.getElementById('ne-peso');
  const peso = nePeso ? parseFloat(nePeso.value) : 0;
  const neInds = document.getElementById('ne-inds');
  const indsRaw = neInds ? neInds.value.trim() : '';
  const indicadores=indsRaw?indsRaw.split('\n').map(s=>s.trim()).filter(Boolean):[];
  if(!nombre){toast('⚠️ Escribe el nombre','#f59e0b');return;}
  if(tipo==='sumativa'&&!peso){toast('⚠️ Indica el peso %','#f59e0b');return;}
  const notas={};
  db.grados[state.evalGrado].alumnos.forEach(a=>{
    const n=nC(a);
    if (indicadores.length) {
      const obj = {};
      indicadores.forEach(ind => { obj[ind] = null; });
      notas[n] = obj;
    } else {
      notas[n] = null;
    }
  });
  db.evaluaciones.push({id:Date.now(),gradoIdx:state.evalGrado,nombre,tipo,peso:tipo==='sumativa'?peso:0,indicadores,notas});
  saveDB(db);cerrarModal();renderEvalLista();toast('✅ Evaluación creada','#34d399');
}
function eliminarEval(id){if(!confirm('¿Eliminar evaluación y notas?'))return;db.evaluaciones=db.evaluaciones.filter(e=>e.id!==id);saveDB(db);renderEvalLista();toast('Eliminada','#f87171');}
function abrirEntradaNotas(evalId){
  const ev=db.evaluaciones.find(e=>e.id===evalId);if(!ev)return;
  state.evalActual=evalId;hide('eval-list-view');show('eval-entry-view');
  document.getElementById('eval-title').textContent=ev.nombre;
  const escala=db.config.escala||20;
  const inds=ev.indicadores||[];
  document.getElementById('eval-entry-header').innerHTML=`
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span class="eval-tipo-badge ${ev.tipo==='sumativa'?'pond':'form'}">${ev.tipo}</span>
      <span class="eval-name">${ev.nombre}</span>
      ${ev.tipo==='sumativa'?`<span class="eval-peso">${ev.peso}% del total</span>`:''}
    </div>
    ${inds.length?`<p class="text-muted small mt-2"><i class="fas fa-list-check"></i> ${inds.length} indicadores · promedio = nota del alumno</p>`:''}
    <p class="text-muted small mt-1">Escala 0–${escala}. Vacío = no presentó.</p>`;
  const g=db.grados[ev.gradoIdx];
  document.getElementById('eval-entry-lista').innerHTML=g.alumnos.map((a,i)=>{
    const nombre=nC(a);
    if(inds.length){
      const entradas=ev.notas[nombre]||{};
      const promLive=getNotaEval(ev,nombre);
      return`<div class="eval-entry-item" style="flex-direction:column;align-items:flex-start;gap:6px;padding:12px 14px">
        <div style="display:flex;align-items:center;gap:8px;width:100%">
          <div class="student-num">${i+1}</div>
          <span class="eval-entry-name" style="flex:1;font-weight:800">${nombre}</span>
          <span class="eval-entry-avg" id="avg-${i}">x̄ ${promLive!==null?promLive.toFixed(1):'—'}</span>
        </div>
        <div style="width:100%;padding-left:32px">${inds.map(ind=>{
          const v = (entradas[ind] !== undefined && entradas[ind] !== null) ? entradas[ind] : '';
          return`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="flex:1;font-size:12px;color:var(--muted)">${ind}</span>
            <input class="eval-entry-input" type="number" min="0" max="${escala}" step="0.5"
              data-alumno="${nombre}" data-ind="${ind}" data-row="${i}" value="${v}" placeholder="—"
              oninput="actualizarPromedioFila(${i})" style="width:64px">
          </div>`;
        }).join('')}</div>
      </div>`;
    }
    const nota=ev.notas[nombre];
    const v=(nota!==null&&nota!==undefined)?nota:'';
    return`<div class="eval-entry-item">
      <div class="student-num">${i+1}</div>
      <span class="eval-entry-name">${nombre}</span>
      <input class="eval-entry-input" type="number" min="0" max="${escala}" step="0.5"
        data-alumno="${nombre}" value="${v}" placeholder="—" oninput="actualizarPromedio()">
    </div>`;
  }).join('');
  actualizarPromedio();
}
function actualizarPromedioFila(row){
  const inps=[...document.querySelectorAll(`.eval-entry-input[data-row="${row}"]`)];
  const vals=inps.map(i=>parseFloat(i.value)).filter(v=>!isNaN(v));
  const avg=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):'—';
  const el=document.getElementById('avg-'+row);
  if(el)el.textContent='x̄ '+avg;
  actualizarPromedio();
}
function actualizarPromedio(){
  const ev=db.evaluaciones.find(e=>e.id===state.evalActual);
  const inds = (ev && ev.indicadores) ? ev.indicadores : [];
  let vals;
  if(inds.length){
    vals=[];
    const alumnos=[...new Set([...document.querySelectorAll('.eval-entry-input')].map(i=>i.dataset.alumno))];
    alumnos.forEach(alumno=>{
      const vs=[...document.querySelectorAll(`.eval-entry-input[data-alumno="${CSS.escape(alumno)}"]`)].map(i=>parseFloat(i.value)).filter(v=>!isNaN(v));
      if(vs.length)vals.push(vs.reduce((a,b)=>a+b,0)/vs.length);
    });
  }else{
    vals=[...document.querySelectorAll('.eval-entry-input')].map(i=>parseFloat(i.value)).filter(v=>!isNaN(v));
  }
  if(!vals.length)return;
  const prom=(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2);
  const h=document.getElementById('eval-entry-header');
  let el=h.querySelector('.prom-live');
  if(!el){el=document.createElement('p');el.className='prom-live text-muted small mt-2';h.appendChild(el);}
  el.innerHTML=`Promedio del grupo: <b style="color:#a78bfa">${prom}</b> · ${vals.length} notas`;
}
function guardarNotas(){
  const ev=db.evaluaciones.find(e=>e.id===state.evalActual);if(!ev)return;
  const inds=ev.indicadores||[];
  if(inds.length){
    // Build {ind: value} per alumno
    const map={};
    document.querySelectorAll('.eval-entry-input').forEach(inp=>{
      const a=inp.dataset.alumno,ind=inp.dataset.ind,v=inp.value.trim();
      if(!map[a])map[a]={};
      map[a][ind]=v!==''?parseFloat(v):null;
    });
    Object.keys(map).forEach(a=>ev.notas[a]=map[a]);
  }else{
    document.querySelectorAll('.eval-entry-input').forEach(inp=>{
      const v=inp.value.trim();ev.notas[inp.dataset.alumno]=v!==''?parseFloat(v):null;
    });
  }
  saveDB(db);toast('✅ Notas guardadas','#34d399');state.evalActual=null;show('eval-list-view');hide('eval-entry-view');renderEvalLista();
}

/* INFORMES */
function initInformes(){
  state.informesGrado=null;show('informes-picker');hide('informes-view');
  document.getElementById('informes-title').textContent='Informes';
  const grid=document.getElementById('informes-grado-grid');
  if(!db.grados.length){grid.innerHTML='<p class="text-muted small" style="text-align:center;padding:20px">Sin grados creados.</p>';return;}
  grid.innerHTML=db.grados.map((g,i)=>`<button class="grado-pick-btn" style="background:${g.color}22;border-color:${g.color}55;color:${g.color}" onclick="seleccionarGradoInformes(${i})">
    <i class="fas fa-chart-bar" style="font-size:20px"></i>${g.nombre}<span class="alumnos-count">${g.alumnos.length} alumnos</span></button>`).join('');
}
function seleccionarGradoInformes(i){
  state.informesGrado=i;hide('informes-picker');show('informes-view');
  document.getElementById('informes-title').textContent=db.grados[i].nombre;
  renderPreviewAsistencia(i);renderPreviewNotas(i);renderPreviewEvalIndividual(i);
}
function backInformes(){if(state.informesGrado!==null){state.informesGrado=null;initInformes();}else goTo('home');}

function calcAsistencia(gi){
  const g=db.grados[gi],clases=db.asistencias.filter(a=>a.gradoIdx===gi);
  return g.alumnos.map(a=>{
    const nombre=nC(a),pres=clases.filter(c=>c.registros[nombre]===true).length;
    const pct=clases.length?Math.round(pres/clases.length*100):0;
    return{nombre,pres,aus:clases.length-pres,total:clases.length,pct,
      peso:typeof a==='object'?a.peso:'',estatura:typeof a==='object'?a.estatura:'',
      fechaNac:typeof a==='object'?a.fechaNac:''};
  });
}
function calcNotas(gi){
  const g=db.grados[gi];
  const sumativas=db.evaluaciones.filter(e=>e.gradoIdx===gi&&e.tipo==='sumativa');
  const formativas=db.evaluaciones.filter(e=>e.gradoIdx===gi&&e.tipo==='formativa');
  const hasSum=sumativas.length>0,hasForm=formativas.length>0;
  const esc=db.config.escala||20,min=db.config.minima||10;
  return g.alumnos.map(a=>{
    const nombre=nC(a);
    // Sumativas: weighted average (normalized to scale)
    let sumPts=0,sumPeso=0;
    sumativas.forEach(e=>{
      const nota=getNotaEval(e,nombre);
      if(nota!==null){sumPts+=nota*(e.peso/100);sumPeso+=e.peso;}
    });
    const notaSum=sumPeso>0?(sumPts/sumPeso*esc):null;
    // Formativas: simple average
    const fVals=formativas.map(e=>getNotaEval(e,nombre)).filter(v=>v!==null);
    const notaForm=fVals.length?fVals.reduce((a,b)=>a+b,0)/fVals.length:null;
    // Final grade: 50/50 if both, else 100% whichever exists
    let prom=null;
    if(hasSum&&hasForm){
      if(notaSum!==null&&notaForm!==null) prom=((notaSum+notaForm)/2).toFixed(2);
      else if(notaSum!==null) prom=notaSum.toFixed(2);
      else if(notaForm!==null) prom=notaForm.toFixed(2);
    }else if(hasSum) prom=notaSum!==null?notaSum.toFixed(2):null;
    else if(hasForm) prom=notaForm!==null?notaForm.toFixed(2):null;
    return{nombre,prom,aprobado:prom!==null&&parseFloat(prom)>=min,notaSum,notaForm};
  });
}
function renderPreviewAsistencia(i){
  const datos=calcAsistencia(i);
  const clases=db.asistencias.filter(a=>a.gradoIdx===i).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const el=document.getElementById('informe-asistencia-preview');
  if(!datos.length||!clases.length){el.innerHTML='<p class="text-muted small" style="padding:12px">Sin registros de asistencia aún.</p>';return;}
  el.innerHTML=`
    <div style="display:flex;gap:6px;margin-bottom:12px">
      <button id="tab-resumen" class="tab-btn active" onclick="showAttTab('resumen',${i})"><i class="fas fa-list"></i> Resumen</button>
      <button id="tab-detalle" class="tab-btn" onclick="showAttTab('detalle',${i})"><i class="fas fa-calendar-days"></i> Día a día</button>
    </div>
    <div id="att-preview-resumen">${buildResumenTable(datos)}</div>
    <div id="att-preview-detalle" style="display:none">${buildDetalleTable(datos,clases)}</div>`;
}
function buildResumenTable(datos){
  return`<table><thead><tr><th>Alumno</th><th>Clases</th><th style="color:#34d399">Asist.</th><th style="color:#f87171">Aus.</th><th>%</th></tr></thead><tbody>
  ${datos.map(d=>`<tr><td>${d.nombre}</td><td>${d.total}</td><td style="color:#34d399;font-weight:700">${d.pres}</td><td style="color:#f87171;font-weight:700">${d.aus}</td><td><b>${d.pct}%</b></td></tr>`).join('')}
  </tbody></table>`;
}
function buildDetalleTable(datos,clases){
  const fmt=f=>{const d=new Date(f+'T00:00:00');return d.toLocaleDateString('es-VE',{day:'2-digit',month:'2-digit'});};
  const diaAbr=f=>{const ds=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];return ds[new Date(f+'T00:00:00').getDay()];};
  return`<div style="overflow-x:auto"><table style="font-size:11px"><thead><tr>
    <th style="min-width:110px;position:sticky;left:0;background:#1e293b">Alumno</th>
    ${clases.map(c=>`<th style="min-width:42px;text-align:center">${fmt(c.fecha)}<br><span style="font-size:9px;color:var(--muted)">${diaAbr(c.fecha)}</span></th>`).join('')}
    <th>%</th></tr></thead><tbody>
  ${datos.map(d=>{
    const celdas=clases.map(c=>{
      const p=c.registros[d.nombre];
      return`<td style="text-align:center;font-size:14px;color:${p?'#34d399':'#f87171'}">${p?'✓':'✗'}</td>`;
    }).join('');
    return`<tr><td style="position:sticky;left:0;background:#1e293b;font-weight:700">${d.nombre}</td>${celdas}<td style="font-weight:800">${d.pct}%</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function showAttTab(tab,i){
  document.getElementById('att-preview-resumen').style.display=tab==='resumen'?'':'none';
  document.getElementById('att-preview-detalle').style.display=tab==='detalle'?'':'none';
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
}
function renderPreviewNotas(i){
  const datos=calcNotas(i);
  const sumativas=db.evaluaciones.filter(e=>e.gradoIdx===i&&e.tipo==='sumativa');
  const formativas=db.evaluaciones.filter(e=>e.gradoIdx===i&&e.tipo==='formativa');
  const todasEvs=[...sumativas,...formativas];
  const el=document.getElementById('informe-notas-preview');
  const esc=db.config.escala||20;
  if(!datos.length||!todasEvs.length){el.innerHTML='<p class="text-muted small" style="padding:12px">Sin evaluaciones registradas aún.</p>';return;}
  const hasBoth=sumativas.length>0&&formativas.length>0;
  const sumHdr=sumativas.map(e=>`<th>${e.nombre}<br><span style="font-size:9px">${e.peso}%·Sum</span></th>`).join('');
  const formHdr=formativas.map(e=>`<th>${e.nombre}<br><span style="font-size:9px">Form.</span></th>`).join('');
  const notaHdr=hasBoth?'<th>Sum(50%)</th><th>Form(50%)</th><th>FINAL</th><th>Letra</th>':'<th>FINAL</th><th>Letra</th>';
  el.innerHTML=`<table><thead><tr><th>Alumno</th>${sumHdr}${formHdr}${notaHdr}</tr></thead><tbody>
  ${datos.map(d=>{
    const ns=sumativas.map(e=>{const v=getNotaEval(e,d.nombre);return`<td>${v!==null?v.toFixed(1):'\u2014'}</td>`;}).join('');
    const nf=formativas.map(e=>{const v=getNotaEval(e,d.nombre);return`<td>${v!==null?v.toFixed(1):'\u2014'}</td>`;}).join('');
    const badge=d.prom!==null?`<span class="${d.aprobado?'badge-aprobado':'badge-reprobado'}">${d.prom}</span>`:'\u2014';
    const extra=hasBoth?`<td>${d.notaSum!==null?d.notaSum.toFixed(1):'\u2014'}</td><td>${d.notaForm!==null?d.notaForm.toFixed(1):'\u2014'}</td>`:'';
    const lr=notaALetra(d.prom!==null?parseFloat(d.prom):null,esc);
    const letraBadge=`<span class="badge-letra" style="background:${lr.color}22;color:${lr.color};border:1px solid ${lr.color}55">${lr.letra} <span style="font-size:9px;font-weight:400">${lr.desc}</span></span>`;
    return`<tr><td>${d.nombre}</td>${ns}${nf}${extra}<td>${badge}</td><td>${letraBadge}</td></tr>`;
  }).join('')}
  </tbody></table>`;
}
function renderPreviewEvalIndividual(i){
  const evs=db.evaluaciones.filter(e=>e.gradoIdx===i);
  const el=document.getElementById('informe-eval-individual');
  if(!el)return;
  if(!evs.length){el.innerHTML='<p class="text-muted small" style="padding:12px">Sin evaluaciones registradas aún.</p>';return;}
  const esc=db.config.escala||20;
  const g=db.grados[i];
  // Tabs de evaluaciones
  let tabsHtml=evs.map((ev,idx)=>`<button class="tab-btn${idx===0?' active':''}" onclick="showEvalTab(${ev.id},this)" data-evalid="${ev.id}">${ev.nombre}</button>`).join('');
  let panelsHtml=evs.map((ev,idx)=>{
    const rows=g.alumnos.map((a,j)=>{
      const nombre=nC(a);
      const nota=getNotaEval(ev,nombre);
      const lr=notaALetra(nota,esc);
      const notaTxt=nota!==null?nota.toFixed(1):'\u2014';
      const letraBadge=`<span class="badge-letra" style="background:${lr.color}22;color:${lr.color};border:1px solid ${lr.color}55">${lr.letra}</span>`;
      const descBadge=`<span style="font-size:11px;color:${lr.color}">${lr.desc}</span>`;
      return`<tr><td><b>${j+1}</b></td><td>${nombre}</td><td style="font-weight:700;font-size:15px">${notaTxt}</td><td>${letraBadge}</td><td>${descBadge}</td></tr>`;
    }).join('');
    // Stats
    const notas=g.alumnos.map(a=>getNotaEval(ev,nC(a))).filter(v=>v!==null);
    const prom=notas.length?(notas.reduce((a,b)=>a+b,0)/notas.length).toFixed(1):'\u2014';
    const letrasCount={A:0,B:0,C:0,D:0,E:0};
    g.alumnos.forEach(a=>{const lr=notaALetra(getNotaEval(ev,nC(a)),esc);letrasCount[lr.letra]++;});
    const letraColores={A:'#10b981',B:'#3b82f6',C:'#f59e0b',D:'#f97316',E:'#64748b'};
    const letraDescs={A:'Superador',B:'Alcanzado',C:'En Proceso',D:'Inicio',E:'No Vino'};
    const statsHtml=Object.entries(letrasCount).map(([l,c])=>`<div class="eval-stat-badge" style="background:${letraColores[l]}22;border:1px solid ${letraColores[l]}44;color:${letraColores[l]}"><b>${l}</b><span>${letraDescs[l]}</span><span class="eval-stat-count">${c}</span></div>`).join('');
    return`<div class="eval-individual-panel" id="eval-panel-${ev.id}" style="display:${idx===0?'':'none'}">
      <div class="eval-info-row">
        <span class="eval-tipo-badge ${ev.tipo==='sumativa'?'pond':'form'}">${ev.tipo==='sumativa'?'Sumativa':'Formativa'}</span>
        ${ev.tipo==='sumativa'?`<span class="eval-peso">${ev.peso}% del total</span>`:''}
        <span class="eval-prom-badge">χ̅ Promedio: <b>${prom}</b></span>
      </div>
      <div class="eval-letras-stats">${statsHtml}</div>
      <table style="margin-top:10px"><thead><tr><th>#</th><th>Alumno</th><th>Nota</th><th>Letra</th><th>Descripción</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }).join('');
  el.innerHTML=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;overflow-x:auto">${tabsHtml}</div>${panelsHtml}`;
}
function showEvalTab(evalId, btn){
  document.querySelectorAll('.eval-individual-panel').forEach(p=>p.style.display='none');
  document.getElementById('eval-panel-'+evalId).style.display='';
  document.querySelectorAll('#informe-eval-individual .tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

/* EXPORTAR EXCEL */
function exportarExcel(tipo){
  if(typeof XLSX==='undefined'){toast('⚠️ Sin conexión para XLSX','#f59e0b');return;}
  const i=state.informesGrado,g=db.grados[i],cfg=db.config;
  const wb=XLSX.utils.book_new();
  const enc=[[`${cfg.materia||'Educación Física'} — ${g.nombre}`],[`Institución: ${cfg.escuela}`],[`Profesor/a: ${cfg.profesor}`],[`Año Escolar: ${cfg.anio}`],[]];

  if(tipo==='asistencia'||tipo==='consolidado'){
    const datos=calcAsistencia(i);
    const clases=db.asistencias.filter(a=>a.gradoIdx===i).sort((a,b)=>a.fecha.localeCompare(b.fecha));
    // Hoja 1: Resumen
    const rows=datos.map((d,j)=>[j+1,d.nombre,d.fechaNac||'',d.peso||'',d.estatura||'',d.total,d.pres,d.aus,d.pct+'%']);
    const ws=XLSX.utils.aoa_to_sheet([...enc,['N°','Alumno','F. Nacimiento','Peso (kg)','Estatura (m)','Clases','Asistencias','Ausencias','% Asistencia'],...rows]);
    ws['!cols']=[{wch:4},{wch:30},{wch:13},{wch:10},{wch:12},{wch:8},{wch:12},{wch:10},{wch:13}];
    XLSX.utils.book_append_sheet(wb,ws,'Resumen Asistencia');
    // Hoja 2: Detalle día a día
    if(clases.length){
      const fechas=clases.map(c=>c.fecha);
      const detHdr=['N°','Alumno',...fechas,'% Asistencia'];
      const detRows=datos.map((d,j)=>{
        const celdas=clases.map(c=>c.registros[d.nombre]===true?'P':'A');
        return[j+1,d.nombre,...celdas,d.pct+'%'];
      });
      const ws2=XLSX.utils.aoa_to_sheet([...enc,detHdr,...detRows]);
      ws2['!cols']=[{wch:4},{wch:30},...fechas.map(()=>({wch:11})),{wch:13}];
      XLSX.utils.book_append_sheet(wb,ws2,'Detalle Día a Día');
    }
  }
  if(tipo==='notas'||tipo==='consolidado'){
    const datos=calcNotas(i);
    const sumativas=db.evaluaciones.filter(e=>e.gradoIdx===i&&e.tipo==='sumativa');
    const formativas=db.evaluaciones.filter(e=>e.gradoIdx===i&&e.tipo==='formativa');
    const hasBoth=sumativas.length>0&&formativas.length>0;
    const esc=db.config.escala||20;
    const sumHdrs=sumativas.map(e=>`${e.nombre} (${e.peso}% Sum)`);
    const formHdrs=formativas.map(e=>`${e.nombre} (Form.)`);
    const extraHdrs=hasBoth?['Nota Sumativas','Nota Formativas']:[];
    const hdrs=['N°','Apellido y Nombre',...sumHdrs,...formHdrs,...extraHdrs,'PROMEDIO FINAL','LETRA','DESCRIPCIÓN','SITUACIÓN'];
    const rows=datos.map((d,j)=>{
      const ns=sumativas.map(e=>{const v=getNotaEval(e,d.nombre);return v!==null?v:''});
      const nf=formativas.map(e=>{const v=getNotaEval(e,d.nombre);return v!==null?v:''});
      const extra=hasBoth?[d.notaSum!==null?d.notaSum.toFixed(2):'',d.notaForm!==null?d.notaForm.toFixed(2):'']:[];
      const lr=notaALetra(d.prom!==null?parseFloat(d.prom):null,esc);
      return[j+1,d.nombre,...ns,...nf,...extra,(d.prom !== null && d.prom !== undefined ? d.prom : ''),lr.letra,lr.desc,d.prom!==null?(d.aprobado?'APROBADO':'REPROBADO'):''];
    });
    const ws=XLSX.utils.aoa_to_sheet([...enc,hdrs,...rows]);
    ws['!cols']=[{wch:4},{wch:30},...[...sumativas,...formativas].map(()=>({wch:16})),...extraHdrs.map(()=>({wch:14})),{wch:15},{wch:8},{wch:12},{wch:12}];
    XLSX.utils.book_append_sheet(wb,ws,'Notas');
    // Hoja de informe por evaluación individual
    const evs=db.evaluaciones.filter(e=>e.gradoIdx===i);
    if(evs.length){
      const rowsEv=[];
      evs.forEach(ev=>{
        rowsEv.push([`EVALUACIÓN: ${ev.nombre}`,`Tipo: ${ev.tipo}`,ev.tipo==='sumativa'?`Peso: ${ev.peso}%`:'']);
        rowsEv.push(['#','Alumno','Nota','Letra','Descripción']);
        db.grados[i].alumnos.forEach((a,j)=>{
          const nombre=nC(a),nota=getNotaEval(ev,nombre),lr=notaALetra(nota,esc);
          rowsEv.push([j+1,nombre,nota!==null?parseFloat(nota.toFixed(1)):'',lr.letra,lr.desc]);
        });
        rowsEv.push([]);
      });
      const wsEv=XLSX.utils.aoa_to_sheet([...enc,...rowsEv]);
      wsEv['!cols']=[{wch:4},{wch:30},{wch:8},{wch:7},{wch:12}];
      XLSX.utils.book_append_sheet(wb,wsEv,'Por Evaluación');
    }
  }
  const fname=`EduFisica_${g.nombre.replace(/\s/g,'_')}_${tipo}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb,fname);toast('✅ Excel generado','#34d399');
}

/* NUEVO AÑO ESCOLAR */
function nuevoAnioEscolar(){
  abrirModal(`<p class="modal-title" style="color:#f87171">⚠️ Nuevo Año Escolar</p>
    <p class="text-muted small" style="text-align:center;margin-bottom:16px">Esto borrará <b>todas las asistencias y evaluaciones</b>.<br>Los grados y alumnos se conservan.</p>
    <div class="modal-form">
      <div class="form-group"><label>Nuevo Año Escolar</label>
        <input type="text" id="nuevo-anio" placeholder="Ej: 2025-2026"></div>
    </div>
    <button class="btn-primary w-full" style="background:linear-gradient(135deg,#ef4444,#dc2626)" onclick="confirmarNuevoAnio()">
      <i class="fas fa-rotate-right"></i> Iniciar Nuevo Año
    </button>
    <button class="btn-secondary w-full mt-2" onclick="cerrarModal()">Cancelar</button>`);
  setTimeout(() => {
    const el = document.getElementById('nuevo-anio');
    if (el) el.focus();
  }, 300);
}
function confirmarNuevoAnio(){
  const anioInput = document.getElementById('nuevo-anio');
  const anio = anioInput ? anioInput.value.trim() : '';
  if(!anio){toast('⚠️ Escribe el año escolar','#f59e0b');return;}
  if(!confirm(`¿Confirmas iniciar el año ${anio}? Se borrarán asistencias y evaluaciones.`))return;
  db.asistencias=[];
  db.evaluaciones=[];
  db.config.anio=anio;
  saveDB(db);
  cerrarModal();
  toast('✅ Nuevo año escolar iniciado','#34d399');
  goTo('home');
}

/* RESPALDO EXPORTAR / IMPORTAR */
function exportarRespaldo(){
  const payload=JSON.stringify({version:2,fecha:new Date().toISOString(),data:db},null,2);
  const fecha=new Date().toISOString().slice(0,10);
  const fileName = `EduFisica_Respaldo_${fecha}.json`;

  if (window.Android && window.Android.shareBackup) {
    window.Android.shareBackup(payload, fileName);
    localStorage.setItem('edufisica_backup_fecha', new Date().toLocaleString('es-VE'));
    actualizarInfoRespaldo();
  } else {
    // Fallback para navegadores
    const blob=new Blob([payload],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=fileName;
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1000);
    localStorage.setItem('edufisica_backup_fecha',new Date().toLocaleString('es-VE'));
    actualizarInfoRespaldo();
    toast('✅ Respaldo generado','#34d399');
  }
}
function importarRespaldo(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const parsed=JSON.parse(e.target.result);
      const datos=parsed.data||parsed;
      if(!datos.grados||!datos.config){toast('⚠️ Archivo inválido','#f87171');return;}
      if(!confirm(`¿Importar respaldo del ${parsed.fecha?new Date(parsed.fecha).toLocaleDateString('es-VE'):'archivo seleccionado'}?\nEsto reemplazará todos los datos actuales.`))return;
      db=datos;saveDB(db);
      localStorage.setItem('edufisica_backup_fecha','Restaurado: '+new Date().toLocaleString('es-VE'));
      actualizarInfoRespaldo();
      cerrarModal();goTo('home');
      toast('✅ Respaldo importado','#34d399');
    }catch(err){toast('⚠️ Error al leer el archivo','#f87171');}
    event.target.value='';
  };
  reader.readAsText(file);
}
function actualizarInfoRespaldo(){
  const el=document.getElementById('backup-info');
  if(!el)return;
  const f=localStorage.getItem('edufisica_backup_fecha');
  el.textContent=f?'Último respaldo: '+f:'Sin respaldo reciente';
}

/* Resetear filtro de grupo al cambiar de grado */
function seleccionarGradoAlumnos(i){
  _alumnosGrupoFiltro=null;
  state.alumnosGrado=i;
  renderAlumnosLista();
}

