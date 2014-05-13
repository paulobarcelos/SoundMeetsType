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
	"use strict";

	var network = new Network();
	
	var App = function(){
		var 
		self = this,
		qualitiesChart,
		qualitiesText,
		barsChart,
		loudnessChart,
		pitchesChart,
		timbreChart;

		self.setup = function(){
			
			var spotifyTrackUri = document.createElement('input')
			spotifyTrackUri.placeholder = "Spotify Track URI";
			self.container.appendChild(spotifyTrackUri);

			var samplesNode = document.createElement('input')
			samplesNode.placeholder = "Number of samples";
			self.container.appendChild(samplesNode);

			var startTime = document.createElement('input')
			startTime.placeholder = "Start Time";
			self.container.appendChild(startTime);

			var endTime = document.createElement('input')
			endTime.placeholder = "End Time";
			self.container.appendChild(endTime);
			
			var loadData = document.createElement('button')
			loadData.innerHTML = "Load Data";
			self.container.appendChild(loadData);

			loadData.addEventListener('click', function(){
				if(spotifyTrackUri.value)
					loadAnalysis(spotifyTrackUri.value.replace('spotify:', 'spotify-WW:'), function (data) {
						plotData(data, parseFloat(startTime.value) || 0, parseFloat(endTime.value) || 0, parseInt(samplesNode.value) || 0)
					});
				
			});

			var h1 = document.createElement('h1');
			h1.innerHTML = 'Qualities';
			self.container.appendChild(h1)

			qualitiesText = document.createElement('table');
			self.container.appendChild(qualitiesText);

			var qualitiesCanvas = document.createElement('canvas');
			qualitiesCanvas.width = 400;
			qualitiesCanvas.height = 400;
			self.container.appendChild(qualitiesCanvas)

			qualitiesChart = new Chart(qualitiesCanvas.getContext("2d"))

			var h1 = document.createElement('h1');
			h1.innerHTML = '<span style="color:red;">Bars</span>/<span style="color:green;">Beats</span>/<span style="color:blue;">Tatums</span> (duration x time)';
			self.container.appendChild(h1)
			var barsCanvas = document.createElement('canvas');
			barsCanvas.class = "plot";
			barsCanvas.width = 5000;
			barsCanvas.height = 500;
			self.container.appendChild(barsCanvas)
			barsChart = new Chart(barsCanvas.getContext("2d"))

			var h1 = document.createElement('h1');
			h1.innerHTML = 'Loudness (db x time)';
			self.container.appendChild(h1)
			var loudnessCanvas = document.createElement('canvas');
			loudnessCanvas.class = "plot";
			loudnessCanvas.width = 5000;
			loudnessCanvas.height = 500;
			self.container.appendChild(loudnessCanvas)
			loudnessChart = new Chart(loudnessCanvas.getContext("2d"))

			var h1 = document.createElement('h1');
			h1.innerHTML = 'Pitches (dominance x time)';
			self.container.appendChild(h1)
			var pitchesCanvas = document.createElement('canvas');
			pitchesCanvas.class = "plot";
			pitchesCanvas.width = 5000;
			pitchesCanvas.height = 500;
			self.container.appendChild(pitchesCanvas)
			pitchesChart = new Chart(pitchesCanvas.getContext("2d"))

			var h1 = document.createElement('h1');
			h1.innerHTML = 'Timbre (mark x time)';
			self.container.appendChild(h1)
			var timbreCanvas = document.createElement('canvas');
			timbreCanvas.class = "plot";
			timbreCanvas.width = 5000;
			timbreCanvas.height = 500;
			self.container.appendChild(timbreCanvas)
			timbreChart = new Chart(timbreCanvas.getContext("2d"))
		}
		var getLocation = function(href) {
			var l = document.createElement("a");
			l.href = href;
			return l;
		};
		var loadAnalysis = function(id, callback){


			var analysisComplete = function (a) {
				localStorage.setItem(id, JSON.stringify(a));
				var analysis = a;
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
				url: 'http://developer.echonest.com/api/v4/track/profile?api_key='+echonestAPI+'&format=json&id=' + id + '&bucket=audio_summary',
				onSuccess: function(data){
					var data = JSON.parse(data.response);
					console.log(data)
					network.ajax({
						url: data.response.track.audio_summary.analysis_url,
						onSuccess: function(analysis){
							var a = JSON.parse(analysis.response);
							a.track = data.response.track;

							analysisComplete(a);
						}
					});
				}
			});
		}

		var plotData = function(data, start, end, samples){
			samples = samples || 400
			start = start || 0;
			end = end || data.track.audio_summary.duration;

		
			qualitiesText.innerHTML = '<h2>' + data.track.artist + ' - ' + data.track.title + '</h2>';
			qualitiesText.innerHTML += '<tr><td>duration</td><td>' + data.track.audio_summary.duration + '</td></tr>';
			qualitiesText.innerHTML += '<tr><td>loudness</td><td>' + data.track.audio_summary.loudness + '</td></tr>';
			qualitiesText.innerHTML += '<tr><td>key</td><td>' + data.track.audio_summary.key + '</td></tr>';
			qualitiesText.innerHTML += '<tr><td>mode</td><td>' + data.track.audio_summary.mode + '</td></tr>';
			qualitiesText.innerHTML += '<tr><td>tempo</td><td>' + data.track.audio_summary.tempo + '</td></tr>';
			qualitiesText.innerHTML += '<tr><td>time_signature</td><td>' + data.track.audio_summary.time_signature + '</td></tr>';
			qualitiesText.innerHTML += '<tr></tr>';
			qualitiesText.innerHTML += '<tr><td>acousticness</td><td>' + data.track.audio_summary.acousticness + '</td></tr>';
			qualitiesText.innerHTML += '<tr><td>danceability</td><td>' + data.track.audio_summary.danceability + '</td></tr>';
			qualitiesText.innerHTML += '<tr><td>energy</td><td>' + data.track.audio_summary.energy + '</td></tr>';
			qualitiesText.innerHTML += '<tr><td>liveness</td><td>' + data.track.audio_summary.liveness + '</td></tr>';
			qualitiesText.innerHTML += '<tr><td>speechiness</td><td>' + data.track.audio_summary.speechiness + '</td></tr>';
			qualitiesText.innerHTML += '<tr><td>valence</td><td>' + data.track.audio_summary.valence + '</td></tr>';

			console.log('hint', data.track.audio_summary.acousticness + (1- data.track.audio_summary.speechiness))

			qualitiesChart.Radar({
				labels: [ 'acousticness', 'danceability', 'energy', 'liveness', 'speechiness', 'valence' ],
				datasets: [
					{
						fillColor : "rgba(220,220,220,0.5)",
						data: [
							data.track.audio_summary.acousticness,
							data.track.audio_summary.danceability,
							data.track.audio_summary.energy,
							data.track.audio_summary.liveness,
							data.track.audio_summary.speechiness,
							data.track.audio_summary.valence
						]
					}
				]
			}, {animation:false});

			var bars = createPlotData(data.bars, 'duration', start, end, 0, 5, samples);
			

			var beats = createPlotData(data.beats, 'duration', start, end, 0, 5, samples);
		

			var tatums = createPlotData(data.tatums, 'duration', start, end,  0, 5, samples);
			
			barsChart.Line({
				labels: bars.labels,
				datasets: [
					{
						fillColor : "rgba(255,0,0,0.3)",
						data: bars.values
					},
					{
						fillColor : "rgba(0,255,0,0.3)",
						data: beats.values
					},
					{
						fillColor : "rgba(0,0,255,0.3)",
						data: tatums.values
					}
				]
			}, {animation:false});


			var loudness = createPlotData(data.segments, 'loudness_max', start, end, -50, 10, samples);
			loudnessChart.Line({
				labels: loudness.labels,
				datasets: [{
					fillColor : "rgba(0,0,0,0.3)",
					data: loudness.values
				}]
			}, {animation:false});

			var pitches = createPlotDataDeep(data.segments, 'pitches', 12, start, end, 0, 1, samples);
			pitchesChart.Line({
				labels: pitches.labels,
				datasets: [
					{
						fillColor : "rgba(255,0,0,0.3)",
						data: pitches.values[0]
					},
					{
						fillColor : "rgba(255,128,0,0.3)",
						data: pitches.values[1]
					},
					{
						fillColor : "rgba(255,255,0,0.3)",
						data: pitches.values[2]
					},
					{
						fillColor : "rgba(128,255,0,0.3)",
						data: pitches.values[3]
					},
					{
						fillColor :"rgba(0,255,0,0.3)",
						data: pitches.values[4]
					},
					{
						fillColor : "rgba(0,255,128,0.3)",
						data: pitches.values[5]
					},
					{
						fillColor : "rgba(0,255,255,0.3)",
						data: pitches.values[6]
					},
					{
						fillColor : "rgba(0,128,255,0.3)",
						data: pitches.values[7]
					},
					{
						fillColor : "rgba(0,0,255,0.3)",
						data: pitches.values[8]
					},
					{
						fillColor :"rgba(128,0,255,0.3)",
						data: pitches.values[9]
					},
					{
						fillColor : "rgba(255,0,255,0.3)",
						data: pitches.values[10]
					},
					{
						fillColor : "rgba(255,0,128,0.3)",
						data: pitches.values[11]
					}
				]
			}, {animation:false});

			var timbre = createPlotDataDeepTimbre(data.segments, 'timbre', 12, start, end, 0, 200, samples);
			timbreChart.Line({
				labels: timbre.labels,
				datasets: [
					{
						fillColor : "rgba(255,0,0,0.3)",
						data: timbre.values[0]
					},
					{
						fillColor : "rgba(255,128,0,0.3)",
						data: timbre.values[1]
					},
					{
						fillColor : "rgba(255,255,0,0.3)",
						data: timbre.values[2]
					},
					{
						fillColor : "rgba(128,255,0,0.3)",
						data: timbre.values[3]
					},
					{
						fillColor :"rgba(0,255,0,0.3)",
						data: timbre.values[4]
					},
					{
						fillColor : "rgba(0,255,128,0.3)",
						data: timbre.values[5]
					},
					{
						fillColor : "rgba(0,255,255,0.3)",
						data: timbre.values[6]
					},
					{
						fillColor : "rgba(0,128,255,0.3)",
						data: timbre.values[7]
					},
					{
						fillColor : "rgba(0,0,255,0.3)",
						data: timbre.values[8]
					},
					{
						fillColor :"rgba(128,0,255,0.3)",
						data: timbre.values[9]
					},
					{
						fillColor : "rgba(255,0,255,0.3)",
						data: timbre.values[10]
					},
					{
						fillColor : "rgba(255,0,128,0.3)",
						data: timbre.values[11]
					}
				]
			}, {animation:false});
		}

		var createPlotData = function(data, key, start, end, min, max, samples){
			samples = samples || 400;
			var duration = end - start;
			var labels = ['max', 'min'];
			var values = [1,0];
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
				value = (value - min) / (max - min);
				if(value < 0) value = 0;
					if(value > 1) value = 1;

				labels.push(formatTime(time));
				values.push(value);
				confidences.push((fromConfidence + toConfidence) * 0.5);
			};
			

			return{
				labels:labels,
				values: values,
				confidences: confidences
			}
		}

		var createPlotDataDeep = function(data, key, size, start, end, min, max, samples){
			size = size || 12;
			samples = samples || 400;
			var duration = end - start;
			var labels = ['max', 'min'];
			var values = [];
			for (var k = 0; k < size; k++) {
				values[k] = [1,0];
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
		}

		var createPlotDataDeepTimbre = function(data, key, size, start, end, min, max, samples){
			size = size || 12;
			samples = samples || 400;
			var duration = end - start;
			var labels = ['max', 'min'];
			var values = [];
			for (var k = 0; k < size; k++) {
				values[k] = [1,0];
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
		}

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