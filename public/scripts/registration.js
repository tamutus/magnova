
const   userField = d3.select("#user-field"),
        userFree = d3.select("#username-free"),
        userTaken = d3.select("#username-taken"),
        emailField = d3.select("#email-field"),
        emailFree = d3.select("#email-free"),
        emailTaken = d3.select("#email-taken"),
        emailInvalid = d3.select("#email-invalid");
userField.on("input", confirmUsername);
emailField.on("input", confirmEmail);

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
        return;
    }
    let taken = await checkUsername(test);
    if(taken){
        userFree.classed("nodisplay", true);
        userTaken.classed("nodisplay", false);
    }
    else {
        userFree.classed("nodisplay", false);
        userTaken.classed("nodisplay", true);
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
        return;
    }
    let validation = test.split('@');
        if (validation.length <= 1){
            emailFree.classed("nodisplay", true);
            emailTaken.classed("nodisplay", true);
            emailInvalid.classed("nodisplay", false);
            return;
        }
        else {
            let suffix = validation[validation.length - 1];
            let suffixValidation = suffix.split('.');
            if(suffixValidation.length <= 1){
                emailFree.classed("nodisplay", true);
                emailTaken.classed("nodisplay", true);
                emailInvalid.classed("nodisplay", false);
                return;
            }
        }
    let taken = await checkEmail(test);
    if(taken){
        emailFree.classed("nodisplay", true);
        emailTaken.classed("nodisplay", false);
        emailInvalid.classed("nodisplay", true);
    }
    else {
        emailFree.classed("nodisplay", false);
        emailTaken.classed("nodisplay", true);
        emailInvalid.classed("nodisplay", true);
    }
}
function handleErrors(res){
    if(!res.ok){
        throw Error(res.status);
      }
      return res;
}