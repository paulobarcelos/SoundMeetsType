define(
[
	'happy/app/BaseApp',
	'happy/audio/AudioFile',
	'happy/audio/Node',
	'happy/utils/Network',
	'happy/utils/Vendor',

	'BeatDetector',
	'GlobalGui'
],
function (
	BaseApp,
	AudioFile,
	Node,
	Network,
	Vendor,
	BeatDetector,
	GlobalGui
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
		canvas,
		context,
		peaks,
		frame,

		song,
		playback,

		beatDetector,

		songStart;

		self.setup = function(){
			
			audioContext = new AudioContext();
			destination = new Node(audioContext.destination);
			song = new AudioFile(audioContext); 
			playback = new AudioFile(audioContext); 


			canvas = document.createElement('canvas');
			canvas.width = 1000;
			canvas.height = 500;
			self.container.appendChild(canvas);
			context = canvas.getContext('2d');
			context.fillStyle="#000";
			context.fillRect(0,0,canvas.width,canvas.height);
			context.fillStyle="#fff";

			beatDetector = new BeatDetector(audioContext, destination, 64);
			beatDetector.addFilter('Bass');
			beatDetector.addFilter('Medium');
			beatDetector.addFilter('Treble');
			beatDetector.addFilter('Pierce');

			GlobalGui.add('Pierce Modifiers', 'Pierce Power', 1, 0, 20);
			GlobalGui.add('Pierce Modifiers', 'Pierce Multiplier', 1, 0, 20);

			GlobalGui.GUI.toggleHide();
			GlobalGui.add('Audio', 'Playback Gain', 1, 0, 1);
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
			context.globalAlpha = 1;
			context.fillStyle ="#000";
			context.fillRect(0,0,canvas.width,canvas.height);		

			songStart = audioContext.currentTime 
			song.play();
			playback.play(0.1);
		}


		var update = function(dt, time) {
			var currentTime = (audioContext.currentTime - songStart) ;
			var percent = currentTime / song.duration;
	
			context.globalAlpha = 0.02;
			context.fillStyle ="#000";
			context.fillRect(0,0,canvas.width,canvas.height);		

			context.fillStyle = "#fff";
			context.globalAlpha = 1;

			context.beginPath();
			context.arc(125, frame, 40 * beatDetector.getFilter('Bass').beat, 0, 2 * Math.PI, false);						
			context.fill();

			context.beginPath();
			context.arc(250, frame, 40 * beatDetector.getFilter('Medium').beat, 0, 2 * Math.PI, false);						
			context.fill();

			context.beginPath();
			context.arc(375, frame, 40 * beatDetector.getFilter('Treble').beat, 0, 2 * Math.PI, false);						
			context.fill();


			


			var loudness = 0;
			if(beatDetector.getFilter('Bass').beat > loudness) loudness = beatDetector.getFilter('Bass').beat;
			if(beatDetector.getFilter('Medium').beat > loudness) loudness = beatDetector.getFilter('Medium').beat;
			if(beatDetector.getFilter('Treble').beat > loudness) loudness = beatDetector.getFilter('Treble').beat;

			context.fillStyle = 'hsl(0,100%,70%)';
			context.beginPath();
			context.arc(30, frame, 10 * loudness, 0, 2 * Math.PI, false);						
			context.fill();


			var pierce = calculatePierce(beatDetector.getFilter('Pierce').average);
			
			context.fillStyle = 'hsl(50,100%,70%)';
			context.beginPath();
			context.arc(470, frame, 10 * pierce, 0, 2 * Math.PI, false);						
			context.fill();



		

			context.fillStyle ="hsl(0,0%,10%)";
			context.fillRect(500,0,canvas.width*0.5,canvas.height);


			var stripes = canvas.height * 0.5 * Math.pow(pierce, 1.4);
			context.fillStyle ="hsl(0,0%,"+(10 + Math.pow(pierce, 1.4) * 10)+"%)";
			for (var i = 0; i < stripes; i++) {								
				context.fillRect(500,Math.floor(i/stripes * canvas.height),canvas.width*0.5,1);
				context.fillRect(500,Math.random() * canvas.height,canvas.width*0.5,1);
			};
			



			context.lineWidth = 2 + 5* loudness;
			context.strokeStyle = "#fff";	


			var x = 600;
			var y = canvas.height * 0.5;
			var length = 15;
			var amplitude = length * 0.6;// * beatDetector.getFilter('Treble').beat;
			var offset = length * 0.15 + length * 0.85 * pierce;
			for (var i = 0; i < 21; i++) {				
				var hStart = x + i * length;
				var hEnd = x + i * length + length;
				var vStart = y;
				var vEnd = y;

				var vCurve = y + (amplitude+ pierce * amplitude*1.2) * ((i%2 == 0) ? -1 : 1) ;
				
				var h1Curve = hStart + offset;
				var h2Curve = hEnd - offset;

				context.beginPath();
				context.moveTo(hStart, vStart);
				context.bezierCurveTo(h1Curve, vCurve, h2Curve, vCurve, hEnd, vEnd);
				context.stroke();
				
				/*context.beginPath();
				context.arc(hStart, vStart, 3, 0, 2 * Math.PI, false);						
				context.fill();
				context.beginPath();
				context.arc(h1Curve, vCurve, 3, 0, 2 * Math.PI, false);						
				context.fill();
				context.beginPath();
				context.arc(h2Curve, vCurve, 3, 0, 2 * Math.PI, false);						
				context.fill();
				context.beginPath();
				context.arc(hEnd, vEnd, 3, 0, 2 * Math.PI, false);						
				context.fill();*/
			};
			


			/*var total = beatDetector.getFilter('Bass').average + beatDetector.getFilter('Medium').average + beatDetector.getFilter('Treble').average;

			context.fillStyle ="#000";
			context.fillRect(0,490,500,10);
			context.fillStyle ='hsl(0,100%,80%)';
			var basstotal = 500 * beatDetector.getFilter('Bass').average / total;
			context.fillRect(0,490,basstotal,10);
			context.fillStyle ='hsl(120,100%,80%)';
			var mediumtotal = 500 * beatDetector.getFilter('Medium').average / total;
			context.fillRect(basstotal,490, mediumtotal ,10);
			context.fillStyle ='hsl(240,100%,80%)';
			var trebletotal = 500 * beatDetector.getFilter('Treble').average / total;
			context.fillRect(basstotal + mediumtotal ,490, trebletotal,10);*/
			

			frame+=2;
			if(frame > canvas.height -1) frame = 0;

			playback.gain = GlobalGui['Playback Gain'];

		}

		var calculatePierce = function (value) {
			var pierce = Math.pow(value * GlobalGui['Pierce Multiplier'], GlobalGui['Pierce Power']);
			if(pierce > 1) pierce = 1;
			else if(pierce < 0) pierce = 0;
			return pierce
		}

		
	}
	App.prototype = new BaseApp();
	return App;
});