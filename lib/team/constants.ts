/**
 * Supabase Auth ban constants for team member deactivation & reactivation.
 *
 * - DEACTIVATION_BAN_DURATION: "876000h" (100 years ban duration, official Supabase admin API format)
 * - REACTIVATION_UNBAN_DURATION: "none" (official Supabase admin API value to lift ban duration)
 */
export const DEACTIVATION_BAN_DURATION = "876000h";
export const REACTIVATION_UNBAN_DURATION = "none";
