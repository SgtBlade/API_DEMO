import { v4 } from "uuid";
import crypto from 'crypto-js';


const hash = (userObj, givenPassword) => {
  return JSON.stringify(crypto.SHA256(`${userObj.salt.substring(0, userObj.saltParam )}${givenPassword}${userObj.salt.substring(userObj.saltParam )}`))
}

const createUserData = (user) => {
    user.salt = v4();
    const randomLength = Math.floor(Math.random()*user.salt.length);
    user.saltParam = randomLength;
    user.password = JSON.stringify(crypto.SHA256(`${user.salt.substring(0, user.saltParam)}${user.password}${user.salt.substring(user.saltParam)}`))
    return user
}

export {hash, createUserData}