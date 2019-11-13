const User = require("./user.class");

class Message {
  constructor(
    msg_id,
    msg_content,
    msg_from_id,
    msg_from_name,
    msg_to_id,
    msg_to_name,
    msgd_on
  ) {
    this.id = msg_id;
    this.content = msg_content;
    this.from = new User(msg_from_id, msg_from_name);
    this.to = new User(msg_to_id, msg_to_name);
    this.time = msgd_on;
  }
}

module.exports = Message;
