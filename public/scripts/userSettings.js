const   oldPassword = d3.select("#old-password"),
        oldPwDisplay = d3.select("#old-password-display"),
        resetToken = d3.select("#reset-token"),
        userIdDisplay = d3.select("#user-id"),
        password1 = d3.select("#new-password"),
        pwDisplay1 = d3.select("#new-password-display-1"),
        password2 = d3.select("#password-confirmation"),
        pwDisplay2 = d3.select("#new-password-display-2"),
        passwordFields = d3.selectAll(".password"),
        visibilityToggler = d3.select("#visibility-toggler"),
        submitter = d3.select("#password-submitter"),
        pwResponse = d3.select("#pw-change-response");

function validatePasswordForm(){
    if(ensureOldPassword()){
        if(verifyPassword()){
            return comparePasswords();
        }
    }
}

function ensureOldPassword(){
    if(oldPassword.empty() || oldPassword.property("value").length > 0){
        oldPwDisplay.classed("ok", true);
        displayMessage(oldPwDisplay, null);
        return true;
    } else {
        oldPwDisplay.classed("ok", false);
        displayMessage(oldPwDisplay, "Please enter your old password");
        displayMessage(pwDisplay1, null);
        displayMessage(pwDisplay2, null);
        return false;
    }
}
function verifyPassword(){
    if(password1.property("value").length > 0){
        // test the password against library here.
        pwDisplay1.classed("ok", true);
        pwDisplay1.classed("revealed", false);
        return true;
    } else {
        pwDisplay1.classed("ok", false);
        pwDisplay2.classed("ok", false);
        displayMessage(pwDisplay1, "Please enter a new password");
        displayMessage(pwDisplay2, null);
        return false;
    }
}

function comparePasswords(){
    const   pw1 = password1.property("value"),
            pw2 = password2.property("value");
    if(pw1.length > 0){
        if(pw1 === pw2){
            submitter.classed("inactive", false);
            submitter.attr("disabled", null);
            // submitter.on("click", submitNewPassword);
            displayMessage(pwDisplay2, "Passwords match!");
            pwDisplay2.classed("ok", true);
            return true;
        } else {
            submitter.classed("inactive", true);
            submitter.attr("disabled", "disabled");
            // submitter.on("click", null);
            displayMessage(pwDisplay2, "Please ensure your passwords match.");
            pwDisplay2.classed("ok", false);
        }
    } else {
        displayMessage(pwDisplay2, null);
    }
    return false;
}

function togglePasswordVisibility(){
    if(passwordFields.attr("type") === "password"){
        passwordFields.attr("type",  "text");
        visibilityToggler.text("Hide passwords");
    } else {
        passwordFields.attr("type",  "password");
        visibilityToggler.text("Show passwords");
    }
}

function submitNewPassword(){
    if(password1.property("value") !== password2.property("value")){
        displayMessage(pwResponse, "Please ensure your passwords match.");
    }
    else if(window.confirm("Do you really want to update your password?")){
        if(!resetToken.empty() && !userIdDisplay.empty() && oldPassword.empty()){
            resetPassword(userIdDisplay.text(), resetToken.text(), password1.property("value"));
        } else {
            saveNewPassword(oldPassword.property("value"), password1.property("value"));
        }
    }
}

async function saveNewPassword(oldPassword, newPassword){
    submitter.classed("inactive", true);
    submitter.on("click", null);
    fetch(`/settings/change-password`, {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            oldPassword: oldPassword,
            newPassword: newPassword
        })
    })
        .then(res => {
            if(!res.ok){
                displayMessage(pwResponse, `Error trying to save the new password. <a href="/wiki/61154178c1aa0c00156455b9">Submit a bug?</a>`);
                throw Error(res.status);
            }
            return res;
        })
        .then(res => res.json())
        .then(res => {
            if(res.userMessage === "Successfully saved!"){
                displayMessage(pwResponse, res.userMessage);
                pwResponse.classed("ok", true);
            } else {
                displayMessage(pwResponse, res.userMessage);
                if(res.devMessage) { console.error(res.devMessage); }
                pwResponse.classed("ok", false);
            }
            return res;
        })
        .catch(console.error);
}
function resetPassword(userID, resetToken, newPassword){
    submitter.classed("inactive", true);
    submitter.on("click", null);
    fetch(`/auth/reset-password/${userID}/${resetToken}`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            newPassword: newPassword
        })
    }).then(res => {
        if(!res.ok){
            displayMessage(pwResponse, `Error trying to save the new password. <a href="/wiki/61154178c1aa0c00156455b9">Submit a bug?</a>`);
            throw Error(res.status);
        }
        return res;
    })
    .then(res => res.json())
    .then(res => {
        if(res.userMessage === "Successfully saved!"){
            displayMessage(pwResponse, res.userMessage);
            pwResponse.classed("ok", true);
        } else {
            displayMessage(pwResponse, res.userMessage);
            if(res.devMessage) { console.error(res.devMessage); }
            pwResponse.classed("ok", false);
        }
        return res;
    })
    .catch(console.error);
}
function displayMessage(messageDisplay, message){
    if(message?.length > 0){
        messageDisplay.classed("revealed", true);
        messageDisplay.html(message);
    } else {
        messageDisplay.classed("revealed", false);
        messageDisplay.text("");
    }
}