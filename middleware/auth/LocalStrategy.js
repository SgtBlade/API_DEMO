import { Strategy as LocalStrategy } from "passport-local";
import { initClient } from "../../db/mongo.js";

const client = await initClient();
const db = client.db();

export default new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    async (username, password, done) => {
      try {
        let user = await db.collection("users").findOne({ username });
        if (!user) {
          await db.collection("users").insertOne({ username });
          user = await db.collection("users").findOne({ username });
          console.log(user)
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )