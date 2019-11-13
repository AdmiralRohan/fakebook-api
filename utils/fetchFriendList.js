const db = require("../dbConnection");

module.exports = profileId =>
  db
    .select("request_from")
    .from("friend_requests")
    .where({ request_to: profileId, request_status: "accepted" })
    .union(
      db
        .select("request_to")
        .from("friend_requests")
        .where({ request_from: profileId, request_status: "accepted" })
    );
