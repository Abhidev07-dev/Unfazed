
const subscriptionTiers = {
  free: {
    name: "Free",
    caps: {
      activeClients: 10
    },
    features: {
      clientManagement: true,
      scheduling: true,
      payments: true,
      clinicalNotes: true,
      advancedNotes: false,
      analytics: false,
      chat: false
    },
    analyticsDepth: "basic"
  },

  pro: {
    name: "Pro",
    caps: {
      activeClients: 100
    },
    features: {
      clientManagement: true,
      scheduling: true,
      payments: true,
      clinicalNotes: true,
      advancedNotes: true,
      analytics: true,
      chat: true
    },
    analyticsDepth: "standard"
  },

  premium: {
    name: "Premium",
    caps: {
      activeClients: null
    },
    features: {
      clientManagement: true,
      scheduling: true,
      payments: true,
      clinicalNotes: true,
      advancedNotes: true,
      analytics: true,
      chat: true
    },
    analyticsDepth: "advanced"
  }
};

module.exports = subscriptionTiers;
