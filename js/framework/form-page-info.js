/*********************************************************************
 Copyright 2014 by Brocade Communication Systems
 All rights reserved.

 This software is the confidential and proprietary information
 of Brocade Communication Systems, ("Confidential Information").
 You shall not disclose such Confidential Information and shall
 use it only in accordance with the terms of the license agreement
 you entered into with Brocade Communication Systems.
*********************************************************************/

/*
  FormPageInfo members:
  - all inherited members from PageInfo
  - _buttons is an array of button information,
       each item has 'type' (an eButtonType) and 'fn' (a callback function),
       and an optional 'selectEnableFn' (a callback function for customizing
       if a button should be enabled for a selected row) whose parameters are
       as follows: mySelectEnableFn(info, rowData, eButtonType, $button) and
       returns a boolean value to enable or disable the button for the selected
       row; if 'fn' is null, then the button will be disabled (except for Refresh
       and Help, where an internal default callback function will be called);
       for example:
	 [
		{ type: eButtonType.eButtonTypeEdit,    fn: onMyEdit },
		{ type: eButtonType.eButtonTypeDeploy,  fn: onMyDeploy, selectEnableFn: onMySelectEnableDeploy },
		{ type: eButtonType.eButtonTypeReject,  fn: onMyReject },
		{ type: eButtonType.eButtonTypeRefresh, fn: null }, // use internal callback
		{ type: eButtonType.eButtonTypeHelp,    fn: onMyHelp } // use custom callback
	 ]
*/
var FormPageInfo = PageInfo.extend(
{
	construct: function(htmlFile, componentId, title, buttons, initFn)
	{
		PageInfo.prototype.construct.call(
			this, htmlFile, componentId, ePageType.ePageTypeForm, title, initFn);

		if (typeof(buttons) === 'undefined') { buttons = null; }
		this._buttons = buttons;
	},
	getName: function()
	{
		// calls the getName() method of PageInfo
		return "FormPageInfo(" + this.getId() + ") extends " +
				arguments.callee.$.getName.call(this);
	},
	loadPageFromObject: function(keyData) // "this" is FormPageInfo and optional dictionary object
	{
		var info = this;
		if (typeof(keyData) === 'undefined') { keyData = null; }
		//closeSlideUp();
		//busy('Loading ' + info._title + ', please wait...');
		$('#workArea').empty();
		$('#workArea').load(info._htmlFile + ' #' + info._componentId, function(response, status, xhr)
		{
			info._$page = $('#workArea #' + info._componentId);
			if (info._initFn != null)
			{
				info._initFn.call(info); // pass in the info
			}
		} );
		$('#workAreaTitle').html(info._title);
		var $workAreaControls = $('#workAreaControls')
		$workAreaControls.empty();
		if (typeof(info._buttons) === 'undefined') { info._buttons = null; }
		if (info._buttons != null)
		{
			for (var buttonInfo in info._buttons)
			{
				var $b;
				var button = info._buttons[buttonInfo].type;
				if (button.value == eButtonType.eButtonTypeRefresh.value)
				{
					$b = $('<a href="#"><img class="workAreaControl" src="images/refresh.png"/></a>').attr(
					{
						id: button.id,
						value: button.name,
						title: "Refresh the data on this page"
					} );
					if (info._buttons[buttonInfo].fn == null)
					{
						$b.bind('click', info, info.onFormRefresh);
					}
				}
				else if (button.value == eButtonType.eButtonTypeHelp.value)
				{
					var helpExists = false;
					var hoverText = null;
					if (info._helpContent != null)
					{
						if ((info._helpContent._hoverText != null) &&
							(info._helpContent._hoverText != ""))
						{
							hoverText = info._helpContent._hoverText;
							helpExists = true;
						}
						else
						{
							hoverText = "View help for this page";
						}
						if (((info._helpContent._helpId != null) &&
							 (info._helpContent._helpId != "")) ||
							 (info._buttons[buttonInfo].fn != null))
						{
							helpExists = true;
						}
					}
					$b = $('<a href="#"><img class="workAreaControl" src="images/helpContext.png"/></a>').attr(
					{
						id: button.id,
						value: button.name,
						title: hoverText
					} );
					if (!helpExists)
					{
						$b.prop("disabled", true);
						$b.css('cursor','default');
					}
					else if (info._buttons[buttonInfo].fn == null)
					{
						$b.bind('click', info, info.onHelp);
					}
				}
				else
				{
					$b = $('<input type="button" class="workAreaControl"/>').attr(
					{
						name: button.id,
						value: button.name
					} );
					if (info._buttons[buttonInfo].fn == null)
					{
						$b.prop("disabled", true);
					}
				}
				if (info._buttons[buttonInfo].fn != null)
				{
					$b.bind('click', info, info._buttons[buttonInfo].fn);
				}
				$workAreaControls.append($b);
				info._buttons[buttonInfo].$button = $b;
			}
		}
		currentPageInfo = info;
		currentSlideUpFormInfo = null;
	},
	onFormRefresh: function(event)
	{
		/* event.data is the FormPageInfo object that manages the form page */
		var info = event.data;
		if (info == null) { return; }
		if (!(info instanceof FormPageInfo)) { return; }
		// do what???
	},
	getId: function() { return 4; }
} );

// alerts "TopClass(2) extends TablePageInfo(2) extends PageInfo(2)"
// looks good again, and there's no intermediate functions!
/*alert(new FormPageInfo().getName());*/
