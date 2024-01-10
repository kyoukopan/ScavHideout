import dialogueJson from "../db/dialogue.json";
import enLocaleJson from "../db/locales/global/en.json";
import { PreAkiModLoader } from "@spt-aki/loaders/PreAkiModLoader";
import { Item } from "@spt-aki/models/eft/common/tables/IItem";
import { ITraderBase, ITraderAssort } from "@spt-aki/models/eft/common/tables/ITrader";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { ITraderConfig, UpdateTime } from "@spt-aki/models/spt/config/ITraderConfig";
import { IInsuranceConfig } from "@spt-aki/models/spt/config/IInsuranceConfig";
import { IDatabaseTables } from "@spt-aki/models/spt/server/IDatabaseTables";
import { ImageRouter } from "@spt-aki/routers/ImageRouter";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";
import { Money } from "@spt-aki/models/enums/Money";
import assort from "../db/assort.json";
import { FluentAssortConstructor } from "./fluentTraderAssortCreator";
import { Ammo12Gauge, Ammo20Gauge, Ammo366TKM, Ammo556x45, Ammo9x19 } from "@spt-aki/models/enums/AmmoTypes";
import { Weapons12Gauge, Weapons20Gauge, Weapons366TKM, Weapons762x39, Weapons762x54R, Weapons9x18, Weapons9x19 } from "@spt-aki/models/enums/WeaponTypes";
import { randomInt } from "crypto";

export class TraderHelper
{

    /**
     * Add profile picture to our trader
     * @param baseJson json file for trader (db/base.json)
     * @param preAkiModLoader mod loader class - used to get the mods file path
     * @param imageRouter image router class - used to register the trader image path so we see their image on trader page
     * @param traderImageName Filename of the trader icon to use
     */
    public registerProfileImage(baseJson: any, modName: string, preAkiModLoader: PreAkiModLoader, imageRouter: ImageRouter, traderImageName: string): void
    {
        // Reference the mod "res" folder
        const imageFilepath = `./${preAkiModLoader.getModPath(modName)}res`;

        // Register a route to point to the profile picture - remember to remove the .jpg from it
        imageRouter.addRoute(baseJson.avatar.replace(".jpg", ""), `${imageFilepath}/${traderImageName}`);
    }

    /**
     * Add record to trader config to set the refresh time of trader in seconds (default is 60 minutes)
     * @param traderConfig trader config to add our trader to
     * @param baseJson json file for trader (db/base.json)
     * @param refreshTimeSeconds How many sections between trader stock refresh
     */
    public setTraderUpdateTime(traderConfig: ITraderConfig, baseJson: any, refreshTimeSeconds: number): void
    {
        // Add refresh time in seconds to config
        const traderRefreshRecord: UpdateTime = {
            traderId: baseJson._id,
            seconds: refreshTimeSeconds };

        traderConfig.updateTime.push(traderRefreshRecord);
    }

    /**
     * Add our new trader to the database
     * @param traderDetailsToAdd trader details
     * @param tables database
     * @param jsonUtil json utility class
     */
    // rome-ignore lint/suspicious/noExplicitAny: traderDetailsToAdd comes from base.json, so no type
    public addTraderToDb(
        traderDetailsToAdd: any, 
        tables: IDatabaseTables, 
        jsonUtil: JsonUtil, 
        itemHelper: ItemHelper, 
        fluentTraderAssortHelper: FluentAssortConstructor
    ): void
    {
        // Add trader to trader table, key is the traders id
        tables.traders[traderDetailsToAdd._id] = {
            assort: this.createAssortTable(), // assorts are the 'offers' trader sells, can be a single item (e.g. carton of milk) or multiple items as a collection (e.g. a gun)
            base: jsonUtil.deserialize(jsonUtil.serialize(traderDetailsToAdd)) as ITraderBase, // Deserialise/serialise creates a copy of the json and allows us to cast it as an ITraderBase
            questassort: {
                started: {},
                success: {},
                fail: {}
            }, // questassort is empty as trader has no assorts unlocked by quests
            dialogue: dialogueJson
        };

        const looseAmmo = [
            Ammo12Gauge.BUCKSHOT_7MM,
            Ammo12Gauge.BMG_SLUG_50CAL,
            Ammo20Gauge.BUCKSHOT_75MM, 
            Ammo20Gauge.POLEVA_3_SLUG,
            Ammo9x19.PSO_GZH,
            Ammo556x45.MK255_MOD_0_RRLP,
            Ammo366TKM.FMJ
        ]

        const boxAmmo = [
            "573724b42459776125652ac2", // 9x18 PM P gzh x16
            "57372ebf2459776862260582", // 5.45x39 PS gs x30
            "64acea2c03378853630da53e", // 7.62x39 HP x20
            "64aceac0c4eda9354b0226b3" // 7.62x54R FMJ x20
        ]

        for (const ammo of looseAmmo)
        {
            const roll = randomInt(1, 5);
            const count = roll <= 3 ? randomInt(60, 121) : randomInt(30, 61);
            fluentTraderAssortHelper.createSingleAssortItem(ammo)
                .addStackCount(count)
                .addMoneyCost(Money.ROUBLES, itemHelper.getItemPrice(ammo))
                .addLoyaltyLevel(1)
                .export(tables.traders[traderDetailsToAdd._id]);
        }
        
        for (const box of boxAmmo)
        {
            const count = randomInt(2, 6);
            fluentTraderAssortHelper.createSingleAssortItem(box)
                .addStackCount(count)
                .addMoneyCost(Money.ROUBLES, itemHelper.getItemPrice(box))
                .addLoyaltyLevel(1)
                .export(tables.traders[traderDetailsToAdd._id]);
        }
        
        // Weapons
        const weapons: Item[][] = [];
        
        // Shotguns
        //MP-43-1C Double Barrel
        const mp431cId = "scavHideoutMp431C";
        const mp431c: Item[] = [
            { 
                _id: mp431cId, 
                _tpl: Weapons12Gauge.MP_43_1C, 
                parentId: "hideout", slotId: "hideout"
            },
            { _id: `${mp431cId}Barrel`, _tpl: "55d447bb4bdc2d892f8b456f", parentId: mp431cId, slotId: "mod_barrel" },
            { _id: `${mp431cId}Stock`, _tpl: "611a31ce5b7ffe001b4649d1", parentId: mp431cId, slotId: "mod_stock" }
        ];
        weapons.push(mp431c);

        //MP-133 Pump Action
        const mp133Id = "scavHideoutMp113";
        const mp133: Item[] = [
            { 
                _id: mp133Id, 
                _tpl: Weapons12Gauge.MP_133, 
                parentId: "hideout", slotId: "hideout"
            },
            { _id: `${mp133Id}Barrel`, _tpl: "55d4491a4bdc2d882f8b456e", parentId: mp133Id, slotId: "mod_barrel" },
            { _id: `${mp133Id}Forestock`, _tpl: "55d45d3f4bdc2d972f8b456c", parentId: mp133Id, slotId: "mod_handguard" },
            { _id: `${mp133Id}Magazine`, _tpl: "55d484b44bdc2d1d4e8b456d", parentId: mp133Id, slotId: "mod_magazine" },
            { _id: `${mp133Id}Stock`, _tpl: "56083cba4bdc2de22e8b456f", parentId: mp133Id, slotId: "mod_stock" }
        ];
        weapons.push(mp133);

        //TOZ-106 20ga
        const toz106id = "scavHideoutToz106";
        const toz106: Item[] = [
            { 
                _id: toz106id, 
                _tpl: Weapons20Gauge.TOZ_106, 
                parentId: "hideout", slotId: "hideout"
            },
            { _id: `${toz106id}Barrel`, _tpl: "55d4491a4bdc2d882f8b456e", parentId: toz106id, slotId: "mod_barrel" },
            { _id: `${toz106id}Magazine`, _tpl: "5a38ee51c4a282000c5a955c", parentId: toz106id, slotId: "mod_magazine" },
            { _id: `${toz106id}PistolGrip`, _tpl: "5a38eecdc4a282329a73b512", parentId: `${toz106id}Stock`, slotId: "mod_pistol_grip" },
            { _id: `${toz106id}Stock`, _tpl: "5a38ef1fc4a282000b1521f6", parentId: toz106id, slotId: "mod_stock" }
        ];
        weapons.push(toz106);

        // Car-beans
        // VPO-209 .366
        const vpo209id = "scavHideoutVpo209";
        const vpo209: Item[] = [
            { 
                _id: vpo209id, 
                _tpl: Weapons366TKM.VPO_209, 
                parentId: "hideout", slotId: "hideout"
            },
            { _id: `${vpo209id}GasBlock`, _tpl: "59e649f986f77411d949b246", parentId: vpo209id, slotId: "mod_gas_block" },
            { _id: `${vpo209id}HandGuard`, _tpl: "59e898ee86f77427614bd225", parentId: `${vpo209id}GasBlock`, slotId: "mod_handguard" },
            { _id: `${vpo209id}Muzzle`, _tpl: "59e8a00d86f7742ad93b569c", parentId: vpo209id, slotId: "mod_muzzle" },
            { _id: `${vpo209id}PistolGrip`, _tpl: "59e6318286f77444dd62c4cc", parentId: vpo209id, slotId: "mod_pistol_grip" },
            { _id: `${vpo209id}Receiver`, _tpl: "59e6449086f7746c9f75e822", parentId: vpo209id, slotId: "mod_reciever" },
            { _id: `${vpo209id}SightRear`, _tpl: "59e8977386f77415a553c453", parentId: vpo209id, slotId: "mod_sight_rear" },
            { _id: `${vpo209id}Magazine`, _tpl: "5b1fd4e35acfc40018633c39", parentId: vpo209id, slotId: "mod_magazine" },
            { _id: `${vpo209id}Stock`, _tpl: "59e89d0986f77427600d226e", parentId: vpo209id, slotId: "mod_stock" }
        ];
        weapons.push(vpo209);
        
        // VPO-136 Vepr-KM 7.62x39
        const vpo136id = "scavHideoutVpo136";
        const vpo136: Item[] = [
            { 
                _id: vpo136id, 
                _tpl: Weapons762x39.VPO_136, 
                parentId: "hideout", slotId: "hideout"
            }
        ];
        weapons.push(vpo136);

        // SMGeez
        // Saiga-9 9x19
        const saiga9id = "scavHideoutSaiga9";
        const saiga9: Item[] = [
            { 
                _id: saiga9id, 
                _tpl: Weapons9x19.SAIGA_9, 
                parentId: "hideout", slotId: "hideout"
            },
            { _id: `${saiga9id}PistolGrip`, _tpl: "5998517986f7746017232f7e", parentId: saiga9id, slotId: "mod_pistol_grip" },
            { _id: `${saiga9id}Stock`, _tpl: "599851db86f77467372f0a18", parentId: saiga9id, slotId: "mod_stock" },
            { _id: `${saiga9id}Magazine`, _tpl: "5998529a86f774647f44f421", parentId: saiga9id, slotId: "mod_magazine" },
            { _id: `${saiga9id}Muzzle`, _tpl: "5998598e86f7740b3f498a86", parentId: saiga9id, slotId: "mod_muzzle" },
            { _id: `${saiga9id}Receiver`, _tpl: "59985a8086f77414ec448d1a", parentId: saiga9id, slotId: "mod_reciever" },
            { _id: `${saiga9id}SightRear`, _tpl: "599860e986f7743bb57573a6", parentId: saiga9id, slotId: "mod_sight_rear" },
            { _id: `${saiga9id}GasBlock`, _tpl: "59ccd11386f77428f24a488f", parentId: saiga9id, slotId: "mod_gas_block" },
            { _id: `${saiga9id}HandGuard`, _tpl: "5648b1504bdc2d9d488b4584", parentId: `${saiga9id}GasBlock`, slotId: "mod_handguard" }
        ];
        weapons.push(saiga9);
        
        // Bolt Action
        // Mosin (Infantry)
        const mosinId = "scavHideoutMosin";
        const mosin: Item[] = [
            { 
                _id: mosinId, 
                _tpl: Weapons762x54R.MOSIN_INFANTRY, 
                parentId: "hideout", slotId: "hideout"
            },
            { _id: `${mosinId}Magazine`, _tpl: "5ae0973a5acfc4001562206c", parentId: mosinId, slotId: "mod_magazine" },
            { _id: `${mosinId}Stock`, _tpl: "5bfd35380db83400232fe5cc", parentId: mosinId, slotId: "mod_stock" },
            { _id: `${mosinId}Barrel`, _tpl: "5ae09bff5acfc4001562219d", parentId: mosinId, slotId: "mod_barrel" },
            { _id: `${mosinId}SightFront`, _tpl: "5ae099875acfc4001714e593", parentId: `${mosinId}Barrel`, slotId: "mod_sight_front" },
            { _id: `${mosinId}SightRear`, _tpl: "5ae099925acfc4001a5fc7b3", parentId: `${mosinId}Barrel`, slotId: "mod_sight_rear" }
        ];
        weapons.push(mosin);

        // Pistols
        // Makarov PM 9x18
        const makarovId = "scavHideoutMakarov";
        const makarov: Item[] = [
            { 
                _id: makarovId, 
                _tpl: Weapons9x18.PM, 
                parentId: "hideout", slotId: "hideout"
            },
            { _id: `${makarovId}Magazine`, _tpl: "5448c12b4bdc2d02308b456f", parentId: makarovId, slotId: "mod_magazine" },
            { _id: `${makarovId}Receiver`, _tpl: "6374a822e629013b9c0645c8", parentId: makarovId, slotId: "mod_reciever" },
            { _id: `${makarovId}SightRear`, _tpl: "63c6adcfb4ba094317063742", parentId: `${makarovId}Receiver`, slotId: "mod_sight_rear" },
            { _id: `${makarovId}PistolGrip`, _tpl: "6374a7e7417239a7bf00f042", parentId: makarovId, slotId: "pistol_grip" }
        ];
        weapons.push(makarov);

        for (const weapon of weapons)
        {
            fluentTraderAssortHelper.createComplexAssortItem(weapon)
                .addStackCount(randomInt(1, 3))
                .addMoneyCost(Money.ROUBLES, itemHelper.getItemPrice(weapon[0]._tpl))
                .setWeaponDurability()
                .addLoyaltyLevel(1)
                .export(tables.traders[traderDetailsToAdd._id]);
        }

        // Armor
        const armors: Item[] = [];
        
        // Vests
        // Kora-Kulon Camo lv. 3
        const koraKulon: Item = { 
            _id: "scavHideoutKoraKulon", 
            _tpl: "64be79e2bf8412471d0d9bcc", 
            parentId: "hideout", slotId: "hideout"
        };
        armors.push(koraKulon);
        
        // BNTI Module-3M lv. 2
        const bnti3m: Item = { 
            _id: "scavHideoutBnti3M", 
            _tpl: "59e7635f86f7742cbf2c1095",
            parentId: "hideout", slotId: "hideout"
        };
        armors.push(bnti3m);

        for (const armor of armors)
        {
            fluentTraderAssortHelper.createSingleAssortItem(armor._tpl)
                .addStackCount(randomInt(1, 3))
                .addMoneyCost(Money.ROUBLES, itemHelper.getItemPrice(armor._tpl))
                .setArmorDurability()
                .addLoyaltyLevel(1)
                .export(tables.traders[traderDetailsToAdd._id]);
        }

        // Other Gear
        const gear: string[] = [
            "5e4abfed86f77406a2713cf7", // Tarzan
            "572b7adb24597762ae139821", // Scav Vest
            "59e7711e86f7746cae05fbe1", // Kolpak-1S Riot Helmet
            "57513f07245977207e26a311", // APPLE JUICE!!!
            "57347d9c245977448b40fa85", // HERRING!
            "62a09f32621468534a797acb" // BEER!!!
        ];

        for (const item of gear)
        {
            fluentTraderAssortHelper.createSingleAssortItem(item)
                .addStackCount(randomInt(1, 5))
                .addMoneyCost(Money.ROUBLES, itemHelper.getItemPrice(item))
                .addLoyaltyLevel(1)
                .export(tables.traders[traderDetailsToAdd._id]);
        }
    }

    /**
     * Adds trader's insurance details to the config server's insurance config
     */
    public addTraderInsuranceConfig(
        traderInsuranceDetails: { _id: string; insuranceMultiplier: number; returnChancePercent: number }, 
        configServer: ConfigServer
    ): void
    {
        const insuranceConfig = configServer.getConfig<IInsuranceConfig>(ConfigTypes.INSURANCE);
        insuranceConfig.insuranceMultiplier[traderInsuranceDetails._id] = traderInsuranceDetails.insuranceMultiplier;
        insuranceConfig.returnChancePercent[traderInsuranceDetails._id] = traderInsuranceDetails.returnChancePercent;
    }

    /**
     * Adds trader's insurance details to the config server's insurance config
     */
    public resetTraderInsuranceConfig(
        traderId: string,        
        configServer: ConfigServer
    ): void
    {
        const insuranceConfig = configServer.getConfig<IInsuranceConfig>(ConfigTypes.INSURANCE);
        delete insuranceConfig.insuranceMultiplier[traderId];
        delete insuranceConfig.returnChancePercent[traderId];
    }

    /**
     * Create basic data for trader + add empty assorts table for trader
     * @param tables SPT db
     * @param jsonUtil SPT JSON utility class
     * @returns ITraderAssort
     */
    private createAssortTable(): ITraderAssort
    {
        return { ...assort, nextResupply: 0 };
    }

    /**
     * Add traders name/location/description to the locale table
     * @param baseJson json file for trader (db/base.json)
     * @param tables database tables
     * @param fullName Complete name of trader
     * @param firstName First name of trader
     * @param nickName Nickname of trader
     * @param location Location of trader (e.g. "Here in the cat shop")
     * @param description Description of trader
     */
    public addTraderToLocales(baseJson: Omit<ITraderBase, "refreshTraderRagfairOffers">, tables: IDatabaseTables, description: string): void
    {
        // For each language, add locale for the new trader
        const locales = Object.values(tables.locales.global) as Record<string, string>[];
        for (const locale of locales) 
        {
            locale[`${baseJson._id} FullName`] = baseJson.name;
            locale[`${baseJson._id} FirstName`] = baseJson.nickname;
            locale[`${baseJson._id} Nickname`] = baseJson.nickname;
            locale[`${baseJson._id} Location`] = baseJson.location;
            locale[`${baseJson._id} Description`] = description;
            Object.entries(enLocaleJson).forEach(([key, str]) => 
            {
                locale[key] = str;
            })
        }  
    }
}