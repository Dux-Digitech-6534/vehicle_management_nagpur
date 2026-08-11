# Copyright (c) 2026, DUX Digitech and contributors
# For license information, please see license.txt

from __future__ import annotations

from copy import deepcopy

import frappe
from frappe import _
from frappe.utils import cint, cstr, flt


MAX_PAGE_LENGTH = 100
LAYOUT_FIELD_TYPES = {
    "Section Break",
    "Column Break",
    "Tab Break",
    "Fold",
    "Heading",
    "HTML",
    "Button",
    "Image",
}
SEARCHABLE_FIELD_TYPES = {"Data", "Link", "Dynamic Link", "Select", "Small Text", "Text"}

APPROVAL_STATE_FIELD = "workflow_state"
APPROVAL_STATES = {"Draft", "Pending", "Approved"}
APPROVAL_DOCTYPES = {
    "Log Details VMN",
    "Diesel Details VMN",
    "Maintenance Details VMN",
    "RTO Details VMN",
    "DG Details VMN",
}


def _uses_approval(config):
    return config.get("doctype") in APPROVAL_DOCTYPES


def _approval_state(doc):
    state = cstr(doc.get(APPROVAL_STATE_FIELD)).strip()
    if state in APPROVAL_STATES:
        return state
    if cint(doc.get("docstatus")) == 1:
        return "Approved"
    return "Draft"


def _ensure_approval_state(doc):
    if not doc.meta.has_field(APPROVAL_STATE_FIELD):
        return
    if not cstr(doc.get(APPROVAL_STATE_FIELD)).strip():
        doc.set(APPROVAL_STATE_FIELD, "Approved" if cint(doc.docstatus) == 1 else "Draft")


def _apply_approval_state(config, row):
    if _uses_approval(config):
        row[APPROVAL_STATE_FIELD] = _approval_state(row)
    return row


def _is_vehicle_approval_user():
    user = frappe.session.user
    if user == "Administrator" or "System Manager" in frappe.get_roles(user):
        return True
    try:
        meta = frappe.get_meta("User Details VMN")
    except Exception:
        return False
    user_fields = [
        fieldname
        for fieldname in ("ud_user_email", "ud_user_name", "ud_personal_email")
        if meta.has_field(fieldname)
    ]
    for fieldname in user_fields:
        if frappe.db.exists("User Details VMN", {fieldname: user, "ud_user_type": "Approve"}):
            return True
    return False


def _can_approve(config, doc):
    if not _uses_approval(config) or doc.docstatus != 0 or _approval_state(doc) != "Pending":
        return False
    return bool(_is_vehicle_approval_user())


def _can_request_approval(config, doc):
    return bool(
        _uses_approval(config)
        and doc.docstatus == 0
        and _approval_state(doc) == "Draft"
        and doc.has_permission("write")
    )


def _can_edit_document(config, doc):
    return bool(
        doc.docstatus == 0
        and (not _uses_approval(config) or _approval_state(doc) == "Draft")
        and doc.has_permission("write")
    )


DOCUMENT_CONFIG = {
    "vehicle_logs": {
        "label": "Log Details",
        "doctype": "Log Details VMN",
        "icon": "list",
        "description": "Daily vehicle movement, readings, distance and attachments.",
        "group": "Operations",
        "date_field": "date",
        "list_fields": [
            "date",
            "vehicle_number",
            "ld_vehicle_name",
            "start_reading",
            "end_reading",
            "ld_distance",
            "ld_select_campus",
        ],
        "search_fields": ["name", "vehicle_number", "ld_vehicle_name", "ld_vehicle_location", "ld_select_campus"],
    },
    "fuel_diesel": {
        "label": "Diesel Details",
        "doctype": "Diesel Details VMN",
        "icon": "timeline",
        "description": "Fuel issue, odometer, quantity, rate, amount and average.",
        "group": "Operations",
        "date_field": "dd_date",
        "list_fields": [
            "dd_date",
            "dd_vehicle_number",
            "dd_vehicle_name",
            "dd_quantity",
            "dd_rate",
            "dd_amount",
            "dd_select_campus",
        ],
        "search_fields": [
            "name",
            "dd_vehicle_number",
            "dd_vehicle_name",
            "dd_fuel_station_name",
            "dd_select_campus",
        ],
    },
    "maintenance": {
        "label": "Maintenance Details",
        "doctype": "Maintenance Details VMN",
        "icon": "setting-gear",
        "description": "Vehicle repairs, vendors, invoices, costs and work details.",
        "group": "Operations",
        "date_field": "md_date",
        "list_fields": [
            "md_date",
            "md_vehicle_number",
            "md_vehicle_name",
            "md_vendor_name",
            "md_total_repairingamount",
            "md_select_campus",
        ],
        "search_fields": ["name", "md_vehicle_number", "md_vehicle_name", "md_vendor_name", "md_select_campus"],
    },
    "rto_compliance": {
        "label": "RTO Details",
        "doctype": "RTO Details VMN",
        "icon": "check",
        "description": "RTO documents, issue dates, expiry dates, renewals and attachments.",
        "group": "Operations",
        "date_field": "rto_date",
        "list_fields": [
            "rto_date",
            "rto_vehicle_number",
            "rto_vehicle_name",
            "document_type",
            "issued_date",
            "expired_date",
            "amount",
            "rto_select_campus",
        ],
        "search_fields": [
            "name",
            "rto_vehicle_number",
            "rto_vehicle_name",
            "document_type",
            "trust_name",
            "rto_select_campus",
        ],
    },
    "dg_operations": {
        "label": "DG Details",
        "doctype": "DG Details VMN",
        "icon": "activity",
        "description": "Generator readings, runtime, diesel consumption and cost.",
        "group": "Operations",
        "date_field": "dgd_date",
        "list_fields": [
            "dgd_date",
            "dgd_dg_campus",
            "dg_location",
            "dg_type",
            "dg_number",
            "dg_total_dg_unit",
            "dg_total_hours",
            "dg_total_amount",
        ],
        "search_fields": ["name", "dgd_dg_campus", "dg_location", "dg_type", "dg_number"],
    },
    "vehicles": {
        "label": "Vehicle Detail",
        "doctype": "Vehicle Details VMN",
        "icon": "grid",
        "description": "Vehicle master, model, location, fuel and capacity.",
        "group": "Masters",
        "list_fields": [
            "vd_vehicle_number",
            "vd_vehicle_name",
            "vd_type_of_vehicle",
            "vd_model_name",
            "vd_location",
            "vd_purchase_year",
            "vd_fuel_type",
            "vd_seat_capacity",
        ],
        "search_fields": [
            "name",
            "vd_vehicle_number",
            "vd_vehicle_name",
            "vd_type_of_vehicle",
            "vd_model_name",
            "vd_location",
        ],
    },
    "campuses": {
        "label": "Campus Details",
        "doctype": "Campus Details VMN",
        "icon": "home",
        "description": "Campus and location master.",
        "group": "Masters",
        "list_fields": ["cd_location", "cd_campus_name", "supervisor_name"],
        "search_fields": ["name", "cd_location", "cd_campus_name", "supervisor_name"],
    },
    "vendors": {
        "label": "Vendors",
        "doctype": "Vendor Details VMN",
        "icon": "users",
        "description": "Maintenance and service vendor master.",
        "group": "Masters",
        "list_fields": ["vendor_name"],
        "search_fields": ["name", "vendor_name"],
    },
    "users": {
        "label": "User Details",
        "doctype": "User Details VMN",
        "icon": "user",
        "description": "Vehicle Management users and contact details.",
        "group": "Masters",
        "list_fields": [
            "ud_user_name",
            "ud_user_type",
            "ud_user_email",
            "ud_personal_email",
        ],
        "search_fields": [
            "name",
            "ud_user_name",
            "ud_user_type",
            "ud_user_email",
            "ud_personal_email",
        ],
    },
    "locations": {
        "label": "Locations",
        "doctype": "Location Details VMN",
        "icon": "map",
        "description": "Vehicle location master.",
        "group": "Settings",
        "list_fields": ["location_name"],
        "search_fields": ["name", "location_name"],
    },
    "fuel_stations": {
        "label": "Fuel Stations",
        "doctype": "Fuel Station VMN",
        "icon": "flag",
        "description": "Fuel station",
        "group": "Settings",
        "list_fields": ["fuel_station_name"],
        "search_fields": ["name", "fuel_station_name"],
    },
    "trust_names": {
        "label": "Trust Names",
        "doctype": "Trust Name VMN",
        "icon": "organization",
        "description": "Trust master used for RTO documents.",
        "group": "Settings",
        "list_fields": ["tn_trust_name"],
        "search_fields": ["name", "tn_trust_name"],
    },
    "supervisors": {
        "label": "Supervisors",
        "doctype": "Supervisor for Campus VMN",
        "icon": "user-check",
        "description": "Campus supervisor master.",
        "group": "Settings",
        "list_fields": ["supervisor_name"],
        "search_fields": ["name", "supervisor_name"],
    },
    "dg_campuses": {
        "label": "DG Campuses",
        "doctype": "DG Campus VMN",
        "icon": "home",
        "description": "Diesel generator campus master.",
        "group": "Settings",
        "list_fields": ["campus_name", "dg_location"],
        "search_fields": ["name", "campus_name", "dg_location"],
    },
    "dg_locations": {
        "label": "DG Locations",
        "doctype": "DG Location At Campus VMN",
        "icon": "map",
        "description": "Generator location master.",
        "group": "Settings",
        "list_fields": ["dg_location_name"],
        "search_fields": ["name", "dg_location_name"],
    },
    "dg_information": {
        "label": "DG Detail",
        "doctype": "Diesel Generator Information VMN",
        "icon": "info",
        "description": "Generator number, type, campus and location.",
        "group": "Settings",
        "list_fields": [
            "type_of_diesel_generator",
            "diesel_generator_number",
            "diesel_generator_location",
            "diesel_generator_campus",
        ],
        "search_fields": [
            "name",
            "type_of_diesel_generator",
            "diesel_generator_number",
            "diesel_generator_location",
            "diesel_generator_campus",
        ],
    },
}

MENU_GROUPS = [
    {
        "label": "Operations",
        "items": ["vehicle_logs", "fuel_diesel", "maintenance", "rto_compliance", "dg_operations"],
    },
    {
        "label": "Settings",
        "items": [
            "vehicles",
            "campuses",
            "users",
            "locations",
            "trust_names",
            "dg_information",
            "supervisors",
        ],
    },
]


def _require_authenticated_user():
    if frappe.session.user == "Guest":
        frappe.throw(_("Please sign in to use Vehicle Management."), frappe.AuthenticationError)


def _get_config(key):
    _require_authenticated_user()
    config = DOCUMENT_CONFIG.get(cstr(key))
    if not config:
        frappe.throw(_("This Vehicle Management route is not available."), frappe.DoesNotExistError)
    return config


def _get_meta(config):
    return frappe.get_meta(config["doctype"])


def _check_permission(config, permission_type="read", doc=None):
    doctype = config["doctype"]
    allowed = doc.has_permission(permission_type) if doc else frappe.has_permission(doctype, ptype=permission_type)
    if not allowed:
        frappe.throw(
            _("You do not have {0} permission for {1}.").format(permission_type, _(config["label"])),
            frappe.PermissionError,
        )


def _field_exists(meta, fieldname):
    return fieldname == "name" or bool(meta.get_field(fieldname))


def _usable_data_fields(meta):
    return [
        df
        for df in meta.fields
        if df.fieldname
        and not df.hidden
        and df.fieldtype not in LAYOUT_FIELD_TYPES
        and df.fieldtype != "Table"
    ]


def _list_fieldnames(config, meta):
    fields = ["name"]
    requested = config.get("list_fields") or []
    for fieldname in requested:
        if _field_exists(meta, fieldname) and fieldname not in fields:
            fields.append(fieldname)
    if len(fields) == 1:
        for df in _usable_data_fields(meta):
            if df.in_list_view and df.fieldname not in fields:
                fields.append(df.fieldname)
    if len(fields) == 1:
        for df in _usable_data_fields(meta)[:5]:
            if df.fieldname not in fields:
                fields.append(df.fieldname)
    if _uses_approval(config) and _field_exists(meta, APPROVAL_STATE_FIELD) and APPROVAL_STATE_FIELD not in fields:
        fields.append(APPROVAL_STATE_FIELD)
    return fields[:10 if _uses_approval(config) else 9]


def _search_fieldnames(config, meta):
    fields = []
    for fieldname in config.get("search_fields") or []:
        df = meta.get_field(fieldname) if fieldname != "name" else None
        if fieldname == "name" or (df and df.fieldtype in SEARCHABLE_FIELD_TYPES):
            fields.append(fieldname)
    if "name" not in fields:
        fields.insert(0, "name")
    return fields


def _field_schema(df):
    return {
        "fieldname": df.fieldname,
        "label": _(df.label or df.fieldname.replace("_", " ").title()),
        "fieldtype": df.fieldtype,
        "options": df.options or "",
        "reqd": cint(df.reqd),
        "read_only": cint(df.read_only),
        "description": _(df.description) if df.description else "",
        "default": df.default,
        "precision": df.precision,
    }


def _column_schema(fieldname, meta):
    if fieldname == "name":
        return {
            "fieldname": "name",
            "label": _("ID"),
            "fieldtype": "Data",
            "options": "",
            "reqd": 0,
            "read_only": 1,
        }
    return _field_schema(meta.get_field(fieldname))


def _form_sections(meta):
    sections = []
    current = {"label": _("Details"), "fields": []}

    for df in meta.fields:
        if df.hidden:
            continue
        if df.fieldtype in {"Section Break", "Tab Break"}:
            if current["fields"]:
                sections.append(current)
            current = {"label": _(df.label or "Details"), "fields": []}
            continue
        if df.fieldtype in LAYOUT_FIELD_TYPES or df.fieldtype == "Table":
            continue
        current["fields"].append(_field_schema(df))

    if current["fields"]:
        sections.append(current)
    return sections or [{"label": _("Details"), "fields": []}]


def _permission_count(doctype, filters=None, or_filters=None):
    rows = frappe.get_list(
        doctype,
        fields=["count(name) as total"],
        filters=filters or [],
        or_filters=or_filters or [],
        limit_page_length=1,
    )
    return cint(rows[0].get("total")) if rows else 0


def _menu_item(key, config):
    meta = _get_meta(config)
    columns = [_column_schema(fieldname, meta) for fieldname in _list_fieldnames(config, meta)]
    filter_fields = [
        column
        for column in columns
        if column["fieldname"] != "name"
        and column["fieldtype"] in {"Select", "Link", "Data", "Date", "Check"}
    ][:5]
    status_column = next((column for column in columns if column["fieldname"] == APPROVAL_STATE_FIELD), None)
    if _uses_approval(config) and status_column and status_column not in filter_fields:
        filter_fields.append(status_column)
    return {
        "key": key,
        "label": _(config["label"]),
        "icon": config["icon"],
        "description": _(config["description"]),
        "doctype": config["doctype"],
        "can_create": bool(frappe.has_permission(config["doctype"], ptype="create")),
        "columns": columns,
        "filter_fields": filter_fields,
        "date_field": config.get("date_field"),
    }


@frappe.whitelist()
def get_portal_bootstrap():
    _require_authenticated_user()
    menu = []
    available = {}

    for key, config in DOCUMENT_CONFIG.items():
        if frappe.has_permission(config["doctype"], ptype="read"):
            available[key] = _menu_item(key, config)

    for group in MENU_GROUPS:
        items = [available[key] for key in group["items"] if key in available]
        if items:
            menu.append({"label": _(group["label"]), "items": items})

    full_name = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user
    return {
        "user": {
            "id": frappe.session.user,
            "full_name": full_name,
            "initials": "".join(part[0].upper() for part in full_name.split()[:2]) or "VM",
        },
        "menu": menu,
        "page_length": 20,
    }


@frappe.whitelist()
def get_dashboard():
    _require_authenticated_user()
    kpi_keys = ["vehicles", "vehicle_logs", "fuel_diesel", "maintenance"]
    kpis = []

    for key in kpi_keys:
        config = DOCUMENT_CONFIG[key]
        if not frappe.has_permission(config["doctype"], ptype="read"):
            continue
        kpis.append(
            {
                "key": key,
                "label": _(config["label"]),
                "icon": config["icon"],
                "value": _permission_count(config["doctype"]),
                "description": _(config["description"]),
            }
        )

    recent = []
    for key in ["vehicle_logs", "fuel_diesel", "maintenance", "rto_compliance", "dg_operations"]:
        config = DOCUMENT_CONFIG[key]
        if not frappe.has_permission(config["doctype"], ptype="read"):
            continue
        meta = _get_meta(config)
        list_fields = _list_fieldnames(config, meta)
        query_fields = list(dict.fromkeys(list_fields + ["modified"]))
        for row in frappe.get_list(
            config["doctype"],
            fields=query_fields,
            order_by="modified desc",
            limit_page_length=4,
        ):
            title_field = next((field for field in list_fields if field != "name" and row.get(field)), "name")
            recent.append(
                {
                    "key": key,
                    "doctype": config["doctype"],
                    "module": _(config["label"]),
                    "name": row.name,
                    "title": row.get(title_field) or row.name,
                    "date": row.get(config.get("date_field")) if config.get("date_field") else row.modified,
                    "modified": row.modified,
                }
            )

    recent.sort(key=lambda row: cstr(row.get("modified")), reverse=True)
    return {"kpis": kpis, "recent": recent[:8]}


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
    config = _get_config(key)
    _check_permission(config, "read")
    meta = _get_meta(config)
    list_fields = _list_fieldnames(config, meta)
    allowed_sort_fields = set(list_fields + ["modified", "creation"])
    allowed_filter_fields = set(list_fields)

    start = max(0, cint(start))
    page_length = min(MAX_PAGE_LENGTH, max(1, cint(page_length) or 20))
    sort_by = cstr(sort_by) if cstr(sort_by) in allowed_sort_fields else (config.get("date_field") or "modified")
    sort_order = "asc" if cstr(sort_order).lower() == "asc" else "desc"
    filters = []
    or_filters = []

    if filter_field and filter_value and cstr(filter_field) in allowed_filter_fields:
        df = meta.get_field(filter_field) if filter_field != "name" else None
        operator = "=" if df and df.fieldtype in {"Check", "Date"} else "like"
        value = filter_value if operator == "=" else f"%{cstr(filter_value).strip()}%"
        filters.append([config["doctype"], cstr(filter_field), operator, value])

    search = cstr(search).strip()
    if search:
        for fieldname in _search_fieldnames(config, meta):
            or_filters.append([config["doctype"], fieldname, "like", f"%{search}%"])

    if key == "vehicle_logs" and sort_by == config.get("date_field"):
        order_by = f"`tab{config['doctype']}`.`creation` desc"
    else:
        order_by = (
            f"`tab{config['doctype']}`.`{sort_by}` {sort_order}, "
            f"`tab{config['doctype']}`.`creation` {sort_order}"
        )

    query_fields = list(dict.fromkeys(list_fields + ["docstatus"]))
    rows = frappe.get_list(
        config["doctype"],
        fields=query_fields,
        filters=filters,
        or_filters=or_filters,
        order_by=order_by,
        limit_start=start,
        limit_page_length=page_length,
    )
    for row in rows:
        _apply_approval_state(config, row)
    total = _permission_count(config["doctype"], filters=filters, or_filters=or_filters)

    return {
        "key": key,
        "label": _(config["label"]),
        "description": _(config["description"]),
        "doctype": config["doctype"],
        "columns": [_column_schema(fieldname, meta) for fieldname in list_fields],
        "rows": rows,
        "total": total,
        "start": start,
        "page_length": page_length,
        "can_create": bool(frappe.has_permission(config["doctype"], ptype="create")),
    }


@frappe.whitelist()
def get_document(key, name):
    config = _get_config(key)
    doc = frappe.get_doc(config["doctype"], cstr(name))
    _check_permission(config, "read", doc=doc)
    meta = _get_meta(config)
    sections = _form_sections(meta)
    values = {}
    for section in sections:
        for field in section["fields"]:
            values[field["fieldname"]] = doc.get(field["fieldname"])

    # VMNP maintenance work details persist 2026-08-10
    if key == "maintenance":
        values["md_work_details"] = doc.get("md_work_details")

    approval_state = _approval_state(doc) if _uses_approval(config) else ""
    if approval_state and _field_exists(meta, APPROVAL_STATE_FIELD):
        values[APPROVAL_STATE_FIELD] = approval_state

    return {
        "key": key,
        "label": _(config["label"]),
        "description": _(config["description"]),
        "doctype": config["doctype"],
        "name": doc.name,
        "docstatus": doc.docstatus,
        "approval_state": approval_state,
        "sections": sections,
        "values": values,
        "can_edit": _can_edit_document(config, doc),
        "can_request_approval": _can_request_approval(config, doc),
        "can_approve": _can_approve(config, doc),
    }


@frappe.whitelist()
def get_document_form(key, name=None):
    config = _get_config(key)
    meta = _get_meta(config)
    is_new = not cstr(name)
    doc = frappe.new_doc(config["doctype"]) if is_new else frappe.get_doc(config["doctype"], cstr(name))
    _check_permission(config, "create" if is_new else "read", doc=None if is_new else doc)

    sections = _form_sections(meta)
    values = {}
    for section in sections:
        for field in section["fields"]:
            values[field["fieldname"]] = doc.get(field["fieldname"])

    # VMNP maintenance work details persist 2026-08-10
    if key == "maintenance":
        values["md_work_details"] = doc.get("md_work_details")

    approval_state = _approval_state(doc) if _uses_approval(config) else ""
    if approval_state and _field_exists(meta, APPROVAL_STATE_FIELD):
        values[APPROVAL_STATE_FIELD] = approval_state

    can_save = frappe.has_permission(config["doctype"], ptype="create") if is_new else doc.has_permission("write")
    can_submit = bool(
        meta.is_submittable
        and doc.docstatus == 0
        and frappe.has_permission(config["doctype"], ptype="submit", doc=doc)
    )

    return {
        "key": key,
        "label": _(config["label"]),
        "description": _(config["description"]),
        "doctype": config["doctype"],
        "name": None if is_new else doc.name,
        "is_new": is_new,
        "docstatus": doc.docstatus,
        "approval_state": approval_state,
        "sections": sections,
        "values": values,
        "can_save": bool(can_save and doc.docstatus == 0 and (not _uses_approval(config) or approval_state == "Draft")),
        "can_submit": can_submit,
        "can_request_approval": bool(not is_new and _can_request_approval(config, doc)),
        "can_approve": bool(not is_new and _can_approve(config, doc)),
    }


@frappe.whitelist()
def save_document(key, values, name=None, submit=0):
    config = _get_config(key)
    meta = _get_meta(config)
    values = frappe.parse_json(values) if isinstance(values, str) else (values or {})
    is_new = not cstr(name)

    if is_new:
        _check_permission(config, "create")
        doc = frappe.new_doc(config["doctype"])
    else:
        doc = frappe.get_doc(config["doctype"], cstr(name))
        _check_permission(config, "write", doc=doc)
        if doc.docstatus != 0:
            frappe.throw(_("Only draft records can be edited in the portal."))

    writable_fields = {
        df.fieldname
        for df in _usable_data_fields(meta)
        if not df.read_only and df.fieldname not in {"amended_from"}
    }
    for fieldname, value in values.items():
        if fieldname in writable_fields:
            doc.set(fieldname, value)

    # VMNP maintenance work details persist 2026-08-10
    if key == "maintenance":
        work_details = values.get("md_work_details")
        if work_details is not None:
            doc.set("md_work_details", cstr(work_details))

        total = values.get("md_total_repairingamount")
        if total in (None, "") and work_details:
            total = 0
            try:
                parsed_rows = frappe.parse_json(work_details) or []
                if isinstance(parsed_rows, list):
                    total = sum(flt((row or {}).get("amount")) for row in parsed_rows)
            except Exception:
                total = 0
        if total not in (None, ""):
            doc.set("md_total_repairingamount", flt(total))

    if _uses_approval(config):
        _ensure_approval_state(doc)

    doc.save()
    if cint(submit):
        if not meta.is_submittable:
            frappe.throw(_("{0} cannot be submitted.").format(_(config["label"])))
        _check_permission(config, "submit", doc=doc)
        if _uses_approval(config) and doc.meta.has_field(APPROVAL_STATE_FIELD):
            doc.set(APPROVAL_STATE_FIELD, "Approved")
        doc.submit()

    return {
        "name": doc.name,
        "docstatus": doc.docstatus,
        "message": _("{0} saved successfully.").format(_(config["label"])),
    }
