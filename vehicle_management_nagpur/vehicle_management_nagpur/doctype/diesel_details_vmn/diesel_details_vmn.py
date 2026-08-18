# Copyright (c) 2025, Ritesh Sharma and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class DieselDetailsVMN(Document):
	def validate(self):
		if flt(self.dd_fuel_fill_up_reading) < flt(self.dd_previous_fuel_fill_up_reading):
			frappe.throw(_("Fuel Fill Up Reading cannot be less than Previous Fuel Fill Up Reading."))
