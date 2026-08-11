// Copyright (c) 2025, Ritesh Sharma and contributors
// For license information, please see license.txt

// frappe.ui.form.on("DG Details VMN", {
// 	refresh(frm) {




// frappe.ui.form.on("DG Details VMN", {
//     dg_start_reading(frm) {
//         calculate_total_dg_unit(frm);
//     },
//     dg_end_reading(frm) {
//         calculate_total_dg_unit(frm);
//     },
//     dg_start_time(frm) {
//         calculate_total_hours(frm);
//     },
//     dg_end_time(frm) {
//         calculate_total_hours(frm);
//     }
// });

// // --- Function to Calculate Total DG Unit ---
// function calculate_total_dg_unit(frm) {
//     if (frm.doc.dg_end_reading && frm.doc.dg_start_reading) {
//         let total_unit = frm.doc.dg_end_reading - frm.doc.dg_start_reading;
//         frm.set_value("dg_total_dg_unit", total_unit);
//     } else {
//         frm.set_value("dg_total_dg_unit", 0);
//     }
// }

// // --- Function to Calculate Total Hours ---
// function calculate_total_hours(frm) {
//     if (frm.doc.dg_start_time && frm.doc.dg_end_time) {
//         // Convert time string (HH:MM:SS) to Date objects
//         let start = moment(frm.doc.dg_start_time, "HH:mm:ss");
//         let end = moment(frm.doc.dg_end_time, "HH:mm:ss");

//         // Handle overnight DG operation (end time past midnight)
//         if (end.isBefore(start)) {
//             end.add(1, "day");
//         }

//         // Calculate difference in hours (with 2 decimal places)
//         let duration = moment.duration(end.diff(start));
//         let total_hours = duration.asHours().toFixed(2);

//         frm.set_value("dg_total_hours", total_hours);
//     } else {
//         frm.set_value("dg_total_hours", 0);
//     }
// }



frappe.ui.form.on("DG Details VMN", {
    dg_start_reading(frm) {
        calculate_total_dg_unit(frm);
    },
    dg_end_reading(frm) {
        calculate_total_dg_unit(frm);
    },
    dg_start_time(frm) {
        calculate_total_hours(frm);
    },
    dg_end_time(frm) {
        calculate_total_hours(frm);
    },
    dg_diesel_consumption(frm) {
        calculate_total_amount(frm);
    },
    dg_diesel_rateltr(frm) {
        calculate_total_amount(frm);
    }
});

// --- Function to Calculate Total DG Unit ---
function calculate_total_dg_unit(frm) {
    if (frm.doc.dg_end_reading && frm.doc.dg_start_reading) {
        let total_unit = frm.doc.dg_end_reading - frm.doc.dg_start_reading;
        frm.set_value("dg_total_dg_unit", total_unit);
    } else {
        frm.set_value("dg_total_dg_unit", 0);
    }
}

// --- Function to Calculate Total Hours (X Hours and Y Minutes) ---
function calculate_total_hours(frm) {
    if (frm.doc.dg_start_time && frm.doc.dg_end_time) {
        let start = moment(frm.doc.dg_start_time, "HH:mm:ss");
        let end = moment(frm.doc.dg_end_time, "HH:mm:ss");

        if (end.isBefore(start)) {
            end.add(1, "day"); // Handle next-day scenario
        }

        let duration = moment.duration(end.diff(start));
        let hours = Math.floor(duration.asHours());
        let minutes = Math.floor(duration.asMinutes() % 60);

        let formatted_time = `${hours} Hours and ${minutes} Minutes`;

        frm.set_value("dg_total_hours", formatted_time);
    } else {
        frm.set_value("dg_total_hours", "");
    }
}

// --- Function to Calculate Total Amount ---
function calculate_total_amount(frm) {
    if (frm.doc.dg_diesel_consumption && frm.doc.dg_diesel_rateltr) {
        let total_amount = frm.doc.dg_diesel_consumption * frm.doc.dg_diesel_rateltr;
        frm.set_value("dg_total_amount", total_amount);
    } else {
        frm.set_value("dg_total_amount", 0);
    }
}



// frappe.ui.form.on("DG Details VMN", {
//     dgd_dg_campus(frm) {
//         if (frm.doc.dgd_dg_campus) {

//             frappe.db.get_value("Diesel Generator Information VMN",
//                 {
//                     diesel_generator_location: frm.doc.dgd_dg_campus
//                 },
//                 ["diesel_generator_campus"]
//             ).then(r => {
//                 if (r && r.diesel_generator_campus) {
//                     frm.set_value("dg_location", r.diesel_generator_campus);
//                 } else {
//                     frm.set_value("dg_location", "");
//                     frappe.msgprint("No matching Diesel Generator Campus found!");
//                 }
//             });
//         }
//     }
// });


