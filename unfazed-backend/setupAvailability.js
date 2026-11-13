require("dotenv").config();
const mongoose = require("mongoose");
const Availability = require("./src/models/Availability");

const therapist = "6ac13c3e50dac195507e7ef6";

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
      await Availability.findOneAndUpdate(
        { therapist, dayOfWeek },
        {
          $set: {
            therapist,
            dayOfWeek,
            startTime: "09:00",
            endTime: "17:00",
            sessionDuration: 60,
            bufferMinutes: 15,
            isActive: true
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log("Weekday availability saved successfully!");
  } catch (error) {
    console.error("Error:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
