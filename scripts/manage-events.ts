#!/usr/bin/env ts-node

/**
 * Event Management CLI Tool
 * 
 * Usage:
 *   npx tsx scripts/manage-events.ts list              # List all upcoming events
 *   npx tsx scripts/manage-events.ts cleanup           # Archive old events
 *   npx tsx scripts/manage-events.ts stats             # Show statistics
 *   npx tsx scripts/manage-events.ts delete-old        # Delete events older than 1 year
 *   npx tsx scripts/manage-events.ts update-dates      # Update sample events to this week
 */

import mongoose from "mongoose";
import Event from "../models/Event";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function connectDB() {
  if (!MONGODB_URI) {
    console.error("❌ MongoDB URI not found in environment variables");
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB\n");
}

async function listEvents() {
  const events = await Event.find({ isActive: true, status: "upcoming" })
    .sort({ eventDate: 1 })
    .limit(50);

  console.log(`📅 Upcoming Events (${events.length}):\n`);
  console.log("─".repeat(80));

  for (const event of events) {
    const date = new Date(event.eventDate);
    const dateStr = date.toLocaleDateString("en-US", { 
      weekday: "short", 
      month: "short", 
      day: "numeric" 
    });
    
    const daysAway = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const daysStr = daysAway === 0 ? "Today" : 
                    daysAway === 1 ? "Tomorrow" : 
                    daysAway < 0 ? `${Math.abs(daysAway)} days ago` :
                    `In ${daysAway} days`;

    const featured = event.isFeatured ? "⭐" : "  ";
    
    console.log(`${featured} ${dateStr} (${daysStr})`);
    console.log(`   ${event.name}`);
    console.log(`   📍 ${event.location?.venueName || event.location?.area || "Goa"}`);
    console.log(`   🎫 ${event.category} • ${event.details?.price || "$$"}`);
    console.log();
  }
}

async function showStats() {
  const total = await Event.countDocuments({ isActive: true });
  const upcoming = await Event.countDocuments({ 
    isActive: true, 
    status: "upcoming",
    eventDate: { $gte: new Date() }
  });
  const past = await Event.countDocuments({
    eventDate: { $lt: new Date() }
  });
  const featured = await Event.countDocuments({ isFeatured: true, isActive: true });

  // Category breakdown
  const byCategory = await Event.aggregate([
    { $match: { isActive: true, status: "upcoming" } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Source breakdown
  const bySource = await Event.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$externalSource", count: { $sum: 1 } } }
  ]);

  // This weekend
  const now = new Date();
  const daysUntilFriday = (5 - now.getDay() + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);
  
  const monday = new Date(friday);
  monday.setDate(friday.getDate() + 3);

  const thisWeekend = await Event.countDocuments({
    isActive: true,
    status: "upcoming",
    eventDate: { $gte: friday, $lt: monday }
  });

  console.log("📊 Event Statistics\n");
  console.log("═".repeat(50));
  console.log(`Total Events:        ${total}`);
  console.log(`Upcoming Events:     ${upcoming}`);
  console.log(`Past Events:         ${past}`);
  console.log(`Featured Events:     ${featured}`);
  console.log(`This Weekend:        ${thisWeekend}`);
  console.log("═".repeat(50));

  console.log("\n📁 By Category:");
  byCategory.forEach(cat => {
    console.log(`   ${cat._id || "uncategorized"}: ${cat.count}`);
  });

  console.log("\n🔗 By Source:");
  bySource.forEach(src => {
    console.log(`   ${src._id || "manual"}: ${src.count}`);
  });

  // Date range
  const oldest = await Event.findOne({ isActive: true, status: "upcoming" })
    .sort({ eventDate: 1 });
  const newest = await Event.findOne({ isActive: true, status: "upcoming" })
    .sort({ eventDate: -1 });

  if (oldest && newest) {
    console.log("\n📅 Date Range:");
    console.log(`   Earliest: ${oldest.eventDate.toLocaleDateString()} - ${oldest.name}`);
    console.log(`   Latest:   ${newest.eventDate.toLocaleDateString()} - ${newest.name}`);
  }
}

async function cleanup() {
  console.log("🧹 Cleaning up old events...\n");

  // Archive events older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await Event.updateMany(
    {
      eventDate: { $lt: thirtyDaysAgo },
      status: "upcoming"
    },
    {
      $set: {
        status: "completed",
        isActive: false
      }
    }
  );

  console.log(`✅ Archived ${result.modifiedCount} old events (30+ days past)`);
}

async function deleteOld() {
  console.log("🗑️  Deleting very old events...\n");

  // Delete events older than 1 year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const result = await Event.deleteMany({
    eventDate: { $lt: oneYearAgo },
    status: "completed"
  });

  console.log(`✅ Deleted ${result.deletedCount} events older than 1 year`);
}

async function updateDates() {
  console.log("📅 Updating sample event dates to this week...\n");

  const now = new Date();
  const events = await Event.find({ externalSource: "manual" });

  let updated = 0;
  for (const event of events) {
    // Calculate days offset from original date
    const daysOffset = Math.floor(Math.random() * 14); // Random day in next 2 weeks
    const newDate = new Date(now);
    newDate.setDate(now.getDate() + daysOffset);

    await Event.findByIdAndUpdate(event._id, {
      $set: { eventDate: newDate }
    });
    updated++;
  }

  console.log(`✅ Updated ${updated} sample events to upcoming dates`);
}

async function main() {
  const command = process.argv[2] || "list";

  try {
    await connectDB();

    switch (command) {
      case "list":
        await listEvents();
        break;
      case "stats":
        await showStats();
        break;
      case "cleanup":
        await cleanup();
        break;
      case "delete-old":
        await deleteOld();
        break;
      case "update-dates":
        await updateDates();
        break;
      default:
        console.log("❌ Unknown command:", command);
        console.log("\nAvailable commands:");
        console.log("  list         - List upcoming events");
        console.log("  stats        - Show statistics");
        console.log("  cleanup      - Archive old events");
        console.log("  delete-old   - Delete events older than 1 year");
        console.log("  update-dates - Update sample events to this week");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  }
}

main();
