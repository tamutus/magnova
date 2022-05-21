const   userField = d3.select("#user-field"),
        userFree = d3.select("#username-free"),
        userTaken = d3.select("#username-taken"),
        passwordFields = d3.selectAll(".password"),
        password1 = d3.select("#password-1"),
        password2 = d3.select("#password-2"),
        pwDisplay = d3.select("#password-message"),
        visibilityToggler = d3.select("#visibility-toggler"),
        emailField = d3.select("#email-field"),
        emailFree = d3.select("#email-free"),
        emailTaken = d3.select("#email-taken"),
        emailInvalid = d3.select("#email-invalid"),
        submitter = d3.select("#submitter");

const validateRegistrationForm = async function(){
    if(await confirmUsername()){
        if(await confirmEmail()){
            if(comparePasswords()){
                return;
            };
        }
    }
    submitter.classed("inactive", true);
    submitter.attr("disabled", "disabled");
}
userField.on("input", validateRegistrationForm);
emailField.on("input", validateRegistrationForm);
password1.on("input", validateRegistrationForm);
password2.on("input", validateRegistrationForm);

function comparePasswords(){
    const   pw1 = password1.property("value"),
            pw2 = password2.property("value");
    if(pw1.length > 0){
        if(pw1 === pw2){
            submitter.classed("inactive", false);
            submitter.attr("disabled", null);
            displayMessage(pwDisplay, "Passwords match!");
            pwDisplay.classed("ok", true);
            return true;
        } else {
            displayMessage(pwDisplay, "Please ensure your passwords match.");
            pwDisplay.classed("ok", false);
        }
    } else {
        displayMessage(pwDisplay, null);
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
function displayMessage(messageDisplay, message){
    if(message?.length > 0){
        messageDisplay.classed("revealed", true);
        messageDisplay.html(message);
    } else {
        messageDisplay.classed("revealed", false);
        messageDisplay.text("");
    }
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

async function checkUsername(name){
    return fetch("/auth/usernametaken/" + name)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .catch(err => {
            console.log(err)
        });
}
async function confirmUsername(){
    let test = userField.property("value");
    if(test.length === 0){
        userFree.classed("nodisplay", true);
        userTaken.classed("nodisplay", true);
        return false;
    }
    let taken = await checkUsername(test);
    if(taken){
        userFree.classed("nodisplay", true);
        userTaken.classed("nodisplay", false);
        return false;
    }
    else {
        userFree.classed("nodisplay", false);
        userTaken.classed("nodisplay", true);
        return true;
    }
}
async function checkEmail(email){
    return fetch("/auth/emailtaken/" + email)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .catch(err => {
            console.log(err);
        });
}
async function confirmEmail(){
    let test = emailField.property("value");
    if(test.length === 0){
        emailFree.classed("nodisplay", true);
        emailTaken.classed("nodisplay", true);
        emailInvalid.classed("nodisplay", true);
        return false;
    }
    let validation = test.split('@');
        if (validation.length !== 2 || validation[0].length < 1 || validation[1].length < 1){
            emailFree.classed("nodisplay", true);
            emailTaken.classed("nodisplay", true);
            emailInvalid.classed("nodisplay", false);
            return false;
        }
        else {
            let suffix = validation[1];
            let suffixValidation = suffix.split('.');
            if( suffixValidation.length <= 1
                || suffixValidation[suffixValidation.length-1].length < 1
                || suffixValidation[suffixValidation.length-2].length < 1
            ){
                emailFree.classed("nodisplay", true);
                emailTaken.classed("nodisplay", true);
                emailInvalid.classed("nodisplay", false);
                return false;
            }
        }
    let taken = await checkEmail(test);
    if(taken){
        emailFree.classed("nodisplay", true);
        emailTaken.classed("nodisplay", false);
        emailInvalid.classed("nodisplay", true);
        return false;
    }
    else {
        emailFree.classed("nodisplay", false);
        emailTaken.classed("nodisplay", true);
        emailInvalid.classed("nodisplay", true);
        return true;
    }
}
function handleErrors(res){
    if(!res.ok){
        throw Error(res.status);
      }
      return res;
}