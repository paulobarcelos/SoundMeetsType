define(
[
	'happy/audio/Node',
	'happy/utils/Vendor',
	'happy/_libs/signals',

	'GlobalGui'
],
function (
	Node,
	Vendor,
	Signal,

	GlobalGui
){
	"use strict"
	
	var vendor = new Vendor();
	var AudioContext = vendor.validateConstructor('AudioContext');
	var getUserMedia = vendor.validateMethod('getUserMedia', navigator);

	GlobalGui.add('Beat Detector', 'Beat Clearness', 0.99, 0, 1, 0.00001);
	GlobalGui.add('Beat Detector', 'Beat Smoothing', 0.99, 0, 1, 0.00001);
	GlobalGui.add('Beat Detector', 'Beat Variation Power', 3, 0, 10, 0.00001);

	var FrequencyData = function(fftSize, audioContext, destination) {
		var
		self = this,
		fftData,
		analyser,
		gain,
		filter,
		rawSum,
		averageSum,
		averageValley,
		variation,
		beat;



		var init = function(){
			analyser = new Node(audioContext.createAnalyser());
			analyser.native.fftSize = fftSize;
			analyser.native.smoothingTimeConstant = 0.8;

			gain = new Node(audioContext.createGain());
			filter = new Node(audioContext.createBiquadFilter());
			filter.native.type = 2;

			filter.connect(gain);
			gain.connect(analyser);

			fftData = new Uint8Array(analyser.native.frequencyBinCount);

			rawSum = 0;
			averageSum = 0;
			averageValley = 0;
			variation = 0;
			beat = 0;
		}

		var update = function() {
			analyser.native.getByteFrequencyData(fftData);
			rawSum = 0;
			for (var i = 0; i < fftData.length; i++) {
				rawSum += fftData[i];
			};
			rawSum /= fftData.length * 256;

			averageSum = averageSum * GlobalGui['Beat Clearness'] + rawSum * (1 - GlobalGui['Beat Clearness']);
			
			var relevance = (rawSum / averageSum);
			if(relevance < 0.8 && !isNaN(relevance)){
				relevance *= 0.7;
				averageValley = averageValley * relevance + rawSum * (1 - relevance);
			}

			variation = (rawSum - averageValley)  / ((averageSum - averageValley)* 2 );
			variation = Math.pow(variation, GlobalGui['Beat Variation Power']);
			if(isNaN(variation)) variation = 0;
			else if(variation > 1) variation = 1;
			else if(variation < 0) variation = 0;

			beat = beat * GlobalGui['Beat Smoothing'] + variation * (1 - GlobalGui['Beat Smoothing']);
		}

		var getGain = function () {
			return gain;
		}
		var getFilter = function () {
			return filter;
		}
		var getBeat = function () {
			return beat;
		}
		var getRawSum = function () {
			return rawSum;
		}
		var getAverageSum = function () {
			return averageSum;
		}
		var getVariation = function () {
			return variation;
		}
		
		var getData = function () {
			return fftData;
		}

		init();

		Object.defineProperty(self, 'update', {
			value: update
		});
		Object.defineProperty(self, 'gain', {
			get: getGain
		});
		Object.defineProperty(self, 'filter', {
			get: getFilter
		});
		Object.defineProperty(self, 'beat', {
			get: getBeat
		});
		Object.defineProperty(self, 'raw', {
			get: getRawSum
		});
		Object.defineProperty(self, 'average', {
			get: getAverageSum
		});
		Object.defineProperty(self, 'variation', {
			get: getVariation
		});
		Object.defineProperty(self, 'data', {
			get: getData
		});
	}

	var BeatDetector = function(audioContext, destination, fftSize){
		var 
		self = this,
		source,
		microphone,
		filtersByName,
		filters,

		canvas,
		canvasContext,
		canvasWidth,
		canvasHeight,
		
		debug;

		var init = function () {
			if(!audioContext) audioContext = new AudioContext();
			if(!destination) destination = new Node(audioContext.destination);

			fftSize = fftSize || 32;
			
			filtersByName = {};
			filters= [];

			canvasWidth = 0;
			canvasHeight = 256;
			canvas = document.createElement('canvas');
			canvas.width = canvasWidth;
			canvas.height = canvasHeight;
			canvas.style.position = "fixed";
			canvas.style.top = 0;
			canvas.style.left = 0;
			canvas.style.zIndex = 2;
			canvasContext = canvas.getContext("2d");

			GlobalGui.add('Beat Detector', 'Debug Spectrum', false);
			GlobalGui.addCallback('Debug Spectrum', setDebug);

			setDebug(GlobalGui['Debug Spectrum'])

			/*getUserMedia({audio: true}, onMicReady, function (error) {
				console.log(error)
			});*/

			setInterval(function () {
				update();
				draw();
			}, 10)
		}
		/*var onMicReady = function(stream){
			microphone = new Node(audioContext.createMediaStreamSource(stream));
			microphone.connect(bass.filter);
			microphone.connect(treble.filter);
		}*/

		var addFilter = function (name) {
			var filter = new FrequencyData(fftSize, audioContext, destination);
			filtersByName[name] = filter;
			filters.push(filter);


			if(debug)filter.gain.connect(destination);

			GlobalGui.add('Beat Detector', name + ' Filter Frequency', 440, 0, 18000);
			GlobalGui.add('Beat Detector', name + ' Filter Q', 0, 0, 150);
			GlobalGui.add('Beat Detector', name + ' Filter Gain', 1, 0, 40);

			canvasWidth = filters.length * filter.data.length * 2;
			canvas.width = canvasWidth;
		}

		var update = function() {
			for (var name in filtersByName) {
				filtersByName[name].gain.native.gain.value =  GlobalGui[ name + ' Filter Gain'];
				filtersByName[name].filter.native.frequency.value = GlobalGui[ name + ' Filter Frequency'];
				filtersByName[name].filter.native.Q.value = GlobalGui[ name + ' Filter Q'];
				filtersByName[name].update();
			};
		}
		var draw = function() {
			if(!debug) return;

			var index = 0;
			for (var name in filtersByName) {
				var filter = filtersByName[name];
				canvasContext.fillStyle = 'hsl(' + (index/filters.length) *360 + ',30%,70%)';
				canvasContext.fillRect(index * canvasWidth/filters.length, 0, canvasWidth/filters.length, canvasHeight);

				canvasContext.fillStyle = "#000000";
				for (var i = 0; i < filter.data.length; i++) {
					canvasContext.fillRect(index * canvasWidth/filters.length + i * 2, canvasHeight, 1, -filter.data[i]);
				};

				canvasContext.fillStyle = "#000000";
				canvasContext.fillRect(index * canvasWidth/filters.length + canvasWidth/filters.length * 0.5, canvasHeight, 4,  -filter.beat * canvasHeight);

				index++;
			};
		}

		var getFilter = function(name){
			if(!filtersByName[name]) return;
			return filtersByName[name];
		}
	
		var getDebug = function() {
			return debug;
		}
		var setDebug = function(value) {
			debug = value;
			if(debug){
				document.body.appendChild(canvas);
				for (var i = 0; i < filters.length; i++) {
					filters[i].gain.connect(destination);
				};
			}
			else{
				if(canvas.parentNode)
					canvas.parentNode.removeChild(canvas);

				for (var i = 0; i < filters.length; i++) {
					filters[i].gain.disconnect(destination);
				};
			}
		}
		var setSource = function (node) {
			if(source){
				for (var i = 0; i < filters.length; i++) {
					source.disconnect(filters[i].filter);
				};
			}
			source = node;
			for (var i = 0; i < filters.length; i++) {
				source.connect(filters[i].filter);
			};
		}
		var getSource = function () {
			return source;
		}

		init();
		
		Object.defineProperty(self, 'update', {
			value: update
		});
		Object.defineProperty(self, 'draw', {
			value: draw
		});
		Object.defineProperty(self, 'addFilter', {
			value: addFilter
		});
		Object.defineProperty(self, 'getFilter', {
			value: getFilter
		});

		Object.defineProperty(self, 'source', {
			set: setSource,
			get: getSource
		});
		Object.defineProperty(self, 'debug', {
			get: getDebug,
			set: setDebug
		});

		
	}
	return BeatDetector;
});