import { ITraderAssort } from "@spt-aki/models/eft/common/tables/ITrader";
import { ScavHideoutConfig } from "./types";
import { TraderHelper } from "./traderHelpers";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { BotWeaponGenerator } from "@spt-aki/generators/BotWeaponGenerator";
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";

export class CustomTraderAssortService
{
    protected pristineTraderAssorts: Record<string, ITraderAssort> = {};
    protected traderHelper: TraderHelper;

    constructor(
        protected traderId: string,
        protected modConfig: ScavHideoutConfig,
        protected botHelper: BotHelper,
        protected jsonUtil: JsonUtil,
        protected botWeaponGenerator: BotWeaponGenerator,
        protected itemHelper: ItemHelper
    )
    {
        this.traderHelper = new TraderHelper();
    }

    public getPristineTraderAssort(traderId: string): ITraderAssort
    {
        console.log(" >> Get Pristine Trader Assort");
        if (traderId !== this.traderId)
        {
            return this.pristineTraderAssorts[traderId];
        }
        else
        {
            
            const assort = this.traderHelper.createAssortTable();
            this.traderHelper.generateWeaponsAndAddToAssort(
                assort,
                this.modConfig,
                this.botHelper,
                this.jsonUtil,
                this.botWeaponGenerator,
                this.itemHelper
            )
            console.log(" ASSORT GENERATED! Items: ", assort.items?.length )
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
        this.pristineTraderAssorts[traderId] = assort;
    }
}
