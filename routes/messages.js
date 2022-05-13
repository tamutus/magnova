// const { route } = require('.');
const { isLoggedIn } = require("../middleware");

const express = require('express'),
		router = express.Router();

router.get("/", isLoggedIn, (req, res) => {
    return res.render("messaging/inbox", {
        title: `${req.user.preferredName?.length > 0 ? req.user.preferredName : req.user.username}'s Settings`,
        currentUser: req.user
    });
})
module.exports = router;