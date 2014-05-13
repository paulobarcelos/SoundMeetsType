define(
[
	'happy/_libs/threejs',
	'GlobalGui'
],
function (
	THREE,
	GlobalGui
){
	"use strict";
	
	var MeshAreaSelector = function(mesh, resolution, size){
		var 
		self = this,
		raycaster = new THREE.Raycaster(),
		resolution = resolution || 50;
		size = size || 1;

		var requestSelection = function (origin, lookAt) {
			return new Promise(function(resolve, reject) {
				setTimeout(function () {
					resolve(select(origin, lookAt));
				},0)
			});
		}
		var select = function (origin, lookAt) {
			origin = origin || new THREE.Vector3();
			lookAt = lookAt || new THREE.Vector3();
			
			var arrowHelpers = new THREE.Object3D();
			var directions = [];
			var vertices = [];
			var matchedFaces = {}
			var matchedVertices = {}

			var addLine = function(direction, x, y){
				var color = new THREE.Color();
				color.setRGB(x/resolution, y/resolution, 0);
				arrowHelpers.add( new THREE.ArrowHelper(direction, origin, 2, color));
				if(!directions[x][y]){
					directions[x][y] = origin.clone().sub(direction);//.multiply(baseDirection);
				}

				raycaster.set(origin, direction);
				var intersects = raycaster.intersectObjects([mesh]);
				for (var i = 0; i < intersects.length; i++) {
					var intersected = intersects[i];
					var faceId = intersected.faceIndex;
					//if(matchedFaces[faceId]) continue;
					matchedFaces[faceId] = true;
					var face = intersected.face;
				
					var verticesIds = [face.a, face.b, face.c];
					for (var j = 0; j < verticesIds.length; j++) {
						var vertexId = verticesIds[j];
						if(matchedVertices[vertexId]) continue;
						matchedVertices[vertexId] = true;
						vertices[x][y].push(vertexId);	
					};
					break;
				}
			}

			for (var x = 0; x < resolution; x++) {
				directions[x] = [];
				vertices[x] = [];
				var xx = (x/resolution) * size - size * 0.5;
				for (var y = 0; y < resolution; y++) {	
					vertices[x][y] = [];				
					var yy = (y/resolution) * size - size * 0.5;

					var v = new THREE.Vector3(xx,yy,-1);
	
					var q = new THREE.Quaternion();
					var m = new THREE.Matrix4();
					m.lookAt(origin, lookAt, new THREE.Vector3( 0, 1, 0 ));
					q.setFromRotationMatrix(m);
					v.applyQuaternion( q );
										
					addLine(v, x, y);
				}
			};

			console.log('Area Selected')
			return {
				origin: origin,
				arrowHelpers: arrowHelpers,
				directions: directions,
				vertices: vertices,
				resolution: resolution,
			}
		}

		var getOriginalVertices = function () {
			return originalVertices;
		}

		Object.defineProperty(self, 'requestSelection', {
			value: requestSelection
		});
		Object.defineProperty(self, 'select', {
			value: select
		});
		Object.defineProperty(self, 'originalVertices', {
			get: getOriginalVertices
		});

	}
	return MeshAreaSelector;
});