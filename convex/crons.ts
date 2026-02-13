import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Crawl all markets Mon + Thu at 6 AM MT (12:00 UTC)
crons.cron(
  "crawl-all-markets",
  "0 12 * * 1,4",
  internal.actions.scheduleCrawls.run,
  {}
);

export default crons;
