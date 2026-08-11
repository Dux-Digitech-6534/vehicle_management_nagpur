app_name = "vehicle_management_nagpur"
app_title = "Vehicle Management Nagpur"
app_publisher = "Ritesh Sharma"
app_description = "Vehicle Maintenance"
app_email = "ritesh.sharma@duxdigitech.com"
app_license = "mit"

fixtures = [
	{
		"dt": "Workflow State",
		"filters": [["name", "in", ["Draft", "Pending", "Approved", "Rejected", "Cancelled"]]],
	},
	{
		"dt": "Workflow Action Master",
		"filters": [["name", "in", ["Send for Approval", "Approve", "Reject", "Resubmit", "Cancel"]]],
	},
	{
		"dt": "Workflow",
		"filters": [
			[
				"name",
				"in",
				[
					"VMN Log Details Approval",
					"VMN Diesel Details Approval",
					"VMN Maintenance Details Approval",
					"VMN RTO Details Approval",
					"VMN DG Details Approval",
				],
			]
		],
	},
]

doc_events = {
	"User Details VMN": {
		"after_insert": "vehicle_management_nagpur.workflow_setup.sync_user_detail_role",
		"on_update": "vehicle_management_nagpur.workflow_setup.sync_user_detail_role",
	}
}

after_migrate = "vehicle_management_nagpur.workflow_setup.sync_all_user_detail_roles"

# By Ritesh
# scheduler_events = {
#     "daily": [
#         "vehicle_management_nagpur.rto_utils.send_expiry_alerts"
#     ]
# }



# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "vehicle_management_nagpur",
# 		"logo": "/assets/vehicle_management_nagpur/logo.png",
# 		"title": "Vehicle Management Nagpur",
# 		"route": "/vehicle_management_nagpur",
# 		"has_permission": "vehicle_management_nagpur.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/vehicle_management_nagpur/css/vehicle_management_nagpur.css"
# app_include_js = "/assets/vehicle_management_nagpur/js/vehicle_management_nagpur.js"

# include js, css files in header of web template
# web_include_css = "/assets/vehicle_management_nagpur/css/vehicle_management_nagpur.css"
# web_include_js = "/assets/vehicle_management_nagpur/js/vehicle_management_nagpur.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "vehicle_management_nagpur/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "vehicle_management_nagpur/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "vehicle_management_nagpur.utils.jinja_methods",
# 	"filters": "vehicle_management_nagpur.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "vehicle_management_nagpur.install.before_install"
# after_install = "vehicle_management_nagpur.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "vehicle_management_nagpur.uninstall.before_uninstall"
# after_uninstall = "vehicle_management_nagpur.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "vehicle_management_nagpur.utils.before_app_install"
# after_app_install = "vehicle_management_nagpur.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "vehicle_management_nagpur.utils.before_app_uninstall"
# after_app_uninstall = "vehicle_management_nagpur.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "vehicle_management_nagpur.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"vehicle_management_nagpur.tasks.all"
# 	],
# 	"daily": [
# 		"vehicle_management_nagpur.tasks.daily"
# 	],
# 	"hourly": [
# 		"vehicle_management_nagpur.tasks.hourly"
# 	],
# 	"weekly": [
# 		"vehicle_management_nagpur.tasks.weekly"
# 	],
# 	"monthly": [
# 		"vehicle_management_nagpur.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "vehicle_management_nagpur.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "vehicle_management_nagpur.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "vehicle_management_nagpur.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["vehicle_management_nagpur.utils.before_request"]
# after_request = ["vehicle_management_nagpur.utils.after_request"]

# Job Events
# ----------
# before_job = ["vehicle_management_nagpur.utils.before_job"]
# after_job = ["vehicle_management_nagpur.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"vehicle_management_nagpur.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }


