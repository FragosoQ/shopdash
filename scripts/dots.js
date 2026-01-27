
class Dots {
	constructor() {
		this.total = config.dots.total;

		groups.lineDots = new THREE.Group();
		groups.lineDots.name = 'LineDots';

		this.create();
	}

	create() {
		for(let i = 0; i < config.dots.total; i++) {
			const dot = new Dot();
			groups.lineDots.add(dot.mesh);
			elements.lineDots.push(dot);
		}
	}
}

class Dot {
	constructor() {
		// Create sprite with image texture instead of sphere
		const textureLoader = new THREE.TextureLoader();
		const texture = textureLoader.load('https://static.wixstatic.com/media/a6967f_034c4bb41e814fc7b03969408024e9a1~mv2.png');
		
		const spriteMaterial = new THREE.SpriteMaterial({
			map: texture,
			transparent: true,
			opacity: 1.0,
			color: 0xffffff, // White color to prevent any tinting
			blending: THREE.NormalBlending
		});
		
		this.mesh = new THREE.Sprite(spriteMaterial);
		this.mesh.scale.set(10, 10, 1); // Square scale to maintain aspect ratio
		this.mesh.visible = false;

		this._path = null;
		this._pathIndex = 0;
	}

	assignToLine() {
		if(countries.selected) {
			const lines = countries.selected.children
			const index = Math.floor(Math.random() * lines.length);
			const line = lines[index];
			this._path = line._path;
		}
	}

	animate() {
		if(!this._path) {
			if(Math.random() > 0.99) {
				this.assignToLine();
				this._pathIndex = 0;
			}
		} else if(this._path && this._pathIndex < this._path.length - 1) {
			if(!this.mesh.visible) {
				this.mesh.visible = true;
			}

			const {x, y, z} = this._path[this._pathIndex];
			this.mesh.position.set(x, y, z);
			this._pathIndex += 2; // Increased from 1 to 2 for double speed
		} else {
			this.mesh.visible = false;
			this._path = null;
		}
	}
}
