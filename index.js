const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// verify jwt token
const verifyJWT = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" });
  }
  // bearer 'token'
  const token = authorizationHeader.split(" ")[1];
  // decoded means = user / user data
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "Unauthorized Access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASS}@cluster0.og57wk2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // HERE ALL CODE
    const userCollection = client.db("TripAero").collection("users");

    //  JWT TOKEN SECURE
    // app.post("/jwt", async (req, res) => {
    //   const user = req.body;
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: "1h",
    //   });
    //   res.send({ token });
    // });

    /** ---------- users apis ------------ */
    app.post("/sign-user", async (req, res) => {
      const { user_email, password, user_photo, role } = req.body;
      const encryptedPassword = await bcrypt.hash(password, 10);
      const query = { user_email: user_email };
      const oldUser = await userCollection.findOne(query);
      if (oldUser) {
        return res.send({
          error: true,
          message: "user already exits, please login or try with new email",
        });
      }
      const userData = {
        user_email,
        user_photo,
        password: encryptedPassword,
        role,
      };
      const result = await userCollection.insertOne(userData);
      res.send(result);
    });

    // login user
    app.post("/login-user", async (req, res) => {
      const { user_email, password } = req.body;
      const user = await userCollection.findOne({ user_email });
      if (!user) {
        return res.status(401).send({ message: "User not found" });
      }
      // Compare the provided password with the hashed password in the database
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).send({ message: "Password does not match" });
      }

      // Passwords match, so generate a JWT token
      const token = jwt.sign(
        { user_email: user_email },
        process.env.ACCESS_TOKEN_SECRET
      );
      res.send({ status: "success", token });
    });

    // get user data
    app.post("/user-data", verifyJWT, async (req, res) => {
      const query = { user_email: req.decoded.user_email };
      const result = await userCollection.findOne(query);
      res.send(result);
      // console.log("user-data", result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("TripAero is running and setting");
});

app.listen(port, () => {
  console.log(`TripAero is on port: ${port}`);
});
