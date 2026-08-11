// Copyright (c) 2025, Ritesh Sharma and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Diesel Details VMN", {
// 	refresh(frm) {

// 	},
// });


// // Dependent Field Logic - Type of Vehicle
// frappe.ui.form.on("Diesel Details VMN", {
//     onload(frm) {
//         frm.set_query("dd_vehicle_number", () => {
//             return {
//                 filters: {
//                     vd_type_of_vehicle: frm.doc.dd_type_of_vehicle
//                 }
//             };
//         });
//     }
// });

// // Dependent Field Logic - Vehicle Loaction 
// frappe.ui.form.on("Diesel Details VMN", {
//     onload(frm) {
//         frm.set_query("dd_select_campus", () => {
//             return {
//                 filters: {
//                     cd_location: frm.doc.dd_vehicle_location
//                 }
//             };
//         });
//     }
// });

// // Amount Calculation
// frappe.ui.form.on('Diesel Details VMN', {
//     dd_quantity: function(frm) {
//         frm.trigger('calculate_amount');
//     },
//     dd_rate: function(frm) {
//         frm.trigger('calculate_amount');
//     },
//     calculate_amount: function(frm) {
//         let qty = frm.doc.dd_quantity || 0;
//         let rate = frm.doc.dd_rate || 0;
//         frm.set_value('dd_amount', qty * rate);
//     }
// });

// //Average Logic
// frappe.ui.form.on("Diesel Details VMN", {
//     // Trigger whenever related fields change
//     dd_previous_fuel_fill_up_reading(frm) {
//         frm.trigger("calculate_average");
//     },
//     dd_fuel_fill_up_reading(frm) {
//         frm.trigger("calculate_average");
//     },
//     dd_quantity(frm) {
//         frm.trigger("calculate_average");
//     },

//     // Custom calculation logic
//     calculate_average(frm) {
//         let prev = frm.doc.dd_previous_fuel_fill_up_reading || 0;
//         let current = frm.doc.dd_fuel_fill_up_reading || 0;
//         let qty = frm.doc.dd_quantity || 0;

//         if (qty <= 0) {
//             frm.set_value("dd_average", 0);
//             return;
//         }

//         let avg = 0;

//         // Case 1: previous reading exists
//         if (prev > 0) {
//             avg = (prev - current) / qty;
//         }
//         // Case 2: no previous reading
//         else {
//             avg = current / qty;
//         }

//         frm.set_value("dd_average", avg);
//     }
// });


// //Auto Fetch Previous Reading
// frappe.ui.form.on('Diesel Details VMN', {
//     dd_vehicle_number: function(frm) {
//         if (frm.doc.dd_vehicle_number) {
//             frappe.db.get_value(
//                 'Diesel Details VMN',
//                 { 'dd_vehicle_number': frm.doc.dd_vehicle_number },
//                 'dd_fuel_fill_up_reading',
//                 (r) => {
//                     if (r && r.dd_fuel_fill_up_reading) {
//                         frm.set_value('dd_previous_fuel_fill_up_reading', r.dd_fuel_fill_up_reading);
//                     }
//                 },
//                 null,
//                 'creation desc'
//             );
//         }
//     }
// });


frappe.ui.form.on("Diesel Details VMN", {
    // =====================================================
    // 🔹 ON LOAD — Set dependent filters
    // =====================================================
    onload(frm) {
        // Filter Vehicle Number based on Type of Vehicle
        frm.set_query("dd_vehicle_number", () => {
            return {
                filters: {
                    vd_type_of_vehicle: frm.doc.dd_type_of_vehicle
                }
            };
        });

        // Filter Campus based on Vehicle Location
        frm.set_query("dd_select_campus", () => {
            return {
                filters: {
                    cd_location: frm.doc.dd_vehicle_location
                }
            };
        });
    },

    // =====================================================
    // 🔹 Auto Fetch Previous Reading & Vehicle Name
    // =====================================================
    dd_vehicle_number(frm) {
        if (frm.doc.dd_vehicle_number) {
            // Fetch previous reading
            frappe.db.get_value(
                "Diesel Details VMN",
                { "dd_vehicle_number": frm.doc.dd_vehicle_number },
                "dd_fuel_fill_up_reading",
                (r) => {
                    if (r && r.dd_fuel_fill_up_reading) {
                        frm.set_value("dd_previous_fuel_fill_up_reading", r.dd_fuel_fill_up_reading);
                    }
                },
                null,
                "creation desc"
            );

            // Auto fetch vehicle name
            frappe.db.get_value(
                "Vehicle Details VMN",
                frm.doc.dd_vehicle_number,
                "vd_vehicle_name",
                (r) => {
                    if (r && r.vd_vehicle_name) {
                        frm.set_value("dd_vehicle_name", r.vd_vehicle_name);
                    }
                }
            );
        }
    },

    // =====================================================
    // 🔹 Auto Calculate Amount (Quantity × Rate)
    // =====================================================
    dd_quantity(frm) {
        frm.trigger("calculate_amount");
        frm.trigger("calculate_average");
    },

    dd_rate(frm) {
        frm.trigger("calculate_amount");
    },

    calculate_amount(frm) {
        let qty = frm.doc.dd_quantity || 0;
        let rate = frm.doc.dd_rate || 0;
        let total = qty * rate;
        frm.set_value("dd_amount", Math.round(total * 100) / 100);
    },

    // =====================================================
    // 🔹 Auto Fetch Previous Reading + Last Quantity
    // =====================================================
    dd_vehicle_number(frm) {
        if (frm.doc.dd_vehicle_number) {

            // Fetch previous reading + quantity from last entry
            frappe.db.get_list("Diesel Details VMN", {
                filters: { dd_vehicle_number: frm.doc.dd_vehicle_number },
                fields: ["dd_fuel_fill_up_reading", "dd_quantity"],
                order_by: "creation desc",
                limit: 1
            }).then(r => {
                if (r && r.length > 0) {
                    frm.set_value("dd_previous_fuel_fill_up_reading", r[0].dd_fuel_fill_up_reading);
                    frm.set_value("dd_last_quantity", r[0].dd_quantity);   // NEW FIELD VALUE
                }
            });

            // Auto fetch vehicle name
            frappe.db.get_value(
                "Vehicle Details VMN",
                frm.doc.dd_vehicle_number,
                "vd_vehicle_name",
                (r) => {
                    if (r && r.vd_vehicle_name) {
                        frm.set_value("dd_vehicle_name", r.vd_vehicle_name);
                    }
                }
            );
        }
    },

    // =====================================================
    // 🔹 Average Calculation (Using LAST entry quantity)
    // =====================================================
    dd_fuel_fill_up_reading(frm) {

        let prev = frm.doc.dd_previous_fuel_fill_up_reading || 0;
        let current = frm.doc.dd_fuel_fill_up_reading || 0;

        // 🔥 Show message immediately when user enters value
        if (current < prev) {
            frappe.msgprint("⚠️ Fuel Fill-up Reading cannot be less than Previous Reading!");
            frm.set_value("dd_fuel_fill_up_reading", "");  // Clear wrong value
            return;
        }

        frm.trigger("calculate_average");
    },

    dd_previous_fuel_fill_up_reading(frm) {
        frm.trigger("calculate_average");
    },

    calculate_average(frm) {
        let prev = frm.doc.dd_previous_fuel_fill_up_reading || 0;
        let current = frm.doc.dd_fuel_fill_up_reading || 0;
        let last_qty = frm.doc.dd_last_quantity || 0;  // USE LAST ENTRY QUANTITY

        if (last_qty <= 0) {
            frm.set_value("dd_average", 0);
            return;
        }

        let avg = (current - prev) / last_qty;
        frm.set_value("dd_average", Math.round(avg * 100) / 100);
    }


});
    