/*********************************************************************
 Copyright 2015 by Brocade Communication Systems
 All rights reserved.

 This software is the confidential and proprietary information
 of Brocade Communication Systems, ("Confidential Information").
 You shall not disclose such Confidential Information and shall
 use it only in accordance with the terms of the license agreement
 you entered into with Brocade Communication Systems.
*********************************************************************/

/*
  LoginPageInfo members:
  - all inherited members from FormPageInfo
*/
var LoginPageInfo = FormPageInfo.extend(
{
	construct: function()
	{
		FormPageInfo.prototype.construct.call(
			this, 'views/login-form.html', 'loginFormWorkArea',
				'Universal UI Login', null, this.initLoginForm);
	},
	getName: function()
	{
		// calls the getName() method of PageInfo
		return "LoginPageInfo(" + this.getId() + ") extends " +
				arguments.callee.$.getName.call(this);
	},
	onFormRefresh: function(event)
	{
		/* event.data is the FormPageInfo object that manages the form page */
		var info = event.data;
		if (info == null) { return; }
		if (!(info instanceof FormPageInfo)) { return; }
		// do what???
	},
	initLoginForm: function()
	{
		$("#loginFormWorkArea #loginButton").click(this.onApplyLogin);
		$("#loginFormWorkArea #clearButton").click(this.onClearLogin);
	},
	onApplyLogin: function(event) // event.data is LoginPageInfo
	{
		var loginDict = { };

		loginDict["userId"] = $("#loginFormWorkArea #userField").val();
		if (loginDict["userId"] == "")
		{
			/*showMessageBox*/alert("Please enter a User ID", "Missing Input");
			return;
		}

		loginDict["password"] = $("#loginFormWorkArea #passwordField").val();
		if (loginDict["password"] == "")
		{
			/*showMessageBox*/alert("Please enter a Password", "Missing Input");
			return;
		}

		// do something with this data
		busy("Logging in, please wait ...");
		$.ajax(
		{
			data: loginDict,
			dataType: "json",
			type: "POST",
			url: "fakeApis/authenticateUser.txt",
			crossDomain: false,
			success: function(data)
			{
				if (data.json_dump.result == 'OK')
				{
					///*showMessageBox*/alert("User Authenticated OK", "Authentication Succeeded");
					busy("Log in accepted.  Loading, please wait ...");
					loadGenericGridPage();
				}
				else
				{
					/*showMessageBox*/alert(data.json_dump.reason, "Authentication Failed");
				}
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
				//onAjaxError(jqXHR, textStatus, errorThrown, "User Authentication Failed");
			}
		});
	},
	onClearLogin: function(event) // event.data is LoginPageInfo
	{
		$("#loginFormWorkArea #userField").val("");
		$("#loginFormWorkArea #passwordField").val("");
	},
	getId: function() { return 4; }
} );

// alerts "TopClass(2) extends TablePageInfo(2) extends PageInfo(2)"
// looks good again, and there's no intermediate functions!
/*alert(new FormPageInfo().getName());*/
