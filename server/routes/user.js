const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { body, validationResult } = require("express-validator");
const { isAuthenticated } = require("../middleware/auth");

router.get("/credit-score", isAuthenticated, userController.getCreditScore);
router.get("/api/first-name", isAuthenticated, userController.getFirstName);
router.get(
  "/api/rewards-history",
  isAuthenticated,
  userController.getRewardsHistory
);
router.post(
  "/changepassword",
  isAuthenticated,
  body("currentpassword").isLength({ min: 8 }),
  body("newpassword").isLength({ min: 8 }),
  body("confirmpassword").isLength({ min: 8 }),
  userController.changePassword
);
router.post("/fetch-budget", isAuthenticated, userController.fetchBudget);
router.get("/fetch-months", isAuthenticated, userController.fetchMonths);
router.post(
  "/add-budget-category",
  isAuthenticated,
  userController.addBudgetCategory
);
router.get("/loan-data", isAuthenticated, userController.getLoanData);
router.get("/api/loan-details", isAuthenticated, userController.getLoanDetails);
router.post(
  "/api/add-transaction",
  isAuthenticated,
  userController.addTransaction
);
router.post("/apply-loan", isAuthenticated, userController.applyLoan);
router.post(
  "/update-loan-details",
  isAuthenticated,
  userController.updateLoanDetails
);
router.post("/pay-loan", isAuthenticated, userController.payLoan);
router.get(
  "/api/loan-details-and-calculate",
  isAuthenticated,
  userController.getLoanDetailsAndCalculate
);
router.get(
  "/api/reward-balance",
  isAuthenticated,
  userController.getRewardBalance
);
router.post(
  "/api/update-reward-balance",
  isAuthenticated,
  userController.updateRewardBalance
);
router.post(
  "/api/create-rewards-history-entry",
  isAuthenticated,
  userController.createRewardsHistoryEntry
);
router.post(
  "/api/reset-initial-balance",
  isAuthenticated,
  userController.resetInitialBalance
);

module.exports = router;
