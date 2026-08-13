# Copyright (c) 2025, Ritesh Sharma and contributors
# For license information, please see license.txt

import re

import frappe
from frappe import _
from frappe.model.document import Document


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


class LogDetailsVMN(Document):
    def validate(self):
        _validate_time_order(self, "start_time", "end_time")
