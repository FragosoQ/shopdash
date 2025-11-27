const loader = new THREE.TextureLoader();
const controls = {}
const data = {}

const app = new App({ setup, animate, preload });

window.onload = app.init;
window.onresize = app.handleResize;

// Robust logo opener: attach early so clicks work before GUI exists.
(function setupLogoOpener(){
  let pendingOpen = false;

  function tryOpenGui() {
    try {
      const g = window.appGui;
      if (g && typeof g.open === 'function') {
        try { g.open(); } catch (e) { console.debug('logo opener: gui.open() failed', e); }
        try { const root = g.domElement; if (root) { root.style.display = ''; root.classList.remove('closed'); root.style.zIndex = 2000; } } catch (e) {}
        return true;
      }
    } catch (e) {}

    const root = document.querySelector('.dg');
    if (root) {
      try { root.style.display = ''; root.classList.remove('closed'); root.style.zIndex = 2000; } catch (e) {}
      const title = root.querySelector('.title');
      if (title) {
        try { title.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch (e) {}
      }
      return true;
    }

    return false;
  }

  function flash(el) {
    try {
      if (!el) return;
      const prev = el.style.opacity || '';
      el.style.opacity = '0.6';
      setTimeout(() => { el.style.opacity = prev; }, 160);
    } catch (e) {}
  }

  function onLogoClick(e) {
    const target = (e.target && e.target.closest) ? e.target.closest('#main-logo') : (e.target && e.target.id === 'main-logo' ? e.target : null);
    if (!target) return;
    flash(target);
    if (tryOpenGui()) return;
    // queue open for when gui initializes
    pendingOpen = true;
  }

  document.addEventListener('click', onLogoClick, false);

  // Wrap window.appGui assignment so we can react when it's set
  try {
    const existing = Object.getOwnPropertyDescriptor(window, 'appGui');
    if (!existing || existing.configurable) {
      let _val = window.appGui;
      Object.defineProperty(window, 'appGui', {
        configurable: true,
        enumerable: true,
        get() { return _val; },
        set(v) {
          _val = v;
          if (pendingOpen && _val && typeof _val.open === 'function') {
            try { _val.open(); } catch (e) { console.debug('logo opener: appGui.open() failed', e); }
            try { const root = _val.domElement; if (root) { root.style.display = ''; root.classList.remove('closed'); root.style.zIndex = 2000; } } catch (e) {}
            pendingOpen = false;
          }
          return _val;
        }
      });
    }
  } catch (e) {}
})();


async function preload() {
  try {
    console.log('=== PRELOAD START ===');
    console.log('fetchDestination available?', typeof fetchDestination);
    
    // Fetch destination before connections.js loads
    if (typeof fetchDestination === 'function') {
      window.currentDestination = await fetchDestination();
      console.log('✓ Preloaded destination:', window.currentDestination);
    } else {
      console.warn('⚠ fetchDestination not available, using default');
      window.currentDestination = 'Nigeria';
    }
    
    console.log('=== PRELOAD END - Destination set to:', window.currentDestination, '===');
    return true;
  } catch(error) {
    console.error('❌ Error in preload:', error);
    window.currentDestination = 'Nigeria';
    return true;
  }
}


async function setup(app) {
  // Fetch destination FIRST
  console.log('=== SETUP: Fetching destination ===');
  if (typeof fetchDestination === 'function') {
    window.currentDestination = await fetchDestination();
    console.log('✓ Destination fetched:', window.currentDestination);
    
    // Validate that destination exists in countries data
    const destinationExists = data.countries && data.countries.some(country => 
      country.name.toLowerCase() === window.currentDestination.toLowerCase()
    );
    
    if (!destinationExists) {
      console.warn('⚠ Destination "' + window.currentDestination + '" not found in countries data. Using Nigeria as fallback.');
      console.log('Available countries:', data.countries.map(c => c.name).join(', '));
      window.currentDestination = 'Nigeria';
    }
    
    // Update connections with the validated destination
    if (data.connections) {
      data.connections.Portugal = [window.currentDestination];
      console.log('✓ Updated Portugal connections to:', data.connections.Portugal);
    }
  } else {
    console.warn('⚠ fetchDestination not available');
    window.currentDestination = 'Nigeria';
  }
  
  // POSIÇÕES INICIAIS (Reset)
  const INITIAL_CAMERA_POS_X = -55;
  const INITIAL_CAMERA_POS_Y = 220;
  const INITIAL_CAMERA_POS_Z = 385;
  const INITIAL_CAMERA_ROT_X = THREE.Math.degToRad(20);

  // Calculate rotation to center the midpoint between Portugal and destination
  let INITIAL_GLOBE_ROTATION_Y = THREE.Math.degToRad(-100); // Default
  let INITIAL_GLOBE_ROTATION_X = THREE.Math.degToRad(10);
  
  if (data.countries) {
    const portugal = data.countries.find(c => c.name.toUpperCase() === 'PORTUGAL');
    const destination = data.countries.find(c => c.name.toUpperCase() === window.currentDestination.toUpperCase());
    
    if (portugal && destination) {
      const portugalLon = parseFloat(portugal.longitude);
      const portugalLat = parseFloat(portugal.latitude);
      const destLon = parseFloat(destination.longitude);
      const destLat = parseFloat(destination.latitude);
      
      // Convert to radians for calculation
      const lat1 = portugalLat * Math.PI / 180;
      const lon1 = portugalLon * Math.PI / 180;
      const lat2 = destLat * Math.PI / 180;
      const lon2 = destLon * Math.PI / 180;
      
      // Convert to 3D Cartesian coordinates on unit sphere
      const x1 = Math.cos(lat1) * Math.cos(lon1);
      const y1 = Math.cos(lat1) * Math.sin(lon1);
      const z1 = Math.sin(lat1);
      
      const x2 = Math.cos(lat2) * Math.cos(lon2);
      const y2 = Math.cos(lat2) * Math.sin(lon2);
      const z2 = Math.sin(lat2);
      
      // Calculate midpoint in 3D space
      const xMid = (x1 + x2) / 2;
      const yMid = (y1 + y2) / 2;
      const zMid = (z1 + z2) / 2;
      
      // Convert back to spherical coordinates (lat/lon)
      const midLat = Math.atan2(zMid, Math.sqrt(xMid * xMid + yMid * yMid)) * 180 / Math.PI;
      const midLon = Math.atan2(yMid, xMid) * 180 / Math.PI;
      
      // Rotate globe to bring midpoint to front (facing camera)
      // Y rotation (horizontal): rotate to center the longitude
      INITIAL_GLOBE_ROTATION_Y = THREE.Math.degToRad(-midLon);
      
      // X rotation (vertical tilt): tilt to center the latitude
      INITIAL_GLOBE_ROTATION_X = THREE.Math.degToRad(-midLat);
      
      console.log('✓ Globe rotated to center arc midpoint between Portugal and ' + window.currentDestination);
      console.log('  Portugal:', portugalLat.toFixed(2) + '°N, ' + portugalLon.toFixed(2) + '°E');
      console.log('  Destination:', destLat.toFixed(2) + '°N, ' + destLon.toFixed(2) + '°E');
      console.log('  3D Midpoint:', midLat.toFixed(2) + '°N, ' + midLon.toFixed(2) + '°E');
      console.log('  Globe rotation: Y=' + (-midLon).toFixed(2) + '°, X=' + (-midLat).toFixed(2) + '°');
    } else {
      console.warn('⚠ Could not find Portugal or ' + window.currentDestination + ' for rotation calculation');
    }
  }

  const INITIAL_GLOBE_ROTATION_Z = THREE.Math.degToRad(0);

  const controllers = [];

  app.addControlGui(gui => {
    const colorFolder = gui.addFolder('Colors');
    controllers.push(colorFolder.addColor(config.colors, 'globeDotColor'))
    controllers.push(colorFolder.addColor(config.colors, 'globeMarkerColor'))
    controllers.push(colorFolder.addColor(config.colors, 'globeMarkerGlow'))
    controllers.push(colorFolder.addColor(config.colors, 'globeLines'))
    controllers.push(colorFolder.addColor(config.colors, 'globeLinesDots'))
    
    const sizeFolder = gui.addFolder('Sizes')
    controllers.push(sizeFolder.add(config.sizes, 'globeDotSize', 1, 5))
    controllers.push(sizeFolder.add(config.scale, 'globeScale', 0.1, 1))
    
    const displayFolder = gui.addFolder('Display');
    controllers.push(displayFolder.add(config.display, 'map'))
    controllers.push(displayFolder.add(config.display, 'points'))
    controllers.push(displayFolder.add(config.display, 'markers'))
    controllers.push(displayFolder.add(config.display, 'markerLabel'))
    controllers.push(displayFolder.add(config.display, 'markerPoint'))
    
    const animationsFolder = gui.addFolder('Animations');
    controllers.push(animationsFolder.add(animations, 'rotateGlobe'))

    
    // Start with the GUI collapsed/hidden by default so the header shows "Open controls"
    gui.close();
    // dat.GUI toggles a 'closed' class on the root element when closed — ensure it's present
    if (gui && gui.domElement && !gui.domElement.classList.contains('closed')) {
      gui.domElement.classList.add('closed');
    }

    // Expose gui globally so other handlers can open it later
    try { window.appGui = gui; } catch (e) {}

    // Wire the top-left logo to always open the GUI (do not toggle closed)
    const logo = document.getElementById('main-logo');
    function openGuiFromLogo() {
      // Debug: log click and state so we can trace failures
      try { console.debug('[logo] clicked: openGuiFromLogo()'); } catch (e) {}

      // Prefer direct gui reference if available
      const theGui = window.appGui || gui;
      try { console.debug('[logo] theGui present?', !!theGui); } catch (e) {}

      if (theGui) {
        const guiRoot = theGui.domElement;
        try { console.debug('[logo] guiRoot found?', !!guiRoot); } catch (e) {}
        if (guiRoot) {
          guiRoot.style.display = '';
          guiRoot.classList.remove('closed');
          // Ensure GUI is on top
          try { guiRoot.style.zIndex = 2000; } catch (e) {}
          try { guiRoot.scrollIntoView({ block: 'nearest' }); } catch (e) {}
        }
        try { theGui.open(); } catch (e) { console.debug('[logo] gui.open() failed', e); }
        return;
      }

      // Fallback: try to find the dat.GUI root and remove the closed class
      const fallbackRoot = document.querySelector('.dg');
      try { console.debug('[logo] fallbackRoot found?', !!fallbackRoot); } catch (e) {}
      if (fallbackRoot) {
        fallbackRoot.style.display = '';
        fallbackRoot.classList.remove('closed');
        try { fallbackRoot.style.zIndex = 2000; } catch (e) {}
      }
    }

    if (logo) {
      logo.addEventListener('click', openGuiFromLogo);
    } else {
      // If logo isn't present yet, attach a delegated listener on document
      document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'main-logo') openGuiFromLogo();
      });
    }
  });

  controllers.forEach(controller => {
    controller.onChange((event) => {
      controls.changed = true;
    })
  })

  // Apply initial camera position and rotation
  app.camera.position.set(INITIAL_CAMERA_POS_X, INITIAL_CAMERA_POS_Y, INITIAL_CAMERA_POS_Z);
  app.camera.lookAt(0, 0, 0);
  app.camera.rotateX(INITIAL_CAMERA_ROT_X);
  // Ensure controls target is also the globe center
  if (app.controls) {
    app.controls.target.set(0, 0, 0);
  }
  app.controls.enableDamping = true;
  app.controls.dampingFactor = 0.05;
  app.controls.rotateSpeed = 0.07;

  groups.main = new THREE.Group();
  groups.main.name = 'Main';

  const globe = new Globe();
  groups.main.add(globe);

  // Apply initial globe rotation (static, no animation)
  groups.globe.rotation.x = THREE.Math.degToRad(10);
  groups.globe.rotation.y = THREE.Math.degToRad(-100);
  groups.globe.rotation.z = THREE.Math.degToRad(0);

  const points = new Points(data.grid);
  groups.globe.add(groups.points);

  const markers = new Markers(data.countries);
  groups.globe.add(groups.markers);

  const lines = new Lines();
  groups.globe.add(groups.lines);

  app.scene.add(groups.main);

  // Setup periodic 360° rotation every 5 minutes
  setupPeriodicRotation();
}

// Variáveis globais para controle de efeitos periódicos
let isRotating = false;
let rotationStartTime = 0;
let initialRotationY = 0;
let isPulsing = false;
let pulseStartTime = 0;
let initialPointsScale = 1.0;
let isWaving = false;
let waveStartTime = 0;
const EFFECT_INTERVAL = 25 * 1000; // 25 segundos
const ROTATION_DURATION = 5000; // 5 segundos para completar a volta
const PULSE_DURATION = 2000; // 2 segundos para completar a pulsação
const WAVE_DURATION = 3000; // 3 segundos para completar a ondulação

/**
 * Configura efeitos aleatórios (rotação ou pulsação) a cada 25 segundos
 */
function setupPeriodicRotation() {
  console.log('Setting up periodic random effects (interval: 25s)');
  
  // Função que executa um efeito e agenda o próximo
  function scheduleNextEffect() {
    startRandomEffect();
    setTimeout(scheduleNextEffect, EFFECT_INTERVAL);
  }
  
  // Inicia o primeiro efeito após 25 segundos
  setTimeout(scheduleNextEffect, EFFECT_INTERVAL);
}

function startRandomEffect() {
  // Escolhe aleatoriamente entre rotação, pulsação e ondulação
  const randomValue = Math.random();
  let effect;
  
  if (randomValue < 0.33) {
    effect = 'rotation';
  } else if (randomValue < 0.66) {
    effect = 'pulse';
  } else {
    effect = 'wave';
  }
  
  console.log(`Random effect selected: ${effect} (random: ${randomValue.toFixed(2)})`);
  
  if (effect === 'rotation') {
    startFullRotation();
  } else if (effect === 'pulse') {
    startPointsPulse();
  } else {
    startPointsWave();
  }
}

function startFullRotation() {
  if (isRotating || isPulsing || isWaving) return;
  
  isRotating = true;
  rotationStartTime = Date.now();
  initialRotationY = groups.globe.rotation.y;
  
  console.log('Starting 360° globe rotation');
}

function startPointsPulse() {
  if (isRotating || isPulsing || isWaving) return;
  
  if (!groups.points) {
    console.warn('groups.points not available for heartbeat effect');
    return;
  }
  
  isPulsing = true;
  pulseStartTime = Date.now();
  initialPointsScale = groups.points.scale.x;
  
  console.log('Starting points heartbeat effect');
}

function startPointsWave() {
  if (isRotating || isPulsing || isWaving) return;
  
  if (!elements.globePoints) {
    console.warn('elements.globePoints not available for color transition effect');
    return;
  }
  
  isWaving = true;
  waveStartTime = Date.now();
  
  console.log('Starting points color transition effect');
}


function animate(app) {
  // Lógica de rotação periódica
  if (isRotating) {
    const elapsed = Date.now() - rotationStartTime;
    const progress = Math.min(elapsed / ROTATION_DURATION, 1);
    
    // Rotação completa de 360 graus (2 * PI radianos)
    const rotationAmount = progress * Math.PI * 2;
    groups.globe.rotation.y = initialRotationY + rotationAmount;
    
    // Para quando completar a volta
    if (progress >= 1) {
      groups.globe.rotation.y = initialRotationY;
      isRotating = false;
      console.log('360° rotation complete');
    }
  }

  // Lógica de pulsação dos pontos (simulando batimento cardíaco)
  if (isPulsing && groups.points) {
    const elapsed = Date.now() - pulseStartTime;
    const progress = Math.min(elapsed / PULSE_DURATION, 1);
    
    // Simula batimento cardíaco duplicado: duas sequências de batimento
    // Padrão: BOOM-boom...pause...BOOM-boom...pause...BOOM-boom...pause...BOOM-boom (versão suave)
    let scale = initialPointsScale;
    
    // Primeiro batimento (0% a 50%)
    const firstBeatProgress = (progress % 0.5) * 2; // Normaliza para 0-1
    
    if (firstBeatProgress < 0.3) {
      // Primeira pulsação forte - suave
      const localProgress = firstBeatProgress / 0.3;
      const easeProgress = Math.sin(localProgress * Math.PI);
      scale = initialPointsScale + (easeProgress * 0.15);
    } else if (firstBeatProgress >= 0.4 && firstBeatProgress < 0.6) {
      // Segunda pulsação mais fraca - muito suave
      const localProgress = (firstBeatProgress - 0.4) / 0.2;
      const easeProgress = Math.sin(localProgress * Math.PI);
      scale = initialPointsScale + (easeProgress * 0.08);
    } else {
      // Pausa entre batimentos
      scale = initialPointsScale;
    }
    
    groups.points.scale.set(scale, scale, scale);
    
    // Para quando completar o batimento
    if (progress >= 1) {
      groups.points.scale.set(initialPointsScale, initialPointsScale, initialPointsScale);
      isPulsing = false;
      console.log('Points heartbeat complete');
    }
  }

  // Lógica de transição de cor dos pontos (azul -> branco -> azul)
  if (isWaving && elements.globePoints) {
    const elapsed = Date.now() - waveStartTime;
    const progress = Math.min(elapsed / WAVE_DURATION, 1);
    
    // Função de easing suave (sin wave) para transição ida e volta
    // Vai de 0 -> 1 -> 0
    const colorProgress = Math.sin(progress * Math.PI);
    
    // Cor original (azul) e cor de destino (branco)
    const originalColor = new THREE.Color(config.colors.globeDotColor);
    const targetColor = new THREE.Color(0xffffff); // Branco
    
    // Interpola entre as cores
    const currentColor = originalColor.clone().lerp(targetColor, colorProgress);
    
    // Aplica a cor interpolada
    elements.globePoints.material.color.set(currentColor);
    
    // Para quando completar a transição
    if (progress >= 1) {
      // Restaura cor original
      elements.globePoints.material.color.set(config.colors.globeDotColor);
      isWaving = false;
      console.log('Points color transition complete');
    }
  }

  if(controls.changed) {
    if(elements.globePoints) {
      elements.globePoints.material.size = config.sizes.globeDotSize;
      elements.globePoints.material.color.set(config.colors.globeDotColor);
    }

    if(elements.globe) {
      elements.globe.scale.set(
        config.scale.globeScale, 
        config.scale.globeScale, 
        config.scale.globeScale
      );
    }

    if(elements.lines) {
      for(let i = 0; i < elements.lines.length; i++) {
        const line = elements.lines[i];
        line.material.color.set(config.colors.globeLines);
        
        // Add pulsing effect to the line
        const pulseSpeed = 0.002;
        const minOpacity = 0.3;
        const maxOpacity = 0.8;
        const opacity = minOpacity + (Math.sin(Date.now() * pulseSpeed) + 1) / 2 * (maxOpacity - minOpacity);
        line.material.opacity = opacity;
      }
    }

    groups.map.visible = config.display.map;
    groups.markers.visible = config.display.markers;
    groups.points.visible = config.display.points;
    groups.lines.visible = config.display.lines;

    for(let i = 0; i < elements.markerLabel.length; i++) {
      const label = elements.markerLabel[i];
      label.visible = config.display.markerLabel;
    }

    for(let i = 0; i < elements.markerPoint.length; i++) {
      const point = elements.markerPoint[i];
      point.visible = config.display.markerPoint;
    }

    controls.changed = false
  }



  if(elements.lineDots) {
    for(let i = 0; i < elements.lineDots.length; i++) {
      const dot = elements.lineDots[i];
      dot.material.color.set(config.colors.globeLinesDots);
      dot.animate();
    }
  }

  if(elements.markers) {
    for(let i = 0; i < elements.markers.length; i++) {
      const marker = elements.markers[i];
      marker.point.material.color.set(config.colors.globeMarkerColor);
      if(marker.glow) {
        marker.glow.material.color.set(config.colors.globeMarkerGlow);
      }
      if(marker.label) {
        marker.label.material.map.needsUpdate = true;
      }
      // Ripple animation disabled
      // marker.animateGlow();
    }
  }

  if(animations.rotateGlobe) {
    groups.globe.rotation.y -= 0.0025;
  }
}

// Ensure logo click will open the controls even if GUI initializes later
(function attachGlobalLogoOpener(){
  function flashLogo(el) {
    try {
      if (!el) return;
      const prev = el.style.opacity || '';
      el.style.opacity = '0.6';
      setTimeout(() => { el.style.opacity = prev; }, 180);
    } catch (e) {}
  }

  function openGuiNow() {
    try { console.debug('[global-logo] openGuiNow()'); } catch(e) {}

    // Prefer exposed gui instance
    const g = window.appGui;
    if (g && typeof g.open === 'function') {
      try { g.open(); } catch(e){ console.debug('[global-logo] g.open() failed', e); }
      try { const root = g.domElement; if (root) { root.style.display = ''; root.classList.remove('closed'); root.style.zIndex = 2000; } } catch(e) {}
      return true;
    }

    // Fallback to DOM: find dat.GUI root
    const root = document.querySelector('.dg');
    if (root) {
      try { root.style.display = ''; root.classList.remove('closed'); root.style.zIndex = 2000; } catch(e) {}
      // Try to trigger any internal open() by dispatching clicks on likely controls
      const title = root.querySelector('.title');
      const closeBtn = root.querySelector('.close, .close-button');
      try { if (title) title.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
      try { if (closeBtn) closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch(e) {}
      return true;
    }

    return false;
  }

  function onLogoClick(e) {
    const logoEl = document.getElementById('main-logo');
    flashLogo(logoEl);

    // If our immediate attempt didn't find gui, retry a few times (for late initialization)
    if (openGuiNow()) return;

    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(() => {
      attempts++;
      try { console.debug('[global-logo] retry attempt', attempts); } catch(e) {}
      if (openGuiNow() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 250);
  }

  const logo = document.getElementById('main-logo');
  if (logo) {
    logo.addEventListener('click', onLogoClick);
  } else {
    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'main-logo') onLogoClick(e);
    });
  }
})();