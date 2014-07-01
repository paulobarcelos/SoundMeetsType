define(
[
	'fonts/typeface.js',

	'happy/_libs/threejs',

	'happy/app/BaseApp',
	'happy/audio/AudioFile',
	'happy/audio/Node',
	'happy/utils/Network',
	'happy/utils/Vendor',

	'TessellateModifier',
	'SubdivisionModifier',

	'BeatDetector',
	'GlobalGui',
	'MeshAreaSelector',
	'TrackballControls',
	'STLSaver',
	'CanvasSaver',

	'fonts/skeletal_1200.typeface.js',
	'fonts/skeletal_1100.typeface.js',
	'fonts/skeletal_1000.typeface.js',
	'fonts/skeletal_900.typeface.js',
	'fonts/skeletal_800.typeface.js',
	'fonts/skeletal_700.typeface.js',
	'fonts/skeletal_600.typeface.js',
	'fonts/skeletal_500.typeface.js',
	'fonts/skeletal_400.typeface.js',
	'fonts/skeletal_300.typeface.js',
	'fonts/skeletal_200.typeface.js',
	'fonts/skeletal_100.typeface.js',

	'canvas2blob'
],
function (
	__typeface, 

	THREE,

	BaseApp,
	AudioFile,
	Node,
	Network,
	Vendor,

	TessellateModifier,
	SubdivisionModifier,

	BeatDetector,
	GlobalGui,
	MeshAreaSelector,
	TrackballControls,
	STLSaver,
	CanvasSaver,

	__skeletal_1200,
	__skeletal_1100,
	__skeletal_1000,
	__skeletal_900,
	__skeletal_800,
	__skeletal_700,
	__skeletal_600,
	__skeletal_500,
	__skeletal_400,
	__skeletal_300,
	__skeletal_200,
	__skeletal_100,

	__canvas2blob


){
	var network = new Network();
	var vendor = new Vendor();
	var transformOriginName = vendor.validateName('transformOrigin', document.body.style);
	var transformName = vendor.validateName('transform', document.body.style);

	var AudioContext = vendor.validateConstructor('AudioContext');
	var getUserMedia = vendor.validateMethod('getUserMedia', navigator);

	var stlSaver = new STLSaver();
	var canvasSaver = new CanvasSaver();

	
	var App = function(){
		var 
		self = this,

		audioContext,
		destination,
		audioForAnalysis,
		audioForPlayback,
		gain,
		microphone,
		beatDetector,

		
		renderer,
		scene,
		camera,
		controls,
		screenSize,
		tessellateModifier,
		subdivisionModifier,
		
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
			// Saving
			GlobalGui.add('Advanced', 'Save STL', function(){
				stlSaver.save(geometry, 'STL ' + new Date());
			});
			GlobalGui.add('Advanced', 'Save Image', saveImage);
			var doingSave=false;
			window.onkeypress = function (argument) {
				console.log(argument.keyIdentifier )
				if(doingSave) return;

				if(argument.keyIdentifier != "U+0020") return; // W
				saveImage();
			}
			function saveImage(){
				doingSave =true;
				var loadingNode = document.createElement('div');
				loadingNode.id = 'loading';
				loadingNode.classList.add('printing');
				document.body.appendChild(loadingNode);

				/*var onResize = self.onResize;
				self.onResize = function(){}
				var lastScreenSize = screenSize;
				var dimension = 1000;
				onResize({
					width: dimension,
					height: dimension
				})
				setTimeout(function(){*/
					canvasSaver.save(renderer.domElement, 'Canvas ' + new Date());
					setTimeout(function(){
						document.body.removeChild(loadingNode);
						doingSave =false;
					}, 15000)
				/*}, 500)*/
				
			}
			// Beat detector -------------------------------------
			audioContext = new AudioContext();
			destination = new Node(audioContext.destination);
			gain = new Node(audioContext.createGainNode());
			//audioForAnalysis = new AudioFile(audioContext); 
			//audioForPlayback = new AudioFile(audioContext); 			
			
			beatDetector = new BeatDetector(audioContext, destination, 32);
			beatDetector.addFilter('Bass');
			beatDetector.addFilter('Medium');
			beatDetector.addFilter('Treble');
			beatDetector.addFilter('Pierce');

			// Three -------------------------------------
			renderer = new THREE.WebGLRenderer({
				antialias: true, // to get smoother output
				preserveDrawingBuffer: true	// to allow screenshot
			});
			renderer.setClearColor( 0xffffff, 1 );
			self.container.appendChild(renderer.domElement);

			scene = new THREE.Scene();

			//var ambientLight = new THREE.AmbientLight(0x666666);
			//scene.add(ambientLight);
			var directionalLight = new THREE.DirectionalLight(0xffffff);
			directionalLight.position.set(1, 1, 1).normalize();
			scene.add(directionalLight);
			var directionalLight = new THREE.DirectionalLight(0xffffff);
			directionalLight.position.set(0, 1, -1).normalize();
			scene.add(directionalLight);

			camera = new THREE.PerspectiveCamera(35, 1, 1, 10000 );
			camera.position.set(0, 0, 5);
			scene.add(camera);
			controls = new THREE.TrackballControls(camera);
						
			materials = {};
			materials['Normal'] = new THREE.MeshNormalMaterial({side: THREE.DoubleSide, color: 0X000000});
			materials['Normal Wireframe'] =   new THREE.MeshNormalMaterial({side: THREE.DoubleSide, wireframe: true}); 
			materials['Black'] =   new THREE.MeshBasicMaterial({side: THREE.DoubleSide, color: 0X000000}); 
			materials['Black Wireframe'] =   new THREE.MeshBasicMaterial({side: THREE.DoubleSide, color: 0X000000, wireframe: true}); 
			materials['White'] =   new THREE.MeshBasicMaterial({side: THREE.DoubleSide, color: 0xffffff}); 
			materials['White Wireframe'] =   new THREE.MeshBasicMaterial({side: THREE.DoubleSide, color: 0xffffff, wireframe: true});
			materials['Phong'] =   new THREE.MeshPhongMaterial({side: THREE.DoubleSide, color: 0xffffff, shading: THREE.FlatShading}); 
			materials['Phong Wireframe'] =   new THREE.MeshPhongMaterial({side: THREE.DoubleSide, color: 0xffffff, shading: THREE.FlatShading, wireframe: true}); 
			//materials['Lambert'] =   new THREE.MeshLambertMaterial({side: THREE.DoubleSide, color: 0xffffff, shading: THREE.FlatShading}); 
			//materials['Lambert Wireframe'] =   new THREE.MeshLambertMaterial({side: THREE.DoubleSide, color: 0xffffff, shading: THREE.FlatShading, wireframe: true});
			
			bassArea = 0;
			mediumArea = 0;
			trebleArea = 0;

			// GUI -------------------------------------

			GlobalGui.add('General', 'On/Off', true);
			GlobalGui.addColor('General', 'Background Color', "#000000");
			
			var setBGColor = function (value) {
				var getContrastYIQ = function(hexcolor){
					var r = parseInt(hexcolor.substr(1,2),16);
					var g = parseInt(hexcolor.substr(3,2),16);
					var b = parseInt(hexcolor.substr(5,2),16);
					var yiq = ((r*299)+(g*587)+(b*114))/1000;
					return (yiq >= 128) ? 'black' : 'white';
				}			
				var logo = document.getElementById('logo');
				logo.classList.remove('black')
				logo.classList.remove('white')
				logo.classList.add(getContrastYIQ(String(value)));
				renderer.setClearColor( value, 1 );
			}
			GlobalGui.addCallback('Background Color', setBGColor);
			setBGColor(GlobalGui['Background Color']);
			GlobalGui.add('Advanced', 'Pierce Power', 1, 0, 20);
			GlobalGui.add('Advanced', 'Pierce Multiplier', 1, 0, 20);			
			GlobalGui.add('Advanced', 'Playback Gain', 1, 0, 1);
			GlobalGui.addCallback('Playback Gain', function (value) {
				gain.native.gain.value = value;
			});


			getUserMedia({audio: true}, function(stream){
				onMicReady(stream);
				self.update = update;
			}, function (error) {
				console.log(error)
			});

			var materialsOptions = {};
			var firstMaterial;
			for(var key in materials){
				if(!firstMaterial)firstMaterial = key;
				materialsOptions[key] = key;
			}

			GlobalGui.add('Mesh', 'Text', 'A');
			GlobalGui.add('Mesh', 'Font weight', '1200', {
				'1200': '1200',
				'1100': '1100',
				'1000': '1000',
				'900': '900',
				'800': '800',
				'700': '700',
				'600': '600',
				'500': '500',
				'400': '400',
				'300': '300',
				'200': '200',
				'100': '100'
			});
			GlobalGui.add('Advanced', 'Mesh Tessellate Max Length', 0.1, 0, 2);
			GlobalGui.add('Mesh', 'Resolution', 1, 1, 7, 1);

			
			GlobalGui.add('Advanced', 'Ray Modified Areas', 1, 1, 50, 1);
			GlobalGui.add('Advanced', 'Ray Casting Cube Lock', false);
			GlobalGui.add('Advanced', 'Ray Casting Distance', 2, 0, 10);
			GlobalGui.add('Advanced', 'Ray Casting Resolution', 50, 1, 100);
			GlobalGui.add('Advanced', 'Ray Casting Size', 1, 0, 3);
			GlobalGui.add('Mesh', 'REBUILD!', recreateMesh);

			GlobalGui.add('Mesh', 'Material', firstMaterial , materialsOptions);
			GlobalGui.addCallback('Material', function (id) {
				mesh.material = materials[id];
			});
			GlobalGui.add('Mesh', 'Reset', resetMesh);
			GlobalGui.add('Displacement', 'Elasticity', 0.001, 0, 0.2);
			GlobalGui.add('Advanced', 'Bass Beat Power Modifier', 1, 0, 4);
			GlobalGui.add('Advanced', 'Bass Displacement Strength', 0.01, 0, 0.2);
			GlobalGui.add('Advanced', 'Bass Displacement Power Modifier', 1, 0, 4);
			GlobalGui.add('Displacement', 'Bass Displacement Map', '0' , {
				'bass/1.png' : '0',
				'bass/2.png' : '1',
				'bass/3.png' : '2',
				'bass/4.png' : '3',
				'bass/5.png' : '4',
				'bass/6.png' : '5'
			});
			GlobalGui.add('Advanced', 'Medium Beat Power Modifier', 1, 0, 4);
			GlobalGui.add('Advanced', 'Medium Displacement Strength', 0.01, 0, 0.2);
			GlobalGui.add('Advanced', 'Medium Displacement Power Modifier', 1, 0, 4);
			GlobalGui.add('Displacement', 'Medium Displacement Map', '2' , {
				'medium/1.png' : '0',
				'medium/2.png' : '1',
				'medium/3.png' : '2',
				'medium/4.png' : '3',
				'medium/5.png' : '4',
				'medium/6.png' : '5'
			});

			GlobalGui.add('Advanced', 'Treble Beat Power Modifier', 1, 0, 4);
			GlobalGui.add('Advanced', 'Treble Displacement Strength', 0.01, 0, 0.2);
			GlobalGui.add('Advanced', 'Treble Displacement Power Modifier', 1, 0, 4);
			GlobalGui.add('Displacement', 'Treble Displacement Map', '4' , {
				'treble/1.png' : '0',
				'treble/2.png' : '1',
				'treble/3.png' : '2',
				'treble/4.png' : '3',
				'treble/5.png' : '4',
				'treble/6.png' : '5'
			});

			GlobalGui.add('Advanced', 'Show Arrow Helpers', false);
			GlobalGui.addCallback('Show Arrow Helpers', function(value){
				if(!meshAreas) return;
				for (var i = 0; i < meshAreas.length; i++) {
					if(value) scene.add(meshAreas[i].arrowHelpers);
					else scene.remove(meshAreas[i].arrowHelpers);
				};
			});
			GlobalGui.add('Advanced', 'Show Last Displacement Map', false);

			GlobalGui.GUI.toggleHide();

			displacementMap = document.createElement('div');
			self.container.appendChild(displacementMap);
			displacementMap.classList.add('displacement-map');

			recreateMesh();
			
			generateDisplacementPatterns(['bass', 'medium', 'treble'], 6)
			.then(function(patterns) {
				displacementPatterns = patterns;
			})
			.catch(function(error) {
				console.error(error);
			})

		}
	
		var onMicReady = function(stream){
			microphone = new Node(audioContext.createMediaStreamSource(stream));
			beatDetector.source = microphone;
			microphone.connect(gain)
			gain.native.gain.value = GlobalGui['Playback Gain'];
			gain.connect(destination);
		}
		/*var loadData = function(name, callback){
			var audioForAnalysisLoaded = false;
			var audioForPlaybackLoaded = false;
			var ready = function () {
				if(!audioForAnalysisLoaded || !audioForPlaybackLoaded) return;
				if(callback) callback();
			}
			audioForAnalysis.load({
				url:  "../../music/" + name + '.mp3',
				onSuccess: function () {
					audioForAnalysis.loop = true;
					beatDetector.source = audioForAnalysis.sound.root;
					audioForAnalysisLoaded = true;
					ready();					
				}
			});
			audioForPlayback.load({
				url:  "../../music/" + name + '.mp3',
				onSuccess: function () {
					audioForPlayback.connectSoundRoot(destination);
					audioForPlayback.loop = true;
					audioForPlaybackLoaded = true;
					ready();					
				}
			});
		}
		var onDataLoaded = function (data) {
			self.update = update;
			audioForAnalysis.play();
			audioForPlayback.play(0.2);
			audioForPlayback.gain = GlobalGui['Playback Gain'];
		}*/
		var calculatePierce = function (value) {
			var pierce = Math.pow(value * GlobalGui['Pierce Multiplier'], GlobalGui['Pierce Power']);
			if(pierce > 1) pierce = 1;
			else if(pierce < 0) pierce = 0;
			return pierce
		}
		var generateDisplacementPatterns = function (basesNames, total) {
			var promises = [];
			for (var i = 0; i < basesNames.length; i++) {
				for (var j = 0; j < total; j++) {
					promises[j] = getDisplacementPattern(basesNames[i] + '/' +(j+1));			
				};
			};			
			return Promise.all(promises);
		}
		var getDisplacementPattern = function (name) {
			return new Promise(function (resolve, reject) {
				var canvas = document.createElement('canvas');
				var context = canvas.getContext('2d');
				canvas.classList.add('displacement-pattern');
				canvas.classList.add('displacement-pattern-'+name);
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
				image.src = 'displacement/'+name+'.png';
			});
			
		}
		var getRandomPointInSphereRef = function(radius){
			radius = radius || 1;
			var x = 1, y = 1, z = 1;

			while((x*x + y*y + z*z) > 1){
				x = Math.random() * 2 - 1;
				y = Math.random() * 2 - 1;
				z = Math.random() * 2 - 1;
			}

			var point = new THREE.Vector3(x,y,z);
			point.normalize();
			point.multiplyScalar(radius);

			return {
				point:point,
				lookAt: new THREE.Vector3()
			}
		}
		var getStructedPointInSphereRef = function(id, radius){
			radius = radius || 1;
			var x = 1, y = 1, z = 1;

			id = id%22;
			switch(id){
				case 0:
					x = 0;
					y = 0;
					z = 0.1;
					break;
				case 1:
					x = 0;
					y = 0;
					z = -0.1;
					break;
				case 2:
					x = 0.1;
					y = 0;
					z = 0;
					break;
				case 3:
					x = -0.1;
					y = 0;
					z = 0;
					break;
				case 4:
					x = 0;
					y = 0.1;
					z = 0;
					break;
				case 5:
					x = 0;
					y = -0.1;
					z = 0;
					break;
				case 6:
					x = 0.1;
					y = 0;
					z = 0.1;
					break;
				case 7:
					x = -0.1;
					y = 0;
					z = 0.1;
					break;
				case 8:
					x = 0.1;
					y = 0;
					z = -0.1;
					break;
				case 9:
					x = -0.1;
					y = 0;
					z = -0.1;
					break;
				case 10:
					x = 0;
					y = 0.1;
					z = 0.1;
					break;
				case 11:
					x = 0;
					y = -0.1;
					z = 0.1;
					break;
				case 12:
					x = 0;
					y = 0.1;
					z = -0.1;
					break;
				case 13:
					x = 0;
					y = -0.1;
					z = -0.1;
					break;
				case 14:
					x = 0.1;
					y = 0.1;
					z = 0.1;
					break;
				case 15:
					x = -0.1;
					y = 0.1;
					z = 0.1;
					break;
				case 16:
					x = 0.1;
					y = -0.1;
					z = 0.1;
					break;
				case 17:
					x = -0.1;
					y = -0.1;
					z = 0.1;
					break;
				case 18:
					x = 0.1;
					y = 0.1;
					z = -0.1;
					break;
				case 19:
					x = -0.1;
					y = 0.1;
					z = -0.1;
					break;
				case 20:
					x = 0.1;
					y = -0.1;
					z = -0.1;
					break;
				case 21:
					x = -0.1;
					y = -0.1;
					z = -0.1;
					break;
			}

			var point = new THREE.Vector3(x,y,z);
			point.normalize();
			point.multiplyScalar(radius);

			return {
				point:point,
				lookAt: new THREE.Vector3()
			}
		}
		var getRandomPointInCubeRef = function(distance, size ){
			distance = distance || 1;
			size = size || distance;

			var a = Math.random() * size - size * 0.5;
			var b = Math.random() * size - size * 0.5;

			var plane = Math.floor(Math.random() * 6);

			var point = new THREE.Vector3();
			var lookAt = new THREE.Vector3();

			switch(plane){
				case 0: // front
					point.set(a,b, distance);
					lookAt.set(a,b, 0);
					break;
				case 1: // back
					point.set(a,b, -distance);
					lookAt.set(a,b, 0);
					break;
				case 2: // left
					point.set(-distance, a, b);
					lookAt.set(0, a, b);
					break;
				case 3: // right
					point.set(distance, a, b);
					lookAt.set(0, a, b);
					break;
				case 4: // top
					point.set(a, distance, b);
					lookAt.set(a, 0, b);
					break;
				case 5: // bottom
					point.set(a, -distance, b);
					lookAt.set(a, 0, b);
					break;
			}


			return {
				point : point,
				lookAt : lookAt
			}
		}
		var generateMeshAreas = function (total) {
			var selector = new MeshAreaSelector(mesh, GlobalGui['Ray Casting Resolution'], GlobalGui['Ray Casting Size']);
			var promises = [];
			for (var i = 0; i < total; i++) {
				
				var origin;
				var lookAt;
				var ref 
				if(GlobalGui['Ray Casting Cube Lock']){
					ref = getRandomPointInCubeRef(GlobalGui['Ray Casting Distance'], 1.5);
				}
				else{
					//ref = getRandomPointInSphereRef(GlobalGui['Ray Casting Distance']);
					ref = getStructedPointInSphereRef(i, GlobalGui['Ray Casting Distance']);
				}
				origin = ref.point;
				lookAt = ref.lookAt;
				promises.push(selector.requestSelection(origin));
				
			};
			return Promise.all(promises);
		}
		var displaceArea = function (displacement, area, strength) {
			displacementMap.innerHTML = '';
			if(GlobalGui['Show Last Displacement Map'])	displacementMap.appendChild(displacement.canvas);

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
			var loadingNode = document.createElement('div');
			loadingNode.id = 'loading';
			loadingNode.style.content = "creating mesh";
			loadingNode.classList.add('creating-mesh');
			document.body.appendChild(loadingNode);

			if(geometry) geometry.dispose();

			var resolution = Math.round(GlobalGui['Mesh Resolution']);
			var size = 2;
			var depth = 0.5;
			//geometry = new THREE.PlaneGeometry( 2, 2, resolution , resolution );
			geometry = new THREE.TextGeometry(GlobalGui['Text'], {
				size: size,
				height:depth,
				curveSegments: 10,
				bevelEnabled: false,

				font: 'skeletal',
				weight: GlobalGui['Font weight']
				//font: 'helvetiker',
				//weight: 'normal'
			});
			geometry.dynamic = true;
			THREE.GeometryUtils.center( geometry );


			tessellateModifier = new TessellateModifier( GlobalGui['Mesh Tessellate Max Length'] );
			for ( var i = 0; i < GlobalGui['Resolution']; i ++ ) {
				tessellateModifier.modify( geometry );
			}
			geometry.mergeVertices();
			updateMesh();
			//subdivisionModifier.modify( geometry );


			geometryClone = geometry.clone();
			
			verticesDisplacementAmount = [];
			for (var i = 0; i < geometry.vertices.length; i++) {
				verticesDisplacementAmount[i] = 0;
			};
			

			if(mesh) scene.remove(mesh);
			mesh = new THREE.Mesh( geometry, materials[GlobalGui['Material']] );
			
			scene.add(mesh);

			if(meshAreas) {
				for (var i = 0; i < meshAreas.length; i++) {
					scene.remove(meshAreas[i].arrowHelpers);
				}
			}

			meshAreas = null;
			generateMeshAreas(GlobalGui['Ray Modified Areas']).then(function (areas) {
				meshAreas = areas;
				if(GlobalGui['Show Arrow Helpers']){
					for (var i = 0; i < areas.length; i++) {
						scene.add(areas[i].arrowHelpers);
					};
				}
				document.body.removeChild(loadingNode);
				
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
		var frame = 0;
		var update = function(dt, time) {
			frame++;
			var bass = beatDetector.getFilter('Bass').beat;
			var medium = beatDetector.getFilter('Medium').beat;
			var treble = beatDetector.getFilter('Treble').beat;
			if(bass > 0.5 ) bass = 0.5;
			if(medium > 0.5 ) medium = 0.5;
			if(treble > 0.5 ) treble = 0.5;

			//var pierce = calculatePierce(beatDetector.getFilter('Pierce').average);
			/*if(frame % 60 == 0){
				bassArea = Math.floor(Math.random()*meshAreas.length);
				mediumArea = Math.floor(Math.random()*meshAreas.length);
				trebleArea = Math.floor(Math.random()*meshAreas.length);
			}*/

			if(meshAreas){
				if(bass < 0.3) bassArea = Math.floor(Math.random()*meshAreas.length);
				if(medium < 0.35) mediumArea = Math.floor(Math.random()*meshAreas.length);
				if(treble < 0.35) trebleArea = Math.floor(Math.random()*meshAreas.length);
			}

			if(GlobalGui['On/Off']){
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

				regenerateMesh(GlobalGui['Elasticity'])
			}
	
			

			updateMesh();

			controls.update();
		}
		self.draw = function () {
			renderer.render(scene, camera);
			camera.updateProjectionMatrix();
		}
		self.onResize = function(size) {
			screenSize = size;
			renderer.setSize(size.width, size.height);
			camera.aspect = size.width/ size.height;
			camera.updateProjectionMatrix();
		}
	}
	App.prototype = new BaseApp();
	return App;
});