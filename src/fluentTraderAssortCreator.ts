import { DurabilityLimitsHelper } from "@spt-aki/helpers/DurabilityLimitsHelper";
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";
import { Item } from "@spt-aki/models/eft/common/tables/IItem";
import { IBarterScheme, ITrader } from "@spt-aki/models/eft/common/tables/ITrader";
import { Money } from "@spt-aki/models/enums/Money";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import { ScavHideoutConfig } from "./types";

export class FluentAssortConstructor
{
    protected itemsToSell: Item[] = [];
    protected barterScheme: Record<string, IBarterScheme[][]> = {};
    protected loyaltyLevel: Record<string, number> = {};
    protected hashUtil: HashUtil;
    protected logger: ILogger;
    protected durabilityLimitsHelper: DurabilityLimitsHelper;
    protected itemHelper: ItemHelper;
    protected modConfig: ScavHideoutConfig;

    constructor(hashutil: HashUtil, logger: ILogger, durabilityLimitsHelper: DurabilityLimitsHelper, itemHelper: ItemHelper, modConfig: ScavHideoutConfig)
    {
        this.hashUtil = hashutil
        this.logger = logger;
        this.durabilityLimitsHelper = durabilityLimitsHelper;
        this.itemHelper = itemHelper;
        this.modConfig = modConfig;
    }
    
    /**
     * Start selling item with tpl
     * @param itemTpl Tpl id of the item you want trader to sell
     * @param itemId Optional - set your own Id, otherwise unique id will be generated
     */
    public createSingleAssortItem(itemTpl: string, itemId = undefined): FluentAssortConstructor
    {
        // Create item ready for insertion into assort table
        const newItemToAdd: Item = {
            _id: !itemId ? this.hashUtil.generate(): itemId,
            _tpl: itemTpl,
            parentId: "hideout", // Should always be "hideout"
            slotId: "hideout", // Should always be "hideout"
            upd: {
                UnlimitedCount: false,
                StackObjectsCount: 100
            }
        };

        this.itemsToSell.push(newItemToAdd);

        return this;
    }

    public createComplexAssortItem(items: Item[]): FluentAssortConstructor
    {
        items[0].parentId = "hideout";
        items[0].slotId = "hideout";

        if (!items[0].upd)
        {
            items[0].upd = {}
        }

        items[0].upd.UnlimitedCount = false;
        items[0].upd.StackObjectsCount = 100;

        this.itemsToSell.push(...items);

        return this;
    }

    public setWeaponDurability(): FluentAssortConstructor
    {
        const max = this.durabilityLimitsHelper.getRandomizedMaxWeaponDurability(undefined, "follower");
        const current = this.durabilityLimitsHelper.getRandomizedWeaponDurability(undefined, "follower", max);
        this.itemsToSell[0].upd.Repairable = { MaxDurability: max, Durability: current };

        return this;
    }

    public setArmorDurability(): FluentAssortConstructor
    {
        const template = this.itemHelper.getItem(this.itemsToSell[0]._tpl)[1];
        const max = this.durabilityLimitsHelper.getRandomizedMaxArmorDurability(template, "follower");
        const current = this.durabilityLimitsHelper.getRandomizedArmorDurability(template, "follower", max);
        this.itemsToSell[0].upd.Repairable = { MaxDurability: max, Durability: current };

        return this;
    }

    public addStackCount(stackCount: number): FluentAssortConstructor
    {
        this.itemsToSell[0].upd.StackObjectsCount = stackCount;

        return this;
    }

    public addUnlimitedStackCount(): FluentAssortConstructor
    {
        this.itemsToSell[0].upd.StackObjectsCount = 999999;
        this.itemsToSell[0].upd.UnlimitedCount = true;

        return this;
    }

    public makeStackCountUnlimited(): FluentAssortConstructor
    {
        this.itemsToSell[0].upd.StackObjectsCount = 999999;

        return this;
    }

    public addBuyRestriction(maxBuyLimit: number): FluentAssortConstructor
    {
        this.itemsToSell[0].upd.BuyRestrictionMax = maxBuyLimit;
        this.itemsToSell[0].upd.BuyRestrictionCurrent = 0;

        return this;
    }

    public addLoyaltyLevel(level: number): FluentAssortConstructor
    {
        this.loyaltyLevel[this.itemsToSell[0]._id] = level;

        return this;
    }

    public addMoneyCost(currencyType: Money, amount: number): FluentAssortConstructor
    {
        this.barterScheme[this.itemsToSell[0]._id] = [
            [
                {
                    count: amount * this.modConfig.traderStockPriceMultiplier,
                    _tpl: currencyType
                }
            ]
        ];

        return this;
    }

    public addBarterCost(itemTpl: string, count: number): FluentAssortConstructor
    {
        const sellableItemId = this.itemsToSell[0]._id;

        // No data at all, create
        if (Object.keys(this.barterScheme).length === 0)
        {
            this.barterScheme[sellableItemId] = [[
                {
                    count: count,
                    _tpl: itemTpl
                }
            ]];
        }
        else
        {
            // Item already exists, add to
            const existingData = this.barterScheme[sellableItemId][0].find(x => x._tpl === itemTpl);
            if (existingData)
            {
                // itemtpl already a barter for item, add to count
                existingData.count+= count;
            }
            else
            {
                // No barter for item, add it fresh
                this.barterScheme[sellableItemId][0].push({
                    count: count,
                    _tpl: itemTpl
                })
            }
            
        }

        return this;
    }

    /**
     * Reset object ready for reuse
     */
    public export(data: ITrader): FluentAssortConstructor
    {
        const itemBeingSoldId = this.itemsToSell[0]._id;
        if (data.assort.items.find(x => x._id === itemBeingSoldId))
        {
            this.logger.error(`Unable to add complex item with item key ${this.itemsToSell[0]._id}, key already used`);

            return;
        }

        data.assort.items.push(...this.itemsToSell);
        data.assort.barter_scheme[itemBeingSoldId] = this.barterScheme[itemBeingSoldId];
        data.assort.loyal_level_items[itemBeingSoldId] = this.loyaltyLevel[itemBeingSoldId];

        this.itemsToSell = [];
        this.barterScheme = {};
        this.loyaltyLevel = {};

        return this;
    }
}