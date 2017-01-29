var windowsManager = require('windowsManager');
var StorageViewer = require('StorageViewer');

// WINDOWS
var AdminConsoleWindow = require('AdminConsoleWindow');
var ArenaWindow = require('ArenaWindow');
var BreedDetailWindow = require('BreedDetailWindow');
var BreedingWindow = require('BreedingWindow');
var CharacteristicsWindow = require('CharacteristicsWindow');
var CharacterSelectionWindow = require('CharacterSelectionWindow');
var GiftSelectionWindow = require('GiftSelectionWindow');
var DeleteCharacterConfirmWindow = require('DeleteCharacterConfirmWindow');
var CharacUpdateWindow = require('CharacUpdateWindow');
var DocumentWindow = require('DocumentWindow');
var EquipmentWindow = require('EquipmentWindow');
var EstateForSellWindow = require('EstateForSellWindow');
var EstateInformationWindow = require('EstateInformationWindow');
var FightEndWindow = require('FightEndWindow');
var FightListWindow = require('FightListWindow');
var GlobalWindow = require('GlobalWindow');
var GrimoireWindow = require('GrimoireWindow');
var PrismVulnerabilityDateWindow = require('SocialWindow/AllianceTab/PrismVulnerabilityDateWindow');
var SocialGroupCreationWindow = require('SocialGroupCreationWindow');
var AllianceCardWindow = require('AllianceCardWindow');
var GuildCardWindow = require('GuildCardWindow');
var GuildHouseInfoWindow = require('SocialWindow/GuildWindow/GuildHouseInfoWindow');
var GuildHouseSettingWindow = require('GuildHouseSettingWindow');
var GuildMemberRightsWindow = require('SocialWindow/GuildWindow/GuildMemberRightsWindow');
var HouseBuySellWindow = require('HouseBuySellWindow');
var ItemAppearanceWindow = require('ItemAppearanceWindow');
var ItemBoxWindow = require('ItemBoxWindow');
var ItemManageWindow = require('ItemManageWindow');
var ItemRecipesWindow = require('ItemRecipesWindow');
var ItemSetsWindow = require('ItemSetsWindow');
var LevelUpWindow = require('LevelUpWindow');
var PadlockWindow = require('PadlockWindow');
var PartyInviteDetailsWindow = require('PartyInviteDetailsWindow');
var PresetChooseIconWindow = require('PresetChooseIconWindow');
var RewardsPendingWindow = require('RewardsPendingWindow');
var ServerDetailsWindow = require('ServerDetailsWindow');
var ServerListSelectionWindow = require('ServerListSelectionWindow');
var ServerSelectionWindow = require('ServerSelectionWindow');
var ServerSimpleSelectionWindow = require('ServerSimpleSelectionWindow');
var TeleporterListWindow = require('TeleporterListWindow');
var ExchangeInventoryWindow = require('ExchangeInventoryWindow');
var ExchangeStorageWindow = require('ExchangeStorageWindow');
var TradeItemWindow = require('TradeItemWindow');
var TradeItemConfirmWindow = require('TradeItemConfirmWindow');
var TradeModeWindow = require('TradeModeWindow');
var TradeInventoryWindow = require('TradeInventoryWindow');
var TradeStorageWindow = require('TradeStorageWindow');
var WalletWindow = require('WalletWindow');
var BidHouseShopWindow = require('BidHouseShopWindow');
var WorldMapWindow = require('WorldMapWindow');
var SocialWindow = require('SocialWindow');
var PaddockBuyWindow = require('PaddockBuyWindow');
var MountWindow = require('MountWindow');
var FeedWindow = require('FeedWindow');
var MountRenameWindow = require('MountRenameWindow');
var FamilyTreeWindow = require('FamilyTreeWindow');
var JobOptionsWindow = require('JobOptionsWindow');
var SpellForgetWindow = require('SpellForgetWindow');
var CharacterCreationWindow = require('CharacterCreationWindow');
var CraftingWindow = require('CraftingWindow');
var CraftingMultiWindow = require('CraftingMultiWindow');
var CraftersListWindow = require('CraftersListWindow');
var CrafterWindow = require('CrafterWindow');
var CraftMagusWindow = require('CraftMagusWindow');
var CraftMagusMultiWindow = require('CraftMagusMultiWindow');
var CraftPaymentWindow = require('CraftPaymentWindow');
var CraftInventoryWindow = require('CraftInventoryWindow');
var TradeWithPlayerWindow = require('TradeWithPlayerWindow');
var TradeWithNPCWindow = require('TradeWithNPCWindow');
var TradeWithPlayerAndNPCInventoryWindow = require('TradeWithPlayerAndNPCInventoryWindow');
var CancelWindow = require('CancelWindow');
var OptionsWindow = require('OptionsWindow');
var FightEndRewardsWindow = require('FightEndRewardsWindow');
var HardcoreDeathWindow = require('HardcoreDeathWindow');
var ShopConfirmWindow = require('ShopConfirmWindow');
var MarketWindow = require('MarketWindow');
var BuyHardCurrencyConfirmWindow = require('BuyHardCurrencyConfirmWindow');
var PurchasesPendingWindow = require('PurchasesPendingWindow');

/**
 * @function attachWindows
 */
module.exports = function () {
	// Shared inventory UI
	var inventoryViewerShared = new StorageViewer({
		enablePresets: true,
		dataHandler: window.gui.playerData.inventory
	});
	var inventoryViewerExchangeStorage = new StorageViewer({
		enablePresets: false,
		dataHandler: null
	});
	var inventoryViewerFeed = new StorageViewer({
		enablePresets: false,
		dataHandler: window.gui.playerData.inventory
	});

	windowsManager.addWindow('breedDetail', new BreedDetailWindow());
	windowsManager.addWindow('breeding', new BreedingWindow(), { fixed: true, group: 'inventory' });
	windowsManager.addWindow('cancel', new CancelWindow());
	windowsManager.addWindow('characterCreation', new CharacterCreationWindow(), { fixed: true });
	windowsManager.addWindow('serverSimpleSelection', new ServerSimpleSelectionWindow(), { fixed: true });
	windowsManager.addWindow('serverListSelection', new ServerListSelectionWindow(), { fixed: true });
	windowsManager.addWindow('serverDetails', new ServerDetailsWindow());
	windowsManager.addWindow('serverSelection', new ServerSelectionWindow(), { fixed: true });
	windowsManager.addWindow('worldMap', new WorldMapWindow());
	windowsManager.addWindow('characteristics', new CharacteristicsWindow(), { group: 'mainGroup' });
	windowsManager.addWindow('characUpdate', new CharacUpdateWindow());
	windowsManager.addWindow('fightEnd', new FightEndWindow());
	windowsManager.addWindow('fightList', new FightListWindow());
	windowsManager.addWindow('itemAppearance', new ItemAppearanceWindow());
	windowsManager.addWindow('itemBox', new ItemBoxWindow());
	windowsManager.addWindow('itemManage', new ItemManageWindow());
	windowsManager.addWindow('itemRecipes', new ItemRecipesWindow());
	windowsManager.addWindow('itemSets', new ItemSetsWindow());
	windowsManager.addWindow('levelUp', new LevelUpWindow());
	windowsManager.addWindow('rewardsPending', new RewardsPendingWindow());
	windowsManager.addWindow('characterSelection', new CharacterSelectionWindow(), { fixed: true });
	windowsManager.addWindow('giftSelection', new GiftSelectionWindow(), { fixed: true });
	windowsManager.addWindow('deleteCharacterConfirm', new DeleteCharacterConfirmWindow(), { fixed: true });
	windowsManager.addWindow('options', new OptionsWindow());
	windowsManager.addWindow('adminConsole', new AdminConsoleWindow());
	windowsManager.addWindow('document', new DocumentWindow());
	windowsManager.addWindow('houseBuySell', new HouseBuySellWindow());
	windowsManager.addWindow('teleporterList', new TeleporterListWindow());
	windowsManager.addWindow(
		'exchangeInventory',
		new ExchangeInventoryWindow(inventoryViewerShared),
		{ group: 'inventory' });
	windowsManager.addWindow('exchangeStorage', new ExchangeStorageWindow(inventoryViewerExchangeStorage));
	windowsManager.addWindow('wallet', new WalletWindow());
	windowsManager.addWindow('tradeInventory', new TradeInventoryWindow(inventoryViewerShared), { group: 'inventory' });
	windowsManager.addWindow('tradeStorage', new TradeStorageWindow());
	windowsManager.addWindow('tradeMode', new TradeModeWindow());
	windowsManager.addWindow('tradeItem', new TradeItemWindow());
	windowsManager.addWindow('tradeItemConfirm', new TradeItemConfirmWindow());
	windowsManager.addWindow('bidHouseShop', new BidHouseShopWindow());
	windowsManager.addWindow('padlock', new PadlockWindow());
	windowsManager.addWindow('global', new GlobalWindow());
	windowsManager.addWindow('prismVulnerabilityDate', new PrismVulnerabilityDateWindow());
	windowsManager.addWindow('socialGroupCreation', new SocialGroupCreationWindow());
	windowsManager.addWindow('allianceCard', new AllianceCardWindow());
	windowsManager.addWindow('guildCard', new GuildCardWindow());
	windowsManager.addWindow('guildHouseInfo', new GuildHouseInfoWindow());
	windowsManager.addWindow('guildHouseSetting', new GuildHouseSettingWindow());
	windowsManager.addWindow('equipment', new EquipmentWindow(inventoryViewerShared), { group: 'inventory' });
	windowsManager.addWindow('estateForSale', new EstateForSellWindow());
	windowsManager.addWindow('estateInformation', new EstateInformationWindow());
	windowsManager.addWindow('partyInviteDetails', new PartyInviteDetailsWindow());
	windowsManager.addWindow('presetChooseIcon', new PresetChooseIconWindow());
	windowsManager.addWindow('arena', new ArenaWindow());
	windowsManager.addWindow('grimoire', new GrimoireWindow(), { group: 'mainGroup' });
	windowsManager.addWindow('social', new SocialWindow(), { group: 'mainGroup' });
	windowsManager.addWindow('paddockBuy', new PaddockBuyWindow());
	windowsManager.addWindow('mount', new MountWindow());
	windowsManager.addWindow('feed', new FeedWindow(inventoryViewerFeed));
	windowsManager.addWindow('mountRename', new MountRenameWindow());
	windowsManager.addWindow('familyTree', new FamilyTreeWindow());
	windowsManager.addWindow('jobOptions', new JobOptionsWindow());
	windowsManager.addWindow('spellForget', new SpellForgetWindow());
	windowsManager.addWindow('crafting', new CraftingWindow());
	windowsManager.addWindow('craftingMulti', new CraftingMultiWindow());
	windowsManager.addWindow('craftersList', new CraftersListWindow());
	windowsManager.addWindow('crafter', new CrafterWindow());
	windowsManager.addWindow('craftMagus', new CraftMagusWindow());
	windowsManager.addWindow('craftMagusMulti', new CraftMagusMultiWindow());
	windowsManager.addWindow('craftPayment', new CraftPaymentWindow());
	windowsManager.addWindow('craftInventory', new CraftInventoryWindow(inventoryViewerShared), { group: 'inventory' });
	windowsManager.addWindow('tradeWithNPC', new TradeWithNPCWindow());
	windowsManager.addWindow('tradeWithPlayer', new TradeWithPlayerWindow());
	windowsManager.addWindow(
		'tradeWithPlayerAndNPCInventory',
		new TradeWithPlayerAndNPCInventoryWindow(inventoryViewerShared),
		{ group: 'inventory' }
	);
	windowsManager.addWindow('guildMemberRights', new GuildMemberRightsWindow());
	windowsManager.addWindow('fightEndRewards', new FightEndRewardsWindow());
	windowsManager.addWindow('hardcoreDeath', new HardcoreDeathWindow());
	windowsManager.addWindow('purchasesPending', new PurchasesPendingWindow());
	windowsManager.addWindow('buyHardCurrencyConfirm', new BuyHardCurrencyConfirmWindow());
	windowsManager.addWindow('shopConfirm', new ShopConfirmWindow());
	windowsManager.addWindow('market', new MarketWindow());
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/Gui/attachWindows.js
 ** module id = 634
 ** module chunks = 0
 **/