# Copyright (c) 2025, Ritesh Sharma and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, validate_email_address


class UserDetailsVMN(Document):
	def before_validate(self):
		if cint(self.ud_create_new_user):
			self._create_or_select_user()
		else:
			if not self.ud_user_name:
				frappe.throw(_("Select an existing User or enable Create New User."))
			self.ud_user_email = frappe.db.get_value("User", self.ud_user_name, "email") or self.ud_user_name

	def validate(self):
		if not self.ud_campus:
			frappe.throw(_("Assigned Campus is required."))

	def _create_or_select_user(self):
		full_name = (self.ud_new_user_name or "").strip()
		email = validate_email_address((self.ud_new_user_email or "").strip(), throw=True)
		if not full_name:
			frappe.throw(_("New User Name is required."))
		if not email:
			frappe.throw(_("New User Email is required."))

		email = email.lower()
		if not frappe.db.exists("User", email):
			if not frappe.has_permission("User", ptype="create"):
				frappe.throw(_("You do not have permission to create ERPNext users."), frappe.PermissionError)

			name_parts = full_name.split(None, 1)
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": email,
					"first_name": name_parts[0],
					"last_name": name_parts[1] if len(name_parts) > 1 else "",
					"enabled": 1,
					"user_type": "System User",
					"send_welcome_email": 1,
				}
			)
			user.insert()

		self.ud_user_name = email
		self.ud_user_email = email
		if not self.ud_personal_email:
			self.ud_personal_email = email
