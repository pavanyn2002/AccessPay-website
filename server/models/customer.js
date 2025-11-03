const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  googleId: String,
  googleName: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  aadhar_number: String,
  pan_number: String,
  first_name: String,
  second_name: String,
  address: String,
  phone_number: String,
  wallet_address: String,
  credit_score: Number,
  bank: Array,
  reward_balance: Number,
  initial_balance: Number,
  rewards_history: Array,
  loans: Array,
  transactions: Array,
  budget: Array,
  redeem_history: Array,
});

const Customer = mongoose.model("Customer", customerSchema, "Customers");

module.exports = Customer;
