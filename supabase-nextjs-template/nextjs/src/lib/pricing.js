class PricingService {
    static initialize() {
        var _a, _b, _c, _d;
        const names = ((_a = process.env.NEXT_PUBLIC_TIERS_NAMES) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
        const prices = ((_b = process.env.NEXT_PUBLIC_TIERS_PRICES) === null || _b === void 0 ? void 0 : _b.split(',').map(Number)) || [];
        const descriptions = ((_c = process.env.NEXT_PUBLIC_TIERS_DESCRIPTIONS) === null || _c === void 0 ? void 0 : _c.split(',')) || [];
        const features = ((_d = process.env.NEXT_PUBLIC_TIERS_FEATURES) === null || _d === void 0 ? void 0 : _d.split(',').map(f => f.split('|'))) || [];
        const popularTier = process.env.NEXT_PUBLIC_POPULAR_TIER;
        this.tiers = names.map((name, index) => ({
            name,
            price: prices[index],
            description: descriptions[index],
            features: features[index] || [],
            popular: name === popularTier
        }));
    }
    static getAllTiers() {
        if (this.tiers.length === 0) {
            this.initialize();
        }
        return this.tiers;
    }
    static getCommonFeatures() {
        var _a;
        return ((_a = process.env.NEXT_PUBLIC_COMMON_FEATURES) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
    }
    static formatPrice(price) {
        return `$${price}`;
    }
}
PricingService.tiers = [];
export default PricingService;
