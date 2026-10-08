import { createRunner } from '../../_shared/runner';
import { runGenerateWeeklySummary } from '../../../scripts/features/summary/summary.service';

export default createRunner('weekly-summary', runGenerateWeeklySummary);