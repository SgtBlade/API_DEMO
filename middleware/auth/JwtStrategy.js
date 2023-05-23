import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { ObjectId } from "mongodb";
import { initClient } from "../../db/mongo.js";

const client = await initClient();
const db = client.db();


export default new JwtStrategy(
    {
      secretOrKey: process.env.JWT_SECRET,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      expiresIn: process.env.JWT_EXPIRES_IN_HOURS * 60 * 60,
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
        console.log(error)
        return done(error);
      }
    }
  )