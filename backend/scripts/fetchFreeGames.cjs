const { runFetchFreeGames } = require("./fetchFreeGames.service.cjs");

runFetchFreeGames()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal Error:", error);
    process.exit(1);
  });
