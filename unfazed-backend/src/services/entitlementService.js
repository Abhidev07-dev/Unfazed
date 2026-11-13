
const Therapist = require("../models/Therapist");
const SubscriptionTierConfig = require("../models/SubscriptionTierConfig");

async function getTherapistAndTier(therapistId) {
  const therapist = await Therapist.findById(therapistId)
    .select("subscription");

  if (!therapist) {
    return { error: "Therapist not found" };
  }

  const subscription = therapist.subscription || {};
  const tierKey = subscription.tier || "free";

  const tier = await SubscriptionTierConfig.findOne({ tierKey });

  if (!tier) {
    return { error: `Configuration for '${tierKey}' tier not found` };
  }

  return { therapist, subscription, tier };
}

async function canAccess(therapistId, featureKey) {
  const result = await getTherapistAndTier(therapistId);

  if (result.error) {
    return { allowed: false, reason: result.error };
  }

  const { subscription, tier } = result;

  if (!["active", "trial"].includes(subscription.status || "active")) {
    return {
      allowed: false,
      reason: "Subscription is not active",
      upgradeRequired: true,
      currentTier: tier.tierKey
    };
  }

  if (
    subscription.expiresAt &&
    new Date(subscription.expiresAt) <= new Date()
  ) {
    return {
      allowed: false,
      reason: "Subscription has expired",
      upgradeRequired: true,
      currentTier: tier.tierKey
    };
  }

  if (tier.features?.[featureKey] !== true) {
    return {
      allowed: false,
      reason: "This feature is not available on your current plan",
      upgradeRequired: true,
      currentTier: tier.tierKey
    };
  }

  return {
    allowed: true,
    currentTier: tier.tierKey
  };
}

async function getClientLimit(therapistId) {
  const result = await getTherapistAndTier(therapistId);

  if (result.error) {
    throw new Error(result.error);
  }

  return result.tier.caps?.activeClients ?? null;
}

module.exports = {
  canAccess,
  getClientLimit
};
