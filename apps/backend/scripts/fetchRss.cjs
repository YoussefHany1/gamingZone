const { runFetchRss } = require("./fetchRss.service.cjs");

runFetchRss()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal Error:", error);
    process.exit(1);
  });
