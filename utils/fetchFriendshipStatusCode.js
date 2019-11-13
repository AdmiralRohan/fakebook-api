const db = require("../dbConnection");

module.exports = async (profileId, friendId) => {
  let friendshipStatusCode = 0;

  if (profileId != friendId) {
    // Add Friend
    let result = await db
      .select("request_id")
      .from("friend_requests")
      .where(function() {
        this.where("request_from", profileId).andWhere("request_to", friendId);
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

    if (result.length === 0) {
      friendshipStatusCode = 1;
    }

    // Friend
    result = await db
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

    if (result.length === 1) {
      friendshipStatusCode = 2;
    }

    // Friend request sent
    result = await db
      .select("request_id")
      .from("friend_requests")
      .where({
        request_from: profileId,
        request_to: friendId,
        request_status: "pending"
      });

    if (result.length === 1) {
      friendshipStatusCode = 3;
    }

    // Respond to friend request
    result = await db
      .select("request_id")
      .from("friend_requests")
      .where({
        request_from: friendId,
        request_to: profileId,
        request_status: "pending"
      });

    if (result.length === 1) {
      friendshipStatusCode = 4;
    }
  }

  return friendshipStatusCode;
};
