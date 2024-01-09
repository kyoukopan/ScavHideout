import { ITraderAssort } from "@spt-aki/models/eft/common/tables/ITrader";
import * as baseJson from "../db/base.json";
import { ScavHideoutConfig } from "./types";
import { inject, injectable } from "tsyringe";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import { BotWeaponGenerator } from "@spt-aki/generators/BotWeaponGenerator";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { TraderHelper } from "./traderHelpers";
import { RagfairPriceService } from "@spt-aki/services/RagfairPriceService";
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";

const thisTraderId = baseJson._id;
const traderHelper = new TraderHelper();

@injectable()
export class CustomTraderAssortService
{
    protected pristineTraderAssorts: Record<string, ITraderAssort> = {};

    protected modConfig: ScavHideoutConfig;

    constructor(
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
        @inject("BotHelper") protected botHelper: BotHelper,
        @inject("BotWeaponGenerator") protected botWeaponGenerator: BotWeaponGenerator,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("ItemHelper") protected itemHelper: ItemHelper
    )
    {}

    public defaultGetPristineTraderAssort(traderId: string): ITraderAssort
    {
        return this.pristineTraderAssorts[traderId];
    }

    public getPristineTraderAssort(
        traderId: string
    ): ITraderAssort
    {
        console.log("GETPRISTINETRADERASSORT");
        if (traderId !== thisTraderId) // Use existing registered logic for other traders
        {
            this.defaultGetPristineTraderAssort(traderId);
        }
        else
        {
            // Get non-generated assort
            const assort = { barter_scheme: {}, items: [], loyal_level_items: {}, nextResupply: 0 };
              
            traderHelper.generateWeaponsAndAddToAssort(assort, this.modConfig, this.botHelper, this.jsonUtil, this.botWeaponGenerator, this.itemHelper);

            this.setPristineTraderAssort(thisTraderId, assort);
            return assort;
        }
        
    }

    /**
     * Store trader assorts inside a class property
     * @param traderId Traderid to store assorts against
     * @param assort Assorts to store
     */
    public setPristineTraderAssort(traderId: string, assort: ITraderAssort): void
    {
        console.log("set", traderId, assort)
        this.pristineTraderAssorts[traderId] = assort;
    }

    public setModConfig(modConfig: ScavHideoutConfig): void
    {
        this.modConfig = modConfig;
    }
}
