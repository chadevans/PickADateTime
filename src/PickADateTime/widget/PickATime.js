/*
    PickATime
    ========================

    @file      : PickATime.js
    @version   : 0.1
    @author    : Chad Evans
    @date      : Fri, 25 Sep 2015 15:31:47 GMT
    @copyright : 2015, Mendix B.v.
    @license   : Apache v2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "PickADateTime/lib/jquery-1.11.2",
    "PickADateTime/lib/picker",
    "PickADateTime/lib/picker.time",
    "dojo/text!PickADateTime/widget/template/PickATime.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle,
    dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent,
    _jQuery, _picker, _pickerTime, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    // Declare widget's prototype.
    return declare("PickADateTime.widget.PickATime", [_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        timeInputNode: null,

        // Parameters configured in the Modeler.
        timeAttr: "",
        targetClass: "",
        mfToExecute: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        _options: null,
        _picker: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            console.log(this.id + ".postCreate");

            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            console.log(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering();

            callback();
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {},

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {},

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {},

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
            if (this._picker) {
                this._picker.stop();
            }
        },

        // Attach events to HTML dom elements
        _setupEvents: function () {
            this._options = {
                //container: "." + this.targetClass + " .mx-dateinput",
                formatLabel: "<!a>h:i A</!a>",
                klass: {
                    opened: "picker--opened open",

                    //list: "picker__list list-group dropdown-menu",
                    list: "picker__list dropdown-menu",
                    //listItem: "picker__list-item list-group-item",
                    listItem: "picker__list-item",

                    selected: "picker__list-item--selected active",

                    buttonClear: "picker__button--clear btn btn-primary btn-block"
                }
            };

            this.connect(this.timeInputNode, "change", function (e) {
                // Function from mendix object to set an attribute.
                this._contextObj.set(this.timeAttr, this.timeInputNode.value);
            });
        },

        // Rerender the interface.
        _updateRendering: function () {
            //this.timeInputNode.disabled = this.readOnly;

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");

                if (this._picker) {
                    this._picker.off("set");
                    //this._picker.stop();
                    
                } else {
                    this._picker = $(this.timeInputNode).pickatime(this._options).pickatime("picker");
                }
                
                var currTime = new Date(this._contextObj.get(this.timeAttr));
                this._picker.set("select", currTime);

                var widget = this;

                // 'this' will be set to the picker, not the widget
                this._picker.on("set", function (thingSet) {
                    console.log(widget.id + ".onSet - " + thingSet);

                    if ("clear" in thingSet) {
                        widget._contextObj.set(widget.timeAttr, null);
                    } else if ("select" in thingSet) {
                        var currTime = new Date(widget._contextObj.get(widget.timeAttr));
                        var selectedTime = this.get("select");

                        //reset the hours + minutes
                        currTime.setHours(selectedTime.hour);
                        currTime.setMinutes(selectedTime.mins);

                        widget._contextObj.set(widget.timeAttr, currTime);
                    }
                });

            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            // Important to clear all validations!
            this._clearValidations();
        },

        // Handle validations.
        _handleValidation: function (validations) {
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this.timeAttr);

            if (this.readOnly) {
                validation.removeAttribute(this.timeAttr);
            } else if (message) {
                this._addValidation(message);
                validation.removeAttribute(this.timeAttr);
            }
        },

        // Clear validations.
        _clearValidations: function () {
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
        },

        // Show an error message.
        _showError: function (message) {
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            dojoConstruct.place(this._alertDiv, this.domNode);
        },

        // Add a validation.
        _addValidation: function (message) {
            this._showError(message);
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            if (this._picker) {
                this._picker.off("set");
            }

            // Release handles on previous object, if any.
            if (this._handles) {
                this._handles.forEach(function (handle) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscribtions. 
            if (this._contextObj) {
                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                var attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.timeAttr,
                    callback: dojoLang.hitch(this, function (guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });

                var validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });

                this._handles = [objectHandle, attrHandle, validationHandle];
            }
        }
    });
});

require(["PickADateTime/widget/PickATime"], function () {
    "use strict";
});