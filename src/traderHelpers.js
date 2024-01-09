"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraderHelper = void 0;
const dialogue_json_1 = __importDefault(require("../db/dialogue.json"));
const en_json_1 = __importDefault(require("../db/locales/global/en.json"));
const ConfigTypes_1 = require("C:/snapshot/project/obj/models/enums/ConfigTypes");
const EquipmentSlots_1 = require("C:/snapshot/project/obj/models/enums/EquipmentSlots");
const Money_1 = require("C:/snapshot/project/obj/models/enums/Money");
const assort_json_1 = __importDefault(require("../db/assort.json"));
const AmmoTypes_1 = require("C:/snapshot/project/obj/models/enums/AmmoTypes");
const crypto_1 = require("crypto");
class TraderHelper {
    /**
     * Add profile picture to our trader
     * @param baseJson json file for trader (db/base.json)
     * @param preAkiModLoader mod loader class - used to get the mods file path
     * @param imageRouter image router class - used to register the trader image path so we see their image on trader page
     * @param traderImageName Filename of the trader icon to use
     */
    registerProfileImage(baseJson, modName, preAkiModLoader, imageRouter, traderImageName) {
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
    setTraderUpdateTime(traderConfig, baseJson, refreshTimeSeconds) {
        // Add refresh time in seconds to config
        const traderRefreshRecord = {
            traderId: baseJson._id,
            seconds: refreshTimeSeconds
        };
        traderConfig.updateTime.push(traderRefreshRecord);
    }
    /**
     * Add our new trader to the database
     * @param traderDetailsToAdd trader details
     * @param tables database
     * @param jsonUtil json utility class
     */
    // rome-ignore lint/suspicious/noExplicitAny: traderDetailsToAdd comes from base.json, so no type
    addTraderToDb(traderDetailsToAdd, tables, jsonUtil, modConfig, botHelper, botWeaponGenerator, itemHelper, fluentTraderAssortHeper) {
        // Add trader to trader table, key is the traders id
        tables.traders[traderDetailsToAdd._id] = {
            assort: this.createAssortTable(),
            base: jsonUtil.deserialize(jsonUtil.serialize(traderDetailsToAdd)),
            questassort: {
                started: {},
                success: {},
                fail: {}
            },
            dialogue: dialogue_json_1.default
        };
        this.generateWeaponsAndAddToAssort(tables.traders[traderDetailsToAdd._id].assort, modConfig, botHelper, jsonUtil, botWeaponGenerator, itemHelper);
        const looseAmmo = [
            AmmoTypes_1.Ammo12Gauge.BUCKSHOT_7MM,
            AmmoTypes_1.Ammo12Gauge.BMG_SLUG_50CAL,
            AmmoTypes_1.Ammo20Gauge.BUCKSHOT_75MM,
            AmmoTypes_1.Ammo20Gauge.POLEVA_3_SLUG,
            AmmoTypes_1.Ammo9x19.PSO_GZH,
            AmmoTypes_1.Ammo556x45.MK255_MOD_0_RRLP,
        ];
        const boxAmmo = [
            "5737273924597765dd374461",
            "57372e4a24597768553071c2",
            "64acea2c03378853630da53e" // 7.62x39 HP x20
        ];
        for (const ammo of looseAmmo) {
            const roll = (0, crypto_1.randomInt)(1, 5);
            const count = roll <= 3 ? (0, crypto_1.randomInt)(60, 121) : (0, crypto_1.randomInt)(30, 61);
            fluentTraderAssortHeper.createSingleAssortItem(ammo)
                .addStackCount(count)
                .addMoneyCost(Money_1.Money.ROUBLES, itemHelper.getItemPrice(ammo))
                .addLoyaltyLevel(1)
                .export(tables.traders[traderDetailsToAdd._id]);
        }
        for (const box of boxAmmo) {
            const count = (0, crypto_1.randomInt)(2, 6);
            fluentTraderAssortHeper.createSingleAssortItem(box)
                .addStackCount(count)
                .addMoneyCost(Money_1.Money.ROUBLES, itemHelper.getItemPrice(box))
                .addLoyaltyLevel(1)
                .export(tables.traders[traderDetailsToAdd._id]);
        }
    }
    /**
     * Adds trader's insurance details to the config server's insurance config
     */
    addTraderInsuranceConfig(traderInsuranceDetails, configServer) {
        const insuranceConfig = configServer.getConfig(ConfigTypes_1.ConfigTypes.INSURANCE);
        insuranceConfig.insuranceMultiplier[traderInsuranceDetails._id] = traderInsuranceDetails.insuranceMultiplier;
        insuranceConfig.returnChancePercent[traderInsuranceDetails._id] = traderInsuranceDetails.returnChancePercent;
    }
    /**
     * Adds trader's insurance details to the config server's insurance config
     */
    resetTraderInsuranceConfig(traderId, configServer) {
        const insuranceConfig = configServer.getConfig(ConfigTypes_1.ConfigTypes.INSURANCE);
        delete insuranceConfig.insuranceMultiplier[traderId];
        delete insuranceConfig.returnChancePercent[traderId];
    }
    generateWeaponsAndAddToAssort(assort, modConfig, botHelper, jsonUtil, botWeaponGenerator, itemHelper) {
        // Generate scav weapons
        const { primaryCount } = modConfig.assort.weapons;
        const scavJsonTemplate = jsonUtil.clone(botHelper.getBotTemplate("assault"));
        scavJsonTemplate.inventory.mods = {};
        for (let i = 0; i < primaryCount; i++) {
            const randWpnTpl = botWeaponGenerator.pickWeightedWeaponTplFromPool(EquipmentSlots_1.EquipmentSlots.FIRST_PRIMARY_WEAPON, scavJsonTemplate.inventory);
            const generatedWpn = botWeaponGenerator.generateWeaponByTpl(null, randWpnTpl, "hideout", scavJsonTemplate.inventory, "hideout", scavJsonTemplate.chances.mods, "assault", false, 1);
            let wpnId;
            let price;
            // Set count & add to item assort
            for (const item of generatedWpn.weapon) {
                if (item._tpl === randWpnTpl) // Weapon base item
                 {
                    wpnId = item._id;
                    item.upd.StackObjectsCount = 1;
                    item.upd.UnlimitedCount = false;
                    price = itemHelper.getItemPrice(item._tpl);
                    const qualityModifier = itemHelper.getItemQualityModifier(item);
                    price *= qualityModifier;
                }
                assort.items.push(item);
            }
            // Add price to barter assort
            assort.barter_scheme[wpnId] = [[{ _tpl: Money_1.Money.ROUBLES, count: price }]];
            // Assign LL
            assort.loyal_level_items[wpnId] = 1;
            console.log(generatedWpn.weapon, assort.barter_scheme[generatedWpn.weaponTemplate._id]);
        }
    }
    /**
     * Create basic data for trader + add empty assorts table for trader
     * @param tables SPT db
     * @param jsonUtil SPT JSON utility class
     * @returns ITraderAssort
     */
    createAssortTable() {
        return { ...assort_json_1.default, nextResupply: 0 };
    }
    /**
     * Create a weapon from scratch, ready to be added to trader
     * @returns Item[]
     */
    createGlock() {
        // Create an array ready to hold weapon + all mods
        const glock = [];
        // Add the base first
        glock.push({
            _id: "glockBase",
            _tpl: "5a7ae0c351dfba0017554310" // This is the weapons tpl, found on: https://db.sp-tarkov.com/search
        });
        // Add barrel
        glock.push({
            _id: "glockbarrel",
            _tpl: "5a6b60158dc32e000a31138b",
            parentId: "glockBase",
            slotId: "mod_barrel" // Required for mods, you need to define what 'role' they have
        });
        // Add reciever
        glock.push({
            _id: "glockReciever",
            _tpl: "5a9685b1a2750c0032157104",
            parentId: "glockBase",
            slotId: "mod_reciever"
        });
        // Add compensator
        glock.push({
            _id: "glockCompensator",
            _tpl: "5a7b32a2e899ef00135e345a",
            parentId: "glockReciever",
            slotId: "mod_muzzle"
        });
        // Add Pistol grip
        glock.push({
            _id: "glockPistolGrip",
            _tpl: "5a7b4960e899ef197b331a2d",
            parentId: "glockBase",
            slotId: "mod_pistol_grip"
        });
        // Add front sight
        glock.push({
            _id: "glockRearSight",
            _tpl: "5a6f5d528dc32e00094b97d9",
            parentId: "glockReciever",
            slotId: "mod_sight_rear"
        });
        // Add rear sight
        glock.push({
            _id: "glockFrontSight",
            _tpl: "5a6f58f68dc32e000a311390",
            parentId: "glockReciever",
            slotId: "mod_sight_front"
        });
        // Add magazine
        glock.push({
            _id: "glockMagazine",
            _tpl: "630769c4962d0247b029dc60",
            parentId: "glockBase",
            slotId: "mod_magazine"
        });
        return glock;
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
    addTraderToLocales(baseJson, tables, description, jsonUtil) {
        // For each language, add locale for the new trader
        const locales = Object.values(tables.locales.global);
        for (const locale of locales) {
            locale[`${baseJson._id} FullName`] = baseJson.name;
            locale[`${baseJson._id} FirstName`] = baseJson.nickname;
            locale[`${baseJson._id} Nickname`] = baseJson.nickname;
            locale[`${baseJson._id} Location`] = baseJson.location;
            locale[`${baseJson._id} Description`] = description;
            Object.entries(en_json_1.default).forEach(([key, str]) => {
                locale[key] = str;
            });
        }
    }
    extendGetPristineTraderAssort(thisTraderId, defaultService, modConfig, botWeaponGenerator, jsonUtil, botHelper, logger) {
        return (traderId) => {
            if (traderId !== thisTraderId) // Use existing registered logic for other traders
             {
                return defaultService.getPristineTraderAssort(traderId);
            }
            else {
                // Get non-generated assort
                const assort = { ...defaultService.getPristineTraderAssort(traderId) };
                // Generate scav weapons
                const { primaryCount, pistolCount } = modConfig.assort.weapons;
                const scavJsonTemplate = jsonUtil.clone(botHelper.getBotTemplate("assault"));
                scavJsonTemplate.inventory.mods = {}; // Don't generate mods
                const templateInventory = scavJsonTemplate.inventory;
                for (let i = 0; i < primaryCount; i++) {
                    const randWpnTpl = botWeaponGenerator.pickWeightedWeaponTplFromPool(EquipmentSlots_1.EquipmentSlots.FIRST_PRIMARY_WEAPON, templateInventory);
                    const generatedWpn = botWeaponGenerator.generateWeaponByTpl(null, randWpnTpl, "hideout", templateInventory, "hideout", {
                        /* eslint-disable @typescript-eslint/naming-convention */
                        mod_charge: 0,
                        mod_equipment: 0,
                        mod_equipment_000: 0,
                        mod_equipment_001: 0,
                        mod_equipment_002: 0,
                        mod_flashlight: 0,
                        mod_foregrip: 0,
                        mod_launcher: 0,
                        mod_magazine: 0,
                        mod_mount: 0,
                        mod_mount_000: 0,
                        mod_mount_001: 0,
                        mod_muzzle: 0,
                        mod_nvg: 0,
                        mod_pistol_grip: 0,
                        mod_reciever: 0,
                        mod_scope: 0,
                        mod_scope_000: 0,
                        mod_scope_001: 0,
                        mod_scope_002: 0,
                        mod_scope_003: 0,
                        mod_sight_front: 0,
                        mod_sight_rear: 0,
                        mod_stock: 0,
                        mod_stock_000: 0,
                        mod_stock_akms: 0,
                        mod_tactical: 0,
                        mod_tactical_000: 0,
                        mod_tactical_001: 0,
                        mod_tactical_002: 0,
                        mod_tactical_003: 0,
                        mod_handguard: 0
                        /* eslint-enable @typescript-eslint/naming-convention */
                    }, "assault", false, 1);
                    assort.items.push(generatedWpn.weapon[0]);
                }
                return assort;
            }
        };
    }
}
exports.TraderHelper = TraderHelper;
//# sourceMappingURL=traderHelpers.js.map