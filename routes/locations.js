const { isLoggedIn } = require("../middleware");

const express = require('express'),
		router = express.Router();

// Mongoose model imports
const 	User = require('../api/user/user'),
		Issue = require('../api/issue/issue.template'),
        Issuegraph = require("../api/issue/issue.graph"),
        Project = require("../api/project/project.template"),
        Projectgraph = require("../api/project/project.graph"),
        Task = require("../api/task/task.template"),
        Taskgraph = require("../api/task/task.graph"),
        Harm = require("../api/issue/harm.model"),
        Resource = require("../api/resources/resource.model"),
        Tag = require("../api/tags/tag.model"),
        Talkpage = require("../api/comments/talkpage.model"),
        Patchlist = require("../api/patchlist.model"),
        Location = require("../api/maps/location.model");

router.get("/", (req, res) => {
    return res.render("locations/map", {
        title: "Magnova Maps"
    });
});

router.get("/nowhere", (req, res) => {
    return res.status(404).render("locations/nowhere", {
        title: "Magnova — Nowhere"
    });
})
// Since the front-end is using the library Name That Color, Magnova will store hex values instead of rgb. This code converts all locations with rgb colors to hex.
// router.put("/updatecolors", (req, res) => {
//     Location.find({}, (err, all) => {
//         if(err){
//             console.log(err);
//             return res.send(err);
//         } else {
//             if(all.length > 0){
//                 for(location of all){
//                     if(location.color.slice(0, 3) === 'rgb'){
//                         const rgbColorString = location.color.slice(4, location.color.length - 1);
//                         const rgbArray = rgbColorString.split(',');
//                         for(component of rgbArray){
//                             component = component.trim();
//                         }
//                         location.color = rgbToHex(rgbArray[0], rgbArray[1], rgbArray[2]);
//                         location.markModified("color");
//                         location.save();
//                         console.log(location.color);
//                     }
//                 }
//                 return res.send("Found locations");
//             } else {
//                 return res.send("empty set");
//             }
//         }
//     })
// });

// This code can convert rgb to hex ~ from https://stackoverflow.com/a/5624139/16620488
// function componentToHex(c) {
//     var hex = Number(c).toString(16);
//     return hex.length == 1 ? "0" + hex : hex;
// }
// function rgbToHex(r, g, b) {
//     return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
// }

router.post("/", isLoggedIn, (req, res) => {
    // To-do: verify that the location isn't its parent, and verify that the superlocation is a mongodb object (unless this is built in)
    
    let {name, geometry, geometrySource, color, sublocationWord, superlocation} = req.body;
    if(!name || !geometry || !geometrySource){ // after adding Earth, require parent location (and capture it above)
        return res.send({
            message: "Entering a location requires a name, geoJSON geometry, and an attribution. Make sure you've filled out every field.",
            content: {}
        });
    }
    if(!superlocation){
        return res.send({
            message: "The superlocation wasn't submitted for this new location.",
            content: {}
        });
    }
    if(!color){
        color = "#d195f0";
    }
    const newLocation = {
        name: name,
        geometry: geometry,
        geometrySource: geometrySource,
        color: color,
        sublocationWord: sublocationWord,
        superlocation: superlocation
    };
    
    Location.find({$and: [{name: newLocation.name}, {superlocation: newLocation.superlocation}]}, (err, existing) => {
        if(err){
            return res.send({
                message: "Error trying to check if something already has this name.",
                content: err
            });
        } else {
            if(existing.length !== 0){
                return res.send({
                    message: "There was already a location with this name and superlocation.",
                    content: existing
                });
                // (Phasing out this code)
                // If there's only one result of Location.find, then just update that model's geometry and return it
                // if(existing.length === 1){
                //     existing[0].geometry = newLocation.geometry;
                //     existing[0].markModified("geometry");
                //     existing[0].geometrySource = newLocation.geometrySource;
                //     existing[0].markModified("geometrySource");
                //     existing[0].save();
                //     return res.send({
                //         message: "OK",
                //         content: existing[0]
                //     });
                // } else {
                //     return res.send({
                //         message: "There was already a location with this name and superlocation.", // To-do: add a bug report here
                //         content: existing
                //     });
                // }
            } else {
                Location.create(newLocation, (err, location) => {
                    if(err){
                        console.log(err);
                        return res.send({
                            message: "Error creating a new location.",
                            content: err
                        });
                    } else {
                        Location.findById(newLocation.superlocation, (err, parent) => {
                            if(err){
                                console.log(err);
                            } else if(parent){
                                parent.sublocations.push(location._id);
                                parent.markModified("sublocations");
                                parent.save();
                            }
                        });
                        Talkpage.create({root: location._id, rootType: "Location"}, (err, talkpage) => {
                            if(err){
                                console.log(`Trouble creating talkpage for location ${location.name}: ${err}`);
                            }
                            else{
                                location.talkpage = talkpage._id;
                                location.markModified("talkpage");
                                Patchlist.create({root: location._id, rootType: "Location"}, (err, patchlist) => {
                                    if(err){
                                        console.log(`Trouble creating patchlist for location ${location.name}: ${err}`);
                                    }
                                    else {
                                        location.edits = patchlist._id;
                                        location.markModified("edits");
                                        location.save();
                                        return res.send({
                                            message: "OK",
                                            content: location
                                        });
                                    }
                                });
                            }
                        });                           
                    }
                });
            }
        }
    });
}); 

// router.put("/fillearthwithcountries", (req, res) => {
//     Location.findById("61278ac50ae7bf3ad8fb47f3", (err, earth) => {
//         if(err){
//             return res.send(err);
//         } else if(earth) {
//             Location.find({name: {$ne: "Earth"}}, (err, countries) => {
//                 if(err){
//                     return res.send(err);
//                 }
//                 else if(countries?.length > 0){
//                     if(!earth.sublocations){
//                         earth.sublocations = [];
//                     }
//                     for(country of countries){
//                         earth.sublocations.push(country._id);
//                     }
//                     earth.markModified("sublocations");
//                     earth.save();
//                     return res.send(earth);
//                 } else {
//                     res.send("Couldn't find other locations");
//                 }
//             });
//         }
//         else {
//             res.send("Nothing");
//         }
//     });
// });

router.get("/data/:id", (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Location.findById(req.params.id)
            .populate("sublocations", "name")
            .populate("superlocation", "name sublocationWord")
            // .populate("tags")
            // .populate("resources")
            // .populate("harms")
            // .populate("issues")
            // .populate("projects")
            // .populate("tasks")
            .exec((err, location) => {
                if(err){
                    console.log(err);
                    return res.send({
                        message: "Error finding the location",
                        content: err
                    });
                } else {
                    return res.send({
                        message: "OK",
                        content: location
                    });
                }
            });
    } else {
        return res.send({
            message: "Tried to get data for a location using an invalid ID",
            content: {}
        });
    }
});

router.get("/sublocations/:id", (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Location.findById(req.params.id)
            .populate("sublocations")
            .exec((err, superLocation) => {
                if(err){
                    console.log(err);
                    return res.send({
                        message: "Error finding and populating this location",
                        content: err
                    });
                } else {
                    return res.send({
                        message: "OK",
                        content: superLocation.sublocations
                    });
                }
            })
    } else {
        return res.send({
            message: "Tried to get sublocations for a location with an invalid ID",
            content: {}
        });
    }
})
router.put("/geometry/:id", isLoggedIn, (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        const {geometry, geometrySource, name, info, sublocationWord, patch, latestVersion} = req.body;
    } else {
        return res.send("Tried to edit geometry for a location with an invalid ID");
    }
});
router.put("/color/:id", isLoggedIn, (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Location.findById(req.params.id, (err, location) => {
            if(err){
                console.log(err);
                return res.send(err);
            } else {
                if(location){
                    location.color = req.body.color;
                    location.markModified("color");
                    location.save();
                    return res.send(location.color);
                }
                else return res.send("No location");
            }
        });
    } else {
        return res.send("Tried coloring a location using an Invalid ID");
    }
})
router.put("/adopt/:newParent/:child", isLoggedIn, (req, res) => {
    const   childID = req.params.child,
            parentID = req.params.newParent;
    if(childID.match(/^[0-9a-fA-F]{24}$/) && parentID.match(/^[0-9a-fA-F]{24}$/)){
        Location.findById(parentID, (err, parent) => {
            if(err){
                console.log(err);
                return res.send({
                    message: `Error finding a parent with the ID ${parentID}`,
                    content: err
                });
            } else if(parent) {
                Location.findById(childID, (err, child) => {
                    if(err){
                        console.log(err);
                        return res.send({
                            message: `Error finding a child location with the ID ${childID}`,
                            content: err
                        });
                    } else if(child) {
                        Location.find({sublocations: child._id}, (err, exParents) => {
                            if(err){
                                console.log(err);
                                return res.send({
                                    message: `Found the locations you were interested in, but error trying to find parents`,
                                    content: err
                                });
                            } else {
                                if(exParents.length > 0) {
                                    for(exParent of exParents){
                                        const exChildIndex = exParent.sublocations.find(ex => ex === child._id);
                                        exParent.sublocations.splice(exChildIndex, 1);
                                        exParent.markModified("sublocations");
                                        exParent.save();
                                    }
                                }
                                parent.sublocations.push(child);
                                parent.markModified("sublocations");
                                parent.save();
                                
                                child.superlocation = parent;
                                child.markModified("superlocation");
                                child.save();
                                return res.send({
                                    message: "OK",
                                    content: parent
                                });
                            }
                        });
                    } else {
                        return res.send({message: `Found the parent, but didn't find a child location with the ID ${childID}`});
                    }
                });
            } else {
                return res.send({message: `Didn't find a parent with the ID ${parentID}`});
            }
        });
    } else {
        return res.send({message: "Either the parent or child location had an incorrect ID"});
    }
});

router.put("/:id", isLoggedIn, (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        const {name, info, sublocationWord, patch, latestVersion} = req.body;
        
        Location.findById(req.params.id)
            .populate("edits")
            .exec(async (err, location) => {
                if(err){
                    console.log(err);
                    return res.send("Error finding the location and populating its edits");
                } else {
                    let returnMessage = "Update: ";
                    if(location.name != name || location.info != info || location.sublocationWord != sublocationWord){
                        if(!location.version){
                            location.version = 0;
                            location.markModified("version");
                        }
                        if(location.version != latestVersion){
                            return res.send("Latest version changed while you were creating a patch. Try again now.");
                        }
                        if(!location.edits){
                            Patchlist.create({root: location._id, rootType: "Location"}, (err, patchlist) => {
                                if(err){
                                    console.log(err);
                                    return res.send("No patch list for edits, and an error creating a new one: " + err);
                                }
                                else {
                                    location.edits = patchlist;
                                    location.markModified("edits");
                                }
                            });
                        }
                        if(location.sublocationWord != sublocationWord){
                            location.sublocationWord = sublocationWord;
                            returnMessage += "Successful for this place's word for its sublocations. "
                        }
                        if(location.info != info){
                            location.edits.patches.push({
                                editor: req.user._id,
                                patch: patch
                            });
                            location.edits.markModified("patches");
                            location.edits.save();

                            location.version++;
                            location.markModified("version");
                            location.info = info;

                            returnMessage += "Successful for this place's info. ";
                        }
                        location.save();                    
                    } else {
                        returnMessage += " not needed.";
                    }
                    return res.send(returnMessage);
                }
            });
    } else {
        return res.send("Tried editing a location using an incorrect ID");
    }
});

// router.put("/:id", isLoggedIn, (req, res) => {
// 	const {name, info, image, patch, latestVersion} = req.body;
//     if(name.length == 0){
//         res.send("You sent in a blank name!");
//     }
//     Issue.findById(req.params.id)
//         .populate("edits")
//         .exec(async (err, issue) => {
//             if(err){
//                 console.log(err);
//             }
//             else{
//                 let returnMessage = `Update not needed`;
//                 if(issue.name != name || issue.info != info || issue.image != image){
//                     if(!issue.version){
//                         issue.version = 0;
//                         issue.markModified("version");
//                     }
//                     if(issue.version != latestVersion){
//                         return res.send("Latest version changed while you were creating a patch. Try again now.")
//                     }
//                     if(!issue.edits){
//                         Patchlist.create({root: issue._id, rootType: "IssueTemplate"}, (err, patchlist) => {
//                             if(err){console.log(err);}
//                             else{
//                                 issue.edits = patchlist;
//                                 issue.markModified("edits");
//                             }
//                         });
//                     }
//                     if(issue.info != info){
//                         issue.edits.patches.push({
//                             editor: req.user._id,
//                             patch: patch
//                         });
//                         issue.edits.markModified("patches");
//                         issue.edits.save();
                        
//                         issue.version++;
//                         issue.markModified("version");
//                         issue.info = info;
//                     }
                    
//                     if(!issue.editors){
//                         issue.editors = [];
//                         issue.markModified("editors");
//                     }
//                     if(!issue.editors.find(e => String(e) == String(req.user._id))){
//                         issue.editors.push(req.user._id);
//                         issue.markModified("editors");
//                     }

//                     issue.name = name;
//                     issue.image = image;

//                     issue.save();
//                     returnMessage = `Update successful!`;
//                 }
//                 return res.send(returnMessage);
//             }
//         });
// })

router.get("/:id", (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Location.findById(req.params.id)
            .populate("superlocation", "name sublocationWord")
            .populate("sublocations", "name")
            .populate("tags")
            .populate("resources")
            .populate("harms")
            .populate("issues", "name")
            .populate("projects", "name")
            .populate("tasks", "name")
            .exec((err, location) => {
                if(err){
                    console.log(err);
                    // Replace this and the one below with a 404 page
                    res.redirect("back");
                } else if(!location){
                    res.redirect("back");
                } else {
                    res.render("locations/view", {
                        title: location.name + " on Magnova",
                        shownLocation: location
                    });
                }
            });
    } else {
        return res.redirect("/locations/nowhere");
    }
});

router.get("/*", (req, res) => {
    res.status(404).redirect("/locations/nowhere");
});
router.put("/*", (req, res) => {
    res.status(404).redirect("/locations/nowhere");
});
router.post("/*", (req, res) => {
    res.status(404).redirect("/locations/nowhere");
});
router.delete("/*", (req, res) => {
    res.status(404).redirect("/locations/nowhere");
});

module.exports = router;