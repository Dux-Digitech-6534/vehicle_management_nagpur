# Copyright (c) 2026, DUX Digitech and contributors
# For license information, please see license.txt

import frappe

from . import vehicle_management_powerapp_v3 as powerapp_v3


@frappe.whitelist()
def get_portal_bootstrap():
    return powerapp_v3.get_portal_bootstrap()


@frappe.whitelist()
def get_dashboard():
    return powerapp_v3.get_dashboard()


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
    return powerapp_v3.get_document_list(
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
    return powerapp_v3.get_document(key, name)


@frappe.whitelist()
def get_document_form(key, name=None):
    return powerapp_v3.get_document_form(key, name)


@frappe.whitelist()
def get_vehicle_details(vehicle_number):
    return powerapp_v3.get_vehicle_details(vehicle_number)


@frappe.whitelist()
def get_dg_details(dg_information, dg_campus=None):
    return powerapp_v3.get_dg_details(dg_information, dg_campus=dg_campus)


@frappe.whitelist()
def get_campus_details(campus):
    config = powerapp_v3.powerapp_v2.base._get_config("campuses")
    powerapp_v3.powerapp_v2.base._check_permission(config, "read")
    if not campus:
        return {}
    return (
        frappe.db.get_value(
            "Campus Details VMN",
            campus,
            ["cd_location", "cd_campus_name", "supervisor_name"],
            as_dict=True,
        )
        or {}
    )


@frappe.whitelist()
def save_document(key, values, name=None, submit=0):
    return powerapp_v3.save_document(key=key, values=values, name=name, submit=submit)


@frappe.whitelist()
def get_document_list_multi(
    key,
    start=0,
    page_length=20,
    search=None,
    filters=None,
    sort_by=None,
    sort_order="desc",
    from_date=None,
    to_date=None,
):
    """get_document_list ka multi-filter version.

    `filters` ek JSON object hai — {"fieldname": "value", ...} — taaki date,
    campus aur vehicle par ek saath filter lag sake.

    Purana get_document_list bilkul waisa hi rehta hai; ye alag endpoint hai,
    is liye kuch bhi purana toota nahi hai.
    """
    import json

    from frappe.utils import cint, cstr

    base = powerapp_v3.powerapp_v2.base

    config = base._get_config(key)
    base._check_permission(config, "read")
    meta = base._get_meta(config)
    list_fields = base._list_fieldnames(config, meta)
    allowed_sort_fields = set(list_fields + ["modified", "creation"])
    allowed_filter_fields = set(list_fields)

    start = max(0, cint(start))
    page_length = min(base.MAX_PAGE_LENGTH, max(1, cint(page_length) or 20))
    sort_by = cstr(sort_by) if cstr(sort_by) in allowed_sort_fields else (config.get("date_field") or "modified")
    sort_order = "asc" if cstr(sort_order).lower() == "asc" else "desc"

    if isinstance(filters, str):
        try:
            filters = json.loads(filters or "{}")
        except ValueError:
            filters = {}
    if not isinstance(filters, dict):
        filters = {}

    applied = []
    for fieldname, value in filters.items():
        fieldname = cstr(fieldname)
        # Sirf list ke apne fields — user koi aur field inject nahi kar sakta.
        if fieldname not in allowed_filter_fields:
            continue
        if value is None or cstr(value).strip() == "":
            continue
        df = meta.get_field(fieldname) if fieldname != "name" else None
        operator = "=" if df and df.fieldtype in {"Check", "Date"} else "like"
        applied.append(
            [
                config["doctype"],
                fieldname,
                operator,
                value if operator == "=" else f"%{cstr(value).strip()}%",
            ]
        )

    # From/To date range — config ke date_field par lagta hai.
    date_field = config.get("date_field")
    if date_field and date_field in allowed_filter_fields:
        if cstr(from_date).strip():
            applied.append([config["doctype"], date_field, ">=", cstr(from_date).strip()])
        if cstr(to_date).strip():
            applied.append([config["doctype"], date_field, "<=", cstr(to_date).strip()])

    or_filters = []
    search = cstr(search).strip()
    if search:
        for fieldname in base._search_fieldnames(config, meta):
            or_filters.append([config["doctype"], fieldname, "like", f"%{search}%"])

    query_fields = list(dict.fromkeys(list_fields + ["docstatus"]))
    rows = frappe.get_list(
        config["doctype"],
        fields=query_fields,
        filters=applied,
        or_filters=or_filters,
        order_by=f"`tab{config['doctype']}`.`{sort_by}` {sort_order}",
        limit_start=start,
        limit_page_length=page_length,
    )
    for row in rows:
        base._apply_approval_state(config, row)
    total = base._permission_count(config["doctype"], filters=applied, or_filters=or_filters)

    return {
        "key": key,
        "label": base._(config["label"]),
        "description": base._(config["description"]),
        "doctype": config["doctype"],
        "columns": [base._column_schema(fieldname, meta) for fieldname in list_fields],
        "filter_fields": [base._column_schema(fieldname, meta) for fieldname in list_fields],
        "rows": rows,
        "total": total,
        "start": start,
        "page_length": page_length,
        "can_create": bool(frappe.has_permission(config["doctype"], ptype="create")),
    }



def _approval_result(config, doc, message):
    base = powerapp_v3.powerapp_v2.base
    return {
        "name": doc.name,
        "docstatus": doc.docstatus,
        "approval_state": base._approval_state(doc),
        "can_request_approval": base._can_request_approval(config, doc),
        "can_approve": base._can_approve(config, doc),
        "message": message,
    }


@frappe.whitelist()
def request_approval_document(key, name):
    """Move a draft VMN record to Pending approval without changing other data."""
    from frappe.utils import cstr

    base = powerapp_v3.powerapp_v2.base

    config = base._get_config(key)
    doc = frappe.get_doc(config["doctype"], cstr(name))
    base._check_permission(config, "write", doc=doc)
    if not base._uses_approval(config) or not doc.meta.has_field(base.APPROVAL_STATE_FIELD):
        frappe.throw(base._("{0} does not use approval.").format(base._(config["label"])))
    if doc.docstatus != 0:
        frappe.throw(base._("Only draft records can be sent for approval."))
    state = base._approval_state(doc)
    if state == "Pending":
        return _approval_result(config, doc, base._("{0} is already pending approval.").format(base._(config["label"])))
    if state != "Draft":
        frappe.throw(base._("Only draft records can be sent for approval."))

    doc.set(base.APPROVAL_STATE_FIELD, "Pending")
    doc.save()
    frappe.db.commit()
    return _approval_result(config, doc, base._("{0} sent for approval.").format(base._(config["label"])))


@frappe.whitelist()
def approve_document(key, name):
    """Approve a pending VMN record and submit it."""
    from frappe.utils import cstr

    base = powerapp_v3.powerapp_v2.base

    config = base._get_config(key)
    doc = frappe.get_doc(config["doctype"], cstr(name))
    base._check_permission(config, "read", doc=doc)
    if not base._uses_approval(config) or not doc.meta.has_field(base.APPROVAL_STATE_FIELD):
        frappe.throw(base._("{0} does not use approval.").format(base._(config["label"])))
    if doc.docstatus != 0 or base._approval_state(doc) != "Pending":
        frappe.throw(base._("Only pending records can be approved."))
    if not doc.meta.is_submittable:
        frappe.throw(base._("{0} cannot be submitted.").format(base._(config["label"])))
    if not base._can_approve(config, doc):
        frappe.throw(base._("You do not have approval permission for {0}.").format(base._(config["label"])))

    if not frappe.has_permission(config["doctype"], ptype="submit", doc=doc) and base._is_vehicle_approval_user():
        doc.flags.ignore_permissions = True
    doc.set(base.APPROVAL_STATE_FIELD, "Approved")
    doc.submit()
    frappe.db.commit()
    return _approval_result(config, doc, base._("{0} approved.").format(base._(config["label"])))

@frappe.whitelist()
def delete_document(key, name):
    """Record delete karta hai — permission Frappe hi enforce karta hai.

    Submitted document seedha delete nahi hota; Frappe khud rok dega aur
    uska message frontend par dikh jayega.
    """
    from frappe.utils import cstr

    base = powerapp_v3.powerapp_v2.base

    config = base._get_config(key)
    doc = frappe.get_doc(config["doctype"], cstr(name))
    base._check_permission(config, "delete", doc=doc)

    frappe.delete_doc(config["doctype"], doc.name)
    frappe.db.commit()

    return {"name": doc.name, "message": base._("Record deleted")}
