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
  TableKendoPageInfo members:
  - all inherited members from PageInfo
  - _tableId is the ID of a table to populate, if any
  - _$table is the jQuery reference to the table, if any
  - _tableDataUrl is the URL of the table data to load, if any
  - _latestSelectedRows is an array of indexes for selected rows, if any,
       only used for table
  - _latestFetchedRowData *** MIGHT PHASE OUT WITH IMPLEMENTATION CHANGE ***
       is the data most recently fetched, if any, in it's
       unpacked "skinny-data" format; refer to "_latestFetchedData" to see
       the same data in its original JSON format
  - _columns is an array of object describing columns in the native
       Kendo Grid format
  - _columnIds *** MIGHT PHASE OUT WITH IMPLEMENTATION CHANGE ***
       is the ID names of all the columns data, once it is known,
       only used for table
  - *** NOT USED *** _initialSort is an array of sort info, or null if none
       for example: [0, 'desc'] means sort column 0 descending
                and [3, 'asc'] means sort column 3 ascending,
       only used for table
  - _hoverActions is an array of HoverAction objects, or null if none,
       only used for table
  - _columnDisplays is an array of ColumnDisplay objects, or null if none,
       only used for table
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
var TableKendoPageInfo = PageInfo.extend(
{
	construct: function(htmlFile, componentId, title,
			tableId, tableDataUrl, columns, buttons, initFn)
	{
		PageInfo.prototype.construct.call(this, htmlFile,
			componentId, ePageType.ePageTypeTable, title, initFn);
	
		if (typeof(tableId) === 'undefined') { tableId = null; }
		this._tableId = tableId;
		this._$table = null;
		if (typeof(tableDataUrl) === 'undefined') { tableDataUrl = null; }
		this._tableDataUrl = tableDataUrl;
		this._latestSelectedRows = null;
		this._columns = columns;
		this._columnIds = null;
		// *** NOT USED *** this._initialSort = null;
		this._hoverActions = null;
		this._columnDisplays = null;
		if (typeof(buttons) === 'undefined') { buttons = null; }
		this._buttons = buttons;
	},
	getName: function()
	{
		// calls the getName() method of PageInfo
		return "TableKendoPageInfo(" + this.getId() + ") extends " +
				arguments.callee.$.getName.call(this);
	},
	loadPageFromObject: function(keyData) // "this" is TableKendoPageInfo and optional dictionary object
	{
		var info = this;
		if (typeof(keyData) === 'undefined') { keyData = null; }
		//closeSlideUp();
		busy('Loading ' + info._title + ', please wait...');
		$('#workArea').empty();
		$('#workArea').load(info._htmlFile + ' #' + info._componentId, function(response, status, xhr)
		{
			if (info._tableId != null)
			{
				if (keyData != null)
				{
					info._latestQueryString = info.keyDataIntoQueryString(keyData);
				}
				info._$table = $('#' + info._tableId).kendoGrid(
				{
					dataSource:
					{
						type: "odata",
						transport: { read: info._tableDataUrl },
						pageSize: 20
					},
					width: '100%',
					height: '100%',
					groupable: true,
					sortable: true,
					selectable: "multiple, row", // or true/false
					pageable:
					{
						refresh: true,
						pageSizes: true,
						buttonCount: 5
					},
					columns: info._columns,
					change: function(e)
					{
						var selectedRows = this.select();
						var selectedDataItems = [];
						for (var i = 0; i < selectedRows.length; i++)
						{
							var dataItem =
							{
								rowIndex: selectedRows[i].rowIndex,
								rowData: this.dataItem(selectedRows[i])
							};
							selectedDataItems.push(dataItem);
						}
						info.onSelectTable(selectedDataItems, info);
					}
				});
				$('#' + info._tableId).resize(function(e)
				{
					$("#messageArea").text("Resize Grid to " + e.target.clientWidth + "x" + e.target.clientHeight);
					$('#' + info._tableId).data("kendoGrid").resize();
				});
			}
			info._$page = $('#workArea #' + info._componentId);
			if (info._initFn != null)
			{
				info._initFn.call(info._$page, info); // pass in the info
			}
		} );
		$('#workAreaTitle').html(info._title);
		var $workAreaControls = $('#workAreaControls')
		$workAreaControls.empty();
		if (typeof(info._buttons) === 'undefined') { info._buttons = null; }
		if (info._buttons != null)
		{
			for (var i = 0; i < info._buttons.length; i++)
			{
				var $b;
				var button = info._buttons[i].type;
				if (button.value == eButtonType.eButtonTypeRefresh.value)
				{
					$b = $('<a href="#"><img class="workAreaControl" src="images/refresh.png"/></a>').attr(
					{
						id: button.id,
						value: button.name,
						title: "Refresh the data on this page"
					} );
					if (info._buttons[i].fn == null)
					{
						$b.bind('click', info, info.onTableRefresh);
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
							 (info._buttons[i].fn != null))
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
					else if (info._buttons[i].fn == null)
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
					if (info._buttons[i].fn == null)
					{
						$b.prop("disabled", true);
					}
				}
				if (info._buttons[i].fn != null)
				{
					$b.bind('click', info, info._buttons[i].fn);
				}
				$workAreaControls.append($b);
				info._buttons[i].$button = $b;
			}
		}
		currentPageInfo = info;
		currentSlideUpFormInfo = null;
	},
	onSelectTable: function(selectedDataItems, info)
	{
		var msg = "Table select";
		for (var i = 0; i < selectedDataItems.length; i++)
		{
			var dataItem = selectedDataItems[i];
			var rowIndex = dataItem.rowIndex;
			var rowData = dataItem.rowData;
			msg += " - row " + rowIndex + " - row data: " + rowData.ContactName;
		}
		msg += " - info: " + info._title;
		alert(msg);
	},
	onTableRefresh: function(event)
	{
		// event.data is the TableKendoPageInfo object that manages the table
		var info = event.data;
		if (info == null) { return; }
		if (!(info instanceof TableKendoPageInfo)) { return; }
		info.refreshTable();
		//closeSlideUp();
	},
	refreshTable: function(keyData) // optional new lookup key
	{
		/****var info = this;
		if (typeof(keyData) === 'undefined') { keyData = null; }
		var $table = info._$table;
		if ($table != null)
		{
			//showMessageBox("queryString = " + info._latestQueryString);
			var refreshButton = $("#workAreaControls #refreshButton");
			refreshButton.prop("disabled", true);
			busy("Refreshing ...");
	
			if (keyData != null)
			{
				info._latestQueryString = info.keyDataIntoQueryString(keyData);
			}
			$.ajax(
			{
				dataType: "json",
				url: info._tableDataUrl + info._latestQueryString,
				cache: false,
				crossDomain: false,
				success: function(data) 
				{
					info._latestFetchedData = data.aaData;
					if (info._columnIds == null)
					{
						var $columns = $('#' + info._tableId + ' thead tr th');
						var columnIds = [];
						for (var i = 0; i < $columns.length; i++)
						{
							columnIds.push($columns[i].id);
						}
						info._columnIds = columnIds;
					}
					info.unpackTableData();
	
					$table.fnClearTable();
					$table.fnAddData(info._latestFetchedRowData);
	
					// need to reconfigure table here
					$($table.fnGetNodes()).bind('click', $table, info.onClickTableRow);
					$($table.fnGetNodes()).bind('click', info, info.onSelectedTableRow);
					if ((info._hoverActions != null) && (info._hoverActions.length > 0))
					{
						info.installHoverActions();
					}
					info.onSelectedTableRow( { data: info } );
					refreshButton.prop("disabled", false);
				},
				error: function(jqXHR, textStatus, errorThrown) 
				{
					onAjaxError(jqXHR, textStatus, errorThrown,
								"Request Failed", "Request Method:");
					refreshButton.prop("disabled", false);
				}
			});
		}****/
	},
	/****unpackTableData: function()
	{
		var info = this;
		var columnIds = info._columnIds;
		var jsonData = info._latestFetchedData;
		var skinnyDataArray = [];
		for (var i = 0; i < jsonData.length; i++)
		{
			var rowDict = jsonData[i];
			var rowArray = [];
			for (var j = 0; j < columnIds.length; j++)
			{
				var columnId = columnIds[j];
				var columnDisplay = null;
				if (info._columnDisplays != null)
				{
					for (var k = 0; k < info._columnDisplays.length; k++)
					{
						// if a mapper for the same column exists, replace it
						if (info._columnDisplays[k]._columnId == columnId)
						{
							columnDisplay = info._columnDisplays[k];
							break;
						}
					}
				}
				var value = info.getDataDictProperty(rowDict, columnId);
				if ((columnDisplay != null) &&
					(columnDisplay._callbackFn != null))
				{
					value = columnDisplay._callbackFn.call(info._$page, info, columnId, rowDict);
				}
				if ((value != null) && (typeof(value) === 'object') &&
					(value.hasOwnProperty('length')) && (value.length > 0))
				{
					// this appears to be an array
					if (value.length == 1)
					{
						value = value[0];
					}
					else
					{
						value = "" + value.length + " items...";
						// set up a hover action for this
						var hoverAction = new HoverAction(
							columnId, null, info.onInternalHoverListOfItems);
						info.addHoverAction(hoverAction);
					}
				}
				if ((value != null) && (typeof(value) !== 'undefined'))
				{
					if ((columnDisplay != null) &&
						(columnDisplay._enumTranslateDict.hasOwnProperty(value)))
					{
						value = columnDisplay._enumTranslateDict[value];
					}
					if (typeof(value) !== 'undefined')
					{
						rowArray.push(value);
					}
					else
					{
						rowArray.push("");
					}
				}
				else
				{
					rowArray.push("");
				}
			}
			skinnyDataArray.push(rowArray);
		}
		info._latestFetchedRowData = skinnyDataArray;
	},****/
	onInternalHoverListOfItems: function(cellToHoverOn, hoverAction, rowData)
	{
		var info = this;
		var listName = hoverAction._columnId;
		if (!rowData.hasOwnProperty(listName)) { return ""; }
		var list = rowData[listName];
		var valuesHoverText = "";
		for (var i = 0; i < list.length; i++)
		{
			if (i > 0) { valuesHoverText += "\n"; }
			valuesHoverText += list[i];
		}
		return valuesHoverText;
	},
	onClickTableRow: function(event)
	{
		/* event.data is the jQuery reference to the table */
		if (event.ctrlKey)
		{
			// ctrl key has a highlighting side effect
			if ((document.selection) && (document.selection.empty))
			{
				document.selection.empty() ;
			}
			else if (window.getSelection)
			{
				var sel = window.getSelection();
				if (sel && (sel.removeAllRanges))
				{
					sel.removeAllRanges();
				}
			}
			if ($(this).hasClass('rowSelected'))
			{
				$(this).removeClass('rowSelected');
			}
			else
			{
				$(this).addClass('rowSelected');
			}
		}
		else
		{
			// clear all the rest first
			var $table = event.data;
			$($table.fnGetNodes()).removeClass('rowSelected');
			$(this).addClass('rowSelected');
		}
	},
	onSelectedTableRow: function(event)
	{
		/* event.data is the TableKendoPageInfo object that manages the table */
		var info = event.data;
		if (info == null) { return; }
		if (!(info instanceof TableKendoPageInfo)) { return; }
		var $table = info._$table;
		var previousSelectedRows = info._latestSelectedRows;
		info._latestSelectedRows = info.getSelectedRowIndexesFromTable($table);
		var selectedRowCount = info._latestSelectedRows.length;
		if (info._buttons != null)
		{
			for (var buttonInfo in info._buttons)
			{
				var enable = (selectedRowCount > 0); // reset each time cuz it could get changed
				var $b;
				var buttonType = info._buttons[buttonInfo].type;
				if ((buttonType.value == eButtonType.eButtonTypeEdit.value) ||
					(buttonType.value == eButtonType.eButtonTypeDetails.value) ||
					(buttonType.value == eButtonType.eButtonTypeDelete.value) ||
					(buttonType.value == eButtonType.eButtonTypeDeploy.value) ||
					(buttonType.value == eButtonType.eButtonTypeUndeploy.value) ||
					(buttonType.value == eButtonType.eButtonTypeWithdraw.value) ||
					(buttonType.value == eButtonType.eButtonTypeRealServer.value) ||
					(buttonType.value == eButtonType.eButtonTypeReject.value))
				{
					$b = info._buttons[buttonInfo].$button;
					if (enable &&
						(typeof(info._buttons[buttonInfo].selectEnableFn) !== 'undefined') &&
						(info._buttons[buttonInfo].selectEnableFn != null))
					{
						var fetchedRowData =
							info.getSelectedDataObjectsFromTable(
								$table, info._latestFetchedData);
						var displayedRowData = info.getSelectedRowsFromTable($table);
						enable = info._buttons[buttonInfo].selectEnableFn.call(
												$table, info, fetchedRowData, displayedRowData, buttonType, $b);
					}
					if (enable && (info._buttons[buttonInfo].fn != null))
					{
						$b.prop("disabled", false);
					}
					else
					{
						$b.prop("disabled", true);
					}
				}
			}
		}
		if (!info.selectedRowsAreSame(previousSelectedRows, info._latestSelectedRows))
		{
			closeSlideUp();
		}
	},
	selectedRowsAreSame: function(rows1, rows2) // inputs are two arrays of index numbers
	{
		if ((rows1 == null) && (rows2 == null)) { return true; }
		// if both are NOT null, then only one being null is a non-match
		if (rows1 == null) { return false; }
		if (rows2 == null) { return false; }
		if (rows1.length != rows2.length) { return false; }
		rows1.sort();
		rows2.sort();
		for (var i = 0; i < rows1.length; i++)
		{
			if (rows1[i] != rows2[i]) { return false; }
		}
		return true;
	},
	addHoverAction: function(hoverAction)
	{
		var info = this;
		if (info._hoverActions == null)
		{
			info._hoverActions = [];
		}
		for (i = 0; i < info._hoverActions.length; i++)
		{
			// if an action for the same column exists, replace it
			if (info._hoverActions[i]._columnId == hoverAction._columnId)
			{
				info._hoverActions[i] = hoverAction;
				return;
			}
		}
		// otherwise, add a new one
		info._hoverActions.push(hoverAction);
	},
	installHoverActions: function()
	{
		var info = this;
		if (info._columnIds == null) { return; }
		if (info._hoverActions == null) { return; }
		var rows = info._$table.fnGetNodes();
		// iterate thru each hover action
		for (i = 0; i < info._hoverActions.length; i++)
		{
			var hoverAction = info._hoverActions[i];
			// search the columns for a matching column id
			for (j = 0; j < info._columnIds.length; j++)
			{
				var columnId = info._columnIds[j];
				if (hoverAction._columnId == columnId)
				{
					// this hover action belongs on this column
					for (k = 0; k < rows.length; k++)
					{
						var row = rows[k];
						var cells = $(row).children('td');
						var cellToHoverOn = cells[j];
						var rowIndex = info._$table.fnGetPosition(row);
						var rowData = info._latestFetchedData[rowIndex];
						var hoverData =
							(hoverAction._displayDataId == "") ?
								"" : rowData[hoverAction._displayDataId];
						var hoverFn = hoverAction._dataDisplayFn;
						if (hoverFn != null)
						{
							hoverData = hoverFn.call(info._$page,
								info, cellToHoverOn, hoverAction, rowData);
						}
						if ((typeof(hoverData) === 'string') &&
							(hoverData != null) && (hoverData != ""))
						{
							cellToHoverOn.title = hoverData;
						}
					}
					break;
				}
			}
		}
	},
	addColumnDisplay: function(columnDisplay)
	{
		var info = this;
		if (info._columnDisplays == null)
		{
			info._columnDisplays = [];
		}
		for (i = 0; i < info._columnDisplays.length; i++)
		{
			// if a mapper for the same column exists, replace it
			if (info._columnDisplays[i]._columnId == columnDisplay._columnId)
			{
				info._columnDisplays[i] = columnDisplay;
				return;
			}
		}
		// otherwise, add a new one
		info._columnDisplays.push(columnDisplay);
	},
	getSelectedRowIndexFromTable: function($table)
	{
		/* Get one index of the currently selected row
		   (or the first one if there are more than one) */
		var rowIndexArray = this.getSelectedRowIndexesFromTable($table);
		if (rowIndexArray.length == 0) { return -1; }
		return rowIndexArray[0];
	},
	/****getSelectedRowIndexesFromTable: function($table)
	{
		/* Get the indexes of rows which are currently selected * /
		var $allRows = $table.$('tr');
		var rowIndexArray = [];
		for (var i = 0; i < $allRows.length; i++)
		{
			var $row = $allRows[i];
			if ($row.className.indexOf('rowSelected') > -1)
			{
				var index = $table.fnGetPosition($row);
				rowIndexArray.push(index);
			}
		}
		return rowIndexArray;
	},
	getSelectedDataObjectsFromTable: function($table, fetchedData)
	{
		/* Get the raw data objects which are currently selected * /
		var rowIndexes = this.getSelectedRowIndexesFromTable($table);
		if (rowIndexes.length < 1) { return null; }
		var fetchedDataArray = [];
		for (i = 0; i < rowIndexes.length; i++)
		{
			var rowIndex = rowIndexes[i];
			var fetchedRowData = fetchedData[rowIndex];
			fetchedDataArray.push(fetchedRowData);
		}
		return fetchedDataArray;
	},
	getSelectedRowsFromTable: function($table)
	{
		/* Get the rows which are currently selected * /
		var rows = $table.$('tr.rowSelected');
		if (rows.length < 1) { return null; }
		var rowDataArray = [];
		for (i = 0; i < rows.length; i++)
		{
			var row = rows[i];
			var rowData = $table.fnGetData(row);
			rowDataArray.push(rowData);
		}
		return rowDataArray;
	},
	getSelectedRowCountFromTable: function($table)
	{
		/* Get the number of rows which are currently selected * /
		return $table.$('tr.rowSelected').length;
	},****/
	keyDataIntoQueryString: function(keyData)
	{
		if (keyData == null) { return null; }
		// ?param=val&param=val
		var queryString = "";
		var firstOne = true;
		for (index in  keyData)
		{
			if (firstOne)
			{
				queryString += "?";
				firstOne = false;
			}
			else
			{
				queryString += "&";
			}
			queryString += index + "=" + keyData[index];
		}
		return queryString;
	},
	getId: function() { return 2; }
} );

var TopClass = TableKendoPageInfo.extend(
{
	getName: function()
	{
		// calls the getName() method of TableKendoPageInfo
		return "TopClass(" + this.getId() + ") extends " +
			arguments.callee.$.getName.call(this);
	},
	getId: function()
	{
		// just like the last example, this.getId()
		// always returns the proper value of 2.        
		return arguments.callee.$.getId.call(this);
	}
} );

// alerts "TopClass(2) extends TableKendoPageInfo(2) extends PageInfo(2)"
// looks good again, and there's no intermediate functions!
/*alert(new TopClass().getName());
alert(new TableKendoPageInfo().getName());*/

/*
  HoverAction members:
  - _columnId is the name of the property that lives in the table column
  - _displayDataId is the name of the data to display in a tooltip
  - _dataDisplayFn is a function that returns a custom string to be
       displayed in a tooltip
  - _displayDataId and _dataDisplayFn are mutually exclusive,
       if both are provided then only the callback will be used
*/
function HoverAction(columnId, displayDataId, dataDisplayFn)
{
	this._columnId = columnId;
	if (typeof(displayDataId) === 'undefined') { displayDataId = ""; }
	if (displayDataId == null) { displayDataId = ""; }
	this._displayDataId = displayDataId;
	if (typeof(dataDisplayFn) === 'undefined') { dataDisplayFn = null; }
	this._dataDisplayFn = dataDisplayFn;
}

HoverAction.prototype.getInfo = function()
{
	return this._columnId + ' ' + this._displayDataId;
};

/*
  ColumnDisplay members:
  - _columnId is the name of the property that lives in the table column
  - _callbackFn is a callback function that will provide a custom string
       for display instead of the provided value in the JSON data; the
       parameters are as follows: myCallbackFn(info, columnId, rowData),
       and it is expected to return a string; null if not used
  - _enumTranslateDict is a dictionary for translating enums into
       human-readable strings, where each property name is an enum
       and each property value is the desired translation;
       for example, a dictionary object with the following properties:
          {
            "SUCCESS": "Success",
            "FAILED": "Failed"
          }
       would cause the table column to display the nicer texts
       "Success" and "Failed" instead of the upper-case enumerations;
       null if not used
  - if both _callbackFn and _enumTranslateDict are provided, then the
       callback function is invoked first, and the returned string is
       treated as an enumerated value to be applied to the enumeration
       translation dictionary, and the developer is responsible to
       insure that proper values are passed between the two
*/
function ColumnDisplay(columnId, callbackFn, enumTranslateDict)
{
	this._columnId = columnId;
	if (typeof(callbackFn) === 'undefined') { callbackFn = null; }
	this._callbackFn = callbackFn;
	if (typeof(enumTranslateDict) === 'undefined') { enumTranslateDict = { }; }
	this._enumTranslateDict = enumTranslateDict;
}

ColumnDisplay.prototype.getInfo = function()
{
	return 'ColumnDisplay: ' + this._columnId + ' ' + this._callbackFn + ' ' + this._enumTranslateDict;
};
