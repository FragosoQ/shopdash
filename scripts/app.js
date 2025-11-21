class App {
  constructor({animate, setup, preload}) {
    this.preload = preload;
    this.animate = animate;
    this.setup = setup;
    window.app = this;
  }

  init = async () => {
    this.initScene();
    this.initRenderer();
    this.initCamera();
    this.initControls();
    this.initStats();

    if(this.preload) {
      await this.preload();
    }

    this.render();
    this.update();
  }

  initScene = () => {
    this.scene = new THREE.Scene();
  }

  initRenderer = () => {
    this.renderer = new THREE.WebGLRenderer({alpha: true});
    this.renderer.setClearColor(0x000000, 1.0);
    // Position the canvas so globe center is 500px from left edge
    this.renderer.domElement.style.position = 'relative';
    this.renderer.domElement.style.left = '500px';
    this.renderer.domElement.style.transform = 'translateX(-50%)';
    this.renderer.domElement.style.willChange = 'transform';
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio * 1.5);
    this.renderer.shadowMap.enabled = true;
    this.renderer.antialias = true;
  }

  initCamera = () => {
    this.ratio = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, this.ratio, 0.1, 10000);
    this.camera.lookAt(this.scene.position);
    this.camera.position.set(0, 15, 30);
  }

  initControls = () => {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.autoRotate = animations.rotateGlobe;
    this.controls.autoRotateSpeed = 0.4;
    // Always sync autoRotate to the toggle after any interaction
    const syncAutoRotate = () => {
      this.controls.autoRotate = animations.rotateGlobe;
    };
    this.controls.addEventListener('end', syncAutoRotate);
    this.controls.addEventListener('change', syncAutoRotate);
    this.controls.addEventListener('start', syncAutoRotate);
  }

  initStats = () => {
    this.stats = new Stats();
    this.stats.setMode(0);
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.right = '10px';
    this.stats.domElement.style.bottom = '10px';
    // Instead of appending the live canvas element to the DOM, insert it as an HTML comment
    // so the markup is preserved in the page source but not rendered.
    try {
      const statsEl = this.stats.domElement;
      const comment = document.createComment(statsEl && statsEl.outerHTML ? statsEl.outerHTML : 'stats-canvas');
      document.body.appendChild(comment);
    } catch (e) {
      // fallback to not appending if something goes wrong
    }
  }

  render = () => {
    this.setup(this);
    document.body.appendChild(this.renderer.domElement);
  }

  update = () => {
    this.animate(this);
    this.stats.update();
    // Force OrbitControls autoRotate to match the toggle every frame, and forcibly reset internal state
    if (this.controls) {
      if (animations.rotateGlobe) {
        this.controls.autoRotate = true;
        // Patch: forcibly reset internal state that disables autoRotate after interaction
        if (typeof this.controls._state !== 'undefined') {
          this.controls._state = -1; // disables drag state in some versions
        }
      } else {
        this.controls.autoRotate = false;
      }
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.update);
  }

  addControlGui = callback => {
    var gui = new dat.GUI();
    callback(gui);
  }

  handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}