/**
 * Validation & Accuracy Business Logic
 * 
 * This module contains helper functions for tracking AI prediction accuracy
 * and calculating real-world outcome metrics.
 */

/**
 * Calculates match status between AI recommended role and actual assigned role
 * 
 * Business Logic:
 * - Accurate: Exact match between AI recommendation and actual role
 * - Partial: Similar roles (contains keywords, similar level)
 * - Inaccurate: Completely different roles
 * 
 * @param aiRole - The role recommended by AI
 * @param actualRole - The actual role assigned to candidate
 * @returns Match status classification
 */
export const calculateMatchStatus = (
  aiRole: string,
  actualRole: string
): "accurate" | "partial" | "inaccurate" => {
  const aiLower = aiRole.toLowerCase().trim();
  const actualLower = actualRole.toLowerCase().trim();

  // Exact match
  if (aiLower === actualLower) {
    return "accurate";
  }

  // Partial match - check for similar keywords
  const partialMatches = [
    // Both contain "chair"
    aiLower.includes("chair") && actualLower.includes("chair"),
    // Both contain "director"
    aiLower.includes("director") && actualLower.includes("director"),
    // Both contain "president"
    aiLower.includes("president") && actualLower.includes("president"),
    // Both contain "coordinator"
    aiLower.includes("coordinator") && actualLower.includes("coordinator"),
    // Both contain "manager"
    aiLower.includes("manager") && actualLower.includes("manager"),
    // One role is substring of another
    aiLower.includes(actualLower) || actualLower.includes(aiLower),
  ];

  if (partialMatches.some(match => match)) {
    return "partial";
  }

  // No match
  return "inaccurate";
};

/**
 * Checks if a hire date has reached 6 months tenure
 * 
 * Business Logic:
 * - Returns true if current date >= hire date + 6 months
 * - Used for calculating 6-month retention metrics
 * 
 * @param hireDate - The date candidate was hired
 * @returns Whether 6 months have passed
 */
export const hasReached6MonthTenure = (hireDate: string | Date): boolean => {
  const hire = new Date(hireDate);
  const sixMonthsLater = new Date(hire);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
  
  return new Date() >= sixMonthsLater;
};

/**
 * Calculates overall prediction accuracy percentage
 * 
 * Business Logic:
 * - Accuracy = (Accurate predictions / Total predictions with status) * 100
 * - Only counts predictions that have been validated (have match_status)
 * 
 * @param metrics - Array of validation metrics
 * @returns Accuracy percentage (0-100)
 */
export const calculateAccuracy = (metrics: Array<{ match_status: string | null }>): number => {
  const validMetrics = metrics.filter(m => m.match_status);
  if (validMetrics.length === 0) return 0;
  
  const accurateCount = validMetrics.filter(m => m.match_status === "accurate").length;
  return (accurateCount / validMetrics.length) * 100;
};

/**
 * Calculates retention rate for candidates past 6 months
 * 
 * Business Logic:
 * - Retention = (Still active after 6 months / Total past 6 months) * 100
 * - Only counts candidates who have reached 6-month tenure
 * 
 * @param metrics - Array of validation metrics
 * @returns Retention percentage (0-100)
 */
export const calculateRetentionRate = (
  metrics: Array<{ retention_6_month: boolean | null; still_active: boolean }>
): number => {
  const past6Months = metrics.filter(m => m.retention_6_month !== null);
  if (past6Months.length === 0) return 0;
  
  const stillActive = past6Months.filter(m => m.still_active).length;
  return (stillActive / past6Months.length) * 100;
};

/**
 * Calculates average performance rating
 * 
 * Business Logic:
 * - Average of all performance ratings (1-5 scale)
 * - Used to track overall candidate quality
 * 
 * @param metrics - Array of validation metrics
 * @returns Average rating (0-5)
 */
export const calculateAveragePerformance = (
  metrics: Array<{ performance_rating: number | null }>
): number => {
  const ratingsWithValue = metrics.filter(m => m.performance_rating !== null);
  if (ratingsWithValue.length === 0) return 0;
  
  const sum = ratingsWithValue.reduce((acc, m) => acc + (m.performance_rating || 0), 0);
  return sum / ratingsWithValue.length;
};

/**
 * Business Logic Summary:
 * 
 * 1. Automatic Match Status Calculation:
 *    - System automatically compares AI recommended role with actual assigned role
 *    - Classifies as: Accurate (exact), Partial (similar), or Inaccurate (different)
 *    - Admins can manually override if needed
 * 
 * 2. 6-Month Retention Tracking:
 *    - Automatically calculated based on hire date
 *    - null = hasn't reached 6 months yet
 *    - true = reached 6 months and still active
 *    - false = reached 6 months but no longer active
 * 
 * 3. Performance Tracking:
 *    - 1-5 star rating system
 *    - Tracked over time to measure candidate success
 *    - Can be correlated with AI scores for validation
 * 
 * 4. Accuracy Metrics:
 *    - Overall accuracy percentage across all validated predictions
 *    - Breakdown by accurate/partial/inaccurate
 *    - Used to improve AI model over time
 */
