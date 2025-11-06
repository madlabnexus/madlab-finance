// MadLab Finance v1 — 100% offline (no server)
const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const state = {
  cfg: {
    das: 0.103,
    inssTeto: 908,
    saude: 3800,
    contador: 500,
    prolabore: 1412,
    reservaMeses: 3
  },
  meses: months.map(_ => ({ faturamento: 0, saldoInicial: 0 }))
};

// --- UI Helpers
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function brl(x){ return (isFinite(x)? x:0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function pct(x){ return isFinite(x)? (x*100).toFixed(1)+'%':'--'; }

// --- Tabs
$$('.tab-btn').forEach(btn=>btn.addEventListener('click', e=>{
  $$('.tab-btn').forEach(b=>b.classList.remove('active'));
  $$('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  $('#'+btn.dataset.tab).classList.add('active');
  renderAll();
}));

// --- Config
function loadConfigToInputs(){
  $('#cfgDas').value = state.cfg.das;
  $('#cfgInssTeto').value = state.cfg.inssTeto;
  $('#cfgSaude').value = state.cfg.saude;
  $('#cfgContador').value = state.cfg.contador;
  $('#cfgProlabore').value = state.cfg.prolabore;
  $('#cfgReservaMeses').value = state.cfg.reservaMeses;
}

$('#btnAplicarCfg').addEventListener('click',()=>{
  state.cfg.das = parseFloat($('#cfgDas').value)||0;
  state.cfg.inssTeto = parseFloat($('#cfgInssTeto').value)||0;
  state.cfg.saude = parseFloat($('#cfgSaude').value)||0;
  state.cfg.contador = parseFloat($('#cfgContador').value)||0;
  state.cfg.prolabore = parseFloat($('#cfgProlabore').value)||0;
  state.cfg.reservaMeses = parseInt($('#cfgReservaMeses').value)||0;
  persist();
  renderAll();
});

// --- Mensal cards
function mountMonths(){
  const host = $('#months');
  host.innerHTML = '';
  state.meses.forEach((m,idx)=>{
    const card = document.createElement('div');
    card.className='month-card';
    card.innerHTML = `
      <h3>${months[idx]}</h3>
      <label>Faturamento (R$)
        <input type="number" step="1" min="0" data-field="faturamento" data-idx="${idx}" value="${m.faturamento}">
      </label>
      <label>Saldo Inicial (R$)
        <input type="number" step="1" min="0" data-field="saldoInicial" data-idx="${idx}" value="${m.saldoInicial}">
      </label>
      <div class="mini" id="mini-${idx}"></div>
    `;
    host.appendChild(card);
  });
  host.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const i = parseInt(e.target.dataset.idx);
      const key = e.target.dataset.field;
      state.meses[i][key] = parseFloat(e.target.value)||0;
      persist();
      renderAll();
    });
  });
}

// --- Core calculations per month
function calcMonth(i){
  const cfg = state.cfg;
  const f = state.meses[i].faturamento||0;
  const saldoIni = state.meses[i].saldoInicial||0;

  const das = f * cfg.das;
  const inssFolha = cfg.prolabore * 0.11;
  const inssComp = Math.max(0, cfg.inssTeto - inssFolha);
  // IRPF simplificado (mesmo método da planilha)
  const B2 = cfg.prolabore;
  let irpf = 0;
  const base = B2 - (B2*0.11);
  if (B2 < 2259.20) irpf = 0;
  else if (B2 < 2826.65) irpf = Math.max(0,(base - 169.44)*0.075);
  else if (B2 < 3751.05) irpf = Math.max(0,(base - 381.44)*0.15);
  else if (B2 < 4664.68) irpf = Math.max(0,(base - 662.77)*0.225);
  else irpf = Math.max(0,(base - 896)*0.275);

  const impostos = das + inssFolha + inssComp + irpf;
  const fixas = cfg.saude + cfg.contador;
  const liquido = f - impostos - fixas;
  const entradas = f;
  const saidas = impostos + fixas;
  const saldoFinal = saldoIni + entradas - saidas;

  // Lucros / reserva
  const reservaNec = (cfg.saude + cfg.contador) * cfg.reservaMeses;
  const lucroDisp = Math.max(0, saldoFinal - reservaNec);
  const recomendado = lucroDisp;

  return { das, inssFolha, inssComp, irpf, impostos, fixas, liquido, saldoFinal, reservaNec, lucroDisp, recomendado, bruto:f };
}

// --- Aggregate + rendering
function renderINSS(){
  const tb = $('#tblInss tbody');
  tb.innerHTML = '';
  let sFolha=0, sComp=0;
  months.forEach((m,idx)=>{
    const c = calcMonth(idx);
    sFolha+=c.inssFolha; sComp+=c.inssComp;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${m}</td>
      <td>${brl(c.inssFolha)}</td>
      <td>${brl(c.inssComp)}</td>
      <td>${brl(c.inssFolha+c.inssComp)}</td>`;
    tb.appendChild(tr);
  });
  $('#sumInssFolha').textContent = brl(sFolha);
  $('#sumInssComp').textContent = brl(sComp);
  $('#sumInssTotal').textContent = brl(sFolha+sComp);
}

function renderResumo(){
  const tb = $('#tblResumo tbody');
  tb.innerHTML = '';
  let sB=0,sI=0,sF=0,sL=0,sS=0;
  months.forEach((m,idx)=>{
    const c = calcMonth(idx);
    sB+=c.bruto; sI+=c.impostos; sF+=c.fixas; sL+=c.liquido; sS+=c.saldoFinal;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${m}</td>
      <td>${brl(c.bruto)}</td><td>${brl(c.impostos)}</td>
      <td>${brl(c.fixas)}</td><td>${brl(c.liquido)}</td>
      <td>${brl(c.saldoFinal)}</td>`;
    tb.appendChild(tr);
  });
  $('#sumBruto').textContent = brl(sB);
  $('#sumImp').textContent = brl(sI);
  $('#sumFix').textContent = brl(sF);
  $('#sumLiq').textContent = brl(sL);
  $('#sumSaldo').textContent = brl(sS);
}

function renderLucros(){
  const tb = $('#tblLucros tbody');
  tb.innerHTML='';
  let sDist = 0;
  months.forEach((m,idx)=>{
    const c = calcMonth(idx);
    sDist += c.recomendado;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${m}</td>
      <td>${brl(c.saldoFinal)}</td>
      <td>${brl(c.reservaNec)}</td>
      <td>${brl(c.lucroDisp)}</td>
      <td>${brl(c.recomendado)}</td>`;
    tb.appendChild(tr);
    // mini preview per month card
    const mini = document.getElementById('mini-'+idx);
    if (mini) mini.innerHTML = `
      <div>Impostos: <b>${brl(c.impostos)}</b></div>
      <div>Fixas: <b>${brl(c.fixas)}</b></div>
      <div>Líquido: <b>${brl(c.liquido)}</b></div>
      <div>Saldo Final: <b>${brl(c.saldoFinal)}</b></div>
      <div>Recomendado distribuir: <b style="color:#9ef39e">${brl(c.recomendado)}</b></div>
    `;
  });
  $('#sumDistribuir').textContent = brl(sDist);
}

function renderKPIs(){
  // base nos 12 meses
  let totalB=0,totalI=0,totalF=0,totalL=0, totalSaldo=0, totalDistrib=0, reservaNec=0;
  months.forEach((_,i)=>{
    const c = calcMonth(i);
    totalB+=c.bruto; totalI+=c.impostos; totalF+=c.fixas; totalL+=c.liquido; totalSaldo+=c.saldoFinal; totalDistrib+=c.recomendado;
    reservaNec = c.reservaNec; // é constante conforme config
  });
  const margem = totalB>0 ? (totalL/totalB) : 0;
  const carga = totalB>0 ? (totalI/totalB) : 0;
  $('#kpiMargem').textContent = pct(margem);
  $('#kpiCarga').textContent = pct(carga);
  $('#kpiReserva').textContent = brl(reservaNec);
  $('#kpiDistribuido').textContent = brl(totalDistrib);
  $('#kpiRetido').textContent = brl(Math.max(0, totalSaldo - reservaNec));
  const mesAtual = new Date().getMonth();
  const rec = calcMonth(mesAtual).recomendado;
  $('#painelDecisao').textContent = `Este mês você pode distribuir: ${brl(rec)} com segurança.`;
}

let ctxLinha=null, ctxBar=null;
function renderCharts(){
  const bruto =[], liquido=[], impostos=[];
  const dist =[];
  months.forEach((_,i)=>{
    const c = calcMonth(i);
    bruto.push(c.bruto); liquido.push(c.liquido); impostos.push(c.impostos);
    dist.push(c.recomendado);
  });
  // Line chart (simple)
  const cnv1 = document.getElementById('chartLinha');
  const cnv2 = document.getElementById('chartBar');
  ctxLinha = cnv1.getContext('2d');
  ctxBar   = cnv2.getContext('2d');
  // clear
  ctxLinha.clearRect(0,0,cnv1.width,cnv1.height);
  ctxBar.clearRect(0,0,cnv2.width,cnv2.height);
  // axes
  function drawLineChart(ctx, series, labels){
    const W=ctx.canvas.width, H=ctx.canvas.height, pad=40;
    const max = Math.max(...series.flat(), 1);
    const sx = (W-2*pad)/(labels.length-1 || 1);
    const sy = (H-2*pad)/max;
    // grid
    ctx.strokeStyle='#241b3f'; ctx.lineWidth=1;
    for(let g=0; g<=5; g++){
      const y = H-pad - g*(H-2*pad)/5;
      ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(W-pad,y); ctx.stroke();
    }
    function drawOne(arr, color){
      ctx.beginPath();
      arr.forEach((v,i)=>{
        const x = pad + i*sx;
        const y = H-pad - v*sy;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.strokeStyle=color; ctx.lineWidth=2; ctx.stroke();
    }
    drawOne(series[0],'#7d3cff'); // bruto
    drawOne(series[1],'#9ef39e'); // liquido
    drawOne(series[2],'#ff7ad9'); // impostos
    // labels
    ctx.fillStyle='#c7b7ff'; ctx.textAlign='center';
    labels.forEach((lb,i)=> ctx.fillText(lb, pad + i*sx, H-10));
  }
  function drawBars(ctx, arr, labels){
    const W=ctx.canvas.width, H=ctx.canvas.height, pad=40;
    const max = Math.max(...arr, 1);
    const bw = (W-2*pad)/arr.length * 0.6;
    const gap = (W-2*pad)/arr.length * 0.4;
    ctx.strokeStyle='#241b3f';
    for(let g=0; g<=5; g++){
      const y = H-pad - g*(H-2*pad)/5;
      ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(W-pad,y); ctx.stroke();
    }
    arr.forEach((v,i)=>{
      const x = pad + i*(bw+gap) + gap/2;
      const h = (H-2*pad) * (v/max);
      ctx.fillStyle = '#a020f0';
      ctx.fillRect(x, H-pad-h, bw, h);
    });
    ctx.fillStyle='#c7b7ff'; ctx.textAlign='center';
    labels.forEach((lb,i)=> ctx.fillText(lb, pad + i*( (W-2*pad)/labels.length ) + ((W-2*pad)/labels.length)/2, H-10));
  }
  drawLineChart(ctxLinha, [bruto, liquido, impostos], months);
  drawBars(ctxBar, dist, months);
}

// --- Persistence
function persist(){
  localStorage.setItem('madlab_finance_v1', JSON.stringify(state));
}
function restore(){
  try{
    const s = localStorage.getItem('madlab_finance_v1');
    if(s){
      const obj = JSON.parse(s);
      if(obj.cfg) state.cfg = Object.assign(state.cfg, obj.cfg);
      if(Array.isArray(obj.meses) && obj.meses.length===12) state.meses = obj.meses;
    }
  }catch(e){}
}

$('#btnSave').addEventListener('click',()=>{
  const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='madlab_finance_data.json'; a.click();
  URL.revokeObjectURL(url);
});
$('#btnLoad').addEventListener('click',()=> $('#fileLoad').click());
$('#fileLoad').addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  const fr = new FileReader();
  fr.onload = ()=>{
    try{
      const obj = JSON.parse(fr.result);
      if(obj.cfg) state.cfg = Object.assign(state.cfg, obj.cfg);
      if(Array.isArray(obj.meses) && obj.meses.length===12) state.meses = obj.meses;
      persist(); loadConfigToInputs(); mountMonths(); renderAll();
    }catch(err){ alert('Arquivo inválido'); }
  };
  fr.readAsText(f);
});
$('#btnReset').addEventListener('click',()=>{
  if(confirm('Zerar todos os dados?')){
    localStorage.removeItem('madlab_finance_v1');
    state.cfg = { das:0.103, inssTeto:908, saude:3800, contador:500, prolabore:1412, reservaMeses:3 };
    state.meses = months.map(_=>({faturamento:0, saldoInicial:0}));
    loadConfigToInputs(); mountMonths(); renderAll();
  }
});

// --- Render all
function renderAll(){
  renderINSS();
  renderResumo();
  renderLucros();
  renderKPIs();
  renderCharts();
  // mini cards updated in renderLucros
}

// init
restore();
loadConfigToInputs();
mountMonths();
renderAll();
