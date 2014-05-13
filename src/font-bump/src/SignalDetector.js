define(
[
],
function (
){
	"use strict"


	var SignalDetector = function(){
		var 
		self = this,
		value,
		lastValue,
		ascending,
		peak,
		valley,
		lastVariation;

		var init = function () {
			value = 0;
			lastValue = 0;
			ascending = false;
			peak = 0;
			valley = 0;
			lastVariation = 'valley';
		}

		var update = function(v) {
			value = v;

			ascending = value > lastValue;
			if(ascending && lastVariation == 'valley'){
				lastVariation = 'peak';
				peak = 1;
			}
			else peak = 0;
			if(!ascending && lastVariation == 'peak'){
				lastVariation = 'valley';
				valley = 1;
			}
			else valley = 0;

			lastValue = value;
			
		}

		var getPeak = function () {
			return peak;
		}
		var getValley = function () {
			return valley;
		}
		var getAscending = function () {
			return ascending;
		}		
		
		Object.defineProperty(self, 'update', {
			value: update
		});
		Object.defineProperty(self, 'peak', {
			get: getPeak
		});
		Object.defineProperty(self, 'valley', {
			get: getValley
		});
		Object.defineProperty(self, 'ascending', {
			get: getAscending
		});

		init();
		
	}
	return SignalDetector;
});