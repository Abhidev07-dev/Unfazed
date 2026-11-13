
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Session = require("../models/Session");
const Client = require("../models/Client");

const getAnalytics = async (req, res) => {
  try {
    const therapistId = new mongoose.Types.ObjectId(
      req.therapist.id || req.therapist._id
    );

    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - 5,
      1
    );

    // Revenue trend: paid payments grouped by month.
    const revenueResults = await Payment.aggregate([
      {
        $match: {
          therapist: therapistId,
          status: "paid",
          paidAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$paidAt" },
            month: { $month: "$paidAt" }
          },
          revenue: { $sum: "$amount" },
          payments: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const revenueByMonth = new Map(
      revenueResults.map((item) => [
        `${item._id.year}-${item._id.month}`,
        item
      ])
    );

    const revenueTrend = [];

    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(
        now.getFullYear(),
        now.getMonth() - 5 + i,
        1
      );

      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const result = revenueByMonth.get(`${year}-${month}`);

      revenueTrend.push({
        year,
        month,
        label: monthDate.toLocaleString("en", {
          month: "short",
          year: "numeric"
        }),
        revenue: result?.revenue || 0,
        payments: result?.payments || 0
      });
    }

    // Count client records belonging to this therapist.
    const clientResults = await Client.aggregate([
      { $match: { therapist: therapistId } },
      { $count: "total" }
    ]);

    const clientCount = clientResults[0]?.total || 0;

    // No-show rate among completed sessions and no-shows.
    const sessionResults = await Session.aggregate([
      {
        $match: {
          therapist: therapistId,
          status: { $in: ["completed", "no-show"] }
        }
      },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const completedSessions =
      sessionResults.find((item) => item._id === "completed")?.count || 0;

    const noShowSessions =
      sessionResults.find((item) => item._id === "no-show")?.count || 0;

    const eligibleSessions = completedSessions + noShowSessions;

    const noShowRate = eligibleSessions
      ? Number(((noShowSessions / eligibleSessions) * 100).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      analytics: {
        revenueTrend,
        clients: {
          total: clientCount,
          metric: "client_records",
          note: "This counts all client records because the current schema has no active/inactive status field."
        },
        sessions: {
          completed: completedSessions,
          noShows: noShowSessions,
          eligibleSessions,
          noShowRate
        }
      }
    });
  } catch (error) {
    console.error("Get analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load analytics"
    });
  }
};

module.exports = { getAnalytics };
