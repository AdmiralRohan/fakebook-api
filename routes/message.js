const express = require("express");
const messageRouter = express.Router();
const auth = require("../middlewares/auth");
const isUserExists = require("../middlewares/isUserExists");
const db = require("../dbConnection");
const { body } = require("express-validator");

const Message = require("./../classes/message.class");
const processInboxObject = require("./../utils/processInboxObject");

messageRouter.get("/inbox", auth, async (req, res) => {
  try {
    const { profileId } = res;
    let profileName = "";

    const user = await db
      .select(db.raw(`CONCAT(fname, ' ', lname) as user_name`))
      .from("users")
      .where("user_id", profileId);

    if (user.length === 1) {
      profileName = user[0].user_name;
    } else {
      throw new Error("Database error");
    }

    const result = await db
      .select(
        db.ref("msg_id").as("id"),
        db.ref("msg_content").as("content"),
        db.ref("msg_from").as("from"),
        db.ref("msg_to").as("to"),
        db.ref("msgd_on").as("time")
      )
      .from("messages")
      .where("msg_from", profileId)
      .orWhere("msg_to", profileId)
      .orderBy("msgd_on");

    const { contacts, messages } = await processInboxObject(
      result,
      profileId,
      profileName
    );

    res.status(200).json({
      success: true,
      msg: "Successfully fetched inbox messages",
      contacts,
      messages
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Couldn't fetch inbox messages",
      error: error.message
    });
  }
});

messageRouter.get(
  "/messages/:userId",
  [isUserExists, auth],
  async (req, res) => {
    try {
      // profileId is mine, userId is the recipient of message
      const { profileId, userName } = res;
      const { userId } = req.params;
      let profileName;
      let messages;
      const msgFields = [
        db.ref("msg_id").as("id"),
        db.ref("msg_content").as("content"),
        db.ref("msg_from").as("from"),
        db.ref("msg_to").as("to"),
        db.ref("msgd_on").as("time")
      ];

      const user = await db
        .select(db.raw(`CONCAT(fname, ' ', lname) as user_name`))
        .from("users")
        .where("user_id", profileId);

      if (user.length === 1) {
        profileName = user[0].user_name;
      } else {
        throw new Error("Database error");
      }

      const result = await db
        .select(...msgFields)
        .from("messages")
        .where({
          msg_from: profileId,
          msg_to: userId
        })
        .union(
          db
            .select(...msgFields)
            .from("messages")
            .where({
              msg_from: userId,
              msg_to: profileId
            })
        );

      if (result) {
        messages = result.map(msg => {
          return msg.from == profileId
            ? new Message(
                msg.id,
                msg.content,
                msg.from,
                profileName,
                msg.to,
                userName,
                msg.time
              )
            : new Message(
                msg.id,
                msg.content,
                msg.from,
                userName,
                msg.to,
                profileName,
                msg.time
              );
        });
      }

      console.log(messages);

      res.status(200).json({
        success: true,
        msg: "Messages fetched successfully",
        messages,
        friendName: userName
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        msg: "Couldn't fetch messages with that user",
        error: error.message
      });
    }
  }
);

messageRouter.post(
  "/messages/:userId",
  [
    isUserExists,
    auth,
    body("content")
      .trim()
      .escape()
  ],
  async (req, res) => {
    try {
      let { content } = req.body;
      const { profileId } = res; // Sender
      const { userId } = req.params; // Recipient

      if (!content.length) {
        return res
          .status(422)
          .json({ success: false, msg: "Message content missing" });
      }

      const [messageId] = await db("messages").insert({
        msg_content: content,
        msg_from: profileId,
        msg_to: userId,
        msgd_on: new Date()
      });

      if (messageId) {
        res.status(200).json({
          success: true,
          msg: "Your message sent successfully",
          messageId
        });
      } else {
        throw new Error("Operation couldn't completed due to database failure");
      }
    } catch (error) {
      res.status(401).json({
        success: false,
        msg: "Couldn't send message",
        error: error.message
      });
    }
  }
);

module.exports = messageRouter;
