# Copyright (c) 2026, DUX Digitech and contributors
# For license information, please see license.txt

import frappe

from . import vehicle_management_powerapp_v2 as powerapp_v2


@frappe.whitelist()
def get_portal_bootstrap():
    return powerapp_v2.get_portal_bootstrap()


@frappe.whitelist()
def get_dashboard():
    return powerapp_v2.get_dashboard()


@frappe.whitelist()
def get_document_list(
    key,
    start=0,
    page_length=20,
    search=None,
    filter_field=None,
    filter_value=None,
    sort_by=None,
    sort_order="desc",
):
    return powerapp_v2.base.get_document_list(
        key=key,
        start=start,
        page_length=page_length,
        search=search,
        filter_field=filter_field,
        filter_value=filter_value,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@frappe.whitelist()
def get_document(key, name):
    return powerapp_v2.get_document(key, name)


@frappe.whitelist()
def get_document_form(key, name=None):
    return powerapp_v2.get_document_form(key, name)


@frappe.whitelist()
def get_vehicle_details(vehicle_number):
    return powerapp_v2.get_vehicle_details(vehicle_number)


@frappe.whitelist()
def get_dg_details(dg_information, dg_campus=None):
    return powerapp_v2.get_dg_details(dg_information, dg_campus=dg_campus)


@frappe.whitelist()
def save_document(key, values, name=None, submit=0):
    return powerapp_v2.save_document(key=key, values=values, name=name, submit=submit)
