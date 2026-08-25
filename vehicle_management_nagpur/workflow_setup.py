import frappe


VMN_ACCESS_ROLE = "VMN user"
VMN_CAMPUS_DOCTYPE = "Campus Details VMN"


def _remove_campus_permissions(user_name):
	if not user_name:
		return
	for permission_name in frappe.get_all(
		"User Permission",
		filters={"user": user_name, "allow": VMN_CAMPUS_DOCTYPE},
		pluck="name",
	):
		frappe.delete_doc("User Permission", permission_name, ignore_permissions=True)


def _sync_campus_permission(user_name, campus):
	if not user_name:
		return
	_remove_campus_permissions(user_name)
	if not campus:
		return
	frappe.get_doc(
		{
			"doctype": "User Permission",
			"user": user_name,
			"allow": VMN_CAMPUS_DOCTYPE,
			"for_value": campus,
			"apply_to_all_doctypes": 1,
			"is_default": 1,
		}
	).insert(ignore_permissions=True)


def sync_user_detail_role(doc, method=None):
	user_name = doc.get("ud_user_name")
	if not user_name or not frappe.db.exists("User", user_name):
		return
	if VMN_ACCESS_ROLE not in frappe.get_roles(user_name):
		frappe.get_doc("User", user_name).add_roles(VMN_ACCESS_ROLE)

	previous = doc.get_doc_before_save() if not doc.is_new() else None
	previous_user = previous.get("ud_user_name") if previous else None
	if previous_user and previous_user != user_name:
		_remove_campus_permissions(previous_user)
	_sync_campus_permission(user_name, doc.get("ud_campus"))


def remove_user_detail_permission(doc, method=None):
	user_name = doc.get("ud_user_name")
	if not user_name:
		return
	other = frappe.get_all(
		"User Details VMN",
		filters={"ud_user_name": user_name, "name": ["!=", doc.name]},
		pluck="name",
		limit_page_length=1,
	)
	if other:
		sync_user_detail_role(frappe.get_doc("User Details VMN", other[0]))
	else:
		_remove_campus_permissions(user_name)


def sync_all_user_detail_roles():
	for name in frappe.get_all("User Details VMN", pluck="name"):
		sync_user_detail_role(frappe.get_doc("User Details VMN", name))
