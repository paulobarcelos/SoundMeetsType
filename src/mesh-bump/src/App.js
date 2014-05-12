define(
[
	'happy/_libs/threejs',

	'happy/app/BaseApp',
	'happy/audio/AudioFile',
	'happy/audio/Node',
	'happy/utils/Network',
	'happy/utils/Vendor',

	'BeatDetector',
	'GlobalGui',
	'MeshAreaSelector',
	'TrackballControls'
],
function (
	THREE,

	BaseApp,
	AudioFile,
	Node,
	Network,
	Vendor,

	BeatDetector,
	GlobalGui,
	MeshAreaSelector,
	TrackballControls
){

	var network = new Network();
	var vendor = new Vendor();
	var transformOriginName = vendor.validateName('transformOrigin', document.body.style);
	var transformName = vendor.validateName('transform', document.body.style);

	var AudioContext = vendor.validateConstructor('AudioContext');

	
	var App = function(){
		var 
		self = this,

		audioContext,
		destination,
		song,
		playback,
		beatDetector,
		
		renderer,
		scene,
		camera,
		controls,
		
		mesh,
		geometry,
		geometryClone,
		verticesDisplacementAmount,
		meshNeedsUpdate,
		materials,		
		meshAreas,
		bassArea,
		mediumArea,
		trebleArea,

		displacementPatterns,
		displacementMap;

		self.setup = function(){
			// Beat detector -------------------------------------
			audioContext = new AudioContext();
			destination = new Node(audioContext.destination);
			song = new AudioFile(audioContext); 
			playback = new AudioFile(audioContext); 			
			
			beatDetector = new BeatDetector(audioContext, destination, 64);
			beatDetector.addFilter('Bass');
			beatDetector.addFilter('Medium');
			beatDetector.addFilter('Treble');
			beatDetector.addFilter('Pierce');

			// Three -------------------------------------
			renderer = new THREE.WebGLRenderer({
				antialias: true, // to get smoother output
				preserveDrawingBuffer: true	// to allow screenshot
			});
			renderer.setClearColor( 0x00000, 1 );
			self.container.appendChild(renderer.domElement);

			scene = new THREE.Scene();

			camera = new THREE.PerspectiveCamera(35, 1, 1, 10000 );
			camera.position.set(0, 0, 5);
			scene.add(camera);
			controls = new THREE.TrackballControls(camera);
						
			materials = {};
			materials['Normal'] = new THREE.MeshNormalMaterial({side: THREE.DoubleSide});
			materials['Wireframe'] =   new THREE.MeshNormalMaterial({side: THREE.DoubleSide, wireframe: true}); 

			

			bassArea = 0;
			mediumArea = 0;
			trebleArea = 0;

			// GUI -------------------------------------
	
			GlobalGui.add('Pierce Modifiers', 'Pierce Power', 1, 0, 20);
			GlobalGui.add('Pierce Modifiers', 'Pierce Multiplier', 1, 0, 20);			
			GlobalGui.add('Audio', 'Playback Gain', 1, 0, 1);
			GlobalGui.addCallback('Playback Gain', function (value) {
				playback.gain = value;
			});			
			GlobalGui.add('Audio', 'Music', 'AlfProysen - Lille Maltrost', {
				'AlfProysen - Lille Maltrost': 'AlfProysen - Lille Maltrost',
				'Bruce-Springsteen-Born-In-The-Usa' : 'Bruce-Springsteen-Born-In-The-Usa',
				'delasoul - The Magic Number' : 'delasoul - The Magic Number',
				'Digable Planets - It’s good to be here' : 'Digable Planets - It’s good to be here',
				'Dr.Dre - StillDRE' : 'Dr.Dre - StillDRE',
				'Everybody Needs Somebody To Love' : 'Everybody Needs Somebody To Love',
				'fools_garden_lemon_tree' : 'fools_garden_lemon_tree',
				'Fugees_-_Ready_Or_Not' : 'Fugees_-_Ready_Or_Not',
				'Guns and Roses - Welcome to the Jungle (2)' : 'Guns and Roses - Welcome to the Jungle (2)',
				'Lionel Richie - Dancing On The Ceiling' : 'Lionel Richie - Dancing On The Ceiling',
				'madonna_likeavirgin' : 'madonna_likeavirgin',
				'Michael_Jackson_Thriller' : 'Michael_Jackson_Thriller',
				'Miriam Makeba - Pata Pata' : 'Miriam Makeba - Pata Pata',
				'nonchalant_5oclock' : 'nonchalant_5oclock',
				'One day you’ll dance for me New York City' : 'One day you’ll dance for me New York City',
				'Paris - The devil made me do it' : 'Paris - The devil made me do it',
				'Phil Collins - In the Air tonight' : 'Phil Collins - In the Air tonight',
				'Prince - Purple Rain' : 'Prince - Purple Rain',
				'Snoop Dog - Gin and Juice ' : 'Snoop Dog - Gin and Juice ',
				'sonicyouth-Pattern Recognition' : 'sonicyouth-Pattern Recognition',
				'Stevie-Wonder-Superstition' : 'Stevie-Wonder-Superstition',
				'thecure-boysdontcry' : 'thecure-boysdontcry',
				'TomWaitz_The Piano Has Been Drinking' : 'TomWaitz_The Piano Has Been Drinking',
				'yolatengo_season_of_the_shark' : 'yolatengo_season_of_the_shark'
			});
			var onMusicChange = function (id) {
				if(id == '-') return;
				loadData(id, onDataLoaded);
			}
			GlobalGui.addCallback('Music', onMusicChange);
			onMusicChange(GlobalGui['Music']);
			var materialsOptions = {};
			var firstMaterial;
			for(var key in materials){
				if(!firstMaterial)firstMaterial = key;
				materialsOptions[key] = key;
			}

			GlobalGui.add('Mesh Setup', 'Mesh Resolution', 50, 1, 100);
			GlobalGui.add('Mesh Setup', 'Ray Modified Areas', 1, 1, 15, 1);
			GlobalGui.add('Mesh Setup', 'Ray Casting Resolution', 50, 1, 100);
			GlobalGui.add('Mesh Setup', 'Ray Casting Size', 1, 0, 3);
			GlobalGui.add('Mesh Setup', 'Recreate Mesh', recreateMesh);

			GlobalGui.add('Mesh Appearance', 'Mesh Material', firstMaterial , materialsOptions);
			GlobalGui.addCallback('Mesh Material', function (id) {
				mesh.material = materials[id];
			});
			GlobalGui.add('Mesh Appearance', 'Reset Mesh', resetMesh);
			GlobalGui.add('Displacement', 'Beat Source', 'Bass' , {
				'Bass' : 'Bass',
				'Medium' : 'Medium',
				'Treble' : 'Treble'
			});
			GlobalGui.add('Displacement', 'Regeneration Strength', 0.001, 0, 0.2);
			var displacementImages = {
				'1.png' : '0',
				'2.png' : '1',
				'3.png' : '2',
				'4.png' : '3',
				'5.png' : '4',
				'6.png' : '5'
			}
			GlobalGui.add('Bass Displacement', 'Bass Beat Power Modifier', 1, 0, 4);
			GlobalGui.add('Bass Displacement', 'Bass Displacement Strength', 0.01, 0, 0.2);
			GlobalGui.add('Bass Displacement', 'Bass Displacement Power Modifier', 1, 0, 4);
			GlobalGui.add('Bass Displacement', 'Bass Displacement Map', '0' , displacementImages);

			GlobalGui.add('Medium Displacement', 'Medium Beat Power Modifier', 1, 0, 4);
			GlobalGui.add('Medium Displacement', 'Medium Displacement Strength', 0.01, 0, 0.2);
			GlobalGui.add('Medium Displacement', 'Medium Displacement Power Modifier', 1, 0, 4);
			GlobalGui.add('Medium Displacement', 'Medium Displacement Map', '2' , displacementImages);

			GlobalGui.add('Treble Displacement', 'Treble Beat Power Modifier', 1, 0, 4);
			GlobalGui.add('Treble Displacement', 'Treble Displacement Strength', 0.01, 0, 0.2);
			GlobalGui.add('Treble Displacement', 'Treble Displacement Power Modifier', 1, 0, 4);
			GlobalGui.add('Treble Displacement', 'Treble Displacement Map', '4' , displacementImages);

			GlobalGui.GUI.toggleHide();

			displacementMap = document.createElement('div');
			self.container.appendChild(displacementMap);
			displacementMap.classList.add('displacement-map');

			recreateMesh();
			
			generateDisplacementPatterns(6)
			.then(function(patterns) {
				displacementPatterns = patterns;
			})
			.catch(function(error) {
				console.error(error);
			})

		}
		var loadData = function(name, callback){
			var songLoaded = false;
			var playbackLoaded = false;
			var ready = function () {
				if(!songLoaded || !playbackLoaded) return;
				if(callback) callback();
			}
			song.load({
				url:  "../../music/" + name + '.mp3',
				onSuccess: function () {
					song.loop = true;
					beatDetector.source = song.sound.root;
					songLoaded = true;
					ready();					
				}
			});
			playback.load({
				url:  "../../music/" + name + '.mp3',
				onSuccess: function () {
					playback.connectSoundRoot(destination);
					playback.loop = true;
					playbackLoaded = true;
					ready();					
				}
			});
		}
		var onDataLoaded = function (data) {
			frame = 0;
			self.update = update;
			song.play();
			playback.play(0.2);
			playback.gain = GlobalGui['Playback Gain'];
		}
		var calculatePierce = function (value) {
			var pierce = Math.pow(value * GlobalGui['Pierce Multiplier'], GlobalGui['Pierce Power']);
			if(pierce > 1) pierce = 1;
			else if(pierce < 0) pierce = 0;
			return pierce
		}
		var generateDisplacementPatterns = function (total) {
			var promises = [];
			for (var i = 0; i < total; i++) {
				promises[i] = getDisplacementPattern(i+1);			
			};
			return Promise.all(promises);
		}
		var getDisplacementPattern = function (index) {
			return new Promise(function (resolve, reject) {
				var canvas = document.createElement('canvas');
				var context = canvas.getContext('2d');
				canvas.classList.add('displacement-pattern');
				canvas.classList.add('displacement-pattern-'+index);
				var image = document.createElement('img');
				image.onload = function () {
					var w = image.width
					var h =  image.height;
					canvas.width = w;
					canvas.height = h;
					canvas.style.width = w + 'px';
					canvas.style.height = h + 'px';
					context.drawImage(image, 0, 0, w, h);
					var pixels = context.getImageData(0, 0, w, h); 
					var data = [];
					for (var i=0; i < pixels.data.length;i+=4) {
						var index = i / 4;
						var x = index % w;
						var y = Math.floor(index/ w) ;
						if(!data[x]) data[x] = [];
						data[x][y] = pixels.data[i] / 255;
					}
					resolve({
						canvas: canvas,
						context: context,
						data: data

					});
				}
				image.onerror = reject;
				image.src = 'displacement/'+index+'.png';
			});
			
		}
		var generateMeshAreas = function (total) {
			var selector = new MeshAreaSelector(mesh, GlobalGui['Ray Casting Resolution'], GlobalGui['Ray Casting Size']);
			var promises = [];
			for (var x = 0; x < total; x++) {
				for (var y = 0; y < total; y++) {
					promises.push(selector.requestSelection(new THREE.Vector3(Math.random()*1.5 - 0.75,Math.random()*1.5 - 0.75, 2)));
				}	
			};
			return Promise.all(promises);
		}
		var displaceArea = function (displacement, area, strength) {
			displacementMap.innerHTML = '';
			displacementMap.appendChild(displacement.canvas);

			for (var x = 0; x < area.vertices.length; x++) {
				var xNorm = x / area.vertices.length;
				var xTex = Math.round(xNorm * displacement.data.length);
				for (var y = 0; y < area.vertices[x].length; y++) {
					var yNorm = y / area.vertices[x].length;
					var yTex = Math.round(yNorm * displacement.data[xTex].length);

					var direction = area.directions[x][y];
					for (var i = 0; i < area.vertices[x][y].length; i++) {	
						var vertexId = area.vertices[x][y][i];
						var vertex = geometry.vertices[vertexId];
						var originalVertex = geometryClone.vertices[vertexId];
						var distance = vertex.distanceTo(originalVertex) / 10;
						verticesDisplacementAmount[vertexId] = distance;

						var muliplier = (displacement.data[xTex][yTex] * strength) * (1-distance);
						vertex.add(direction.clone().multiplyScalar(muliplier))
					}
				}
			}	
			meshNeedsUpdate = true;
		}
		var regenerateMesh = function (strength) {
			for (var i = 0; i < geometry.vertices.length; i++) {
				if(verticesDisplacementAmount[i] < 0.001) continue;

				var vertex = geometry.vertices[i];
				var originalVertex = geometryClone.vertices[i];

				var diff = originalVertex.clone().sub(vertex).multiplyScalar(strength);
			
				vertex.add(diff)
				var distance = vertex.distanceTo(originalVertex) / 4;
				verticesDisplacementAmount[i] = distance;
			};
			meshNeedsUpdate = true;
		}
		var resetMesh = function () {
			for (var i = 0; i < geometry.vertices.length; i++) {
				geometry.vertices[i] = geometryClone.vertices[i].clone();
				verticesDisplacementAmount[i] = 0;
			};
			meshNeedsUpdate = true;

		}
		var recreateMesh = function () {
			if(geometry) geometry.dispose();

			var resolution = Math.round(GlobalGui['Mesh Resolution']);
			geometry = new THREE.PlaneGeometry( 2, 2, resolution , resolution );

			geometry.dynamic = true;
			geometryClone = geometry.clone();
			
			verticesDisplacementAmount = [];
			for (var i = 0; i < geometry.vertices.length; i++) {
				verticesDisplacementAmount[i] = 0;
			};
			

			if(mesh) scene.remove(mesh);
			mesh = new THREE.Mesh( geometry, materials[GlobalGui['Mesh Material']] );
			
			scene.add(mesh);


			meshAreas = null;
			generateMeshAreas(GlobalGui['Ray Modified Areas']).then(function (areas) {
				meshAreas = areas;
			})

		}
		var updateMesh = function() {
			if(!meshNeedsUpdate) return;
			meshNeedsUpdate = false;
			geometry.verticesNeedUpdate = true;
			geometry.elementsNeedUpdate = true;
			geometry.morphTargetsNeedUpdate = true;
			geometry.uvsNeedUpdate = true;
			geometry.normalsNeedUpdate = true;
			geometry.colorsNeedUpdate = true;
			geometry.tangentsNeedUpdate = true;
			geometry.computeFaceNormals();
			geometry.computeCentroids()
			geometry.computeFaceNormals()
			geometry.computeVertexNormals()
			geometry.computeMorphNormals()
		}
		var update = function(dt, time) {
			var bass = beatDetector.getFilter('Bass').beat;
			var medium = beatDetector.getFilter('Medium').beat;
			var treble = beatDetector.getFilter('Treble').beat;
			//var pierce = calculatePierce(beatDetector.getFilter('Pierce').average);

			if(meshAreas){
				if(bass < 0.2) bassArea = Math.floor(Math.random()*meshAreas.length);
				if(medium < 0.2) mediumArea = Math.floor(Math.random()*meshAreas.length);
				if(treble < 0.2) trebleArea = Math.floor(Math.random()*meshAreas.length);
			}
	
			if(displacementPatterns && meshAreas ){
				var bassStrenght  = Math.pow(bass, GlobalGui['Bass Beat Power Modifier']) * GlobalGui['Bass Displacement Strength'];
				bassStrenght =  Math.pow(bassStrenght, GlobalGui['Bass Displacement Power Modifier']);
				displaceArea(displacementPatterns[GlobalGui['Bass Displacement Map']], meshAreas[bassArea], bassStrenght);

				var mediumStrenght  = Math.pow(medium, GlobalGui['Medium Beat Power Modifier']) * GlobalGui['Medium Displacement Strength'];
				mediumStrenght =  Math.pow(mediumStrenght, GlobalGui['Medium Displacement Power Modifier']);
				displaceArea(displacementPatterns[GlobalGui['Medium Displacement Map']], meshAreas[mediumArea], mediumStrenght);

				var trebleStrenght  = Math.pow(treble, GlobalGui['Treble Beat Power Modifier']) * GlobalGui['Treble Displacement Strength'];
				trebleStrenght =  Math.pow(trebleStrenght, GlobalGui['Treble Displacement Power Modifier']);
				displaceArea(displacementPatterns[GlobalGui['Treble Displacement Map']], meshAreas[trebleArea], trebleStrenght);
			}

			regenerateMesh(GlobalGui['Regeneration Strength'])

			updateMesh();

			controls.update();
		}
		self.draw = function () {
			renderer.render(scene, camera);
			camera.updateProjectionMatrix();
		}
		self.onResize = function(size) {
			renderer.setSize(size.width, size.height);
			camera.aspect = size.width/ size.height;
			camera.updateProjectionMatrix();
		}
	}
	App.prototype = new BaseApp();
	return App;
});