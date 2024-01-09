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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomTraderAssortService = void 0;
const baseJson = __importStar(require("../db/base.json"));
const tsyringe_1 = require("C:/snapshot/project/node_modules/tsyringe");
const JsonUtil_1 = require("C:/snapshot/project/obj/utils/JsonUtil");
const BotHelper_1 = require("C:/snapshot/project/obj/helpers/BotHelper");
const BotWeaponGenerator_1 = require("C:/snapshot/project/obj/generators/BotWeaponGenerator");
const DatabaseServer_1 = require("C:/snapshot/project/obj/servers/DatabaseServer");
const traderHelpers_1 = require("./traderHelpers");
const ItemHelper_1 = require("C:/snapshot/project/obj/helpers/ItemHelper");
const thisTraderId = baseJson._id;
const traderHelper = new traderHelpers_1.TraderHelper();
let CustomTraderAssortService = class CustomTraderAssortService {
    jsonUtil;
    botHelper;
    botWeaponGenerator;
    databaseServer;
    itemHelper;
    pristineTraderAssorts = {};
    modConfig;
    constructor(jsonUtil, botHelper, botWeaponGenerator, databaseServer, itemHelper) {
        this.jsonUtil = jsonUtil;
        this.botHelper = botHelper;
        this.botWeaponGenerator = botWeaponGenerator;
        this.databaseServer = databaseServer;
        this.itemHelper = itemHelper;
    }
    defaultGetPristineTraderAssort(traderId) {
        return this.pristineTraderAssorts[traderId];
    }
    getPristineTraderAssort(traderId) {
        console.log("GETPRISTINETRADERASSORT");
        if (traderId !== thisTraderId) // Use existing registered logic for other traders
         {
            this.defaultGetPristineTraderAssort(traderId);
        }
        else {
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
    setPristineTraderAssort(traderId, assort) {
        console.log("set", traderId, assort);
        this.pristineTraderAssorts[traderId] = assort;
    }
    setModConfig(modConfig) {
        this.modConfig = modConfig;
    }
};
exports.CustomTraderAssortService = CustomTraderAssortService;
exports.CustomTraderAssortService = CustomTraderAssortService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)("JsonUtil")),
    __param(1, (0, tsyringe_1.inject)("BotHelper")),
    __param(2, (0, tsyringe_1.inject)("BotWeaponGenerator")),
    __param(3, (0, tsyringe_1.inject)("DatabaseServer")),
    __param(4, (0, tsyringe_1.inject)("ItemHelper")),
    __metadata("design:paramtypes", [typeof (_a = typeof JsonUtil_1.JsonUtil !== "undefined" && JsonUtil_1.JsonUtil) === "function" ? _a : Object, typeof (_b = typeof BotHelper_1.BotHelper !== "undefined" && BotHelper_1.BotHelper) === "function" ? _b : Object, typeof (_c = typeof BotWeaponGenerator_1.BotWeaponGenerator !== "undefined" && BotWeaponGenerator_1.BotWeaponGenerator) === "function" ? _c : Object, typeof (_d = typeof DatabaseServer_1.DatabaseServer !== "undefined" && DatabaseServer_1.DatabaseServer) === "function" ? _d : Object, typeof (_e = typeof ItemHelper_1.ItemHelper !== "undefined" && ItemHelper_1.ItemHelper) === "function" ? _e : Object])
], CustomTraderAssortService);
//# sourceMappingURL=CustomTraderAssortService.js.map