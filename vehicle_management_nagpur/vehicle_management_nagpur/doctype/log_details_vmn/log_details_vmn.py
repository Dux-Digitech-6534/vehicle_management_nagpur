# Copyright (c) 2025, Ritesh Sharma and contributors
# For license information, please see license.txt

import re
from datetime import datetime

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, get_datetime, getdate


def _time_seconds(value):
    if not value:
        return None
    if hasattr(value, "total_seconds"):
        return int(value.total_seconds())
    if hasattr(value, "hour"):
        return int(value.hour) * 3600 + int(value.minute) * 60 + int(getattr(value, "second", 0) or 0)

    raw = str(value).strip()
    if not raw:
        return None
    raw = raw.split(".", 1)[0]
    match = re.match(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$", raw, re.I)
    if not match:
        return None

    hours = int(match.group(1))
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    period = (match.group(4) or "").upper()
    if period == "PM" and hours < 12:
        hours += 12
    if period == "AM" and hours == 12:
        hours = 0
    return hours * 3600 + minutes * 60 + seconds


def _validate_time_order(doc, start_field, end_field):
    start = _time_seconds(doc.get(start_field))
    end = _time_seconds(doc.get(end_field))
    if start is None or end is None:
        return
    if end < start:
        frappe.throw(_("For the selected date, End Time cannot be less than Start Time."))


def _align_times_to_entry_date(doc):
    entry_date = doc.get("date")
    if not entry_date:
        return

    selected_date = getdate(entry_date)
    for fieldname in ("start_time", "end_time"):
        value = doc.get(fieldname)
        if not value:
            continue
        selected_time = get_datetime(value).time().replace(microsecond=0)
        doc.set(fieldname, datetime.combine(selected_date, selected_time))


def _previous_end_reading(doc):
    vehicle_number = doc.get("vehicle_number")
    if not vehicle_number:
        return None

    filters = {"vehicle_number": vehicle_number}
    if doc.name and not doc.is_new():
        filters["name"] = ["!=", doc.name]

    rows = frappe.get_all(
        "Log Details VMN",
        filters=filters,
        fields=["end_reading"],
        order_by="creation desc",
        limit_page_length=1,
    )
    if not rows:
        return None
    value = rows[0].get("end_reading")
    return value if value not in (None, "") else None


def _set_and_validate_readings(doc):
    previous_end = _previous_end_reading(doc)
    if (not doc.name or doc.is_new()) and previous_end is not None:
        doc.start_reading = previous_end

    start = doc.get("start_reading")
    end = doc.get("end_reading")
    if start in (None, "") or end in (None, ""):
        return

    start_value = flt(start)
    end_value = flt(end)
    if end_value < start_value:
        frappe.throw(_("End Reading cannot be less than Start Reading."))

    doc.ld_distance = end_value - start_value


class LogDetailsVMN(Document):
    def validate(self):
        _set_and_validate_readings(self)
        _align_times_to_entry_date(self)
        _validate_time_order(self, "start_time", "end_time")
