// Copyright (c) 2025, Ritesh Sharma and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Log Details VMN", {
// 	refresh(frm) {

// 	},
// });

// // Calculate Distance
// frappe.ui.form.on("Log Details VMN", {
//     // When Start Reading changes
//     start_reading(frm) {
//         frm.trigger("calculate_distance");
//     },
//     // When End Reading changes
//     end_reading(frm) {
//         frm.trigger("calculate_distance");
//     },
//     // Custom function to calculate distance
//     calculate_distance(frm) {
//         let start = frm.doc.start_reading || 0;
//         let end = frm.doc.end_reading || 0;

//         if (end >= start) {
//             frm.set_value("ld_distance", end - start);
//         } else if (end && start) {
//             frappe.msgprint("⚠️ End Reading must be greater than Start Reading");
//             frm.set_value("ld_distance", 0);
//         }
//     }
// });


// // Dependent Field Logic - Type of Vehicle
// frappe.ui.form.on("Log Details VMN", {
//     onload(frm) {
//         frm.set_query("vehicle_number", () => {
//             return {
//                 filters: {
//                     vd_type_of_vehicle: frm.doc.ld_type_of_vehicle
//                 }
//             };
//         });
//     }
// });


// // Dependent Field Logic - Vehicle Loaction 
// frappe.ui.form.on("Log Details VMN", {
//     onload(frm) {
//         frm.set_query("ld_select_campus", () => {
//             return {
//                 filters: {
//                     cd_location: frm.doc.ld_vehicle_location
//                 }
//             };
//         });
//     }
// });


// //Auto Fill logic.
// frappe.ui.form.on("Log Details VMN", {
//     vehicle_number: function(frm) {
//         if (frm.doc.vehicle_number) {
//             frappe.db.get_list("Log Details VMN", {
//                 filters: {
//                     vehicle_number: frm.doc.vehicle_number
//                 },
//                 fields: ["end_reading"],
//                 order_by: "creation desc",
//                 limit: 1
//             }).then(records => {
//                 if (records && records.length > 0 && records[0].end_reading) {
//                     frm.set_value("start_reading", records[0].end_reading);
//                     frappe.msgprint(`📘 Previous End Reading found: ${records[0].end_reading}. Auto-filled as Start Reading.`);
//                 } else {
//                     frappe.msgprint("ℹ️ No previous entry found for this vehicle.");
//                 }
//             });
//         }
//     }
// });


frappe.ui.form.on("Log Details VMN", {

    // ==========================
    // 1️⃣ Calculate Distance Logic
    // ==========================
    start_reading(frm) {
        frm.trigger("calculate_distance");
    },
    end_reading(frm) {
        frm.trigger("calculate_distance");
    },
    calculate_distance(frm) {
        let start = frm.doc.start_reading || 0;
        let end = frm.doc.end_reading || 0;

        if (end >= start) {
            frm.set_value("ld_distance", end - start);
        } else if (end && start) {
            //                      frappe.msgprint("⚠️ End Reading must be greater than Start Reading");
            frm.set_value("ld_distance", 0);
        }
    },

    // ==========================
    // 2️⃣ Auto-Fill Start Reading based on Previous Log
    // ==========================
    vehicle_number(frm) {
        if (frm.doc.vehicle_number) {
            frappe.db.get_list("Log Details VMN", {
                filters: {
                    vehicle_number: frm.doc.vehicle_number
                },
                fields: ["end_reading"],
                order_by: "creation desc",
                limit: 1
            }).then(records => {
                if (records && records.length > 0 && records[0].end_reading) {
                    frm.set_value("start_reading", records[0].end_reading);
                    //frappe.msgprint(`📘 Previous End Reading found: ${records[0].end_reading}. Auto-filled as Start Reading.`);
                } else {
                    //frappe.msgprint("ℹ️ No previous entry found for this vehicle.");
                }
            });
        }
    },

    // ==========================
    // 3️⃣ Dependent Field Logic - Vehicle Number Filter
    // ==========================
    onload(frm) {
        // Filter Vehicle Number by Type of Vehicle
        frm.set_query("vehicle_number", () => {
            return {
                filters: {
                    vd_type_of_vehicle: frm.doc.ld_type_of_vehicle
                }
            };
        });

        // Filter Campus by Vehicle Location
        frm.set_query("ld_select_campus", () => {
            return {
                filters: {
                    cd_location: frm.doc.ld_vehicle_location
                }
            };
        });
    },

    // ==========================
    // 4️⃣ Auto-Fetch Campus Name from Location (Optional Enhancement)
    // ==========================
    ld_vehicle_location(frm) {
        if (frm.doc.ld_vehicle_location) {
            frappe.db.get_value(
                "Campus Details VMN",
                { cd_location: frm.doc.ld_vehicle_location },
                ["cd_campus_name"]
            ).then((r) => {
                if (r && r.message && r.message.cd_campus_name) {
                    frm.set_value("ld_select_campus", r.message.cd_campus_name);
                } else {
                    frappe.msgprint("⚠️ No campus found for this location.");
                    frm.set_value("ld_select_campus", "");
                }
            });
        } else {
            frm.set_value("ld_select_campus", "");
        }
    }

});
