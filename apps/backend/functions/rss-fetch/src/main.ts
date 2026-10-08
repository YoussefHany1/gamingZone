import { createRunner } from '../../_shared/runner';
import { runFetchRss } from '../../../scripts/features/rss/rss.service';

export default createRunner('rss', runFetchRss);