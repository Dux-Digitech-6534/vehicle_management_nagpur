import frappe


VMN_ACCESS_ROLE = "VMN user"


def sync_user_detail_role(doc, method=None):
	user_name = doc.get("ud_user_name")
	if not user_name or not frappe.db.exists("User", user_name):
		return
	if VMN_ACCESS_ROLE not in frappe.get_roles(user_name):
		frappe.get_doc("User", user_name).add_roles(VMN_ACCESS_ROLE)


def sync_all_user_detail_roles():
	for name in frappe.get_all("User Details VMN", pluck="name"):
		sync_user_detail_role(frappe.get_doc("User Details VMN", name))
