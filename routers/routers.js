import { Router } from "express";
import passport from "passport";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { initClient } from "../db/mongo.js";
//Initialize MongoDB client and database:
const client = await initClient();
const db = client.db();

const registerRegularRoutes = (app) => {

    app.post("/login", (req, res, next) => {
        passport.authenticate("local", (err, user) => {
          if (err) {
            return res.status(500).json({ error: "Internal Server Error" });
          }
          if (!user) {
            return res.status(401).json({ error: "No user found" });
          }
          const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN_HOURS * 60 * 60 }
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
          console.log(error)
          res.status(500).json({ error: "Internal Server Error" });
        }
      });

    app.get("/students", async (req, res) => {
        const students = await db.collection("students").find().toArray();
        res.json(students);
      });
}

const registerAdminRoutes = (app) => {
    const adminRouter = Router();

    adminRouter.use(passport.authenticate("jwt", { session: false, failWithError: true }));

    adminRouter.post("/students", async (req, res) => {
        const student = {
          image: "https://picsum.photos/200/300",
          ...req.body,
        };
      
        await db.collection("students").insertOne(student);
      
        res.json(student);
      });
      
    adminRouter.patch("/students/:id", async (req, res) => {
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

    adminRouter.get("/students/:id", async (req, res) => {
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
      
    adminRouter.delete("/students/:id", async (req, res) => {
        const id = req.params.id;
      
        await db.collection("students").deleteOne({
          _id: ObjectId(id),
        });
      
        res.json({});
      });

    app.use(adminRouter);

}


const registerRoutes = async (app) => {

    registerRegularRoutes(app)

    registerAdminRoutes(app)

    //// Custom error handler middleware to handle JWT authentication errors
    app.use((err, req, res, next) => {
        if (err.name === 'AuthenticationError') {
        res.status(401).json({ error: 'Token expired' });
        } else {
          console.log(err)
        res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

export { registerRoutes };