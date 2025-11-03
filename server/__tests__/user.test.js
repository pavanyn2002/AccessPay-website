const request = require("supertest");
const app = require("../app");
const Customer = require("../models/customer");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");

jest.mock("../middleware/auth");

describe("User API", () => {
  let mongoServer;
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    auth.isAuthenticated.mockImplementation((req, res, next) => {
      req.user = {
        email: "test@test.com",
      };
      next();
    });
  });

  it("should return 401 if the user is not authenticated", async () => {
    auth.isAuthenticated.mockImplementation((req, res, next) => {
      res.status(401).send("You must be logged in to access this resource.");
    });
    const res = await request(app).get("/credit-score");
    expect(res.statusCode).toEqual(401);
  });

  it("should get the user's credit score", async () => {
    const customer = new Customer({
      email: "test@test.com",
      password: "password",
      credit_score: 500,
    });
    await customer.save();

    const res = await request(app).get("/credit-score");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("creditScore", 500);
  });
});
