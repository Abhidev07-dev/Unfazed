const SubscriptionTierConfig = require("../models/SubscriptionTierConfig");

const tiers = [
  {
    tierKey: "free",
    name: "Free",
    monthlyPrice: 0,
    billingPeriod: "monthly",
    caps: { activeClients: 10 },
    features: {
      clientManagement: true,
      scheduling: true,
      payments: true,
      clinicalNotes: true,
      advancedNotes: false,
      analytics: false,
      chat: false,
    },
    analyticsDepth: "basic",
  },
  {
    tierKey: "pro",
    name: "Pro",
    monthlyPrice: 499,
    billingPeriod: "monthly",
    caps: { activeClients: 100 },
    features: {
      clientManagement: true,
      scheduling: true,
      payments: true,
      clinicalNotes: true,
      advancedNotes: true,
      analytics: true,
      chat: true,
    },
    analyticsDepth: "standard",
  },
  {
    tierKey: "premium",
    name: "Premium",
    monthlyPrice: 999,
    billingPeriod: "monthly",
    caps: { activeClients: null },
    features: {
      clientManagement: true,
      scheduling: true,
      payments: true,
      clinicalNotes: true,
      advancedNotes: true,
      analytics: true,
      chat: true,
    },
    analyticsDepth: "advanced",
  },
];

async function seedSubscriptionTiers() {
  for (const tier of tiers) {
    await SubscriptionTierConfig.findOneAndUpdate(
      { tierKey: tier.tierKey },
      { $set: tier },
      { upsert: true, new: true, runValidators: true }
    );
  }

  console.log("Subscription tiers and prices seeded successfully.");
}

module.exports = seedSubscriptionTiers;