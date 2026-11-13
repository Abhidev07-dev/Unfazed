
require("dotenv").config();

const connectDB = require("./db");
const seedSubscriptionTiers = require("./seedSubscriptionTiers");

async function runSeeder() {
  try {
    await connectDB();
    await seedSubscriptionTiers();
    console.log("Subscription tier setup complete.");
    process.exit(0);
  } catch (error) {
    console.error("Subscription tier seeding failed:", error.message);
    process.exit(1);
  }
}

runSeeder();
