frappe.listview_settings['DG Details VMN'] = {
    onload(listview) {

        // =========================
        // 1️⃣ Custom Dropdown Filter padding: var(--input-padding);
        // =========================
        setTimeout(() => {
            if (!listview.page.custom_status_dropdown) {
                const id_field = listview.page.fields_dict.name;
                const $id_input = id_field.$wrapper.find('input');

                const $wrapper = $('<div style="display:inline-flex; align-items:center; margin-left:10px;"></div>');
                const $select = $(`
                                    <select style="
                                        width: 140px;
                                        padding-left: 8px; 
                                        text-align: left;  
                                        height: var(--input-height);
                                        
                                        font-size: var(--text-base);
                                        font-weight: var(--weight-regular);
                                        letter-spacing: .02em;
                                        border: none;
                                        border-radius: var(--border-radius-sm);
                                        background-color: var(--control-bg);
                                        color: var(--text-color);
                                        outline: none;
                                        position: relative;
                                        margin-right: 10px;
                                        margin-left: -10px;
                                        margin-bottom: 2px;

                                        -webkit-appearance: none;  /* remove default arrow */
                                        -moz-appearance: none;
                                        appearance: none;
                                        background-image: url('/mnt/data/b55d5297-f8cc-4745-8e75-0b1f7041cadc.png'); /* your down arrow */
                                        background-repeat: no-repeat;
                                        background-position: right 15px center; /* move arrow 15px left */
                                        background-size: 12px; /* adjust arrow size if needed */
                                    ">
                                        <option value="" selected>Status</option>
                                        <option value="Draft">Draft</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Approved">Approved</option>
                                    </select>
                                `);


                $select.appendTo($wrapper);
                $wrapper.insertAfter($id_input.closest('.form-group'));
                listview.page.custom_status_dropdown = $select;

                const fieldname = 'workflow_state';

                $select.on('change', function () {
                    const selected = $(this).val();
                    listview.filter_area.remove('DG Details VMN', fieldname);
                    if (selected) {
                        listview.filter_area.add([
                            ['DG Details VMN', fieldname, '=', selected]
                        ]);
                    }
                    listview.refresh();
                });
            }
        }, 500);

        
    }
}    