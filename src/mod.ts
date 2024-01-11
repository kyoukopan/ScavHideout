import { DependencyContainer, Lifecycle } from "tsyringe";
import JSON5 from "json5";
import path from "path";
import { ScavHideoutConfig } from "./types";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { PreAkiModLoader } from "@spt-aki/loaders/PreAkiModLoader";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ImageRouter } from "@spt-aki/routers/ImageRouter";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { ITraderConfig } from "@spt-aki/models/spt/config/ITraderConfig";
import { IRagfairConfig } from "@spt-aki/models/spt/config/IRagfairConfig";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";
import { DurabilityLimitsHelper } from "@spt-aki/helpers/DurabilityLimitsHelper";
import { TradeController } from "@spt-aki/controllers/TradeController";
import { IItemEventRouterResponse } from "@spt-aki/models/eft/itemEvent/IItemEventRouterResponse";
import { IProcessBaseTradeRequestData } from "@spt-aki/models/eft/trade/IProcessBaseTradeRequestData";
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import * as baseJson from "../db/base.json";
import { TraderHelper } from "./traderHelpers";
import { FluentAssortConstructor } from "./fluentTraderAssortCreator";
import { Traders } from "@spt-aki/models/enums/Traders";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import { readFileSync } from "fs";
import { IProcessBuyTradeRequestData } from "@spt-aki/models/eft/trade/IProcessBuyTradeRequestData";
import { TradeHelper } from "@spt-aki/helpers/TradeHelper";
import { IProcessSellTradeRequestData } from "@spt-aki/models/eft/trade/IProcessSellTradeRequestData";
import { TraderAssortHelper } from "@spt-aki/helpers/TraderAssortHelper";
import { Upd } from "@spt-aki/models/eft/common/tables/IItem";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import { BotWeaponGenerator } from "@spt-aki/generators/BotWeaponGenerator";
import { CustomTraderAssortService } from "./CustomTraderAssortService";

// Global trader ID, defined in base.json
const traderId = baseJson._id;
const configJson5 = readFileSync(path.resolve(__dirname, "../config/config.json5"), { encoding: "utf-8" });
const modConfig: ScavHideoutConfig = JSON5.parse(configJson5);

class ScavHideoutMod implements IPreAkiLoadMod, IPostDBLoadMod
{
    private mod: string
    private logger: ILogger
    private traderHelper: TraderHelper
    private fluentTraderAssortHelper: FluentAssortConstructor

    constructor() 
    {
        this.mod = "ScavHideout"; // Set name of mod so we can log it to console later
    }

    /**
     * Some work needs to be done prior to SPT code being loaded, registering the profile image + setting trader update time inside the trader config json
     * @param container Dependency container
     */
    public preAkiLoad(container: DependencyContainer): void
    {
        // Get a logger
        this.logger = container.resolve<ILogger>("WinstonLogger");
        this.logger.debug(`[${this.mod}] preAki Loading... `);

        // Get SPT code/data we need later
        const preAkiModLoader: PreAkiModLoader = container.resolve<PreAkiModLoader>("PreAkiModLoader");
        const imageRouter: ImageRouter = container.resolve<ImageRouter>("ImageRouter");
        const hashUtil: HashUtil = container.resolve<HashUtil>("HashUtil");
        const durabilityLimitsHelper: DurabilityLimitsHelper = container.resolve<DurabilityLimitsHelper>("DurabilityLimitsHelper");
        const itemHelper: ItemHelper = container.resolve<ItemHelper>("ItemHelper");
        const configServer = container.resolve<ConfigServer>("ConfigServer");
        const traderConfig: ITraderConfig = configServer.getConfig<ITraderConfig>(ConfigTypes.TRADER);
        const ragfairConfig = configServer.getConfig<IRagfairConfig>(ConfigTypes.RAGFAIR);
        const tradeHelper: TradeHelper = container.resolve<TradeHelper>("TradeHelper");
        const traderAssortHelper: TraderAssortHelper = container.resolve<TraderAssortHelper>("TraderAssortHelper");

        // Create helper class and use it to register our traders image/icon + set its stock refresh time
        this.traderHelper = new TraderHelper();
        this.fluentTraderAssortHelper = new FluentAssortConstructor(hashUtil, this.logger, durabilityLimitsHelper, itemHelper, modConfig);
        this.traderHelper.registerProfileImage(baseJson, this.mod, preAkiModLoader, imageRouter, "ScavHideout.jpg");
        this.traderHelper.setTraderUpdateTime(traderConfig, baseJson, modConfig.refreshTimeSeconds);

        // Add trader to trader enum
        Traders[traderId] = traderId;

        // Add trader to flea market
        ragfairConfig.traders[traderId] = false;

        container.afterResolution("TradeController", (_t, result: TradeController) => 
        {
            // Most logic is the same as default
            result.confirmTrading = (
                pmcData: IPmcData,
                request: IProcessBaseTradeRequestData,
                sessionID: string
            ): IItemEventRouterResponse => 
            {
                // buying
                if (request.type === "buy_from_trader")
                {
                    const buyData = <IProcessBuyTradeRequestData>request;
                    // Custom logic start -----
                    let upd: Upd = null;
                    if (request.tid === traderId) // Transfer item durability info for our trader items - by default, only Fence purchases preserve durability info
                    {
                        const item = itemHelper.findAndReturnChildrenAsItems(traderAssortHelper.getAssort(sessionID, buyData.tid).items, buyData.item_id)[0];
                        if (item.upd?.Repairable) upd = { Repairable: item.upd.Repairable }
                    }
                    // Custom logic end --------
                    return tradeHelper.buyItem(pmcData, buyData, sessionID, traderConfig.purchasesAreFoundInRaid, upd); // In the default logic, upd is undefined and defaults to null
                }

                // selling - no changes here
                if (request.type === "sell_to_trader")
                {
                    const sellData = <IProcessSellTradeRequestData>request;
                    return tradeHelper.sellItem(pmcData, pmcData, sellData, sessionID);
                }

                return null; 
            }
            // The modifier Always makes sure this replacement method is ALWAYS replaced
        }, {frequency: "Always"});

        this.logger.debug(`[${this.mod}] preAki Loaded`);            
    }
    
    /**
     * Majority of trader-related work occurs after the aki database has been loaded but prior to SPT code being run
     * @param container Dependency container
     */
    public postDBLoad(container: DependencyContainer): void
    {
        this.logger.debug(`[${this.mod}] postDb Loading... `);

        // Resolve SPT classes we'll use
        const databaseServer: DatabaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const configServer: ConfigServer = container.resolve<ConfigServer>("ConfigServer");
        const jsonUtil: JsonUtil = container.resolve<JsonUtil>("JsonUtil");
        const itemHelper = container.resolve<ItemHelper>("ItemHelper");
        const botHelper = container.resolve<BotHelper>("BotHelper");
        const botWeaponGenerator = container.resolve<BotWeaponGenerator>("BotWeaponGenerator");

        // Get a reference to the database tables
        const tables = databaseServer.getTables();

        // Add new trader to the trader dictionary in DatabaseServer w/ assort
        this.traderHelper.addTraderToDb(
            baseJson, 
            tables, 
            jsonUtil, 
            itemHelper, 
            this.fluentTraderAssortHelper,
            modConfig,
            botHelper,
            botWeaponGenerator
        );

        /**
        // Replace trader assort service with custom & reinitialize
        container.register("CustomTraderAssortService", { useValue: 
            new CustomTraderAssortService(traderId, modConfig, botHelper, jsonUtil, botWeaponGenerator, itemHelper)
        });
        container.register("TraderAssortService", { useToken: "CustomTraderAssortService" });
        const traderAssortService = container.resolve<CustomTraderAssortService>("TraderAssortService");
        
        for (const _traderId in tables.traders)
        {
            if (_traderId === "ragfair" || _traderId === Traders.LIGHTHOUSEKEEPER || _traderId === Traders.FENCE) continue;
            
            const trader = databaseServer.getTables().traders[_traderId];
            if (_traderId !== traderId && !traderAssortService.getPristineTraderAssort(traderId))
            {
                const assorts = jsonUtil.clone(trader.assort);
                traderAssortService.setPristineTraderAssort(traderId, assorts);
            }
        }
         */

        // Add new trader's insurance details to insurance config
        if (baseJson.insurance.availability) 
        {
            this.traderHelper.addTraderInsuranceConfig(
                {
                    _id: traderId,
                    insuranceMultiplier: modConfig.insurance.insuranceMultiplier,
                    returnChancePercent: modConfig.insurance.returnChancePercent
                }, 
                configServer);
        } 
        else 
        {
            this.traderHelper.resetTraderInsuranceConfig(traderId, configServer);
        }

        // Add trader to locale file, ensures trader text shows properly on screen
        // WARNING: adds the same text to ALL locales (e.g. chinese/french/english)
        this.traderHelper.addTraderToLocales(baseJson, tables, modConfig.traderDescription);

        this.logger.debug(`[${this.mod}] postDb Loaded`);
    }
}

module.exports = { mod: new ScavHideoutMod() }