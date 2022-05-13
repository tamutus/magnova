const express = require('express'),
		router = express.Router();

const { isLoggedIn } = require("../middleware");

router.get("/", isLoggedIn, (req, res) => {
    return res.render("users/updates", {
        title: "Updates – Magnova",
        updates: []
    });
});

module.exports = router;