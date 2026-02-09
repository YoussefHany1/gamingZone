import { useState, useEffect } from "react";

/**
 * Custom hook for countdown timer
 * @param {number|string} targetDate - Unix timestamp in seconds or ISO date string
 * @param {number} updateInterval - Update interval in milliseconds (default: 1000 for 1 second)
 * @returns {object|null} - { days, hours, minutes, seconds } or null if date is invalid/past
 */
export const useCountdown = (targetDate, updateInterval = 1000) => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!targetDate) return null;

      // Handle both Unix timestamp (in seconds) and ISO date string
      let releaseDate;
      if (typeof targetDate === "number") {
        // Assume timestamp in seconds from IGDB API
        releaseDate = new Date(targetDate * 1000);
      } else {
        // ISO string or other date format
        releaseDate = new Date(targetDate);
      }

      const now = new Date();
      const distance = releaseDate - now;

      // If date is in the past, return null
      if (distance < 0) return null;

      // Calculate each time component
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    };

    // Set initial value
    setTimeLeft(calculateTimeLeft());

    // Update at specified interval
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [targetDate, updateInterval]);

  return timeLeft;
};

export default useCountdown;
