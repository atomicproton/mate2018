var auth2; // The Sign-In object.
var googleUser; // The current user.

function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    console.log("Signed in");
    //console.log("ID: " + profile.getId());
    //console.log('Full Name: ' + profile.getName());
    //console.log('Given Name: ' + profile.getGivenName());
    //console.log('Family Name: ' + profile.getFamilyName());
    //console.log("Image URL: " + profile.getImageUrl());
    //console.log("Email: " + profile.getEmail());

    // The ID token you need to pass to your backend:
    var id_token = googleUser.getAuthResponse().id_token;
    console.log("ID Token: " + id_token);

    updateView();
}

function onFailure() {
    console.log("Sign in failed");
}

function signOut() {
    auth2.signOut().then(function () {
        console.log('User signed out.');
    });
}

function initAccounts() {
    gapi.load('auth2', function () {
        auth2 = gapi.auth2.init({
            client_id: '784175548015-60ph30nv6lko5407tlvouh4k6k7gs1l3.apps.googleusercontent.com'
        });
        gapi.signin2.render('signin-button', {
            'scope': 'profile email',
            'longtitle': true,
            'onsuccess': onSignIn,
            'onfailure': onFailure
        });
        // Listen for sign-in state changes.
        auth2.isSignedIn.listen(signinChanged);

        // Listen for changes to current user.
        auth2.currentUser.listen(userChanged);

        updateView();
        console.log("Accounts initialized");
    });
}

var intializeaccounts = initAccounts();

var signinChanged = function (val) {
    console.log('Signin state changed to ', val);
    updateView();
}

var userChanged = function (val) {
    console.log('User state changed to ', val);
}

function updateView() {
    //Hide buttons when signed in
    if (auth2.isSignedIn.get() == true) {
        console.log("Currently signed in");
        for (let element of document.getElementsByClassName('no-signed-in')) {
            element.style.display = 'none';
        }
        for (let element of document.getElementsByClassName('signed-in')) {
            element.style.display = 'block';
        }
    } else {
        console.log("Currently signed out");
        //Hide buttons when signed out
        for (let element of document.getElementsByClassName('signed-in')) {
            element.style.display = 'none';
        }
        for (let element of document.getElementsByClassName('no-signed-in')) {
            element.style.display = 'block';
        }
    }
}

//window.addEventListener("load", initAccounts());