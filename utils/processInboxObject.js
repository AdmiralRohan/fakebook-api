const db = require("../dbConnection");
const User = require("./../classes/user.class");
const Message = require("./../classes/message.class");

module.exports = async (result, profileId, profileName) => {
  const contacts = {};
  const messages = {};

  for await (let msg of result) {
    if (msg.from == profileId) {
      if (!(msg.to in contacts)) {
        let result1 = await db
          .select("user_id", db.raw(`CONCAT(fname, ' ', lname) as user_name`))
          .from("users")
          .where("user_id", msg.to);
        if (result1.length === 1) {
          contacts[msg.to] = new User(result1[0].user_id, result1[0].user_name);
        }
      }

      delete messages[msg.to]; // To maintain ordered list by time
      messages[msg.to] = new Message(
        msg.id,
        msg.content,
        msg.from,
        profileName,
        msg.to,
        contacts[msg.to].name,
        msg.time
      );
    } else {
      if (!(msg.from in contacts)) {
        let result1 = await db
          .select("user_id", db.raw(`CONCAT(fname, ' ', lname) as user_name`))
          .from("users")
          .where("user_id", msg.from);
        if (result1.length === 1) {
          contacts[msg.from] = new User(
            result1[0].user_id,
            result1[0].user_name
          );
        }
      }

      delete messages[msg.from];
      messages[msg.from] = new Message(
        msg.id,
        msg.content,
        msg.from,
        contacts[msg.from].name,
        msg.to,
        profileName,
        msg.time
      );
    }
  }

  return { contacts, messages };
};
