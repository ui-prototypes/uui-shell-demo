/*********************************************************************
 Copyright 2014 by Brocade Communication Systems
 All rights reserved.

 This software is the confidential and proprietary information
 of Brocade Communication Systems, ("Confidential Information").
 You shall not disclose such Confidential Information and shall
 use it only in accordance with the terms of the license agreement
 you entered into with Brocade Communication Systems.
*********************************************************************/

// A "dashlet" is one of the small movable components in a dashboard
// which contains a small useful display like a table, chart or graph

var eDashletType =
{
	// TODO: implement a form also
	eDashletTypeText:        { value: 0, id: "textDashlet"        },
	eDashletTypeTable:       { value: 1, id: "tableDashlet"       },
	eDashletTypeLineGraph:   { value: 2, id: "lineGraphDashlet"   },
	eDashletTypeBubbleGraph: { value: 3, id: "bubbleGraphDashlet" },
	eDashletTypeBarChart:    { value: 4, id: "barChartDashlet"    },
	eDashletTypePieChart:    { value: 5, id: "pieChartDashlet"    }
};

/*
  DashletInfo members:
  - _id is the unique id for the dashlet, all dashlet ids within one
       dashboard must be unique, and all dashlet ids across the entire
       application are *recommended* to be unique
  - _dashletType is the enumerated kind of dashlet: text, table, and
       various kinds of charts and graphs;
       for example, "eDashletType.eDashletTypeLineGraph"
  - _$dashletPanel is the jQuery reference to the dashlet after it
       gets created -- THIS MIGHT NOT BE NEEDED
  - _title is the title of the dashlet
  - _queryUrl is the url for fetching data for this one dashlet, if any;
       if null (meaning unused), then the overall dashboard has one global
       url used to fetch data for this (and presumably other) dashlets all
       in one more efficient operation
  - _latestFetchedData is the data most recently fetched, if any
       	TEMPORARILY, THIS FIELD WILL ALSO SET INITIAL DATA FOR TESTING PURPOSES
  - _widgetData is the internal data used to configure the dashlet within
       the overall dashboard
  - _initFn is the initialization function for the dashlet,
       the dashlet is "this" and the DashletInfo is passed as a parameter
  - _trackFn is the mouse tracking function for the dashlet,
       the dashlet is "this" and the DashletInfo (???) is passed as a parameter;
       the function will only be called for dashlets containing a chart or
       graph, not a table or text
  - _allowRefresh enables the refresh icon and causes refresh operations
       to occur; an internal default refresh function will be used unless
       a custom refresh function is provided
  - _refreshFn is a custom refresh function for the dashlet,
       the dashlet is "this" and the DashletInfo is passed as a parameter
       (with _latestFetchedData loaded with the newest data); this function
       is ignored if "_allowRefresh" is false; the function might be called
       asynchronously after new data is fetched; if no refresh function is
       provided, then an internal default refresh function will be used
  - _columns is a list of table columns, used only when "_dashletType" is
       set to "eDashletType.eDashletTypeTable", otherwise ignored
*/
function DashletInfo(id, dashletType, title, queryUrl, initFn,
					 trackFn, allowRefresh, refreshFn, columns)
{
	this._id = id;
	this._dashletType = dashletType;
	this._$dashletPanel = null;
	if (typeof(title) === 'undefined') { title = ""; }
	if (title == null) { title = ""; }
	this._title = title;
	if (typeof(queryUrl) === 'undefined') { queryUrl = null; }
	this._queryUrl = queryUrl;
	this._latestFetchedData = null;
	this._widgetData = null;
	if (typeof(initFn) === 'undefined') { initFn = null; }
	this._initFn = initFn;
	if (typeof(trackFn) === 'undefined') { trackFn = null; }
	this._trackFn = trackFn;
	if (typeof(allowRefresh) === 'undefined') { allowRefresh = false; }
	if (allowRefresh == null) { allowRefresh = false; }
	this._allowRefresh = allowRefresh;
	if (typeof(refreshFn) === 'undefined') { refreshFn = null; }
	this._refreshFn = refreshFn;
	if (typeof(columns) === 'undefined') { columns = null; }
	this._columns = columns;
}

DashletInfo.prototype.getInfo = function()
{
	return this._id + ' ' + this._dashletType;
}

/*
  DashboardPageInfo members:
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
var DashboardPageInfo = PageInfo.extend(
{
	construct: function(htmlFile, componentId, title,
		dashboardId, dashletInfo, buttons, initFn)
	{
		PageInfo.prototype.construct.call(this, htmlFile,
			componentId, ePageType.ePageTypeDashboard, title, initFn);
	
		if (typeof(dashboardId) === 'undefined') { dashboardId = null; }
		this._dashboardId = dashboardId;
		if (typeof(dashletInfo) === 'undefined') { dashletInfo = null; }
		this._dashletInfo = dashletInfo;
		if (typeof(buttons) === 'undefined') { buttons = null; }
		this._buttons = buttons;
	},
	getName: function()
	{
		// calls the getName() method of PageInfo
		return "DashboardPageInfo(" + this.getId() + ") extends " +
				arguments.callee.$.getName.call(this);
	},
	loadPageFromObject: function(keyData) // "this" is DashboardPageInfo and optional dictionary object
	{
		var info = this;
		if (typeof(keyData) === 'undefined') { keyData = null; }
		closeSlideUp();
		busy('Loading ' + info._title + ', please wait...');
		$('#workArea').empty();
		$('#workArea').load(info._htmlFile + ' #' + info._componentId, function(response, status, xhr)
		{
			if ((info._dashboardId != null) && (info._dashletInfo != null))
			{
				info.createDashboard();
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
						$b.bind('click', info, info.onDashboardRefresh);
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
	createDashboard: function()
	{
		var info = this;
		var id = info._dashboardId
		var dashletInfoArray = info._dashletInfo;
		var widgetArray = [];
		for (var dashletIndex in dashletInfoArray)
		{
			var widgetData = this.createDashletWidgetData(dashletInfoArray[dashletIndex]);
			widgetData.dashboardParentId = id;
			// this method of appending is faster
			// than push() for small arrays
			widgetArray[widgetArray.length] = widgetData;
		}
		$("#" + id).sDashboard(
		{
			dashboardData: widgetArray,
			disableSelection: false,
			creationComplete: function(e)
			{
				// hack to make y-axis titles not wrap
				/*$("#" + id + " li .sDashboardChart .flotr-labels .flotr-grid-label-y").each(function(index)
				{
					var widthString = $(this).css("width");
					var width = parseInt(widthString);
					width += 5;
					$(this).css("width", "" + width + "px");
				});*/
				// do the initial queries
				var widgets = $("#" + id).sDashboard("getDashboardData");
				for (var widgetIndex in widgets)
				{
					var widgetData = widgets[widgetIndex];
					var dashletInfo = dashletInfoArray[widgetIndex];
					queryDashboardWidget(id, dashletInfo._queryUrl, widgetData);
				}
				info._$dashboard = $("#" + id).sDashboard("self");
			}
		});
	},
	createDashletWidgetData: function(dashletInfo)
	{
		// returns a widgetData object to add into
		// the the array sent to createDashletWidgetData()
		var widgetData =
		{
			widgetId: dashletInfo._id,
			widgetTitle: dashletInfo._title,
			enableRefresh: dashletInfo._allowRefresh,
			widgetRenderType: dashletInfo._dashletType,
			queryUrl: dashletInfo._queryUrl
		};
		if (dashletInfo._allowRefresh)
		{
			// built-in refresh logic is not good cuz it is not async
			if (dashletInfo._refreshFn != null)
			{
		 		widgetData.refreshCallBack = dashletInfo._refreshFn;
			}
			else
			{
		 		widgetData.refreshCallBack = _onInternalDashboardMasterRefresh;
			}
		}
		switch (dashletInfo._dashletType.value)
		{
			case eDashletType.eDashletTypeText.value:
				widgetData.widgetContent = { data: "" };
				break;
			case eDashletType.eDashletTypeTable.value:
				widgetData.widgetType = "table";
				widgetData.widgetContent =
				{
					aaData: [],
					aoColumns: [ { "sTitle": "" } ],
					iDisplayLength: 25,
					aLengthMenu: [ [1, 25, 50, -1], [1, 25, 50, "All"] ],
					bPaginate: true,
					bAutoWidth: false
				};
				if ((dashletInfo._columns != null) &&
					(dashletInfo._columns.length > 0))
				{
					widgetData.widgetContent.aoColumns = [];
					for (var columnIndex in dashletInfo._columns)
					{
						var column = { "sTitle": dashletInfo._columns[columnIndex] }
						widgetData.widgetContent.aoColumns.push(column);
					}
				}
				widgetData.setJqueryStyle = true;
				break;
			case eDashletType.eDashletTypeLineGraph.value:
				widgetData.widgetType = "chart";
				widgetData.getDataBySelection = true;
				widgetData.widgetContent =
				{
					data: null,
					options:
					{
						xaxis:
						{
							noTicks: 6,
							mode: 'time_series',
							tickFormatter: function(o)
							{
								return Flotr.Date.format(
									new Date(parseInt(o)), "%m/%d<br />%H:%M");
							}
						},
						yaxis:
						{
							min: 0,
							max: 320
						},
						grid:
						{
							minorVerticalLines: true
						},
						/*crosshair:
						{
							mode: "xy"
						},
						selection:
						{
							mode: "x",
							fps: 30
						}*/
					}
				}
				if (dashletInfo._trackFn != null)
				{
					widgetData.widgetContent.options.mouse = 
					{
						track: true,
						position: 's',
						relative: true,
						sensibility: 1,
						trackFormatter: dashletInfo._trackFn
					};
				}
				break;
	
			case eDashletType.eDashletTypeBubbleGraph.value:
				widgetData.widgetType = "chart";
				widgetData.widgetContent =
				{
					data: null,
					options:
					{
						bubbles:
						{
							show: true,
							baseRadius: 1
						},
						xaxis:
						{
							min: 40,
							max: 385
						},
						yaxis:
						{
							min: 40,
							max: 350
						},
						plotWidth: 200
					}
				};
				if (dashletInfo._trackFn != null)
				{
					widgetData.widgetContent.options.mouse = 
					{
						track: true,
						relative: true,
						trackFormatter: dashletInfo._trackFn
					};
				}
				break;
	
			case eDashletType.eDashletTypeBarChart.value:
				widgetData.widgetType = "chart";
				widgetData.widgetContent =
				{
					data: null,
					options:
					{
						grid:
						{
							labelMargin: 8,
							outlineWidth: 1,
							outline: 'ws',
							horizontalLines: false,
							verticalLines: true
						},
						bars:
						{
							show: true,
							horizontal: true,
							shadowSize: 0,
							barWidth: 0.4,
							fillOpacity: 1
						},
						xaxis:
						{
							min: 0,
							max: 25,
							margin: true,
							tickDecimals: 0
						},
						yaxis:
						{
							min: -0.5,
							max: 5,
							margin: true,
							ticks: null
					        //ticks: myExampleData.barChartYTicks
						}
					}
				}
				if (dashletInfo._trackFn != null)
				{
					widgetData.widgetContent.options.mouse = 
					{
						track: true,
						position: 'sw',
						relative: true,
						trackFormatter: dashletInfo._trackFn
					};
				}
				break;
	
			case eDashletType.eDashletTypePieChart.value:
				widgetData.widgetType = "chart";
				widgetData.widgetContent =
				{
					data: null,
					options:
					{
						HtmlText: false,
						grid:
						{
							verticalLines: false,
							horizontalLines: false
						},
						xaxis:
						{
							showLabels: false
						},
						yaxis:
						{
							showLabels: false
						},
						pie:
						{
							show: true,
							explode: 6
						},
						legend:
						{
							position: "se",
							backgroundColor: "#D2E8FF"
						}
					}
				}
				if (dashletInfo._trackFn != null)
				{
					widgetData.widgetContent.options.mouse = 
					{
						track: true,
						position: 'sw',
						trackFormatter: dashletInfo._trackFn
					};
				}
				break;
	
			default: // ERROR
				showMessageBox(
					"" + dashletInfo._dashletType.value + " is not a valid Dashlet type",
					"Dashboard initialization failed");
		}
	
		return widgetData;
	},
	refreshAllDashboardWidgets: function()
	{
		var info = this;
		// from inside sDashboard code: widgetDefinition.refreshCallBack.apply(self, [widgetId]);
		var $dashboard = info._$dashboard;
		for (dashletIndex in info._dashletInfo)
		{
			var dashlet = info._dashletInfo[dashletIndex];
			var refreshFn = dashlet._refreshFn;
			if (refreshFn == null) { refreshFn = _onInternalDashboardMasterRefresh; }
			refreshFn.apply($dashboard, [dashlet._id]);
		}
	},
	onDashboardRefresh: function(event)
	{
		// event.data is the DashboardPageInfo object that manages the dashboard
		var info = event.data;
		if (info == null) { return; }
		if (!(info instanceof DashboardPageInfo)) { return; }
		info.refreshAllDashboardWidgets(info);
	},
	getId: function() { return 3; }
} );

// the jQuery instance of sDashboard is (and must be) the "this" pointer
function _onInternalDashboardMasterRefresh(widgetId)
{
	// UGLY HACK: because sDashboard won't give me a usable
	// instance where I can directly call methods more cleanly
	var id;
	if (this.hasOwnProperty('element'))
	{
		id = this.element[0].id;
	}
	else
	{
		id = this[0].id;
	}
	var widgets = $("#" + id).sDashboard("getDashboardData");
	// UGLY HACK: because sDashboard won't give me a usable
	// instance where I can directly call methods more cleanly
	for (var widgetIndex in widgets)
	{
		var widgetData = widgets[widgetIndex];
		if (widgetData.widgetId == widgetId)
		{
			// start an asynchronous operation to get new data
			queryDashboardWidget(
				widgetData.dashboardParentId, widgetData.queryUrl, widgetData);
			// HACK: keep current data while we
			// wait on the async request for new data
			return widgetData.widgetContent;
		}
	}
	// in case we have no known dashboard
	return { data : null, options : null, aaData : [] };
}
