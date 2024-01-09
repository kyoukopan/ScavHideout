export interface ScavHideoutConfig {
    traderDescription: string;
    insurance: {
        /** Determines base cost of insurance: Item price * insurance multiplier = base cost */
        insuranceMultiplier: number;
        /** Chance for an insured item to come back */
        returnChancePercent: number;
    };
    /** Trader refresh time */
    refreshTimeSeconds: number;
    /** Trader stock settings */
    assort: {
        weapons: {
            /** Amount of primary weapons to generate */
            primaryCount: number;
        }
    }
}
