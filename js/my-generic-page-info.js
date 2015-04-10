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
  MyGenericPageInfo members:
  - all inherited members from FormPageInfo
*/
var MyGenericPageInfo = FormPageInfo.extend(
{
	construct: function()
	{
		FormPageInfo.prototype.construct.call(
			this, 'views/my-generic-form.html', 'myGenericFormWorkArea',
				'My Generic Form', null, this.initMyGenericForm);
	},
	getName: function()
	{
		// calls the getName() method of PageInfo
		return "MyGenericPageInfo(" + this.getId() + ") extends " +
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
	initMyGenericForm: function()
	{
	},
	getId: function() { return 4; }
} );
