const mongoose = require("mongoose");
const Customer = require("../models/customer");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const saltRounds = 10;

exports.getCreditScore = async (req, res) => {
  const result = await getCreditScoreByEmail(req.user.email);
  if (result.success) {
    res.json({ creditScore: result.creditScore });
  } else {
    res.status(500).json({ error: result.message });
  }
};

async function getCreditScoreByEmail(email) {
  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    // Fetch the user document by email
    const user = await customersCollection.findOne({ email: email });
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Calculate the new credit score
    let newCreditScore = user.credit_score;
    user.transactions.forEach((transaction) => {
      if (transaction.mode === "sent") {
        newCreditScore += 3;
      }
    });

    return { success: true, creditScore: newCreditScore };
  } catch (err) {
    console.error(err);
    return { success: false, message: "An error occurred" };
  }
}

exports.getFirstName = async (req, res) => {
  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    const customer = await customersCollection.findOne({
      email: req.user.email,
    });
    if (!customer) {
      return res.status(404).send("Customer not found.");
    }
    res.json({ firstName: customer.first_name });
  } catch (error) {
    console.error("Error fetching first name:", error);
    res.status(500).send("Error fetching first name.");
  }
};

exports.getRewardsHistory = async (req, res) => {
  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    // Assuming you have a way to identify the customer, e.g., through a query parameter or a session
    // For demonstration, let's use a hardcoded customerId
    // Replace this with the actual customer ID retrieval logic

    const customer = await customersCollection.findOne({
      email: req.user.email,
    });

    if (!customer) {
      return res.status(404).send("Customer not found.");
    }

    // Assuming the rewards history is stored in a field named 'rewards_history'
    const rewardsHistory = customer.rewards_history;

    res.json(rewardsHistory);
  } catch (error) {
    console.error("Error fetching rewards history for customer:", error);
    res.status(500).send("Error fetching rewards history for customer.");
  }
};

exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    const { currentpassword, newpassword, confirmpassword } = req.body;

    // Assuming you have a way to identify the customer, e.g., through a session or a token
    // For demonstration, let's use a hardcoded customerId
    // Replace this with the actual customer ID retrieval logic

    const customer = await customersCollection.findOne({
      email: req.user.email,
    });

    if (!customer) {
      return res.status(404).send("Customer not found.");
    }

    // Fetch the current password from the database and compare it with the entered password
    const isMatch = await bcrypt.compare(currentpassword, customer.password);
    if (!isMatch) {
      return res.status(400).send("Current password is incorrect.");
    }

    // Check if new password and confirmation match
    if (newpassword !== confirmpassword) {
      return res
        .status(400)
        .send("New password and confirmation do not match.");
    }

    const hashedPassword = await bcrypt.hash(newpassword, saltRounds);
    // Update the password in the database
    await customersCollection.updateOne(
      { email: req.user.email },
      { $set: { password: hashedPassword } }
    );

    res.send("Password changed successfully.");
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).send("Error changing password.");
  }
};

exports.fetchBudget = async (req, res) => {
  const { monthYear } = req.body;
  const customersCollection = mongoose.connection.db.collection("Customers");

  const customer = await customersCollection.findOne({
    email: req.user.email,
  });
  if (!customer) {
    return res.status(404).send("Customer not found.");
  }

  const budget = customer.budget.find((b) => b.month_year === monthYear);
  if (!budget) {
    // Return a JSON response with a message indicating no budget found
    return res
      .status(404)
      .json({ message: "Budget not found for the specified month and year." });
  }

  const labels = Object.keys(budget).filter((key) => key !== "month_year");
  const data = Object.values(budget).slice(1);
  const colors = labels.map(
    () => "#" + Math.floor(Math.random() * 16777215).toString(16)
  );

  res.json({ labels, data, colors });
};

exports.fetchMonths = async (req, res) => {
  const customersCollection = mongoose.connection.db.collection("Customers");

  const customer = await customersCollection.findOne({
    email: req.user.email,
  });
  if (!customer) {
    return res.status(404).send("Customer not found.");
  }

  const months = customer.budget.map((b) => b.month_year);
  res.json(months);
};

exports.addBudgetCategory = async (req, res) => {
  const { categoryName, categoryAmount } = req.body;
  // Format the current month and year to match the expected format in the database
  const currentMonthYear = new Date()
    .toLocaleString("default", {
      month: "long",
      year: "numeric",
    })
    .replace(/ /g, ", "); // Replace spaces with ', ' to match the expected format

  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    const customer = await customersCollection.findOne({
      email: req.user.email,
    });
    if (!customer) {
      return res.status(404).send("Customer not found.");
    }

    // Find the budget entry for the current month and year, case-insensitive
    let budgetEntry = customer.budget.find(
      (b) => b.month_year.toLowerCase() === currentMonthYear.toLowerCase()
    );

    if (!budgetEntry) {
      // If there's no budget entry for the current month, create a new one
      budgetEntry = { month_year: currentMonthYear };
      customer.budget.push(budgetEntry);
    }

    // Update the budget entry with the new category
    budgetEntry[categoryName] = parseInt(categoryAmount, 10);

    await customersCollection.updateOne(
      { email: req.user.email },
      { $set: { budget: customer.budget } }
    );

    res.json({ message: "Budget category added successfully." });
  } catch (error) {
    console.error("Error adding budget category:", error);
    res.status(500).send("Error adding budget category.");
  }
};

exports.getLoanData = async (req, res) => {
  const collection = mongoose.connection.db.collection("Customers");

  const customer = await collection.findOne({ email: req.user.email });
  if (!customer) {
    return res.status(404).send("Customer not found.");
  }

  const loanData = customer.loans[0]; // Assuming you want to plot the first loan
  const monthsPaid = loanData.months_paid;
  const monthsLeft = loanData.months_left;

  res.json({ monthsPaid, monthsLeft });
};

exports.getLoanDetails = async (req, res) => {
  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    const customer = await customersCollection.findOne({
      email: req.user.email,
    });
    if (!customer) {
      return res.status(404).send("Customer not found.");
    }

    // Assuming the loan details are stored in a field named 'loans'
    const loanDetails = customer.loans[0]; // Assuming you want to display the first loan

    // Construct the loan object to send to the client
    const loanObject = {
      loan_amount: loanDetails.loan_amount,
      emi: parseFloat(loanDetails.emi),
      tenure: loanDetails.tenure,
      months_paid: loanDetails.months_paid,
      rate_of_interest: loanDetails.rate_of_interest,
      loan_payments: loanDetails.loan_payments,
      bank_name: loanDetails.bank_name,
      bank_branch: loanDetails.bank_branch,
      bank_ifsc: loanDetails.bank_ifsc,
    };

    res.json(loanObject);
  } catch (error) {
    console.error("Error fetching loan details for customer:", error);
    res.status(500).send("Error fetching loan details for customer.");
  }
};

exports.addTransaction = async (req, res) => {
  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    const transactionData = req.body;
    transactionData.transaction_id = uuidv4(); // Generate a unique transaction ID

    // Calculate 1% of the expenseAmount
    const rewardIncrement = transactionData.amount * 0.0001;

    // Update the reward_balance and initial_balance fields
    const updateResult = await customersCollection.updateOne(
      { email: req.user.email },
      {
        $push: { transactions: transactionData },
        $inc: {
          reward_balance: rewardIncrement,
          initial_balance: rewardIncrement,
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res
        .status(404)
        .send("Customer not found or transaction not added.");
    }

    res.json({ message: "Transaction added successfully", transactionData });
  } catch (error) {
    console.error("Error adding transaction:", error);
    res.status(500).send("Error adding transaction.");
  }
};

exports.applyLoan = async (req, res) => {
  const { loan_type, loan_amount, tenure, emi, rate_of_interest } = req.body;

  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    // Assuming the first loan in the array is the one to be updated
    const customer = await customersCollection.findOne({
      email: req.user.email,
    });
    if (!customer) {
      return res.status(404).send("Customer not found.");
    }

    // Update the first loan in the array
    const loanIndex = 0; // Assuming you want to update the first loan
    if (customer.loans[loanIndex]) {
      customer.loans[loanIndex].loan_type = loan_type;
      customer.loans[loanIndex].loan_amount = loan_amount;
      customer.loans[loanIndex].tenure = parseInt(tenure);
      customer.loans[loanIndex].months_left = parseInt(tenure);
      customer.loans[loanIndex].emi = emi;
      customer.loans[loanIndex].rate_of_interest =
        parseFloat(rate_of_interest);

      // Update the customer document in the database
      await customersCollection.updateOne(
        { email: req.user.email },
        { $set: { loans: customer.loans } }
      );
      res.status(200).send("Loan application successful.");
    } else {
      res.status(400).send("No loan found to update.");
    }
  } catch (error) {
    console.error("Error applying for loan:", error);
    res.status(500).send("Error applying for loan.");
  }
};

exports.updateLoanDetails = async (req, res) => {
  const { loan_id, loan_amount, tenure, emi, rate_of_interest } = req.body;

  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    const customer = await customersCollection.findOne({
      email: req.user.email,
    });
    if (!customer) {
      return res.status(404).send("Customer not found.");
    }

    const loanIndex = customer.loans.findIndex(
      (loan) => loan.loan_id === loan_id
    );
    if (loanIndex !== -1) {
      customer.loans[loanIndex].loan_amount = loan_amount;
      customer.loans[loanIndex].tenure = tenure;
      customer.loans[loanIndex].emi = emi;
      customer.loans[loanIndex].rate_of_interest = rate_of_interest;

      await customersCollection.updateOne(
        { email: req.user.email },
        { $set: { loans: customer.loans } }
      );
      res.status(200).send("Loan details updated successfully.");
    } else {
      res.status(404).send("Loan not found.");
    }
  } catch (error) {
    console.error("Error updating loan details:", error);
    res.status(500).send("Error updating loan details.");
  }
};

exports.payLoan = async (req, res) => {
  const { loan_id } = req.body;
  const currentDate = new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "/"); // Format date as dd/mm/yyyy

  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    const customer = await customersCollection.findOne({
      email: req.user.email,
    });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found." });
    }

    const loanIndex = customer.loans.findIndex(
      (loan) => loan.loan_id === loan_id
    );
    if (loanIndex !== -1) {
      customer.loans[loanIndex].months_paid += 1;
      customer.loans[loanIndex].months_left -= 1;
      const newPayment = {
        loan_payment_id: uuidv4(),
        amount_paid: parseFloat(customer.loans[loanIndex].emi),
        date_of_payment: currentDate,
      };
      customer.loans[loanIndex].loan_payments.push(newPayment);

      await customersCollection.updateOne(
        { email: req.user.email },
        { $set: { loans: customer.loans } }
      );
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Loan not found." });
    }
  } catch (error) {
    console.error("Error paying loan:", error);
    res.status(500).json({ success: false, message: "Error paying loan." });
  }
};

exports.getLoanDetailsAndCalculate = async (req, res) => {
  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    const customer = await customersCollection.findOne({
      email: req.user.email,
    });
    if (!customer) {
      return res.status(404).send("Customer not found.");
    }

    // Check if the customer has any loans
    if (customer.loans.length > 0) {
      // Assuming you want to display the first loan
      const loanDetails = customer.loans[0];
      const loanObject = {
        loan_amount: loanDetails.loan_amount,
        emi: parseFloat(loanDetails.emi),
        months_paid: loanDetails.months_paid,
        months_left: loanDetails.months_left,
        toBePaid: (
          loanDetails.months_left * parseFloat(loanDetails.emi)
        ).toFixed(2),
      };
      res.json(loanObject);
    } else {
      // If no loans, return an object with empty values
      res.json({
        loan_amount: "",
        emi: "",
        months_paid: "",
        months_left: "",
        toBePaid: "",
      });
    }
  } catch (error) {
    console.error("Error fetching loan details for customer:", error);
    res.status(500).send("Error fetching loan details for customer.");
  }
};

exports.getRewardBalance = async (req, res) => {
  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    const customer = await customersCollection.findOne({
      email: req.user.email,
    });

    if (!customer) {
      return res.status(404).send("Customer not found.");
    }

    res.json({
      reward_balance: customer.reward_balance,
      initial_balance: customer.initial_balance,
    });
  } catch (error) {
    console.error("Error fetching reward balance for customer:", error);
    res.status(500).send("Error fetching reward balance for customer.");
  }
};

exports.updateRewardBalance = async (req, res) => {
  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    // Assuming you have a way to identify the customer, e.g., through a session or a token
    // For demonstration, let's use a hardcoded email
    // const email = "google_id_6"; // Replace this with the actual customer ID retrieval logic

    await customersCollection.updateOne(
      { email: req.user.email },
      { $set: { reward_balance: 0 } }
    );

    res.sendStatus(200); // Send a 200 OK response
  } catch (error) {
    console.error("Error updating reward balance:", error);
    res.status(500).send("Error updating reward balance.");
  }
};

exports.createRewardsHistoryEntry = async (req, res) => {
  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    // Fetch the user's document to get the initial_balance
    const user = await customersCollection.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).send("User not found.");
    }

    // Generate a random transaction ID
    const transactionId = crypto.randomBytes(16).toString("hex");

    // Get the current date and time
    const date = new Date();
    const istOffset = 5.5; // IST offset in hours
    const istDate = new Date(date.getTime() + istOffset * 60 * 60 * 1000);
    const formattedDate = istDate.toISOString().split("T")[0];
    const formattedTime = istDate.toISOString().split("T")[1].split(".")[0];
    const balance = user.initial_balance; // Use the fetched initial_balance

    await customersCollection.updateOne(
      { email: admin_email_address },
      {
        $push: {
          redeem_history: {
            wallet_address: user.wallet_address,
            transaction_id: transactionId,
            email: req.user.email,
            date: formattedDate,
            time: formattedTime,
            coins: balance,
          },
        },
      }
    );

    // Update the rewards_history array in the database
    await customersCollection.updateOne(
      { email: req.user.email },
      {
        $push: {
          rewards_history: {
            transaction_id: transactionId,
            date: formattedDate,
            time: formattedTime,
            coins: balance,
            mode: "Spent",
          },
        },
      }
    );

    res.sendStatus(200); // Send a 200 OK response
  } catch (error) {
    console.error("Error creating rewards history entry:", error);
    res.status(500).send("Error creating rewards history entry.");
  }
};

exports.resetInitialBalance = async (req, res) => {
  try {
    const customersCollection = mongoose.connection.db.collection("Customers");

    // Assuming the email is available in the session or request
    const customer = await customersCollection.findOne({
      email: req.user.email,
    });
    if (!customer) {
      return res.status(404).send("Customer not found.");
    }

    // Update the initial_balance to 0
    await customersCollection.updateOne(
      { email: req.user.email },
      { $set: { initial_balance: 0 } }
    );

    res.json({ message: "Initial balance reset successfully." });
  } catch (error) {
    console.error("Error resetting initial balance:", error);
    res.status(500).send("Error resetting initial balance.");
  }
};
