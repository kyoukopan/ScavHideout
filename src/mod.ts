import { DependencyContainer, Lifecycle } from "tsyringe";
import JSON5 from "json5";
import path from "path";
import { ScavHideoutConfig } from "./types";

// SPT types
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
import { TraderAssortService } from "@spt-aki/services/TraderAssortService";
import { BotWeaponGenerator } from "@spt-aki/generators/BotWeaponGenerator";
import { OnLoadModService } from "@spt-aki/services/mod/onLoad/OnLoadModService"

// New trader settings
import * as baseJson from "../db/base.json";
import { TraderHelper } from "./traderHelpers";
import { FluentAssortConstructor } from "./fluentTraderAssortCreator";
import { Money } from "@spt-aki/models/enums/Money";
import { Traders } from "@spt-aki/models/enums/Traders";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import { readFileSync } from "fs";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import { IPreAkiLoadModAsync } from "@spt-aki/models/external/IPreAkiLoadModAsync";
import { CustomTraderAssortService } from "./CustomTraderAssortService";
import { RagfairPriceService } from "@spt-aki/services/RagfairPriceService";
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";

// Global trader ID, defined in base.json
const traderId = baseJson._id;
const configJson5 = readFileSync(path.resolve(__dirname, "../config/config.json5"), { encoding: "utf-8" });
const modConfig: ScavHideoutConfig = JSON5.parse(configJson5);

class ScavHideoutMod implements IPreAkiLoadMod, IPostDBLoadMod
{
    private mod: string
    private logger: ILogger
    private traderHelper: TraderHelper
    private fluentTraderAssortHeper: FluentAssortConstructor

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
        const configServer = container.resolve<ConfigServer>("ConfigServer");
        const traderConfig: ITraderConfig = configServer.getConfig<ITraderConfig>(ConfigTypes.TRADER);
        const ragfairConfig = configServer.getConfig<IRagfairConfig>(ConfigTypes.RAGFAIR);

        // Create helper class and use it to register our traders image/icon + set its stock refresh time
        this.traderHelper = new TraderHelper();
        this.fluentTraderAssortHeper = new FluentAssortConstructor(hashUtil, this.logger);
        this.traderHelper.registerProfileImage(baseJson, this.mod, preAkiModLoader, imageRouter, "ScavHideout.jpg");
        this.traderHelper.setTraderUpdateTime(traderConfig, baseJson, modConfig.refreshTimeSeconds);

        // Add trader to trader enum
        Traders[traderId] = traderId;

        // Add trader to flea market
        ragfairConfig.traders[traderId] = false;


        this.logger.debug(`[${this.mod}] preAki Loaded`);

        const onLoadModService = container.resolve<OnLoadModService>("OnLoadModService");
        
                
            
            
        
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
        const botHelper: BotHelper = container.resolve<BotHelper>("BotHelper");
        const botWeaponGenerator = container.resolve<BotWeaponGenerator>("BotWeaponGenerator");
        const itemHelper = container.resolve<ItemHelper>("ItemHelper");

        // Get a reference to the database tables
        const tables = databaseServer.getTables();

        // Add new trader to the trader dictionary in DatabaseServer w/ assort
        this.traderHelper.addTraderToDb(baseJson, tables, jsonUtil, modConfig, botHelper, botWeaponGenerator, itemHelper, this.fluentTraderAssortHeper);

        this.logger.debug(`[${this.mod}] registering custom getPristineTraderAssort for trader refresh logic...`);
        const defaultTraderAssortService = container.resolve<TraderAssortService>("TraderAssortService");
        container.register<CustomTraderAssortService>("CustomTraderAssortService", CustomTraderAssortService, { lifecycle: Lifecycle.Singleton });
        const customTraderAssortService = container.resolve<CustomTraderAssortService>("CustomTraderAssortService")
        for (const trader of Object.values(Traders))
        {
            const assort = defaultTraderAssortService.getPristineTraderAssort(trader);
            if (trader)
            {
                customTraderAssortService.setPristineTraderAssort(trader, assort);
            }
            customTraderAssortService.setModConfig(modConfig);
        }
        container.register("TraderAssortService", { useToken: "CustomTraderAssortService" });
        this.logger.debug(`[${this.mod}] registered custom getPristineTraderAssort`);

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
        this.traderHelper.addTraderToLocales(baseJson, tables, modConfig.traderDescription, jsonUtil);

        this.logger.debug(`[${this.mod}] postDb Loaded`);
    }
}

module.exports = { mod: new ScavHideoutMod() }