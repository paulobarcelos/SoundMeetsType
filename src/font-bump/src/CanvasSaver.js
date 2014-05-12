define(
[
	'FileSaver'
],
function (
	FileSaver
){
	//"use strict"

	var CanvasSaver = function(){
		var self = this;

		var save = function( canvas, name ){  
			canvas.toBlob(function(blob){
				FileSaver(blob, '/test/'+name + '.png');
			})
			

		}

		Object.defineProperty(self, 'save', {
			value: save
		});
		
		
	}
	return CanvasSaver;
});