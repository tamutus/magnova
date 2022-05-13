const express = require('express'),
		router = express.Router();

router.get("change-password", (_req, res) => {
    res.status(302);
    return res.redirect("/settings/change-password");
})
module.exports = router;