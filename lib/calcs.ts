/**
 * Calculation Functions
 * 
 * This module contains pure math functions for calculating life progress metrics.
 * All functions are well-documented with JSDoc comments explaining the math behind them.
 * 
 * Key Concept: We visualize life as weeks because:
 * - It's granular enough to feel meaningful
 * - It's small enough to fit on a phone screen
 * - 80 years = 4,160 weeks (a comprehensible number)
 */

/**
 * Get current date in the specified timezone
 * Uses Intl.DateTimeFormat to convert UTC to target timezone
 * 
 * @param timezone - IANA timezone string (e.g., 'America/New_York', 'Asia/Tokyo')
 * @returns Date object representing current time in the specified timezone
 */
export function getDateInTimezone(timezone: string = 'UTC'): Date {
  const now = new Date();
  try {
    // Use Intl API to get date parts in target timezone. Some runtimes have
    // limited ICU and reject IANA timezones — fall back to machine time then.
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const dateParts: Record<string, string> = {};
    for (const { type, value } of formatter.formatToParts(now)) {
      dateParts[type] = value;
    }

    const d = new Date(
      `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`
    );
    if (!Number.isNaN(d.getTime())) return d;
  } catch {
    /* unsupported timezone — fall back below */
  }
  return now;
}

/**
 * Life expectancy constant (in years)
 * Based on global average life expectancy
 */
export const LIFE_EXPECTANCY_YEARS = 80;

/**
 * Total weeks in the expected lifespan
 * Calculation: 80 years × 52 weeks/year = 4,160 weeks
 */
export const TOTAL_WEEKS = LIFE_EXPECTANCY_YEARS * 52;

/**
 * Number of weeks in a standard year
 */
export const WEEKS_PER_YEAR = 52;

/**
 * Calculates the number of weeks lived since birth
 * 
 * Math explanation:
 * 1. Get the difference between today and birth date in milliseconds
 * 2. Convert milliseconds to days: ms / (1000 ms/s × 60 s/min × 60 min/hr × 24 hr/day)
 * 3. Convert days to weeks: days / 7
 * 4. Floor the result to get complete weeks only
 * 
 * @param birthDate - Birth date in YYYY-MM-DD format (ISO 8601)
 * @returns Number of complete weeks lived since birth
 * 
 * @example
 * calculateWeeksLived('1990-01-15') // Returns weeks lived since Jan 15, 1990
 */
export function calculateWeeksLived(birthDate: string, timezone: string = 'UTC'): number {
  // Parse the birth date string into a Date object
  const birth = new Date(birthDate);
  
  // Get today's date in the user's timezone
  const today = getDateInTimezone(timezone);
  
  // Calculate the difference in milliseconds
  const diffInMs = today.getTime() - birth.getTime();
  
  // Convert milliseconds to days
  // 1 day = 1000ms × 60s × 60min × 24hrs = 86,400,000 ms
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  
  // Convert days to weeks and round down to complete weeks
  const weeksLived = Math.floor(diffInDays / 7);
  
  return weeksLived;
}

/**
 * Calculates the percentage of life lived
 * 
 * Math explanation:
 * - Percentage = (weeks lived / total possible weeks) × 100
 * - Rounded to 1 decimal place for display purposes
 * 
 * @param weeksLived - Number of weeks lived (from calculateWeeksLived)
 * @returns Life percentage as a number (e.g., 24.7 for 24.7%)
 * 
 * @example
 * calculateLifePercentage(1040) // Returns 25.0 (25% of 4160 weeks)
 */
export function calculateLifePercentage(weeksLived: number): number {
  // Calculate raw percentage
  const percentage = (weeksLived / TOTAL_WEEKS) * 100;
  
  // Round to 1 decimal place
  return Math.round(percentage * 10) / 10;
}

/**
 * Calculates how many weeks are remaining in the expected lifespan
 * 
 * Math explanation:
 * - Remaining weeks = Total weeks (4160) - weeks already lived
 * - If negative (lived longer than expected), return 0
 * 
 * @param weeksLived - Number of weeks lived (from calculateWeeksLived)
 * @returns Number of weeks remaining until life expectancy
 * 
 * @example
 * calculateWeeksRemaining(1040) // Returns 3120 (4160 - 1040)
 */
export function calculateWeeksRemaining(weeksLived: number): number {
  const remaining = TOTAL_WEEKS - weeksLived;
  
  // Return 0 if the person has lived longer than the expected 80 years
  return Math.max(0, remaining);
}

/**
 * Gets the current week number within the current year (1-52)
 * 
 * Math explanation:
 * 1. Find the first day of the current year (January 1st)
 * 2. Calculate days elapsed since January 1st
 * 3. Convert days to weeks and add 1 (since we count from week 1, not week 0)
 * 4. Cap at 52 weeks maximum
 * 
 * @returns Current week number (1-52)
 * 
 * @example
 * getCurrentWeekOfYear() // Returns 1-52 depending on current date
 */
export function getCurrentWeekOfYear(timezone: string = 'UTC'): number {
  const today = getDateInTimezone(timezone);
  
  // Get January 1st of the current year
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  
  // Calculate days since start of year
  const diffInMs = today.getTime() - startOfYear.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  
  // Convert to weeks and add 1 (weeks are 1-indexed, not 0-indexed)
  const weekNumber = Math.floor(diffInDays / 7) + 1;
  
  // Cap at 52 weeks (edge case for end of year)
  return Math.min(weekNumber, WEEKS_PER_YEAR);
}

/**
 * Calculates which week of the year a person was born in (1-52)
 * Useful for aligning the "Year View" to start from birth week
 * 
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @returns Week number within the birth year (1-52)
 * 
 * @example
 * getBirthWeekOfYear('1990-03-15') // Returns week number of March 15th
 */
export function getBirthWeekOfYear(birthDate: string): number {
  const birth = new Date(birthDate);
  
  // Get January 1st of the birth year
  const startOfYear = new Date(birth.getFullYear(), 0, 1);
  
  // Calculate days since start of year
  const diffInMs = birth.getTime() - startOfYear.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  
  // Convert to weeks and add 1
  const weekNumber = Math.floor(diffInDays / 7) + 1;
  
  return Math.min(weekNumber, WEEKS_PER_YEAR);
}

/**
 * Calculates weeks lived in the current calendar year for "Year View"
 * 
 * Math explanation:
 * 1. Get current week of year (1-52)
 * 2. Get birth week of year (1-52)
 * 3. If current year is birth year, return difference
 * 4. Otherwise, return current week (all weeks of current year)
 * 
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @returns Number of weeks lived in the current year
 * 
 * @example
 * calculateWeeksInCurrentYear('2025-03-15') // If today is 2026-01-03, returns 1
 */
export function calculateWeeksInCurrentYear(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  
  // If we're in the birth year, calculate weeks since birth
  if (birth.getFullYear() === today.getFullYear()) {
    const currentWeek = getCurrentWeekOfYear();
    const birthWeek = getBirthWeekOfYear(birthDate);
    return currentWeek - birthWeek + 1; // +1 to include birth week
  }
  
  // Otherwise, all weeks up to current week have been lived
  return getCurrentWeekOfYear();
}

/**
 * Gets the current day of the year (1-365 or 1-366 for leap years)
 * 
 * Math explanation:
 * 1. Find the first day of the current year (January 1st)
 * 2. Calculate days elapsed since January 1st
 * 3. Add 1 because day counting starts at 1, not 0
 * 
 * @returns Current day number (1-365 or 1-366)
 * 
 * @example
 * getCurrentDayOfYear() // Returns 3 on January 3rd
 */
export function getCurrentDayOfYear(timezone: string = 'UTC'): number {
  const today = getDateInTimezone(timezone);
  
  // Get January 1st of the current year
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  
  // Calculate days since start of year
  const diffInMs = today.getTime() - startOfYear.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  
  // Add 1 because days are 1-indexed
  return Math.floor(diffInDays) + 1;
}

/**
 * Calculates how many days are left in the current year
 * 
 * Math explanation:
 * 1. Get total days in current year (365 or 366 for leap year)
 * 2. Subtract current day of year
 * 3. Result is days remaining
 * 
 * @returns Number of days remaining in the current year
 * 
 * @example
 * calculateDaysLeftInYear() // Returns 362 on January 3rd (non-leap year)
 */
export function calculateDaysLeftInYear(timezone: string = 'UTC'): number {
  const today = getDateInTimezone(timezone);
  const currentYear = today.getFullYear();
  
  // Check if leap year
  const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
  const totalDaysInYear = isLeapYear ? 366 : 365;
  
  const currentDay = getCurrentDayOfYear(timezone);
  
  return totalDaysInYear - currentDay;
}

/**
 * Gets the total number of days in the current year
 * 
 * @returns 365 for normal years, 366 for leap years
 */
export function getTotalDaysInCurrentYear(): number {
  const currentYear = new Date().getFullYear();
  const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
  return isLeapYear ? 366 : 365;
}
