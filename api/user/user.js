const	mongoose = require('mongoose'),
		Schema = mongoose.Schema,
		passportLocalMongoose = require("passport-local-mongoose");
var userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
		unique: true
	},
	preferredName: String,
	email: {
		type: String,
		required: true,
		unique: true
	},
	pfpLink: String,
	bio: String,
	issues: [{type: Schema.Types.ObjectId, ref: "Issue"}],
	edgeVotes: [{ 
		source: {type: Schema.Types.ObjectId, ref: "Issue"}, 
		targets: [{
			target: {type: Schema.Types.ObjectId, ref: "Issue"},
			vote: Boolean
		}] 
	}],
	badges: [{type: Schema.Types.ObjectId, ref: "Badge"}],
	watching: [{type: Schema.Types.ObjectId, ref: "Issue"}]
});
userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", userSchema);