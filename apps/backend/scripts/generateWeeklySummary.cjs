const {
  runGenerateWeeklySummary,
} = require("./generateWeeklySummary.service.cjs");

runGenerateWeeklySummary()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal Error:", error);
    process.exit(1);
  });
