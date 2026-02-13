import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1) TUS DATOS DE SUPABASE (YA PUESTOS)
const SUPABASE_URL = "https://dzhhcjjcecqqqiqrkpnd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_v6RCrB2SVZF0FhBNTMQo-w_wfy3Jlwl";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI refs
const loginBox = document.getElementById("loginBox");
const appBox = document.getElementById("appBox");
const btnLogout = document.getElementById("btnLogout");

const btnLogin = document.getElementById("btnLogin");
const loginMsg = document.getElementById("loginMsg");
const email = document.getElementById("email");
const password = document.getElementById("password");

const q = document.getElementById("q");
const btnRefresh = document.getElementById("btnRefresh");
const clientesList = document.getElementById("clientesList");

const c_nombre = document.getElementById("c_nombre");
const c_tel = document.getElementById("c_tel");
const c_email = document.getElementById("c_email");
const c_pob = document.getElementById("c_pob");
const btnAddCliente = document.getElementById("btnAddCliente");
const clienteMsg = document.getElementById("clienteMsg");

const ficha = document.getElementById("ficha");

const bloquePuntos = document.getElementById("bloquePuntos");
const puntosList = document.getElementById("puntosList");
const p_cups = document.getElementById("p_cups");
const p_dir = document.getElementById("p_dir");
const p_pob = document.getElementById("p_pob");
const btnAddPunto = document.getElementById("btnAddPunto");
const puntoMsg = document.getElementById("puntoMsg");

const bloqueContratos = document.getElementById("bloqueContratos");
const contratosList = document.getElementById("contratosList");
const k_inicio = document.getElementById("k_inicio");
const k_fin = document.getElementById("k_fin");
const k_tarifa = document.getElementById("k_tarifa");
const k_comp = document.getElementById("k_comp");
const k_estado = document.getElementById("k_estado");
const k_cobrado = document.getElementById("k_cobrado");
const k_factura = document.getElementById("k_factura");
const btnAddContrato = document.getElementById("btnAddContrato");
const btnRenovar = document.getElementById("btnRenovar");
const contratoMsg = document.getElementById("contratoMsg");

const bloqueActividades = document.getElementById("bloqueActividades");
const actividadesList = document.getElementById("actividadesList");
const a_tipo = document.getElementById("a_tipo");
const a_resultado = document.getElementById("a_resultado");
const a_proxima = document.getElementById("a_proxima");
const a_fecha_prox = document.getElementById("a_fecha_prox");
const a_notas = document.getElementById("a_notas");
const btnAddActividad = document.getElementById("btnAddActividad");
const actividadMsg = document.getElementById("actividadMsg");

// State
let selectedClienteId = null;
let selectedPuntoId = null;

// Helpers
function show(el){ el.classList.remove("hidden"); }
function hide(el){ el.classList.add("hidden"); }

function itemDiv(title, subtitle){
  const d = document.createElement("div");
  d.className = "item";
  d.innerHTML = `<strong>${title}</strong><div class="muted">${subtitle ?? ""}</div>`;
  return d;
}

function isoToday(){
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function addDays(dateIso, days){
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Auth flow
async function refreshSessionUI(){
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if(session){
    hide(loginBox); show(appBox); show(btnLogout);
    await loadClientes();
  } else {
    show(loginBox); hide(appBox); hide(btnLogout);
  }
}

btnLogin.addEventListener("click", async () => {
  loginMsg.textContent = "";
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value
  });
  if(error) loginMsg.textContent = error.message;
  await refreshSessionUI();
});

btnLogout.addEventListener("click", async () => {
  await supabase.auth.signOut();
  selectedClienteId = null;
  selectedPuntoId = null;
  await refreshSessionUI();
});

// Clientes
async function loadClientes(){
  clientesList.innerHTML = "";
  selectedClienteId = null;
  selectedPuntoId = null;

  const term = q.value.trim();
  let query = supabase.from("clientes").select("*").order("nombre");

  if(term){
    query = query.or(`nombre.ilike.%${term}%,telefono.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if(error){
    clientesList.innerHTML = `<div class="muted">Error: ${error.message}</div>`;
    return;
  }

  data.forEach(c => {
    const d = itemDiv(c.nombre, `${c.telefono ?? ""} ${c.email ?? ""}`);
    d.addEventListener("click", () => selectCliente(c));
    clientesList.appendChild(d);
  });
}

btnRefresh.addEventListener("click", loadClientes);
q.addEventListener("keyup", (e)=>{ if(e.key==="Enter") loadClientes(); });

btnAddCliente.addEventListener("click", async () => {
  clienteMsg.textContent = "";
  if(!c_nombre.value.trim()){
    clienteMsg.textContent = "Nombre es obligatorio.";
    return;
  }
  const payload = {
    nombre: c_nombre.value.trim(),
    telefono: c_tel.value.trim() || null,
    email: c_email.value.trim() || null,
    poblacion: c_pob.value.trim() || null
  };
  const { error } = await supabase.from("clientes").insert(payload);
  if(error){
    clienteMsg.textContent = error.message;
    return;
  }
  c_nombre.value = ""; c_tel.value=""; c_email.value=""; c_pob.value="";
  await loadClientes();
});

// Ficha cliente
async function selectCliente(c){
  selectedClienteId = c.id;
  selectedPuntoId = null;

  ficha.innerHTML = `
    <div><strong>${c.nombre}</strong></div>
    <div class="muted">Tel: ${c.telefono ?? "-"} | Email: ${c.email ?? "-"} | Población: ${c.poblacion ?? "-"}</div>
  `;

  show(bloquePuntos);
  show(bloqueContratos);
  show(bloqueActividades);

  k_inicio.value = isoToday();
  k_fin.value = addDays(k_inicio.value, 365);

  await loadPuntos();
  await loadActividades();
  contratosList.innerHTML = `<div class="muted">Selecciona un punto para ver contratos.</div>`;
}

// Puntos
async function loadPuntos(){
  puntosList.innerHTML = "";

  const { data, error } = await supabase
    .from("puntos_suministro")
    .select("*")
    .eq("cliente_id", selectedClienteId)
    .order("created_at", { ascending: false });

  if(error){
    puntosList.innerHTML = `<div class="muted">Error: ${error.message}</div>`;
    return;
  }

  data.forEach(p => {
    const d = itemDiv(p.cups, p.direccion ?? "");
    d.addEventListener("click", () => selectPunto(p));
    puntosList.appendChild(d);
  });
}

btnAddPunto.addEventListener("click", async () => {
  puntoMsg.textContent = "";
  const cups = p_cups.value.trim();
  if(!cups){
    puntoMsg.textContent = "CUPS es obligatorio.";
    return;
  }
  const payload = {
    cliente_id: selectedClienteId,
    cups,
    direccion: p_dir.value.trim() || null,
    poblacion: p_pob.value.trim() || null
  };

  const { error } = await supabase.from("puntos_suministro").insert(payload);
  if(error){
    puntoMsg.textContent = error.message;
    return;
  }
  p_cups.value=""; p_dir.value=""; p_pob.value="";
  await loadPuntos();
});

async function selectPunto(p){
  selectedPuntoId = p.id;
  await loadContratos();
}

// Contratos
async function loadContratos(){
  contratosList.innerHTML = "";

  const { data, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("punto_id", selectedPuntoId)
    .order("fecha_inicio", { ascending: false });

  if(error){
    contratosList.innerHTML = `<div class="muted">Error: ${error.message}</div>`;
    return;
  }

  if(data.length === 0){
    contratosList.innerHTML = `<div class="muted">No hay contratos todavía para este punto.</div>`;
    return;
  }

  data.forEach(k => {
    const title = `${k.compania_actual ?? "-"} | ${k.estado}`;
    const subtitle = `Inicio: ${k.fecha_inicio} | Fin: ${k.fecha_fin} | Tarifa: ${k.tarifa ?? "-"}`;
    const d = itemDiv(title, subtitle);
    contratosList.appendChild(d);
  });

  window.__lastContrato = data[0];
}

btnAddContrato.addEventListener("click", async () => {
  contratoMsg.textContent = "";
  if(!selectedPuntoId){
    contratoMsg.textContent = "Selecciona un punto (CUPS) primero.";
    return;
  }
  if(!k_inicio.value || !k_fin.value){
    contratoMsg.textContent = "Fecha inicio y fin son obligatorias.";
    return;
  }

  const payload = {
    punto_id: selectedPuntoId,
    fecha_inicio: k_inicio.value,
    fecha_fin: k_fin.value,
    tarifa: k_tarifa.value.trim() || null,
    compania_actual: k_comp.value.trim() || null,
    estado: k_estado.value,
    cobrado: !!k_cobrado.checked,
    num_factura: k_factura.value.trim() || null
  };

  const { error } = await supabase.from("contratos").insert(payload);
  if(error){
    contratoMsg.textContent = error.message;
    return;
  }

  await loadContratos();
});

btnRenovar.addEventListen
