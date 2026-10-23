import './style.css';
import { createStore, remainingSeconds, toggleTimer, DURATIONS } from './state/store.js';
import { OBJECTS, HOTSPOTS, BOOKS } from './content.js';
import { icon } from './icons.js';
import { createStudio } from './render/studio.js';

let storage;
try { storage = window.localStorage; } catch { /* The room still works without browser storage. */ }
const store = createStore(storage);
let studio;
let selection = null;
let ready = false;
let toastTimeout;
let lastFocusedObject;
let lastSecond = -1;
let disposed = false;

const app = document.querySelector('#app');
app.innerHTML = `
  <header class="header">
    <a class="brand" href="./" aria-label="Little Studio หน้าหลัก"><span class="brand-icon">${icon('cube')}</span><span>little<span class="brand-serif">studio</span><span class="brand-dot">.</span></span></a>
    <span class="header-caption">A SMALL SPACE. ENDLESS POSSIBILITIES.</span>
    <div class="header-actions"><button class="theme-button" data-action="theme" aria-label="เปลี่ยนเป็นโหมดกลางคืน">${icon('sun')}<span data-theme-label>Daylight</span></button><button class="icon-button" data-action="help" aria-label="วิธีใช้งาน">${icon('help')}</button></div>
  </header>
  <main class="main">
    <aside class="intro" aria-label="ยินดีต้อนรับ">
      <div class="eyebrow"><span class="tiny-line"></span> YOUR INTERACTIVE CORNER</div>
      <h1>ห้องเล็ก ๆ<span>ไอเดีย<span class="accent">ใหญ่ ๆ</span></span></h1>
      <p class="intro-description">พื้นที่สงบที่ขยับได้ตามใจคุณ<br>ลองแตะสิ่งของ แล้วทำให้ห้องนี้<br>เป็นพื้นที่ของคุณเอง</p>
      <div class="intro-rule"></div>
      <button class="text-button explore-button" data-action="objects" aria-expanded="false">สำรวจสิ่งของ <span class="count">11</span>${icon('arrow')}</button>
      <div class="focus-widget">
        <div class="focus-title"><span class="status-dot"></span> A MOMENT OF FOCUS</div>
        <div class="focus-row"><span class="clock" data-clock>25:00</span><button class="round-button" data-action="timer" aria-label="เริ่มจับเวลาโฟกัส">${icon('play')}</button></div>
        <span class="focus-caption" data-focus-caption>ทีละอย่าง ในเวลาของคุณ</span>
      </div>
      <div class="intro-bottom"><span class="small-star">✳</span><p>Made for a little pause.<br><span>อยู่กับสิ่งตรงหน้า สักครู่หนึ่ง</span></p></div>
    </aside>
    <section id="viewport" class="viewport" aria-label="สำรวจห้องสามมิติ">
      <div class="scene-caption"><span class="scene-number">01</span><span>THE DEVELOPER'S ROOM<span class="scene-subtitle">A place to make things happen.</span></span></div>
      <div class="scene-badge"><span class="status-dot"></span><span data-scene-status>กำลังจัดห้อง</span></div>
      <div class="hotspots" aria-label="จุดโต้ตอบในห้อง">${HOTSPOTS.map(id => `<button class="hotspot" data-hotspot="${id}" data-object="${id}" aria-label="สำรวจ${OBJECTS[id].name}" disabled><span class="hotspot-dot"></span><span class="hotspot-label">${OBJECTS[id].name}</span></button>`).join('')}</div>
      <div id="tooltip" class="tooltip" role="status" hidden></div>
      <div id="loading" class="loading"><div class="loading-cube">${icon('cube')}</div><p>กำลังจัดมุมโปรดให้คุณ</p><span class="loading-detail" data-progress-text>เตรียมห้องสามมิติ…</span><div class="progress-track"><span id="progress-bar"></span></div></div>
      <div id="scene-error" class="scene-error" hidden><img loading="lazy" src="${import.meta.env.BASE_URL}studio-preview.png" alt="ภาพห้องทำงานต้นฉบับ" /><div><strong>ยังเปิดห้องสามมิติไม่ได้</strong><p data-error-message></p><button class="primary-button" data-action="reload">ลองใหม่ ${icon('rotate')}</button></div></div>
      <div class="scene-controls" aria-label="ควบคุมมุมมอง">
        <button class="control-button" data-action="home" aria-label="กลับมุมมองเริ่มต้น" title="มุมมองเริ่มต้น (H)">${icon('home')}</button><span class="control-divider"></span>
        <button class="control-button" data-action="zoom-out" aria-label="ซูมออก">${icon('minus')}</button><button class="control-button" data-action="zoom-in" aria-label="ซูมเข้า">${icon('plus')}</button><span class="control-divider"></span>
        <button class="control-button active" data-action="hotspots" aria-label="ซ่อนจุดโต้ตอบ" aria-pressed="true" title="จุดโต้ตอบ">${icon('target')}</button><button class="control-button" data-action="fullscreen" aria-label="เต็มหน้าจอ">${icon('expand')}</button>
      </div>
      <div class="drag-hint">${icon('hand')}<span>ลากเพื่อหมุน <span class="hint-dot">·</span> เลื่อนเพื่อซูม</span></div>
    </section>
    <section id="object-panel" class="object-panel" aria-labelledby="panel-title" hidden></section>
    <section id="object-menu" class="object-menu" aria-labelledby="menu-title" hidden>
      <div class="drawer-heading"><div><span class="eyebrow">A ROOM FULL OF LITTLE THINGS</span><h2 id="menu-title">เริ่มจากสิ่งไหนดี?</h2></div><button class="icon-button" data-action="close-menu" aria-label="ปิดรายการสิ่งของ">${icon('close')}</button></div>
      <div class="object-grid">${Object.entries(OBJECTS).map(([id,item]) => `<button data-object="${id}" class="object-option" disabled>${icon(item.icon)}<span>${item.name}</span>${icon('arrow')}</button>`).join('')}</div>
      <p class="menu-note">เลือกได้จากรายการ หรือแตะสิ่งของในห้องโดยตรง</p>
    </section>
  </main>
  <footer class="footer"><span><span class="footer-dot"></span> DESIGNED TO FEEL AT HOME</span><span class="footer-right">VITE + THREE.JS <span class="footer-separator">/</span> INTERACTIVE EDITION</span></footer>
  <dialog id="help-dialog" aria-labelledby="help-title"><button class="icon-button dialog-close" data-action="close-help" aria-label="ปิดวิธีใช้">${icon('close')}</button><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2 id="help-title">ห้องนี้ใช้งานยังไง?</h2><p>แตะสิ่งของหรือจุดสีม่วงเพื่อเปิดเครื่องมือของแต่ละชิ้น</p><dl><div><dt>หมุนห้อง</dt><dd>ลากเมาส์ / ลากด้วยนิ้วเดียว</dd></div><div><dt>ซูม</dt><dd>เลื่อนเมาส์ / จีบนิ้วสองนิ้ว</dd></div><div><dt>กลับมุมเดิม</dt><dd>H หรือปุ่มรูปบ้าน</dd></div><div><dt>เปิด–ปิดโคมไฟ</dt><dd>L</dd></div><div><dt>กลางวัน / กลางคืน</dt><dd>N</dd></div><div><dt>จับเวลาโฟกัส</dt><dd>Space</dd></div><div><dt>ปิดเครื่องมือ</dt><dd>Escape</dd></div></dl><p class="privacy-note">โน้ต การตั้งค่า และเวลาโฟกัสเก็บไว้ในเบราว์เซอร์เครื่องนี้ ไม่ต้องสมัครสมาชิก</p><button class="primary-button" data-action="close-help">ลองเล่นกัน ${icon('arrow')}</button></dialog>
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
`;

const panel = document.querySelector('#object-panel');
const menu = document.querySelector('#object-menu');
const viewport = document.querySelector('#viewport');
const help = document.querySelector('#help-dialog');
const tooltip = document.querySelector('#tooltip');

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message; element.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { element.hidden = true; }, 3200);
}
function button(action, label, symbol = 'arrow', className = 'primary-button') {
  return `<button class="${className}" data-action="${action}"><span>${label}</span>${icon(symbol)}</button>`;
}
function notesPanel() {
  return `<div class="segmented" aria-label="เนื้อหาบนจอ"><button data-screen="landscape">วิวภูเขา</button><button data-screen="notes">โน้ต</button><button data-screen="focus">เวลาโฟกัส</button></div><label class="field-label" for="studio-note">ไอเดียของคุณ</label><textarea id="studio-note" placeholder="วันนี้อยากสร้างอะไร?" maxlength="5000" rows="5"></textarea><div class="note-meta"><span id="save-status">บันทึกในเครื่องอัตโนมัติ</span><span data-note-count>0 / 5000</span></div>`;
}
function timerPanel() {
  return `<div class="segmented"><button data-timer-mode="focus">โฟกัส 25 นาที</button><button data-timer-mode="break">พัก 5 นาที</button></div><div class="panel-timer" data-clock>25:00</div>${button('timer', 'เริ่มโฟกัส', 'play')}${button('timer-reset', 'เริ่มเวลาใหม่', 'rotate', 'secondary-button')}`;
}
function selectObject(id, focusPanel = false) {
  if (!ready) return;
  if (!id || !OBJECTS[id]) { closePanel(); return; }
  selection = id;
  studio?.setSelected(id);
  menu.hidden = true;
  document.querySelector('[data-action="objects"]').setAttribute('aria-expanded', 'false');
  const item = OBJECTS[id];
  const content = {
    monitors: notesPanel,
    desk: notesPanel,
    lamp: () => `<div class="detail-illustration light-illustration">${icon('lamp')}<span class="light-halo"></span></div>${button('lamp','ปิดโคมไฟ','lamp')}<p class="panel-footnote">ลองเปิดโหมดกลางคืน เพื่อเห็นแสงอุ่นได้ชัดขึ้น</p>`,
    chair: () => `<div class="detail-illustration chair-illustration">${icon('chair')}<span class="orbit-ring"></span></div>${button('spin','หมุนเก้าอี้สักรอบ','rotate')}<p class="panel-footnote">บางครั้งไอเดียดี ๆ ก็เริ่มจากการพัก</p>`,
    door: () => `<div class="detail-illustration">${icon('door')}</div>${button('door','เปิดประตู','door')}<p class="panel-footnote">ประตูเปิดเข้าด้านใน หมุนห้องเพื่อดูอีกมุมได้</p>`,
    rug: () => `<div class="rug-sample" data-rug-sample><span></span></div><div class="swatches" aria-label="เลือกสีพรม">${[['lavender','ลาเวนเดอร์','#ab8fd6'],['rose','โรส','#d99bb3'],['ocean','โอเชียน','#80b6d0']].map(([value,label,color]) => `<button class="swatch" data-rug="${value}" aria-label="พรมสี${label}" style="--swatch:${color}"><span></span><small>${label}</small></button>`).join('')}</div><p class="panel-footnote">เก็บลายทอและขอบเย็บไว้ในทุกเฉดสี</p>`,
    computer: () => `<div class="detail-illustration">${icon('power')}</div>${button('computer','ปิดเครื่อง','power')}<p class="panel-footnote">ปิดหน้าจอแล้วพักสายตา โน้ตยังอยู่เหมือนเดิม</p>`,
    mug: timerPanel,
    books: () => `<div class="reading-list">${BOOKS.map(book => `<div class="reading-item"><button class="book-check" data-book="${book.id}" aria-label="ทำเครื่องหมายอ่าน ${book.name} แล้ว" aria-pressed="false">${icon('check')}</button><a href="${book.url}" target="_blank" rel="noopener noreferrer"><strong>${book.name}</strong><span>${book.label}</span></a>${icon('arrow')}</div>`).join('')}</div><p class="panel-footnote" data-reading-count>อ่านแล้ว 0 จาก 3 เล่ม</p>`,
    art: () => `<div class="art-preview"><i></i><i></i><i></i></div><div class="segmented">${['Original','Daydream','After hours'].map((name,i) => `<button data-art="${i}">${name}</button>`).join('')}</div><p class="panel-footnote">เปลี่ยนพาเลตของภาพทุกกรอบพร้อมกัน</p>`,
    sign: () => `<div class="neon-preview">LeonBleriot</div>${button('sign','ปิดป้ายไฟ','sparkles')}`,
  }[id]();
  panel.innerHTML = `<div class="panel-heading"><span class="panel-object-icon">${icon(item.icon)}</span><div class="panel-heading-actions"><button class="icon-button" data-action="focus-object" aria-label="มอง${item.name}ใกล้ ๆ">${icon('target')}</button><button class="icon-button" data-action="close-panel" aria-label="ปิดเครื่องมือ">${icon('close')}</button></div></div><span class="eyebrow">${item.tag}</span><h2 id="panel-title">${item.name}</h2><span class="panel-english">${item.english}</span><p class="panel-description">${item.description}</p><div class="panel-content">${content}</div>`;
  panel.hidden = false;
  viewport.classList.add('has-selection');
  const textarea = document.querySelector('#studio-note');
  if (textarea) textarea.value = store.get().notes;
  refresh(store.get());
  if (focusPanel) panel.querySelector('button')?.focus({ preventScroll: true });
}
function closePanel() {
  selection = null; panel.hidden = true; studio?.setSelected(null); viewport.classList.remove('has-selection');
  lastFocusedObject?.focus({ preventScroll: true });
}
function refresh(state) {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('[data-theme-label]').textContent = state.theme === 'day' ? 'Daylight' : 'After hours';
  const themeButton = document.querySelector('[data-action="theme"]');
  themeButton.querySelector('svg').outerHTML = icon(state.theme === 'day' ? 'sun' : 'moon');
  themeButton.setAttribute('aria-label', state.theme === 'day' ? 'เปลี่ยนเป็นโหมดกลางคืน' : 'เปลี่ยนเป็นโหมดกลางวัน');
  for (const [action,on,onLabel,offLabel] of [
    ['lamp',state.lampOn,'ปิดโคมไฟ','เปิดโคมไฟ'], ['sign',state.signOn,'ปิดป้ายไฟ','เปิดป้ายไฟ'],
    ['computer',state.computerOn,'ปิดเครื่อง','เปิดเครื่อง'], ['door',state.doorOpen,'ปิดประตู','เปิดประตู'],
  ]) {
    const element = panel.querySelector(`[data-action="${action}"]`);
    if (element) { element.querySelector('span').textContent = on ? onLabel : offLabel; element.setAttribute('aria-pressed', String(on)); }
  }
  for (const element of document.querySelectorAll('[data-screen]')) {
    const active = element.dataset.screen === state.screenMode; element.classList.toggle('active',active); element.setAttribute('aria-pressed',String(active));
  }
  for (const element of document.querySelectorAll('[data-rug]')) {
    const active = element.dataset.rug === state.rug; element.classList.toggle('active',active); element.setAttribute('aria-pressed',String(active));
  }
  const rugSample = document.querySelector('[data-rug-sample]');
  if (rugSample) rugSample.dataset.color = state.rug;
  for (const element of document.querySelectorAll('[data-art]')) {
    const active = Number(element.dataset.art) === state.artIndex; element.classList.toggle('active',active); element.setAttribute('aria-pressed',String(active));
  }
  const art = document.querySelector('.art-preview');
  if (art) art.style.filter = `hue-rotate(${state.artIndex * 43}deg)`;
  const neon = document.querySelector('.neon-preview');
  if (neon) neon.classList.toggle('unlit',!state.signOn);
  const count = document.querySelector('[data-note-count]');
  if (count) count.textContent = `${state.notes.length} / 5000`;
  for (const element of document.querySelectorAll('[data-book]')) element.setAttribute('aria-pressed',String(state.readBooks.includes(element.dataset.book)));
  const readingCount = document.querySelector('[data-reading-count]');
  if (readingCount) readingCount.textContent = `อ่านแล้ว ${state.readBooks.length} จาก 3 เล่ม`;
  updateClock();
  studio?.setState(state);
}
function updateClock() {
  const { timer } = store.get();
  const seconds = remainingSeconds(timer);
  const formatted = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
  document.querySelectorAll('[data-clock]').forEach(element => { element.textContent = formatted; });
  document.querySelector('[data-focus-caption]').textContent = timer.deadline ? (timer.mode === 'focus' ? 'อยู่กับสิ่งตรงหน้า คุณทำได้' : 'หายใจลึก ๆ แล้วค่อยเริ่มใหม่') : 'ทีละอย่าง ในเวลาของคุณ';
  for (const element of document.querySelectorAll('[data-action="timer"]')) {
    const label = timer.deadline ? 'หยุดพักเวลา' : seconds === 0 ? 'เริ่มอีกครั้ง' : timer.mode === 'focus' ? 'เริ่มโฟกัส' : 'เริ่มเวลาพัก';
    element.setAttribute('aria-label',label);
    const span = element.querySelector('span'); if (span) span.textContent = label;
    const svg = element.querySelector('svg'); if (svg) svg.outerHTML = icon(timer.deadline ? 'pause' : 'play');
  }
  for (const element of document.querySelectorAll('[data-timer-mode]')) {
    const active = element.dataset.timerMode === timer.mode; element.classList.toggle('active',active); element.setAttribute('aria-pressed',String(active));
  }
  studio?.updateClock(seconds);
}
function changeTimerMode(mode) {
  store.set({ timer: { mode, remaining: DURATIONS[mode], deadline: null }, screenMode: 'focus' });
}
function act(action) {
  const state = store.get();
  switch (action) {
    case 'theme': store.set({ theme: state.theme === 'day' ? 'night' : 'day' }); break;
    case 'lamp': store.set({ lampOn: !state.lampOn }); break;
    case 'sign': store.set({ signOn: !state.signOn }); break;
    case 'computer': store.set({ computerOn: !state.computerOn }); break;
    case 'door': store.set({ doorOpen: !state.doorOpen }); break;
    case 'spin': store.set({ chairTurns: state.chairTurns + 1 }); break;
    case 'timer': store.set({ timer: toggleTimer(state.timer), screenMode: 'focus' }); studio?.bounceMug(); break;
    case 'timer-reset': changeTimerMode(state.timer.mode); break;
    case 'home': studio?.resetView(); break;
    case 'focus-object': studio?.focus(selection); break;
    case 'zoom-in': studio?.zoom(.2); break;
    case 'zoom-out': studio?.zoom(-.2); break;
    case 'close-panel': closePanel(); break;
    case 'objects': menu.hidden = !menu.hidden; panel.hidden = true; document.querySelector('[data-action="objects"]').setAttribute('aria-expanded',String(!menu.hidden)); if (!menu.hidden) menu.querySelector('button')?.focus({ preventScroll: true }); break;
    case 'close-menu': menu.hidden = true; document.querySelector('[data-action="objects"]').setAttribute('aria-expanded','false'); document.querySelector('[data-action="objects"]').focus(); break;
    case 'hotspots': {
      const element = document.querySelector('[data-action="hotspots"]');
      const active = element.getAttribute('aria-pressed') !== 'true';
      element.setAttribute('aria-pressed',String(active)); element.setAttribute('aria-label', active ? 'ซ่อนจุดโต้ตอบ' : 'แสดงจุดโต้ตอบ'); element.classList.toggle('active',active); viewport.classList.toggle('hide-hotspots',!active); break;
    }
    case 'help': help.showModal(); break;
    case 'close-help': help.close(); break;
    case 'fullscreen':
      if (!document.fullscreenEnabled) { toast('เบราว์เซอร์นี้ไม่รองรับโหมดเต็มหน้าจอ'); break; }
      (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => toast('ยังเปิดโหมดเต็มหน้าจอไม่ได้')); break;
    case 'reload': window.location.reload(); break;
  }
}

document.addEventListener('click', event => {
  const element = event.target.closest('button'); if (!element || element.disabled) return;
  if (element.dataset.object) { lastFocusedObject = element; selectObject(element.dataset.object,true); }
  else if (element.dataset.action) act(element.dataset.action);
  else if (element.dataset.rug) store.set({ rug: element.dataset.rug });
  else if (element.dataset.screen) { store.set({ screenMode: element.dataset.screen }); if (!store.get().computerOn) toast('คอมพิวเตอร์ปิดอยู่ เปิดเครื่องเพื่อแสดงบนจอ'); }
  else if (element.dataset.timerMode) changeTimerMode(element.dataset.timerMode);
  else if (element.dataset.art) store.set({ artIndex: Number(element.dataset.art) });
  else if (element.dataset.book) {
    const id = element.dataset.book, read = store.get().readBooks;
    store.set({ readBooks: read.includes(id) ? read.filter(value => value !== id) : [...read,id] });
  }
});
document.addEventListener('input', event => {
  if (event.target.id !== 'studio-note') return;
  store.set({ notes: event.target.value, screenMode: 'notes' });
  const status = document.querySelector('#save-status');
  status.textContent = store.persistent && storage ? 'บันทึกแล้วในเครื่องนี้' : 'ใช้งานได้ในหน้านี้ แต่เบราว์เซอร์ไม่อนุญาตให้บันทึก';
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { menu.hidden = true; closePanel(); return; }
  if (help.open || event.ctrlKey || event.metaKey || event.altKey || event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
  const action = { h: 'home', l: 'lamp', n: 'theme' }[event.key.toLowerCase()];
  if (action) { event.preventDefault(); act(action); }
  if (event.code === 'Space' && !event.target.closest('button,a')) { event.preventDefault(); act('timer'); }
});
help.addEventListener('click', event => { if (event.target === help && (event.offsetX < 0 || event.offsetX > help.clientWidth || event.offsetY < 0 || event.offsetY > help.clientHeight)) help.close(); });
store.subscribe(refresh);
refresh(store.get());

function showError(error) {
  console.error('Studio:',error);
  document.querySelector('#loading').hidden = true;
  document.querySelector('#scene-error').hidden = false;
  document.querySelector('[data-error-message]').textContent = error.message?.includes('WebGL') ? 'อุปกรณ์นี้ยังเปิด WebGL ไม่ได้ ลองใช้เบราว์เซอร์ที่รองรับการแสดงผลสามมิติ' : 'โหลดห้องไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง';
  document.querySelector('[data-scene-status]').textContent = 'โหมดภาพตัวอย่าง';
}
try {
  studio = await createStudio({
    container: viewport, state: store.get(),
    onProgress(progress) { document.querySelector('#progress-bar').style.width = `${Math.round(progress * 100)}%`; document.querySelector('[data-progress-text]').textContent = `กำลังนำสิ่งของเข้าห้อง ${Math.round(progress * 100)}%`; },
    onSelect: selectObject,
    onHover(id,x,y) {
      if (!id) { tooltip.hidden = true; return; }
      tooltip.textContent = OBJECTS[id].name;
      tooltip.hidden = false;
      tooltip.style.left = `${Math.max(8,Math.min(viewport.clientWidth - 160,x + 15))}px`;
      tooltip.style.top = `${Math.max(8,Math.min(viewport.clientHeight - 40,y - 30))}px`;
    },
    onReady() {
      ready = true; document.querySelector('#loading').hidden = true; viewport.classList.add('is-ready');
      document.querySelector('[data-scene-status]').textContent = 'LIVE · แตะเพื่อสำรวจ';
      document.querySelectorAll('[data-object]').forEach(element => { element.disabled = false; });
    },
    onError: showError,
  });
  studio?.setState(store.get());
} catch (error) { showError(error); }

const timerInterval = setInterval(() => {
  if (disposed) return;
  const state = store.get();
  const seconds = remainingSeconds(state.timer);
  if (state.timer.deadline !== null && seconds === 0) {
    store.set({ timer: { ...state.timer, remaining: 0, deadline: null } });
    toast(state.timer.mode === 'focus' ? 'ครบเวลาโฟกัสแล้ว ให้ตัวเองพักสัก 5 นาทีนะ' : 'พักเต็มที่แล้ว พร้อมเริ่มไอเดียใหม่หรือยัง?');
  }
  if (seconds !== lastSecond) { lastSecond = seconds; updateClock(); }
}, 250);
document.addEventListener('visibilitychange', updateClock);
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  disposed = true; clearInterval(timerInterval); clearTimeout(toastTimeout); studio?.dispose();
}, { once: true });
// Small inspection surface for browser verification; UI behaviour uses the store above.
window.__studio = { getState: store.get, getStats: () => studio?.stats(), project: id => studio?.project(id), isReady: () => ready };
