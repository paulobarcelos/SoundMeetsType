define(
[
	'happy/app/BaseApp',
	'happy/utils/Network',
	'chart'
],
function (
	BaseApp,
	Network,
	Chart
){


	var network = new Network();
	
	var App = function(){
		var 
		self = this,
		chart,
		qualitiesText,
		analysis,
		sampledData,

		numSamplesNode;

		self.setup = function(){
			
			var h1 = document.createElement('h1');
			h1.innerHTML = 'Load';
			self.container.appendChild(h1)
			var spotifyTrackUri = document.createElement('input')
			spotifyTrackUri.placeholder = "Spotify Track URI";
			spotifyTrackUri.value= "spotify:track:4S4dCACmtuPWbhvMSfDXqN";
			self.container.appendChild(spotifyTrackUri);			
			var loadDataButton = document.createElement('button')
			loadDataButton.innerHTML = "Load Data";
			self.container.appendChild(loadDataButton);
			loadDataButton.addEventListener('click', function(){
				if(spotifyTrackUri.value){
					loadData(spotifyTrackUri.value.replace('spotify:', 'spotify-WW:'));
				}
			});

			var h1 = document.createElement('h1');
			h1.innerHTML = 'Resample';
			self.container.appendChild(h1)
			numSamplesNode = document.createElement('input')
			numSamplesNode.placeholder = "Number of samples";
			self.container.appendChild(numSamplesNode);
			var startTime = document.createElement('input')
			startTime.placeholder = "Start Time";
			self.container.appendChild(startTime);
			var endTime = document.createElement('input')
			endTime.placeholder = "End Time";
			self.container.appendChild(endTime);
			var resampleDataButton = document.createElement('button')
			resampleDataButton.innerHTML = "Resample Data";
			self.container.appendChild(resampleDataButton);
			resampleDataButton.addEventListener('click', function(){
				if(analysis){
					resampleData(analysis, parseFloat(numSamplesNode.value) || 0, parseFloat(startTime.value) || 0, parseFloat(endTime.value) || 0);
				}
			});

			var h1 = document.createElement('h1');
			h1.innerHTML = 'Plot';
			self.container.appendChild(h1)
			var functionText = document.createElement('textarea')
			functionText.placeholder = "Graph Function";
			functionText.spellcheck="false";
			functionText.innerHTML = "value = loudness;";
			self.container.appendChild(functionText);
			
			var plotMin = document.createElement('input')
			plotMin.placeholder = "Plot Minimum";
			self.container.appendChild(plotMin);
			var plotMax = document.createElement('input')
			plotMax.placeholder = "Plot Maximum";
			self.container.appendChild(plotMax);

			var plotDataButton = document.createElement('button')
			plotDataButton.innerHTML = "Plot Data";
			self.container.appendChild(plotDataButton);
			plotDataButton.addEventListener('click', function(){
				if(sampledData){
					plotData(sampledData, functionText.value, parseFloat(plotMin.value) || 0, parseFloat(plotMax.value) || 0);
				}
			});

			var canvas = document.createElement('canvas');
			canvas.class = "plot";
			canvas.width = 6000;
			canvas.height = 600;
			self.container.appendChild(canvas)
			chart = new Chart(canvas.getContext("2d"))
		}
		var getLocation = function(href) {
			var l = document.createElement("a");
			l.href = href;
			return l;
		};
		var loadData = function(id, callback){
			self.container.classList.add('data-loading');
			self.container.classList.remove('data-loaded');

			var analysisComplete = function (a) {
				localStorage.setItem(id, JSON.stringify(a));

				analysis = a;
				numSamplesNode.value = analysis.segments.length;
				console.log('analysis', analysis)
				if(callback) callback(analysis);
			}

			var cached = localStorage.getItem(id);
			if(cached){
				console.log('cached')
				cached = JSON.parse(cached);
				return analysisComplete(cached);
			}

			var echonestAPI = 'KE2CDRAW5LZFXAMGU';
				console.log(getLocation(window.location).hostname);
			if( getLocation(window.location).hostname == 'musicdata.herokuapp.com'){
				echonestAPI = '83BFOEBIIIWQQDIFI';
			}

			network.ajax({
				url: 'http://developer.echonest.com/api/v4/track/profile?api_key=' + echonestAPI + '&format=json&id=' + id + '&bucket=audio_summary',
				onSuccess: function(data){
					var data = JSON.parse(data.response);
					console.log(data)
					network.ajax({
						url: data.response.track.audio_summary.analysis_url,
						onSuccess: function(_analysis){
							self.container.classList.remove('data-loading');
							self.container.classList.add('data-loaded');
							var a = JSON.parse(_analysis.response);
							a.track = data.response.track;

							analysisComplete(a);
							
						}
					});
				}
			});

			
		}

		var resampleData = function(data, numSamples, startTime, endTime, callback){

			var total = numSamples || 400;
			var start = startTime || 0;
			var end = endTime || data.track.audio_summary.duration;
			if(end > data.track.audio_summary.duration) end = data.track.audio_summary.duration;
			if(start > end) start = end;



			self.container.classList.add('data-sampling');
			self.container.classList.remove('data-sampled');
			
			sampledData = {}
			var bars = createPlotData(data.bars, 'duration', start, end, total);
			sampledData.bars = bars.values;
			var beats = createPlotData(data.beats, 'duration', start, end, total);
			sampledData.beats = beats.values;
			var tatums = createPlotData(data.tatums, 'duration', start, end, total);
			sampledData.tatums = tatums.values;
			var sections = createPlotData(data.sections, 'duration', start, end, total);
			sampledData.sections = sections.values;
			var segments = createPlotData(data.segments, 'duration', start, end, total);
			sampledData.segments = segments.values;
			var loudness = createPlotData(data.segments, 'loudness_max', start, end, total);
			sampledData.loudness = loudness.values;
			var pitches = createPlotDataDeep(data.segments, 'pitches', 12, start, end, total);
			sampledData.pitches = pitches.values;
			var timbre = createPlotDataDeep(data.segments, 'timbre', 12, start, end, total);
			sampledData.timbre = timbre.values;

			sampledData.labels = bars.labels;


			self.container.classList.remove('data-sampling');
			self.container.classList.add('data-sampled');

			console.log('sampledData', sampledData)
			if(callback) callback(sampledData);
		}

		var plotData = function(data, evalFunction, plotMin, plotMax){
			var labels = data.labels;
			var values = [];
			if(plotMin || plotMax){
				console.log('aa')
				labels.unshift('min');
				labels.unshift('max');
				values = [plotMax,plotMin];
			}



			var total = data.loudness.length;
			var lastValue = 0;
			for (var _i = 0; _i < total; _i++) {
				var value;

				var loudness = data.loudness[_i];
				var bars = data.bars[_i];
				var beats = data.beats[_i];
				var segments = data.segments[_i];
				var sections = data.sections[_i];
				var loudness = data.loudness[_i];
				var tatums = data.tatums[_i];
				var pitches = [];
				var timbre = [];
				for (var __i = 0; __i < 12; __i++) {
					pitches[__i+1] = data.pitches[__i][_i];
					timbre[__i+1] = data.timbre[__i][_i];
				};
				
				eval(evalFunction.toString())

				if(plotMin && plotMax){
					if(value < plotMin) value = plotMin;
					if(value > plotMax) value = plotMax;
				}
				lastValue = value;
				values.push(value);
			};

			chart.Line({
				labels: labels,
				datasets: [
					{
						fillColor : "rgba(255,0,0,0.3)",
						data: values
					}
				]
			}, {animation:false});
			
		}

		var createPlotData = function(data, key, start, end, samples, min, max){
			samples = samples || 400;
			var duration = end - start;
			var labels = [];
			var values = [];
			var confidences = [];

			for (var i = 0; i < samples; i++) {
				var time = start +(duration / samples) * i;
				var from, to, fromConfidence, toConfidence;
				for (var j = 0; j < data.length; j++) {
					if(data[j].start > time){
						var t = data[j];
						var f = (!j) ? j : data[j-1];
						to = t[key]
						from = f[key];
						toConfidence = t.confidence;
						fromConfidence = f.confidence;
						break;
					}
					
				};
	
				var value = (from + to) * 0.5;
				if(typeof min !== 'undefined' && typeof max != 'undefined'){
					value = (value - min) / (max - min);
					if(value < min) value = min;
					if(value > max) value = max;
				}

				labels.push(formatTime(time));
				values.push(parseFloat(value) || 0);
				confidences.push(parseFloat(fromConfidence + toConfidence) * 0.5) || 0();
			};
			

			return{
				labels:labels,
				values: values,
				confidences: confidences
			}
		}

		var createPlotDataDeep = function(data, key, size, start, end, samples, min, max){
			size = size || 12;
			samples = samples || 400;
			var duration = end - start;
			var labels = [];
			var values = [];
			for (var k = 0; k < size; k++) {
				values[k] = [];
			};

			for (var i = 0; i < samples; i++) {
				var time = start +(duration / samples) * i;
				labels.push(formatTime(time));
				
			
				for (var k = 0; k < size; k++) {
					var from;
					var to;
					for (var j = 0; j < data.length; j++) {
						if(data[j].start > time){
							var t = data[j];
							var f = (!j) ? j : data[j-1];
							to = t[key][k];
							from = f[key][k];
							break;
						}
						
					};		
					var value = (from + to) * 0.5;
					if(typeof min !== 'undefined' && typeof max != 'undefined'){
						value = (value - min) / (max - min);
						if(value < min) value = min;
						if(value > max) value = max;
					}
					

					values[k].push(parseFloat(value) || 0);
				};
			};
			

			return{
				labels:labels,
				values: values
			}
		}

		/*var createPlotDataDeepTimbre = function(data, key, size, start, end, min, max, samples){
			size = size || 12;
			samples = samples || 400;
			var duration = end - start;
			var labels = ['max', 'min'];
			var values = [];
			for (var k = 0; k < size; k++) {
				values[k] = [1,-1];
			};

			for (var i = 0; i < samples; i++) {
				var time = start +(duration / samples) * i;
				labels.push(formatTime(time));
				
			
				for (var k = 0; k < size; k++) {
					var from;
					var to;
					for (var j = 0; j < data.length; j++) {
						if(data[j].start > time){
							var t = data[j];
							var f = (!j) ? j : data[j-1];
							to = Math.abs(t[key][k]);
							from = Math.abs(f[key][k]);
							break;
						}
						
					};		
					var value = (from + to) * 0.5;
					value = (value - min) / (max - min);
					if(value < 0) value = 0;
					if(value > 1) value = 1;

					values[k].push(value);
				};
			};
			

			return{
				labels:labels,
				values: values
			}
		}*/

		var formatTime = function(time){
			// Minutes and seconds
			var mins = ~~(time / 60);
			var secs = time % 60;

			// Hours, minutes and seconds
			var hrs = ~~(time / 3600);
			var mins = ~~((time % 3600) / 60);
			var secs = time % 60;
			secs = secs.toFixed(2);

			// Output like "1:01" or "4:03:59" or "123:03:59"
			var ret = "";

			if (hrs > 0)
			    ret += "" + hrs + ":" + (mins < 10 ? "0" : "");

			ret += "" + mins + ":" + (secs < 10 ? "0" : "");
			ret += "" + secs;
			return ret;
		}

		
	}
	App.prototype = new BaseApp();
	return App;
});