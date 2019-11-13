const express = require("express");
const friendRouter = express.Router();
const auth = require("../middlewares/auth");
const isUserExists = require("../middlewares/isUserExists");
const db = require("../dbConnection");

const User = require("./../classes/user.class");
const friendList = require("./../utils/fetchFriendList");
const mutualFriendList = require("./../utils/fetchMutualFriends");

friendRouter.get("/friend-list", auth, async (req, res) => {
  try {
    const { profileId } = res;
    const mutualFriends = {};

    const result = await db
      .select("user_id", db.raw(`CONCAT(fname, ' ', lname) as user_name`))
      .from("users")
      .whereIn("user_id", friendList(profileId));

    const friends = result.map(row => new User(row.user_id, row.user_name, 2));
    for await (let user of friends) {
      mutualFriends[user.id] = await mutualFriendList(profileId, user.id);
    }

    res.status(200).json({
      success: true,
      msg: "Friend list successfully fetched",
      friends,
      mutualFriends
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Couldn't fetch friend list",
      error: error.message
    });
  }
});

friendRouter.get("/received-friend-requests", auth, async (req, res) => {
  try {
    const { profileId } = res;
    const mutualFriends = {};

    const result = await db
      .select("user_id", db.raw(`CONCAT(fname, ' ', lname) as user_name`))
      .from("users")
      .whereIn(
        "user_id",
        db
          .select("request_from")
          .from("friend_requests")
          .where({ request_to: profileId, request_status: "pending" })
      );

    const friends = result.map(row => new User(row.user_id, row.user_name, 4));
    for await (let user of friends) {
      mutualFriends[user.id] = await mutualFriendList(profileId, user.id);
    }

    res.status(200).json({
      success: true,
      msg: "Received friend requests successfully fetched",
      friends,
      mutualFriends
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Couldn't fetch received friend requests",
      error: error.message
    });
  }
});

friendRouter.get("/sent-friend-requests", auth, async (req, res) => {
  try {
    const { profileId } = res;
    const mutualFriends = {};

    const result = await db
      .select("user_id", db.raw(`CONCAT(fname, ' ', lname) as user_name`))
      .from("users")
      .whereIn(
        "user_id",
        db
          .select("request_to")
          .from("friend_requests")
          .where({ request_from: profileId, request_status: "pending" })
      );

    const friends = result.map(row => new User(row.user_id, row.user_name, 3));
    for await (let user of friends) {
      mutualFriends[user.id] = await mutualFriendList(profileId, user.id);
    }

    res.status(200).json({
      success: true,
      msg: "Sent friend requests successfully fetched",
      friends,
      mutualFriends
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Couldn't fetch sent friend requests",
      error: error.message
    });
  }
});

friendRouter.post(
  "/:userId/add-friend",
  [isUserExists, auth],
  async (req, res) => {
    try {
      const { profileId } = res;
      const friendId = req.params.userId;

      // Check if he is already a friend / there already a request from that person / already a request sent to that person, if not send request
      const result = await db
        .select("request_id")
        .from("friend_requests")
        .where(function() {
          this.where("request_from", profileId).andWhere(
            "request_to",
            friendId
          );
        })
        .andWhere(function() {
          this.whereIn("request_status", ["pending", "accepted"]);
        })
        .union(
          db
            .select("request_id")
            .from("friend_requests")
            .where(function() {
              this.where("request_from", friendId).andWhere(
                "request_to",
                profileId
              );
            })
            .andWhere(function() {
              this.whereIn("request_status", ["pending", "accepted"]);
            })
        );

      if (result.length !== 0) {
        throw new Error("Invalid operation");
      }

      const requestId = await db("friend_requests").insert({
        request_from: profileId,
        request_to: friendId,
        request_on: new Date(),
        request_status: "pending"
      });

      if (requestId.length !== 1) {
        throw new Error("Operation couldn't completed due to database failure");
      }

      res.status(200).json({
        success: true,
        msg: "Friend request sent successfully",
        friendshipStatus: 3
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        msg: "Couldn't send friend request",
        error: error.message
      });
    }
  }
);

friendRouter.post("/:userId/cancel-request", auth, async (req, res) => {
  try {
    const { profileId } = res;
    const friendId = req.params.userId;

    // Check if there any outgoing friend request to that person
    const result = await db
      .select("request_id")
      .from("friend_requests")
      .where({
        request_from: profileId,
        request_to: friendId,
        request_status: "pending"
      });

    if (result.length !== 1) {
      throw new Error("Invalid operation");
    }

    const affectedRows = await db("friend_requests")
      .update({
        request_status: "rejected",
        request_on: new Date()
      })
      .where({ request_id: result[0].request_id });

    if (affectedRows !== 1) {
      throw new Error("Operation couldn't completed due to database failure");
    }

    res.status(200).json({
      success: true,
      msg: "Friend request rejected successfully",
      friendshipStatus: 1
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Couldn't cancel friend request",
      error: error.message
    });
  }
});

friendRouter.post("/:userId/confirm-request", auth, async (req, res) => {
  try {
    const { profileId } = res;
    const friendId = req.params.userId;

    // Check if there any incoming friend request from that person
    const result = await db
      .select("request_id")
      .from("friend_requests")
      .where({
        request_from: friendId,
        request_to: profileId,
        request_status: "pending"
      });

    if (result.length !== 1) {
      throw new Error("Invalid operation");
    }

    const affectedRows = await db("friend_requests")
      .update({
        request_status: "accepted",
        request_on: new Date()
      })
      .where({ request_id: result[0].request_id });

    if (affectedRows !== 1) {
      throw new Error("Operation couldn't completed due to database failure");
    }

    res.status(200).json({
      success: true,
      msg: "Friend request accepted successfully",
      friendshipStatus: 2
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Couldn't confirm friend request",
      error: error.message
    });
  }
});

friendRouter.post("/:userId/delete-request", auth, async (req, res) => {
  try {
    const { profileId } = res;
    const friendId = req.params.userId;

    // Check if there any incoming friend request from that person
    const result = await db
      .select("request_id")
      .from("friend_requests")
      .where({
        request_from: friendId,
        request_to: profileId,
        request_status: "pending"
      });

    if (result.length !== 1) {
      throw new Error("Invalid operation");
    }

    const affectedRows = await db("friend_requests")
      .update({
        request_status: "rejected",
        request_on: new Date()
      })
      .where({ request_id: result[0].request_id });

    if (affectedRows !== 1) {
      throw new Error("Operation couldn't completed due to database failure");
    }

    res.status(200).json({
      success: true,
      msg: "Friend request rejected successfully",
      friendshipStatus: 1
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Couldn't reject friend request",
      error: error.message
    });
  }
});

friendRouter.post("/:userId/unfriend", auth, async (req, res) => {
  try {
    const { profileId } = res;
    const friendId = req.params.userId;

    // Check if the person is already a friend
    const result = await db
      .select("request_id")
      .from("friend_requests")
      .where({
        request_from: friendId,
        request_to: profileId,
        request_status: "accepted"
      })
      .union(
        db
          .select("request_id")
          .from("friend_requests")
          .where({
            request_from: profileId,
            request_to: friendId,
            request_status: "accepted"
          })
      );

    if (result.length !== 1) {
      throw new Error("Invalid operation");
    }

    const affectedRows = await db("friend_requests")
      .update({
        request_status: "rejected",
        request_on: new Date()
      })
      .where({ request_id: result[0].request_id });

    if (affectedRows !== 1) {
      throw new Error("Operation couldn't completed due to database failure");
    }

    res.status(200).json({
      success: true,
      msg: "User unfriended successfully",
      friendshipStatus: 1
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Couldn't unfriend the user",
      error: error.message
    });
  }
});

module.exports = friendRouter;
