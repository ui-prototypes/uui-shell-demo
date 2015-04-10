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
  SlideUpFormPageInfo members:
  - all inherited members from PageInfo
  - _formDataUrl is the URL of the form data to load, if any
  - _keyData is the query key sent to the form data URL, if any
  - _bReadOnly is true if the page cannot be edited (default is false)
  - _applyButtonId is the ID of an Apply button within the form, if any 
  - _$applyButton is the jQuery reference to the Apply button, if any 
  - _resetButtonId is the ID of an Reset button within the form, if any 
  - _$resetButton is the jQuery reference to the Reset button, if any 
  - _dataLoadFn is the data loading function for the form, called when data is available,
       the form is "this" and a json object containing the new data is passed as a parameter
  - _clearFn is function for clearing the form,
       the form is "this" and the SlideUpFormPageInfo is passed as a parameter
  - _applyFn is the apply function (called to commit user changes),
       the Apply button is "this" and a click event is passed as a parameter
       where event.data is the SlideUpFormPageInfo
  - _resetFn is the reset function (called to undo user changes and revert to original data),
       the Reset button is "this" and a click event is passed as a parameter
       where event.data is the SlideUpFormPageInfo
  - _dataArray is the data to populate the form, if any, in JSON format
  - if _bClearFormForAdd is true, then _dataArray should be null and is ignored
  - if _bClearFormForAdd is false, then _dataArray must have valid contents
  - _bCloseOnApply defaults to true if unspecified
  - _bCloseOnReset defaults to false if unspecified
*/
var SlideUpFormPageInfo = PageInfo.extend(
{
	construct: function(htmlFile, componentId, formDataUrl, bReadOnly,
		applyButtonId, resetButtonId, initFn, dataLoadFn, clearFn, applyFn,
		resetFn, dataArray, bClearFormForAdd, bCloseOnApply, bCloseOnReset)
	{
		PageInfo.prototype.construct.call(
			this, htmlFile, componentId, ePageType.ePageTypeForm, null, initFn);

		this._formDataUrl = formDataUrl;
		this._keyData = null;
		if (typeof(bReadOnly) === 'undefined') { bReadOnly = false; }
		this._bReadOnly = bReadOnly;
		if (typeof(applyButtonId) === 'undefined') { applyButtonId = null; }
		this._applyButtonId = applyButtonId;
		this._$applyButton = null;
		if (typeof(resetButtonId) === 'undefined') { resetButtonId = null; }
		this._resetButtonId = resetButtonId;
		this._$resetButton = null;
		if (typeof(dataLoadFn) === 'undefined') { dataLoadFn = null; }
		this._dataLoadFn = dataLoadFn;
		if (typeof(clearFn) === 'undefined') { clearFn = null; }
		this._clearFn = clearFn;
		if (typeof(applyFn) === 'undefined') { applyFn = null; }
		this._applyFn = applyFn;
		if (typeof(resetFn) === 'undefined') { resetFn = null; }
		this._resetFn = resetFn;
		if (typeof(dataArray) === 'undefined') { dataArray = null; }
		this._dataArray = dataArray;
		if (typeof(bClearFormForAdd) === 'undefined') { bClearFormForAdd = false; }
		this._bClearFormForAdd = bClearFormForAdd;
		if (typeof(bCloseOnApply) === 'undefined') { bCloseOnApply = false; }
		this._bCloseOnApply = bCloseOnApply;
		if (typeof(bCloseOnReset) === 'undefined') { bCloseOnReset = false; }
		this._bCloseOnReset = bCloseOnReset;
	},
	getName: function()
	{
		// calls the getName() method of PageInfo
		return "SlideUpFormPageInfo(" + this.getId() + ") extends " +
				arguments.callee.$.getName.call(this);
	},
	loadPageFromObject: function(keyData) // "this" is SlideUpFormPageInfo and optional dictionary object
	{
		var info = this;
		if (typeof(keyData) === 'undefined') { keyData = null; }
		closeSlideUp();
		var parentHeight = $("#centerArea").height();
		var $wasu = $('#workAreaSlideUp');
		$wasu.empty();
		$wasu.load(info._htmlFile + ' #' + info._componentId, function(response, status, xhr)
		{
			// try after a delay of at least one tick
			setTimeout(function()
			{
				info._$page = $('#' + info._componentId);
				var formHeight = info._$page.height() + 20;
				//showMessageBox("Parent = " + parentHeight + " - form = " + formHeight);
				if (formHeight > 3 * parentHeight / 5)
				{
					formHeight = 3 * parentHeight / 5;
					//$mainInnerLayout.enableResizable('south');
					$mainInnerLayout.options['south'].resizable = true;
				}
				else
				{
					//$mainInnerLayout.disableResizable('south');
					$mainInnerLayout.options['south'].resizable = false;
				}
				$mainInnerLayout.sizePane("south", formHeight);
				logMsg("Setting height to " + formHeight);
				info._$applyButton = $("#" + info._applyButtonId);
				if (info._$applyButton != null)
				{
					if (info._applyFn != null)
					{
						info._$applyButton.bind('click', info, info._applyFn);
					}
					if (info._bCloseOnApply)
					{
						info._$applyButton.bind('click', info, onCloseSlideUp);
					}
				}
				info._$resetButton = $("#" + info._resetButtonId);
				if (info._$resetButton != null)
				{
					if (info._resetFn != null)
					{
						info._$resetButton.bind('click', info, info._resetFn);
					}
					if (info._bCloseOnReset)
					{
						info._$resetButton.bind('click', info, onCloseSlideUp);
					}
				}
				info._keyData = keyData;
				if (info._initFn != null)
				{
					info._initFn.call(info._$page, info);
				}
				if (info._formDataUrl != null)
				{
					$.ajax(
					{
						data: keyData,
						dataType: "json",
						type: "POST",
						url: info._formDataUrl,
						crossDomain: false,
						success: function(data) 
						{
							if (info._dataLoadFn != null)
							{
								info._dataLoadFn.call(info._$page, data.json_dump, info);
							}
						},
						error: function(jqXHR, textStatus, errorThrown) 
						{
							onAjaxError(jqXHR, textStatus, errorThrown,
										"Request Failed", "Request Method:");
						}
					});
				}
				else
				{
					if (info._dataLoadFn != null)
					{
						info._dataLoadFn.call(info._$page, info);
					}
				}
			}, 0);
			var $iconButton = $('<a href="#"><img id="closeSlideUpIcon" src="images/black_close_icon.png" style="float: right;" /></a>');
			$iconButton.prependTo('#workAreaSlideUp');
			$('#closeSlideUpIcon').bind('click', info, onCloseSlideUp);
			openSlideUp();
		} );
		currentSlideUpFormInfo = info;
	},
	getId: function() { return 5; }
} );

// alerts "TopClass(2) extends TablePageInfo(2) extends PageInfo(2)"
// looks good again, and there's no intermediate functions!
/*alert(new SlideUpFormPageInfo().getName());*/
