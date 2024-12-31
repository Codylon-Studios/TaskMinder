//REGISTER -- REGISTER -- REGISTER -- REGISTER
function registerAccount(username, password) {
    let url = "/auth/register";
    let data = {
        username: username,
        password: password
    };
    let hasResponded = false;
    $.post(url, data, function (result) {
        hasResponded = true;
        if (result == "0") {
            //success
            $("#register-success-toast .username").html(username);
            $("#register-success-toast").toast("show");
        }
        else if (result == "1") {
            //Unknown error on server side
            $("#error-server-toast").toast("show");
        }
    });
    setTimeout(() => {
        if (!hasResponded) {
            $("#error-server-toast").toast("show");
        }
    }, 1000);
}

//LOGIN -- LOGIN -- LOGIN -- LOGIN -- LOGIN
function LoginAccount(username, password) {
    let url = "/auth/login";
    let data = {
        username: username,
        password: password
    };
    let hasResponded = false;
    $.post(url, data, function (result) {
        hasResponded = true;
        if (result == "0") {
            $("#login-success-toast .username").html(username);
            $("#login-success-toast").toast("show");
        }
        else if (result == "1") {
            $("#error-server-toast").toast("show");
        }
        else if (result == "2") {
            $("#login-error-invalid-password").removeClass("d-none");
            $("#login-error-invalid-password").addClass("d-flex");
        }
    });
    setTimeout(() => {
        if (!hasResponded) {
            $("#error-server-toast").toast("show");
        }
    }, 1000);
};

function logoutAccount(){
    let url = "/auth/logout";
        let data = {};
        let hasResponded = false;
        $.post(url, data, function (result) {
            hasResponded = true;
            // Handle result
            if (result == "0") {
                console.log("logged out");
                $("#logout-success-toast").toast("show");
            }
            else if (result == "1") {
                console.log("internal server error");
            }
            else if (result == "2") {
                console.log("you are not logged in");
            }
        });
        setTimeout(() => {
            if (!hasResponded) {
                $("#error-server-toast").toast("show");
            }
        }, 5000);
}

function userNameExists(username) {
    let url = "/auth/checkusername";
    let data = { username: username };
  
    return new Promise((resolve, reject) => {
      $.post(url, data, function (result) {
        if (result == "0") {
          // REGISTER
          resolve(false);
        } else if (result == "1") {
          // LOGIN
          resolve(true);
        }
      }).fail(() => {
        reject(new Error("Server error"));
      });
    });
  }
           