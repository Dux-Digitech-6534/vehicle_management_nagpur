// Copyright (c) 2025, Ritesh Sharma and contributors
// For license information, please see license.txt



frappe.ui.form.on("RTO Details VMN", {

// =====================================================
// 1️⃣ ONLOAD – Set Filters for Linked Fields
// =====================================================
onload(frm) {

    // Filter Vehicle Number based on Type of Vehicle
    frm.set_query("rto_vehicle_number", () => {
        return {
            filters: {
                vd_type_of_vehicle: frm.doc.rto_type_of_vehicle
            }
        };
    });

    // Filter Campus based on Location
    frm.set_query("rto_select_campus", () => {
        return {
            filters: {
                cd_location: frm.doc.rto_vehicle_location
            }
        };
    });
}


});



