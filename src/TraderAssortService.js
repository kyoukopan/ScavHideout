"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraderAssortService = void 0;
class TraderAssortService {
    pristineTraderAssorts = {};
    getPristineTraderAssort(traderId) {
        return this.pristineTraderAssorts[traderId];
    }
    /**
     * Store trader assorts inside a class property
     * @param traderId Traderid to store assorts against
     * @param assort Assorts to store
     */
    setPristineTraderAssort(traderId, assort) {
        this.pristineTraderAssorts[traderId] = assort;
    }
}
exports.TraderAssortService = TraderAssortService;
//# sourceMappingURL=TraderAssortService.js.map