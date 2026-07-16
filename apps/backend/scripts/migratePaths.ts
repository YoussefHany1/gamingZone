import { logger } from './lib/logger';

import * as fs from 'fs';

// 1. Update jobs
let f1 = fs.readFileSync('jobs/fetchRss.job', 'utf8');
f1 = f1.replace('./fetchRss.service', '../features/rss/rss.service');
fs.writeFileSync('jobs/fetchRss.job', f1);

let f2 = fs.readFileSync('jobs/fetchFreeGames.job', 'utf8');
f2 = f2.replace('./fetchFreeGames.service', '../features/freeGames/freeGames.service');
fs.writeFileSync('jobs/fetchFreeGames.job', f2);

let f3 = fs.readFileSync('jobs/weeklySummary.job', 'utf8');
f3 = f3.replace('./generateWeeklySummary.service', '../features/summary/summary.service');
fs.writeFileSync('jobs/weeklySummary.job', f3);

// 2. Update features/rss/rss.service
let rssService = fs.readFileSync('features/rss/rss.service', 'utf8');
rssService = rssService.replace(/require\("\.\/lib\//g, 'require("../../lib/');
rssService = rssService.replace(/require\("\.\/rss\//g, 'require("./');
fs.writeFileSync('features/rss/rss.service', rssService);

// 3. Update features/freeGames/freeGames.service
let freeGamesService = fs.readFileSync('features/freeGames/freeGames.service', 'utf8');
freeGamesService = freeGamesService.replace(/require\("\.\/lib\//g, 'require("../../lib/');
freeGamesService = freeGamesService.replace(/require\("\.\/freeGames\//g, 'require("./');
fs.writeFileSync('features/freeGames/freeGames.service', freeGamesService);

// 4. Update features/summary/summary.service
let summaryService = fs.readFileSync('features/summary/summary.service', 'utf8');
summaryService = summaryService.replace(/require\("\.\/lib\//g, 'require("../../lib/');
fs.writeFileSync('features/summary/summary.service', summaryService);

// 5. Check rss/fetch
let rssFetch = fs.readFileSync('features/rss/fetch', 'utf8');
rssFetch = rssFetch.replace(/require\("\.\.\/lib\//g, 'require("../../lib/');
fs.writeFileSync('features/rss/fetch', rssFetch);

// 6. Check rss/helpers
let rssHelpers = fs.readFileSync('features/rss/helpers', 'utf8');
rssHelpers = rssHelpers.replace(/require\("\.\.\/lib\//g, 'require("../../lib/');
fs.writeFileSync('features/rss/helpers', rssHelpers);

// 7. Check freeGames/helpers
let fgHelpers = fs.readFileSync('features/freeGames/helpers', 'utf8');
fgHelpers = fgHelpers.replace(/require\("\.\.\/lib\//g, 'require("../../lib/');
fs.writeFileSync('features/freeGames/helpers', fgHelpers);

logger.info('Paths updated');
