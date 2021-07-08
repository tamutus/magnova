const	mongoose = require("mongoose"),
		Schema = mongoose.Schema,
		passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
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
    inbox: {type: Schema.Types.ObjectId, ref: "Inbox"},
    location: {type: Schema.Types.ObjectId, ref: "Location"},
	issues: [{type: Schema.Types.ObjectId, ref: "IssueTemplate"}],
	edgeVotes: [{ 
		source: {type: Schema.Types.ObjectId, ref: "IssueTemplate"}, 
		targets: [{
			target: {type: Schema.Types.ObjectId, ref: "IssueTemplate"},
			vote: Boolean
		}]
	}],
    projectVotes: [{
        issue: {type: Schema.Types.ObjectId, ref: "IssueTemplate"},
        targets: [{
            project: {type: Schema.Types.ObjectId, ref: "ProjectTemplate"},
            vote: Boolean
        }]
    }],
    activeTasks: [{type: Schema.Types.ObjectId, ref: "LocalTask"}],
	contributions: {
        issues: [{
            issue: {type: Schema.Types.ObjectId, ref: "LocalIssue"},
            hours: Number
        }],
        projects: [{
            project: {type: Schema.Types.ObjectId, ref: "LocalProject"},
            hours: Number
        }],
        tasks: [{
            task: {type: Schema.Types.ObjectId, ref: "LocalTask"},
            hours: Number,
        }]
    },
    comments: [{type: Schema.Types.ObjectId, ref: "Comment"}],
    edits: [{
        link: String,
        version: Number
    }],
    following: [{type: Schema.Types.ObjectId, ref: "Tag"}],
    skills: [{
        skill: {type: Schema.Types.ObjectId, ref: "Skill"},
        hours: Number
    }],
    badges: [{type: Schema.Types.ObjectId, ref: "Badge"}]
});
UserSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", UserSchema);