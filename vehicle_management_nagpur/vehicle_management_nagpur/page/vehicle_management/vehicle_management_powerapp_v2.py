# Copyright (c) 2026, DUX Digitech and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, cstr, flt

from . import vehicle_management as base


def _time_to_seconds(value):
    raw = cstr(value).strip()
    if not raw:
        return None
    try:
        parts = raw.split(":")
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = flt(parts[2]) if len(parts) > 2 else 0
        return (hours * 3600) + (minutes * 60) + seconds
    except (TypeError, ValueError, IndexError):
        return None


def _duration_hours(start_value, end_value):
    start_seconds = _time_to_seconds(start_value)
    end_seconds = _time_to_seconds(end_value)
    if start_seconds is None or end_seconds is None:
        return 0
    duration = end_seconds - start_seconds
    if duration < 0:
        duration += 24 * 3600
    return round(duration / 3600, 2)


def _previous_diesel_fill_up_reading(doc):
    vehicle = cstr(doc.get("dd_vehicle_number")).strip()
    if not vehicle:
        return None

    filters = {"dd_vehicle_number": vehicle}
    if cstr(doc.get("name")):
        filters["name"] = ["!=", doc.name]

    rows = frappe.get_all(
        "Diesel Details VMN",
        filters=filters,
        fields=["dd_fuel_fill_up_reading"],
        order_by="dd_date desc, creation desc",
        limit=1,
    )
    if not rows:
        return None
    value = rows[0].get("dd_fuel_fill_up_reading")
    return flt(value) if value not in (None, "") else None


def _apply_power_app_calculations(doc):
    if doc.doctype == "Log Details VMN":
        doc.ld_distance = flt(doc.end_reading) - flt(doc.start_reading)
        if doc.meta.has_field("ld_total_hours"):
            doc.ld_total_hours = _duration_hours(doc.start_time, doc.end_time)
    elif doc.doctype == "DG Details VMN":
        start = cstr(doc.get("dg_start_reading")).strip()
        end = cstr(doc.get("dg_end_reading")).strip()
        if start and end and flt(doc.dg_end_reading) >= flt(doc.dg_start_reading):
            units = flt(doc.dg_end_reading) - flt(doc.dg_start_reading)
            doc.dg_total_dg_unit = units
            doc.dg_diesel_consumption = units
        else:
            doc.dg_total_dg_unit = 0
            doc.dg_diesel_consumption = 0
        doc.dg_total_hours = _duration_hours(doc.dg_start_time, doc.dg_end_time)
        if flt(doc.dg_diesel_consumption) and flt(doc.dg_diesel_rateltr):
            doc.dg_total_amount = flt(doc.dg_diesel_consumption) * flt(doc.dg_diesel_rateltr)
    elif doc.doctype == "Diesel Details VMN":
        doc.dd_amount = flt(doc.dd_quantity) * flt(doc.dd_rate)
        previous = _previous_diesel_fill_up_reading(doc)
        if previous is not None and not flt(doc.dd_previous_fuel_fill_up_reading):
            doc.dd_previous_fuel_fill_up_reading = previous
        travelled = flt(doc.dd_fuel_fill_up_reading) - flt(doc.dd_previous_fuel_fill_up_reading)
        if flt(doc.dd_quantity) and travelled >= 0:
            doc.dd_average = round(travelled / flt(doc.dd_quantity), 2)
        else:
            previous_doc = doc.get_doc_before_save() if not doc.is_new() else None
            saved_average = previous_doc.get("dd_average") if previous_doc else doc.get("dd_average")
            doc.dd_average = saved_average if saved_average not in (None, "") else 0


@frappe.whitelist()
def get_portal_bootstrap():
    return base.get_portal_bootstrap()


@frappe.whitelist()
def get_dashboard():
    return base.get_dashboard()


@frappe.whitelist()
def get_document_list(**kwargs):
    return base.get_document_list(**kwargs)


@frappe.whitelist()
def get_document(key, name):
    return base.get_document(key, name)


@frappe.whitelist()
def get_document_form(key, name=None):
    return base.get_document_form(key, name)


@frappe.whitelist()
def get_vehicle_details(vehicle_number):
    config = base._get_config("vehicles")
    base._check_permission(config, "read")
    vehicle_number = cstr(vehicle_number).strip()
    if not vehicle_number:
        return {}
    fields = ["vd_vehicle_number", "vd_vehicle_name", "vd_type_of_vehicle", "vd_location"]
    details = frappe.db.get_value("Vehicle Details VMN", vehicle_number, fields, as_dict=True)
    if details:
        return details
    vehicle_name = frappe.db.get_value("Vehicle Details VMN", {"vd_vehicle_number": vehicle_number}, "name")
    if not vehicle_name:
        return {}
    return frappe.db.get_value("Vehicle Details VMN", vehicle_name, fields, as_dict=True) or {}


@frappe.whitelist()
def get_dg_details(dg_information, dg_campus=None):
    config = base._get_config("dg_information")
    base._check_permission(config, "read")
    dg_information = cstr(dg_information).strip()
    dg_campus = cstr(dg_campus).strip()
    if not dg_information:
        return {}

    fields = [
        "type_of_diesel_generator",
        "diesel_generator_number",
        "diesel_generator_location",
        "diesel_generator_campus",
    ]
    details = frappe.db.get_value("Diesel Generator Information VMN", dg_information, fields, as_dict=True)
    if details:
        return details

    filters = {"diesel_generator_location": dg_information}
    if dg_campus:
        filters["diesel_generator_campus"] = dg_campus
    info_name = frappe.db.get_value("Diesel Generator Information VMN", filters, "name")
    if not info_name and dg_campus:
        info_name = frappe.db.get_value(
            "Diesel Generator Information VMN",
            {"diesel_generator_location": dg_information},
            "name",
        )
    if not info_name:
        return {}
    return frappe.db.get_value("Diesel Generator Information VMN", info_name, fields, as_dict=True) or {}


def _apply_maintenance_work_details(doc, values):
    """Persist Maintenance Work Details on first save and edit save."""
    if doc.doctype != "Maintenance Details VMN":
        return

    raw_rows = values.get("md_work_details_table")
    if raw_rows in (None, ""):
        raw_rows = values.get("md_work_details")

    rows = []
    if raw_rows not in (None, ""):
        try:
            rows = frappe.parse_json(raw_rows) if isinstance(raw_rows, str) else raw_rows
        except Exception:
            rows = []
    if not isinstance(rows, list):
        rows = []

    cleaned_rows = []
    total = 0
    for row in rows:
        if not isinstance(row, dict):
            continue
        repair_work = cstr(
            row.get("mwd_repair_work")
            or row.get("name_of_repair_work")
            or row.get("repair_work")
            or row.get("work")
        ).strip()
        amount = flt(row.get("mwd_amount") if row.get("mwd_amount") is not None else row.get("amount"))
        if not repair_work and not amount:
            continue
        cleaned_rows.append({"mwd_repair_work": repair_work, "mwd_amount": amount})
        total += amount

    if raw_rows not in (None, ""):
        doc.set("md_work_details_table", [])
        for row in cleaned_rows:
            doc.append("md_work_details_table", row)
        doc.set("md_work_details", frappe.as_json(cleaned_rows))

    if raw_rows not in (None, ""):
        doc.set("md_total_repairingamount", total)
    elif values.get("md_total_repairingamount") not in (None, ""):
        doc.set("md_total_repairingamount", flt(values.get("md_total_repairingamount")))


@frappe.whitelist()
def save_document(key, values, name=None, submit=0):
    config = base._get_config(key)
    meta = base._get_meta(config)
    values = frappe.parse_json(values) if isinstance(values, str) else (values or {})
    is_new = not cstr(name)

    if is_new:
        base._check_permission(config, "create")
        doc = frappe.new_doc(config["doctype"])
    else:
        doc = frappe.get_doc(config["doctype"], cstr(name))
        base._check_permission(config, "write", doc=doc)
        if doc.docstatus != 0:
            frappe.throw(_("Only draft records can be edited in the portal."))

    writable_fields = {
        df.fieldname
        for df in base._usable_data_fields(meta)
        if not df.read_only and df.fieldname not in {"amended_from"}
    }
    for fieldname, value in values.items():
        if fieldname in writable_fields:
            doc.set(fieldname, value)

    _apply_power_app_calculations(doc)
    _apply_maintenance_work_details(doc, values)
    if base._uses_approval(config):
        base._ensure_approval_state(doc)
    doc.save()

    if cint(submit):
        if not meta.is_submittable:
            frappe.throw(_("{0} cannot be submitted.").format(_(config["label"])))
        base._check_permission(config, "submit", doc=doc)
        if base._uses_approval(config) and doc.meta.has_field(base.APPROVAL_STATE_FIELD):
            doc.set(base.APPROVAL_STATE_FIELD, "Approved")
        doc.submit()

    return {
        "name": doc.name,
        "docstatus": doc.docstatus,
        "message": _("{0} saved successfully.").format(_(config["label"])),
    }
