"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraderHelper = void 0;
const dialogue_json_1 = __importDefault(require("../db/dialogue.json"));
const en_json_1 = __importDefault(require("../db/locales/global/en.json"));
const ConfigTypes_1 = require("C:/snapshot/project/obj/models/enums/ConfigTypes");
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
    addTraderToDb(traderDetailsToAdd, tables, jsonUtil) {
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
    /**
     * Create basic data for trader + add empty assorts table for trader
     * @param tables SPT db
     * @param jsonUtil SPT JSON utility class
     * @returns ITraderAssort
     */
    createAssortTable() {
        // Create a blank assort object, ready to have items added
        const assortTable = {
            nextResupply: 0,
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };
        return assortTable;
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
    addTraderDialogueFile() {
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
}
exports.TraderHelper = TraderHelper;
//# sourceMappingURL=traderHelpers.js.map