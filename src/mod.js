"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const json5_1 = __importDefault(require("C:/snapshot/project/node_modules/json5"));
const path_1 = __importDefault(require("path"));
const ConfigTypes_1 = require("C:/snapshot/project/obj/models/enums/ConfigTypes");
const baseJson = __importStar(require("../db/base.json"));
const traderHelpers_1 = require("./traderHelpers");
const fluentTraderAssortCreator_1 = require("./fluentTraderAssortCreator");
const Traders_1 = require("C:/snapshot/project/obj/models/enums/Traders");
const fs_1 = require("fs");
const CustomTraderAssortService_1 = require("./CustomTraderAssortService");
// Global trader ID, defined in base.json
const traderId = baseJson._id;
const configJson5 = (0, fs_1.readFileSync)(path_1.default.resolve(__dirname, "../config/config.json5"), { encoding: "utf-8" });
const modConfig = json5_1.default.parse(configJson5);
class ScavHideoutMod {
    mod;
    logger;
    traderHelper;
    fluentTraderAssortHelper;
    constructor() {
        this.mod = "ScavHideout"; // Set name of mod so we can log it to console later
    }
    /**
     * Some work needs to be done prior to SPT code being loaded, registering the profile image + setting trader update time inside the trader config json
     * @param container Dependency container
     */
    preAkiLoad(container) {
        // Get a logger
        this.logger = container.resolve("WinstonLogger");
        this.logger.debug(`[${this.mod}] preAki Loading... `);
        // Get SPT code/data we need later
        const preAkiModLoader = container.resolve("PreAkiModLoader");
        const imageRouter = container.resolve("ImageRouter");
        const hashUtil = container.resolve("HashUtil");
        const durabilityLimitsHelper = container.resolve("DurabilityLimitsHelper");
        const itemHelper = container.resolve("ItemHelper");
        const configServer = container.resolve("ConfigServer");
        const traderConfig = configServer.getConfig(ConfigTypes_1.ConfigTypes.TRADER);
        const ragfairConfig = configServer.getConfig(ConfigTypes_1.ConfigTypes.RAGFAIR);
        const tradeHelper = container.resolve("TradeHelper");
        const traderAssortHelper = container.resolve("TraderAssortHelper");
        // Create helper class and use it to register our traders image/icon + set its stock refresh time
        this.traderHelper = new traderHelpers_1.TraderHelper();
        this.fluentTraderAssortHelper = new fluentTraderAssortCreator_1.FluentAssortConstructor(hashUtil, this.logger, durabilityLimitsHelper, itemHelper, modConfig);
        this.traderHelper.registerProfileImage(baseJson, this.mod, preAkiModLoader, imageRouter, "ScavHideout.jpg");
        this.traderHelper.setTraderUpdateTime(traderConfig, baseJson, modConfig.refreshTimeSeconds);
        // Add trader to trader enum
        Traders_1.Traders[traderId] = traderId;
        // Add trader to flea market
        ragfairConfig.traders[traderId] = false;
        container.afterResolution("TradeController", (_t, result) => {
            // Most logic is the same as default
            result.confirmTrading = (pmcData, request, sessionID) => {
                // buying
                if (request.type === "buy_from_trader") {
                    const buyData = request;
                    // Custom logic start -----
                    let upd = null;
                    if (request.tid === traderId) // Transfer item durability info for our trader items - by default, only Fence purchases preserve durability info
                     {
                        const item = itemHelper.findAndReturnChildrenAsItems(traderAssortHelper.getAssort(sessionID, buyData.tid).items, buyData.item_id)[0];
                        if (item.upd?.Repairable)
                            upd = { Repairable: item.upd.Repairable };
                    }
                    // Custom logic end --------
                    return tradeHelper.buyItem(pmcData, buyData, sessionID, traderConfig.purchasesAreFoundInRaid, upd); // In the default logic, upd is undefined and defaults to null
                }
                // selling - no changes here
                if (request.type === "sell_to_trader") {
                    const sellData = request;
                    return tradeHelper.sellItem(pmcData, pmcData, sellData, sessionID);
                }
                return null;
            };
            // The modifier Always makes sure this replacement method is ALWAYS replaced
        }, { frequency: "Always" });
        this.logger.debug(`[${this.mod}] preAki Loaded`);
    }
    /**
     * Majority of trader-related work occurs after the aki database has been loaded but prior to SPT code being run
     * @param container Dependency container
     */
    postDBLoad(container) {
        this.logger.debug(`[${this.mod}] postDb Loading... `);
        // Resolve SPT classes we'll use
        const databaseServer = container.resolve("DatabaseServer");
        const configServer = container.resolve("ConfigServer");
        const jsonUtil = container.resolve("JsonUtil");
        const itemHelper = container.resolve("ItemHelper");
        const botHelper = container.resolve("BotHelper");
        const botWeaponGenerator = container.resolve("BotWeaponGenerator");
        // Get a reference to the database tables
        const tables = databaseServer.getTables();
        // Add new trader to the trader dictionary in DatabaseServer w/ assort
        this.traderHelper.addTraderToDb(baseJson, tables, jsonUtil, itemHelper, this.fluentTraderAssortHelper, modConfig, botHelper, botWeaponGenerator);
        // Replace trader assort service with custom & reinitialize
        container.register("CustomTraderAssortService", { useValue: new CustomTraderAssortService_1.CustomTraderAssortService(traderId, modConfig, botHelper, jsonUtil, botWeaponGenerator, itemHelper)
        });
        container.register("TraderAssortService", { useToken: "CustomTraderAssortService" });
        const traderAssortService = container.resolve("TraderAssortService");
        for (const _traderId in tables.traders) {
            if (_traderId === "ragfair" || _traderId === Traders_1.Traders.LIGHTHOUSEKEEPER || _traderId === Traders_1.Traders.FENCE)
                continue;
            const trader = databaseServer.getTables().traders[_traderId];
            if (_traderId !== traderId && !traderAssortService.getPristineTraderAssort(traderId)) {
                const assorts = jsonUtil.clone(trader.assort);
                traderAssortService.setPristineTraderAssort(traderId, assorts);
            }
        }
        // Add new trader's insurance details to insurance config
        if (baseJson.insurance.availability) {
            this.traderHelper.addTraderInsuranceConfig({
                _id: traderId,
                insuranceMultiplier: modConfig.insurance.insuranceMultiplier,
                returnChancePercent: modConfig.insurance.returnChancePercent
            }, configServer);
        }
        else {
            this.traderHelper.resetTraderInsuranceConfig(traderId, configServer);
        }
        // Add trader to locale file, ensures trader text shows properly on screen
        // WARNING: adds the same text to ALL locales (e.g. chinese/french/english)
        this.traderHelper.addTraderToLocales(baseJson, tables, modConfig.traderDescription);
        this.logger.debug(`[${this.mod}] postDb Loaded`);
    }
}
module.exports = { mod: new ScavHideoutMod() };
//# sourceMappingURL=mod.js.map