"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomTraderAssortService = void 0;
const traderHelpers_1 = require("./traderHelpers");
class CustomTraderAssortService {
    traderId;
    modConfig;
    botHelper;
    jsonUtil;
    botWeaponGenerator;
    itemHelper;
    pristineTraderAssorts = {};
    traderHelper;
    constructor(traderId, modConfig, botHelper, jsonUtil, botWeaponGenerator, itemHelper) {
        this.traderId = traderId;
        this.modConfig = modConfig;
        this.botHelper = botHelper;
        this.jsonUtil = jsonUtil;
        this.botWeaponGenerator = botWeaponGenerator;
        this.itemHelper = itemHelper;
        this.traderHelper = new traderHelpers_1.TraderHelper();
    }
    getPristineTraderAssort(traderId) {
        console.log(" >> Get Pristine Trader Assort");
        if (traderId !== this.traderId) {
            return this.pristineTraderAssorts[traderId];
        }
        else {
            const assort = this.traderHelper.createAssortTable();
            this.traderHelper.generateWeaponsAndAddToAssort(assort, this.modConfig, this.botHelper, this.jsonUtil, this.botWeaponGenerator, this.itemHelper);
            console.log(" ASSORT GENERATED! Items: ", assort.items?.length);
            return assort;
        }
    }
    /**
     * Store trader assorts inside a class property
     * @param traderId Traderid to store assorts against
     * @param assort Assorts to store
     */
    setPristineTraderAssort(traderId, assort) {
        this.pristineTraderAssorts[traderId] = assort;
    }
}
exports.CustomTraderAssortService = CustomTraderAssortService;
//# sourceMappingURL=CustomTraderAssortService.js.map