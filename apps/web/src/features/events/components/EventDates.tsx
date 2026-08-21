import { Calendar, Flag } from "lucide-react";
import { formatEventDate } from "../utils";

interface EventDatesProps {
  startTime: number;
  endTime: number;
  startsText?: string;
  endsText?: string;
  locale?: string;
}

export default function EventDates({ startTime, endTime, startsText = "Starts", endsText = "Ends", locale = "en" }: EventDatesProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 shadow-md glass-panel">
        <Calendar className="w-6 h-6 text-gray-400" />
        <div>
          <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            {startsText}
          </span>
          <span className="block text-sm font-medium text-white">
            {formatEventDate(startTime, locale)}
          </span>
        </div>
      </div>
      <div className="flex-1 flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 shadow-md glass-panel">
        <Flag className="w-6 h-6 text-gray-400" />
        <div>
          <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            {endsText}
          </span>
          <span className="block text-sm font-medium text-white">
            {formatEventDate(endTime, locale)}
          </span>
        </div>
      </div>
    </div>
  );
}
