import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OBJECTS } from '../content.js';

const HOME = new THREE.Vector3(6, 6.4, 8);
const TARGET = new THREE.Vector3(0, 1.15, 0);

export async function createStudio({ container, onProgress, onSelect, onHover, onReady, onError, state }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-label', 'ห้องทำงานสามมิติ ลากเพื่อหมุน เลื่อนเพื่อซูม หรือเลือกสิ่งของจากรายการ');
  renderer.domElement.tabIndex = 0;
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 3.2, -3.2, .1, 100);
  camera.position.copy(HOME);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = .07;
  controls.enablePan = false;
  controls.minPolarAngle = .35;
  controls.maxPolarAngle = 1.45;
  controls.minZoom = .65;
  controls.maxZoom = 2.6;
  controls.update();

  const hemisphere = new THREE.HemisphereLight('#f5f1ff', '#9b87b2', 1.8);
  scene.add(hemisphere);
  const key = new THREE.DirectionalLight('#fff3df', 3.2);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .1, far: 20 });
  key.shadow.bias = -.0002;
  key.shadow.normalBias = .018;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#d3d7ff', 1.1);
  fill.position.set(4, 4, -1);
  scene.add(fill);
  const lamp = new THREE.PointLight('#ffb46a', .65, 2, 2);
  lamp.position.set(-.43, 1.16, -1.34);
  scene.add(lamp);
  const signGlow = new THREE.PointLight('#ff947c', .4, 2, 2);
  signGlow.position.set(.8, 2.19, -1.75);
  scene.add(signGlow);
  const deskGlow = new THREE.PointLight('#df5fad', .4, 2, 2);
  deskGlow.position.set(1.1, .91, -1.8);
  scene.add(deskGlow);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = new RoomEnvironment();
  const environmentTarget = pmrem.fromScene(environment, .04);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = .6;
  environment.dispose();
  pmrem.dispose();

  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .16 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -.275;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const groups = new Map();
  const pickable = [];
  const materials = [];
  let model;
  let currentState = state;
  let hover = null;
  let selected = null;
  let animationFrame = 0;
  let disposed = false;
  let contextLost = false;
  let lastTime = performance.now();
  let viewTween = null;
  let chairTarget = state.chairTurns * Math.PI * 2;
  let mugBounceStart = -100;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const noteCanvas = document.createElement('canvas');
  noteCanvas.width = 1024;
  noteCanvas.height = 576;
  const context = noteCanvas.getContext('2d');
  const noteTexture = new THREE.CanvasTexture(noteCanvas);
  noteTexture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.985, .55), new THREE.MeshBasicMaterial({ map: noteTexture, toneMapped: false }));
  screen.position.set(.29, 1.26, -1.351);
  screen.visible = false;
  screen.userData.interaction = 'monitors';
  scene.add(screen);
  pickable.push(screen);

  function updateScreen(seconds) {
    context.fillStyle = '#242234';
    context.fillRect(0, 0, 1024, 576);
    context.fillStyle = '#ada0d3';
    context.font = '500 25px sans-serif';
    context.fillText('LITTLE STUDIO  /  YOUR SPACE', 48, 60);
    context.fillStyle = '#4d465e';
    context.fillRect(48, 90, 928, 2);
    if (currentState.screenMode === 'focus') {
      context.textAlign = 'center';
      context.font = '500 148px sans-serif';
      context.fillStyle = '#f2eaff';
      context.fillText(formatTime(seconds), 512, 320);
      context.font = '28px sans-serif';
      context.fillStyle = '#b6a6d8';
      context.fillText(currentState.timer.mode === 'focus' ? 'ONE THING AT A TIME' : 'TAKE A LITTLE BREAK', 512, 395);
      context.textAlign = 'left';
    } else {
      context.font = '600 40px sans-serif';
      context.fillStyle = '#f7efff';
      context.fillText('A thought worth keeping.', 48, 160);
      context.font = '30px sans-serif';
      context.fillStyle = '#d6cbe6';
      const text = currentState.notes || 'Your next great idea starts here…';
      const lines = [];
      let line = '';
      for (const character of Array.from(text)) {
        if (character === '\n' || context.measureText(line + character).width > 910) {
          lines.push(line); line = character === '\n' ? '' : character;
        } else line += character;
        if (lines.length > 6) break;
      }
      lines.push(line);
      lines.slice(0, 7).forEach((textLine, i) => context.fillText(textLine, 48, 218 + i * 43));
    }
    noteTexture.needsUpdate = true;
  }

  function refreshMaterials() {
    for (const entry of materials) {
      const { material, kind, color, emissive, emission, name } = entry;
      material.color.copy(color);
      material.emissive.copy(emissive);
      material.emissiveIntensity = emission;
      if (kind === 'rug' && name.includes('jacquard weave')) {
        const tint = { lavender: [1,1,1], rose: [2.7,1.3,.85], ocean: [.65,3,1.45] }[currentState.rug];
        material.color.setRGB(...tint);
      }
      if (kind === 'art' && !name.includes('Graphite') && !name.includes('paper')) material.color.offsetHSL(currentState.artIndex * .12, 0, 0);
      if (kind === 'lamp' && emission > 0) material.emissiveIntensity = currentState.lampOn ? emission : 0;
      if (kind === 'sign') material.emissiveIntensity = currentState.signOn ? emission : 0;
      if ((kind === hover || kind === selected) && emissive.getHex() === 0) {
        material.emissive.set('#a27bc5');
        material.emissiveIntensity = kind === hover ? .12 : .045;
      }
    }
  }

  function setState(next) {
    currentState = next;
    chairTarget = next.chairTurns * Math.PI * 2;
    const night = next.theme === 'night';
    hemisphere.intensity = night ? .6 : 1.8;
    key.intensity = night ? .55 : 3.2;
    fill.intensity = night ? .8 : 1.1;
    key.color.set(night ? '#a9b4ff' : '#fff3df');
    scene.environmentIntensity = night ? .3 : .6;
    lamp.intensity = next.lampOn ? (night ? 1.4 : .65) : 0;
    signGlow.intensity = next.signOn ? (night ? .75 : .4) : 0;
    deskGlow.intensity = next.computerOn ? (night ? .8 : .4) : 0;
    const monitors = groups.get('monitors');
    if (monitors) monitors.traverse(child => {
      if (child.isMesh && /luminous pastel sky|mountain/.test(child.material.name)) {
        child.visible = next.computerOn && (next.screenMode === 'landscape' || child.material.name.includes('Portrait'));
      }
    });
    screen.visible = next.computerOn && next.screenMode !== 'landscape';
    refreshMaterials();
    updateScreen(remaining(next.timer));
  }

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    const aspect = width / height;
    const vertical = aspect < 1 ? 6.25 / aspect : 6.4;
    camera.left = -vertical * aspect / 2;
    camera.right = vertical * aspect / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickable, false)[0];
    return hit?.object.userData.interaction && hit.object.userData.interaction !== 'room' ? hit.object.userData.interaction : null;
  }
  let down = null;
  const pointers = new Set();
  let hoverTime = 0;
  function pointerDown(event) {
    pointers.add(event.pointerId);
    if (pointers.size === 1) down = { x: event.clientX, y: event.clientY, moved: false };
    else down = null;
    viewTween = null;
  }
  function pointerMove(event) {
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) down.moved = true;
    if (event.pointerType === 'touch' || pointers.size || performance.now() - hoverTime < 45) return;
    hoverTime = performance.now();
    const kind = pick(event);
    if (kind !== hover) { hover = kind; refreshMaterials(); }
    renderer.domElement.style.cursor = kind ? 'pointer' : 'grab';
    const rect = container.getBoundingClientRect();
    onHover(kind, event.clientX - rect.left, event.clientY - rect.top);
  }
  function pointerUp(event) {
    const wasTap = down && !down.moved && pointers.size === 1;
    pointers.delete(event.pointerId);
    if (wasTap) onSelect(pick(event));
    down = null;
  }
  function cancelPointer(event) { pointers.delete(event.pointerId); down = null; }
  function pointerLeave() { hover = null; refreshMaterials(); onHover(null); }
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true; onError(new Error('การแสดงผลสามมิติหยุดชั่วคราว กรุณาโหลดหน้าใหม่'));
  });
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; onError(new Error('กราฟิกพร้อมแล้ว กรุณาโหลดหน้าใหม่เพื่อกลับเข้าห้อง')); });

  try {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/studio.glb`, event => onProgress(event.total ? event.loaded / event.total : Math.min(.9, event.loaded / 5_707_736)));
    if (disposed) return;
    model = gltf.scene;
    model.traverse(node => {
      if (node.userData.interaction) groups.set(node.userData.interaction, node);
    });
    model.traverse(node => {
      if (!node.isMesh) return;
      let parent = node;
      while (parent && !parent.userData.interaction) parent = parent.parent;
      const kind = parent?.userData.interaction || 'room';
      node.userData.interaction = kind;
      node.castShadow = true;
      node.receiveShadow = true;
      node.material = node.material.clone();
      const m = node.material;
      if (m.map) m.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      materials.push({ kind, name: m.name, material: m, color: m.color.clone(), emissive: m.emissive.clone(), emission: m.emissiveIntensity });
      pickable.push(node);
    });
    scene.add(model);
    renderer.shadowMap.needsUpdate = true;
    groups.get('chair').rotation.y = chairTarget;
    groups.get('door').rotation.y = state.doorOpen ? -Math.PI * .42 : 0;
    setState(currentState);
    onProgress(1);
    onReady();
  } catch (error) {
    onError(error);
  }

  function animate(now) {
    if (disposed) return;
    animationFrame = requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    if (document.hidden || contextLost) return;
    if (viewTween) {
      const t = reduceMotion ? 1 : Math.min(1, (now - viewTween.start) / 650);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(viewTween.position, viewTween.toPosition, ease);
      controls.target.lerpVectors(viewTween.target, viewTween.toTarget, ease);
      camera.zoom = THREE.MathUtils.lerp(viewTween.zoom, viewTween.toZoom, ease);
      camera.updateProjectionMatrix();
      if (t === 1) viewTween = null;
    }
    const chair = groups.get('chair');
    if (chair && Math.abs(chair.rotation.y - chairTarget) > .00001) renderer.shadowMap.needsUpdate = true;
    if (chair) chair.rotation.y = reduceMotion ? chairTarget : THREE.MathUtils.damp(chair.rotation.y, chairTarget, 3.5, dt);
    const door = groups.get('door');
    if (door && Math.abs(door.rotation.y - (currentState.doorOpen ? -Math.PI * .42 : 0)) > .00001) renderer.shadowMap.needsUpdate = true;
    if (door) door.rotation.y = reduceMotion ? (currentState.doorOpen ? -Math.PI * .42 : 0) : THREE.MathUtils.damp(door.rotation.y, currentState.doorOpen ? -Math.PI * .42 : 0, 5, dt);
    const mug = groups.get('mug');
    if (mug) {
      const t = (now - mugBounceStart) / 950;
      const height = .8 + (!reduceMotion && t > 0 && t < 1 ? Math.sin(t * Math.PI) * .13 : 0);
      if (Math.abs(mug.position.y - height) > .00001) renderer.shadowMap.needsUpdate = true;
      mug.position.y = height;
    }
    controls.update();
    renderer.render(scene, camera);
    for (const button of container.querySelectorAll('[data-hotspot]')) {
      const anchor = new THREE.Vector3(...OBJECTS[button.dataset.hotspot].anchor).project(camera);
      const rect = container.getBoundingClientRect();
      const visible = anchor.z >= -1 && anchor.z <= 1 && Math.abs(anchor.x) < .96 && Math.abs(anchor.y) < .95;
      button.hidden = !visible;
      if (visible) button.style.transform = `translate(${(anchor.x + 1) / 2 * rect.width}px, ${(-anchor.y + 1) / 2 * rect.height}px)`;
    }
  }
  animationFrame = requestAnimationFrame(animate);

  function moveView(toTarget = TARGET, toZoom = 1) {
    viewTween = { start: performance.now(), position: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom,
      toPosition: HOME.clone().sub(TARGET).add(toTarget), toTarget: toTarget.clone(), toZoom };
  }
  function focus(kind) {
    if (!groups.has(kind)) return;
    const target = new THREE.Box3().setFromObject(groups.get(kind)).getCenter(new THREE.Vector3());
    moveView(target, kind === 'art' ? 1.15 : 1.65);
  }
  return {
    setState,
    setSelected(kind) { selected = kind; refreshMaterials(); },
    resetView: () => moveView(),
    focus,
    zoom(amount) { viewTween = null; camera.zoom = THREE.MathUtils.clamp(camera.zoom + amount, .65, 2.6); camera.updateProjectionMatrix(); },
    bounceMug() { mugBounceStart = performance.now(); },
    updateClock(seconds) { if (currentState.screenMode === 'focus') updateScreen(seconds); },
    project(kind) {
      const p = new THREE.Vector3(...OBJECTS[kind].anchor).project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + (p.x + 1) * r.width / 2, y: r.top + (1 - p.y) * r.height / 2 };
    },
    stats: () => ({ ready: !!model, meshes: pickable.length, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries }),
    dispose() {
      disposed = true; cancelAnimationFrame(animationFrame); observer.disconnect(); controls.dispose();
      const geometries = new Set(), textures = new Set(), mats = new Set();
      scene.traverse(node => { if (node.isMesh) { geometries.add(node.geometry); mats.add(node.material); for (const v of Object.values(node.material)) if (v?.isTexture) textures.add(v); } });
      geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); mats.forEach(m => m.dispose());
      environmentTarget.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}

function remaining(timer) { return timer.deadline === null ? timer.remaining : Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000)); }
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
