class Lines {
  constructor() {
    // Will be populated after creating the groups so we only cycle through
    // countries that actually have line groups added to `groups.lines`.
    this.countries = [];
    this.total = 0;

    this.group = groups.lines = new THREE.Group();
    this.group.name = 'Lines';

    this.create();
    // After create(), `groups.lines` contains only the groups we added.
    this.countries = groups.lines.children.map(child => child.name);
    this.total = this.countries.length;
    this.animate();
    this.createDots();
  }

  changeCountry() {
    // Don't change country - keep Portugal line always visible
    return;
  }

  createDots() {
    const lineDots = new Dots();
    groups.globe.add(groups.lineDots);
  }

  animate() {
    if(!countries.selected) {
      this.select();
    }

    this.interval = setInterval(
      () => this.changeCountry(), 
      countries.interval
    );
  }

  select() {
    // Always select Portugal
    const portugalGroup = groups.lines.getObjectByName('Portugal');

    if (portugalGroup) {
      countries.selected = portugalGroup;
      countries.selected.visible = true;
      countries.index = this.countries.indexOf('Portugal');
    } else {
      countries.selected = null;
    }
  }

  create() {
    const {connections, countries} = data;

    // Obtém as coordenadas de Portugal uma única vez
    const portugal = getCountry('Portugal', countries);

    for(let origin in connections) {
      // Verifica se a origem é Portugal
      if (origin === 'Portugal') {
        const group = new THREE.Group();
        group.name = origin;

        for(let j in connections[origin]) {
          const endCountryName = connections[origin][j];
          const end = getCountry(endCountryName, countries); // coordenadas do país de destino

          const line = new Line(portugal, end);
          elements.lines.push(line.mesh);
          group.add(line.mesh);
        }

        group.visible = true; // Portugal line always visible
        groups.lines.add(group);
      }
    }
  }
}

class Line {
  constructor(start, end) {
    const {globe} = config.sizes;
    const {markers} = config.scale;

    // Usa as coordenadas de Portugal passadas como start
    this.start = start;
    this.end = end;

    this.radius = globe + globe * markers;

    this.curve = this.createCurve();

    this.geometry = new THREE.Geometry();
    this.geometry.vertices = this.curve.getPoints(200);
    this.material = this.createMaterial();

    this.line = new MeshLine();
    this.line.setGeometry(this.geometry);

    this.mesh = new THREE.Mesh(this.line.geometry, this.material);
    this.mesh._path = this.geometry.vertices;
  }

  createCurve() {
    const {start, end, mid1, mid2} = getSplineFromCoords(
      this.start.latitude,
      this.start.longitude,
      this.end.latitude,
      this.end.longitude,
      this.radius
    );

    return new THREE.CubicBezierCurve3(start, mid1, mid2, end);
  }

  createMaterial() {
    return new MeshLineMaterial({
      color: config.colors.globeLines,
      transparent: true,
      opacity: 0.45
    });
  }
}

/*class Line {
	constructor(start, end) {
		const {globe} = config.sizes;
		const {markers} = config.scale;

		this.start = start;
		this.end = end;
		this.radius = globe + globe * markers;
		
		this.curve = this.createCurve();

		this.geometry = new THREE.Geometry();
		this.geometry.vertices = this.curve.getPoints(200);
		this.material = this.createMaterial();

		this.line = new MeshLine();
		this.line.setGeometry(this.geometry);
		
		this.mesh = new THREE.Mesh(this.line.geometry, this.material);
		this.mesh._path = this.geometry.vertices;
	}

	createCurve() {
		const {start, end, mid1, mid2} = getSplineFromCoords(
			this.start.latitude,
			this.start.longitude,
			this.end.latitude,
			this.end.longitude,
			this.radius
		);

		return new THREE.CubicBezierCurve3(start, mid1, mid2, end)
	}*/