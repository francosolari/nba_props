/**
 * JSDoc type definitions for the NBA Predictions Leaderboard API
 * 
 * These types define the data contract for the `/api/v2/leaderboard/{season}` endpoint.
 * They are designed to handle potential missing data from the API gracefully.
 */

/**
 * @typedef {Object} LeaderboardUser
 * @property {number} id - Unique user identifier
 * @property {number} rank - User's position on the leaderboard
 * @property {string} username - User's unique username
 * @property {string} display_name - User's formatted display name (typically first name + last initial)
 * @property {string|null} [avatar] - URL to user's avatar image (optional)
 * @property {number} total_points - Total points earned across all categories
 * @property {number} accuracy - Percentage of correct predictions (0-100)
 * @property {Object.<string, Category>} categories - User's performance in each prediction category
 */

/**
 * @typedef {Object} Category
 * @property {number} points - Total points earned in this category
 * @property {number} max_points - Maximum possible points available in this category
 * @property {Array<Prediction>} predictions - List of individual predictions made in this category
 */

/**
 * @typedef {Object} Prediction
 * @property {string} [team] - For team standing predictions: Team name
 * @property {string} [conference] - For team standing predictions: Conference ("East" or "West")
 * @property {number} [predicted_position] - For team standing predictions: Predicted position (1-15)
 * @property {number|null} [actual_position] - For team standing predictions: Actual position (1-15), may be null if season is ongoing
 * @property {string} [question] - For question/answer predictions: Question text
 * @property {string} [answer] - For question/answer predictions: User's submitted answer
 * @property {boolean|null} correct - Whether the prediction was correct, may be null if outcome is not yet determined
 * @property {number} points - Points earned for this prediction
 */

/**
 * @typedef {Object} LeaderboardResponse
 * @property {Array<LeaderboardUser>} users - List of users ranked by points
 */

/**
 * Example of leaderboard data structure:
 * 
 * @example
 * const leaderboardData = [
 *   {
 *     id: 1,
 *     rank: 1,
 *     username: "NBAFan123",
 *     display_name: "John D.",
 *     avatar: "/path/to/avatar.jpg",
 *     total_points: 2450,
 *     accuracy: 78,
 *     categories: {
 *       "Regular Season Standings": {
 *         points: 800,
 *         max_points: 1200,
 *         predictions: [
 *           {
 *             team: "Los Angeles Lakers",
 *             conference: "West",
 *             predicted_position: 3,
 *             actual_position: 4,
 *             correct: false,
 *             points: 2
 *           }
 *         ]
 *       },
 *       "Player Awards": {
 *         points: 650,
 *         max_points: 900,
 *         predictions: [
 *           {
 *             question: "Who will win the MVP award?",
 *             answer: "Nikola Jokic",
 *             correct: true,
 *             points: 150
 *           }
 *         ]
 *       }
 *     }
 *   }
 * ];
 */
