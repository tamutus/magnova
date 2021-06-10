const express = require('express'),
		router = express.Router();

router.get("/", (req, res) => {
	res.redirect("/nexus");
});
router.get("/nexus", (req, res) => {
	res.render('forceGraph', {
		title: "Magnova Issue Builder"
	});
});
router.get("/about", (req, res) => {
	res.render("about", {
		title: "About Magnova"
	});
});
router.get("/values", (req, res) => {
	res.render("values", {
		title: "Magnova's Values"
	});
});
router.get("/methodology", (req, res) => {
	res.render("methodology", {
		title: "Magnova's Methodology"
	});
});
router.get("/donate", (req, res) => {
	res.render("donate", {
		title: "Help Magnova Grow"
	});
});
module.exports = router;