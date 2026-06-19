// ═══════════════════════════════════════════════════
//  OPTIVAN — App de gestión para fusionadores FTTH
//  Firebase Realtime Database · ES Module
// ═══════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getDatabase, ref, set, push, get, remove, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

// ─── FIREBASE INIT ────────────────────────────────
const db = getDatabase(initializeApp({
    apiKey: "AIzaSyB5-_AkwMiGibT5tsA-epGULCDznnz8ICE",
    authDomain: "optivan-745c9.firebaseapp.com",
    databaseURL: "https://optivan-745c9-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "optivan-745c9",
    storageBucket: "optivan-745c9.firebasestorage.app",
    messagingSenderId: "147359920451",
    appId: "1:147359920451:web:c2ddd3d0ab86a8992a7ff6"
}));

// ─── CONFIG ───────────────────────────────────────
const VAN = {
    get id() { return localStorage.getItem('van_id') || 'furgoneta_1'; },
    get matricula() { return localStorage.getItem('matricula') || '0000-XXX'; },
    get equipo() { return localStorage.getItem('equipo') || ''; }
};

let E = {
    pantalla: 'inicio', stock: [], instalaciones: [],
    calDias: [], calAnio: new Date().getFullYear(), calMes: new Date().getMonth() + 1,
    diaSel: null, instDia: [], instEdit: null,
    tipoReg: 'cto',
    fCto: { splitters: [], cto: '', vertical: null, cds: '', pon: '', conMod: false, modulo: '', modeloCto: '', fusiones: '' },
    fEmp: { referencia: '', fusiones: '', splitters: [], notas: '', conSpl: false, pon: '', conMod: false, modulo: '' },
    fMat: { tipo: 'splitter', splitter: '', modulo: '', cantidad: '' },
    fLim: { splitter: '', limite: '' },
    fDes: { tipo: 'splitter', splitter: '', modulo: '', cantidad: '', motivo: '' },
    // ─── PON STATE ────────────────────────────────
    pons: [],
    ponSel: null,
    ponNodos: [],
    fPon: { nombre: '', descripcion: '' },
    fNodo: { tipo: 'cto', codigo: '', direccion: '', notas: '' },
    nodoEdit: null
};

const SPL = [
    { id:'1x2_sin', l:'Splitter 1:02 sin' }, { id:'1x2_con', l:'Splitter 1:02 con' },
    { id:'1x3_sin', l:'Splitter 1:03 sin' }, { id:'1x3_con', l:'Splitter 1:03 con' },
    { id:'1x4_sin', l:'Splitter 1:04 sin' }, { id:'1x4_con', l:'Splitter 1:04 con' },
    { id:'1x6_sin', l:'Splitter 1:06 sin' }, { id:'1x6_con', l:'Splitter 1:06 con' },
    { id:'1x8_sin', l:'Splitter 1:08 sin' }, { id:'1x8_con', l:'Splitter 1:08 con' },
    { id:'1x12_sin', l:'Splitter 1:12 sin' }, { id:'1x12_con', l:'Splitter 1:12 con' },
    { id:'1x16_sin', l:'Splitter 1:16 sin' }, { id:'1x16_con', l:'Splitter 1:16 con' }
];

const MODS = [
    { id:'Z24', l:'Z24' }, { id:'HTTB001', l:'HTTB001' }, { id:'HTTB002', l:'HTTB002' },
    { id:'MOD32', l:'MOD32' }, { id:'MOD48', l:'MOD48' },
    { id:'EMB001', l:'EMB 001' }, { id:'EMB002', l:'EMB 002' },
    { id:'MINI_CD', l:'Mini CD' }, { id:'OTG08', l:'OTG-08' }, { id:'OTG16', l:'OTG-16' },
    { id:'HTTB002B', l:'HTTB002 Blanca' }, { id:'HTCS206', l:'HTCS 206' }
];

const MODELOS_CTO = ['Z24', 'MOD 48', 'MOD 32', 'HTTB001', 'HTTB002', 'ARQ-08', 'ARQ-16'];

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DSEM = ['L','M','X','J','V','S','D'];
const ls = id => (SPL.find(s => s.id === id) || {}).l || id;
const lm = id => (MODS.find(m => m.id === id) || {}).l || id;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

const VAN_IDS = ['furgoneta_1','furgoneta_2','furgoneta_3','furgoneta_4','furgoneta_5','furgoneta_6','furgoneta_7','furgoneta_8'];

function toast(msg, tipo) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast mostrar ' + (tipo || '');
    setTimeout(() => t.className = 'toast', 2500);
}

// ─── FIREBASE API ─────────────────────────────────
async function loadStock() {
    try {
        const snap = await get(ref(db, `stock/${VAN.id}`));
        const data = snap.exists() ? snap.val() : {};
        E.stock = SPL.map(s => {
            const i = data[s.id] || { cargada:0, usada:0, min:2 };
            const actual = (i.cargada||0) - (i.usada||0);
            return { tipo:s.id, cat:'spl', cargada:i.cargada||0, usada:i.usada||0, actual, min:i.min||2,
                alerta: actual <= 0 ? 'SIN STOCK' : actual <= (i.min||2) ? 'STOCK BAJO' : 'OK' };
        });
        E.stockMods = MODS.map(m => {
            const i = data[m.id] || { cargada:0, usada:0, min:1 };
            const actual = (i.cargada||0) - (i.usada||0);
            return { tipo:m.id, cat:'mod', cargada:i.cargada||0, usada:i.usada||0, actual, min:i.min||1,
                alerta: actual <= 0 ? 'SIN STOCK' : actual <= (i.min||1) ? 'STOCK BAJO' : 'OK' };
        });
    } catch(e) { toast('Error cargando stock','error'); }
}

async function updStock(tipo, deltaUsada) {
    await runTransaction(ref(db, `stock/${VAN.id}/${tipo}`), i => {
        i = i || { cargada:0, usada:0, min:2 };
        i.usada = (i.usada||0) + deltaUsada;
        return i;
    });
}

async function addStock(tipo, cant) {
    await runTransaction(ref(db, `stock/${VAN.id}/${tipo}`), i => {
        i = i || { cargada:0, usada:0, min:2 };
        i.cargada = (i.cargada||0) + cant;
        return i;
    });
}

async function setMin(tipo, min) {
    await runTransaction(ref(db, `stock/${VAN.id}/${tipo}`), i => {
        i = i || { cargada:0, usada:0, min:2 };
        i.min = min;
        return i;
    });
}

async function loadDia(fecha) {
    try {
        const s = await get(ref(db, `inst/${VAN.id}/${fecha}`));
        E.instDia = s.exists() ? Object.entries(s.val()).map(([id,v]) => ({id,...v})) : [];
    } catch(e) { E.instDia = []; }
}

async function loadCal() {
    try {
        const s = await get(ref(db, `inst/${VAN.id}`));
        E.calDias = [];
        if (s.exists()) {
            const d = s.val(), m = String(E.calMes).padStart(2,'0');
            Object.keys(d).forEach(f => {
                if (f.startsWith(`${E.calAnio}-${m}`)) {
                    const r = Object.values(d[f]);
                    E.calDias.push({ fecha:f, total:r.length, spl:r.reduce((a,x) => a + (x.splitters ? x.splitters.reduce((b,s) => b+(s.cantidad||0),0) : 0), 0) });
                }
            });
        }
    } catch(e) { E.calDias = []; }
}

async function saveInst(datos) {
    const f = new Date().toISOString().split('T')[0];
    await push(ref(db, `inst/${VAN.id}/${f}`), { ...datos, ts: Date.now() });
}

async function delInst(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
        const inst = E.instDia.find(i => i.id === id);
        await remove(ref(db, `inst/${VAN.id}/${E.diaSel}/${id}`));
        if (inst && inst.splitters) for (const s of inst.splitters) await updStock(s.tipo, -s.cantidad);
        toast('✓ Eliminado','exito');
        await loadDia(E.diaSel); render();
    } catch(e) { toast('Error','error'); }
}

async function editInst(id, datos) {
    try {
        await set(ref(db, `inst/${VAN.id}/${E.diaSel}/${id}`), { ...datos, ts: Date.now() });
        return true;
    } catch(e) { toast('Error','error'); return false; }
}

// ─── FIREBASE PON API ─────────────────────────────
// Los PONs son compartidos entre todas las furgonetas (infraestructura de red)
async function loadPons() {
    try {
        const snap = await get(ref(db, 'pons'));
        if (!snap.exists()) { E.pons = []; return; }
        const data = snap.val();
        E.pons = Object.entries(data).map(([id, v]) => {
            const nodos = v.nodos ? Object.values(v.nodos) : [];
            return {
                id,
                nombre: v.nombre || id,
                descripcion: v.descripcion || '',
                ts: v.ts || 0,
                total: nodos.length,
                realizados: nodos.filter(n => n.realizado).length
            };
        }).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    } catch(e) { E.pons = []; toast('Error cargando PONs', 'error'); }
}

async function loadNodos(ponId) {
    try {
        const snap = await get(ref(db, `pons/${ponId}/nodos`));
        E.ponNodos = snap.exists()
            ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }))
            : [];
    } catch(e) { E.ponNodos = []; }
}

async function savePon(datos) {
    const r = await push(ref(db, 'pons'), { ...datos, ts: Date.now() });
    return r.key;
}

async function saveNodo(ponId, datos) {
    await push(ref(db, `pons/${ponId}/nodos`), { ...datos, realizado: false, ts: Date.now() });
}

async function toggleRealizadoFB(ponId, nodoId, nuevoEstado) {
    const base = ref(db, `pons/${ponId}/nodos/${nodoId}`);
    await set(ref(db, `pons/${ponId}/nodos/${nodoId}/realizado`), nuevoEstado);
    await set(ref(db, `pons/${ponId}/nodos/${nodoId}/realizadoPor`), nuevoEstado ? (VAN.equipo || VAN.matricula) : '');
    await set(ref(db, `pons/${ponId}/nodos/${nodoId}/realizadoTs`), nuevoEstado ? Date.now() : null);
}

async function delNodoFB(ponId, nodoId) {
    await remove(ref(db, `pons/${ponId}/nodos/${nodoId}`));
}

async function delPonFB(ponId) {
    await remove(ref(db, `pons/${ponId}`));
}

async function updateNodoFB(ponId, nodoId, datos) {
    const snap = await get(ref(db, `pons/${ponId}/nodos/${nodoId}`));
    const actual = snap.exists() ? snap.val() : {};
    await set(ref(db, `pons/${ponId}/nodos/${nodoId}`), { ...actual, ...datos });
}

// ─── ACCIONES ─────────────────────────────────────
const W = window;

W.ir = ir;
W.render = render;
W.addSpl = function() {
    const sel = document.getElementById('sel-spl'), cant = document.getElementById('inp-cant');
    if (!sel?.value) { toast('Selecciona splitter','error'); return; }
    const c = parseInt(cant?.value||1);
    if (!Number.isFinite(c) || c < 1) { toast('Cantidad inválida (mínimo 1)','error'); return; }
    const ex = E.fCto.splitters.find(s => s.tipo === sel.value);
    if (ex) ex.cantidad += c; else E.fCto.splitters.push({tipo:sel.value, cantidad:c});
    const inp = document.getElementById('inp-cto');
    if (inp) E.fCto.cto = inp.value;
    render();
};

W.delSpl = function(i) {
    const inp = document.getElementById('inp-cto');
    if (inp) E.fCto.cto = inp.value;
    E.fCto.splitters.splice(i,1); render();
};

W.enviarCto = async function() {
    const {splitters,cto,vertical,cds,pon,conMod,modulo,modeloCto,fusiones} = E.fCto;
    const ctoTrim = (cto||'').trim();
    if (!splitters.length||!ctoTrim||!vertical) { toast('Completa todos los campos','error'); return; }
    if (splitters.some(s => !Number.isFinite(s.cantidad) || s.cantidad < 1)) { toast('Cantidades inválidas','error'); return; }
    try {
        for (const s of splitters) await updStock(s.tipo, s.cantidad);
        if (conMod && modulo) await updStock(modulo, 1);
        const datos = {tipo:'cto',splitters,cto:ctoTrim,vertical};
        if (vertical==='Vertical propia'&&cds) datos.cds = cds;
        if (pon) datos.pon = pon.toUpperCase();
        if (conMod && modulo) datos.modulo = modulo;
        if (modeloCto) datos.modeloCto = modeloCto;
        if (fusiones) datos.fusiones = fusiones;
        await saveInst(datos);
        E.instalaciones.unshift({...datos, splitters:[...splitters]});
        toast('✓ CTO registrada','exito'); ir('inicio');
    } catch(e) { toast('Error: '+e.message,'error'); }
};

W.addSplEmp = function() {
    const sel = document.getElementById('sel-spl-emp'), cant = document.getElementById('inp-cant-emp');
    if (!sel?.value) { toast('Selecciona splitter','error'); return; }
    const c = parseInt(cant?.value||1);
    if (!Number.isFinite(c) || c < 1) { toast('Cantidad inválida (mínimo 1)','error'); return; }
    const ex = E.fEmp.splitters.find(s => s.tipo === sel.value);
    if (ex) ex.cantidad += c; else E.fEmp.splitters.push({tipo:sel.value, cantidad:c});
    const r = document.getElementById('inp-ref'); if (r) E.fEmp.referencia = r.value;
    const f = document.getElementById('inp-fus'); if (f) E.fEmp.fusiones = f.value;
    const n = document.getElementById('inp-notas-emp'); if (n) E.fEmp.notas = n.value;
    render();
};

W.delSplEmp = function(i) { E.fEmp.splitters.splice(i,1); render(); };

W.enviarEmp = async function() {
    const r = document.getElementById('inp-ref'), f = document.getElementById('inp-fus'), n = document.getElementById('inp-notas-emp');
    const referencia = (r?.value || E.fEmp.referencia || '').trim();
    const fusiones = (f?.value || E.fEmp.fusiones || '').toString().trim();
    const notas = n?.value ?? E.fEmp.notas ?? '';
    if (!referencia||!fusiones) { toast('Completa referencia y fusiones','error'); return; }
    if (!Number.isFinite(parseInt(fusiones)) || parseInt(fusiones) < 0) { toast('Fusiones inválidas','error'); return; }
    try {
        for (const s of E.fEmp.splitters) await updStock(s.tipo, s.cantidad);
        if (E.fEmp.conMod && E.fEmp.modulo) await updStock(E.fEmp.modulo, 1);
        const datos = {tipo:'empalme',referencia,fusiones,splitters:E.fEmp.splitters,notas};
        if (E.fEmp.pon) datos.pon = E.fEmp.pon.toUpperCase();
        if (E.fEmp.conMod && E.fEmp.modulo) datos.modulo = E.fEmp.modulo;
        await saveInst(datos);
        E.instalaciones.unshift({...datos, splitters:[...E.fEmp.splitters]});
        toast('✓ Empalme registrado','exito'); ir('inicio');
    } catch(e) { toast('Error: '+e.message,'error'); }
};

W.sumarMat = async function() {
    const id = E.fMat.tipo==='splitter' ? E.fMat.splitter : E.fMat.modulo;
    const {cantidad} = E.fMat;
    if (!id||!cantidad||parseInt(cantidad)<=0) { toast('Rellena los campos','error'); return; }
    try { await addStock(id, parseInt(cantidad)); E.fMat={tipo:E.fMat.tipo,splitter:'',modulo:'',cantidad:''}; await loadStock(); toast('✓ Añadidas '+cantidad+' uds','exito'); render(); }
    catch(e) { toast('Error','error'); }
};

W.elimMat = async function() {
    const id = E.fMat.tipo==='splitter' ? E.fMat.splitter : E.fMat.modulo;
    const c = parseInt(E.fMat.cantidad);
    if (!id || !Number.isFinite(c) || c <= 0) { toast('Rellena los campos','error'); return; }
    const lista = E.fMat.tipo==='splitter' ? E.stock : (E.stockMods||[]);
    const item = lista.find(s => s.tipo === id);
    if (item && c > item.cargada) { toast(`No puedes quitar más de ${item.cargada} uds cargadas`,'error'); return; }
    try { await addStock(id, -c); E.fMat={tipo:E.fMat.tipo,splitter:'',modulo:'',cantidad:''}; await loadStock(); toast('✓ Eliminadas '+c+' uds','exito'); render(); }
    catch(e) { toast('Error','error'); }
};

W.enviarDescarte = async function() {
    const tipoCat = E.fDes.tipo;
    const id = tipoCat === 'splitter' ? E.fDes.splitter : E.fDes.modulo;
    const c = parseInt(E.fDes.cantidad);
    const motivo = (E.fDes.motivo || '').trim();
    if (!id || !Number.isFinite(c) || c < 1) { toast('Rellena los campos','error'); return; }
    const lista = tipoCat === 'splitter' ? E.stock : (E.stockMods||[]);
    const item = lista.find(s => s.tipo === id);
    if (item && c > item.actual) { toast(`Sólo hay ${item.actual} uds en stock`,'error'); return; }
    try {
        await updStock(id, c);
        const datos = { tipo:'descarte', items:[{tipo:id, cat: tipoCat==='splitter'?'spl':'mod', cantidad:c}], motivo };
        await saveInst(datos);
        E.instalaciones.unshift({...datos});
        toast('✓ Descarte registrado','exito'); ir('inicio');
    } catch(e) { toast('Error: '+e.message,'error'); }
};

W.guardarLim = async function() {
    const spl = E.fLim.splitter, inp = document.getElementById('inp-lim');
    const lim = inp?.value ?? E.fLim.limite;
    if (!spl || lim === '' || lim == null) { toast('Rellena los campos','error'); return; }
    const n = parseInt(lim);
    if (!Number.isFinite(n) || n < 0) { toast('Límite inválido','error'); return; }
    try { await setMin(spl, n); E.fLim={splitter:'',limite:''}; await loadStock(); toast('✓ Límite guardado','exito'); render(); }
    catch(e) { toast('Error','error'); }
};

W.guardarEdit = async function() {
    const inst = E.instEdit; if (!inst) return;
    const splTipo = document.getElementById('ed-spl').value;
    const splCant = parseInt(document.getElementById('ed-cant').value);
    const cto = document.getElementById('ed-cto').value.trim();
    const notas = document.getElementById('ed-notas').value;
    if (!splTipo || !cto) { toast('Completa splitter y CTO','error'); return; }
    if (!Number.isFinite(splCant) || splCant < 1) { toast('Cantidad inválida','error'); return; }
    const original = E.instDia.find(x => x.id === inst.id) || inst;
    const oldFirst = (original.splitters || [])[0];
    const otherSpl = (original.splitters || []).slice(1);
    try {
        if (oldFirst) await updStock(oldFirst.tipo, -oldFirst.cantidad);
        await updStock(splTipo, splCant);
    } catch(e) { toast('Error ajustando stock','error'); return; }
    const { id, ...rest } = original;
    const datos = { ...rest, splitters: [{tipo: splTipo, cantidad: splCant}, ...otherSpl], cto, notas };
    if (await editInst(inst.id, datos)) {
        toast('✓ Actualizado','exito'); E.instEdit = null;
        await loadStock(); await loadDia(E.diaSel); render();
    }
};

W.delInst = delInst;

W.editInstHandler = function(id) {
    E.instEdit = E.instDia.find(x => x.id === id) || null;
    render();
};
W.cancelEdit = function() { E.instEdit = null; render(); };
W.setVan = function(id) { localStorage.setItem('van_id', id); render(); };

W.cambiarMes = async function(d) {
    E.calMes += d;
    if (E.calMes>12) { E.calMes=1; E.calAnio++; }
    if (E.calMes<1) { E.calMes=12; E.calAnio--; }
    await loadCal(); render();
};

W.selDia = async function(f) { E.diaSel=f; E.instEdit=null; await loadDia(f); E.pantalla='dia'; render(); };

W.guardarConfig = function() {
    const clean = s => String(s||'').replace(/[<>]/g,'').trim().slice(0,40);
    const eq = clean(document.getElementById('inp-eq').value);
    const mat = clean(document.getElementById('inp-mat').value);
    if (!mat) { toast('La matrícula no puede estar vacía','error'); return; }
    localStorage.setItem('equipo',eq); localStorage.setItem('matricula',mat);
    toast('✓ Configuración guardada','exito'); ir('inicio');
};

W.compartirPedido = function() {
    const bajo = [...E.stock, ...(E.stockMods||[])].filter(s=>s.alerta!=='OK');
    if (!bajo.length) { toast('No hay material bajo mínimo','error'); return; }
    const txt = `PEDIDO — ${VAN.matricula}\n${new Date().toLocaleDateString('es-ES')}\n\n`+bajo.map(s=>{
        const label = s.cat==='mod'?lm(s.tipo):ls(s.tipo);
        const pedir = Math.max(0, s.min-s.actual);
        return `• ${label}\n  Stock: ${s.actual} · Mín: ${s.min} · Pedir: ${pedir} uds`;
    }).join('\n');
    if (navigator.share) navigator.share({title:'Pedido Optivan',text:txt}).catch(()=>{});
    else if (navigator.clipboard) { navigator.clipboard.writeText(txt); toast('Copiado','exito'); }
    else toast('No se puede compartir','error');
};

W.startVoz = function() {};
W.stopVoz = function() {};

// ─── ACCIONES PON ─────────────────────────────────

W.irPon = async function(id) {
    E.ponSel = E.pons.find(p => p.id === id) || null;
    if (!E.ponSel) { toast('PON no encontrado', 'error'); return; }
    await loadNodos(id);
    E.nodoEdit = null;
    E.pantalla = 'pon_detalle';
    render();
};

W.toggleRealizado = async function(ponId, nodoId, nuevoEstado) {
    E.nodoEdit = null;
    try {
        await toggleRealizadoFB(ponId, nodoId, nuevoEstado);
        // Actualizar estado local sin recargar Firebase
        const nodo = E.ponNodos.find(n => n.id === nodoId);
        if (nodo) {
            nodo.realizado = nuevoEstado;
            nodo.realizadoPor = nuevoEstado ? (VAN.equipo || VAN.matricula) : '';
        }
        // Actualizar contadores del PON en la lista
        const pon = E.pons.find(p => p.id === ponId);
        if (pon) pon.realizados = E.ponNodos.filter(n => n.realizado).length;
        toast(nuevoEstado ? '✓ Marcado como realizado' : '↩ Marcado como pendiente', nuevoEstado ? 'exito' : '');
        render();
    } catch(e) { toast('Error al actualizar', 'error'); }
};

W.guardarPon = async function() {
    const nombre = (document.getElementById('inp-pon-nombre')?.value || '').trim();
    const descripcion = (document.getElementById('inp-pon-desc')?.value || '').trim();
    if (!nombre) { toast('El nombre del PON es obligatorio', 'error'); return; }
    try {
        await savePon({ nombre, descripcion });
        toast('✓ PON creado', 'exito');
        await loadPons();
        ir('pons');
    } catch(e) { toast('Error al crear PON', 'error'); }
};

W.guardarNodo = async function() {
    if (!E.ponSel) return;
    const codigo = (document.getElementById('inp-nodo-codigo')?.value || '').trim();
    const direccion = (document.getElementById('inp-nodo-dir')?.value || '').trim();
    const notas = (document.getElementById('inp-nodo-notas')?.value || '').trim();
    if (!codigo) { toast('El código es obligatorio', 'error'); return; }
    try {
        await saveNodo(E.ponSel.id, { tipo: E.fNodo.tipo, codigo, direccion, notas });
        toast('✓ Añadido al PON', 'exito');
        await loadNodos(E.ponSel.id);
        // Actualizar total en la lista de PONs
        const pon = E.pons.find(p => p.id === E.ponSel.id);
        if (pon) pon.total = E.ponNodos.length;
        E.fNodo = { tipo: 'cto', codigo: '', direccion: '', notas: '' };
        E.pantalla = 'pon_detalle';
        render();
    } catch(e) { toast('Error al añadir', 'error'); }
};

W.elimNodo = async function(ponId, nodoId) {
    if (!confirm('¿Eliminar este elemento del PON?')) return;
    try {
        await delNodoFB(ponId, nodoId);
        E.ponNodos = E.ponNodos.filter(n => n.id !== nodoId);
        if (E.nodoEdit && E.nodoEdit.id === nodoId) E.nodoEdit = null;
        const pon = E.pons.find(p => p.id === ponId);
        if (pon) { pon.total = E.ponNodos.length; pon.realizados = E.ponNodos.filter(n => n.realizado).length; }
        toast('✓ Eliminado', 'exito');
        render();
    } catch(e) { toast('Error', 'error'); }
};

W.elimPon = async function(id) {
    if (!confirm('¿Eliminar este PON y todos sus elementos?')) return;
    try {
        await delPonFB(id);
        await loadPons();
        toast('✓ PON eliminado', 'exito');
        E.pantalla = 'pons';
        render();
    } catch(e) { toast('Error', 'error'); }
};

W.iniciarEditNodo = function(nodoId) {
    const nodo = E.ponNodos.find(n => n.id === nodoId);
    if (!nodo) return;
    E.nodoEdit = { id: nodoId, tipo: nodo.tipo, codigo: nodo.codigo || '', direccion: nodo.direccion || '', notas: nodo.notas || '' };
    render();
};

W.cancelEditNodo = function() {
    E.nodoEdit = null;
    render();
};

W.guardarEditNodo = async function() {
    if (!E.nodoEdit || !E.ponSel) return;
    const codigo = (document.getElementById('inp-edit-codigo')?.value || '').trim();
    const direccion = (document.getElementById('inp-edit-dir')?.value || '').trim();
    const notas = (document.getElementById('inp-edit-notas')?.value || '').trim();
    if (!codigo) { toast('El código es obligatorio', 'error'); return; }
    try {
        await updateNodoFB(E.ponSel.id, E.nodoEdit.id, { tipo: E.nodoEdit.tipo, codigo, direccion, notas });
        const nodo = E.ponNodos.find(n => n.id === E.nodoEdit.id);
        if (nodo) { nodo.codigo = codigo; nodo.direccion = direccion; nodo.notas = notas; }
        E.nodoEdit = null;
        toast('✓ Guardado', 'exito');
        render();
    } catch(e) { toast('Error al guardar', 'error'); }
};

// ─── ICONOS SVG ───────────────────────────────────
const I = {
    back:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>',
    arrow:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>',
    arrowS:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>',
    micL:'<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0F1720" stroke-width="2" stroke-linecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
    box:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/></svg>',
    doc:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/></svg>',
    alert:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    check:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
    plus:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    bell:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    cal:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    tool:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    trash:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
    micBtn:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F1720" stroke-width="2" stroke-linecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
    link:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    gear:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    // Icono árbol PON (jerarquía de red)
    pon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="1" y="18" width="6" height="4" rx="1"/><rect x="9" y="18" width="6" height="4" rx="1"/><rect x="17" y="18" width="6" height="4" rx="1"/><path d="M12 6v4M12 10H4v4M12 10h8v4"/></svg>',
    home:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
    tabBox:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/></svg>',
    tabPon:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="1" y="18" width="6" height="4" rx="1"/><rect x="9" y="18" width="6" height="4" rx="1"/><rect x="17" y="18" width="6" height="4" rx="1"/><path d="M12 6v4M12 10H4v4M12 10h8v4"/></svg>',
    tabCal:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    plusBold:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    close:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    pin:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    key:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.5 12.5 21 2"/><path d="m16 7 3 3"/><path d="m13 10 3 3"/></svg>'
};

// ─── HELPER: select options ───────────────────────
const splOpts = () => SPL.map(s => `<option value="${s.id}">${esc(s.l)}</option>`).join('');
const inp = (id,ph,val,extra='') => `<input type="text" id="${id}" class="campo-input" placeholder="${esc(ph)}" value="${esc(val||'')}" ${extra}>`;
const inpN = (id,ph,val,extra='') => `<input type="number" inputmode="numeric" id="${id}" class="campo-input" placeholder="${esc(ph)}" min="1" value="${esc(val||'')}" ${extra}>`;

// ─── RENDERS ──────────────────────────────────────

function rInicio() {
    const bajo = E.stock.filter(s=>s.alerta!=='OK').length;
    const total = E.instalaciones.length;
    const fecha = new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
    const cI = total>0?'amarillo':'verde', cB = bajo>0?'rojo':'verde';

    return `
    <div style="padding:16px 20px 10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <img src="logo.png?v=7" alt="Optivan"
                style="width:calc(100% - 56px);object-fit:contain;object-position:left;">
            <button class="btn-notificaciones" onclick="ir('avisos')" style="flex-shrink:0;">${I.bell}${bajo>0?'<span class="notif-badge"></span>':''}</button>
        </div>
        ${VAN.equipo?`<p style="font-size:32px;font-weight:700;color:var(--amarillo);font-family:'Poppins',sans-serif;margin:0 0 2px;line-height:1.1;letter-spacing:-0.5px;">${esc(VAN.equipo)}</p>`:''}
        <p class="saludo-nombre" style="font-size:22px;color:rgba(255,255,255,0.85);">${esc(VAN.matricula)}</p>
        <p class="saludo-fecha">${esc(fecha)}</p>
    </div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon-wrap ${cI}">${I.tool}</div><p class="stat-label">Instalaciones</p><p class="stat-valor">${total}</p><p class="stat-subtexto ${cI==='amarillo'?'gris':'verde'}">${total===0?'Sin instalaciones':total+' hoy'}</p></div>
        <div class="stat-card"><div class="stat-icon-wrap ${cB}">${I.box}</div><p class="stat-label">Stock bajo</p><p class="stat-valor ${bajo>0?'rojo':''}">${bajo}</p><p class="stat-subtexto ${cB}">${bajo===0?'Stock correcto':bajo+' con alerta'}</p></div>
    </div>
    <div class="btn-principal-wrap"><button class="btn-principal" onclick="ir('registrar')"><span class="btn-contenido"><div class="btn-principal-icon">${I.micBtn}</div><span>Registrar material</span></span>${I.arrow}</button></div>
    <div class="menu-cards">
        ${[
            ['stock',I.box,'Ver stock','Inventario de splitters'],
            ['pons',I.pon,'Gestión PONs','Control CTOs y empalmes'],
            ['calendario',I.cal,'Historial','Ver y editar días'],
            ['material',I.plus,'Editar material','Añadir o quitar stock'],
            ['descarte',I.trash,'Descarte','Material roto o no usable'],
            ['avisos',I.bell,'Avisos y límites','Stock mínimo'],
            ['informe',I.doc,'Informe del día','Resumen para compartir'],
            ['config',I.gear,'Configuración','Equipo y matrícula']
        ].map(([p,ic,t,s])=>`<button class="menu-card" onclick="ir('${p}')"><div class="menu-card-icon">${ic}</div><div class="menu-card-content"><p class="menu-card-titulo">${t}</p><p class="menu-card-subtitulo">${s}</p></div><span class="menu-card-flecha">${I.arrowS}</span></button>`).join('')}
    </div>
    ${bajo>0?`<div class="alerta-stock"><button onclick="ir('pedido')"><span class="contenido">${I.alert}<span>${bajo} con stock bajo</span></span><span style="font-size:13px;">Ver pedido</span></button></div>`:''}`;
}

function rRegistrar() {
    const t = E.tipoReg||'cto', {splitters,cto,vertical} = E.fCto, {splitters:sE,conSpl} = E.fEmp;
    const opts = splOpts(), okCto = splitters.length>0&&cto&&vertical;
    const tA = 'background:var(--amarillo);color:var(--negro);border:none;border-radius:8px;padding:12px;font-family:Poppins,sans-serif;font-size:15px;font-weight:600;cursor:pointer;flex:1;';
    const tI = 'background:transparent;color:var(--gris-texto);border:none;border-radius:8px;padding:12px;font-family:Poppins,sans-serif;font-size:15px;font-weight:500;cursor:pointer;flex:1;';

    const lCto = splitters.length>0?`<div style="margin-bottom:14px;">${splitters.map((s,i)=>`<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px 14px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;"><div><p style="font-size:15px;font-weight:600;margin:0;color:#fff;font-family:Poppins,sans-serif;">${esc(ls(s.tipo))}</p><p style="font-size:12px;color:var(--gris-texto);margin:0;">x${s.cantidad}</p></div><button onclick="delSpl(${i})" style="background:transparent;border:none;padding:8px;color:var(--rojo);cursor:pointer;">${I.trash}</button></div>`).join('')}</div>`:'';

    const lEmp = sE.length>0?`<div style="margin-top:10px;">${sE.map((s,i)=>`<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px 14px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;"><div><p style="font-size:15px;font-weight:600;margin:0;color:#fff;font-family:Poppins,sans-serif;">${esc(ls(s.tipo))}</p><p style="font-size:12px;color:var(--gris-texto);margin:0;">x${s.cantidad}</p></div><button onclick="delSplEmp(${i})" style="background:transparent;border:none;padding:8px;color:var(--rojo);cursor:pointer;">${I.trash}</button></div>`).join('')}</div>`:'';

    const ponField = (val, target) => `<div class="campo"><label class="campo-label">PON <span style="color:rgba(255,255,255,0.3);text-transform:none;font-weight:500;letter-spacing:0;">(opcional)</span></label><input type="text" class="campo-input" placeholder="Ej: A1B2C3" value="${esc(val||'')}" oninput="${target}.pon=this.value.toUpperCase()"></div>`;

    const modOpts = MODS.map(m=>`<option value="${m.id}">${esc(m.l)}</option>`).join('');

    const modBlock = (conMod, modulo, target) => `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radio-sm);padding:14px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <p style="font-size:14px;color:#fff;font-weight:600;margin:0;">¿Lleva módulo?</p>
            <button onclick="${target}.conMod=!${target}.conMod;if(!${target}.conMod)${target}.modulo='';render();" style="background:${conMod?'var(--amarillo)':'rgba(255,255,255,0.08)'};color:${conMod?'var(--negro)':'#fff'};border:none;border-radius:20px;padding:8px 18px;font-family:Poppins,sans-serif;font-size:13px;font-weight:600;cursor:pointer;">${conMod?'Sí':'No'}</button>
        </div>
        ${conMod?`<div style="margin-top:12px;">
            <select class="campo-select" onchange="${target}.modulo=this.value" style="margin:0;">
                <option value="">Seleccionar módulo</option>${modOpts}
            </select>
            ${modulo?`<div style="background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.15);border-radius:8px;padding:10px 12px;margin-top:8px;"><span style="font-size:13px;color:var(--amarillo);font-weight:600;">✓ ${esc(lm(modulo))}</span></div>`:''}
        </div>`:''}
    </div>`;

    const modeloCtoOpts = MODELOS_CTO.map(m=>`<option value="${esc(m)}" ${E.fCto.modeloCto===m?'selected':''}>${esc(m)}</option>`).join('');

    const fCto = `<div class="form">${ponField(E.fCto.pon,'E.fCto')}<div class="campo"><label class="campo-label">CTO</label>${inp('inp-cto','Código (ej: 105656)',cto,'oninput="E.fCto.cto=this.value"')}</div><div class="campo"><label class="campo-label">Modelo de CTO <span style="color:rgba(255,255,255,0.3);text-transform:none;font-weight:500;letter-spacing:0;">(opcional)</span></label><select class="campo-select" onchange="E.fCto.modeloCto=this.value"><option value="">Seleccionar modelo</option>${modeloCtoOpts}</select></div><div class="campo"><label class="campo-label">Tipo de vertical</label><div class="botones-toggle"><button class="btn-toggle ${vertical==='A demanda'?'activo':''}" onclick="E.fCto.vertical='A demanda';render()">A demanda</button><button class="btn-toggle ${vertical==='Vertical propia'?'activo':''}" onclick="E.fCto.vertical='Vertical propia';render()">Vertical propia</button></div></div>${vertical==='Vertical propia'?`<div class="campo"><label class="campo-label">Nº de CDs <span style="color:rgba(255,255,255,0.3);text-transform:none;font-weight:500;letter-spacing:0;">(opcional)</span></label><input type="number" inputmode="numeric" id="inp-cds" class="campo-input" placeholder="Ej: 8" min="0" value="${E.fCto.cds||''}" oninput="E.fCto.cds=this.value"></div>`:''}<div class="campo"><label class="campo-label">Fusiones <span style="color:rgba(255,255,255,0.3);text-transform:none;font-weight:500;letter-spacing:0;">(opcional)</span></label><input type="number" inputmode="numeric" id="inp-fus-cto" class="campo-input" placeholder="Ej: 8" min="0" value="${E.fCto.fusiones||''}" oninput="E.fCto.fusiones=this.value"></div><div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radio-sm);padding:14px;margin-bottom:14px;"><p style="font-size:10px;color:var(--gris-texto);text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;font-weight:600;">Añadir splitter</p><div style="display:grid;grid-template-columns:1fr 70px;gap:8px;margin-bottom:8px;"><select id="sel-spl" class="campo-select"><option value="">Tipo</option>${opts}</select>${inpN('inp-cant','1',1,'style="text-align:center;"')}</div><button onclick="addSpl()" style="background:var(--amarillo);color:var(--negro);border:none;border-radius:10px;padding:13px;font-family:Poppins,sans-serif;font-size:14px;font-weight:600;width:100%;cursor:pointer;">+ Añadir</button></div>${lCto}${modBlock(E.fCto.conMod,E.fCto.modulo,'E.fCto')}<button onclick="enviarCto()" ${okCto?'':'disabled'} style="background:${okCto?'var(--amarillo)':'rgba(255,255,255,0.05)'};color:${okCto?'var(--negro)':'rgba(255,255,255,0.2)'};border:none;border-radius:16px;padding:20px;font-family:Poppins,sans-serif;font-size:16px;font-weight:600;width:100%;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:${okCto?'var(--sombra-amarillo)':'none'};margin-top:6px;">${I.box} Registrar CTO</button></div>`;

    const fEmp = `<div class="form">${ponField(E.fEmp.pon,'E.fEmp')}<div class="campo"><label class="campo-label">Referencia</label>${inp('inp-ref','Ej: 02E1084',E.fEmp.referencia,'oninput="E.fEmp.referencia=this.value"')}</div><div class="campo"><label class="campo-label">Fusiones</label>${inpN('inp-fus','Ej: 12',E.fEmp.fusiones,'oninput="E.fEmp.fusiones=this.value"')}</div><div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radio-sm);padding:14px;margin-bottom:14px;"><div style="display:flex;justify-content:space-between;align-items:center;"><p style="font-size:14px;color:#fff;font-weight:600;margin:0;">¿Lleva splitter?</p><button onclick="E.fEmp.conSpl=!E.fEmp.conSpl;render();" style="background:${conSpl?'var(--amarillo)':'rgba(255,255,255,0.08)'};color:${conSpl?'var(--negro)':'#fff'};border:none;border-radius:20px;padding:8px 18px;font-family:Poppins,sans-serif;font-size:13px;font-weight:600;cursor:pointer;">${conSpl?'Sí':'No'}</button></div>${conSpl?`<div style="margin-top:12px;"><div style="display:grid;grid-template-columns:1fr 70px;gap:8px;margin-bottom:8px;"><select id="sel-spl-emp" class="campo-select"><option value="">Tipo</option>${opts}</select>${inpN('inp-cant-emp','1',1,'style="text-align:center;"')}</div><button onclick="addSplEmp()" style="background:rgba(255,255,255,0.06);color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:500;width:100%;cursor:pointer;">+ Añadir splitter</button>${lEmp}</div>`:''}</div>${modBlock(E.fEmp.conMod,E.fEmp.modulo,'E.fEmp')}<div class="campo"><label class="campo-label">Notas <span style="color:rgba(255,255,255,0.3);text-transform:none;font-weight:500;letter-spacing:0;">(opcional)</span></label><input type="text" id="inp-notas-emp" class="campo-input" placeholder="Observaciones" value="${esc(E.fEmp.notas||'')}" oninput="E.fEmp.notas=this.value"></div><button onclick="enviarEmp()" style="background:var(--amarillo);color:var(--negro);border:none;border-radius:16px;padding:20px;font-family:Poppins,sans-serif;font-size:16px;font-weight:600;width:100%;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:var(--sombra-amarillo);margin-top:6px;">${I.link} Registrar empalme</button></div>`;

    return `<div class="header"><button class="btn-atras" onclick="ir('inicio')">${I.back}</button><h2 class="titulo-pantalla">Registrar</h2></div><div style="padding:8px 20px 14px;"><div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:3px;display:flex;gap:3px;"><button style="${t==='cto'?tA:tI}" onclick="E.tipoReg='cto';render();">${I.box} CTO</button><button style="${t==='empalme'?tA:tI}" onclick="E.tipoReg='empalme';render();">${I.link} Empalme</button></div></div>${t==='cto'?fCto:fEmp}`;
}

function rConfirmar() {
    const {splitters,cto,vertical} = E.fCto;
    return `<div class="header"><button class="btn-atras" onclick="ir('registrar')">${I.back}</button><h2 class="titulo-pantalla">Confirmar</h2></div><div style="padding:16px 20px 0;"><p style="font-size:10px;color:var(--gris-texto);text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;font-weight:600;">Datos a registrar</p></div><div class="datos-detectados"><div class="dato-fila"><div><p class="dato-fila-label">Splitters</p>${splitters.map(s=>`<p class="dato-fila-valor" style="font-size:15px;">${esc(ls(s.tipo))} x${s.cantidad|0}</p>`).join('')}</div><button class="btn-cambiar" onclick="ir('registrar')">Cambiar</button></div><div class="dato-fila"><div><p class="dato-fila-label">CTO</p><p class="dato-fila-valor">${esc(cto)}</p></div><button class="btn-cambiar" onclick="ir('registrar')">Cambiar</button></div><div class="dato-fila"><div><p class="dato-fila-label">Vertical</p><p class="dato-fila-valor">${esc(vertical)}</p></div><button class="btn-cambiar" onclick="ir('registrar')">Cambiar</button></div></div><div style="padding:20px;display:flex;flex-direction:column;gap:10px;"><button class="btn-enviar verde" onclick="enviarCto()">${I.check} Confirmar y guardar</button><button style="background:rgba(255,255,255,0.05);color:var(--gris-texto);border:none;border-radius:var(--radio);padding:14px;font-size:15px;font-weight:600;cursor:pointer;" onclick="ir('registrar')">Cancelar</button></div>`;
}

function rStock() {
    if (!E.stock.length) return '<div class="cargando">Cargando...</div>';
    const mods = E.stockMods || [];
    const tarjeta = (s, label) => { const c=s.alerta==='SIN STOCK'?'sin-stock':s.alerta==='STOCK BAJO'?'alerta':''; return `<div class="tarjeta-stock ${c}"><div><p class="stock-tipo">${esc(label)}</p><p class="stock-detalle">Mín: ${s.min|0} · Usados: ${s.usada|0}</p>${s.alerta!=='OK'?`<span class="badge-alerta">${esc(s.alerta)}</span>`:''}</div><p class="stock-numero">${s.actual|0}</p></div>`; };
    return `<div class="header"><button class="btn-atras" onclick="ir('inicio')">${I.back}</button><h2 class="titulo-pantalla">Stock furgoneta</h2></div>
    <div style="padding:0 20px;"><p style="font-size:10px;color:var(--gris-texto);text-transform:uppercase;letter-spacing:0.8px;margin:16px 0 10px;font-weight:600;">Splitters</p></div>
    <div class="lista-stock">${E.stock.map(s=>tarjeta(s,ls(s.tipo))).join('')}</div>
    <div style="padding:0 20px;"><p style="font-size:10px;color:var(--gris-texto);text-transform:uppercase;letter-spacing:0.8px;margin:20px 0 10px;font-weight:600;">Módulos</p></div>
    <div class="lista-stock">${mods.map(s=>tarjeta(s,lm(s.tipo))).join('')}</div>`;
}

function rMaterial() {
    const tipoMat = E.fMat.tipo||'splitter';
    const esSpl = tipoMat==='splitter';
    const optsSpl = SPL.map(s=>`<option value="${s.id}" ${E.fMat.splitter===s.id?'selected':''}>${esc(s.l)}</option>`).join('');
    const optsMod = MODS.map(m=>`<option value="${m.id}" ${E.fMat.modulo===m.id?'selected':''}>${esc(m.l)}</option>`).join('');
    const selId = esSpl ? E.fMat.splitter : E.fMat.modulo;
    const lista = esSpl ? E.stock : (E.stockMods||[]);
    const sa = selId ? lista.find(s=>s.tipo===selId) : null;
    const ok = selId && E.fMat.cantidad && parseInt(E.fMat.cantidad)>0;
    const tA = 'background:var(--amarillo);color:var(--negro);border:none;border-radius:8px;padding:10px;font-family:Poppins,sans-serif;font-size:14px;font-weight:600;cursor:pointer;flex:1;';
    const tI = 'background:transparent;color:var(--gris-texto);border:none;border-radius:8px;padding:10px;font-family:Poppins,sans-serif;font-size:14px;font-weight:500;cursor:pointer;flex:1;';
    return `<div class="header"><button class="btn-atras" onclick="ir('inicio')">${I.back}</button><h2 class="titulo-pantalla">Editar material</h2></div>
    <div style="padding:8px 20px 14px;">
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:3px;display:flex;gap:3px;">
            <button style="${esSpl?tA:tI}" onclick="E.fMat={tipo:'splitter',splitter:'',modulo:'',cantidad:''};render()">Splitters</button>
            <button style="${!esSpl?tA:tI}" onclick="E.fMat={tipo:'modulo',splitter:'',modulo:'',cantidad:''};render()">Módulos</button>
        </div>
    </div>
    <div class="form">
        <div class="campo"><label class="campo-label">${esSpl?'Splitter':'Módulo'}</label>
            <select class="campo-select" onchange="${esSpl?'E.fMat.splitter':'E.fMat.modulo'}=this.value;render()">
                <option value="">Seleccionar</option>${esSpl?optsSpl:optsMod}
            </select>
        </div>
        ${sa?`<div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radio-sm);padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;"><span style="font-size:14px;color:var(--gris-texto);">Stock actual</span><span style="font-size:16px;font-weight:600;font-family:Poppins,sans-serif;color:#fff;">${sa.actual} uds</span></div>`:''}
        <div class="campo"><label class="campo-label">Cantidad</label>
            <input type="number" inputmode="numeric" class="campo-input" placeholder="Ej: 10" min="1" value="${E.fMat.cantidad}" oninput="E.fMat.cantidad=this.value;const ok=${esSpl?'E.fMat.splitter':'E.fMat.modulo'}&&this.value&&parseInt(this.value)>0;document.querySelectorAll('.bsa').forEach(b=>b.disabled=!ok);">
        </div>
        <button class="btn-enviar bsa" ${ok?'':'disabled'} onclick="sumarMat()" style="background:var(--verde);margin:8px 0 0;">+ Añadir al stock</button>
        <button class="btn-enviar bsa" ${ok?'':'disabled'} onclick="elimMat()" style="background:var(--rojo);margin:8px 0 0;">− Eliminar del stock</button>
    </div>
    <div style="padding:16px 20px 8px;"><p style="font-size:10px;color:var(--gris-texto);text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;font-weight:600;">Stock ${esSpl?'splitters':'módulos'}</p></div>
    <div class="lista-stock">${lista.map(s=>`<div class="tarjeta-stock ${s.alerta!=='OK'?'alerta':''}"><div><p class="stock-tipo">${esc(esSpl?ls(s.tipo):lm(s.tipo))}</p><p class="stock-detalle">Carg: ${s.cargada|0} · Usados: ${s.usada|0}</p></div><p class="stock-numero">${s.actual|0}</p></div>`).join('')}</div>`;
}

function rDescarte() {
    const tipoDes = E.fDes.tipo || 'splitter';
    const esSpl = tipoDes === 'splitter';
    const optsSpl = SPL.map(s=>`<option value="${s.id}" ${E.fDes.splitter===s.id?'selected':''}>${esc(s.l)}</option>`).join('');
    const optsMod = MODS.map(m=>`<option value="${m.id}" ${E.fDes.modulo===m.id?'selected':''}>${esc(m.l)}</option>`).join('');
    const selId = esSpl ? E.fDes.splitter : E.fDes.modulo;
    const lista = esSpl ? E.stock : (E.stockMods||[]);
    const sa = selId ? lista.find(s=>s.tipo===selId) : null;
    const c = parseInt(E.fDes.cantidad);
    const ok = selId && Number.isFinite(c) && c > 0;
    const tA = 'background:var(--amarillo);color:var(--negro);border:none;border-radius:8px;padding:12px;font-family:Poppins,sans-serif;font-size:15px;font-weight:600;cursor:pointer;flex:1;';
    const tI = 'background:transparent;color:var(--gris-texto);border:none;border-radius:8px;padding:12px;font-family:Poppins,sans-serif;font-size:14px;font-weight:500;cursor:pointer;flex:1;';
    return `<div class="header"><button class="btn-atras" onclick="ir('inicio')">${I.back}</button><h2 class="titulo-pantalla">Descarte</h2></div>
    <div style="padding:8px 20px 4px;">
        <p style="font-size:13px;color:var(--gris-texto);margin:0 0 12px;">Material roto o no usable. Se descuenta del stock y queda registrado en el informe del día.</p>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:3px;display:flex;gap:3px;">
            <button style="${esSpl?tA:tI}" onclick="E.fDes={tipo:'splitter',splitter:'',modulo:'',cantidad:'',motivo:''};render()">Splitters</button>
            <button style="${!esSpl?tA:tI}" onclick="E.fDes={tipo:'modulo',splitter:'',modulo:'',cantidad:'',motivo:''};render()">Módulos</button>
        </div>
    </div>
    <div class="form">
        <div class="campo"><label class="campo-label">${esSpl?'Splitter':'Módulo'}</label>
            <select class="campo-select" onchange="${esSpl?'E.fDes.splitter':'E.fDes.modulo'}=this.value;render()">
                <option value="">Seleccionar</option>${esSpl?optsSpl:optsMod}
            </select>
        </div>
        ${sa?`<div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radio-sm);padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;"><span style="font-size:14px;color:var(--gris-texto);">Stock actual</span><span style="font-size:16px;font-weight:600;font-family:Poppins,sans-serif;color:${sa.actual<=0?'var(--rojo)':'#fff'};">${sa.actual|0} uds</span></div>`:''}
        <div class="campo"><label class="campo-label">Cantidad a descartar</label>
            <input type="number" inputmode="numeric" class="campo-input" placeholder="Ej: 1" min="1" value="${esc(E.fDes.cantidad)}" oninput="E.fDes.cantidad=this.value;render()">
        </div>
        <div class="campo"><label class="campo-label">Motivo <span style="color:rgba(255,255,255,0.3);text-transform:none;font-weight:500;letter-spacing:0;">(opcional)</span></label>
            <input type="text" class="campo-input" placeholder="Ej: conector roto" maxlength="80" value="${esc(E.fDes.motivo)}" oninput="E.fDes.motivo=this.value">
        </div>
        <button class="btn-enviar" ${ok?'':'disabled'} onclick="enviarDescarte()" style="background:var(--rojo);color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;">${I.trash} Registrar descarte</button>
    </div>`;
}

function rAvisos() {
    const tipo = E.fLim.tipo || 'spl';
    const esSpl = tipo === 'spl';
    const fuente = esSpl ? SPL : MODS;
    const opts = fuente.map(s=>`<option value="${s.id}" ${E.fLim.splitter===s.id?'selected':''}>${esc(s.l)}</option>`).join('');
    const lista = esSpl ? E.stock : (E.stockMods||[]);
    const sel = E.fLim.splitter ? lista.find(s=>s.tipo===E.fLim.splitter) : null;
    const ok = E.fLim.splitter && E.fLim.limite !== '' && E.fLim.limite != null;
    const bajo = [...E.stock, ...(E.stockMods||[])].filter(s=>s.alerta!=='OK');
    const tA = 'background:var(--amarillo);color:var(--negro);border:none;border-radius:8px;padding:10px;font-family:Poppins,sans-serif;font-size:14px;font-weight:600;cursor:pointer;flex:1;';
    const tI = 'background:transparent;color:var(--gris-texto);border:none;border-radius:8px;padding:10px;font-family:Poppins,sans-serif;font-size:14px;font-weight:500;cursor:pointer;flex:1;';
    return `<div class="header"><button class="btn-atras" onclick="ir('inicio')">${I.back}</button><h2 class="titulo-pantalla">Avisos y límites</h2></div>
    <div style="padding:8px 20px 14px;">
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:3px;display:flex;gap:3px;">
            <button style="${esSpl?tA:tI}" onclick="E.fLim={tipo:'spl',splitter:'',limite:''};render()">Splitters</button>
            <button style="${!esSpl?tA:tI}" onclick="E.fLim={tipo:'mod',splitter:'',limite:''};render()">Módulos</button>
        </div>
    </div>
    <div style="padding:0 20px 16px;"><p style="font-size:13px;color:var(--gris-texto);margin:0;">Configura el mínimo de cada ${esSpl?'splitter':'módulo'}.</p></div>
    <div class="form"><div class="campo"><label class="campo-label">${esSpl?'Splitter':'Módulo'}</label><select class="campo-select" onchange="E.fLim.splitter=this.value;render()"><option value="">Seleccionar</option>${opts}</select></div>${sel?`<div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radio-sm);padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;"><div><p style="font-size:10px;color:var(--gris-texto);margin:0 0 2px;font-weight:600;text-transform:uppercase;">Límite</p><p style="font-size:18px;font-weight:600;margin:0;font-family:Poppins,sans-serif;color:#fff;">${sel.min|0} uds</p></div><div style="text-align:right;"><p style="font-size:10px;color:var(--gris-texto);margin:0 0 2px;font-weight:600;text-transform:uppercase;">Stock</p><p style="font-size:18px;font-weight:600;margin:0;font-family:Poppins,sans-serif;color:${sel.alerta!=='OK'?'var(--rojo)':'#fff'};">${sel.actual|0} uds</p></div></div>`:''}<div class="campo"><label class="campo-label">Nuevo límite</label><input type="number" inputmode="numeric" class="campo-input" id="inp-lim" placeholder="Ej: 3" min="0" value="${esc(E.fLim.limite||'')}" oninput="E.fLim.limite=this.value;document.getElementById('btn-lim').disabled=!(E.fLim.splitter&&this.value!=='');"></div><button class="btn-enviar" id="btn-lim" ${ok?'':'disabled'} onclick="guardarLim()">Guardar límite</button></div><div class="lista-stock" style="margin-top:8px;">${lista.map(s=>`<div class="tarjeta-stock ${s.alerta!=='OK'?'alerta':''}"><div><p class="stock-tipo">${esc(esSpl?ls(s.tipo):lm(s.tipo))}</p><p class="stock-detalle">Aviso < ${s.min|0} uds</p>${s.alerta!=='OK'?`<span class="badge-alerta">${esc(s.alerta)}</span>`:''}</div><div style="text-align:right;"><p style="font-size:22px;font-weight:700;margin:0;font-family:Poppins,sans-serif;color:#fff;">${s.min|0}</p></div></div>`).join('')}</div>${bajo.length>0?`<div style="padding:16px 20px;"><div style="background:var(--rojo-bg);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:16px;"><p style="font-size:13px;font-weight:700;color:var(--rojo);margin:0 0 10px;">${I.alert} Material bajo límite</p>${bajo.map(s=>`<p style="font-size:14px;margin:4px 0;color:#ccc;">· ${esc(s.cat==='mod'?lm(s.tipo):ls(s.tipo))} — ${s.actual|0} (mín: ${s.min|0})</p>`).join('')}<button class="btn-enviar" style="margin-top:14px;margin-bottom:0;" onclick="ir('pedido')">Ver pedido</button></div></div>`:''}`;
}

function rInforme() {
    const hoy = new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const items = E.instalaciones;
    const ctos = items.filter(i=>i.tipo==='cto');
    const empalmes = items.filter(i=>i.tipo==='empalme');
    const descartes = items.filter(i=>i.tipo==='descarte');
    const totalSpl = items.filter(i=>i.tipo!=='descarte').reduce((a,i)=>a+(i.splitters?.reduce((b,s)=>b+(s.cantidad||0),0)||0),0);
    const splMap = {}; items.filter(i=>i.tipo!=='descarte').forEach(i=>(i.splitters||[]).forEach(s=>{ if(s.tipo) splMap[s.tipo]=(splMap[s.tipo]||0)+(s.cantidad||0); }));
    const splUsados = Object.entries(splMap).filter(([,v])=>v>0).sort((a,b)=>ls(a[0]).localeCompare(ls(b[0])));
    const totalFus = items.reduce((a,i)=>a+(parseInt(i.fusiones)||0),0);
    const totalCds = ctos.reduce((a,c)=>a+(parseInt(c.cds)||0),0);
    const totalDes = descartes.reduce((a,d)=>a+((d.items||[]).reduce((b,it)=>b+(it.cantidad||0),0)),0);

    const porPon = {};
    items.filter(i=>i.tipo!=='descarte').forEach(i => { const p=i.pon||'__sinpon__'; if(!porPon[p]) porPon[p]=[]; porPon[p].push(i); });

    const cardCto = i => `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:11px 12px;min-width:0;display:flex;flex-direction:column;gap:6px;"><span style="font-size:16px;font-weight:700;font-family:'Poppins',sans-serif;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(i.cto)}</span><div style="display:flex;flex-wrap:wrap;gap:4px;">
    <span style="font-size:9px;font-weight:700;padding:3px 8px;border-radius:20px;text-transform:uppercase;background:${i.vertical==='Vertical propia'?'rgba(34,211,238,0.15)':'rgba(255,255,255,0.08)'};color:${i.vertical==='Vertical propia'?'var(--amarillo)':'rgba(255,255,255,0.6)'};">${i.vertical==='Vertical propia'?'Propia':'Demanda'}${i.cds?' · '+esc(i.cds)+' CDs':''}</span>
    ${i.modeloCto?`<span style="font-size:9px;font-weight:700;padding:3px 8px;border-radius:20px;text-transform:uppercase;background:rgba(99,102,241,0.15);color:#a5b4fc;">${esc(i.modeloCto)}</span>`:''}
    ${i.fusiones?`<span style="font-size:9px;font-weight:700;background:rgba(16,185,129,0.15);color:var(--verde);padding:3px 8px;border-radius:20px;">${esc(i.fusiones)} fus.</span>`:''}
    </div><div style="display:flex;flex-wrap:wrap;gap:4px;">${(i.splitters||[]).map(s=>`<span style="font-size:10px;font-weight:600;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8);padding:3px 7px;border-radius:5px;border:1px solid rgba(255,255,255,0.08);">${esc(ls(s.tipo).replace('Splitter ',''))} ×${s.cantidad|0}</span>`).join('')}${i.modulo?`<span style="font-size:10px;font-weight:600;background:rgba(99,102,241,0.15);color:#a5b4fc;padding:3px 7px;border-radius:5px;border:1px solid rgba(99,102,241,0.2);">${esc(lm(i.modulo))}</span>`:''}</div></div>`;

    const cardEmp = i => `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:11px 12px;min-width:0;display:flex;flex-direction:column;gap:6px;"><span style="font-size:16px;font-weight:700;font-family:'Poppins',sans-serif;color:#fff;">${esc(i.referencia)}</span><span style="font-size:9px;font-weight:700;background:rgba(16,185,129,0.15);color:var(--verde);padding:3px 8px;border-radius:20px;display:inline-block;align-self:flex-start;">${esc(i.fusiones)} fusiones</span><div style="display:flex;flex-wrap:wrap;gap:4px;">${i.splitters?.length?i.splitters.map(s=>`<span style="font-size:10px;font-weight:600;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8);padding:3px 7px;border-radius:5px;border:1px solid rgba(255,255,255,0.08);">${esc(ls(s.tipo).replace('Splitter ',''))} ×${s.cantidad|0}</span>`).join(''):'<span style="font-size:11px;color:var(--gris-texto);">Sin splitter</span>'}${i.modulo?`<span style="font-size:10px;font-weight:600;background:rgba(99,102,241,0.15);color:#a5b4fc;padding:3px 7px;border-radius:5px;border:1px solid rgba(99,102,241,0.2);">${esc(lm(i.modulo))}</span>`:''}</div></div>`;

    const seccionPon = (ponKey, registros) => {
        const pC=registros.filter(i=>i.tipo==='cto'), pE=registros.filter(i=>i.tipo==='empalme');
        const esSin = ponKey==='__sinpon__';
        return `<div style="margin:0 20px 16px;">${!esSin?`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><div style="background:rgba(34,211,238,0.12);border:1px solid rgba(34,211,238,0.25);border-radius:20px;padding:5px 14px;"><span style="font-size:11px;font-weight:700;color:var(--amarillo);text-transform:uppercase;letter-spacing:1px;">PON ${esc(ponKey)}</span></div><div style="flex:1;height:1px;background:rgba(34,211,238,0.15);"></div><span style="font-size:11px;color:var(--gris-texto);">${registros.length} reg.</span></div>`:''}${pC.length?`<p style="font-size:10px;color:var(--gris-texto);text-transform:uppercase;letter-spacing:0.8px;margin:0 0 6px;font-weight:600;">CTOs</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:${pE.length?'10px':'0'};">${pC.map(cardCto).join('')}</div>`:''}${pE.length?`<p style="font-size:10px;color:var(--gris-texto);text-transform:uppercase;letter-spacing:0.8px;margin:0 0 6px;font-weight:600;">Empalmes</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">${pE.map(cardEmp).join('')}</div>`:''}</div>`;
    };

    const contenido = items.length===0
        ? `<div class="vacio">${I.doc}<p>No hay registros hoy</p></div>`
        : Object.entries(porPon).sort(([a],[b])=>a==='__sinpon__'?1:b==='__sinpon__'?-1:a.localeCompare(b)).map(([p,r])=>seccionPon(p,r)).join('');

    return `<div class="header"><button class="btn-atras" onclick="ir('inicio')">${I.back}</button><h2 class="titulo-pantalla">Informe del día</h2></div>
    <div class="informe-cab">
        <div class="informe-cab-fila"><div class="informe-cab-equipo">${esc(VAN.equipo||'Equipo')}</div><div class="informe-cab-mat">${esc(VAN.matricula)}</div></div>
        <div class="informe-cab-fecha">${esc(hoy)}</div>
    </div>
    <div class="informe-resumen">
        ${ctos.length?`<div class="resumen-card"><span class="resumen-num">${ctos.length}</span><span class="resumen-lbl">CTO${ctos.length>1?'s':''}</span></div>`:''}
        ${empalmes.length?`<div class="resumen-card"><span class="resumen-num">${empalmes.length}</span><span class="resumen-lbl">Empalme${empalmes.length>1?'s':''}</span></div>`:''}
        ${totalFus?`<div class="resumen-card"><span class="resumen-num">${totalFus}</span><span class="resumen-lbl">Fusiones</span></div>`:''}
        ${totalSpl?`<div class="resumen-card"><span class="resumen-num">${totalSpl}</span><span class="resumen-lbl">Splitters</span></div>`:''}
        ${totalCds?`<div class="resumen-card"><span class="resumen-num">${totalCds}</span><span class="resumen-lbl">CDs</span></div>`:''}
        ${totalDes?`<div class="resumen-card descarte"><span class="resumen-num">${totalDes}</span><span class="resumen-lbl">Descartes</span></div>`:''}
    </div>
    ${contenido}
    ${descartes.length?`<div style="margin:8px 20px 16px;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><div style="background:rgba(251,113,133,0.12);border:1px solid rgba(251,113,133,0.25);border-radius:20px;padding:5px 14px;"><span style="font-size:11px;font-weight:700;color:var(--rojo);text-transform:uppercase;letter-spacing:1px;">Descartes</span></div><div style="flex:1;height:1px;background:rgba(251,113,133,0.15);"></div><span style="font-size:11px;color:var(--gris-texto);">${descartes.length} reg.</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">${descartes.map(d=>`<div style="background:rgba(251,113,133,0.06);border:1px solid rgba(251,113,133,0.18);border-radius:14px;padding:11px 12px;min-width:0;display:flex;flex-direction:column;gap:6px;">${(d.items||[]).map(it=>`<span style="font-size:13px;font-weight:600;color:#fff;font-family:'Poppins',sans-serif;">${esc(it.cat==='mod'?lm(it.tipo):ls(it.tipo))} ×${it.cantidad|0}</span>`).join('')}${d.motivo?`<span style="font-size:11px;color:var(--gris-texto);font-style:italic;">${esc(d.motivo)}</span>`:''}</div>`).join('')}</div></div>`:''}
    ${splUsados.length?`<div style="margin:8px 20px 24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;"><p style="font-size:10px;color:var(--gris-texto);text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px;font-weight:600;">Splitters gastados</p>${splUsados.map(([tipo,cant])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="font-size:14px;font-weight:600;color:#fff;font-family:Poppins,sans-serif;">· ${esc(ls(tipo))}</span><span style="font-size:14px;font-weight:700;color:var(--amarillo);font-family:Poppins,sans-serif;">${cant} uds</span></div>`).join('')}</div>`:''}`;
}

function rPedido() {
    const bajo = [...E.stock, ...(E.stockMods||[])].filter(s=>s.alerta!=='OK');
    const card = s => { const label = s.cat==='mod' ? lm(s.tipo) : ls(s.tipo); return `<div class="informe-item"><div class="informe-item-top"><p class="informe-item-material">${esc(label)}</p><span class="badge-alerta">${esc(s.alerta)}</span></div><p class="informe-item-cto">Stock: ${s.actual|0} · Mín: ${s.min|0} · Pedir: <strong>${Math.max(0,s.min-s.actual)|0} uds</strong></p></div>`; };
    return `<div class="header"><button class="btn-atras" onclick="ir('avisos')">${I.back}</button><h2 class="titulo-pantalla">Pedido almacén</h2></div><p class="informe-fecha">Material bajo stock mínimo</p><div class="informe-lista">${bajo.length===0?`<div class="vacio">${I.check}<p>Nada que pedir</p></div>`:bajo.map(card).join('')}</div>${bajo.length?`<div style="padding:20px;"><button class="btn-principal" onclick="compartirPedido()" style="justify-content:center;">Compartir lista</button></div>`:''}`;
}

function rCalendario() {
    const {calAnio:a,calMes:m} = E;
    const nm = MESES[m-1], p1 = new Date(a,m-1,1).getDay(), off = p1===0?6:p1-1, dm = new Date(a,m,0).getDate();
    const hoy = new Date(), isHoy = d => d===hoy.getDate()&&m===hoy.getMonth()+1&&a===hoy.getFullYear();
    const dc = {}; E.calDias.forEach(d=>{dc[parseInt(d.fecha.split('-')[2])]=d;});
    let c = ''; for(let i=0;i<off;i++) c+='<div></div>';
    for(let d=1;d<=dm;d++){const f=`${a}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,td=dc[d],fu=new Date(a,m-1,d)>hoy;
        c+=`<div class="cal-dia ${isHoy(d)?'cal-hoy':''} ${td?'cal-con-datos':''} ${fu?'cal-futuro':''}" onclick="${!fu?`selDia('${f}')`:''}"><span>${d}</span>${td?'<span class="cal-punto"></span>':''}</div>`;}
    return `<div class="header"><button class="btn-atras" onclick="ir('inicio')">${I.back}</button><h2 class="titulo-pantalla">Historial</h2></div><div style="padding:8px 20px 16px;"><div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radio);padding:16px;"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"><button onclick="cambiarMes(-1)" style="background:rgba(255,255,255,0.06);border:none;border-radius:10px;padding:8px 14px;font-size:18px;cursor:pointer;color:#fff;">‹</button><p style="font-size:17px;font-weight:600;margin:0;font-family:Poppins,sans-serif;text-transform:capitalize;color:#fff;">${nm} ${a}</p><button onclick="cambiarMes(1)" style="background:rgba(255,255,255,0.06);border:none;border-radius:10px;padding:8px 14px;font-size:18px;cursor:pointer;color:#fff;">›</button></div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px;">${DSEM.map(d=>`<div class="cal-label-dia">${d}</div>`).join('')}</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">${c}</div></div></div>${E.calDias.length===0?`<div class="vacio">${I.cal}<p>Sin registros este mes</p></div>`:`<div style="padding:0 20px;">${E.calDias.map(d=>{const l=new Date(d.fecha+'T12:00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});return `<div class="informe-item" style="cursor:pointer;" onclick="selDia('${d.fecha}')"><div class="informe-item-top"><p class="informe-item-material" style="text-transform:capitalize;">${l}</p>${I.arrowS}</div><p class="informe-item-cto">${d.total} reg · ${d.spl} splitters</p></div>`;}).join('')}</div>`}`;
}

function rDia() {
    const f = E.diaSel, lab = new Date(f+'T12:00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const inst = E.instDia, ed = E.instEdit;
    const lista = inst.length===0?`<div class="vacio">${I.doc}<p>Sin registros</p></div>`:inst.map(i=>{
        const isEmp = i.tipo==='empalme', isEd = ed&&ed.id===i.id;
        const idEsc = esc(i.id);
        if (isEd&&!isEmp) return `<div class="informe-item" style="border:1px solid var(--amarillo);"><p style="font-size:10px;color:var(--amarillo);text-transform:uppercase;margin:0 0 12px;font-weight:600;">Editando</p><div class="campo" style="margin-bottom:10px;"><label class="campo-label">Splitter</label><select id="ed-spl" class="campo-select">${SPL.map(s=>`<option value="${s.id}" ${i.splitters?.[0]?.tipo===s.id?'selected':''}>${esc(s.l)}</option>`).join('')}</select></div><div class="campo" style="margin-bottom:10px;"><label class="campo-label">Cantidad</label><input type="number" id="ed-cant" class="campo-input" value="${(i.splitters?.[0]?.cantidad)|0||1}" min="1"></div><div class="campo" style="margin-bottom:10px;"><label class="campo-label">CTO</label><input type="text" id="ed-cto" class="campo-input" value="${esc(i.cto||'')}"></div><div class="campo" style="margin-bottom:14px;"><label class="campo-label">Notas</label><input type="text" id="ed-notas" class="campo-input" value="${esc(i.notas||'')}"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><button onclick="guardarEdit()" style="background:var(--verde);color:#fff;border:none;border-radius:10px;padding:14px;font-family:Poppins,sans-serif;font-size:14px;font-weight:600;cursor:pointer;">Guardar</button><button onclick="cancelEdit()" style="background:rgba(255,255,255,0.06);color:#fff;border:none;border-radius:10px;padding:14px;font-size:14px;font-weight:600;cursor:pointer;">Cancelar</button></div>${(i.splitters||[]).length>1?`<p style="font-size:11px;color:var(--gris-texto);margin:10px 0 0;">Esta CTO tiene ${(i.splitters.length)} splitters; sólo se editará el primero.</p>`:''}</div>`;
        if (isEmp) return `<div class="informe-item"><div style="display:flex;justify-content:space-between;align-items:start;"><div><div style="background:var(--amarillo);border-radius:5px;padding:3px 8px;display:inline-block;margin-bottom:5px;"><span style="font-size:9px;font-weight:700;color:var(--negro);text-transform:uppercase;">EMPALME</span></div><p style="font-size:17px;font-weight:700;margin:0;font-family:Poppins,sans-serif;color:#fff;">${esc(i.referencia)}</p><p style="font-size:12px;color:var(--gris-texto);margin:2px 0 0;">${esc(i.fusiones)} fusiones</p>${i.notas?`<p style="font-size:12px;color:var(--gris-texto);margin:4px 0 0;font-style:italic;">${esc(i.notas)}</p>`:''}</div><button onclick="delInst('${idEsc}')" style="background:var(--rojo-bg);border:none;border-radius:8px;padding:8px 12px;font-size:12px;color:var(--rojo);font-weight:600;cursor:pointer;">Eliminar</button></div></div>`;
        return `<div class="informe-item"><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;"><div><p style="font-size:17px;font-weight:700;margin:0;font-family:Poppins,sans-serif;color:#fff;">CTO ${esc(i.cto)}</p><span class="informe-item-vertical" style="margin-top:4px;">${esc(i.vertical||'')}</span></div><div style="display:flex;gap:6px;"><button onclick="editInstHandler('${idEsc}')" style="background:rgba(255,255,255,0.06);border:none;border-radius:8px;padding:8px 10px;font-size:12px;color:var(--gris-texto);font-weight:600;cursor:pointer;">Editar</button><button onclick="delInst('${idEsc}')" style="background:var(--rojo-bg);border:none;border-radius:8px;padding:8px 10px;font-size:12px;color:var(--rojo);font-weight:600;cursor:pointer;">Eliminar</button></div></div>${i.splitters?i.splitters.map(s=>`<p style="font-size:13px;color:var(--gris-texto);margin:2px 0;">· ${esc(ls(s.tipo))} x${s.cantidad|0}</p>`).join(''):''}${i.notas?`<p style="font-size:12px;color:var(--gris-texto);margin:6px 0 0;font-style:italic;">${esc(i.notas)}</p>`:''}</div>`;
    }).join('');
    return `<div class="header"><button class="btn-atras" onclick="ir('calendario')">${I.back}</button><h2 class="titulo-pantalla" style="font-size:16px;text-transform:capitalize;">${esc(lab)}</h2></div><div style="padding:0 20px 8px;"><p style="font-size:13px;color:var(--gris-texto);margin:0;">${inst.length} registro${inst.length!==1?'s':''}</p></div><div class="informe-lista">${lista}</div>`;
}

function rConfig() {
    const mat = localStorage.getItem('matricula')||'';
    const eq = localStorage.getItem('equipo')||'';
    const vanId = localStorage.getItem('van_id')||'furgoneta_1';
    const vanLabel = id => '🚐 Furgoneta ' + id.replace('furgoneta_','');
    return `
    <div class="header"><button class="btn-atras" onclick="ir('inicio')">${I.back}</button><h2 class="titulo-pantalla">Configuración</h2></div>
    <div style="padding:8px 20px 0;">
        <p style="font-size:13px;color:var(--gris-texto);margin:0 0 20px;">Configura tu dispositivo. Cada persona debe elegir su furgoneta.</p>
    </div>
    <div class="form">
        <div class="campo">
            <label class="campo-label">Tu furgoneta</label>
            <select class="campo-select" onchange="setVan(this.value)">
                ${VAN_IDS.map(id=>`<option value="${id}" ${vanId===id?'selected':''}>${esc(vanLabel(id))}</option>`).join('')}
            </select>
            <p style="font-size:11px;color:var(--gris-texto);margin:8px 0 0;">Cada furgoneta tiene su propio stock e historial.</p>
        </div>
        <div style="background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.15);border-radius:12px;padding:14px 16px;margin-bottom:16px;">
            <p style="font-size:12px;color:var(--amarillo);font-weight:600;margin:0 0 2px;">Actualmente usando: ${esc(vanLabel(vanId))}</p>
            <p style="font-size:11px;color:var(--gris-texto);margin:0;">ID: ${esc(vanId)}</p>
        </div>
        <div class="campo">
            <label class="campo-label">Nombre del equipo</label>
            <input type="text" id="inp-eq" class="campo-input" placeholder="Ej: Sergio" maxlength="40" value="${esc(eq)}">
        </div>
        <div class="campo">
            <label class="campo-label">Matrícula</label>
            <input type="text" id="inp-mat" class="campo-input" placeholder="Ej: 1234-ABC" maxlength="20" value="${esc(mat)}">
        </div>
        <button onclick="guardarConfig()" style="background:var(--amarillo);color:var(--negro);border:none;border-radius:16px;padding:20px;font-family:Poppins,sans-serif;font-size:16px;font-weight:600;width:100%;cursor:pointer;margin-top:8px;box-shadow:var(--sombra-amarillo);">
            Guardar configuración
        </button>
    </div>`;
}

// ─── RENDERS PON ──────────────────────────────────

function rPons() {
    const cards = E.pons.map(p => {
        const pct = p.total > 0 ? Math.round((p.realizados / p.total) * 100) : 0;
        const colorBarra = pct === 100 ? 'var(--verde)' : pct > 0 ? 'var(--amarillo)' : 'rgba(255,255,255,0.08)';
        const colorPct = pct === 100 ? 'var(--verde)' : pct > 0 ? 'var(--amarillo)' : 'rgba(255,255,255,0.2)';
        return `
        <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radio);padding:16px;cursor:pointer;transition:background 0.15s;" onclick="irPon('${esc(p.id)}')">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
                <div style="flex:1;min-width:0;">
                    <p style="font-size:18px;font-weight:700;margin:0;color:#fff;font-family:Poppins,sans-serif;">PON ${esc(p.nombre)}</p>
                    ${p.descripcion ? `<p style="font-size:12px;color:var(--gris-texto);margin:3px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.descripcion)}</p>` : ''}
                </div>
                <div style="text-align:right;flex-shrink:0;margin-left:14px;">
                    <p style="font-size:24px;font-weight:700;margin:0;font-family:Poppins,sans-serif;color:${colorPct};line-height:1;">${pct}%</p>
                    <p style="font-size:11px;color:var(--gris-texto);margin:2px 0 0;">${p.realizados}/${p.total}</p>
                </div>
            </div>
            <div style="height:5px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;margin-bottom:${p.total > 0 ? '8px' : '0'};">
                <div style="height:100%;width:${pct}%;background:${colorBarra};border-radius:4px;"></div>
            </div>
            ${p.total === 0
                ? `<p style="font-size:11px;color:rgba(255,255,255,0.2);margin:0;">Sin elementos aún</p>`
                : `<div style="display:flex;gap:12px;">${(p.total - p.realizados) > 0 ? `<span style="font-size:11px;color:var(--amarillo);font-weight:600;">${p.total - p.realizados} pendiente${p.total - p.realizados !== 1 ? 's' : ''}</span>` : ''}${p.realizados > 0 ? `<span style="font-size:11px;color:var(--verde);font-weight:600;">${p.realizados} realizado${p.realizados !== 1 ? 's' : ''}</span>` : ''}</div>`
            }
        </div>`;
    }).join('');

    return `
    <div class="header">
        <button class="btn-atras" onclick="ir('inicio')">${I.back}</button>
        <h2 class="titulo-pantalla">Gestión PONs</h2>
    </div>
    <div style="padding:8px 20px 14px;">
        <button onclick="ir('pon_nuevo')" style="background:var(--amarillo);color:var(--negro);border:none;border-radius:var(--radio-sm);padding:16px;font-family:Poppins,sans-serif;font-size:15px;font-weight:600;width:100%;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:var(--sombra-amarillo);">+ Nuevo PON</button>
    </div>
    ${E.pons.length === 0
        ? `<div class="vacio">${I.pon}<p>Sin PONs creados<br><span style="font-size:12px;color:rgba(255,255,255,0.2);">Crea el primer PON para empezar</span></p></div>`
        : `<div style="padding:0 20px;display:flex;flex-direction:column;gap:8px;">${cards}</div>`
    }`;
}

function rPonDetalle() {
    const p = E.ponSel;
    if (!p) return `<div class="header"><button class="btn-atras" onclick="ir('pons')">${I.back}</button><h2 class="titulo-pantalla">PON</h2></div>`;

    const nodos = E.ponNodos;
    const total = nodos.length;
    const realizados = nodos.filter(n => n.realizado).length;
    const pendientes = total - realizados;
    const pct = total > 0 ? Math.round((realizados / total) * 100) : 0;
    const colorBarra = pct === 100 ? 'var(--verde)' : pct > 0 ? 'var(--amarillo)' : 'rgba(255,255,255,0.08)';

    // Pendientes primero, luego realizados
    const sorted = [...nodos].sort((a, b) => (a.realizado ? 1 : 0) - (b.realizado ? 1 : 0));

    const nodoCard = n => {
        const isR = !!n.realizado;
        const isCto = n.tipo === 'cto';
        const pId = esc(p.id), nId = esc(n.id);
        const isEditing = E.nodoEdit && E.nodoEdit.id === n.id;

        if (isEditing) {
            const ne = E.nodoEdit;
            return `
            <div style="background:rgba(34,211,238,0.06);border:1px solid rgba(34,211,238,0.25);border-radius:var(--radio-sm);padding:14px 16px;margin-bottom:8px;">
                <p style="font-size:10px;color:var(--amarillo);text-transform:uppercase;font-weight:700;letter-spacing:0.8px;margin:0 0 12px;">Editando ${ne.tipo === 'cto' ? 'CTO' : 'Empalme'}</p>
                <div class="campo" style="margin-bottom:10px;">
                    <label class="campo-label">${ne.tipo === 'cto' ? 'Código CTO' : 'Referencia empalme'}</label>
                    <input type="text" id="inp-edit-codigo" class="campo-input" value="${esc(ne.codigo)}" placeholder="${ne.tipo === 'cto' ? 'Ej: 105656' : 'Ej: 02E1084'}" oninput="E.nodoEdit.codigo=this.value">
                </div>
                <div class="campo" style="margin-bottom:10px;">
                    <label class="campo-label">Dirección <span style="color:rgba(255,255,255,0.3);text-transform:none;font-weight:500;letter-spacing:0;">(opcional)</span></label>
                    <input type="text" id="inp-edit-dir" class="campo-input" value="${esc(ne.direccion)}" placeholder="Ej: Calle Mayor 5, portal 2" oninput="E.nodoEdit.direccion=this.value">
                </div>
                <div class="campo" style="margin-bottom:14px;">
                    <label class="campo-label">Acceso / Llaves <span style="color:rgba(255,255,255,0.3);text-transform:none;font-weight:500;letter-spacing:0;">(opcional)</span></label>
                    <input type="text" id="inp-edit-notas" class="campo-input" value="${esc(ne.notas)}" placeholder="Ej: Llaves presidente 3ºB — Juan" oninput="E.nodoEdit.notas=this.value">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <button onclick="guardarEditNodo()" style="background:var(--verde);color:#fff;border:none;border-radius:10px;padding:14px;font-family:Poppins,sans-serif;font-size:14px;font-weight:600;cursor:pointer;">Guardar</button>
                    <button onclick="cancelEditNodo()" style="background:rgba(255,255,255,0.06);color:#fff;border:none;border-radius:10px;padding:14px;font-size:14px;font-weight:600;cursor:pointer;">Cancelar</button>
                </div>
            </div>`;
        }

        return `
        <div style="background:${isR ? 'rgba(16,185,129,0.05)' : 'var(--card-bg)'};border:1px solid ${isR ? 'rgba(16,185,129,0.15)' : 'var(--card-border)'};border-radius:var(--radio-sm);padding:14px 16px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                <div style="flex:1;min-width:0;">
                    <span style="font-size:9px;font-weight:700;padding:3px 9px;border-radius:20px;text-transform:uppercase;display:inline-block;margin-bottom:6px;background:${isCto?'rgba(34,211,238,0.15)':'rgba(99,102,241,0.15)'};color:${isCto?'var(--amarillo)':'#a5b4fc'};">${isCto?'CTO':'EMPALME'}</span>
                    <p style="font-size:18px;font-weight:700;margin:0;color:${isR?'rgba(255,255,255,0.45)':'#fff'};font-family:Poppins,sans-serif;">${esc(n.codigo)}</p>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;margin-left:8px;">
                    <button onclick="iniciarEditNodo('${nId}')" style="background:rgba(255,255,255,0.06);border:none;border-radius:9px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);cursor:pointer;" title="Editar">${I.edit}</button>
                    <button onclick="elimNodo('${pId}','${nId}')" style="background:var(--rojo-bg);border:none;border-radius:9px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:var(--rojo);cursor:pointer;" title="Eliminar">${I.close}</button>
                </div>
            </div>
            ${n.direccion ? `<p style="font-size:13px;color:rgba(255,255,255,0.65);margin:0 0 5px;display:flex;align-items:center;gap:7px;"><span style="color:var(--cyan);display:flex;flex-shrink:0;">${I.pin}</span>${esc(n.direccion)}</p>` : ''}
            ${n.notas ? `<p style="font-size:12px;color:var(--gris-texto);margin:0 0 12px;display:flex;align-items:center;gap:7px;"><span style="color:var(--indigo);display:flex;flex-shrink:0;">${I.key}</span><span style="font-style:italic;">${esc(n.notas)}</span></p>` : `<div style="margin-bottom:10px;"></div>`}
            ${isR
                ? `<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:11px 14px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--verde)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <div>
                            <p style="font-size:13px;font-weight:700;color:var(--verde);margin:0;letter-spacing:0.3px;">REALIZADO</p>
                            ${n.realizadoPor ? `<p style="font-size:11px;color:rgba(255,255,255,0.35);margin:1px 0 0;">${esc(n.realizadoPor)}</p>` : ''}
                        </div>
                    </div>
                    <button onclick="toggleRealizado('${pId}','${nId}',false)" style="background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 12px;font-size:11px;color:rgba(255,255,255,0.35);font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">Deshacer</button>
                </div>`
                : `<button onclick="toggleRealizado('${pId}','${nId}',true)" style="width:100%;padding:15px;border:none;border-radius:10px;font-family:Poppins,sans-serif;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--amarillo);color:var(--negro);box-shadow:var(--sombra-amarillo);">
                    ${I.check} Marcar como realizado
                </button>`
            }
        </div>`;
    };

    return `
    <div class="header">
        <button class="btn-atras" onclick="ir('pons')">${I.back}</button>
        <h2 class="titulo-pantalla">PON ${esc(p.nombre)}</h2>
    </div>

    <div style="padding:8px 20px 14px;">
        <div style="background:linear-gradient(135deg,rgba(34,211,238,0.1),rgba(34,211,238,0.03));border:1px solid rgba(34,211,238,0.2);border-radius:var(--radio);padding:18px 20px;">
            ${p.descripcion ? `<p style="font-size:12px;color:var(--gris-texto);margin:0 0 12px;">${esc(p.descripcion)}</p>` : ''}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <div style="display:flex;gap:20px;">
                    <div>
                        <p style="font-size:28px;font-weight:700;margin:0;font-family:Poppins,sans-serif;color:var(--verde);line-height:1;">${realizados}</p>
                        <p style="font-size:10px;color:var(--gris-texto);margin:3px 0 0;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Realizados</p>
                    </div>
                    <div>
                        <p style="font-size:28px;font-weight:700;margin:0;font-family:Poppins,sans-serif;color:${pendientes>0?'var(--amarillo)':'rgba(255,255,255,0.15)'};line-height:1;">${pendientes}</p>
                        <p style="font-size:10px;color:var(--gris-texto);margin:3px 0 0;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Pendientes</p>
                    </div>
                </div>
                <p style="font-size:42px;font-weight:700;margin:0;font-family:Poppins,sans-serif;color:${pct===100?'var(--verde)':pct>0?'var(--amarillo)':'rgba(255,255,255,0.15)'};line-height:1;">${pct}%</p>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${colorBarra};border-radius:4px;transition:width 0.4s;"></div>
            </div>
        </div>
    </div>

    <div style="padding:0 20px 16px;">
        <button onclick="E.fNodo={tipo:'cto',codigo:'',direccion:'',notas:''};E.pantalla='anadir_nodo';render();" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radio-sm);padding:14px;font-family:Poppins,sans-serif;font-size:14px;font-weight:600;width:100%;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;">
            ${I.plus} Añadir CTO o Empalme
        </button>
    </div>

    ${total === 0
        ? `<div class="vacio">${I.box}<p>Sin elementos en este PON<br><span style="font-size:12px;color:rgba(255,255,255,0.2);">Añade CTOs y empalmes</span></p></div>`
        : `<div style="padding:0 20px;">${sorted.map(nodoCard).join('')}</div>`
    }

    <div style="padding:20px 20px 32px;">
        <button onclick="elimPon('${esc(p.id)}')" style="background:transparent;color:var(--rojo);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radio-sm);padding:13px;font-family:Poppins,sans-serif;font-size:13px;font-weight:600;width:100%;cursor:pointer;">
            Eliminar PON
        </button>
    </div>`;
}

function rPonNuevo() {
    return `
    <div class="header">
        <button class="btn-atras" onclick="ir('pons')">${I.back}</button>
        <h2 class="titulo-pantalla">Nuevo PON</h2>
    </div>
    <div style="padding:8px 20px 0;">
        <p style="font-size:13px;color:var(--gris-texto);margin:0 0 20px;">Crea un PON para organizar sus CTOs y empalmes con control de estado.</p>
    </div>
    <div class="form">
        <div class="campo">
            <label class="campo-label">Nombre / ID del PON</label>
            <input type="text" id="inp-pon-nombre" class="campo-input" placeholder="Ej: A1, B3, PON-05..." maxlength="30" value="${esc(E.fPon.nombre)}" oninput="E.fPon.nombre=this.value">
        </div>
        <div class="campo">
            <label class="campo-label">Descripción <span style="color:rgba(255,255,255,0.3);text-transform:none;font-weight:500;letter-spacing:0;">(opcional)</span></label>
            <input type="text" id="inp-pon-desc" class="campo-input" placeholder="Ej: Calle Mayor zona norte" maxlength="80" value="${esc(E.fPon.descripcion)}" oninput="E.fPon.descripcion=this.value">
        </div>
        <button onclick="guardarPon()" style="background:var(--amarillo);color:var(--negro);border:none;border-radius:16px;padding:20px;font-family:Poppins,sans-serif;font-size:16px;font-weight:600;width:100%;cursor:pointer;box-shadow:var(--sombra-amarillo);margin-top:8px;">
            Crear PON
        </button>
    </div>`;
}

function rAnadirNodo() {
    const p = E.ponSel;
    if (!p) return `<div class="header"><button class="btn-atras" onclick="ir('pons')">${I.back}</button></div>`;
    const tipo = E.fNodo.tipo;
    const esCto = tipo === 'cto';
    const tA = 'background:var(--amarillo);color:var(--negro);border:none;border-radius:8px;padding:12px;font-family:Poppins,sans-serif;font-size:15px;font-weight:600;cursor:pointer;flex:1;';
    const tI = 'background:transparent;color:var(--gris-texto);border:none;border-radius:8px;padding:12px;font-family:Poppins,sans-serif;font-size:15px;font-weight:500;cursor:pointer;flex:1;';

    return `
    <div class="header">
        <button class="btn-atras" onclick="E.pantalla='pon_detalle';render();">${I.back}</button>
        <h2 class="titulo-pantalla" style="font-size:17px;">Añadir a PON ${esc(p.nombre)}</h2>
    </div>
    <div style="padding:8px 20px 14px;">
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:3px;display:flex;gap:3px;">
            <button style="${esCto?tA:tI}" onclick="E.fNodo.tipo='cto';render();">${I.box} CTO</button>
            <button style="${!esCto?tA:tI}" onclick="E.fNodo.tipo='empalme';render();">${I.link} Empalme</button>
        </div>
    </div>
    <div class="form">
        <div class="campo">
            <label class="campo-label">${esCto ? 'Código CTO' : 'Referencia empalme'}</label>
            <input type="text" id="inp-nodo-codigo" class="campo-input" placeholder="${esCto ? 'Ej: 105656' : 'Ej: 02E1084'}" maxlength="40" value="${esc(E.fNodo.codigo)}" oninput="E.fNodo.codigo=this.value">
        </div>
        <div class="campo">
            <label class="campo-label">Dirección <span style="color:rgba(255,255,255,0.3);text-transform:none;font-weight:500;letter-spacing:0;">(opcional)</span></label>
            <input type="text" id="inp-nodo-dir" class="campo-input" placeholder="Ej: Calle Mayor 5, portal 2" maxlength="80" value="${esc(E.fNodo.direccion)}" oninput="E.fNodo.direccion=this.value">
        </div>
        <div class="campo">
            <label class="campo-label">Acceso / Llaves <span style="color:rgba(255,255,255,0.3);text-transform:none;font-weight:500;letter-spacing:0;">(opcional)</span></label>
            <input type="text" id="inp-nodo-notas" class="campo-input" placeholder="Ej: Llaves presidente 3ºB — Juan" maxlength="120" value="${esc(E.fNodo.notas)}" oninput="E.fNodo.notas=this.value">
        </div>
        <button onclick="guardarNodo()" style="background:var(--amarillo);color:var(--negro);border:none;border-radius:16px;padding:20px;font-family:Poppins,sans-serif;font-size:16px;font-weight:600;width:100%;cursor:pointer;box-shadow:var(--sombra-amarillo);margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px;">
            ${I.plus} Añadir al PON
        </button>
    </div>`;
}

// ─── RENDER & NAVIGATION ──────────────────────────
const PAGES = {
    inicio:rInicio, registrar:rRegistrar, confirmar:rConfirmar,
    stock:rStock, calendario:rCalendario, dia:rDia,
    material:rMaterial, descarte:rDescarte, avisos:rAvisos, informe:rInforme,
    pedido:rPedido, config:rConfig,
    // PON pages
    pons:rPons, pon_detalle:rPonDetalle, pon_nuevo:rPonNuevo, anadir_nodo:rAnadirNodo
};

// Mapea cada pantalla a su pestaña activa (sub-pantallas → pestaña padre)
const TAB_PADRE = {
    inicio:'inicio',
    stock:'stock', material:'stock',
    registrar:'registrar', confirmar:'registrar',
    pons:'pons', pon_detalle:'pons', pon_nuevo:'pons', anadir_nodo:'pons',
    calendario:'calendario', dia:'calendario'
};

function renderTabBar() {
    const tb = document.getElementById('tabbar');
    if (!tb) return;
    const act = TAB_PADRE[E.pantalla] || '';
    const item = (p, ic, label) =>
        `<button class="tab-item ${act === p ? 'activo' : ''}" onclick="ir('${p}')">${ic}<span>${label}</span></button>`;
    tb.innerHTML = `
    <nav class="tab-bar">
        ${item('inicio', I.home, 'Inicio')}
        ${item('stock', I.tabBox, 'Stock')}
        <button class="tab-fab ${act === 'registrar' ? 'activo' : ''}" onclick="ir('registrar')" aria-label="Registrar">${I.plusBold}</button>
        ${item('pons', I.tabPon, 'PONs')}
        ${item('calendario', I.tabCal, 'Historial')}
    </nav>`;
}

let _lastPantalla = null;
function render() {
    const app = document.getElementById('app');
    const cambioPantalla = E.pantalla !== _lastPantalla;
    app.innerHTML = (PAGES[E.pantalla]||rInicio)();
    renderTabBar();
    // Transición de entrada sólo al cambiar de pantalla (no en re-render inline)
    if (cambioPantalla) {
        app.classList.remove('page-enter');
        void app.offsetWidth;
        app.classList.add('page-enter');
        window.scrollTo(0,0);
    }
    _lastPantalla = E.pantalla;
}

async function loadHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    try {
        const s = await get(ref(db, `inst/${VAN.id}/${hoy}`));
        E.instalaciones = s.exists()
            ? Object.entries(s.val()).map(([id,v]) => ({id,...v}))
            : [];
    } catch(e) { E.instalaciones = []; }
}

async function ir(p) {
    E.pantalla = p;
    if (['stock','pedido','inicio','material','avisos'].includes(p)) await loadStock();
    if (['inicio','informe'].includes(p)) await loadHoy();
    if (p==='calendario') await loadCal();
    if (p==='pons') await loadPons();
    if (p==='pon_nuevo') E.fPon = { nombre: '', descripcion: '' };
    if (p==='registrar') { E.tipoReg='cto'; E.fCto={splitters:[],cto:'',vertical:null,cds:'',pon:'',conMod:false,modulo:'',modeloCto:'',fusiones:''}; E.fEmp={referencia:'',fusiones:'',splitters:[],notas:'',conSpl:false,pon:'',conMod:false,modulo:''}; }
    if (p==='material') E.fMat = {tipo:'splitter',splitter:'',modulo:'',cantidad:''};
    if (p==='avisos') E.fLim = {tipo:'spl',splitter:'',limite:''};
    render();
}

// Expose E to window for inline handlers
window.E = E;

// ─── SPLASH & BOOT ───────────────────────────────
let prog = 0;
const bar = document.getElementById('splash-bar');
const splashInt = setInterval(() => {
    prog += 5; bar.style.width = prog + '%';
    if (prog >= 100) {
        clearInterval(splashInt);
        setTimeout(() => {
            document.getElementById('splash').classList.add('oculto');
            setTimeout(() => document.getElementById('splash').style.display = 'none', 600);
        }, 200);
    }
}, 30);

// Init
await loadStock();
await loadHoy();
render();
