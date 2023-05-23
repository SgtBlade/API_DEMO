import "dotenv/config";
import express from "express";
import { ObjectId } from "mongodb";
import { initClient } from "./db/mongo.js";
import { registerMiddleware } from "./middleware/index.js";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import jwt from "jsonwebtoken";

//Create an Express app:
const app = express();
const port = 3002;

//Register middleware:
registerMiddleware(app);

//Initialize MongoDB client and database:
const client = await initClient();
app.use(passport.initialize());
const db = client.db();


//Define a LocalStrategy for handling user login:
passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    async (username, password, done) => {
      console.log('test')
      try {
        console.log(username)
        let user = await db.collection("users").findOne({ username });


        if (!user) {
          await db.collection("users").insertOne({ username });
          user = await db.collection("users").findOne({ username });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

//Define a JwtStrategy for authentication:
passport.use(
  new JwtStrategy(
    {
      secretOrKey: process.env.JWT_SECRET,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      expiresIn: process.env.JWT_EXPIRES_IN_HOURS * 60,
    },
    async (payload, done) => {
      try {
        // check if user with id exists
        const user = await db
          .collection("users")
          .findOne({ _id: ObjectId(payload.id) });

        if (user) {
          return done(null, user);
        } else {
          // User not found
          return done(null, false, { message: 'Token expired' });
        }
      } catch (error) {
        return done(error);
      }
    }
  )
);

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN_HOURS * 60 }
    );
    delete user.passport
    return res.json({ token, ...user });
  })(req, res, next);
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the username already exists
    const existingUser = await db.collection("users").findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Create a new user
    const newUser = { username, password };

    // Insert the user into the database
    await db.collection("users").insertOne(newUser);

    // Generate a new token for the registered user
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN_HOURS * 60,
    });

    delete newUser.password
    res.json({ token, ...newUser });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//Define a router for authenticated routes:
const authRouter = express.Router();

// middleware for authentication
authRouter.use(passport.authenticate("jwt", { session: false, failWithError: true }));

// Define the authenticated routes here...
authRouter.get("/students", async (req, res) => {
  const students = await db.collection("students").find().toArray();
  res.json(students);
});

authRouter.post("/students", async (req, res) => {
  const student = {
    image: "https://picsum.photos/200/300",
    ...req.body,
  };

  await db.collection("students").insertOne(student);

  res.json(student);
});

authRouter.get("/students/:id", async (req, res) => {
  const id = req.params.id;
  const student = await db.collection("students").findOne({
    _id: ObjectId(id),
  });

  if (student) {
    res.json(student);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

authRouter.patch("/students/:id", async (req, res) => {
  const id = req.params.id;

  const student = await db.collection("students").findOne({
    _id: ObjectId(id),
  });

  if (student) {
    const { _id, ...data } = req.body;
    const newData = { ...student, ...data };
    await db.collection("students").replaceOne(
      { _id: ObjectId(id) },
      newData
    );

    res.json(newData);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

authRouter.delete("/students/:id", async (req, res) => {
  const id = req.params.id;

  await db.collection("students").deleteOne({
    _id: ObjectId(id),
  });

  res.json({});
});

//Use the authRouter for authenticated routes:
app.use(authRouter);

//// Custom error handler middleware to handle JWT authentication errors
app.use((err, req, res, next) => {
  if (err.name === 'AuthenticationError') {
    res.status(401).json({ error: 'Token expired' });
  } else {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//Start the server and handle server crashes:
const server = app.listen(port, () => {
  console.log(`App listening http://localhost:${port}`);
});

const closeServer = () => {
  server.close();
  // close the MongoDB client here if needed
  process.exit();
};

process.on("SIGINT", () => closeServer());
process.on("SIGTERM", () => closeServer());
