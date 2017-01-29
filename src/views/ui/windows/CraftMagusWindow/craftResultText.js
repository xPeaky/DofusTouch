var createEffectInstances = require('effectInstanceFactory').createEffectInstances;
var getText = require('getText').getText;
var MagicPoolStatusEnum = require('MagicPoolStatusEnum');

function hasEffectMinMax(effects) {
	for (var i = 0; i < effects.length; i += 1) {
		if (effects[i]._type === 'ObjectEffectMinMax' || effects[i]._type === 'EffectInstanceMinMax') {
			return effects[i];
		}
	}
	return null;
}

function filterByType(effect) {
	return effect._type === 'ObjectEffectInteger' || effect._type === 'EffectInstanceInteger';
}

exports.display = function (oldItem, newItem, craftResultMessage) {
	var chat = window.gui.chat;
	var oldEffects = oldItem.effects;
	var newEffects = newItem.effects;

	var oldEffectMinMax = hasEffectMinMax(oldEffects);
	var newEffectMinMax = hasEffectMinMax(newEffects);

	// has new element effect, display craft success (for smithmagic element potion)
	if (oldEffectMinMax && newEffectMinMax && oldEffectMinMax.actionId !== newEffectMinMax.actionId) {
		return chat.logMsg(getText('ui.craft.success'));
	}

	var oldEffectsMap = {};
	var newEffectsMap = {};

	// TODO:
	// In flash client (CraftFrame.as), they handle ObjectEffectDice, is for repair durability of item,
	// currently cannot manage to trigger and test the condition, so we did not handle it, review
	// this again once we know about the feature

	oldEffects = oldEffects.filter(filterByType);
	newEffects = newEffects.filter(filterByType);

	oldEffects.forEach(function (effect) {
		oldEffectsMap[effect.actionId] = effect;
	});
	newEffects.forEach(function (effect) {
		newEffectsMap[effect.actionId] = effect;
	});

	var success = false;
	var i, actionId, diff, effect, value, valueChangedList = [], comparedList = [];

	// comparing old effects with the new effects, save the difference, and save to comparedList
	for (i = 0; i < oldEffects.length; i += 1) {
		effect = oldEffects[i];
		actionId = effect.actionId;
		value = effect.value;

		var oldValue = parseInt(effect.effect.operator + effect.value, 10);

		if (newEffectsMap.hasOwnProperty(actionId)) {
			var newValue = parseInt(newEffectsMap[actionId].effect.operator + newEffectsMap[actionId].value, 10);
			diff = newValue - oldValue;
		} else {
			diff = -oldValue;
		}

		if (diff) {
			valueChangedList.push({
				_type: effect._type,
				actionId: actionId,
				value: diff
			});

			if (diff > 0) {
				success = true;
			}
		}

		comparedList.push(actionId);
	}

	// loop through new effects, ignore previously compared, the remains should be all new
	for (i = 0; i < newEffects.length; i += 1) {
		effect = newEffects[i];
		actionId = effect.actionId;

		if (comparedList.indexOf(actionId) >= 0) {
			continue;
		}

		value = effect.value;

		valueChangedList.push({
			_type: effect._type,
			actionId: actionId,
			value: value
		});

		if (value > 0) {
			success = true;
		}
	}

	var resultText = success ? getText('ui.craft.success') : getText('ui.craft.failure');

	createEffectInstances(valueChangedList, function (error, effectInstances) {
		if (error) {
			return console.error('Craft Magus: craftResultText cannot createItemInstances', error);
		}

		var effectInstance, description, valueChangedText = '';

		for (var i = 0; i < effectInstances.length; i += 1) {
			effectInstance = effectInstances[i];

			// do not display if bonusType is 0, logic from flash client CraftFrame.as
			if (effectInstance.effect.bonusType) {
				description = effectInstance.description;
				description = effectInstance.value > 0 ? '+' + description : description;
				valueChangedText += ' ' + description + ',';

				// a similar technique is used in Flash source to clean the output text (CraftFrame.as)
				valueChangedText = valueChangedText.replace('--', '-');
			}
		}

		var residualMagicText = '';

		if (craftResultMessage.magicPoolStatus === MagicPoolStatusEnum.MAGIC_POOL_INCREASE) {
			residualMagicText = ' +' + getText('ui.craft.smithResidualMagic');
		} else if (craftResultMessage.magicPoolStatus === MagicPoolStatusEnum.MAGIC_POOL_LOSS) {
			residualMagicText = ' -' + getText('ui.craft.smithResidualMagic');
		} else {
			// removing the comma of valueChangedText if we do not have residualMagicText
			valueChangedText = valueChangedText.substring(0, valueChangedText.length - 1);
		}

		valueChangedText += residualMagicText;

		if (valueChangedText) {
			resultText += getText('ui.common.colon');
		}

		chat.logMsg(resultText + valueChangedText);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CraftMagusWindow/craftResultText.js
 ** module id = 924
 ** module chunks = 0
 **/