// Copyright (c) 2025, Ritesh Sharma and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Vehicle Details VMN", {
// 	refresh(frm) {

// 	},
// });


frappe.ui.form.on('Vehicle Details VMN', {
    vd_type_of_vehicle: update_vehicle_name,
    vd_model_name: update_vehicle_name,
    vd_vehicle_number: update_vehicle_name,
    // also on load so when opening existing doc it's correct
    refresh: function(frm) {
        update_vehicle_name(frm);
    }
});

function update_vehicle_name(frm) {
    const vtype = (frm.doc.vd_type_of_vehicle || "").toString().trim();
    const model = (frm.doc.vd_model_name || "").toString().trim();
    const number = (frm.doc.vd_vehicle_number || "").toString().trim();

    const parts = [vtype, model, number].filter(p => p);
    const full = parts.join(" - ");

    // If you made vd_vehicle_name read-only, use set_value anyway
    frm.set_value('vd_vehicle_name', full);
}


frappe.ui.form.on("Vehicle Details VMN", {
    vd_location(frm) {
        if (frm.doc.vd_location) {
            frm.set_value("vd_location", frm.doc.vd_location.toUpperCase());
        }
    }
});
