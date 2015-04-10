/*********************************************************************
 Copyright 2014 by Brocade Communication Systems
 All rights reserved.

 This software is the confidential and proprietary information
 of Brocade Communication Systems, ("Confidential Information").
 You shall not disclose such Confidential Information and shall
 use it only in accordance with the terms of the license agreement
 you entered into with Brocade Communication Systems.
*********************************************************************/

// as we get more polymorphic and OO, this page type can get phased out
var ePageType =
{
	ePageTypeForm:      { value: 0, id: "formPage"      },
	ePageTypeTable:     { value: 1, id: "tablePage"     },
	ePageTypeDashboard: { value: 2, id: "dashboardPage" }
};

var eButtonType =
{
	eButtonTypeAdd:     { value: 0, name: "Add",     id: "addButton"     },
	eButtonTypeEdit:    { value: 1, name: "Edit",    id: "editButton"    },
	eButtonTypeDetails: { value: 2, name: "Details", id: "detailsButton" },
	eButtonTypeDelete:  { value: 3, name: "Delete",  id: "deleteButton"  },
	eButtonTypeRefresh: { value: 4, name: "Refresh", id: "refreshButton" },
	eButtonTypeHelp:    { value: 5, name: "Help",    id: "helpButton"    }
}; // add more as needed, just keep the ids in nice sequence

//Defines the top level Class

function Class() { }

Class.prototype.construct = function() {};

Class.extend = function(def)
{
	var classDef = function()
	{
		if (arguments[0] !== Class) { this.construct.apply(this, arguments); }
	};
 
	var proto = new this(Class);
	this.superClass = this.prototype;
 
	for (var n in def)
	{
		var item = def[n];                      
		if (item instanceof Function) { item.$ = this.superClass; }
		proto[n] = item;
	}

	classDef.prototype = proto;

	// give this new class the same static extend method    
	classDef.extend = this.extend;      
	return classDef;
};

/*
  PageInfo members:
  - _htmlFile is the HTML document to load in order to get a chunk of UI components
  - _componentId is the chunk of UI components to extract and use as the page content
  - _pageType is the enumerated kind of page: form, table or dashboard
       for example, "ePageType.ePageTypeForm"; even though we have polymorphic
       objects, it is handy to have this value for checking the page type easily
  - _$page is the jQuery reference to the page after it gets created
  - _title is the title of the page
  - _latestQueryString is the lookup key data currently in use, if any
  - _latestFetchedData is the data most recently fetched, if any, in it's
       original JSON form; refer to "_latestFetchedRowData" to see the same
       data converted to "skinny-data" format
  - _helpContent is an object with help text and/or an id for generating
       a URL for a help web page; if a help icon is created but there is
       no help content, then the help icon will be disabled
  - _initFn is the initialization function for the page,
       the page is "this" and the PageInfo subclass is passed as a parameter
*/
var PageInfo = Class.extend(
{
	construct: function(htmlFile, componentId, pageType, title, initFn) // optional constructor method
	{
		var privateVar = 0;
		function privateFn() { privateVar++; }

		this._htmlFile = null;
		this._componentId = null;
		this._pageType = null;
		this._$page = null;
		this._title = null;
		this._latestQueryString = "";
		this._latestFetchedData = null;
		this._helpContent = null;
		this._initFn = null;
		this._htmlFile = htmlFile;
		this._componentId = componentId;
		this._pageType = pageType;
		if (typeof(title) !== 'undefined') { this._title = title; }
		if (typeof(initFn) !== 'undefined') { this._initFn = initFn; }
		this.baseField = "base-class";
	},
	loadPageFromObject: function(keyData) { },
	addHelpContent: function(helpContent)
	{
		var info = this;
		if (helpContent._hoverText == "")
		{
			helpContent._hoverText = null;
		}
		if (helpContent._helpId == "")
		{
			helpContent._helpId = null;
		}
		if ((helpContent._hoverText == null) && (helpContent._helpId == null))
		{
			info._helpContent = null;
		}
		else
		{
			info._helpContent = helpContent;
		}
	},
	onHelp: function(event)
	{
		/* event.data is expected to be this
		   PageInfo-based object that manages the page */
		var info = event.data;
		if (info == null) { return; }
		// TEST THIS!!!
		if (!(info instanceof PageInfo)) { return; }
		// do something
		alert("Calling base class help callback");
	},
	dataDictHasProperty: function(dataDict, propertyName)
	{
		if (dataDict == null) { return false; }
		if (typeof(dataDict) !== 'object') { return false; }
		if (typeof(propertyName) !== 'string') { return false; }
		var dotIndex = propertyName.indexOf('.');
		if (dotIndex == -1) // no nested value
		{
			return dataDict.hasOwnProperty(propertyName);
		}
		var subDictName = propertyName.substring(0, dotIndex);
		var subPropertyName = propertyName.substring(dotIndex + 1);
		if (!dataDict.hasOwnProperty(subDictName)) { return false; }
		var subDict = dataDict[subDictName];
		return this.dataDictHasProperty(subDict, subPropertyName);
	},
	getDataDictProperty: function(dataDict, propertyName)
	{
		if (dataDict == null) { return null; }
		if (typeof(dataDict) !== 'object') { return null; }
		if (typeof(propertyName) !== 'string') { return null; }
		var dotIndex = propertyName.indexOf('.');
		if (dotIndex == -1) // no nested value
		{
			if (dataDict.hasOwnProperty(propertyName))
			{
				return dataDict[propertyName];
			}
			return null;
		}
		var subDictName = propertyName.substring(0, dotIndex);
		var subPropertyName = propertyName.substring(dotIndex + 1);
		if (!dataDict.hasOwnProperty(subDictName)) { return null; }
		var subDict = dataDict[subDictName];
		return this.getDataDictProperty(subDict, subPropertyName);
	},
	setDataDictProperty: function(dataDict, propertyName, value)
	{
		if (dataDict == null) { return; }
		if (typeof(dataDict) !== 'object') { return; }
		if (typeof(propertyName) !== 'string') { return; }
		var dotIndex = propertyName.indexOf('.');
		if (dotIndex == -1) // no nested value
		{
			if (dataDict.hasOwnProperty(propertyName))
			{
				dataDict[propertyName] = value;
			}
			return;
		}
		var subDictName = propertyName.substring(0, dotIndex);
		var subPropertyName = propertyName.substring(dotIndex + 1);
		if (!dataDict.hasOwnProperty(subDictName)) { return; }
		var subDict = dataDict[subDictName];
		this.setDataDictProperty(subDict, subPropertyName, value);
	},
	checkBoxEnablesControls: function(checkBoxName, controlNamesArray)
	{
		var $checkBox = $('#' + checkBoxName);
		var $data = { controls: controlNamesArray };
		$checkBox.change($data, this.onCheckBoxEnableControls);
		var $dummyEvent = { data: $data };
		this.onCheckBoxEnableControls.call($checkBox, $dummyEvent);
	},
	onCheckBoxEnableControls: function(event)
	{
		var $checked = $(this).is(':checked');
		for (var controlName in event.data.controls)
		{
			var $control = $('#' + event.data.controls[controlName]);
			if ($checked)
			{
				$control.removeAttr('disabled');
			}
			else
			{
				$control.attr('disabled', 'disabled');
			}
		}
	},
	getInfo: function()
	{
		return 'PageInfo: ' + this._htmlFile + ' ' + this._componentId;
	},
	getName: function()
	{
		return "PageInfo(" + this.getId() + ")";
	},
	getId: function() { return 1; }
} );

////////////////////////////////////////////////

/*
  HelpContent members:
  - _hoverText is the text to show over the Help icon button
  - _helpId is the id of a help topic, from which a web page
       URL will be generated
  - both fields are option, if nothing is provided,
       then the Help icon button is disabled
*/
function HelpContent(hoverText, helpId)
{
	this._hoverText = hoverText;
	if (typeof(helpId) === 'undefined') { helpId = null; }
	this._helpId = helpId;
}

HelpContent.prototype.getInfo = function()
{
	return 'HelpContent: ' + this._hoverText + ' ' + this._helpId;
};
