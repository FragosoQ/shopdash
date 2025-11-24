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
    // const gridUrl = '../assets/data/grid.json';
    // const gridRes = await fetch(gridUrl);
    // const grid = await gridRes.json();
    // data.grid = grid;

    // const countryUrl = '../assets/data/countries.json';
    // const countryRes = await fetch(countryUrl);
    // const countries = await countryRes.json();
    // data.countries = countries;

    // const connectionsUrl = '../assets/data/connections.json';
    // const connectionsRes = await fetch(connectionsUrl);
    // const connections = await connectionsRes.json();
    // data.connections = getCountries(connections, countries);    

    return true;
  } catch(error) {
    console.log(error);
  }
}


function setup(app) {
  // POSIÇÕES INICIAIS (Reset)
  const INITIAL_CAMERA_POS_X = -55;
  const INITIAL_CAMERA_POS_Y = 220;
  const INITIAL_CAMERA_POS_Z = 385;
  const INITIAL_CAMERA_ROT_X = THREE.Math.degToRad(20);

  const INITIAL_GLOBE_ROTATION_X = THREE.Math.degToRad(10);
  const INITIAL_GLOBE_ROTATION_Y = THREE.Math.degToRad(-100);
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

  // Apply initial globe rotation
  groups.globe.rotation.x = INITIAL_GLOBE_ROTATION_X;
  groups.globe.rotation.y = INITIAL_GLOBE_ROTATION_Y;
  groups.globe.rotation.z = INITIAL_GLOBE_ROTATION_Z;

  const points = new Points(data.grid);
  groups.globe.add(groups.points);

  const markers = new Markers(data.countries);
  groups.globe.add(groups.markers);

  const lines = new Lines();
  groups.globe.add(groups.lines);

  app.scene.add(groups.main);
}


function animate(app) {
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