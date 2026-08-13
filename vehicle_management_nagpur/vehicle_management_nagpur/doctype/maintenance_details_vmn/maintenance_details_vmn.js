// Copyright (c) 2025, Ritesh Sharma and contributors
// For license information, please see license.txt

frappe.ui.form.on("Maintenance Details VMN", {
	onload(frm) {
		frm.set_query("md_vehicle_number", () => ({
			filters: {
				vd_type_of_vehicle: frm.doc.md_type_of_vehicle,
			},
		}));

		frm.set_query("md_select_campus", () => ({
			filters: {
				cd_location: frm.doc.md_vehicle_location,
			},
		}));
	},

	refresh(frm) {
		// Work Details now uses the normal Frappe child table and Save action.
		frm.remove_custom_button(__("Next"));
	},

	validate(frm) {
		sync_work_details(frm);
	},

	md_work_details_table_remove(frm) {
		sync_work_details(frm);
	},
});

frappe.ui.form.on("Maintenance Work Detail VMN", {
	mwd_repair_work(frm) {
		sync_work_details(frm);
	},

	mwd_amount(frm) {
		sync_work_details(frm);
	},
});

function sync_work_details(frm) {
	const rows = (frm.doc.md_work_details_table || []).map((row) => ({
		work: String(row.mwd_repair_work || "").trim(),
		amount: flt(row.mwd_amount || 0),
	}));
	const total = rows.reduce((sum, row) => sum + row.amount, 0);

	frm.set_value("md_total_repairingamount", total);
	frm.set_value("md_work_details", JSON.stringify(rows));
}
