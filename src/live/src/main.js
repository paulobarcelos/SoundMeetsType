require(
[
	'App',
	'happy/app/Runner'
],
function (
	App,
	Runner
){

	var app = new App();
	app.container = document.getElementById('app')
	var runner = new Runner(app);
});