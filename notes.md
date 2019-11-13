"node_modules/jquery/dist/jquery.min.js",
"node_modules/popper.js/dist/umd/popper.min.js",
"node_modules/bootstrap/dist/js/bootstrap.min.js"

netstat -ltnp
pidof node
kill 15109

Ctrl+K Ctrl+J to unfold Ctrl+(0-9)

# Route List

POST /users/login [DONE]
POST /users/register [DONE]
POST /users/logout [DONE]
GET /users/profile/:userId => returns all posts created by user id [DONE]
GET /users/timeline => returns all posts created by friends of user id [DONE]

// TODO: mutual friend
GET /users/friend-list [DONE]
GET /users/received-riend-requests [DONE]
GET /users/sent-friend-requests [DONE]
POST /users/:userId/add-friend => Sent friend request [DONE]
POST /users/:userId/cancel-request => Cancel sent request [DONE]
POST /users/:userId/confirm-request => Confirm incoming request [DONE]
POST /users/:userId/delete-request => Delete incoming request [DONE]
POST /users/:userId/unfriend [DONE]

GET /users/inbox [DONE]
GET /users/messages/:userId [DONE]
POST /users/messages/:userId [DONE]

GET /users/search

GET /posts/:postId => Shows info about a post [DONE]
POST /posts => Create new post [DONE]
PATCH /posts/:postId => Update a particular post, then redirect [DONE]
DELETE /posts/:postId => Delete a particular post, then redirect [DONE]
POST /posts/:postId/like => Like a particular post [DONE]
POST /posts/:postId/dislike => Dislike a particular post [DONE]
GET /posts/:postId/liked-by-users => Set of users who liked a particular post [DONE]
POST /posts/:postId/share => Share a particular post [DONE]

GET /posts/:postId/comments => Fetch list of comments associated with the postId (Index route) [DONE]
POST /posts/:postId/comments => Create new comment associated with postId [DONE]

PATCH /comments/:commentId => Update a particular comment [DONE]
DELETE /comments/:commentId => Delete a particular comment [DONE]
POST /comments/:commentId/like [DONE]
POST /comments/:commentId/dislike [DONE]
GET /comments/:commentId/liked-by-users [DONE]

# Per post actions

1. Like post: call the associated function, which will have post ID as sole parameter. Return list of users who liked the post.

List of mutual friends
Friendship status with the user

undefined is not iterable (cannot read property Symbol(Symbol.iterator))
ajv schema validation
