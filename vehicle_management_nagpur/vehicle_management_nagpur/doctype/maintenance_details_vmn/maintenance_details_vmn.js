// Copyright (c) 2025, Ritesh Sharma and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Maintenance Details VMN", {
// 	refresh(frm) {

// 	},
// });


// // Dependent Field Logic - Type of Vehicle
// frappe.ui.form.on("Maintenance Details VMN", {
//     onload(frm) {
//         frm.set_query("md_vehicle_number", () => {
//             return {
//                 filters: {
//                     vd_type_of_vehicle: frm.doc.md_type_of_vehicle
//                 }
//             };
//         });
//     }
// });

// // Dependent Field Logic - Vehicle Loaction 
// frappe.ui.form.on("Maintenance Details VMN", {
//     onload(frm) {
//         frm.set_query("md_select_campus", () => {
//             return {
//                 filters: {
//                     cd_location: frm.doc.md_vehicle_location
//                 }
//             };
//         });
//     }
// });



// frappe.ui.form.on("Maintenance Details VMN", {
//     refresh(frm) {
//         // Hide Save button initially if no amount
//         toggle_save_button(frm);

//         // Add "Next" button beside Save
//         frm.page.remove_inner_button("Next");
//         frm.add_custom_button("Next", () => {
//             open_work_dialog(frm);
//         });
//     },

//     md_total_repairingamount(frm) {
//         // Whenever total amount changes, recheck
//         toggle_save_button(frm);
//     }
// });

// // 🔹 Function: Show/Hide Save button based on field value
// function toggle_save_button(frm) {
//     const save_btn = frm.page.btn_primary;
//     if (!frm.doc.md_total_repairingamount || frm.doc.md_total_repairingamount === 0) {
//         $(save_btn).hide();
//     } else {
//         $(save_btn).show();
//     }
// }

// function open_work_dialog(frm) {
//     let d = new frappe.ui.Dialog({
//         title: "Add Work Details",
//         size: "large",
//         fields: [
//             {
//                 fieldname: "header_row",
//                 fieldtype: "HTML",
//                 options: `
//                     <div style="
//                         display: flex; 
//                         justify-content: space-between; 
//                         align-items: center; 
//                         margin-bottom: 5px;">
//                         <div style="font-weight: 600; font-size: 14px;">Repair Work Details</div>
//                         <div>
//                             <button class="btn btn-sm btn-primary" id="add-work-btn">+ Add Work</button>
//                             <button class="btn btn-sm btn-secondary" id="reset-btn">Reset</button>
//                         </div>
//                     </div>
//                 `
//             },
//             {
//                 fieldname: "work_table",
//                 fieldtype: "Table",
//                 cannot_add_rows: true,
//                 in_place_edit: true,
//                 data: [],
//                 get_data: () => d.fields_dict.work_table.df.data,
//                 fields: [
//                     {
//                         fieldname: "repair_work",
//                         label: "Name of Repair Work",
//                         fieldtype: "Data",
//                         in_list_view: true,
//                         reqd: 1
//                     },
//                     {
//                         fieldname: "amount",
//                         label: "Amount",
//                         fieldtype: "Currency",
//                         in_list_view: true,
//                         default: 0
//                     }
//                 ]
//             }
//         ],
//         primary_action_label: "OK",
//         primary_action(values) {
//             // Calculate total
//             let total = 0;
//             (d.fields_dict.work_table.df.data || []).forEach(row => {
//                 total += flt(row.amount || 0);
//             });

//             // Set total in main form
//             frm.set_value("md_total_repairingamount", total);

//             // Recheck save button visibility
//             toggle_save_button(frm);

//             d.hide(); // Close dialog
//         }
//     });

//     // ✅ Add Row & Reset logic
//     d.$wrapper.on("click", "#add-work-btn", function () {
//         let table = d.fields_dict.work_table.df.data || [];
//         table.push({ repair_work: "", amount: 0 });
//         d.fields_dict.work_table.df.data = table;
//         d.fields_dict.work_table.refresh();
//         update_footer_total(d, frm);
//     });

//     d.$wrapper.on("click", "#reset-btn", function () {
//         d.fields_dict.work_table.df.data = [];
//         d.fields_dict.work_table.refresh();
//         update_footer_total(d, frm);
//     });

//     // ✅ Live amount change
//     d.fields_dict.work_table.grid.wrapper.on("change", "input[data-fieldname='amount']", function () {
//         update_footer_total(d, frm);
//     });

//     // ✅ Footer total display
//     const footer = $(`
//         <div style="text-align:right; font-weight:600; margin-top:8px; border-top:1px solid #ccc; padding-top:5px;">
//             Total Amount: <span id="footer-total">0.00</span>
//         </div>
//     `);
//     d.$body.append(footer);

//     d.show();
// }

// function update_footer_total(d, frm) {
//     let total = 0;
//     (d.fields_dict.work_table.df.data || []).forEach(row => {
//         total += flt(row.amount || 0);
//     });
//     d.$wrapper.find("#footer-total").text(total.toFixed(2));
//     frm.set_value("md_total_repairingamount", total);
//     toggle_save_button(frm);
// }



frappe.ui.form.on("Maintenance Details VMN", {
    onload(frm) {
        // 🔹 Filter Vehicle Number based on Vehicle Type
        frm.set_query("md_vehicle_number", () => ({
            filters: {
                vd_type_of_vehicle: frm.doc.md_type_of_vehicle
            }
        }));

        // 🔹 Filter Campus based on Vehicle Location
        frm.set_query("md_select_campus", () => ({
            filters: {
                cd_location: frm.doc.md_vehicle_location
            }
        }));
    },

    refresh(frm) {
        // Hide Save button initially if no total amount
        toggle_save_button(frm);

        // Add custom "Next" button beside Save
        frm.page.remove_inner_button("Next");
        frm.add_custom_button("Next", () => {
            open_work_dialog(frm);
        });
    },

    md_total_repairingamount(frm) {
        // Whenever total amount changes, recheck
        toggle_save_button(frm);
    }
});


// 🔸 Function: Show/Hide Save button based on field value
function toggle_save_button(frm) {
    const save_btn = frm.page.btn_primary;
    if (!frm.doc.md_total_repairingamount || frm.doc.md_total_repairingamount === 0) {
        $(save_btn).hide();
    } else {
        $(save_btn).show();
    }
}


// 🔸 Function: Open the Repair Work Dialog
function open_work_dialog(frm) {
    let d = new frappe.ui.Dialog({
        title: "Add Work Details",
        size: "large",
        fields: [
            {
                fieldname: "header_row",
                fieldtype: "HTML",
                options: `
                    <div style="
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center; 
                        margin-bottom: 8px;">
                        <div style="font-weight: 600; font-size: 14px;">
                            Repair Work Details
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-sm btn-primary" id="add-work-btn">+ Add Work</button>
                            <button class="btn btn-sm btn-secondary" id="reset-btn">Reset</button>
                        </div>
                    </div>
                `
            },
            {
                fieldname: "work_table",
                fieldtype: "Table",
                cannot_add_rows: true,
                in_place_edit: true,
                data: [],
                get_data: () => d.fields_dict.work_table.df.data,
                fields: [
                    {
                        fieldname: "repair_work",
                        label: "Name of Repair Work",
                        fieldtype: "Data",
                        in_list_view: true,
                        reqd: 1
                    },
                    {
                        fieldname: "amount",
                        label: "Amount",
                        fieldtype: "Currency",
                        in_list_view: true,
                        default: 0
                    }
                ]
            }
        ],
        primary_action_label: "OK",
        primary_action(values) {

            // Calculate total
            let total = 0;
            let table_data = d.fields_dict.work_table.df.data || [];

            table_data.forEach(row => {
                total += flt(row.amount || 0);
            });

            // Set total in main form
            frm.set_value("md_total_repairingamount", total);

            // ⭐ Extract only work names (comma separated)
            let work_names = table_data.map(row => row.repair_work).join(", ");

            // Save into field
            frm.set_value("md_work_details", work_names);

            // Recheck save button visibility
            toggle_save_button(frm);

            d.hide(); // Close dialog
        }
    });

    // ✅ Add Row
    d.$wrapper.on("click", "#add-work-btn", function () {
        let table = d.fields_dict.work_table.df.data || [];
        table.push({ repair_work: "", amount: 0 });
        d.fields_dict.work_table.df.data = table;
        d.fields_dict.work_table.refresh();
        update_footer_total(d, frm);
    });

    // ✅ Reset Rows
    d.$wrapper.on("click", "#reset-btn", function () {
        d.fields_dict.work_table.df.data = [];
        d.fields_dict.work_table.refresh();
        update_footer_total(d, frm);
    });

    // ✅ Live amount update
    d.fields_dict.work_table.grid.wrapper.on("change", "input[data-fieldname='amount']", function () {
        update_footer_total(d, frm);
    });

    // ✅ Footer total display
    const footer = $(`
        <div style="text-align:right; font-weight:600; margin-top:8px; border-top:1px solid #ccc; padding-top:5px;">
            Total Amount: <span id="footer-total">0.00</span>
        </div>
    `);
    d.$body.append(footer);

    d.show();
}


// 🔸 Function: Update Footer Total & Form Field
function update_footer_total(d, frm) {
    let total = 0;
    (d.fields_dict.work_table.df.data || []).forEach(row => {
        total += flt(row.amount || 0);
    });
    d.$wrapper.find("#footer-total").text(total.toFixed(2));
    frm.set_value("md_total_repairingamount", total);
    toggle_save_button(frm);
}
