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
 *********** THIS OBSOLETE VERSION USED THE SLICK GRID
  TableSlickPageInfo members:
  - all inherited members from PageInfo
  - _dashboardId is the ID of a dashboard to populate, if any
  - _dashletInfo is an array of DashletInfo objects describing all
       the dashlets in the dashboard, if any;
       NOTE: the "widgetData" structures, specific to the "sDashboard"
       and "flotr2" plugins, are NOT included here; this is to avoid
       excessive data couplings with other technologies in an effort to
       not be locked into any one of those plugins or their data models;
       use of these structures is instead isolated to more
       dashboard-specific source code modules
  - _$dashboard is the jQuery reference to the dashboard, if any
  - _tableId is the ID of a table to populate, if any
  - _$table is the jQuery(?) reference to the table, if any
  - _dataView is the reference to the data view (which holds the data model)
  - _options are SlickGrid-specific settings
  - _selectedJTreeItem is SlickGrid-specific selection data
  - _tableDataUrl is the URL of the table data to load, if any
  - _latestSelectedRows is an array of indexes for selected rows, if any,
       only used for table
  - _latestFetchedRowData is the data most recently fetched, if any, in it's
       unpacked "skinny-data" format; refer to "_latestFetchedData" to see
       the same data in its original JSON format
  - _columnIds is the ID names of all the columns data, once it is known,
       only used for table
  - *** NOT USED *** _initialSort is an array of sort info, or null if none
       for example: [0, 'desc'] means sort column 0 descending
                and [3, 'asc'] means sort column 3 ascending,
       only used for table
  - _sortColumn is the ID of the currently-sorted column
  - _sortDirection is the direction (1 or -1) of the currently-sorted column
  - _hoverActions is an array of HoverSlickAction objects, or null if none,
       only used for table
  - _columnDisplays is an array of ColumnSlickDisplay objects, or null if none,
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
var TableSlickPageInfo = PageInfo.extend(
{
	construct: function(htmlFile, componentId, title, dashboardId,
		dashletInfo, tableId, tableDataUrl, buttons, initFn, multiLineSelect)
	{
		PageInfo.prototype.construct.call(this, htmlFile,
			componentId, ePageType.ePageTypeTable, title, initFn);
	
		if (typeof(dashboardId) === 'undefined') { dashboardId = null; }
		this._dashboardId = dashboardId;
		if (typeof(dashletInfo) === 'undefined') { dashletInfo = null; }
		this._dashletInfo = dashletInfo;
		if (typeof(tableId) === 'undefined') { tableId = null; }
		this._tableId = tableId;
		if (typeof(multiLineSelect) === 'undefined') { multiLineSelect = true; }
		this._tableId = tableId;
		this._$table = null;
		this._dataView = null;
		this._options =
		{
			editable: false,
			enableAddRow: false,
			enableCellNavigation: true,
			asyncEditorLoading: false,
			autoHeight: true,
			multiSelect: multiLineSelect,
			forceFitColumns: true,
			fullWidthRows: true
		};
		if (typeof(tableDataUrl) === 'undefined') { tableDataUrl = null; }
		this._tableDataUrl = tableDataUrl;
		this._latestSelectedRows = null;
		this._columnIds = null;
		// *** NOT USED *** this._initialSort = null;
		this._sortColumn = "";
		this._sortDirection = 1;
		this._hoverActions = null;
		this._columnDisplays = null;
		if (typeof(buttons) === 'undefined') { buttons = null; }
		this._buttons = buttons;
	},
	loadPageFromObject: function(keyData)
	{
		// "this" is TableSlickPageInfo and keyData is an optional dictionary object
		var info = this;
		if (typeof(keyData) === 'undefined') { keyData = null; }
		closeSlideUp();
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
				info._dataView = new Slick.Data.DataView( { inlineFilters: true } );
				info._dataView.beginUpdate();
				info._dataView.setItems( [ ], ["_id"]);
				info._dataView.setFilter(internalTreeExpandCollapseFilter);
				info._dataView.endUpdate();

				for (var buttonInfo in info._buttons)
				{
					var $b;
					var buttonType = info._buttons[buttonInfo].type;
					if ((buttonType.value == eButtonType.eButtonTypeDelete.value) ||
						(buttonType.value == eButtonType.eButtonTypeEdit.value) ||
						(buttonType.value == eButtonType.eButtonTypeRealServer.value))
					{
						$b = info._buttons[buttonInfo].$button;
						$b.prop("disabled", true);
					}
				}

				// initialize the grid
				var treeColumns = info.initGridColumns('#' + info._tableId);
				info._$table = new Slick.Grid('#' + info._tableId, info._dataView, treeColumns, info._options);
				info._$table.pageInfo = info;
				var rsm = new Slick.RowSelectionModel();
				info._$table.setSelectionModel(rsm);
				info._dataView.syncGridSelection(info._$table, false);

				info._sortColumn = treeColumns[0].id;

				info._$table.onCellChange.subscribe(function(e, args)
				{
					info._dataView.updateItem(args.item._id, args.item);
				} );

				// wire up toggling behavior for tree items
				info._$table.onClick.subscribe(function (e, args)
				{
					if ($(e.target).hasClass("toggle"))
					{
						var item = info._dataView.getItem(args.row);
						if (item)
						{
							if (!item._collapsed)
							{
								item._collapsed = true;
							}
							else
							{
								item._collapsed = false;
							}
							info._dataView.updateItem(item._id, item);
						}
						e.stopImmediatePropagation();
					}
				} );

				info._$table.onSort.subscribe(function(e, args)
				{
					info._sortDirection = args.sortAsc ? 1 : -1;
					info._sortColumn = args.sortCol.field;
					if ($.browser.msie && $.browser.version <= 8)
					{
						// using temporary Object.prototype.toString override
						// more limited and does lexicographic sort only by default, but can be much faster
						// use numeric sort of % and lexicographic for everything else
						info._dataView.fastSort(info._sortColumn, args.sortAsc);
					}
					else
					{
						// using native sort with comparer
						// preferred method but can be very slow in IE with huge datasets
						info._dataView.sort(function(a, b)
						{
							var x = a[info._sortColumn], y = b[info._sortColumn];
							return (x == y ? 0 : (x > y ? 1 : -1));
						}, args.sortAsc);
						info._$table.invalidateAllRows();
						info._$table.setData(info._dataView);
						info._$table.render();
					}
				});

				rsm.onSelectedRangesChanged.subscribe(function (e, ranges)
				{
					var selectedRows = [];
					var hash = {};
					var i, j;
					for (i = 0; i < ranges.length; i++)
					{
						for (j = ranges[i].fromRow; j <= ranges[i].toRow; j++)
						{
							if (!hash[j])  // prevent duplicates
							{
								selectedRows.push(j);
							}
							hash[j] = {};
							/* use this to step thru cells
							for (var k = ranges[i].fromCell; k <= ranges[i].toCell; k++)
							{
								;
							}*/
						}
					}
					selectedRows.sort();
					info._selectedJTreeItem = [];

					/********* specific to LBMAC page *********
					if (info._buttons != null)
					{
						for (var buttonInfo in info._buttons)
						{
							var enable = (selectedRows.length > 0); // reset each time cuz it could get changed
							var $b;
							var buttonType = info._buttons[buttonInfo].type;
							if ((buttonType.value == eButtonType.eButtonTypeDelete.value) ||
								(buttonType.value == eButtonType.eButtonTypeRealServer.value))
							{
								$b = info._buttons[buttonInfo].$button;
			
								for (i = 0; i < selectedRows.length; i++)
								{
									j = selectedRows[i];
									info._selectedJTreeItem[i] = info._dataView.getItem(j);
									if (info._selectedJTreeItem[i].hasOwnProperty('port'))
									{
										$b.prop("disabled", false);
									}
									else
									{
										if ((info._selectedJTreeItem[i].ports.length == 0) &&
											(buttonType.value == eButtonType.eButtonTypeDelete.value))
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
							else if (buttonType.value == eButtonType.eButtonTypeEdit.value)
							{
								$b = info._buttons[buttonInfo].$button;
								$b.prop("disabled", false);
							}
						}
					}*/

					/****** sample code: how to iterate thru selected data
					for (i = 0; i < selectedRows.length; i++)
					{
						j = selectedRows[i];
						info._selectedJTreeItem[i] = info._dataView.getItem(j);
						// each iteration here is a selected item
						// TEST
						if (info._selectedJTreeItem[i].hasOwnProperty('port'))
						{
							//promptForLBMACModification();
						}
						// TEST
					}
					******* sample code: how to iterate thru selected data */
					if ((info._hoverActions != null) && (info._hoverActions.length > 0))
					{
						info.installHoverSlickActions();
					}
					info.onSelectedTableRow( { data: info } );
					closeSlideUp();
				} );

				// wire up model events to drive the grid
				info._dataView.onRowCountChanged.subscribe(function(e, args)
				{
					info._$table.updateRowCount();
					info._$table.render();
				} );

				info._dataView.onRowsChanged.subscribe(function(e, args)
				{
					info._$table.invalidateRows(args.rows);
					info._$table.render();
				} );

				// load the table data
				$.ajax(
				{
					dataType: "json",
					type: "POST",
					url: info._tableDataUrl + info._latestQueryString,
					cache: false,
					crossDomain: false,
					success: function(returnData) 
					{
						//showMessageBox("Get succeeded: result = " + returnData.json_dump.result);
						var returnArray = returnData["aaData"];
						info._latestFetchedData = returnArray;
						// TODO: make this generic
						// raw data array, array of fields that make parent id,
						// child node field, child id field
						var tableData =
							info.rawJsonDataToTableData(
								returnArray, [ "id", "fqdn", "port" ]);
						if ((info._columnDisplays != null) && (info._columnDisplays.length > 0))
						{
							info.applyColumnDisplays(tableData);
						}
						info._dataView = info._$table.getData();
						info._dataView.setItems(tableData);
						info._$table.invalidate();
						info._$table.render();
						// WILL THIS BE NEEDED?
						/*if (tableData.length == 0)
						{
							info.refreshTable(); // HACK
						}*/
					},
					error: function(jqXHR, textStatus, errorThrown)
					{
						onAjaxError(jqXHR, textStatus, errorThrown,
									"Request Failed", "Request Method:");
					}
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
	initGridColumns: function(id)
	{
		var info = this;
		var $gridDiv = $(id);
		if ($gridDiv.length == 0) // not found
		{
			showMessageBox("initGridColumns: Grid " + id + " not found");
			return;
		}
		// TODO: test other versions of IE
		var $gridItems = (isIE8) ?
			$gridDiv[0].children : $gridDiv[0].children[0].children;
		var columns = [];
		var columnIds = [];
		var firstColumn = true;
		for (var columnIndex = 0; columnIndex < $gridItems.length; columnIndex++)
		{
			var columnInfo = $gridItems[columnIndex];
			if (columnInfo.tagName == "COLUMN")
			{
				columnIds.push(columnInfo.id); // keep a master list of column ids
				// make a separate column object without the tons of DOM junk included
				var gridColumn =
				{
					id: columnInfo.id, field: columnInfo.id,
					name: columnInfo.title, sortable: true
				};
				if (firstColumn)
				{
					//gridColumn.cssClass = "cell-bold";
					// formatter function must be made anonymous
					// here in order to get access to "info"
					gridColumn.formatter = function(row, cell, value, columnDef, dataRow)
					{
						// warning!  "this" is the Window, not the page info or SlickGrid!
						var dataView = info._$table.getData();
						if (typeof(value) === 'undefined') { value = ""; }
						value = value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
						var spacer = "<span style='display:inline-block;height:1px;width:" + (15 * dataRow["_indent"]) + "px'></span>";
						var idx = dataView.getIdxById(dataRow._id);
						var items = dataView.getItems();
						if (items[idx + 1] && items[idx + 1]._indent > items[idx]._indent)
						{
							if (dataRow._collapsed)
							{
								return spacer + " <span class='toggle expand'></span>&nbsp;" + value;
							}
							else
							{
								return spacer + " <span class='toggle collapse'></span>&nbsp;" + value;
							}
						}
						else
						{
							return spacer + " <span class='toggle'></span>&nbsp;" + value;
						}
					};
					firstColumn = false;
				}
				if (typeof(columnInfo.width) !== 'undefined')
				{
					gridColumn.width = parseInt(columnInfo.width);
				}
				if (typeof(columnInfo.minWidth) !== 'undefined')
				{
					gridColumn.minWidth = parseInt(columnInfo.minWidth);
				}
				columns.push(gridColumn);
			}
		}
		// this is not elegant, but it needs to be init'ed here
		info._columnIds = columnIds;
		return columns;
	},
	rawJsonDataToTableData: function(jsonData, idFields, childField, childIdField)
	{
		if ((typeof(jsonData) === 'undefined') || (jsonData == null)) { return null; }
		if ((typeof(idFields) !== 'string') && (!(idFields instanceof Array))) { return null; }
		if (typeof(childField) !== 'string') { childField = null; }
		if (typeof(childIdField) !== 'string') { childIdField = null; }
		var supportTree = ((childField != null) && (childIdField != null))
		var treeTableData = [];
		for (var index in jsonData)
		{
			var jsonItem = jsonData[index];
			// needs an id field
			var id = "";
			if (idFields instanceof Array)
			{
				var missingField = false;
				for (var fieldIndex in idFields)
				{
					var idField = idFields[fieldIndex];
					if (!jsonItem.hasOwnProperty(idField))
					{
						// strict handling: every field for
						// id string generation must be present
						missingField = true;
						break;
					}
					if (id.length > 0) { id += "-"; }
					id += jsonItem[idField];
				}
				if (missingField) { continue; }
			}
			else
			{
				if (!jsonItem.hasOwnProperty(idFields)) { continue; }
				id = jsonItem[idFields];
			}
			jsonItem._id = id; // attach unique identifier
			jsonItem._parent = null; // top level, no parent above this
			jsonItem._indent = 0;
			var parentIndex = treeTableData.push(jsonItem) - 1;
			if (!supportTree) { continue; }
			if (!jsonItem.hasOwnProperty(childField)) { continue; }
			var children = jsonItem[childField];
			if ((children == null) || (children.length == 0)) { continue; }
			for (var childIndex in children)
			{
				var child = children[childIndex];
				// needs an id field
				if (!child.hasOwnProperty(childIdField)) { continue; }
				var childId = child[childIdField];
				child._id = id + '-' + childId;
				child._parent = parentIndex;
				child._indent = 1;
				treeTableData.push(child);
			}
		}
		return treeTableData;
	},
	onTableRefresh: function(event)
	{
		// event.data is the TableSlickPageInfo object that manages the table
		var info = event.data;
		if (info == null) { return; }
		if (!(info instanceof TableSlickPageInfo)) { return; }
		info.refreshTable();
		closeSlideUp();
	},
	refreshTable: function(keyData) // optional new lookup key
	{
		var info = this;
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
				type: "POST",
				url: info._tableDataUrl + info._latestQueryString,
				cache: false,
				crossDomain: false,
				success: function(data) 
				{
					info._latestFetchedData = data.aaData;
					// TODO: make this generic
					// raw data array, array of fields that make parent id,
					// child node field, child id field
					var tableData =
						info.rawJsonDataToTableData(
							info._latestFetchedData, [ "id", "fqdn", "port" ]);
					if ((info._columnDisplays != null) && (info._columnDisplays.length > 0))
					{
						info.applyColumnDisplays(tableData);
					}
					info._dataView = info._$table.getData();
					info._dataView.setItems(tableData);
					// TODO: add a sort method to dataView
					info._$table.invalidate();
					info._$table.render();
					/***************** old dataTables code *****************
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
						info.installHoverSlickActions();
					}
					info.onSelectedTableRow( { data: info } );
					****************** old dataTables code ****************/
					refreshButton.prop("disabled", false);
				},
				error: function(jqXHR, textStatus, errorThrown) 
				{
					onAjaxError(jqXHR, textStatus, errorThrown,
								"Request Failed", "Request Method:");
					refreshButton.prop("disabled", false);
				}
			});
		}
	},
	applyColumnDisplays: function(tableData)
	{
		if ((tableData == null) || (tableData.length == 0)) { return; }
		var info = this;
		var columnIds = info._columnIds;
		for (var i = 0; i < tableData.length; i++)
		{
			var rowDict = tableData[i];
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
						var hoverAction = new HoverSlickAction(
							columnId, null, info.onInternalHoverListOfItems);
						info.addHoverSlickAction(hoverAction);
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
				info.setDataDictProperty(rowDict, columnId, value);
			}
		}
	},
	////////////////// old dataTables code ///////////////////////
	unpackTableData: function() // only used for dataTables, not SlickGrid
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
						var hoverAction = new HoverSlickAction(
							columnId, null, info.onInternalHoverListOfItems);
						info.addHoverSlickAction(hoverAction);
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
	},
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
		/* event.data is the TableSlickPageInfo object that manages the table */
		var info = event.data;
		if (info == null) { return; }
		if (!(info instanceof TableSlickPageInfo)) { return; }
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
	addHoverSlickAction: function(hoverAction)
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
	installHoverSlickActions: function()
	{
		var info = this;
		if (info._columnIds == null) { return; }
		if (info._hoverActions == null) { return; }
		var rows = info._$table.getData().getItems();
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
						//var cells = $(row).children('td');
						//var cellToHoverOn = cells[j];
						var cellToHoverOn = info._$table.getCellNode(row, j);
						// How to account for sorting and still get correct row index?
						//var rowIndex = info._$table.fnGetPosition(row);
						var rowIndex = row;
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
	addColumnSlickDisplay: function(columnDisplay)
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
	getSelectedRowIndexesFromTable: function($table)
	{
		/* Get the indexes of rows which are currently selected */
		var rowIndexArray = $table.getSelectedRows();
		rowIndexArray.sort();
		return rowIndexArray;
	},
	getSelectedDataObjectsFromTable: function($table, fetchedData)
	{
		/* Get the raw data objects which are currently selected */
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
		/* Get the displayed data from rows which are currently selected */
		var rowIndexes = this.getSelectedRowIndexesFromTable($table);
		/*var rowIndexes = $table.$('tr.rowSelected');*/
		if (rowIndexes.length < 1) { return null; }
		var rowDataArray = [];
		for (i = 0; i < rowIndexes.length; i++)
		{
			var row = rowIndexes[i];
			var rowData = $table.getData().getItem(row);
			rowDataArray.push(rowData);
		}
		return rowDataArray;
	},
	getSelectedRowCountFromTable: function($table)
	{
		/* Get the number of rows which are currently selected */
		var rowIndexes = this.getSelectedRowIndexesFromTable($table);
		if (rowIndexes == null) { return 0; }
		return rowIndexes.length;
	},
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
	getName: function()
	{
		// calls the getName() method of PageInfo
		return "TableSlickPageInfo(" + this.getId() + ") extends " +
				arguments.callee.$.getName.call(this);
	},
	getId: function() { return 2; }
} );

function internalTreeExpandCollapseFilter(item)
{
	/* this filter code will be dynamically cloned into an
	   anonymous function that includes a parameter "_items" */ 
	if (item._parent != null)
	{
		var parent = _items[item._parent];
		while (parent)
		{
			if (parent._collapsed)
			{
				return false;
			}
			parent = _items[parent._parent];
		}
	}
	return true;
}

/*
  HoverSlickAction members:
  - _columnId is the name of the property that lives in the table column
  - _displayDataId is the name of the data to display in a tooltip
  - _dataDisplayFn is a function that returns a custom string to be
       displayed in a tooltip
  - _displayDataId and _dataDisplayFn are mutually exclusive,
       if both are provided then only the callback will be used
*/
function HoverSlickAction(columnId, displayDataId, dataDisplayFn)
{
	this._columnId = columnId;
	if (typeof(displayDataId) === 'undefined') { displayDataId = ""; }
	if (displayDataId == null) { displayDataId = ""; }
	this._displayDataId = displayDataId;
	if (typeof(dataDisplayFn) === 'undefined') { dataDisplayFn = null; }
	this._dataDisplayFn = dataDisplayFn;
}

HoverSlickAction.prototype.getInfo = function()
{
	return this._columnId + ' ' + this._displayDataId;
};

/*
  ColumnSlickDisplay members:
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
function ColumnSlickDisplay(columnId, callbackFn, enumTranslateDict)
{
	this._columnId = columnId;
	if (typeof(callbackFn) === 'undefined') { callbackFn = null; }
	this._callbackFn = callbackFn;
	if (typeof(enumTranslateDict) === 'undefined') { enumTranslateDict = { }; }
	this._enumTranslateDict = enumTranslateDict;
}

ColumnSlickDisplay.prototype.getInfo = function()
{
	return 'ColumnSlickDisplay: ' + this._columnId + ' ' + this._callbackFn + ' ' + this._enumTranslateDict;
};
