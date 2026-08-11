# Copyright (c) 2025, Ritesh Sharma and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
class RTODetailsVMN(Document):
	pass


# import frappe
# from frappe.model.document import Document
# class RTODetailsVMN(Document):

#     def validate(self):

#         for row in self.table_vmjh:

#             # If ANY field has value → row becomes mandatory
#             if (
#                 row.vrd_issue_date or
#                 row.vrd_expiry_date or
#                 row.vrd_amount or
#                 row.vrd_attachemts or
#                 row.trust_name
#             ):

#                 missing = []

#                 if not row.vrd_issue_date:
#                     missing.append("Issue Date")

#                 if not row.vrd_expiry_date:
#                     missing.append("Expiry Date")

#                 if not row.vrd_amount:
#                     missing.append("Amount")

#                 if not row.vrd_attachemts:
#                     missing.append("Attachments")

#                 if not row.trust_name:
#                     missing.append("Trust Name")

#                 if missing:
#                     raise frappe.ValidationError(
#                         f"Row ({row.vrd_document_type}) missing: {', '.join(missing)}"
#                     )

#     def before_submit(self):

#         cleaned_rows = []

#         for row in self.table_vmjh:
#             # Keep the row only if it has at least one filled field
#             if (
#                 row.vrd_issue_date or
#                 row.vrd_expiry_date or
#                 row.vrd_amount or
#                 row.vrd_attachemts or
#                 row.trust_name
#             ):
#                 cleaned_rows.append(row)

#         # Replace table with cleaned rows
#         self.table_vmjh = cleaned_rows


# #Scheduler Event Setup
# import frappe
# from frappe.utils import add_days, nowdate
# def send_expiry_alerts():
#     today = frappe.utils.nowdate()

#     # Get all records in child table where expiry date is near
#     records = frappe.get_all(
#         "Vehicle RTO Document VMN",
#         fields=["name", "parent", "vrd_document_type", "vrd_expiry_date"],
#         filters={"vrd_expiry_date": ["!=", None]}
#     )

#     for rec in records:
#         if not rec.vrd_expiry_date:
#             continue

#         expiry = rec.vrd_expiry_date

#         # Difference between today and expiry
#         diff = (frappe.utils.getdate(expiry) - frappe.utils.getdate(today)).days

#         # 15, 10, 5 days alerts
#         if diff in [15, 10, 5]:
#             parent_doc = frappe.get_doc("RTO Details VMN", rec.parent)

#             # Email ID from parent doc (change fieldname if required)
#             email = parent_doc.email_id  

#             if email:
#                 frappe.sendmail(
#                     recipients=[email],
#                     subject=f"Reminder: {rec.vrd_document_type} Expiring in {diff} days",
#                     message=f"""
#                     Dear User,<br><br>
#                     Your <b>{rec.vrd_document_type}</b> document is expiring on <b>{expiry}</b>.<br>
#                     Only <b>{diff} days</b> remaining.<br><br>
#                     Regards,<br>
#                     Vehicle Management System
#                     """
#                 )


# import frappe
# from frappe.model.document import Document


# class RTODetailsVMN(Document):

#     # --------------------------------------------------
#     # Validate rows only when fields are partially used
#     # --------------------------------------------------
#     def validate(self):

#         for row in self.table_vmjh:

#             # If ANY field has value → row becomes mandatory
#             if (
#                 row.vrd_issue_date or
#                 row.vrd_expiry_date or
#                 row.vrd_amount or
#                 row.vrd_attachemts or
#                 row.trust_name
#             ):
#                 missing = []

#                 if not row.vrd_issue_date:
#                     missing.append("Issue Date")

#                 if not row.vrd_expiry_date:
#                     missing.append("Expiry Date")

#                 if not row.vrd_amount:
#                     missing.append("Amount")

#                 if not row.vrd_attachemts:
#                     missing.append("Attachments")

#                 if not row.trust_name:
#                     missing.append("Trust Name")

#                 if missing:
#                     raise frappe.ValidationError(
#                         f"Row ({row.vrd_document_type}) missing: {', '.join(missing)}"
#                     )

#     # --------------------------------------------------
#     # Before Submit → Keep only used rows
#     # --------------------------------------------------
#     def before_submit(self):

#         cleaned_rows = []

#         for row in self.table_vmjh:
#             if (
#                 row.vrd_issue_date or
#                 row.vrd_expiry_date or
#                 row.vrd_amount or
#                 row.vrd_attachemts or
#                 row.trust_name
#             ):
#                 cleaned_rows.append(row)

#         self.table_vmjh = cleaned_rows



# # ====================================================
# # Scheduler Event - Send Expiry Alerts
# # ====================================================
# def send_expiry_alerts():

#     today = frappe.utils.nowdate()

#     records = frappe.get_all(
#         "Vehicle RTO Document VMN",
#         fields=["name", "parent", "vrd_document_type", "vrd_expiry_date"],
#         filters={"vrd_expiry_date": ["!=", None]}
#     )

#     for rec in records:

#         if not rec.vrd_expiry_date:
#             continue

#         expiry = rec.vrd_expiry_date
#         diff = (frappe.utils.getdate(expiry) - frappe.utils.getdate(today)).days

#         # Trigger alerts at 15, 10, 5 days
#         if diff in [15, 10, 5]:

#             parent_doc = frappe.get_doc("RTO Details VMN", rec.parent)

#             email = parent_doc.email_id  # make sure fieldname is correct

#             if email:
#                 frappe.sendmail(
#                     recipients=[email],
#                     subject=f"Reminder: {rec.vrd_document_type} Expiring in {diff} days",
#                     message=f"""
#                     Dear User,<br><br>
#                     Your <b>{rec.vrd_document_type}</b> document is expiring on <b>{expiry}</b>.<br>
#                     Only <b>{diff} days</b> remaining.<br><br>
#                     Regards,<br>
#                     Vehicle Management System
#                     """
#                 )









