const messageSpan = d3.select("#main-message");

async function revoke(userID, username, roleName, buttonElement){
    buttonElement.disabled = true;
    const roleUpdate = {
        id: userID,
        roleName: roleName,
        operation: "remove"
    };
    const revokeResult = fetch("/auth/toggle-role", {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleUpdate)
    })
    .then(serverResponse => {
        console.log(serverResponse.status);
        if(serverResponse.status === 200){
            const butt = d3.select(buttonElement);
            butt.classed("red", false);
            butt.classed("green", true);
            butt.attr("onclick", `grant('${userID}', '${username}', '${roleName}', this);`);
            butt.attr("title", `Grant ${roleName} role to ${username}`);
            butt.text("❌");
        }
        return serverResponse.text();
    })
    .then(serverMessage => {
        displayMessage(serverMessage);
        buttonElement.disabled = false;
        return serverMessage;
    })
    .catch(error => {
        displayMessage("That didn't work!")
        console.error('Error:', error);
    });
}

async function grant(userID, username, roleName, buttonElement){
    buttonElement.disabled = true;
    const roleUpdate = {
        id: userID,
        roleName: roleName,
        operation: "add"
    };
    const revokeResult = fetch("/auth/toggle-role", {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleUpdate)
    })
    .then(serverResponse => {
        console.log(serverResponse.status);
        if(serverResponse.status === 200){
            const butt = d3.select(buttonElement);
            butt.classed("green", false);
            butt.classed("red", true);
            butt.attr("onclick", `revoke('${userID}', '${username}', '${roleName}', this);`);
            butt.attr("title", `Revoke ${roleName} role from ${username}`);
            butt.text("✅");
        }
        return serverResponse.text();
    })
    .then(serverMessage => {
        displayMessage(serverMessage);
        buttonElement.disabled = false;
        return serverMessage;
    })
    .catch(error => {
        displayMessage("That didn't work!")
        console.error('Error:', error);
    });
}

function displayMessage(message){
    messageSpan.classed("revealed", false);
    void messageSpan.node().offsetWidth;
    messageSpan.text(message);
    messageSpan.classed("revealed", true);
}