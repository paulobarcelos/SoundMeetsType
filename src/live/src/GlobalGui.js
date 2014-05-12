define(
[
	'happy/_libs/datgui',
	'text!settings.json'
],
function (
	GUI,
	settings
){
	"use strict";

	var Data = function(gui, GUI){
		var self = this,
		folders = {},
		callbacks = {},
		callbacksCallbacks = {};

		gui.remember(self);
		
		self.add = function(folderName, name, original, min, max, step){
			if(!folders[folderName]) self.folder(folderName);

			var controller;
			if(typeof min === 'undefined' && typeof max === 'undefined'){
				controller = folders[folderName].add(self, self.property(name, original));
			}
			else if(typeof min !== 'undefined' && typeof max === 'undefined'){
				controller = folders[folderName].add(self, self.property(name, original), min); // We can use this for array controls
			}
			else {
				controller = folders[folderName].add(self, self.property(name, original), min, max);
			}
			if(typeof step !== 'undefined') controller.step(step);

			self.registerController(controller, name);
			
		}
		self.addColor = function(folderName, name, original){
			if(!folders[folderName]) self.folder(folderName);
			var controller = folders[folderName].addColor(self, self.property(name, original));
			self.registerController(controller, name);
		}
		self.registerController = function(controller, name){
			if(!callbacks[name]) callbacks[name] = function(value){
				for (var i = 0; i < callbacksCallbacks[name].length; i++) {
					callbacksCallbacks[name][i].call(this, value);
				};
			}
			if(!callbacksCallbacks[name]) callbacksCallbacks[name] = [];
			controller.onChange(callbacks[name]);
		}
		self.addCallback = function(name, callback){
			if(!callbacksCallbacks[name]) callbacksCallbacks[name] = [];
			callbacksCallbacks[name].push(callback);
		}

		self.property = function(name, value){
			self[name] = value;
			return name;
		}
		self.folder = function(name){
			folders[name] = gui.addFolder(name);
			return folders[name];
		}

		
		self.gui = gui;
		self.GUI = GUI;
		
	}
	var gui = new GUI({
		load: JSON.parse(settings),
		preset: 'Default'
	});

	GUI.toggleHide();
	var data = new Data(gui, GUI);

	// Fix bug in style
	var fix = document.createElement('style');
	fix.innerHTML = '.dg.a.has-save ul .folder ul {	margin-top: 0;}';
	fix.innerHTML += '.dg.ac {z-index: 2 !important;}';
	document.body.appendChild(fix);
	
	return data;
});