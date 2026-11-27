
(function () {
  'use strict';
  var D = window.__vzData;
  if (!D || window.__vzOn) return;
  
  
  window.__vzOn = 1;

  var html = document.documentElement;
  var BASE = '/thrive/media/voz/', VER = '?v=' + (D.v || 1);
  var MUS_VOL = D.mus || 0.11;
  var EARLY = 0.45;                 
  var NAME_OPTIONAL = true;
  
  var PKEY = 'flourish_prog', PTTL = 30 * 24 * 3600 * 1000;
  var noop = function () {};

  
  var CLIP_AT = { 0: ['n1', 's03'], 1: ['s04'], 6: ['n2'], 9: ['s07'], 15: ['s08'], 18: ['s10'] };
  var ORDEM = ['s01', 's02', 's03', 's04', 's05', 's07', 's08', 's09a', 's10', 's11', 's12', 's14'];
  function proxima(id) { var i = ORDEM.indexOf(id); return i >= 0 ? ORDEM[i + 1] : null; }

  var baseStyle = null, stage = null, loop = null, vids = [], vi = 0, cur = null, mus = null;
  var capEl = null, sndBtn = null;
  var AC = window.AudioContext || window.webkitAudioContext, ctx = null, musGain = null;
  var destravado = false, somOn = true, falando = 0;
  var nameClip = '', nameAsked = '', nameTimer = 0;
  var nomeEstado = 'sem_resposta', nomeT0 = 0;     
  var nomeFalado = false, pontosSemNome = 0;       
  
  var ACEITA_NOME = { s07: 1, s08: 1, s09a: 1, s09b: 1, s09c: 1, s09d: 1, s10: 1 };
  var vzNoName = false, tocadas = {}, PROG = null;
  var seedFrame = null, vslOn = false;       
  var musSrc = null, musWA = false;          
  var EMB_VSL = !/[?&]emb=0(&|$)/.test(location.search);     
  
  var ENTRADA_CLASSICA = window.__vzEntrada === 'classica';
  var carregado = false, mostrado = false, spkEl = null;

  function ev(name, q, a, ms) {
    try { qz(name, { quiz_q: q, quiz_answer: a, quiz_ms: ms }); } catch (e) {}
  }
  function escH(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  
  var CSS = [
    'html.vz{height:100%;background:linear-gradient(rgba(6,4,2,.74),rgba(6,4,2,.74)),url(/thrive/media/thrive/background.jpg) center center/cover fixed #000;overflow:hidden}html.vz body{height:100%;background:transparent;overflow:hidden}',
    
    '#vzSeed{position:fixed;left:0;top:0;width:100%;height:100%;height:100dvh;border:0;z-index:2147483000;opacity:0;visibility:hidden;pointer-events:none;background:#000;transition:opacity .45s ease}',
    'html.vz-vsl #vzSeed{opacity:1;visibility:visible;pointer-events:auto}',
    'html.vz-vsl #vzSnd,html.vz-vsl #vzCap,html.vz-vsl #vzSpk{display:none}',
    'html.vz *{box-sizing:border-box;margin:0;padding:0}',
    'html.vz body{font-family:Georgia,"Times New Roman",serif;color:#fff7e6;-webkit-font-smoothing:antialiased;position:fixed;left:0;right:0;top:var(--vzt,0px);height:var(--vzh,100dvh);width:100%;max-width:430px;margin:0 auto;overscroll-behavior:none}',
    '@keyframes vzglow{0%,100%{box-shadow:0 0 16px rgba(243,195,78,.35)}50%{box-shadow:0 0 34px rgba(243,195,78,.65)}}',
    '@keyframes vzblink{0%,100%{opacity:1}50%{opacity:.6}}',
    '@keyframes vzdot{0%,100%{opacity:.25}50%{opacity:1}}',
    
    '#vzStage{position:absolute;inset:0;z-index:0;overflow:hidden;background:#000 url(' + BASE + 'poster.jpg' + VER + ') center 30%/cover no-repeat}',
    '#vzStage video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;transform-origin:' + D.eyes[0] + '% ' + D.eyes[1] + '%;transition:transform .2s ease-out,opacity .35s ease}',
    '#vzA,#vzB{opacity:0}#vzA.on,#vzB.on{opacity:1}',
    
    '.vz-top{position:absolute;top:0;left:0;right:0;height:180px;z-index:2;pointer-events:none;background:linear-gradient(to bottom,rgba(0,0,0,.82),rgba(0,0,0,.42) 55%,rgba(0,0,0,0));opacity:0;transition:opacity .4s}',
    'html.vz-hud .vz-top{opacity:1}',
    '.vz-bot{position:absolute;left:0;right:0;bottom:0;height:72%;z-index:2;pointer-events:none;background:linear-gradient(to top,rgba(6,4,2,.97) 36%,rgba(6,4,2,.78) 60%,rgba(0,0,0,0));transition:height .3s}',
    'html.vz-gate .vz-bot{height:100%;background:linear-gradient(to top,rgba(6,4,2,.97) 46%,rgba(6,4,2,.66) 70%,rgba(6,4,2,.18))}',
    'html.vz-full .vz-bot{height:100%;background:linear-gradient(to top,rgba(6,4,2,.97) 70%,rgba(6,4,2,.8))}',
    'html.vz.kb-open .vz-bot{height:100%;background:linear-gradient(to top,rgba(6,4,2,.95) 58%,rgba(6,4,2,.5))}',
    
    '#vzCap{position:absolute;left:14px;right:14px;bottom:23%;z-index:31;text-align:center;font-size:21px;line-height:1.28;font-weight:bold;color:#fff;text-shadow:0 2px 6px #000,0 0 14px rgba(0,0,0,.95);pointer-events:none}',
    '#vzCap .nm{color:#f7d873}',
    'html.vz.kb-open #vzCap{display:none}',
    'html.vz-capoff #vzCap{opacity:0}',
    '#vzSnd{position:absolute;right:10px;top:12px;z-index:32;border:none;border-radius:50%;width:38px;height:38px;background:rgba(0,0,0,.55);color:#f3c34e;font-size:17px;cursor:pointer;display:none}',
    'html.vz-live #vzSnd{display:block}',
    '#vzSpk{position:absolute;left:0;right:0;bottom:calc(14px + env(safe-area-inset-bottom));z-index:6;text-align:center;font-size:12.5px;letter-spacing:2px;color:#e2d7b6;text-transform:uppercase;text-shadow:0 2px 6px #000;opacity:0;transition:opacity .3s;pointer-events:none}',
    '#vzSpk i{display:inline-block;width:5px;height:5px;margin-left:3px;border-radius:50%;background:#f3c34e;animation:vzdot 1.2s infinite}#vzSpk i:nth-child(2){animation-delay:.2s}#vzSpk i:nth-child(3){animation-delay:.4s}',
    'html.vz-wait #vzSpk{opacity:1}html.vz-noSpk #vzSpk,html.vz.kb-open #vzSpk{display:none}',
    
    'html.vz .screen{display:none}',
    'html.vz .screen.active{display:flex;flex-direction:column;justify-content:flex-end;position:absolute;inset:0;z-index:5}',
    'html.vz .wrap{width:100%;max-height:78%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 16px calc(16px + env(safe-area-inset-bottom));text-align:center;transition:opacity .4s ease,transform .4s ease}',
    'html.vz-wait .screen.active .wrap{opacity:0;transform:translateY(12px);pointer-events:none;transition:none}',
    'html.vz .logo,html.vz .logo-sm,html.vz .door{display:none}',
    'html.vz .rtag{font-size:13.5px;letter-spacing:3px;color:#f3c34e;font-weight:bold;margin-bottom:8px;text-shadow:0 2px 6px #000}',
    'html.vz .rhead{font-size:22px;line-height:1.22;margin-bottom:8px;text-shadow:0 2px 8px #000}',
    'html.vz .rsub{font-size:17.5px;line-height:1.4;color:#ffe9ab;margin-bottom:10px;text-shadow:0 2px 6px #000}',
    'html.vz .facts{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-bottom:12px}',
    'html.vz .facts span{font-size:14px;color:#cdbd92;border:1px solid rgba(243,195,78,.45);border-radius:30px;padding:4px 10px;background:rgba(20,16,8,.55)}',
    'html.vz .ask{font-size:19px;font-weight:bold;color:#f3c34e;margin-bottom:10px;text-shadow:0 2px 6px #000}',
    'html.vz .cta{font-family:inherit;font-size:20px;font-weight:bold;padding:16px 20px;border:none;border-radius:13px;background:linear-gradient(180deg,#f7d873,#e0a91d);color:#1a1206;cursor:pointer;width:100%;display:block;box-shadow:0 4px 0 #b8911f,0 0 22px rgba(243,195,78,.25)}',
    'html.vz .cta:active{transform:translateY(2px);box-shadow:0 2px 0 #b8911f}',
    'html.vz .cta2{margin-top:10px;background:transparent;color:#f3c34e;border:2px solid #f3c34e;box-shadow:none;font-size:16px;padding:11px}',
    'html.vz .linkbtn{background:none;border:none;padding:10px;margin-top:4px;font-family:inherit;font-size:16px;color:#cdbd92;text-decoration:underline;cursor:pointer}',
    'html.vz .vz-hint{font-size:15px;color:#d8cba7;font-style:italic;margin-top:10px}',
    'html.vz .lead{font-size:18px;line-height:1.35;font-weight:bold;margin-bottom:12px;text-shadow:0 2px 8px #000}',
    'html.vz .lead .big{color:#f3c34e}',
    'html.vz .name-input,html.vz .money-input{width:100%;font-family:inherit;font-size:20px;text-align:center;padding:13px 12px;border:2px solid #f3c34e;border-radius:13px;background:rgba(247,243,234,.97);color:#1a1206;outline:none;margin:0 auto 10px;display:block;font-weight:bold}',
    'html.vz .name-input::placeholder{color:#8a7c55;font-weight:normal}',
    'html.vz .email-input{font-size:18px;font-weight:normal}',
    'html.vz .glowbox{border:2px solid #f3c34e;border-radius:15px;background:rgba(8,6,3,.8);padding:16px 14px;animation:vzglow 2s ease-in-out infinite}',
    'html.vz .glowbox .small{font-size:17px;color:#ffe9ab;margin-bottom:6px}',
    'html.vz .glowbox .phrase{font-size:21px;font-weight:bold;color:#f3c34e;font-style:italic;line-height:1.28;margin:8px 0}',
    'html.vz .glowbox .note{font-size:16px;color:#d8cba7;margin-bottom:12px}',
    'html.vz .emhint{font-size:16px;color:#ffcf9e;margin:-4px auto 10px}html.vz .emhint:empty{display:none}',
    'html.vz .emhint button{background:none;border:none;font:inherit;font-weight:bold;color:#f3c34e;text-decoration:underline;cursor:pointer}',
    'html.vz .emsafe{font-size:14.5px;color:#a89a70;margin-top:10px}',
    
    'html.vz .progress-wrap{position:absolute;top:0;left:0;right:0;width:auto;height:5px;background:rgba(28,22,12,.7);z-index:9}',
    'html.vz .progress-bar{height:100%;width:0;background:#f3c34e;transition:width .35s ease}',
    'html.vz #questionScreen .wrap{max-height:none;height:100%;overflow:visible;display:flex;flex-direction:column;justify-content:flex-end}',
    'html.vz-wait #questionScreen.active .wrap{opacity:1;transform:none;pointer-events:auto}',
    'html.vz .qhead{position:absolute;top:0;left:0;right:0;padding:13px 54px 0;text-align:center;pointer-events:none}',
    'html.vz .hello{font-size:15.5px;font-weight:bold;color:#f3c34e;text-shadow:0 2px 6px #000}',
    'html.vz .bal-label{font-size:11.5px;letter-spacing:2px;color:#cfc3a3;text-transform:uppercase;text-shadow:0 2px 6px #000}',
    'html.vz .bal-value{font-size:26px;font-weight:bold;color:#f3c34e;text-shadow:0 2px 10px #000;animation:vzblink 1.6s ease-in-out infinite}',
    'html.vz .energy{margin:6px -38px 0}',
    'html.vz .energy-row{display:flex;justify-content:space-between;font-size:12.5px;font-style:italic;color:#d8cba7;margin-bottom:3px;text-shadow:0 1px 4px #000}',
    'html.vz .energy-track{height:6px;background:rgba(0,0,0,.55);border-radius:6px;overflow:hidden;border:1px solid rgba(243,195,78,.45)}',
    'html.vz .energy-fill{height:100%;width:0;background:linear-gradient(90deg,#e0a91d,#f7d873);transition:width .5s ease}',
    'html.vz .strip{position:absolute;left:10px;top:112px;flex-direction:column;flex-wrap:wrap;align-content:flex-start;gap:4px;max-height:152px}',
    'html.vz .strip .thumb{width:27px;height:27px;border-radius:7px;border:1px solid #f3c34e;overflow:hidden;box-shadow:0 0 10px rgba(0,0,0,.75)}',
    'html.vz .strip .thumb img{width:100%;height:100%;object-fit:cover;display:block}',
    'html.vz.kb-open .qhead{display:none}',
    'html.vz .qcard{transition:opacity .4s ease,transform .4s ease}',
    
    'html.vz-wait #questionScreen .qcard{opacity:0;transform:translateY(12px);pointer-events:none;transition:none}',
    'html.vz .tag{display:inline-block;font-size:12.5px;letter-spacing:1px;padding:4px 12px;border-radius:30px;background:rgba(0,0,0,.55);color:#e2d7b6;margin-bottom:8px;border:1px solid rgba(243,195,78,.45);text-transform:uppercase}',
    'html.vz .question{font-size:21.5px;line-height:1.28;font-weight:bold;margin-bottom:12px;text-shadow:0 2px 10px #000}',
    'html.vz .options{display:flex;flex-direction:column;gap:8px}',
    'html.vz .opt{font-family:inherit;font-size:18px;font-weight:bold;line-height:1.22;padding:11px 14px;border:none;border-radius:11px;background:linear-gradient(180deg,#f7d873,#e0a91d);color:#1a1206;cursor:pointer;text-align:left;box-shadow:0 3px 0 #b8911f}',
    'html.vz .opt:active{transform:translateY(2px);box-shadow:0 1px 0 #b8911f}',
    
    'html.vz .overlay{display:none;position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.86);align-items:center;justify-content:center;padding:16px;overflow-y:auto}',
    'html.vz .overlay.active{display:flex}',
    'html.vz .modalcard{width:100%;margin:auto;text-align:center;padding:20px 16px 18px;border-radius:18px;background:#070503;border:3px solid #f3c34e;box-shadow:0 0 40px rgba(243,195,78,.5);transition:opacity .4s ease,transform .4s ease}',
    'html.vz .modaltop{font-size:18px;font-weight:bold;color:#f3c34e;margin-bottom:10px}',
    'html.vz .achimg{width:110px;height:110px;margin:0 auto 12px;border-radius:15px;border:3px solid #f3c34e;overflow:hidden}',
    'html.vz .achimg img{width:100%;height:100%;object-fit:cover;display:block}',
    'html.vz .achname{font-size:23px;font-weight:bold;color:#f3c34e;margin-bottom:8px;line-height:1.1}',
    'html.vz .achsub{font-size:17.5px;line-height:1.38;margin-bottom:13px}html.vz .achsub b{color:#ffe9ab}',
    'html.vz .balbox{font-size:18px;font-weight:bold;color:#f3c34e;background:#15110a;border:2px solid #6a5418;border-radius:12px;padding:11px;margin-bottom:13px}',
    'html.vz .insight-lead{font-size:19px;font-weight:bold;color:#f3c34e;line-height:1.25;margin-bottom:10px}',
    'html.vz .verse{font-size:17px;font-style:italic;color:#ffe9ab;line-height:1.35;border-left:4px solid #f3c34e;background:rgba(21,17,10,.8);padding:9px 12px;margin:0 auto 12px;text-align:left}',
    'html.vz .verse span{display:block;font-style:normal;font-size:14px;color:#cdbd92;margin-top:5px;letter-spacing:1px}',
    
    'html.vz .overlay.vz-spoken{background:linear-gradient(to top,rgba(6,4,2,.97) 52%,rgba(6,4,2,.72) 74%,rgba(0,0,0,0));align-items:flex-end;padding-bottom:calc(16px + env(safe-area-inset-bottom))}',
    'html.vz .overlay.vz-spoken .modalcard{margin:0;border-width:2px;box-shadow:0 0 24px rgba(243,195,78,.35);background:rgba(7,5,3,.92);padding:16px 14px}',
    'html.vz-wait .overlay.vz-spoken{background:linear-gradient(to top,rgba(6,4,2,.95) 26%,rgba(6,4,2,.6) 46%,rgba(0,0,0,0) 66%)}',
    'html.vz-wait .overlay.vz-spoken .modalcard{opacity:0;transform:translateY(12px);pointer-events:none;transition:none}',
    
    'html.vz-wait #loading.active .wrap{opacity:1;transform:none}',
    'html.vz .loadwrap h2{font-size:19px;color:#f3c34e;line-height:1.25;margin-bottom:8px;text-shadow:0 2px 10px #000}',
    'html.vz .loadwrap .sub,html.vz #loadPortals,html.vz #loadFoot,html.vz .loadwrap h2[style]{display:none}',
    'html.vz .load-status{font-size:16.5px;font-weight:bold;min-height:20px;margin-bottom:8px;text-shadow:0 2px 6px #000}',
    'html.vz .load-track{height:14px;background:rgba(0,0,0,.6);border-radius:10px;overflow:hidden;border:2px solid rgba(243,195,78,.5)}',
    'html.vz .load-fill{height:100%;width:0;background:linear-gradient(90deg,#e0a91d,#f7d873);transition:width .2s linear}',
    'html.vz .load-pct{font-size:26px;font-weight:bold;color:#f3c34e;margin:8px 0 2px;text-shadow:0 2px 10px #000}',
    'html.vz #loading #vzSpkPad{height:22px}',
    
    'html.vz #previewScreen .wrap{max-height:92%;padding-top:8px}',
    
    'html.vz #previewScreen #pvBtn{position:-webkit-sticky;position:sticky;bottom:calc(6px + env(safe-area-inset-bottom));z-index:3;margin-top:10px;box-shadow:0 4px 0 #b8911f,0 -16px 18px 12px rgba(6,4,2,.97),0 14px 0 12px rgba(6,4,2,.97)}',
    'html.vz .scriptcard{padding:14px 13px 12px;margin:4px auto 10px;border-radius:12px;text-align:left;border:2px solid #f3c34e;background:linear-gradient(180deg,#f8f1de,#efe3c3);color:#2a1d08;box-shadow:0 0 30px rgba(243,195,78,.3)}',
    'html.vz .sc-title{font-size:15px;font-weight:bold;letter-spacing:1px;color:#7a5310;text-align:center}',
    'html.vz .sc-date{font-size:13.5px;color:#8a6a2a;text-align:center;margin:3px 0 8px;font-style:italic}',
    'html.vz .sc-sec{font-size:17.5px;font-weight:bold;color:#6b4508;margin:5px 0 4px}',
    'html.vz .sc-line{font-size:17px;line-height:1.42;margin-bottom:6px}',
    'html.vz .sc-blur{filter:blur(5px);user-select:none;pointer-events:none}',
    'html.vz .sc-lock{margin-top:8px;padding:8px 10px;border-radius:10px;font-size:14.5px;line-height:1.4;background:rgba(42,29,8,.08);border:1px dashed #b28a3a;color:#5a3c0c;text-align:center}',
    'html.vz .pv-focus{margin:0 auto 10px;text-align:left}html.vz .pv-focus:empty{display:none}',
    'html.vz .pv-ftitle{font-size:16.5px;font-weight:bold;color:#f3c34e;margin-bottom:6px;text-align:center}',
    'html.vz .pv-fitem{font-size:16px;line-height:1.38;padding:6px 10px;border-radius:10px;background:rgba(20,16,8,.6);border:1px solid rgba(243,195,78,.3);margin-bottom:5px}',
    'html.vz .pv-fitem b{color:#ffe9ab}'
  ].join('\n');

  
  function monta(escondido) {
    baseStyle = document.querySelector('head style');
    stage = document.createElement('div'); stage.id = 'vzStage';
    stage.innerHTML =
      '<video id="vzLoop" muted loop playsinline webkit-playsinline preload="auto" disablepictureinpicture disableremoteplayback x-webkit-airplay="deny"></video>' +
      '<video id="vzA" playsinline webkit-playsinline preload="auto" disablepictureinpicture disableremoteplayback x-webkit-airplay="deny"></video>' +
      '<video id="vzB" playsinline webkit-playsinline preload="auto" disablepictureinpicture disableremoteplayback x-webkit-airplay="deny"></video>' +
      '<audio id="vzMus" loop preload="none" playsinline></audio>' +     
      '<div class="vz-top"></div><div class="vz-bot"></div>';
    document.body.insertBefore(stage, document.body.firstChild);
    capEl = document.createElement('div'); capEl.id = 'vzCap'; capEl.setAttribute('aria-live', 'off'); document.body.appendChild(capEl);
    sndBtn = document.createElement('button'); sndBtn.id = 'vzSnd'; sndBtn.type = 'button'; sndBtn.setAttribute('aria-label', 'sound'); sndBtn.textContent = '🔊'; document.body.appendChild(sndBtn);
    spkEl = document.createElement('div'); spkEl.id = 'vzSpk'; spkEl.innerHTML = 'Your message is playing<i></i><i></i><i></i>'; document.body.appendChild(spkEl);
    loop = document.getElementById('vzLoop'); vids = [document.getElementById('vzA'), document.getElementById('vzB')];
    mus = document.getElementById('vzMus');
    loop.muted = true;
    sndBtn.onclick = function () { setSom(!somOn); ev('vz_sound', undefined, somOn ? 'on' : 'off'); };
    if (escondido) { [stage, capEl, sndBtn, spkEl].forEach(function (el) { el.style.display = 'none'; }); return; }
    carrega();
    mostra();
  }
  
  function carrega() {
    if (carregado) return;
    carregado = true;
    loop.src = BASE + 'loop.mp4' + VER;
    mus.src = BASE + 'bgm.mp3' + VER;
    prime(vids[0], 's01');
    
    
    
    vids[1].setAttribute('data-id', 'fundo'); vids[1].src = BASE + 'loop.mp4' + VER;
  }
  
  function mostra() {
    if (mostrado) return;
    mostrado = true;
    var st = document.createElement('style'); st.id = 'vzCss'; st.textContent = CSS; document.head.appendChild(st);
    [stage, capEl, sndBtn, spkEl].forEach(function (el) { el.style.display = ''; });
    var dica = document.querySelector('.vz-hint'); if (dica) dica.style.cssText = '';
    if (baseStyle) baseStyle.disabled = true;
    html.classList.add('vz');
    var p = loop.play(); if (p && p.catch) p.catch(noop);      
  }

  
  function ajusta() {
    var vv = window.visualViewport;
    html.style.setProperty('--vzh', (vv ? vv.height : window.innerHeight) + 'px');
    html.style.setProperty('--vzt', (vv ? vv.offsetTop : 0) + 'px');
  }

  
  
  function clipesDoNome(nid) {
    var d = D.nomes[nid];
    if (!d) return [];
    if (nameClip && d.cont && D.clips[d.cont]) { nomeFalado = true; marcaPonto(nid, 'nome'); return [nameClip, d.cont]; }
    pontosSemNome++;
    marcaPonto(nid, vzNoName ? 'sem_nome' : nomeEstado);
    return [d.clip];
  }
  var pontosMarcados = {};
  function marcaPonto(nid, estado) {          
    if (pontosMarcados[nid]) return;
    pontosMarcados[nid] = 1;
    ev('vz_nome_ponto', undefined, nid + ':' + estado, nomeT0 ? Date.now() - nomeT0 : undefined);
  }
  function prime(el, id) {
    if (id && id.charAt(0) === 'n') { var dn = D.nomes[id]; id = dn ? (nameClip && dn.cont && D.clips[dn.cont] ? nameClip : dn.clip) : null; }
    if (!el || !id || !D.clips[id] || el.getAttribute('data-id') === id) return;
    el.setAttribute('data-id', id); el.src = D.clips[id].src || (BASE + id + '.mp4' + VER);
    try { el.load(); } catch (e) {}
  }
  function destrava() {                       
    if (!mostrado) { carrega(); mostra(); }   
    if (destravado) { try { if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (e) {} return; }
    destravado = true;
    try {
      if (AC) {
        
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
        ctx = new AC();
        musGain = ctx.createGain(); musGain.gain.value = 0; musGain.connect(ctx.destination);
        try {   
          var z = ctx.createBufferSource(); z.buffer = ctx.createBuffer(1, 1, 22050); z.connect(ctx.destination); z.start(0);
        } catch (e) {}
        if (ctx.state === 'suspended') ctx.resume();
      }
    } catch (e) { ctx = null; musGain = null; }
    
    
    
    if (ctx && musGain && D.mus2) trilhaWA(); else trilhaElemento();
    
    try {
      var b = vids[1]; b.muted = true;
      var pb = b.play();
      if (pb && pb.then) pb.then(function () { if (cur !== b) { b.pause(); try { b.currentTime = 0; } catch (e) {} } }).catch(noop);
    } catch (e) {}
    var pl = loop.play(); if (pl && pl.catch) pl.catch(noop);
    html.classList.add('vz-live');
  }
  function trilhaElemento() {
    if (vslOn) return;
    musWA = false;
    mus.volume = MUS_VOL;
    var pm = mus.play(); if (pm && pm.catch) pm.catch(noop);
  }
  function trilhaWA() {
    musWA = true;
    fetch(BASE + 'bgm2.mp3' + VER).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (ok, no) { ctx.decodeAudioData(ab, ok, no); }); })
      .then(function (buf) {
        if (vslOn || !ctx) return;
        musSrc = ctx.createBufferSource(); musSrc.buffer = buf; musSrc.loop = true;
        musSrc.loopStart = D.mus2[0]; musSrc.loopEnd = Math.min(D.mus2[1], buf.duration);
        musSrc.connect(musGain); musSrc.start(0, D.mus2[0]);
        musGain.gain.setValueAtTime(0, ctx.currentTime);                  
        musGain.gain.linearRampToValueAtTime(somOn ? MUS_VOL : 0, ctx.currentTime + 1.5);
      }).catch(function () { musGain = null; trilhaElemento(); });       
  }
  function paraTrilha() {
    try { if (musSrc) { musSrc.stop(); musSrc = null; } } catch (e) {}
    try { mus.pause(); } catch (e) {}
  }
  function setSom(on) {
    somOn = !!on;
    vids.forEach(function (v) { v.muted = !somOn; });
    if (musGain) { try { musGain.gain.cancelScheduledValues(ctx.currentTime); } catch (e) {} musGain.gain.value = somOn ? MUS_VOL : 0; }
    mus.muted = !somOn;
    sndBtn.textContent = somOn ? '🔊' : '🔇';
  }
  function espera(on) { html.classList.toggle('vz-wait', !!on); }

  
  function legenda(htmlTxt) { capEl.innerHTML = htmlTxt || ''; }
  function capDe(c, t) {
    var cs = c.caps || [];
    for (var i = 0; i < cs.length; i++) if (t >= cs[i][0] && t < cs[i][1]) return cs[i][2];
    return '';
  }

  
  function acordaLoop() {
    try { if (loop.paused && !document.hidden) { var p = loop.play(); if (p && p.catch) p.catch(noop); } } catch (e) {}
  }

  
  function tocaClipe(id, opt) {
    opt = opt || {};
    return new Promise(function (res) {
      var c = D.clips[id];
      if (!c) { res('nc'); return; }
      var el = vids[vi], outro = vids[1 - vi]; vi = 1 - vi; cur = el;
      var fim = false, t0 = Date.now(), timer = null, raf = 0, ultimo = '', cedo = false, parado = 0, lastT = -1;
      
      function early() { if (!cedo) { cedo = true; if (opt.onEarly) { html.classList.add('vz-capoff'); opt.onEarly(); } } }
      function acaba(why) {
        if (fim) return; fim = true;
        clearTimeout(timer); clearInterval(raf);
        el.onended = el.onerror = null;
        el.classList.remove('on'); legenda('');
        try { el.pause(); } catch (e) {}
        if (cur === el) cur = null;
        acordaLoop();
        early();
        ev('vz_clip', id, id + ':' + why, Date.now() - t0);
        res(why);
      }
      el.onended = function () { acaba('end'); };
      el.onerror = function () { acaba('err'); };
      timer = setTimeout(function () { acaba('timeout'); }, (c.dur + 7) * 1000);
      var T0 = c.t0 || 0;                    
      raf = setInterval(function () {
        var t = (el.currentTime || 0) - T0;
        if (c.t1 && t >= c.t1 - T0) { acaba('end'); return; }
        var txt = capDe(c, t);
        if (txt !== ultimo) { ultimo = txt; legenda(escH(txt)); }
        if (t >= c.dur - (opt.early == null ? EARLY : opt.early)) early();
        
        if (t === lastT && !el.paused) { if (++parado > 75) acaba('stall'); } else { parado = 0; lastT = t; }
      }, 80);
      prime(el, id);
      html.classList.remove('vz-capoff');
      el.muted = !somOn;
      try {
        if (el.readyState > 0) el.currentTime = T0;
        else if (T0) el.addEventListener('loadedmetadata', function pula() {
          el.removeEventListener('loadedmetadata', pula);
          try { if (cur === el) el.currentTime = T0; } catch (e) {}
        });
      } catch (e) {}
      el.classList.add('on');
      var p = el.play();
      if (p && p.catch) p.catch(function () {
        
        el.muted = true;
        var p2 = el.play();
        if (p2 && p2.catch) p2.catch(function () { acaba('blocked'); });
      });
      if (opt.next) prime(outro, opt.next);
    });
  }

  
  function fala(partes, opt) {
    opt = opt || {};
    var minha = ++falando;
    if (!opt.semEspera) espera(true);
    var p = Promise.resolve(), lista = [];
    partes.forEach(function (id) { lista = lista.concat(id.charAt(0) === 'n' ? clipesDoNome(id) : [id]); });
    
    
    if (nameClip && !nomeFalado && pontosSemNome >= 2 && ACEITA_NOME[lista[0]]) { lista.unshift(nameClip); nomeFalado = true; }
    lista.forEach(function (id, i) {
      p = p.then(function () {
        if (minha !== falando) return;
        var ultima = i === lista.length - 1;
        return tocaClipe(id, {
          early: opt.early, next: ultima ? (opt.next || proxima(id)) : lista[i + 1],
          onEarly: ultima ? function () { if (minha === falando && !opt.semEspera) espera(false); } : null
        });
      });
    });
    return p.then(function (r) { if (minha === falando && !opt.semEspera) espera(false); return r; });
  }

  
  function pedeNome(nome) {
    if (!nome || nameAsked === nome) return;
    nameAsked = nome; nameClip = ''; nomeFalado = false; pontosSemNome = 0; clearTimeout(nameTimer);
    var t0 = Date.now(), baixando = false, avisouPend = false, refaz = 0;
    nomeT0 = t0; nomeEstado = 'sem_resposta';
    function estado(e) { if (nomeEstado === e) return; nomeEstado = e; if (e !== 'baixando' && (e !== 'pending' || !avisouPend)) ev('vz_name', undefined, e, Date.now() - t0); if (e === 'pending') avisouPend = true; }
    function pergunta() { return;
      if (nameAsked !== nome) return;
      fetch('/api/quiz-name?n=' + encodeURIComponent(nome)).then(function (r) { return r.json(); }).then(function (j) {
        if (nameAsked !== nome) return;
        if (!j || j.mode !== 'name') { estado('gen:' + String((j && j.how) || '?').slice(0, 24)); return; }
        var v = j.video;
        if (!(v && v.url) && j.render && j.render !== 'pending') {
          estado('render:' + String(j.render).slice(0, 12));
          
          
          if (j.render === 'erro' && refaz < 4 && Date.now() - t0 < 8 * 60000) { refaz++; nameTimer = setTimeout(pergunta, 20000); }
          return;
        }
        if (v && v.url && !baixando) {
          baixando = true; estado('baixando');
          fetch(v.url).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); }).then(function (b) {
            if (nameAsked !== nome || !b.size) return;
            var dur = +(v.t1 - v.t0).toFixed(2);
            D.clips.xnome = { dur: dur, t0: v.t0, t1: v.t1, src: URL.createObjectURL(b), caps: [[0.04, dur, (j.display || nome) + '.']] };
            nameClip = 'xnome';
            Object.keys(D.nomes).forEach(function (n) {      
              var c = D.nomes[n].cont; if (c) try { fetch(BASE + c + '.mp4' + VER, { cache: 'force-cache' }); } catch (e) {}
            });
            nomeEstado = 'pronto'; ev('vz_name', undefined, 'ready', Date.now() - t0);
          }).catch(function () { baixando = false; estado('rede'); if (Date.now() - t0 < 8 * 60000) nameTimer = setTimeout(pergunta, 5000); });
        } else if (j.render === 'pending') {
          estado('pending');
          if (Date.now() - t0 < 8 * 60000) nameTimer = setTimeout(pergunta, Date.now() - t0 < 25000 ? 5000 : 3000); else estado('timeout');
        }
      }).catch(function () { if (nameAsked === nome) estado('rede'); });
    }
    nameTimer = setTimeout(pergunta, 200);
  }

  
  
  function ofertaDoQuiz() {                 
    return { fromQuiz: true, name: vzNoName ? '' : userName, unlocked: unlocked.slice(), balance: balanceValue,
             email: userEmail, answers: answers.slice(), p1: p1Key };
  }
  function preparaVsl() {
    if (seedFrame || !EMB_VSL) return;
    try {
      sessionStorage.setItem('flourish_offer', JSON.stringify(ofertaDoQuiz()));   
      window.__vzEmb = 1;                     
      seedFrame = document.createElement('iframe');
      seedFrame.id = 'vzSeed'; seedFrame.title = 'Your message';
      seedFrame.setAttribute('allow', 'autoplay; fullscreen');
      seedFrame.src = '/thrive/seed/' + window.location.search;
      document.body.appendChild(seedFrame);
    } catch (e) { seedFrame = null; }
  }
  function janelaVsl() {                    
    try { var w = seedFrame && seedFrame.contentWindow; return w && typeof w.__embReady === 'function' ? w : null; } catch (e) { return null; }
  }
  function abencoaVsl() { try { var w = janelaVsl(); if (w) w.__embBless(); } catch (e) {} }
  function mostraVsl() {
    vslOn = true;
    
    try { sessionStorage.setItem('ttf_emb_on', '1'); } catch (e) {}
    html.classList.add('vz-vsl');
    clearTimeout(nameTimer);
    try { vids.forEach(function (v) { v.pause(); }); loop.pause(); } catch (e) {}
    try {                                     
      if (musGain && ctx) { musGain.gain.cancelScheduledValues(ctx.currentTime); musGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15); setTimeout(function () { paraTrilha(); try { ctx.suspend(); } catch (e) {} }, 700); }
      else paraTrilha();
    } catch (e) {}
    try { seedFrame.focus(); } catch (e) {}
  }

  
  function guarda() {
    try {
      localStorage.setItem(PKEY, JSON.stringify({ v: 1, ts: Date.now(), arm: 'voz', name: vzNoName ? '' : userName, noName: vzNoName,
        answers: answers.slice(0, current), unlocked: unlocked.slice(), balance: balanceValue, p1: p1Key, current: current }));
    } catch (e) {}
  }
  function limpaProg() { try { localStorage.removeItem(PKEY); } catch (e) {} }
  function leProg() {
    try {
      var p = JSON.parse(localStorage.getItem(PKEY) || 'null');
      if (p && p.v === 1 && Array.isArray(p.answers) && p.current >= 1 && p.current < questions.length &&
          p.answers.length >= p.current && Date.now() - (p.ts || 0) < PTTL) return p;
    } catch (e) {}
    return null;
  }

  
  function encaixa() {
    var oShow = show;
    show = function (id) {
      oShow(id);
      html.classList.toggle('vz-hud', id === 'questionScreen');
      html.classList.toggle('vz-full', id === 'previewScreen');
      html.classList.toggle('vz-gate', id === 'ready' || id === 'welcomeBack');
      html.classList.toggle('vz-noSpk', id === 'loading');
    };
    var oOpen = openOverlay;
    openOverlay = function (h) { $('overlay').classList.remove('vz-spoken'); oOpen(h); };

    
    var dica = document.createElement('div'); dica.className = 'vz-hint'; dica.textContent = 'Turn your sound on 🔊';
    
    if (!mostrado) dica.style.cssText = 'font-size:15px;font-style:italic;color:#d8cba7;margin-top:10px;text-align:center';
    $('readyBtn').insertAdjacentElement('afterend', dica);
    var oReady = $('readyBtn').onclick;
    $('readyBtn').onclick = function () {
      destrava();
      if (PROG) { retoma(); return; }
      oReady.call(this);
      try { $('nameInput').blur(); } catch (e) {}
      fala(['s01'], { next: 's02' });
    };

    
    var oStart = $('startBtn').onclick;
    $('startBtn').onclick = function () {
      destrava();
      oStart.call(this);
      if ($('entrance').classList.contains('active')) return;       
      vzNoName = false;
      pedeNome(userName);
      fala(['s02'], { next: 'n1' });
    };
    if (NAME_OPTIONAL) {
      var pula = document.createElement('button'); pula.type = 'button'; pula.className = 'linkbtn'; pula.id = 'vzSkip';
      pula.textContent = 'Continue without my name';
      $('startBtn').insertAdjacentElement('afterend', pula);
      pula.addEventListener('mousedown', function (e) { e.preventDefault(); });
      pula.onclick = function () {
        destrava();
        vzNoName = true; userName = 'My child';
        try { $('nameInput').blur(); } catch (e) {}
        $('affName').textContent = 'Before we continue...';
        show('affirmation');
        qz('quiz_start', { quiz_answer: 'no_name' });
        fala(['s02'], { next: 'n1' });
      };
    }

    
    var oRender = renderQuestion;
    renderQuestion = function () {
      oRender();
      if (vzNoName) $('hello').textContent = '✦ Your journey has begun ✦';
      guarda();
      var seq = CLIP_AT[current];
      if (seq && !tocadas[current]) { tocadas[current] = 1; fala(seq); }
    };

    
    var oIns = showInsight;
    showInsight = function (kind, done) {
      oIns(kind, done);
      $('overlay').classList.add('vz-spoken');
      var id = 's05';
      if (kind !== 'revelation') {
        var a = String(answers[16] || '');
        id = /cursed/i.test(a) ? 's09a' : /never been easy/i.test(a) ? 's09b' : /worthy/i.test(a) ? 's09c' : 's09d';
      }
      fala([id], { early: 0.3, next: kind === 'revelation' ? 'n2' : 's10' });
    };

    
    startLoading = function () {
      qz('quiz_loading');
      $('progressBar').style.width = '100%';
      $('loadTitle').textContent = userName + ', your Divine Manifestation Script is being created...';
      show('loading');
      var stages = [[0, 'Starting your Sacred Script...'], [12, 'Writing your Opening Invocation...'], [26, 'Who I Am in God — in your name...'],
        [40, 'Breaking the Blocks...'], [54, 'Opening the Doors — Abundance...'], [68, 'Blessing your Home and Family...'],
        [82, 'The Seed and the Harvest...'], [94, 'Placing the Final Seal...']];
      var fill = $('loadFill'), pctEl = $('loadPct'), st = $('loadStatus');
      function poe(p) {
        for (var i = stages.length - 1; i >= 0; i--) if (p >= stages[i][0]) { st.textContent = stages[i][1]; break; }
        fill.style.width = p + '%'; pctEl.textContent = Math.floor(p) + '%';
      }
      function anda(de, ate, ms) {
        return new Promise(function (ok) {
          var t0 = Date.now(), iv = setInterval(function () {
            var f = Math.min(1, (Date.now() - t0) / ms);
            poe(de + (ate - de) * f);
            if (f >= 1) { clearInterval(iv); ok(); }
          }, 140);
        });
      }
      var d1 = ((D.clips.s11 && D.clips.s11.dur) || 14) * 1000, d2 = Math.max(2600, ((D.clips.s12 && D.clips.s12.dur) || 2.6) * 1000);
      var barra = anda(0, 60, d1);
      fala(['s11'], { semEspera: true, next: 's12' }).then(function (r) {
        
        return r === 'end' ? barra : Promise.race([barra, new Promise(function (ok) { setTimeout(ok, 2500); })]);
      }).then(function () {
        poe(60);
        showCommit(function () {
          Promise.all([anda(60, 100, d2), fala(['s12'], { semEspera: true, next: 'n3' })]).then(function () {
            poe(100);
            st.textContent = 'Your Divine Manifestation Script is ready ✦';
            setTimeout(afterLoading, 800);
          });
        });
        $('overlay').classList.add('vz-spoken');
      });
    };

    
    var oPrev = showPreview;
    showPreview = function () {
      oPrev();
      preparaVsl();
      if (vzNoName) {
        $('pvTitle').textContent = 'YOUR DIVINE MANIFESTATION SCRIPT';
        $('pvL2').textContent = 'I thank You for the breath of this morning, for the light coming through the window, for the life You still entrust to me today.';
        $('pvL4').textContent = 'I declare before heaven and earth who I am in God.';
      }
    };

    
    var oEmail = showEmailStep;
    showEmailStep = function () {
      oEmail();
      try { if (isAppShell()) $('emailInput').blur(); } catch (e) {}
      fala(['n3', 's14'], { early: 0.5 });
    };

    
    var oLead = sendLead;
    sendLead = function () {
      var n = userName;
      if (vzNoName) userName = '';
      try { oLead(); } finally { userName = n; }
    };
    ['previewScreen', 'emailScreen'].forEach(function (id) {
      var tela = $(id); if (!tela) return;
      tela.addEventListener('click', abencoaVsl, true);
      tela.addEventListener('keydown', function (e) { if (e.key === 'Enter') abencoaVsl(); }, true);
    });
    var oGo = gotoOffer;
    gotoOffer = function () {
      limpaProg();
      falando++;
      
      var w = janelaVsl(), motivo = !EMB_VSL ? 'desligado' : !seedFrame ? 'sem_quadro' : !w ? 'nao_carregou' : '';
      try { if (!motivo && !w.__embReady()) motivo = 'nao_pronto'; } catch (e) { motivo = 'erro'; }
      if (!motivo) {
        try {
          
          var oferta = ofertaDoQuiz();
          sessionStorage.setItem('flourish_offer', JSON.stringify(oferta));
          localStorage.setItem('flourish_done', JSON.stringify(Object.assign({ v: 1, ts: Date.now(), answers: answers.slice() }, oferta,
                                                                             vzNoName ? { name: 'My child' } : {})));
          if (w.__embEmail) w.__embEmail(userEmail);
          if (w.__embStart()) { mostraVsl(); ev('vz_vsl', undefined, 'emb'); return; }
          motivo = 'recusou';
        } catch (e) { motivo = 'erro'; }
      }
      ev('vz_vsl', undefined, 'nav:' + motivo);
      try { if (somOn && ctx && ctx.state === 'running') sessionStorage.setItem('ttf_vz_som', '1'); } catch (e) {}
      try { vids.forEach(function (v) { v.pause(); }); paraTrilha(); } catch (e) {}
      if (vzNoName) userName = '';
      oGo();
      
      if (vzNoName) try {
        var d = JSON.parse(localStorage.getItem('flourish_done') || 'null');
        if (d) { d.name = 'My child'; localStorage.setItem('flourish_done', JSON.stringify(d)); }
      } catch (e) {}
    };
    var oRetake = $('wbRetake').onclick;
    $('wbRetake').onclick = function () { limpaProg(); PROG = null; arrumaPorta(); oRetake.call(this); };
    var oWb = $('wbBtn').onclick;
    $('wbBtn').onclick = function () {
      if (savedQuiz && savedQuiz.name === 'My child') vzNoName = true;
      oWb.call(this);
    };
  }

  
  var portaOriginal = null;
  function arrumaPorta() {
    var head = document.querySelector('#ready .rhead'), sub = document.querySelector('#ready .rsub'),
        ask = document.querySelector('#ready .ask'), facts = document.querySelector('#ready .facts'), btn = $('readyBtn');
    if (!portaOriginal) portaOriginal = { h: head.textContent, s: sub.textContent, b: btn.textContent };
    var velho = document.getElementById('vzRestart'); if (velho) velho.remove();
    if (!PROG) {
      head.textContent = portaOriginal.h; sub.textContent = portaOriginal.s; btn.textContent = portaOriginal.b;
      ask.style.display = ''; facts.style.display = '';
      return;
    }
    head.textContent = 'Welcome back' + (PROG.name ? ', ' + PROG.name : '') + '.';
    sub.textContent = 'Your Sacred Test is saved. You stopped at question ' + (PROG.current + 1) + ' of ' + questions.length + '.';
    ask.style.display = 'none'; facts.style.display = 'none';
    btn.textContent = 'CONTINUE MY SACRED TEST';
    var re = document.createElement('button'); re.type = 'button'; re.className = 'linkbtn'; re.id = 'vzRestart'; re.textContent = 'Start again from the beginning';
    var dica = document.querySelector('#ready .vz-hint');
    (dica || btn).insertAdjacentElement('afterend', re);
    re.onclick = function () { limpaProg(); PROG = null; arrumaPorta(); };
  }
  function retoma() {
    var p = PROG; PROG = null;
    vzNoName = !p.name;
    userName = p.name || 'My child';
    answers.length = 0; p.answers.slice(0, p.current).forEach(function (a) { answers.push(a); });
    unlocked.length = 0; (p.unlocked || []).forEach(function (k) { unlocked.push(k); });
    balanceValue = Number(p.balance) || 0; p1Key = p.p1 || '';
    current = p.current;
    if (!vzNoName) pedeNome(userName);
    if (current >= 6) pontosSemNome = 2;     
    qz('quiz_resume', { quiz_q: current + 1 });
    show('questionScreen');
    renderQuestion();
  }

  function falha(e) {
    try { ev('vz_fail', undefined, String(e && e.message || e).slice(0, 80)); } catch (x) {}
    try { if (baseStyle) baseStyle.disabled = false; } catch (x) {}
    html.classList.remove('vz', 'vz-pending', 'vz-gate', 'vz-hud', 'vz-wait', 'vz-full', 'vz-live', 'vz-noSpk', 'vz-capoff');
    ['vzStage', 'vzCap', 'vzSnd', 'vzSpk', 'vzCss', 'vzSeed'].forEach(function (id) { var n = document.getElementById(id); if (n) n.remove(); });
    window.__vzOn = 0;
  }

  function inicia() {
    try {
      if (typeof questions === 'undefined' || typeof renderQuestion !== 'function' || typeof showInsight !== 'function' ||
          typeof startLoading !== 'function' || !$('readyBtn') || !$('startBtn')) throw new Error('pagina diferente');
      ajusta();
      if (window.visualViewport) { visualViewport.addEventListener('resize', ajusta); visualViewport.addEventListener('scroll', ajusta); }
      window.addEventListener('resize', ajusta);
      window.addEventListener('orientationchange', function () { setTimeout(ajusta, 250); });
      var tela = document.querySelector('.screen.active');
      var adia = ENTRADA_CLASSICA && tela && tela.id === 'ready';      
      monta(adia);
      encaixa();
      html.classList.add('vz-gate');
      if (tela && tela.id === 'ready') { PROG = leProg(); arrumaPorta(); }
      if (adia) {                             
        var baixa = function () { setTimeout(function () { try { carrega(); } catch (e) {} }, 1500); };
        if (document.readyState === 'complete') baixa(); else window.addEventListener('load', baixa);
      }
      
      document.addEventListener('visibilitychange', function () {
        if (!destravado || vslOn) return;
        if (document.hidden) { try { if (musWA) { if (ctx) ctx.suspend(); } else mus.pause(); if (cur) cur.pause(); } catch (e) {} }
        else {
          try { if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (e) {}
          if (!musWA) { var a = mus.play(); if (a && a.catch) a.catch(noop); }
          if (cur) { var b = cur.play(); if (b && b.catch) b.catch(noop); }
          var l = loop.play(); if (l && l.catch) l.catch(noop);
        }
      });
      setInterval(function () {               
        if (!destravado || document.hidden || vslOn) return;
        if (!musWA && mus.paused) { var a = mus.play(); if (a && a.catch) a.catch(noop); }
        if (!cur) acordaLoop();
        try { if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (e) {}
      }, 3000);
      html.classList.remove('vz-pending');
      ev('vz_on', undefined, window.__quizArmComo || '');
    } catch (e) { falha(e); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia);
  else inicia();
})();
