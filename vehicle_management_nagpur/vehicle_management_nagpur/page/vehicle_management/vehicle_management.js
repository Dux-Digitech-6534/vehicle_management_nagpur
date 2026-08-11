frappe.pages["vehicle-management"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Vehicle Management Nagpur"),
		single_column: true,
	});

	wrapper.vehicle_management_portal = new VehicleManagementPortal(page, wrapper);
};

frappe.pages["vehicle-management"].on_page_show = function (wrapper) {
	if (wrapper.vehicle_management_portal) {
		wrapper.vehicle_management_portal.on_show();
	}
};

class VehicleManagementPortal {
	constructor(page, wrapper) {
		this.page = page;
		this.wrapper = wrapper;
		this.$wrapper = $(wrapper);
		this.method_root =
			"vehicle_management_nagpur.vehicle_management_nagpur.page.vehicle_management.vehicle_management_powerapp_v4";
		this.theme_key = "vehicle-management-nagpur-theme";
		this.page_length = 20;
		this.bootstrap = null;
		this.menu_items = {};
		this.active_key = "dashboard";
		this.current_view = { type: "dashboard" };
		this.controls = {};
		this.search_timer = null;

		this.make_shell();
		this.bind_shell_events();
		this.apply_theme(localStorage.getItem(this.theme_key) === "dark" ? "dark" : "light");
		this.load_portal();
	}

	on_show() {
		this.force_full_width();
		if (this.bootstrap && this.current_view.type === "dashboard") {
			this.show_dashboard(false);
		}
	}

	make_shell() {
		this.page.main.empty();
		this.$wrapper.addClass("vmnp-page-host");
		this.$wrapper.closest(".page-container").addClass("vmnp-page-host");

		this.page.main.append(`
			<div class="vmnp-root" data-theme="light">
				<div class="vmnp-mobile-backdrop" data-close-sidebar></div>
				<aside class="vmnp-sidebar" aria-label="${__("Vehicle Management navigation")}">
					<div class="vmnp-brand">
						<div class="vmnp-brand-copy">
							<strong>${__("Vehicle Management Nagpur")}</strong>
							<span>${__("Nagpur Fleet Desk")}</span>
						</div>
						<button class="vmnp-icon-button vmnp-sidebar-close" type="button" data-close-sidebar
							title="${__("Close navigation")}">${this.icon("close")}</button>
					</div>

					<div class="vmnp-nav-search">
						${this.icon("search")}
						<input type="search" placeholder="${__("Search modules")}" aria-label="${__(
							"Search modules"
						)}" data-menu-search>
					</div>

					<nav class="vmnp-navigation" data-navigation>
						<div class="vmnp-nav-skeleton"></div>
						<div class="vmnp-nav-skeleton"></div>
						<div class="vmnp-nav-skeleton short"></div>
					</nav>

					<div class="vmnp-sidebar-footer">
						<div class="vmnp-user">
							<span class="vmnp-user-avatar" data-user-initials>VM</span>
							<span>
								<strong data-user-name>${__("Vehicle User")}</strong>
								<small>${__("Signed in")}</small>
							</span>
							<button class="vmnp-logout-button" type="button" data-logout
								title="${__("Log out")}" aria-label="${__("Log out")}">${this.icon("arrow-right")}</button>
						</div>
					</div>
				</aside>

				<main class="vmnp-main">
					<header class="vmnp-topbar">
						<div class="vmnp-topbar-start">
							<button class="vmnp-icon-button vmnp-menu-button" type="button" data-open-sidebar
								title="${__("Open navigation")}">${this.icon("menu")}</button>
							<div class="vmnp-route">
								<span>${__("Vehicle Management")}</span>
								<i class="vmnp-route-sep" aria-hidden="true"></i>
								<strong data-route-title>${__("Dashboard")}</strong>
							</div>
						</div>
						<div class="vmnp-topbar-actions">
							<button class="vmnp-icon-button" type="button" data-page-refresh
								title="${__("Refresh")}">${this.icon("refresh")}</button>
							<button class="vmnp-theme-switch vmnp-theme-switch-top" type="button" data-theme-toggle>
								<span data-theme-icon>${this.icon("moon")}</span>
								<span data-theme-label>${__("Dark")}</span>
							</button>
						</div>
					</header>
					<section class="vmnp-view" data-view aria-live="polite">
						${this.loading_template(__("Preparing Vehicle Management…"))}
					</section>
				</main>
			</div>
		`);

		this.$root = this.page.main.find(".vmnp-root");
		this.$view = this.$root.find("[data-view]");
		this.force_full_width();
		window.setTimeout(() => this.force_full_width(), 100);
	}

	force_full_width() {
		this.$wrapper.addClass("vmnp-page-host");
		this.$wrapper.closest(".page-container").addClass("vmnp-page-host");
		this.page.main
			.closest(".layout-main-section")
			.addClass("vmnp-full-width-host")
			.css({ maxWidth: "none", padding: 0 });
	}

	bind_shell_events() {
		this.$root.on("click.vmnp", "[data-open-sidebar]", () => {
			this.$root.addClass("sidebar-open");
		});
		this.$root.on("click.vmnp", "[data-close-sidebar]", () => {
			this.$root.removeClass("sidebar-open");
		});
		this.$root.on("click.vmnp", "[data-theme-toggle]", () => {
			this.apply_theme(this.$root.attr("data-theme") === "dark" ? "light" : "dark", true);
		});
		this.$root.on("click.vmnp", "[data-page-refresh]", () => this.refresh_current_view());
		this.$root.on("input.vmnp", "[data-menu-search]", (event) => {
			this.filter_navigation($(event.currentTarget).val());
		});
		this.$root.on("click.vmnp", "[data-nav-key]", (event) => {
			const key = $(event.currentTarget).attr("data-nav-key");
			this.$root.removeClass("sidebar-open");
			if (key === "dashboard") {
				this.show_dashboard();
			} else {
				this.show_list(key);
			}
		});
	}

	async load_portal() {
		try {
			this.bootstrap = await this.api("get_portal_bootstrap");
			this.page_length = Number(this.bootstrap.page_length) || 20;
			this.index_menu_items();
			this.render_navigation();
			this.render_user();
			await this.show_dashboard(false);
		} catch (error) {
			this.render_error(error, () => this.load_portal());
		}
	}

	index_menu_items() {
		this.menu_items = {};
		(this.bootstrap.menu || []).forEach((group) => {
			(group.items || []).forEach((item) => {
				this.menu_items[item.key] = item;
			});
		});
	}

	render_user() {
		const user = this.bootstrap.user || {};
		this.$root.find("[data-user-name]").text(user.full_name || user.id || __("Vehicle User"));
		this.$root.find("[data-user-initials]").text(user.initials || "VM");
	}

	render_navigation() {
		const groups = (this.bootstrap.menu || [])
			.map(
				(group) => `
					<section class="vmnp-nav-group" data-nav-group>
						<div class="vmnp-nav-group-title">${frappe.utils.escape_html(group.label)}</div>
						${(group.items || [])
							.map(
								(item) => `
									<button class="vmnp-nav-item" type="button" data-nav-key="${item.key}"
										data-nav-label="${frappe.utils.escape_html(item.label.toLowerCase())}">
										<span class="vmnp-nav-icon">${this.icon(item.icon)}</span>
										<span>${frappe.utils.escape_html(item.label)}</span>
									</button>
								`
							)
							.join("")}
					</section>
				`
			)
			.join("");

		this.$root.find("[data-navigation]").html(`
			<button class="vmnp-nav-item active" type="button" data-nav-key="dashboard"
				data-nav-label="${__("dashboard overview").toLowerCase()}">
				<span class="vmnp-nav-icon">${this.icon("home")}</span>
				<span>${__("Dashboard")}</span>
			</button>
			${groups}
			<div class="vmnp-menu-empty" hidden>${__("No matching module")}</div>
		`);
	}

	filter_navigation(term) {
		const query = String(term || "").trim().toLowerCase();
		let visible = 0;
		this.$root.find("[data-nav-key]").each((_, element) => {
			const $item = $(element);
			const match = !$item.attr("data-nav-key") || ($item.attr("data-nav-label") || "").includes(query);
			$item.toggle(match);
			if (match) visible += 1;
		});
		this.$root.find("[data-nav-group]").each((_, element) => {
			const $group = $(element);
			$group.toggle($group.find("[data-nav-key]:visible").length > 0);
		});
		this.$root.find(".vmnp-menu-empty").prop("hidden", visible > 0);
	}

	set_active_navigation(key) {
		this.active_key = key;
		this.$root.find("[data-nav-key]").removeClass("active");
		this.$root.find(`[data-nav-key="${key}"]`).addClass("active");
	}

	set_route_title(title) {
		this.$root.find("[data-route-title]").text(title);
	}

	async show_dashboard(show_loader = true) {
		this.current_view = { type: "dashboard" };
		this.set_active_navigation("dashboard");
		this.set_route_title(__("Dashboard"));
		if (show_loader) this.$view.html(this.loading_template(__("Loading dashboard…")));

		try {
			const data = await this.api("get_dashboard");
			if (this.current_view.type !== "dashboard") return;
			this.render_dashboard(data);
		} catch (error) {
			this.render_error(error, () => this.show_dashboard());
		}
	}

	render_dashboard(data) {
		const kpis = data.kpis || [];
		const recent = data.recent || [];
		const all_groups = this.bootstrap.menu || [];
		const greeting = this.get_greeting();

		this.$view.html(`
			<div class="vmnp-dashboard">
				<section class="vmnp-hero">
					<div class="vmnp-hero-copy">
						<div class="vmnp-greeting">${frappe.utils.escape_html(greeting)}</div>
						<div class="vmnp-eyebrow">${__("DUX DIGITECH · VEHICLE OPERATIONS")}</div>
						<h1>${__("Vehicle Management")} <span>${__("Nagpur")}</span></h1>
						<p>${__(
							"Manage daily fleet operations, masters, settings and compliance from one connected workspace."
						)}</p>
					</div>
					<div class="vmnp-hero-art" aria-hidden="true">
						<div class="vmnp-orbit"></div>
						<div class="vmnp-hero-mark">VMN</div>
					</div>
				</section>

				<section class="vmnp-kpi-grid">
					${kpis.map((item) => this.kpi_template(item)).join("")}
				</section>

				<div class="vmnp-dashboard-grid">
					<section class="vmnp-panel vmnp-recent-panel">
						<div class="vmnp-panel-head">
							<div>
								<span class="vmnp-section-kicker">${__("Live ERP data")}</span>
								<h2>${__("Recent activity")}</h2>
								<p>${__("Open any record without leaving this portal.")}</p>
							</div>
							<button class="vmnp-text-button" type="button" data-refresh-dashboard>
								${this.icon("refresh")} ${__("Refresh")}
							</button>
						</div>
						<div class="vmnp-recent-list">
							${
								recent.length
									? recent.map((row) => this.recent_template(row)).join("")
									: this.empty_template(__("No recent vehicle activity"), __("New records will appear here."))
							}
						</div>
					</section>

					<section class="vmnp-panel vmnp-quick-panel">
						<div class="vmnp-panel-head">
							<div>
								<span class="vmnp-section-kicker">${__("Quick access")}</span>
								<h2>${__("Modules")}</h2>
							</div>
						</div>
						<div class="vmnp-module-groups">
							${all_groups.map((group) => this.module_group_template(group)).join("")}
						</div>
					</section>
				</div>
			</div>
		`);

		this.$view.off(".dashboard");
		this.$view.on("click.dashboard", "[data-dashboard-key]", (event) => {
			this.show_list($(event.currentTarget).attr("data-dashboard-key"));
		});
		this.$view.on("click.dashboard", "[data-recent-key]", (event) => {
			this.show_detail(
				$(event.currentTarget).attr("data-recent-key"),
				$(event.currentTarget).attr("data-recent-name")
			);
		});
		this.$view.on("click.dashboard", "[data-refresh-dashboard]", () => this.show_dashboard());
	}

	kpi_template(item) {
		return `
			<button class="vmnp-kpi-card" type="button" data-dashboard-key="${item.key}"
				data-kpi-key="${frappe.utils.escape_html(item.key)}">
				<span class="vmnp-kpi-icon">${this.icon(item.icon, "md")}</span>
				<span class="vmnp-kpi-copy">
					<small>${frappe.utils.escape_html(item.label)}</small>
					<strong>${this.format_number(item.value)}</strong>
					<em>${frappe.utils.escape_html(item.description)}</em>
				</span>
				<span class="vmnp-card-arrow">${this.icon("arrow-right")}</span>
			</button>
		`;
	}

	recent_template(row) {
		return `
			<button class="vmnp-recent-row" type="button" data-recent-key="${row.key}"
				data-recent-name="${frappe.utils.escape_html(row.name)}">
				<span class="vmnp-recent-icon">${this.icon(this.menu_items[row.key]?.icon || "file")}</span>
				<span class="vmnp-recent-copy">
					<small>${frappe.utils.escape_html(row.module)}</small>
					<strong>${frappe.utils.escape_html(String(row.title || row.name))}</strong>
					<em>${this.format_date(row.date)}</em>
				</span>
				<span class="vmnp-card-arrow">${this.icon("arrow-right")}</span>
			</button>
		`;
	}

	module_group_template(group) {
		return `
			<div class="vmnp-module-group">
				<h3>${frappe.utils.escape_html(group.label)}</h3>
				<div class="vmnp-module-grid">
					${(group.items || [])
						.map(
							(item) => `
								<button class="vmnp-module-card" type="button" data-dashboard-key="${item.key}">
									<span class="vmnp-module-icon">${this.icon(item.icon)}</span>
									<span>
										<strong>${frappe.utils.escape_html(item.label)}</strong>
										<small>${frappe.utils.escape_html(item.description)}</small>
									</span>
									${this.icon("arrow-right")}
								</button>
							`
						)
						.join("")}
				</div>
			</div>
		`;
	}

	async show_list(key, options = {}) {
		const item = this.menu_items[key];
		if (!item) return;
		const state = {
			type: "list",
			key,
			start: Number(options.start) || 0,
			search: options.search || "",
			filter_field: options.filter_field || "",
			filter_value: options.filter_value || "",
			sort_by: options.sort_by || item.date_field || item.columns?.[0]?.fieldname || "modified",
			sort_order: options.sort_order === "asc" ? "asc" : "desc",
		};
		this.current_view = state;
		this.set_active_navigation(key);
		this.set_route_title(item.label);
		this.$view.html(this.loading_template(__("Loading {0}…", [item.label])));

		try {
			const data = await this.api("get_document_list", {
				key,
				start: state.start,
				page_length: this.page_length,
				search: state.search,
				filter_field: state.filter_field,
				filter_value: this.normalise_filter_value(item, state.filter_field, state.filter_value),
				sort_by: state.sort_by,
				sort_order: state.sort_order,
			});
			if (this.current_view !== state) return;
			this.render_list(state, data);
		} catch (error) {
			this.render_error(error, () => this.show_list(key, options));
		}
	}

	render_list(state, data) {
		const item = this.menu_items[state.key];
		const total = Number(data.total) || 0;
		const end = Math.min(total, state.start + this.page_length);
		const has_previous = state.start > 0;
		const has_next = end < total;
		const filter_fields = item.filter_fields || [];
		const columns = data.columns || [];

		this.$view.html(`
			<div class="vmnp-page">
				<section class="vmnp-page-heading">
					<div>
						<div class="vmnp-eyebrow">${frappe.utils.escape_html(item.doctype)}</div>
						<h1>${frappe.utils.escape_html(item.label)}</h1>
						<p>${frappe.utils.escape_html(item.description)}</p>
					</div>
					${
						data.can_create
							? `<button class="vmnp-primary-button" type="button" data-add-record>
								${this.icon("add")}<span>${__("Add {0}", [item.label])}</span>
							</button>`
							: ""
					}
				</section>

				<section class="vmnp-panel vmnp-list-panel">
					<div class="vmnp-list-toolbar">
						<label class="vmnp-toolbar-search">
							${this.icon("search")}
							<input type="search" value="${frappe.utils.escape_html(state.search)}"
								placeholder="${__("Search ID or record data")}" data-list-search>
						</label>
						<button class="vmnp-sort-button" type="button" data-sort-order="${state.sort_order}"
							title="${state.sort_order === "asc" ? __("Ascending") : __("Descending")}"
							aria-label="${state.sort_order === "asc" ? __("Ascending") : __("Descending")}">
							<span>${state.sort_order === "asc" ? "A" : "D"}</span>
						</button>
						<button class="vmnp-icon-button vmnp-clear-button" type="button" data-clear-list
							title="${__("Clear filters")}">${this.icon("close")}</button>
					</div>

					<div class="vmnp-table-wrap">
						${
							(data.rows || []).length
								? this.table_template(data)
								: this.empty_template(
										state.search || state.filter_value ? __("No matching records") : __("No records yet"),
										state.search || state.filter_value
											? __("Try changing the search or filter.")
											: __("Use Add to create the first record.")
								  )
						}
					</div>

					<div class="vmnp-pagination">
						<span>${
							total
								? __("Showing {0}–{1} of {2}", [
										this.format_number(state.start + 1),
										this.format_number(end),
										this.format_number(total),
								  ])
								: __("0 records")
						}</span>
						<div>
							<button class="vmnp-secondary-button" type="button" data-previous-page ${
								has_previous ? "" : "disabled"
							}>${this.icon("arrow-left")} ${__("Previous")}</button>
							<button class="vmnp-secondary-button" type="button" data-next-page ${
								has_next ? "" : "disabled"
							}>${__("Next")} ${this.icon("arrow-right")}</button>
						</div>
					</div>
				</section>
			</div>
		`);

		this.bind_list_events(state, data);
	}

	table_template(data) {
		return `
			<table class="vmnp-table">
				<thead>
					<tr>
						${data.columns
							.map((column) => `<th>${frappe.utils.escape_html(column.label)}</th>`)
							.join("")}
						<th aria-label="${__("Open")}"></th>
					</tr>
				</thead>
				<tbody>
					${data.rows
						.map(
							(row) => `
								<tr tabindex="0" data-open-record="${frappe.utils.escape_html(row.name)}">
									${data.columns
										.map(
											(column) =>
												`<td
													data-label="${frappe.utils.escape_html(column.label)}"
													data-fieldname="${frappe.utils.escape_html(column.fieldname || "")}"
													data-fieldtype="${frappe.utils.escape_html(column.fieldtype || "")}"
												>${this.format_value(
													row[column.fieldname],
													column
												)}</td>`
										)
										.join("")}
									<td class="vmnp-row-action">${this.icon("arrow-right")}</td>
								</tr>
							`
						)
						.join("")}
				</tbody>
			</table>
		`;
	}

	bind_list_events(state, data) {
		this.$view.off(".list");
		this.$view.on("click.list", "[data-add-record]", () => this.show_form(state.key));
		this.$view.on("click.list", "[data-open-record]", (event) => {
			this.show_detail(state.key, $(event.currentTarget).attr("data-open-record"));
		});
		this.$view.on("keydown.list", "[data-open-record]", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				this.show_detail(state.key, $(event.currentTarget).attr("data-open-record"));
			}
		});
		this.$view.on("input.list", "[data-list-search]", (event) => {
			window.clearTimeout(this.search_timer);
			const search = $(event.currentTarget).val();
			this.search_timer = window.setTimeout(() => this.show_list(state.key, { ...state, start: 0, search }), 350);
		});
		this.$view.on("change.list", "[data-filter-field], [data-sort-by]", () => {
			this.apply_list_toolbar(state);
		});
		this.$view.on("keyup.list", "[data-filter-value]", (event) => {
			if (event.key === "Enter") this.apply_list_toolbar(state);
		});
		this.$view.on("blur.list", "[data-filter-value]", () => this.apply_list_toolbar(state));
		this.$view.on("click.list", "[data-sort-order]", (event) => {
			const next = $(event.currentTarget).attr("data-sort-order") === "asc" ? "desc" : "asc";
			this.show_list(state.key, { ...state, start: 0, sort_order: next });
		});
		this.$view.on("click.list", "[data-clear-list]", () => this.show_list(state.key));
		this.$view.on("click.list", "[data-previous-page]", () => {
			if (state.start > 0) this.show_list(state.key, { ...state, start: Math.max(0, state.start - this.page_length) });
		});
		this.$view.on("click.list", "[data-next-page]", () => {
			if (state.start + this.page_length < Number(data.total || 0)) {
				this.show_list(state.key, { ...state, start: state.start + this.page_length });
			}
		});
	}

	apply_list_toolbar(state) {
		const filter_field = this.$view.find("[data-filter-field]").val() || "";
		const filter_value = this.$view.find("[data-filter-value]").val() || "";
		const sort_by = this.$view.find("[data-sort-by]").val() || state.sort_by;
		if (
			filter_field === state.filter_field &&
			filter_value === state.filter_value &&
			sort_by === state.sort_by
		) {
			return;
		}
		this.show_list(state.key, { ...state, start: 0, filter_field, filter_value, sort_by });
	}

	normalise_filter_value(item, fieldname, value) {
		const field = (item.filter_fields || []).find((candidate) => candidate.fieldname === fieldname);
		if (field?.fieldtype === "Date" && value) {
			return this.parse_display_date(value) || value;
		}
		return value;
	}

	async show_detail(key, name) {
		const item = this.menu_items[key];
		if (!item) return;
		const state = { type: "detail", key, name };
		this.current_view = state;
		this.set_active_navigation(key);
		this.set_route_title(item.label);
		this.$view.html(this.loading_template(__("Loading record…")));

		try {
			const data = await this.api("get_document", { key, name });
			if (this.current_view !== state) return;
			this.render_detail(data);
		} catch (error) {
			this.render_error(error, () => this.show_detail(key, name));
		}
	}

	render_detail(data) {
		const item = this.menu_items[data.key];
		this.$view.html(`
			<div class="vmnp-page">
				<section class="vmnp-page-heading">
					<div>
						<button class="vmnp-back-link" type="button" data-back-list>
							${this.icon("arrow-left")} ${frappe.utils.escape_html(item.label)}
						</button>
						<div class="vmnp-eyebrow">${frappe.utils.escape_html(data.doctype)}</div>
						<h1>${frappe.utils.escape_html(data.name)}</h1>
						<p>${frappe.utils.escape_html(data.description)}</p>
					</div>
					<div class="vmnp-heading-actions">
						${
							data.docstatus === 1
								? `<span class="vmnp-status submitted"><i></i>${__("Submitted")}</span>`
								: ""
						}
						${
							data.can_edit
								? `<button class="vmnp-primary-button" type="button" data-edit-record>
									${this.icon("edit")} ${__("Edit")}
								</button>`
								: ""
						}
					</div>
				</section>

				<div class="vmnp-detail-sections">
					${(data.sections || [])
						.map(
							(section, index) => `
								<section class="vmnp-panel vmnp-detail-section">
									${this.panel_header(index + 1, section.label, index === 0 ? data.doctype : "")}
									<div class="vmnp-detail-grid">
										${(section.fields || [])
											.map(
												(field) => `
													<div class="vmnp-detail-field"
														data-fieldname="${frappe.utils.escape_html(field.fieldname || "")}"
														data-fieldtype="${frappe.utils.escape_html(field.fieldtype || "")}"
													>
														<span>${frappe.utils.escape_html(field.label)}</span>
														<strong>${this.format_value(data.values[field.fieldname], field)}</strong>
													</div>
												`
											)
											.join("")}
									</div>
								</section>
							`
						)
						.join("")}
					${data.key === "maintenance" ? this.maintenance_work_details_section(data) : ""}
				</div>
			</div>
		`);

		this.$view.off(".detail");
		this.$view.on("click.detail", "[data-back-list]", () => this.show_list(data.key));
		this.$view.on("click.detail", "[data-edit-record]", () => this.show_form(data.key, data.name));
		void this.resolve_detail_link_titles(data);
	}

	/* VMNP maintenance base detail render 2026-08-10 */
	maintenance_work_details_section(data) {
		const raw = data?.values?.md_work_details || "";
		let rows = [];
		try {
			const parsed = JSON.parse(String(raw || "[]"));
			if (Array.isArray(parsed)) {
				rows = parsed
					.map((row) => ({
						work: String(row?.work || row?.name_of_repair_work || "").trim(),
						amount: Number(row?.amount || 0) || 0,
					}))
					.filter((row) => row.work || row.amount);
			}
		} catch (error) {
			rows = [];
		}
		const total = rows.reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
		const money = (value) =>
			new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
				Number(value || 0) || 0
			);
		const body = rows.length
			? `<table class="table table-bordered vmnp-work-summary-table">
				<thead><tr><th>${__("Name of Repair Work")}</th><th class="text-right">${__("Amount")}</th></tr></thead>
				<tbody>${rows
					.map(
						(row) =>
							`<tr><td>${frappe.utils.escape_html(row.work)}</td><td class="text-right">${money(row.amount)}</td></tr>`
					)
					.join("")}</tbody>
				<tfoot><tr><th>${__("Total")}</th><th class="text-right">${money(total)}</th></tr></tfoot>
			</table>`
			: `<div class="vmnp-muted" style="padding: 16px 0;">${__("No work details added")}</div>`;
		return `<section class="vmnp-panel vmnp-detail-section vmnp-maintenance-work-section">
			${this.panel_header(3, __("Work Details"), __("Maintenance Work"))}
			<div style="padding:0 24px 20px; overflow:auto;">${body}</div>
		</section>`;
	}

	// Numbered section header — "01  Log Details            Log Details VMN"
	panel_header(index, title, meta) {
		return `<div class="vmnp-panel-header">
			<span>${String(index).padStart(2, "0")}</span>
			<h3>${frappe.utils.escape_html(title || "")}</h3>
			<small>${frappe.utils.escape_html(meta || "")}</small>
		</div>`;
	}

	/**
	 * Link fields detail view me docname dikhate hain (CD-2646). Agar us doctype ka
	 * title field set hai to uski jagah asli naam dikhao (GHRU Saikheda).
	 */
	async resolve_detail_link_titles(data) {
		const targets = [];
		(data.sections || []).forEach((section) => {
			(section.fields || []).forEach((field) => {
				const value = data.values?.[field.fieldname];
				if (field.fieldtype === "Link" && field.options && value) {
					targets.push({ fieldname: field.fieldname, doctype: field.options, value });
				}
			});
		});
		if (!targets.length) return;

		await Promise.all(
			targets.map(async (target) => {
				try {
					const title = await this.fetch_link_title(target.doctype, target.value);
					if (!title || title === target.value) return;
					const $field = this.$view.find(`.vmnp-detail-field[data-fieldname="${target.fieldname}"] strong`);
					if ($field.length) $field.text(title);
				} catch (error) {
					// Title na mile to docname hi rehne do — chup-chaap.
				}
			})
		);
	}

	/**
	 * Link ka asli title laao.
	 *
	 * frappe.utils.get_link_title sirf cache se padhta hai — cache khaali ho to
	 * wo docname hi de deta hai. Is liye meta se title_field nikaal kar seedha
	 * value fetch karte hain, aur doctype-wise cache rakhte hain.
	 */
	async fetch_link_title(doctype, name) {
		if (!doctype || !name) return name;

		this._link_title_cache = this._link_title_cache || {};
		const cache_key = `${doctype}::${name}`;
		if (this._link_title_cache[cache_key] !== undefined) {
			return this._link_title_cache[cache_key];
		}

		let title = name;
		try {
			if (frappe.model?.with_doctype) {
				await new Promise((resolve) => frappe.model.with_doctype(doctype, resolve));
			}
			const title_field = frappe.get_meta ? frappe.get_meta(doctype)?.title_field : null;
			if (title_field) {
				const value = await frappe.db.get_value(doctype, name, title_field);
				const fetched = value?.message?.[title_field];
				if (fetched) title = String(fetched);
			}
		} catch (error) {
			// title = docname hi rehne do.
		}

		this._link_title_cache[cache_key] = title;
		return title;
	}

	async show_form(key, name = null) {
		const item = this.menu_items[key];
		if (!item) return;
		const state = { type: "form", key, name };
		this.current_view = state;
		this.set_active_navigation(key);
		this.set_route_title(name ? __("Edit {0}", [item.label]) : __("Add {0}", [item.label]));
		this.$view.html(this.loading_template(__("Preparing form…")));

		try {
			const data = await this.api("get_document_form", { key, name });
			if (this.current_view !== state) return;
			this.render_form(data);
		} catch (error) {
			this.render_error(error, () => this.show_form(key, name));
		}
	}

	render_form(data) {
		const item = this.menu_items[data.key];
		this.controls = {};
		this.$view.html(`
			<div class="vmnp-page">
				<section class="vmnp-page-heading">
					<div>
						<button class="vmnp-back-link" type="button" data-cancel-form>
							${this.icon("arrow-left")} ${frappe.utils.escape_html(item.label)}
						</button>
						<div class="vmnp-eyebrow">${frappe.utils.escape_html(data.doctype)}</div>
						<h1>${data.is_new ? __("Add {0}", [item.label]) : __("Edit {0}", [frappe.utils.escape_html(data.name)])}</h1>
						<p>${frappe.utils.escape_html(data.description)}</p>
					</div>
				</section>

				<form class="vmnp-record-form" data-record-form novalidate>
					${(data.sections || [])
						.map(
							(section, section_index) => `
								<section class="vmnp-panel vmnp-form-section">
									<div class="vmnp-form-section-head">
										<span>${String(section_index + 1).padStart(2, "0")}</span>
										<h2>${frappe.utils.escape_html(section.label)}</h2>
									</div>
									<div class="vmnp-form-grid">
										${(section.fields || [])
											.map(
												(field) =>
													`<div class="vmnp-control-slot ${
														this.is_wide_field(field) ? "wide" : ""
													}" data-control-field="${field.fieldname}"
														data-fieldtype="${frappe.utils.escape_html(field.fieldtype || "")}"
														data-mono="${this.is_mono_field(field) ? "1" : "0"}"></div>`
											)
											.join("")}
									</div>
								</section>
							`
						)
						.join("")}

					<div class="vmnp-form-actions">
						<button class="vmnp-secondary-button" type="button" data-cancel-form>${__("Cancel")}</button>
						${
							data.can_save
								? `<button class="vmnp-primary-button" type="submit" data-save-form>
									${this.icon("check")}<span>${__("Save")}</span>
								</button>`
								: ""
						}
					</div>
				</form>
			</div>
		`);

		(data.sections || []).forEach((section) => {
			(section.fields || []).forEach((field) => {
				const $slot = this.$view.find(`[data-control-field="${field.fieldname}"]`);
				this.make_control($slot, field, data.values[field.fieldname]);
			});
		});

		this.$view.off(".form");
		this.$view.on("click.form", "[data-cancel-form]", () => {
			if (data.is_new) this.show_list(data.key);
			else this.show_detail(data.key, data.name);
		});
		this.$view.on("submit.form", "[data-record-form]", (event) => {
			event.preventDefault();
			this.save_form(data, false);
		});
	}

	make_control($slot, field, value) {
		if (field.fieldtype === "Date") {
			this.make_date_control($slot, field, value);
			return;
		}

		const df = {
			fieldname: field.fieldname,
			label: field.label,
			fieldtype: field.fieldtype,
			options: field.options,
			reqd: field.reqd,
			read_only: field.read_only,
			description: field.description,
			precision: field.precision,
		};
		try {
			const control = frappe.ui.form.make_control({
				parent: $slot,
				df,
				render_input: true,
			});
			control.set_value(value == null ? "" : value);
			this.controls[field.fieldname] = control;
		} catch (error) {
			this.make_native_control($slot, field, value);
		}
	}

	make_date_control($slot, field, value) {
		const display_value = this.format_date(value, "");
		$slot.html(`
			<label class="vmnp-field-label" for="vmnp-${field.fieldname}">
				${frappe.utils.escape_html(field.label)}${field.reqd ? '<b class="vmnp-required">*</b>' : ""}
			</label>
			<div class="vmnp-date-input">
				${this.icon("calendar")}
				<input id="vmnp-${field.fieldname}" class="vmnp-input" type="text"
					placeholder="dd/mm/yyyy" inputmode="numeric"
					value="${frappe.utils.escape_html(display_value)}"
					${field.read_only ? "readonly" : ""}>
			</div>
			${field.description ? `<small class="vmnp-field-help">${frappe.utils.escape_html(field.description)}</small>` : ""}
		`);
		const input = $slot.find("input")[0];
		this.controls[field.fieldname] = {
			get_value: () => {
				const raw = input.value.trim();
				if (!raw) return "";
				const parsed = this.parse_display_date(raw);
				if (!parsed) {
					throw new Error(__("{0} must use dd/mm/yyyy format.", [field.label]));
				}
				return parsed;
			},
			set_value: (next) => {
				input.value = this.format_date(next, "");
			},
		};
	}

	make_native_control($slot, field, value) {
		const is_textarea = ["Text", "Small Text", "Long Text", "Text Editor", "Code"].includes(field.fieldtype);
		const numeric = ["Int", "Float", "Currency", "Percent"].includes(field.fieldtype);
		const escaped_value = frappe.utils.escape_html(value == null ? "" : String(value));
		$slot.html(`
			<label class="vmnp-field-label" for="vmnp-${field.fieldname}">
				${frappe.utils.escape_html(field.label)}${field.reqd ? '<b class="vmnp-required">*</b>' : ""}
			</label>
			${
				is_textarea
					? `<textarea id="vmnp-${field.fieldname}" class="vmnp-input" rows="3" ${
							field.read_only ? "readonly" : ""
					  }>${escaped_value}</textarea>`
					: `<input id="vmnp-${field.fieldname}" class="vmnp-input" type="${numeric ? "number" : "text"}"
						value="${escaped_value}" ${field.read_only ? "readonly" : ""}>`
			}
			${field.description ? `<small class="vmnp-field-help">${frappe.utils.escape_html(field.description)}</small>` : ""}
		`);
		const input = $slot.find("input, textarea")[0];
		this.controls[field.fieldname] = {
			get_value: () => (numeric && input.value !== "" ? Number(input.value) : input.value),
			set_value: (next) => {
				input.value = next == null ? "" : next;
			},
		};
	}

	async save_form(data, submit) {
		const values = {};
		try {
			Object.entries(this.controls).forEach(([fieldname, control]) => {
				values[fieldname] = control.get_value();
			});
		} catch (error) {
			frappe.msgprint({
				title: __("Check form"),
				message: error.message || String(error),
				indicator: "orange",
			});
			return;
		}

		const $buttons = this.$view.find("[data-save-form], [data-submit-form]");
		$buttons.prop("disabled", true).addClass("is-loading");
		try {
			const result = await this.api(
				"save_document",
				{
					key: data.key,
					name: data.name,
					values: JSON.stringify(values),
					submit: submit ? 1 : 0,
				},
				true
			);
			frappe.show_alert({ message: result.message || __("Saved successfully"), indicator: "green" });
			// Save ke baad us doctype ki list par wapas — detail page par nahi.
			await this.show_list(data.key);
		} catch (error) {
			this.notify_error(error);
			$buttons.prop("disabled", false).removeClass("is-loading");
		}
	}

	refresh_current_view() {
		const view = this.current_view || { type: "dashboard" };
		if (view.type === "list") this.show_list(view.key, view);
		else if (view.type === "detail") this.show_detail(view.key, view.name);
		else if (view.type === "form") this.show_form(view.key, view.name);
		else this.show_dashboard();
	}

	apply_theme(theme, persist = false) {
		const dark = theme === "dark";
		this.$root.attr("data-theme", dark ? "dark" : "light");
		this.$root.find("[data-theme-icon]").html(this.icon(dark ? "sun" : "moon"));
		this.$root
			.find("[data-theme-label]")
			.each((_, element) => $(element).text($(element).closest(".vmnp-sidebar-footer").length
				? dark
					? __("Light theme")
					: __("Dark theme")
				: dark
				? __("Light")
				: __("Dark")));
		if (persist) {
			localStorage.setItem(this.theme_key, dark ? "dark" : "light");
		}
	}

	get_greeting() {
		const hour = new Date().getHours();
		const name = this.bootstrap?.user?.full_name?.split(" ")[0] || __("there");
		if (hour < 12) return __("Good morning, {0}", [name]);
		if (hour < 17) return __("Good afternoon, {0}", [name]);
		return __("Good evening, {0}", [name]);
	}

	is_wide_field(field) {
		return ["Text", "Small Text", "Long Text", "Text Editor", "Code", "Attach", "Attach Image"].includes(
			field.fieldtype
		);
	}

	format_number(value) {
		const number = Number(value);
		return Number.isFinite(number) ? new Intl.NumberFormat("en-IN").format(number) : "0";
	}

	format_date(value, empty = "—") {
		if (!value) return empty;
		const raw = String(value).slice(0, 10);
		const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (match) return `${match[3]}/${match[2]}/${match[1]}`;
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return frappe.utils.escape_html(String(value));
		return new Intl.DateTimeFormat("en-GB", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}).format(date);
	}

	parse_display_date(value) {
		const match = String(value || "")
			.trim()
			.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
		if (!match) return "";
		const day = Number(match[1]);
		const month = Number(match[2]);
		const year = Number(match[3]);
		const date = new Date(Date.UTC(year, month - 1, day));
		if (
			date.getUTCFullYear() !== year ||
			date.getUTCMonth() + 1 !== month ||
			date.getUTCDate() !== day
		) {
			return "";
		}
		return `${match[3]}-${match[2]}-${match[1]}`;
	}

	format_value(value, field) {
		if (value == null || value === "") return '<span class="vmnp-muted">—</span>';
		if (field.fieldtype === "Date") return frappe.utils.escape_html(this.format_date(value));
		if (field.fieldtype === "Datetime") {
			const date = this.format_date(value);
			const time = String(value).split(" ")[1] || "";
			return frappe.utils.escape_html(`${date}${time ? ` ${time.slice(0, 5)}` : ""}`);
		}
		if (field.fieldtype === "Check") {
			return value
				? `<span class="vmnp-badge success">${__("Yes")}</span>`
				: `<span class="vmnp-badge">${__("No")}</span>`;
		}
		if (["Currency", "Float", "Int", "Percent"].includes(field.fieldtype)) {
			const number = Number(value);
			return frappe.utils.escape_html(
				Number.isFinite(number)
					? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(number)
					: String(value)
			);
		}
		if (["Attach", "Attach Image"].includes(field.fieldtype)) {
			const url = frappe.utils.escape_html(String(value));
			return `<a class="vmnp-file-link" href="${url}" target="_blank" rel="noopener">${this.icon(
				"attachment"
			)} ${__("View file")}</a>`;
		}
		return frappe.utils.escape_html(String(value));
	}

	loading_template(label) {
		return `
			<div class="vmnp-state">
				<div class="vmnp-spinner"></div>
				<strong>${frappe.utils.escape_html(label)}</strong>
			</div>
		`;
	}

	empty_template(title, message) {
		return `
			<div class="vmnp-empty">
				<span>${this.icon("list", "md")}</span>
				<strong>${frappe.utils.escape_html(title)}</strong>
				<p>${frappe.utils.escape_html(message)}</p>
			</div>
		`;
	}

	render_error(error, retry) {
		const message = this.error_message(error);
		this.$view.html(`
			<div class="vmnp-state vmnp-error-state">
				<span>${this.icon("warning", "md")}</span>
				<strong>${__("Unable to load Vehicle Management")}</strong>
				<p>${frappe.utils.escape_html(message)}</p>
				<button class="vmnp-primary-button" type="button" data-retry>${this.icon("refresh")} ${__(
					"Try again"
				)}</button>
			</div>
		`);
		this.$view.off(".error").on("click.error", "[data-retry]", retry);
	}

	notify_error(error) {
		frappe.msgprint({
			title: __("Unable to save"),
			message: frappe.utils.escape_html(this.error_message(error)),
			indicator: "red",
		});
	}

	error_message(error) {
		if (error?.message) return error.message;
		if (error?._server_messages) {
			try {
				const messages = JSON.parse(error._server_messages).map((item) => JSON.parse(item).message);
				if (messages.length) return messages.join("<br>");
			} catch (parse_error) {
				// Fallback below.
			}
		}
		return __("The request could not be completed. Please retry.");
	}

	api(method, args = {}, freeze = false) {
		return frappe
			.call({
				method: `${this.method_root}.${method}`,
				args,
				freeze,
				freeze_message: freeze ? __("Saving Vehicle Management record…") : undefined,
			})
			.then((response) => response.message);
	}

	icon(name, size = "sm") {
		try {
			return frappe.utils.icon(name, size) || frappe.utils.icon("dot", size);
		} catch (error) {
			return "";
		}
	}
}

(() => {
	const proto = VehicleManagementPortal.prototype;
	const original_render_form = proto.render_form;
	const original_render_detail = proto.render_detail;
	const original_make_control = proto.make_control;
	const original_save_form = proto.save_form;
	const original_format_value = proto.format_value;

	const layouts = {
		vehicle_logs: [
			{
				label: __("Vehicle Details"),
				fields: [
					"date",
					"ld_type_of_vehicle",
					"vehicle_number",
					"ld_vehicle_name",
					"ld_vehicle_location",
					"ld_select_campus",
				],
			},
			{
				label: __("Trip Information"),
				fields: [
					"start_reading",
					"end_reading",
					"ld_distance",
					"from_location",
					"to_location",
					"start_time",
					"end_time",
					"ld_total_hours",
					"remark",
				],
			},
			{
				label: __("Attachments"),
				fields: ["ld_start_reading", "ld_end_reading", "ld_log_book"],
			},
		],
		fuel_diesel: [
			{
				label: __("Vehicle Details"),
				fields: [
					"dd_date",
					"dd_type_of_vehicle",
					"dd_vehicle_number",
					"dd_vehicle_name",
					"dd_vehicle_location",
					"dd_select_campus",
				],
			},
			{
				label: __("Fuel Details"),
				fields: [
					"dd_quantity",
					"dd_last_quantity",
					"dd_fuel_station_name",
					"dd_rate",
					"dd_amount",
				],
			},
			{
				label: __("Odometer Reading"),
				fields: [
					"dd_fuel_fill_up_reading",
					"dd_average",
					"dd_previous_fuel_fill_up_reading",
					"dd_odometer_reading",
				],
			},
			{ label: __("Details"), fields: ["dd_remark"] },
		],
		dg_operations: [
			{
				label: __("DG Details"),
				fields: ["dgd_date", "dgd_dg_campus", "dg_location", "dg_type", "dg_number"],
			},
			{
				label: __("Reading & Consumption"),
				fields: [
					"dg_start_reading",
					"dg_end_reading",
					"dg_total_dg_unit",
					"dg_diesel_consumption",
					"dg_diesel_rateltr",
					"dg_total_amount",
					"balance_diesel_quantity",
				],
			},
			{
				label: __("Operation Time"),
				fields: ["dg_start_time", "dg_end_time", "dg_total_hours"],
			},
			{
				label: __("Attachment & Remark"),
				fields: ["dg_attachment", "dg_remark"],
			},
		],
	};

	const required_fields = {
		vehicle_logs: new Set([
			"date",
			"ld_type_of_vehicle",
			"vehicle_number",
			"ld_select_campus",
			"start_reading",
			"end_reading",
			"start_time",
			"end_time",
		]),
		fuel_diesel: new Set([
			"dd_date",
			"dd_type_of_vehicle",
			"dd_vehicle_number",
			"dd_select_campus",
			"dd_quantity",
			"dd_fuel_station_name",
			"dd_rate",
			"dd_fuel_fill_up_reading",
		]),
		dg_operations: new Set([
			"dgd_date",
			"dgd_dg_campus",
			"dg_location",
			"dg_type",
			"dg_start_reading",
		]),
	};

	const read_only_fields = {
		vehicle_logs: new Set(["ld_vehicle_name", "ld_vehicle_location", "ld_distance", "ld_total_hours"]),
		fuel_diesel: new Set([
			"dd_vehicle_name",
			"dd_vehicle_location",
			"dd_last_quantity",
			"dd_amount",
			"dd_average",
			"dd_previous_fuel_fill_up_reading",
		]),
		dg_operations: new Set(["dg_number", "dg_total_dg_unit", "dg_total_hours"]),
	};

	const field_labels = {
		ld_start_reading: __("Start Reading Attachment"),
		ld_end_reading: __("End Reading Attachment"),
		ld_log_book: __("Log Book Attachment"),
		ld_total_hours: __("Total Hours"),
	};

	const vehicle_mappings = {
		vehicle_logs: {
			type: "ld_type_of_vehicle",
			number: "vehicle_number",
			name: "ld_vehicle_name",
			location: "ld_vehicle_location",
		},
		fuel_diesel: {
			type: "dd_type_of_vehicle",
			number: "dd_vehicle_number",
			name: "dd_vehicle_name",
			location: "dd_vehicle_location",
		},
	};

	proto.power_app_sections = function (data) {
		const configured = layouts[data.key];
		if (!configured) return data.sections || [];

		const field_map = {};
		(data.sections || []).forEach((section) => {
			(section.fields || []).forEach((field) => {
				field_map[field.fieldname] = field;
			});
		});

		if (data.key === "vehicle_logs" && !field_map.ld_total_hours) {
			field_map.ld_total_hours = {
				fieldname: "ld_total_hours",
				label: __("Total Hours"),
				fieldtype: "Float",
				options: "",
				reqd: 0,
				read_only: 1,
				description: __("Calculated automatically from Start Time and End Time."),
				precision: 2,
			};
		}

		return configured
			.map((section) => ({
				label: section.label,
				fields: section.fields
					.map((fieldname) => field_map[fieldname])
					.filter(Boolean)
					.map((field) => ({
						...field,
						label: field_labels[field.fieldname] || field.label,
						reqd: required_fields[data.key]?.has(field.fieldname) ? 1 : field.reqd,
						read_only: read_only_fields[data.key]?.has(field.fieldname) ? 1 : field.read_only,
					})),
			}))
			.filter((section) => section.fields.length);
	};

	proto.render_detail = function (data) {
		return original_render_detail.call(this, {
			...data,
			sections: this.power_app_sections(data),
		});
	};

	proto.render_form = function (data) {
		const transformed = {
			...data,
			sections: this.power_app_sections(data),
		};
		this._power_form_data = transformed;
		this._power_form_fields = {};
		transformed.sections.forEach((section) => {
			section.fields.forEach((field) => {
				this._power_form_fields[field.fieldname] = field;
			});
		});
		this._power_initialising = true;
		original_render_form.call(this, transformed);
		this._power_initialising = false;
		this.prepare_power_app_form(transformed);
	};

	proto.prepare_power_app_form = function (data) {
		const $form = this.$view.find("[data-record-form]");

		// Frappe's standalone Attach button has no type attribute. Inside our form,
		// a browser therefore treats it as submit and runs Save before upload.
		$form.find(".vmnp-control-slot button").attr("type", "button");
		this.$view.off(".powerform");
		this.$view.on("mousedown.powerform", ".vmnp-control-slot button", (event) => {
			$(event.currentTarget).attr("type", "button");
		});
		this.$view.on(
			"input.powerform change.powerform",
			".vmnp-control-slot input, .vmnp-control-slot select, .vmnp-control-slot textarea",
			(event) => {
				const fieldname = $(event.currentTarget).closest("[data-control-field]").attr("data-control-field");
				window.setTimeout(() => this.power_control_changed(data.key, fieldname), 0);
			}
		);
		this.calculate_power_app_fields(data.key);
	};

	proto.make_control = function ($slot, field, value) {
		if (field.fieldtype === "Time") {
			this.make_power_time_control($slot, field, value);
			return;
		}
		if (field.fieldtype === "Date") {
			original_make_control.call(this, $slot, field, value);
			return;
		}

		const df = {
			fieldname: field.fieldname,
			label: field.label,
			fieldtype: field.fieldtype,
			options: field.options,
			reqd: field.reqd,
			read_only: field.read_only,
			description: field.description,
			precision: field.precision,
		};
		const query = this.power_link_query(field.fieldname);
		if (query) df.get_query = query;
		df.onchange = () => {
			if (!this._power_initialising) {
				window.setTimeout(
					() => this.power_control_changed(this._power_form_data?.key, field.fieldname),
					0
				);
			}
		};

		try {
			const control = frappe.ui.form.make_control({
				parent: $slot,
				df,
				render_input: true,
			});
			this.controls[field.fieldname] = control;
			if (query) {
				control.get_query = query;
				control.df.get_query = query;
			}
			control.set_value(value == null ? "" : value);
			$slot.find("button").attr("type", "button");
		} catch (error) {
			this.make_native_control($slot, field, value);
		}
	};

	proto.power_link_query = function (fieldname) {
		const key = this._power_form_data?.key;
		const mapping = vehicle_mappings[key];
		if (mapping && fieldname === mapping.number) {
			return () => {
				const vehicle_type = this.control_value(mapping.type);
				return vehicle_type ? { filters: { vd_type_of_vehicle: vehicle_type } } : {};
			};
		}
		if (key === "dg_operations" && fieldname === "dg_location") {
			return () => {
				const campus = this.control_value("dgd_dg_campus");
				return campus ? { filters: { diesel_generator_location: campus } } : {};
			};
		}
		return null;
	};

	proto.make_power_time_control = function ($slot, field, value) {
		const parsed = this.parse_power_time(value);
		const hours = Array.from({ length: 12 }, (_, index) => String(index + 1));
		const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
		$slot.html(`
			<label class="vmnp-field-label">
				${frappe.utils.escape_html(field.label)}${field.reqd ? '<b class="vmnp-required">*</b>' : ""}
			</label>
			<div class="vmnp-time-input">
				<select class="vmnp-select" data-time-hour ${field.read_only ? "disabled" : ""}>
					<option value="">${__("Hour")}</option>
					${hours
						.map((hour) => `<option value="${hour}" ${parsed.hour === hour ? "selected" : ""}>${hour}</option>`)
						.join("")}
				</select>
				<select class="vmnp-select" data-time-minute ${field.read_only ? "disabled" : ""}>
					<option value="">${__("Min")}</option>
					${minutes
						.map(
							(minute) =>
								`<option value="${minute}" ${parsed.minute === minute ? "selected" : ""}>${minute}</option>`
						)
						.join("")}
				</select>
				<select class="vmnp-select" data-time-period ${field.read_only ? "disabled" : ""}>
					<option value="">${__("AM/PM")}</option>
					<option value="AM" ${parsed.period === "AM" ? "selected" : ""}>AM</option>
					<option value="PM" ${parsed.period === "PM" ? "selected" : ""}>PM</option>
				</select>
			</div>
			${field.description ? `<small class="vmnp-field-help">${frappe.utils.escape_html(field.description)}</small>` : ""}
		`);
		const read = () => {
			const hour = $slot.find("[data-time-hour]").val();
			const minute = $slot.find("[data-time-minute]").val();
			const period = $slot.find("[data-time-period]").val();
			if (!hour || minute === null || minute === "" || !period) return "";
			let hour_24 = Number(hour) % 12;
			if (period === "PM") hour_24 += 12;
			return `${String(hour_24).padStart(2, "0")}:${minute}:00`;
		};
		this.controls[field.fieldname] = {
			get_value: read,
			set_value: (next) => {
				const next_value = this.parse_power_time(next);
				$slot.find("[data-time-hour]").val(next_value.hour);
				$slot.find("[data-time-minute]").val(next_value.minute);
				$slot.find("[data-time-period]").val(next_value.period);
			},
			$input: $slot.find("select"),
		};
	};

	proto.parse_power_time = function (value) {
		const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
		if (!match) return { hour: "", minute: "", period: "" };
		const hour_24 = Number(match[1]);
		return {
			hour: String(hour_24 % 12 || 12),
			minute: match[2],
			period: hour_24 >= 12 ? "PM" : "AM",
		};
	};

	proto.control_value = function (fieldname) {
		const control = this.controls[fieldname];
		if (!control || typeof control.get_value !== "function") return "";
		return control.get_value();
	};

	proto.set_control_value = function (fieldname, value) {
		const control = this.controls[fieldname];
		if (!control || typeof control.set_value !== "function") return;
		const current = this.control_value(fieldname);
		const next = value == null ? "" : value;
		if (String(current ?? "") === String(next ?? "")) return;
		control.set_value(next);
	};

	proto.power_control_changed = function (key, fieldname) {
		if (!key) return;
		const mapping = vehicle_mappings[key];
		if (mapping && fieldname === mapping.number) {
			this.load_power_vehicle(key);
		}
		if (key === "dg_operations" && fieldname === "dg_location") {
			this.load_power_dg();
		}
		this.calculate_power_app_fields(key);
	};

	proto.load_power_vehicle = async function (key) {
		const mapping = vehicle_mappings[key];
		const vehicle_number = this.control_value(mapping.number);
		if (!vehicle_number) {
			this.set_control_value(mapping.name, "");
			this.set_control_value(mapping.location, "");
			return;
		}
		const request_id = `${key}:${vehicle_number}:${Date.now()}`;
		this._vehicle_request_id = request_id;
		try {
			const details = await this.api("get_vehicle_details", { vehicle_number });
			if (this._vehicle_request_id !== request_id || !details) return;
			this.set_control_value(mapping.type, details.vd_type_of_vehicle || "");
			this.set_control_value(mapping.name, details.vd_vehicle_name || "");
			this.set_control_value(mapping.location, details.vd_location || "");
		} catch (error) {
			this.notify_error(error);
		}
	};

	proto.load_power_dg = async function () {
		const dg_information = this.control_value("dg_location");
		if (!dg_information) {
			this.set_control_value("dg_number", "");
			return;
		}
		const request_id = `${dg_information}:${Date.now()}`;
		this._dg_request_id = request_id;
		try {
			const details = await this.api("get_dg_details", { dg_information });
			if (this._dg_request_id !== request_id || !details) return;
			this.set_control_value("dg_type", details.type_of_diesel_generator || "");
			this.set_control_value("dg_number", details.diesel_generator_number || "");
		} catch (error) {
			this.notify_error(error);
		}
	};

	proto.number_value = function (fieldname) {
		const value = Number(this.control_value(fieldname));
		return Number.isFinite(value) ? value : 0;
	};

	proto.duration_hours = function (start_field, end_field) {
		const start = String(this.control_value(start_field) || "").split(":");
		const end = String(this.control_value(end_field) || "").split(":");
		if (start.length < 2 || end.length < 2) return 0;
		const start_minutes = Number(start[0]) * 60 + Number(start[1]);
		const end_minutes = Number(end[0]) * 60 + Number(end[1]);
		if (!Number.isFinite(start_minutes) || !Number.isFinite(end_minutes)) return 0;
		let duration = end_minutes - start_minutes;
		if (duration < 0) duration += 24 * 60;
		return Math.round((duration / 60) * 100) / 100;
	};

	proto.calculate_power_app_fields = function (key) {
		if (key === "vehicle_logs") {
			this.set_control_value(
				"ld_distance",
				this.number_value("end_reading") - this.number_value("start_reading")
			);
			this.set_control_value("ld_total_hours", this.duration_hours("start_time", "end_time"));
		} else if (key === "dg_operations") {
			this.set_control_value(
				"dg_total_dg_unit",
				Math.max(0, this.number_value("dg_end_reading") - this.number_value("dg_start_reading"))
			);
			this.set_control_value("dg_total_hours", this.duration_hours("dg_start_time", "dg_end_time"));
			const consumption = this.number_value("dg_diesel_consumption");
			const rate = this.number_value("dg_diesel_rateltr");
			if (consumption && rate) this.set_control_value("dg_total_amount", consumption * rate);
		} else if (key === "fuel_diesel") {
			const quantity = this.number_value("dd_quantity");
			const rate = this.number_value("dd_rate");
			this.set_control_value("dd_amount", quantity * rate);
			const travelled =
				this.number_value("dd_fuel_fill_up_reading") -
				this.number_value("dd_previous_fuel_fill_up_reading");
			this.set_control_value("dd_average", quantity ? Math.round((travelled / quantity) * 100) / 100 : 0);
		}
	};

	proto.save_form = function (data, submit) {
		const missing = [];
		Object.values(this._power_form_fields || {}).forEach((field) => {
			if (!field.reqd) return;
			const value = this.control_value(field.fieldname);
			if (value === null || value === undefined || String(value).trim() === "") {
				missing.push(field.label);
			}
		});
		if (missing.length) {
			frappe.msgprint({
				title: __("Required fields"),
				message: __("Please fill: {0}", [frappe.utils.escape_html(missing.join(", "))]),
				indicator: "orange",
			});
			return;
		}
		return original_save_form.call(this, data, submit);
	};

	proto.is_wide_field = function (field) {
		return ["Text", "Small Text", "Long Text", "Text Editor", "Code"].includes(field.fieldtype);
	};

	proto.format_power_time = function (value) {
		const parsed = this.parse_power_time(value);
		if (!parsed.hour) return "—";
		return `${parsed.hour}:${parsed.minute} ${parsed.period}`;
	};

	proto.format_value = function (value, field) {
		if (field.fieldtype === "Time") {
			return frappe.utils.escape_html(this.format_power_time(value));
		}
		return original_format_value.call(this, value, field);
	};
})();

/* VMNP standard Frappe Workflow UI 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_detail = proto.render_detail;
	const previous_show_list = proto.show_list;
	const workflow_keys = new Set([
		"vehicle_logs",
		"fuel_diesel",
		"maintenance",
		"rto_compliance",
		"dg_operations",
	]);

	proto.approval_badge = function (data = {}) {
		const state = data.approval_state || data.values?.workflow_state || "Draft";
		const css_class = state === "Approved" ? "submitted" : "draft";
		return `<span class="vmnp-status ${css_class}" data-approval-status><i></i>${frappe.utils.escape_html(__(state))}</span>`;
	};

	function call(method, args, freeze = false) {
		return frappe
			.call({
				method,
				args,
				freeze,
				freeze_message: freeze ? __("Applying workflow action…") : undefined,
			})
			.then((response) => response.message);
	}

	async function apply_action(portal, data, action) {
		const $buttons = portal.$view.find("[data-frappe-workflow-action]");
		$buttons.prop("disabled", true);
		try {
			await call(
				"frappe.model.workflow.apply_workflow",
				{
					doc: JSON.stringify({ doctype: data.doctype, name: data.name }),
					action,
				},
				true
			);
			frappe.show_alert({ message: __("Workflow action {0} completed", [action]), indicator: "green" });
			await portal.show_detail(data.key, data.name);
		} catch (error) {
			portal.notify_error(error);
			$buttons.prop("disabled", false);
		}
	}

	function bind_actions(portal, data) {
		portal.$view.off(".approval").off(".vmnpFrappeWorkflow");
		portal.$view.on("click.vmnpFrappeWorkflow", "[data-frappe-workflow-action]", (event) => {
			const action = String($(event.currentTarget).attr("data-frappe-workflow-action") || "");
			if (!action) return;
			if (["Approve", "Reject", "Cancel"].includes(action)) {
				frappe.confirm(__("{0} this record?", [action]), () => void apply_action(portal, data, action));
				return;
			}
			void apply_action(portal, data, action);
		});
	}

	async function render_workflow_actions(portal, data) {
		if (!data || !workflow_keys.has(data.key)) return;
		portal._vmnp_workflow_request = (portal._vmnp_workflow_request || 0) + 1;
		const request_id = portal._vmnp_workflow_request;
		try {
			const [state_data, transitions] = await Promise.all([
				call("frappe.client.get_value", {
					doctype: data.doctype,
					filters: { name: data.name },
					fieldname: ["workflow_state", "docstatus"],
				}),
				call("frappe.model.workflow.get_transitions", {
					doc: JSON.stringify({ doctype: data.doctype, name: data.name }),
				}),
			]);
			if (
				request_id !== portal._vmnp_workflow_request ||
				portal.current_view?.type !== "detail" ||
				portal.current_view?.key !== data.key ||
				portal.current_view?.name !== data.name
			) {
				return;
			}

			const state = state_data?.workflow_state || "Draft";
			const $actions = portal.$view.find(".vmnp-heading-actions").first();
			if (!$actions.length) return;
			$actions.find("[data-approval-status]").remove();
			$actions.prepend(portal.approval_badge({ approval_state: state }));
			$actions
				.find("[data-request-approval-record], [data-approve-record], [data-frappe-workflow-action]")
				.remove();

			(transitions || []).forEach((transition) => {
				const action = String(transition.action || "");
				if (!action) return;
				const button_class = action === "Approve" ? "vmnp-primary-button" : "vmnp-secondary-button";
				$actions.append(`
					<button class="${button_class}" type="button"
						data-frappe-workflow-action="${frappe.utils.escape_html(action)}">
						<span>${frappe.utils.escape_html(__(action))}</span>
					</button>
				`);
			});
			bind_actions(portal, data);
		} catch (error) {
			portal.notify_error?.(error);
		}
	}

	async function refresh_list_workflow_states(portal, key) {
		if (!workflow_keys.has(key)) return;
		portal._vmnp_workflow_list_request = (portal._vmnp_workflow_list_request || 0) + 1;
		const request_id = portal._vmnp_workflow_list_request;
		const names = portal.$view
			.find("[data-open-record]")
			.toArray()
			.map((row) => $(row).attr("data-open-record"))
			.filter(Boolean);
		if (!names.length) return;
		try {
			const item = portal.menu_items[key];
			const rows = await call("frappe.client.get_list", {
				doctype: item.doctype,
				fields: ["name", "workflow_state"],
				filters: { name: ["in", names] },
				limit_page_length: names.length,
			});
			if (request_id !== portal._vmnp_workflow_list_request) return;
			(rows || []).forEach((row) => {
				portal.$view
					.find(`[data-open-record="${CSS.escape(row.name)}"] [data-fieldname="workflow_state"]`)
					.html(portal.approval_badge({ approval_state: row.workflow_state || "Draft" }));
			});
		} catch (error) {
			// List remains usable even if a status refresh is unavailable.
		}
	}

	window._vmnp_render_frappe_workflow_actions = render_workflow_actions;
	window._vmnp_refresh_frappe_workflow_list = refresh_list_workflow_states;

	proto.render_detail = function (data) {
		previous_render_detail.call(this, data);
		void render_workflow_actions(this, data);
	};

	proto.show_list = async function (key, options = {}) {
		const result = await previous_show_list.call(this, key, options);
		await refresh_list_workflow_states(this, key);
		return result;
	};
})();

(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_power_app_sections = proto.power_app_sections;
	const previous_render_form = proto.render_form;
	const previous_make_control = proto.make_control;
	const previous_power_link_query = proto.power_link_query;
	const previous_power_control_changed = proto.power_control_changed;
	const previous_is_wide_field = proto.is_wide_field;

	const power_canvas_keys = new Set([
		"vehicle_logs",
		"fuel_diesel",
		"dg_operations",
		"maintenance",
		"rto_compliance",
	]);

	const layouts = {
		vehicle_logs: [
			{
				label: __("Log Details"),
				fields: [
					"date",
					"ld_type_of_vehicle",
					"vehicle_number",
					"ld_vehicle_name",
					"ld_vehicle_location",
					"ld_select_campus",
					"start_reading",
					"end_reading",
					"ld_distance",
					"from_location",
					"to_location",
					"start_time",
					"end_time",
					"ld_total_hours",
					"remark",
				],
			},
			{ label: __("Attachments"), fields: ["ld_start_reading", "ld_end_reading", "ld_log_book"] },
		],
		fuel_diesel: [
			{
				label: __("Diesel Details"),
				fields: [
					"dd_date",
					"dd_type_of_vehicle",
					"dd_vehicle_number",
					"dd_vehicle_name",
					"dd_vehicle_location",
					"dd_select_campus",
					"dd_quantity",
					"dd_rate",
					"dd_amount",
					"dd_average",
					"dd_fuel_station_name",
					"dd_fuel_fill_up_reading",
					"dd_remark",
					"dd_previous_fuel_fill_up_reading",
				],
			},
			{ label: __("Attachments"), fields: ["dd_odometer_reading"] },
		],
		dg_operations: [
			{
				label: __("DG Details"),
				fields: [
					"dgd_date",
					"dgd_dg_campus",
					"dg_location",
					"dg_type",
					"dg_number",
					"dg_start_reading",
					"dg_end_reading",
					"dg_total_dg_unit",
					"dg_diesel_consumption",
					"dg_total_amount",
					"balance_diesel_quantity",
					"dg_start_time",
					"dg_end_time",
					"dg_total_hours",
					"dg_remark",
				],
			},
			{ label: __("Attachments"), fields: ["dg_attachment"] },
		],
		maintenance: [
			{
				label: __("Maintenance Details"),
				fields: [
					"md_date",
					"md_type_of_vehicle",
					"md_vehicle_number",
					"md_vehicle_name",
					"md_vehicle_location",
					"md_select_campus",
					"md_vendor_name",
					"md_invoice_number",
					"md_total_repairingamount",
					"md_remark",
				],
			},
			{ label: __("Attachments"), fields: ["md_invoice_attacment"] },
		],
		rto_compliance: [
			{
				label: __("RTO Details"),
				fields: [
					"rto_date",
					"rto_type_of_vehicle",
					"rto_vehicle_number",
					"rto_vehicle_name",
					"rto_vehicle_location",
					"rto_select_campus",
					"rto_supervisor_name",
					"document_type",
					"trust_name",
					"issued_date",
					"expired_date",
					"amount",
					"remarkl",
				],
			},
			{ label: __("Attachments"), fields: ["attachment"] },
		],
	};

	const required_fields = {
		maintenance: new Set(["md_date", "md_type_of_vehicle", "md_vehicle_number"]),
		rto_compliance: new Set([
			"rto_date",
			"rto_type_of_vehicle",
			"rto_vehicle_number",
			"rto_vehicle_name",
			"rto_vehicle_location",
			"rto_select_campus",
			// rto_supervisor_name yahan se hata diya: ye field read-only hai aur
			// value sirf campus master se auto-aati hai, is liye required rakhne
			// par form kabhi save hi nahi ho paata tha.
			"document_type",
			"trust_name",
			"issued_date",
			"expired_date",
			"amount",
		]),
	};

	const read_only_fields = {
		maintenance: new Set(["md_vehicle_name", "md_vehicle_location", "md_total_repairingamount"]),
		rto_compliance: new Set(["rto_vehicle_name", "rto_vehicle_location", "rto_supervisor_name"]),
	};

	const field_labels = {
		dd_fuel_station_name: __("Fuel Station"),
		dd_select_campus: __("Select Campus"),
		dd_odometer_reading: __("Odometer Reading Attachment"),
		dg_attachment: __("DG Attachment"),
		md_select_campus: __("Campus Name"),
		md_invoice_attacment: __("Invoice Attachment"),
		rto_vehicle_location: __("Location Name"),
		rto_select_campus: __("Campus Name"),
		issued_date: __("Issue Date"),
		expired_date: __("Expiry Date"),
		attachment: __("Upload/Attach Document"),
	};

	const vehicle_mappings = {
		maintenance: {
			type: "md_type_of_vehicle",
			number: "md_vehicle_number",
			name: "md_vehicle_name",
			location: "md_vehicle_location",
		},
		rto_compliance: {
			type: "rto_type_of_vehicle",
			number: "rto_vehicle_number",
			name: "rto_vehicle_name",
			location: "rto_vehicle_location",
		},
	};

	proto.power_app_sections = function (data) {
		if (!power_canvas_keys.has(data.key)) {
			return previous_power_app_sections.call(this, data);
		}

		const transformed = previous_power_app_sections.call(this, data);
		const field_map = {};
		(transformed || []).forEach((section) => {
			(section.fields || []).forEach((field) => {
				field_map[field.fieldname] = field;
			});
		});

		return layouts[data.key]
			.map((section) => ({
				label: section.label,
				fields: section.fields
					.map((fieldname) => field_map[fieldname])
					.filter(Boolean)
					.map((field) => ({
						...field,
						label: field_labels[field.fieldname] || field.label,
						reqd: required_fields[data.key]?.has(field.fieldname) ? 1 : field.reqd,
						read_only: read_only_fields[data.key]?.has(field.fieldname) ? 1 : field.read_only,
					})),
			}))
			.filter((section) => section.fields.length);
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (!power_canvas_keys.has(data.key)) return;

		const $form = this.$view.find("[data-record-form]");
		$form.addClass("vmnp-power-canvas");
		(this._power_form_data?.sections || []).forEach((section, index) => {
			if ((section.fields || []).some((field) => ["Attach", "Attach Image"].includes(field.fieldtype))) {
				$form.find(".vmnp-form-section").eq(index).addClass("vmnp-attachment-section");
			}
		});
	};

	proto.make_control = function ($slot, field, value) {
		if (!["Date", "Time", "Datetime"].includes(field.fieldtype)) {
			return previous_make_control.call(this, $slot, field, value);
		}

		const df = {
			fieldname: field.fieldname,
			label: field.label,
			fieldtype: field.fieldtype,
			options: field.options,
			reqd: field.reqd,
			read_only: field.read_only,
			description: field.description,
			precision: field.precision,
			onchange: () => {
				if (!this._power_initialising) {
					window.setTimeout(
						() => this.power_control_changed(this._power_form_data?.key, field.fieldname),
						0
					);
				}
			},
		};
		try {
			const control = frappe.ui.form.make_control({ parent: $slot, df, render_input: true });
			this.controls[field.fieldname] = control;
			control.set_value(value == null ? "" : value);
			$slot.find("button").attr("type", "button");
		} catch (error) {
			previous_make_control.call(this, $slot, field, value);
		}
	};

	proto.power_link_query = function (fieldname) {
		const key = this._power_form_data?.key;
		const mapping = vehicle_mappings[key];
		if (mapping && fieldname === mapping.number) {
			return () => {
				const vehicle_type = this.control_value(mapping.type);
				return vehicle_type ? { filters: { vd_type_of_vehicle: vehicle_type } } : {};
			};
		}
		return previous_power_link_query.call(this, fieldname);
	};

	proto.power_control_changed = function (key, fieldname) {
		previous_power_control_changed.call(this, key, fieldname);
		const mapping = vehicle_mappings[key];
		if (mapping && fieldname === mapping.type) {
			this.set_control_value(mapping.number, "");
			this.set_control_value(mapping.name, "");
			this.set_control_value(mapping.location, "");
		}
		if (mapping && fieldname === mapping.number) {
			this.load_extended_vehicle(key);
		}
		if (key === "rto_compliance" && fieldname === "rto_select_campus") {
			this.load_rto_campus();
		}
	};

	proto.load_extended_vehicle = async function (key) {
		const mapping = vehicle_mappings[key];
		// Is block ke mapping me har module nahi hai. Guard ke bina mapping
		// undefined par TypeError aata tha, jo promise chain ko tod deta tha —
		// isi wajah se Vehicle Name/Location khaali rehte the aur baad ke
		// dropdown loaders chalna band ho jaate the.
		if (!mapping) return;
		const vehicle_number = this.control_value(mapping.number);
		if (!vehicle_number) {
			this.set_control_value(mapping.name, "");
			this.set_control_value(mapping.location, "");
			return;
		}
		const request_id = `${key}:${vehicle_number}:${Date.now()}`;
		this._extended_vehicle_request_id = request_id;
		try {
			const details = await this.api("get_vehicle_details", { vehicle_number });
			if (this._extended_vehicle_request_id !== request_id || !details) return;
			this.set_control_value(mapping.type, details.vd_type_of_vehicle || "");
			this.set_control_value(mapping.name, details.vd_vehicle_name || "");
			this.set_control_value(mapping.location, details.vd_location || "");
		} catch (error) {
			this.notify_error(error);
		}
	};

	proto.load_rto_campus = async function () {
		const campus = this.control_value("rto_select_campus");
		if (!campus) {
			this.set_control_value("rto_supervisor_name", "");
			return;
		}
		const request_id = `${campus}:${Date.now()}`;
		this._campus_request_id = request_id;
		try {
			const details = await this.api("get_campus_details", { campus });
			if (this._campus_request_id !== request_id || !details) return;
			this.set_control_value("rto_supervisor_name", details.supervisor_name || "");
		} catch (error) {
			this.notify_error(error);
		}
	};

	proto.is_wide_field = function (field) {
		const compact_text_fields = new Set(["remark", "dd_remark", "dg_remark", "md_remark", "remarkl"]);
		if (power_canvas_keys.has(this._power_form_data?.key) && compact_text_fields.has(field.fieldname)) {
			return false;
		}
		return previous_is_wide_field.call(this, field);
	};
})();

(() => {
	VehicleManagementPortal.prototype.is_mono_field = function (field) {
		const numeric_types = new Set(["Currency", "Float", "Int", "Percent", "Date", "Datetime", "Time"]);
		if (numeric_types.has(field.fieldtype)) return true;
		const fieldname = String(field.fieldname || "").toLowerCase();
		return (
			fieldname === "name" ||
			/(number|reading|distance|amount|quantity|total|rate|year)/.test(fieldname)
		);
	};
})();

(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_make_control = proto.make_control;
	const previous_power_control_changed = proto.power_control_changed;

	const vehicle_mappings = {
		vehicle_logs: {
			type: "ld_type_of_vehicle",
			number: "vehicle_number",
			name: "ld_vehicle_name",
			location: "ld_vehicle_location",
		},
		fuel_diesel: {
			type: "dd_type_of_vehicle",
			number: "dd_vehicle_number",
			name: "dd_vehicle_name",
			location: "dd_vehicle_location",
		},
		maintenance: {
			type: "md_type_of_vehicle",
			number: "md_vehicle_number",
			name: "md_vehicle_name",
			location: "md_vehicle_location",
		},
		rto_compliance: {
			type: "rto_type_of_vehicle",
			number: "rto_vehicle_number",
			name: "rto_vehicle_name",
			location: "rto_vehicle_location",
		},
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		const mapping = vehicle_mappings[data.key];
		if (!mapping) return;

		const selected_vehicle = data.values?.[mapping.number] || "";
		void this.load_vehicle_number_options(data.key, selected_vehicle);
	};

	proto.make_control = function ($slot, field, value) {
		const key = this._power_form_data?.key;
		const mapping = vehicle_mappings[key];
		if (!mapping || field.fieldname !== mapping.number) {
			return previous_make_control.call(this, $slot, field, value);
		}

		const required = field.reqd ? '<b class="vmnp-required">*</b>' : "";
		$slot.html(`
			<label class="vmnp-field-label">
				${frappe.utils.escape_html(field.label)}${required}
			</label>
			<select class="vmnp-select vmnp-vehicle-number-select"
				aria-label="${frappe.utils.escape_html(field.label)}"
				${field.reqd ? "required" : ""}
				${field.read_only ? "disabled" : ""}>
				<option value="">${__("Select vehicle type first")}</option>
			</select>
			${field.description ? `<small class="vmnp-field-help">${frappe.utils.escape_html(field.description)}</small>` : ""}
		`);

		const $select = $slot.find(".vmnp-vehicle-number-select");
		const control = {
			$input: $select,
			get_value: () => $select.val() || "",
			set_value: (next) => {
				const next_value = String(next == null ? "" : next);
				if (
					next_value &&
					!$select
						.find("option")
						.toArray()
						.some((option) => option.value === next_value)
				) {
					$select.append(new Option(next_value, next_value));
				}
				$select.val(next_value);
			},
			set_vehicle_options: (rows, selected_value = "") => {
				$select.empty().append(new Option(__("Select vehicle number"), ""));
				const seen = new Set();
				(rows || []).forEach((row) => {
					const option_value = String(row.name || row.vd_vehicle_number || "").trim();
					if (!option_value || seen.has(option_value)) return;
					seen.add(option_value);
					const number = String(row.vd_vehicle_number || option_value).trim();
					const label = number;
					$select.append(new Option(label, option_value));
				});

				const wanted = String(selected_value || "");
				const match = (rows || []).find(
					(row) =>
						String(row.name || "") === wanted ||
						String(row.vd_vehicle_number || "") === wanted
				);
				$select.val(match ? String(match.name || match.vd_vehicle_number) : "");
				$select.prop("disabled", Boolean(field.read_only));
			},
			set_loading: (message) => {
				$select.empty().append(new Option(message, "")).prop("disabled", true);
			},
		};
		this.controls[field.fieldname] = control;
		control.set_value(value);
	};

	proto.load_vehicle_number_options = async function (key, selected_value = "") {
		const mapping = vehicle_mappings[key];
		const control = mapping ? this.controls[mapping.number] : null;
		if (!mapping || !control || typeof control.set_vehicle_options !== "function") return;

		const vehicle_type = String(this.control_value(mapping.type) || "").trim();
		if (!vehicle_type) {
			control.set_loading(__("Select vehicle type first"));
			return;
		}

		const request_id = `${key}:${vehicle_type}:${Date.now()}`;
		this._vehicle_options_request_id = request_id;
		control.set_loading(__("Loading vehicle numbers…"));

		try {
			const rows = [];
			let start = 0;
			let total = 0;
			do {
				const result = await this.api("get_document_list", {
					key: "vehicles",
					start,
					page_length: 100,
					search: "",
					filter_field: "vd_type_of_vehicle",
					filter_value: vehicle_type,
					sort_by: "vd_vehicle_number",
					sort_order: "asc",
				});
				if (this._vehicle_options_request_id !== request_id) return;
				const batch = result?.rows || [];
				rows.push(...batch);
				total = Number(result?.total) || rows.length;
				start += batch.length;
				if (!batch.length) break;
			} while (start < total);

			const matching_rows = rows.filter(
				(row) =>
					String(row.vd_type_of_vehicle || "")
						.trim()
						.toLowerCase() === vehicle_type.toLowerCase()
			);
			control.set_vehicle_options(matching_rows, selected_value);
		} catch (error) {
			if (this._vehicle_options_request_id !== request_id) return;
			control.set_loading(__("Unable to load vehicle numbers"));
			this.notify_error(error);
		}
	};

	proto.power_control_changed = function (key, fieldname) {
		previous_power_control_changed.call(this, key, fieldname);
		const mapping = vehicle_mappings[key];
		if (!mapping || fieldname !== mapping.type) return;

		this.set_control_value(mapping.number, "");
		this.set_control_value(mapping.name, "");
		this.set_control_value(mapping.location, "");
		void this.load_vehicle_number_options(key);
	};
})();

(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_power_app_sections = proto.power_app_sections;
	const previous_power_control_changed = proto.power_control_changed;

	proto.power_app_sections = function (data) {
		const sections = previous_power_app_sections.call(this, data) || [];
		// Pehle yahan campuses form se supervisor_name hata diya jaata tha, is liye
		// campus edit karke supervisor set karna hi mumkin nahi tha. Ab wo field
		// rehne diya hai — dropdown load_supervisor_options se bharta hai.

		if (data.key !== "users") return sections;
		const field_map = {};
		sections.forEach((section) => {
			(section.fields || []).forEach((field) => {
				field_map[field.fieldname] = field;
			});
		});
		const ordered_fields = [
			"ud_user_name",
			"ud_user_type",
			"ud_user_email",
			"ud_personal_email",
		]
			.map((fieldname) => field_map[fieldname])
			.filter(Boolean)
			.map((field) => ({
				...field,
				reqd: ["ud_user_name", "ud_user_type"].includes(field.fieldname) ? 1 : field.reqd,
				read_only: field.fieldname === "ud_user_email" ? 1 : field.read_only,
			}));
		return ordered_fields.length ? [{ label: __("Details"), fields: ordered_fields }] : sections;
	};

	proto.power_control_changed = function (key, fieldname) {
		previous_power_control_changed.call(this, key, fieldname);
		if (key === "users" && fieldname === "ud_user_name") {
			void this.load_vehicle_user_email();
		}
	};

	proto.load_vehicle_user_email = async function () {
		const user_name = String(this.control_value("ud_user_name") || "").trim();
		if (!user_name) {
			this.set_control_value("ud_user_email", "");
			return;
		}

		const request_id = `${user_name}:${Date.now()}`;
		this._vehicle_user_request_id = request_id;
		try {
			const response = await frappe.db.get_value("User", user_name, ["email"]);
			if (this._vehicle_user_request_id !== request_id) return;
			const email = response?.message?.email || (user_name.includes("@") ? user_name : "");
			this.set_control_value("ud_user_email", email);
		} catch (error) {
			if (this._vehicle_user_request_id !== request_id) return;
			this.set_control_value("ud_user_email", user_name.includes("@") ? user_name : "");
			this.notify_error(error);
		}
	};
})();

(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_index_menu_items = proto.index_menu_items;
	const hidden_sidebar_items = new Set(["fuel_stations", "vendors"]);

	proto.index_menu_items = function () {
		if (this.bootstrap?.menu) {
			this.bootstrap = {
				...this.bootstrap,
				menu: this.bootstrap.menu
					.map((group) => ({
						...group,
						items: (group.items || []).filter((item) => !hidden_sidebar_items.has(item.key)),
					}))
					.filter((group) => group.items.length),
			};
		}
		return previous_index_menu_items.call(this);
	};
})();

(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_make_control = proto.make_control;

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (data.key !== "users") return;
		void this.load_vehicle_user_options(data.values?.ud_user_name || "");
	};

	proto.make_control = function ($slot, field, value) {
		if (this._power_form_data?.key !== "users" || field.fieldname !== "ud_user_name") {
			return previous_make_control.call(this, $slot, field, value);
		}

		const required = field.reqd ? '<b class="vmnp-required">*</b>' : "";
		$slot.html(`
			<label class="vmnp-field-label">
				${frappe.utils.escape_html(field.label)}${required}
			</label>
			<select class="vmnp-select vmnp-vehicle-user-select"
				aria-label="${frappe.utils.escape_html(field.label)}"
				${field.reqd ? "required" : ""}>
				<option value="">${__("Loading users…")}</option>
			</select>
			${field.description ? `<small class="vmnp-field-help">${frappe.utils.escape_html(field.description)}</small>` : ""}
		`);

		const $select = $slot.find(".vmnp-vehicle-user-select");
		const control = {
			$input: $select,
			get_value: () => $select.val() || "",
			set_value: (next) => {
				const next_value = String(next == null ? "" : next);
				if (
					next_value &&
					!$select
						.find("option")
						.toArray()
						.some((option) => option.value === next_value)
				) {
					$select.append(new Option(next_value, next_value));
				}
				$select.val(next_value);
			},
			set_user_options: (rows, selected_value = "") => {
				$select.empty().append(new Option(__("Select user name"), ""));
				const seen = new Set();
				(rows || []).forEach((row) => {
					const option_value = String(row.name || row.email || "").trim();
					if (!option_value || seen.has(option_value)) return;
					seen.add(option_value);
					const full_name = String(row.full_name || "").trim() || option_value;
					$select.append(new Option(full_name, option_value));
				});
				$select.val(String(selected_value || ""));
				$select.prop("disabled", false);
			},
			set_loading: (message) => {
				$select.empty().append(new Option(message, "")).prop("disabled", true);
			},
		};
		this.controls[field.fieldname] = control;
		control.set_value(value);
	};

	proto.load_vehicle_user_options = async function (selected_value = "") {
		const control = this.controls.ud_user_name;
		if (!control || typeof control.set_user_options !== "function") return;

		const request_id = `users:${Date.now()}`;
		this._vehicle_user_options_request_id = request_id;
		control.set_loading(__("Loading users…"));
		try {
			const response = await frappe.db.get_list("User", {
				fields: ["name", "full_name", "email"],
				filters: { enabled: 1 },
				order_by: "full_name asc",
				limit: 500,
			});
			if (this._vehicle_user_options_request_id !== request_id) return;
			const rows = Array.isArray(response) ? response : response?.message || [];
			control.set_user_options(rows, selected_value);
		} catch (error) {
			if (this._vehicle_user_options_request_id !== request_id) return;
			control.set_loading(__("Unable to load users"));
			this.notify_error(error);
		}
	};
})();

/**
 * Select Campus dropdown.
 *
 * Pehle ye field plain textbox ban jaata tha, is liye Campus master ke records
 * kabhi dikhte hi nahi the. Ab wahi native-select pattern use ho raha hai jo
 * Vehicle Number field me already chal raha hai: options seedhe
 * "Campus Details VMN" master se aate hain.
 *
 * Option ki value hamesha docname (CD-2646) hoti hai — campus ka naam nahi —
 * kyunki ye ek Link field hai aur Link field docname hi store karta hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_make_control = proto.make_control;
	const previous_render_form = proto.render_form;

	const campus_fields = new Set([
		"ld_select_campus",
		"dd_select_campus",
		"md_select_campus",
		"rto_select_campus",
	]);

	proto.make_control = function ($slot, field, value) {
		if (!campus_fields.has(field.fieldname)) {
			return previous_make_control.call(this, $slot, field, value);
		}

		const required = field.reqd ? '<b class="vmnp-required">*</b>' : "";
		$slot.html(`
			<label class="vmnp-field-label">
				${frappe.utils.escape_html(field.label)}${required}
			</label>
			<select class="vmnp-select vmnp-campus-select"
				aria-label="${frappe.utils.escape_html(field.label)}"
				${field.reqd ? "required" : ""}
				${field.read_only ? "disabled" : ""}>
				<option value="">${__("Loading campuses…")}</option>
			</select>
			${field.description ? `<small class="vmnp-field-help">${frappe.utils.escape_html(field.description)}</small>` : ""}
		`);

		const $select = $slot.find(".vmnp-campus-select");
		const control = {
			$input: $select,
			get_value: () => $select.val() || "",
			set_value: (next) => {
				const next_value = String(next == null ? "" : next);
				if (
					next_value &&
					!$select
						.find("option")
						.toArray()
						.some((option) => option.value === next_value)
				) {
					$select.append(new Option(next_value, next_value));
				}
				$select.val(next_value);
			},
			set_campus_options: (rows, selected_value = "") => {
				$select.empty().append(new Option(__("Select campus"), ""));
				const seen = new Set();
				(rows || []).forEach((row) => {
					const option_value = String(row.name || "").trim();
					if (!option_value || seen.has(option_value)) return;
					seen.add(option_value);
					const campus_name = String(row.cd_campus_name || "").trim() || option_value;
					const location = String(row.cd_location || "").trim();
					const label = location ? `${campus_name} — ${location}` : campus_name;
					$select.append(new Option(label, option_value));
				});
				$select.val(String(selected_value || ""));
				$select.prop("disabled", Boolean(field.read_only));
			},
			set_loading: (message) => {
				$select.empty().append(new Option(message, "")).prop("disabled", true);
			},
		};
		this.controls[field.fieldname] = control;
		control.set_value(value);
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		const fieldname = (data.sections || [])
			.flatMap((section) => section.fields || [])
			.map((field) => field.fieldname)
			.find((name) => campus_fields.has(name));
		if (!fieldname) return;
		void this.load_campus_options(fieldname, data.values?.[fieldname] || "");
	};

	proto.load_campus_options = async function (fieldname, selected_value = "") {
		const control = this.controls[fieldname];
		if (!control || typeof control.set_campus_options !== "function") return;

		const request_id = `campus:${fieldname}:${Date.now()}`;
		this._campus_options_request_id = request_id;
		control.set_loading(__("Loading campuses…"));

		try {
			const response = await this.cached_master_list("Campus Details VMN", {
				fields: ["name", "cd_campus_name", "cd_location"],
				order_by: "cd_campus_name asc",
				limit: 500,
			});
			if (this._campus_options_request_id !== request_id) return;
			const rows = Array.isArray(response) ? response : response?.message || [];
			control.set_campus_options(rows, selected_value);
		} catch (error) {
			if (this._campus_options_request_id !== request_id) return;
			control.set_loading(__("Unable to load campuses"));
			this.notify_error(error);
		}
	};
})();

/**
 * Time fields ki value kabhi-kabhi microseconds ke saath aati hai
 * ("14:58:44.294798"). Frappe ka Time control sirf HH:mm:ss leta hai, is liye
 * wo "must be in format: HH:mm:ss" ka dialog dikha deta tha.
 *
 * Ye block value ko control tak pahunchne se pehle HH:mm:ss par trim karta hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_make_control = proto.make_control;

	const normalise_time = (value) => {
		if (typeof value !== "string") return value;
		const trimmed = value.trim();
		if (!trimmed) return trimmed;
		const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
		if (!match) return trimmed;
		const hours = String(match[1]).padStart(2, "0");
		return `${hours}:${match[2]}:${match[3] || "00"}`;
	};

	proto.make_control = function ($slot, field, value) {
		const next_value = field.fieldtype === "Time" ? normalise_time(value) : value;
		return previous_make_control.call(this, $slot, field, next_value);
	};
})();

/**
 * ERP jaisa multi-field filter.
 *
 * Purana toolbar ek waqt me ek hi field par filter karta tha. Ab uske neeche
 * ek row aati hai jisme har filter field ka apna input hota hai — Date par
 * datepicker, Select/Link par dropdown, baaki par text. Sab ek saath lagte hain.
 *
 * Server par naya endpoint get_document_list_multi use hota hai. Agar wo kisi
 * wajah se fail ho jaye to apne-aap purane get_document_list par wapas chala
 * jaata hai, is liye list kabhi khaali nahi rehti.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_show_list = proto.show_list;
	const previous_api = proto.api;

	proto.api = function (method, args = {}, freeze = false) {
		const active = this._vmnp_filters || {};
		// Sirf usi list ka call hijack karo jiske filters abhi lage hain.
		// Vehicle-number dropdown bhi get_document_list use karta hai (key:
		// "vehicles"), use hijack kar diya to uske options gayab ho jaate hain.
		const is_active_list = args && args.key && args.key === this._vmnp_filters_key;
		if (method === "get_document_list" && is_active_list && Object.keys(active).length) {
			return previous_api
				.call(this, "get_document_list_multi", { ...args, filters: JSON.stringify(active) }, freeze)
				.catch(() => previous_api.call(this, method, args, freeze));
		}
		return previous_api.call(this, method, args, freeze);
	};

	proto.show_list = async function (key, options = {}) {
		this._vmnp_filters_key = key;
		this._vmnp_filters =
			options.filters && typeof options.filters === "object" ? { ...options.filters } : {};
		const result = await previous_show_list.call(this, key, options);
		this.render_filter_row(key);
		return result;
	};

	proto.render_filter_row = function (key) {
		const item = this.menu_items[key];
		// Date fields alag From/To range se handle hote hain, is liye yahan skip.
		const fields = (item?.filter_fields || []).filter(
			(field) => field.fieldname !== "name" && field.fieldtype !== "Date"
		);
		const $toolbar = this.$view.find(".vmnp-list-toolbar");
		if (!fields.length || !$toolbar.length) return;

		const active = this._vmnp_filters || {};
		const controls = fields
			.map((field) => {
				const value = active[field.fieldname] || "";
				const label = frappe.utils.escape_html(field.label || field.fieldname);
				const attrs = `data-multi-filter="${frappe.utils.escape_html(field.fieldname)}"
					aria-label="${label}" title="${label}"`;

				if (field.fieldtype === "Date") {
					return `<input class="vmnp-input vmnp-multi-filter" type="date"
						value="${frappe.utils.escape_html(value)}" ${attrs}>`;
				}
				if (field.fieldtype === "Select") {
					const options = String(field.options || "")
						.split("\n")
						.map((option) => option.trim())
						.filter((option, index, all) => option && all.indexOf(option) === index);
					return `<select class="vmnp-select vmnp-multi-filter" ${attrs}>
						<option value="">${label}</option>
						${options
							.map(
								(option) =>
									`<option value="${frappe.utils.escape_html(option)}" ${
										value === option ? "selected" : ""
									}>${frappe.utils.escape_html(option)}</option>`
							)
							.join("")}
					</select>`;
				}
				if (field.fieldtype === "Link") {
					return `<select class="vmnp-select vmnp-multi-filter" ${attrs}
						data-link-doctype="${frappe.utils.escape_html(field.options || "")}"
						data-link-selected="${frappe.utils.escape_html(value)}">
						<option value="">${label}</option>
					</select>`;
				}
				return `<input class="vmnp-input vmnp-multi-filter" type="text"
					value="${frappe.utils.escape_html(value)}" placeholder="${label}" ${attrs}>`;
			})
			.join("");

		$toolbar.after(`<div class="vmnp-filter-row">${controls}</div>`);
		this.load_filter_link_options(key);

		const collect = () => {
			const next = {};
			this.$view.find("[data-multi-filter]").each((index, element) => {
				const $element = $(element);
				const value = String($element.val() || "").trim();
				if (value) next[$element.attr("data-multi-filter")] = value;
			});
			const view = this.current_view || {};
			this.show_list(key, { ...view, start: 0, filters: next });
		};

		this.$view.off(".multifilter");
		this.$view.on("change.multifilter", "[data-multi-filter]", collect);
		this.$view.on("keyup.multifilter", "[data-multi-filter]", (event) => {
			if (event.key === "Enter") collect();
		});
	};

	proto.load_filter_link_options = async function (key) {
		const $selects = this.$view.find("[data-link-doctype]");
		await Promise.all(
			$selects.toArray().map(async (element) => {
				const $select = $(element);
				const doctype = $select.attr("data-link-doctype");
				const selected = $select.attr("data-link-selected") || "";
				if (!doctype) return;
				try {
					// Meta pehle load karo — bina iske get_meta null deta hai aur
					// dropdown me docname (CD-2647) dikhta hai, campus naam nahi.
					if (frappe.model?.with_doctype) {
						await new Promise((resolve) => frappe.model.with_doctype(doctype, resolve));
					}
					const meta = frappe.get_meta ? frappe.get_meta(doctype) : null;
					const title_field = meta?.title_field;
					const fields = title_field ? ["name", title_field] : ["name"];
					const rows = await frappe.db.get_list(doctype, { fields, limit: 200 });
					(rows || []).forEach((row) => {
						const text = (title_field && row[title_field]) || row.name;
						$select.append(new Option(text, row.name, false, row.name === selected));
					});
					$select.val(selected);
				} catch (error) {
					// Options na aaye to dropdown khaali rahega — list phir bhi chalti rahegi.
				}
			})
		);
	};
})();

/**
 * Chaar fixes — sab client side, koi backend change nahi:
 *
 * 1. Icon aliases — config me kuch icon naam Frappe ke sprite me hain hi nahi,
 *    is liye khaali box dikhta tha. Unhe maujood naamon par map kar diya.
 * 2. From/To Location ab dropdown hain, data Settings → Locations master se.
 * 3. Reading badalne par Distance/Total Hours ka calculation ab chalta hai —
 *    pehle in fields par koi change handler laga hi nahi tha.
 * 4. Start Reading us vehicle ki pichhli entry ke End Reading se bhar jaata hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_icon = proto.icon;
	const previous_make_control = proto.make_control;
	const previous_render_form = proto.render_form;
	const previous_power_control_changed = proto.power_control_changed;

	// --- 1. icon aliases -----------------------------------------------------
	const icon_alias = {
		timeline: "stock",
		activity: "tool",
		grid: "assets",
		home: "branch",
		user: "users",
		flag: "tag",
		"user-check": "users",
		info: "file",
	};

	proto.icon = function (name, size = "sm") {
		return previous_icon.call(this, icon_alias[name] || name, size);
	};

	// --- 2. From / To Location dropdowns -------------------------------------
	const location_fields = new Set(["from_location", "to_location"]);

	proto.make_control = function ($slot, field, value) {
		if (!location_fields.has(field.fieldname)) {
			return previous_make_control.call(this, $slot, field, value);
		}

		const label = frappe.utils.escape_html(field.label || field.fieldname);
		$slot.html(`
			<label class="vmnp-field-label">
				${label}${field.reqd ? '<b class="vmnp-required">*</b>' : ""}
			</label>
			<select class="vmnp-select vmnp-location-select" aria-label="${label}"
				${field.reqd ? "required" : ""} ${field.read_only ? "disabled" : ""}>
				<option value="">${__("Loading locations…")}</option>
			</select>
		`);

		const $select = $slot.find(".vmnp-location-select");
		this.controls[field.fieldname] = {
			$input: $select,
			get_value: () => $select.val() || "",
			set_value: (next) => {
				const next_value = String(next == null ? "" : next);
				if (
					next_value &&
					!$select.find("option").toArray().some((option) => option.value === next_value)
				) {
					$select.append(new Option(next_value, next_value));
				}
				$select.val(next_value);
			},
			set_location_options: (rows, selected = "") => {
				$select.empty().append(new Option(__("Select location"), ""));
				const seen = new Set();
				(rows || []).forEach((row) => {
					const text = String(row.location_name || row.name || "").trim();
					if (!text || seen.has(text)) return;
					seen.add(text);
					$select.append(new Option(text, text));
				});
				$select.val(String(selected || ""));
				$select.prop("disabled", Boolean(field.read_only));
			},
		};
		this.controls[field.fieldname].set_value(value);
	};

	proto.load_location_options = async function (data) {
		const present = (data.sections || [])
			.flatMap((section) => section.fields || [])
			.map((field) => field.fieldname)
			.filter((name) => location_fields.has(name));
		if (!present.length) return;

		try {
			const rows = await this.cached_master_list("Location Details VMN", {
				fields: ["name", "location_name"],
				order_by: "location_name asc",
				limit: 500,
			});
			present.forEach((fieldname) => {
				const control = this.controls[fieldname];
				if (control?.set_location_options) {
					control.set_location_options(rows, data.values?.[fieldname] || "");
				}
			});
		} catch (error) {
			// Locations na aayen to dropdown khaali rahega, form phir bhi chalega.
		}
	};

	// --- 3 + 4. calculation trigger aur previous reading ----------------------
	const reading_pairs = {
		vehicle_logs: { number: "vehicle_number", start: "start_reading", end: "end_reading" },
		dg_operations: { number: "dg_number", start: "dg_start_reading", end: "dg_end_reading" },
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		void this.load_location_options(data);

		// Reading/time fields par koi change handler nahi tha, is liye Distance
		// aur Total Hours kabhi calculate hi nahi hote the.
		const $form = this.$view.find("[data-record-form]");
		$form.off(".vmnpcalc");
		// Sirf number/time wale slots — pehle har input aur select par laga tha, jis se
		// dropdown badalne par bhi recalc chalta tha aur controls me dakhal deta tha.
		$form.on("input.vmnpcalc change.vmnpcalc", ".vmnp-control-slot input", (event) => {
			if (this._power_initialising) return;
			const fieldname = $(event.currentTarget).closest("[data-control-field]").attr("data-control-field") || "";
			if (!/reading|time|quantity|rate|consumption/i.test(fieldname)) return;
			this.calculate_power_app_fields(data.key);
		});

		if (data.is_new && reading_pairs[data.key]) {
			void this.load_previous_reading(data.key);
		}
	};

	proto.power_control_changed = function (key, fieldname) {
		previous_power_control_changed.call(this, key, fieldname);
		const pair = reading_pairs[key];
		if (pair && fieldname === pair.number) {
			void this.load_previous_reading(key);
		}
	};

	/** Us vehicle/DG ki pichhli entry ka End Reading -> naya Start Reading. */
	proto.load_previous_reading = async function (key) {
		const pair = reading_pairs[key];
		const item = this.menu_items[key];
		if (!pair || !item?.doctype) return;

		const vehicle = this.control_value(pair.number);
		if (!vehicle) return;

		try {
			const rows = await frappe.db.get_list(item.doctype, {
				filters: { [pair.number]: vehicle },
				fields: [pair.end],
				order_by: "creation desc",
				limit: 1,
			});
			const previous = rows && rows.length ? rows[0][pair.end] : null;
			if (previous == null || previous === "") return;
			this.set_control_value(pair.start, previous);
			this.calculate_power_app_fields(key);
		} catch (error) {
			// Pichhli entry na mile to Start Reading user khud bhar lega.
		}
	};
})();

/**
 * Delete button — detail page par Edit ke saath.
 *
 * Confirm dialog ke baad hi delete hota hai. Permission aur submitted-document
 * ka rule Frappe khud enforce karta hai; error aaye to wahi message dikhta hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_detail = proto.render_detail;

	proto.render_detail = function (data) {
		previous_render_detail.call(this, data);

		const $actions = this.$view.find(".vmnp-heading-actions");
		if (!$actions.length || this.$view.find("[data-delete-record]").length) return;

		$actions.append(`
			<button class="vmnp-secondary-button vmnp-delete-button" type="button" data-delete-record
				title="${__("Delete")}">
				${this.icon("delete")}<span>${__("Delete")}</span>
			</button>
		`);

		this.$view.on("click.detail", "[data-delete-record]", () => {
			frappe.confirm(
				__("Delete {0}? This cannot be undone.", [frappe.utils.escape_html(data.name)]),
				async () => {
					const $button = this.$view.find("[data-delete-record]");
					$button.prop("disabled", true).addClass("is-loading");
					try {
						await this.api("delete_document", { key: data.key, name: data.name }, true);
						frappe.show_alert({ message: __("Record deleted"), indicator: "green" });
						await this.show_list(data.key);
					} catch (error) {
						this.notify_error(error);
						$button.prop("disabled", false).removeClass("is-loading");
					}
				}
			);
		});
	};
})();

/**
 * List page ki har row me Edit / Delete icons, aur dropdown data ka cache.
 *
 * Pehle Edit/Delete sirf detail page ke andar the. Ab seedhe list se ho jaate
 * hain — sirf icon, koi text button nahi.
 *
 * Campus aur Location master har form open par dobara fetch ho rahe the, is
 * liye dropdown bharne me der lagti thi. Ab ek baar laa kar cache kar lete
 * hain; refresh button cache clear kar deta hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_table_template = proto.table_template;
	const previous_bind_list_events = proto.bind_list_events;
	const previous_refresh_current_view = proto.refresh_current_view;

	// --- master list cache ---------------------------------------------------
	proto.cached_master_list = async function (doctype, options) {
		this._master_cache = this._master_cache || {};
		if (this._master_cache[doctype]) return this._master_cache[doctype];
		const rows = await frappe.db.get_list(doctype, options);
		this._master_cache[doctype] = rows || [];
		return this._master_cache[doctype];
	};

	proto.refresh_current_view = function () {
		this._master_cache = {};
		return previous_refresh_current_view.call(this);
	};

	// --- row actions ---------------------------------------------------------
	proto.table_template = function (data) {
		const html = previous_table_template.call(this, data);
		const $table = $(html);
		$table.find("tbody tr").each((index, element) => {
			const $row = $(element);
			const name = $row.attr("data-open-record") || "";
			$row.find("td.vmnp-row-action").html(`
				<span class="vmnp-row-actions">
					<button class="vmnp-row-icon" type="button" data-row-edit="${frappe.utils.escape_html(name)}"
						title="${__("Edit")}" aria-label="${__("Edit")}">${this.icon("edit")}</button>
					<button class="vmnp-row-icon vmnp-row-icon-danger" type="button"
						data-row-delete="${frappe.utils.escape_html(name)}"
						title="${__("Delete")}" aria-label="${__("Delete")}">${this.icon("delete")}</button>
				</span>
			`);
		});
		return $("<div>").append($table).html();
	};

	proto.bind_list_events = function (state, data) {
		previous_bind_list_events.call(this, state, data);

		this.$view.on("click.list", "[data-row-edit]", (event) => {
			event.stopPropagation();
			this.show_form(state.key, $(event.currentTarget).attr("data-row-edit"));
		});

		this.$view.on("click.list", "[data-row-delete]", (event) => {
			event.stopPropagation();
			const name = $(event.currentTarget).attr("data-row-delete");
			frappe.confirm(__("Delete {0}? This cannot be undone.", [name]), async () => {
				try {
					await this.api("delete_document", { key: state.key, name }, true);
					frappe.show_alert({ message: __("Record deleted"), indicator: "green" });
					this._master_cache = {};
					await this.show_list(state.key, state);
				} catch (error) {
					this.notify_error(error);
				}
			});
		});
	};
})();

/**
 * From Date / To Date range — har list page par.
 *
 * Pehle har Date field ka apna filter box tha (RTO me do-do). Ab ek hi range
 * hai jo config ke date_field par lagti hai.
 *
 * Default: From = us doctype ka sabse purana record ka date, To = aaj. Is se
 * pehli baar par saare records dikhte hain, kuch chhupta nahi.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_api = proto.api;
	const previous_render_filter_row = proto.render_filter_row;
	const previous_show_list = proto.show_list;

	const today_iso = () => frappe.datetime.get_today();

	proto.api = function (method, args = {}, freeze = false) {
		const range = this._vmnp_date_range || {};
		const is_active_list = args && args.key && args.key === this._vmnp_filters_key;
		if (method === "get_document_list" && is_active_list && (range.from_date || range.to_date)) {
			const active = this._vmnp_filters || {};
			return previous_api
				.call(
					this,
					"get_document_list_multi",
					{
						...args,
						filters: JSON.stringify(active),
						from_date: range.from_date || "",
						to_date: range.to_date || "",
					},
					freeze
				)
				.catch(() => previous_api.call(this, method, args, freeze));
		}
		return previous_api.call(this, method, args, freeze);
	};

	/** Us doctype ka sabse purana date — sirf ek baar, phir cache. */
	proto.earliest_record_date = async function (key) {
		const item = this.menu_items[key];
		const date_field = item?.date_field;
		if (!item?.doctype || !date_field) return "";

		this._earliest_dates = this._earliest_dates || {};
		if (this._earliest_dates[key] !== undefined) return this._earliest_dates[key];

		let earliest = "";
		try {
			const rows = await frappe.db.get_list(item.doctype, {
				fields: [date_field],
				order_by: `${date_field} asc`,
				limit: 1,
			});
			if (rows && rows.length && rows[0][date_field]) {
				earliest = String(rows[0][date_field]).slice(0, 10);
			}
		} catch (error) {
			// Na mile to From khaali — matlab koi lower bound nahi.
		}
		this._earliest_dates[key] = earliest;
		return earliest;
	};

	/** To date kabhi From date se pehle na jaaye — dono taraf se guard. */
	proto.clamp_date_range = function (range) {
		const from_date = range.from_date || "";
		const to_date = range.to_date || "";
		if (from_date && to_date && to_date < from_date) {
			frappe.show_alert({ message: __("To date can't be earlier than From date"), indicator: "orange" });
			return { from_date, to_date: from_date };
		}
		return { from_date, to_date };
	};

	proto.show_list = async function (key, options = {}) {
		if (options.date_range && typeof options.date_range === "object") {
			this._vmnp_date_range = this.clamp_date_range(options.date_range);
		} else if (this._vmnp_date_range_key !== key) {
			// Naye module par pehli baar — default range lagao.
			this._vmnp_date_range = { from_date: await this.earliest_record_date(key), to_date: today_iso() };
		}
		this._vmnp_date_range_key = key;
		return previous_show_list.call(this, key, options);
	};

	proto.render_filter_row = function (key) {
		previous_render_filter_row.call(this, key);

		const item = this.menu_items[key];
		if (!item?.date_field) return;

		const range = this._vmnp_date_range || {};
		let $row = this.$view.find(".vmnp-filter-row");
		if (!$row.length) {
			this.$view.find(".vmnp-list-toolbar").after('<div class="vmnp-filter-row"></div>');
			$row = this.$view.find(".vmnp-filter-row");
		}

		// Native type="date" browser locale me dikhata hai; dd/mm/yyyy ke liye
		// text input + page ke apne date helpers.
		$row.prepend(`
			<label class="vmnp-date-range">
				<span>${__("From")}</span>
				<input class="vmnp-input vmnp-multi-filter" type="text" data-range-from
					placeholder="dd/mm/yyyy" inputmode="numeric"
					value="${frappe.utils.escape_html(this.format_date(range.from_date, ""))}"
					aria-label="${__("From date")}">
			</label>
			<label class="vmnp-date-range">
				<span>${__("To")}</span>
				<input class="vmnp-input vmnp-multi-filter" type="text" data-range-to
					placeholder="dd/mm/yyyy" inputmode="numeric"
					value="${frappe.utils.escape_html(this.format_date(range.to_date, ""))}"
					aria-label="${__("To date")}">
			</label>
		`);

		// Frappe ka datepicker attach karo taaki calendar se date badal sake.
		// Na mile to plain text input hi kaam karta rahega.
		this.attach_range_datepickers(key);

		this.$view.off(".vmnprange");
		this.$view.on("change.vmnprange", "[data-range-from], [data-range-to]", () => {
			const view = this.current_view || {};
			this.show_list(key, {
				...view,
				start: 0,
				filters: this._vmnp_filters || {},
				date_range: {
					from_date: this.parse_display_date(this.$view.find("[data-range-from]").val() || "") || "",
					to_date: this.parse_display_date(this.$view.find("[data-range-to]").val() || "") || "",
				},
			});
		});
	};
})();

/**
 * From / To inputs par Frappe ka datepicker — sabhi modules me.
 *
 * Calendar se date badal sakte hain, aur haath se dd/mm/yyyy type karna bhi
 * chalta rahega. Picker available na ho to sirf typing se kaam chalega.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;

	proto.attach_range_datepickers = function (key) {
		if (!window.$ || !$.fn || typeof $.fn.datepicker !== "function") return;

		const apply = () => {
			const view = this.current_view || {};
			this.show_list(key, {
				...view,
				start: 0,
				filters: this._vmnp_filters || {},
				date_range: {
					from_date: this.parse_display_date(this.$view.find("[data-range-from]").val() || "") || "",
					to_date: this.parse_display_date(this.$view.find("[data-range-to]").val() || "") || "",
				},
			});
		};

		this.$view.find("[data-range-from], [data-range-to]").each((index, element) => {
			const $input = $(element);
			if ($input.data("datepicker")) return;
			try {
				$input.datepicker({
					language: "en",
					dateFormat: "dd/mm/yyyy",
					autoClose: true,
					toggleSelected: false,
					onSelect: () => window.setTimeout(apply, 0),
				});
			} catch (error) {
				// Picker na bane to typing se hi filter lagega.
			}
		});
	};
})();

/**
 * Logout button ka handler, aur From Date ka default.
 *
 * From = चालू month ki 1 tarikh, To = aaj. Pehle From sabse purane record ki
 * date thi; ab month-to-date default hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_bind_shell_events = proto.bind_shell_events;
	const previous_show_list = proto.show_list;

	proto.bind_shell_events = function () {
		previous_bind_shell_events.call(this);
		this.$wrapper.on("click", "[data-logout]", () => {
			frappe.confirm(__("Log out of Dux Digitech?"), () => {
				window.location.href = "/api/method/logout";
			});
		});
	};

	const month_start = () => {
		if (frappe.datetime?.month_start) return frappe.datetime.month_start();
		const today = frappe.datetime.get_today();
		return `${today.slice(0, 7)}-01`;
	};

	proto.show_list = async function (key, options = {}) {
		if (!options.date_range && this._vmnp_date_range_key !== key) {
			// Default range: is month ki 1 tarikh se aaj tak.
			this._vmnp_date_range = { from_date: month_start(), to_date: frappe.datetime.get_today() };
			this._vmnp_date_range_key = key;
		}
		return previous_show_list.call(this, key, options);
	};
})();

(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;

	const vehicle_mappings = {
		vehicle_logs: { type: 'ld_type_of_vehicle', number: 'vehicle_number', name: 'ld_vehicle_name', location: 'ld_vehicle_location' },
		fuel_diesel: { type: 'dd_type_of_vehicle', number: 'dd_vehicle_number', name: 'dd_vehicle_name', location: 'dd_vehicle_location' },
		maintenance: { type: 'md_type_of_vehicle', number: 'md_vehicle_number', name: 'md_vehicle_name', location: 'md_vehicle_location' },
		rto_compliance: { type: 'rto_type_of_vehicle', number: 'rto_vehicle_number', name: 'rto_vehicle_name', location: 'rto_vehicle_location' },
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		const mapping = vehicle_mappings[data.key];
		if (!mapping || !data.name) return;

		const saved_vehicle = String(data.values?.[mapping.number] || '').trim();
		const request_id = [data.key, data.name, saved_vehicle, Date.now()].join(":");
		this._vmnp_edit_vehicle_autofill_id = request_id;

		const fill_details = () => {
			if (this._vmnp_edit_vehicle_autofill_id !== request_id) return;
			const selected_vehicle = String(this.control_value(mapping.number) || saved_vehicle || '').trim();
			if (!selected_vehicle) return;
			this.set_control_value(mapping.number, selected_vehicle);
			if (typeof this.load_extended_vehicle === 'function') {
				void this.load_extended_vehicle(data.key);
			} else if (typeof this.load_power_vehicle === 'function') {
				void this.load_power_vehicle(data.key);
			}
		};

		if (saved_vehicle && typeof this.load_vehicle_number_options === 'function') {
			void this.load_vehicle_number_options(data.key, saved_vehicle).then(fill_details).catch(fill_details);
		} else {
			window.setTimeout(fill_details, 250);
		}
	};
})();

(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_load_vehicle_number_options = proto.load_vehicle_number_options;
	const previous_power_control_changed = proto.power_control_changed;

	const vehicle_mappings = {
		vehicle_logs: { type: 'ld_type_of_vehicle', number: 'vehicle_number', name: 'ld_vehicle_name', location: 'ld_vehicle_location' },
		fuel_diesel: { type: 'dd_type_of_vehicle', number: 'dd_vehicle_number', name: 'dd_vehicle_name', location: 'dd_vehicle_location' },
		maintenance: { type: 'md_type_of_vehicle', number: 'md_vehicle_number', name: 'md_vehicle_name', location: 'md_vehicle_location' },
		rto_compliance: { type: 'rto_type_of_vehicle', number: 'rto_vehicle_number', name: 'rto_vehicle_name', location: 'rto_vehicle_location' },
	};

	proto.vmnp_apply_vehicle_row = function (key, selected_value) {
		const mapping = vehicle_mappings[key];
		const control = mapping ? this.controls[mapping.number] : null;
		if (!mapping || !control) return false;
		const selected = String(selected_value || this.control_value(mapping.number) || '').trim();
		const row = (control._vmnp_vehicle_rows || []).find((item) =>
			String(item.name || '') === selected || String(item.vd_vehicle_number || '') === selected
		);
		if (!row) return false;
		this.set_control_value(mapping.name, row.vd_vehicle_name || '');
		this.set_control_value(mapping.location, row.vd_location || '');
		return true;
	};

	proto.load_vehicle_number_options = async function (key, selected_value = '') {
		const mapping = vehicle_mappings[key];
		const control = mapping ? this.controls[mapping.number] : null;
		if (!mapping || !control) return previous_load_vehicle_number_options.call(this, key, selected_value);

		const vehicle_type = String(this.control_value(mapping.type) || '').trim();
		if (!vehicle_type) return previous_load_vehicle_number_options.call(this, key, selected_value);

		const request_id = [key, vehicle_type, Date.now()].join(':');
		this._vmnp_vehicle_direct_request_id = request_id;
		if (typeof control.set_loading === 'function') control.set_loading(__('Loading vehicle numbers...'));

		try {
			const rows = await frappe.db.get_list('Vehicle Details VMN', {
				fields: ['name', 'vd_vehicle_number', 'vd_vehicle_name', 'vd_type_of_vehicle', 'vd_location'],
				filters: { vd_type_of_vehicle: vehicle_type },
				order_by: 'vd_vehicle_number asc',
				limit: 500,
			});
			if (this._vmnp_vehicle_direct_request_id !== request_id) return;
			control._vmnp_vehicle_rows = rows || [];
			control.set_vehicle_options(rows || [], selected_value);
			this.vmnp_apply_vehicle_row(key, selected_value);
		} catch (error) {
			if (this._vmnp_vehicle_direct_request_id !== request_id) return;
			return previous_load_vehicle_number_options.call(this, key, selected_value);
		}
	};

	proto.power_control_changed = function (key, fieldname) {
		previous_power_control_changed.call(this, key, fieldname);
		const mapping = vehicle_mappings[key];
		if (mapping && fieldname === mapping.number) {
			this.vmnp_apply_vehicle_row(key);
		}
	};
})();


/* VMNP edit vehicle select + latest-list fix 2026-08-04 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;

	const vehicle_mappings = {
		vehicle_logs: { type: "ld_type_of_vehicle", number: "vehicle_number", name: "ld_vehicle_name", location: "ld_vehicle_location" },
		fuel_diesel: { type: "dd_type_of_vehicle", number: "dd_vehicle_number", name: "dd_vehicle_name", location: "dd_vehicle_location" },
		maintenance: { type: "md_type_of_vehicle", number: "md_vehicle_number", name: "md_vehicle_name", location: "md_vehicle_location" },
		rto_compliance: { type: "rto_type_of_vehicle", number: "rto_vehicle_number", name: "rto_vehicle_name", location: "rto_vehicle_location" },
	};

	const clean = (value) => String(value == null ? "" : value).trim();
	const norm = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");

	function find_vehicle_row(rows, selected, saved_name, saved_location) {
		const selected_norm = norm(selected);
		const saved_name_norm = norm(saved_name);
		const saved_location_norm = norm(saved_location);
		return (rows || []).find((row) => {
			const name = clean(row.name);
			const number = clean(row.vd_vehicle_number);
			const vehicle_name = clean(row.vd_vehicle_name);
			const location = clean(row.vd_location);
			const candidates = [name, number, vehicle_name, `${vehicle_name} ${number}`, `${name} ${number}`].map(norm).filter(Boolean);
			return (
				(selected_norm && candidates.some((v) => v === selected_norm || v.includes(selected_norm) || selected_norm.includes(v))) ||
				(saved_name_norm && norm(vehicle_name) === saved_name_norm && (!saved_location_norm || norm(location) === saved_location_norm))
			);
		});
	}

	async function fix_edit_vehicle(portal, data) {
		const mapping = vehicle_mappings[data.key];
		if (!mapping || !data.name) return;
		const control = portal.controls?.[mapping.number];
		if (!control) return;

		const vehicle_type = clean(portal.control_value(mapping.type) || data.values?.[mapping.type]);
		if (!vehicle_type) return;
		const saved_number = clean(data.values?.[mapping.number] || portal.control_value(mapping.number));
		const saved_name = clean(data.values?.[mapping.name] || portal.control_value(mapping.name));
		const saved_location = clean(data.values?.[mapping.location] || portal.control_value(mapping.location));

		try {
			const rows = await frappe.db.get_list("Vehicle Details VMN", {
				fields: ["name", "vd_vehicle_number", "vd_vehicle_name", "vd_type_of_vehicle", "vd_location"],
				filters: { vd_type_of_vehicle: vehicle_type },
				order_by: "vd_vehicle_number asc",
				limit: 500,
			});
			const row = find_vehicle_row(rows, saved_number, saved_name, saved_location);
			control._vmnp_vehicle_rows = rows || [];
			if (typeof control.set_vehicle_options === "function") {
				control.set_vehicle_options(rows || [], row?.vd_vehicle_number || saved_number || row?.name || "");
			}
			if (row) {
				portal.set_control_value(mapping.number, row.vd_vehicle_number || row.name || "");
				portal.set_control_value(mapping.name, row.vd_vehicle_name || "");
				portal.set_control_value(mapping.location, row.vd_location || "");
			}
		} catch (error) {}
	}

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		window.setTimeout(() => fix_edit_vehicle(this, data), 150);
		window.setTimeout(() => fix_edit_vehicle(this, data), 700);
	};
})();


/* VMNP vehicle logs client latest first 2026-08-04 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_list = proto.render_list;
	const numeric_id = (name) => Number(String(name || "").match(/(\d+)\s*$/)?.[1] || 0);
	proto.render_list = function (state, data) {
		if (state?.key === "vehicle_logs" && data?.rows?.length) {
			data = {
				...data,
				rows: [...data.rows].sort((a, b) => numeric_id(b.name) - numeric_id(a.name)),
			};
		}
		return previous_render_list.call(this, state, data);
	};
})();


/* VMNP DG campus/location link query fix 2026-08-04 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_power_link_query = proto.power_link_query;
	proto.power_link_query = function (fieldname) {
		const key = this._power_form_data?.key;
		if (key === "dg_operations" && (fieldname === "dgd_dg_campus" || fieldname === "dg_location")) {
			return () => ({});
		}
		return previous_power_link_query.call(this, fieldname);
	};
})();


/* VMNP vehicles PowerApp field order 2026-08-04 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_power_app_sections = proto.power_app_sections;
	const order = [
		"vd_type_of_vehicle",
		"vd_model_name",
		"vd_vehicle_number",
		"vd_vehicle_name",
		"vd_location",
		"vd_purchase_year",
		"vd_fuel_type",
		"vd_seat_capacity",
	];

	proto.power_app_sections = function (data) {
		const sections = previous_power_app_sections.call(this, data) || [];
		if (data.key !== "vehicles") return sections;

		const field_map = {};
		sections.forEach((section) => {
			(section.fields || []).forEach((field) => {
				field_map[field.fieldname] = field;
			});
		});

		const fields = order.map((fieldname) => field_map[fieldname]).filter(Boolean);
		return fields.length
			? [{ label: __("Vehicle Information"), fields }]
			: sections;
	};
})();


/* VMNP DG campus-location-info cascade 2026-08-04 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_make_control = proto.make_control;
	const previous_render_form = proto.render_form;
	const previous_power_control_changed = proto.power_control_changed;
	const clean = (value) => String(value == null ? "" : value).trim();

	function make_select_control(portal, $slot, field, value, placeholder) {
		const required = field.reqd ? '<b class="vmnp-required">*</b>' : "";
		$slot.html(`
			<label class="vmnp-field-label">${frappe.utils.escape_html(field.label)}${required}</label>
			<select class="vmnp-select" aria-label="${frappe.utils.escape_html(field.label)}" ${field.reqd ? "required" : ""} ${field.read_only ? "disabled" : ""}>
				<option value="">${frappe.utils.escape_html(placeholder)}</option>
			</select>
		`);
		const $select = $slot.find("select");
		const control = {
			$input: $select,
			get_value: () => $select.val() || "",
			set_value: (next) => {
				const next_value = clean(next);
				if (next_value && !$select.find("option").toArray().some((opt) => opt.value === next_value)) {
					$select.append(new Option(next_value, next_value));
				}
				$select.val(next_value);
			},
			set_options: (rows, selected_value = "") => {
				$select.empty().append(new Option(placeholder, ""));
				(rows || []).forEach((row) => row.value && $select.append(new Option(row.label || row.value, row.value)));
				control.set_value(selected_value);
				$select.prop("disabled", Boolean(field.read_only));
			},
			set_loading: (message) => $select.empty().append(new Option(message, "")).prop("disabled", true),
		};
		portal.controls[field.fieldname] = control;
		control.set_value(value);
		$select.on("change", () => portal.power_control_changed(portal._power_form_data?.key, field.fieldname));
		return control;
	}

	proto.make_control = function ($slot, field, value) {
		const key = this._power_form_data?.key;
		if (key === "dg_operations" && field.fieldname === "dgd_dg_campus") {
			return make_select_control(this, $slot, field, value, __("Select DG Campus"));
		}
		if (key === "dg_operations" && field.fieldname === "dg_location") {
			return make_select_control(this, $slot, field, value, __("Select DG Location"));
		}
		return previous_make_control.call(this, $slot, field, value);
	};

	proto.vmnp_load_dg_campuses = async function (selected_value = "") {
		const control = this.controls?.dgd_dg_campus;
		if (!control?.set_options) return;
		control.set_loading(__("Loading DG campuses..."));
		const rows = await frappe.db.get_list("DG Campus VMN", { fields: ["name", "campus_name"], order_by: "campus_name asc", limit: 500 });
		control.set_options((rows || []).map((row) => ({ value: row.name, label: row.campus_name || row.name })), selected_value);
	};

	proto.vmnp_load_dg_locations = async function (selected_value = "") {
		const control = this.controls?.dg_location;
		if (!control?.set_options) return;
		const campus = clean(this.control_value("dgd_dg_campus"));
		if (!campus) { control.set_options([], ""); return; }
		control.set_loading(__("Loading DG locations..."));

		const [campus_rows, info_rows] = await Promise.all([
			frappe.db.get_list("DG Campus VMN", {
				fields: ["name", "dg_location"],
				filters: { name: campus },
				limit: 1,
			}),
			frappe.db.get_list("Diesel Generator Information VMN", {
				fields: ["name", "diesel_generator_location", "diesel_generator_campus", "type_of_diesel_generator", "diesel_generator_number"],
				filters: { diesel_generator_campus: campus },
				order_by: "diesel_generator_location asc",
				limit: 500,
			}),
		]);

		this._vmnp_dg_info_rows = info_rows || [];
		const seen = new Set();
		const options = [];
		const add_location = (location) => {
			location = clean(location);
			if (!location || seen.has(location)) return;
			seen.add(location);
			options.push({ value: location, label: location });
		};
		(campus_rows || []).forEach((row) => add_location(row.dg_location));
		(info_rows || []).forEach((row) => add_location(row.diesel_generator_location));
		control.set_options(options, selected_value || options[0]?.value || "");
		this.vmnp_apply_dg_info();
	};

	proto.vmnp_apply_dg_info = function () {
		const campus = clean(this.control_value("dgd_dg_campus"));
		const location = clean(this.control_value("dg_location"));
		const row = (this._vmnp_dg_info_rows || []).find((item) => clean(item.diesel_generator_campus) === campus && clean(item.diesel_generator_location) === location);
		if (row) {
			this.set_control_value("dg_type", row.type_of_diesel_generator || "");
			this.set_control_value("dg_number", row.diesel_generator_number || "");
		} else if (!location) {
			this.set_control_value("dg_number", "");
		}
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (data.key !== "dg_operations") return;
		const campus = clean(data.values?.dgd_dg_campus);
		const location = clean(data.values?.dg_location);
		void this.vmnp_load_dg_campuses(campus).then(() => this.vmnp_load_dg_locations(location));
	};

	proto.power_control_changed = function (key, fieldname) {
		previous_power_control_changed.call(this, key, fieldname);
		if (key !== "dg_operations") return;
		if (fieldname === "dgd_dg_campus") {
			this.set_control_value("dg_location", "");
			this.set_control_value("dg_number", "");
			void this.vmnp_load_dg_locations("");
		}
		if (fieldname === "dg_location") {
			this.vmnp_apply_dg_info();
			const campus = this.control_value("dgd_dg_campus");
			const location = this.control_value("dg_location");
			void this.api("get_dg_details", { dg_information: location, dg_campus: campus }).then((details) => {
				if (!details) return;
				this.set_control_value("dg_type", details.type_of_diesel_generator || "");
				this.set_control_value("dg_number", details.diesel_generator_number || "");
			}).catch(() => {});
		}
	};
})();


/* VMNP DG Campus location clean dropdown 2026-08-04 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_make_control = proto.make_control;
	const previous_render_form = proto.render_form;
	const clean = (value) => String(value == null ? "" : value).trim();

	function make_location_select(portal, $slot, field, value) {
		const required = field.reqd ? '<b class="vmnp-required">*</b>' : "";
		$slot.html(`
			<label class="vmnp-field-label">${frappe.utils.escape_html(field.label)}${required}</label>
			<select class="vmnp-select" aria-label="${frappe.utils.escape_html(field.label)}" ${field.reqd ? "required" : ""}>
				<option value="">${__("Select DG Location")}</option>
			</select>
		`);
		const $select = $slot.find("select");
		const control = {
			$input: $select,
			get_value: () => $select.val() || "",
			set_value: (next) => {
				const next_value = clean(next);
				if (next_value && !$select.find("option").toArray().some((option) => option.value === next_value)) {
					$select.append(new Option(next_value, next_value));
				}
				$select.val(next_value);
			},
			set_options: (rows, selected_value = "") => {
				$select.empty().append(new Option(__("Select DG Location"), ""));
				(rows || []).forEach((row) => {
					const value = clean(row.name || row.dg_location_name);
					const label = clean(row.dg_location_name || row.name);
					if (value) $select.append(new Option(label || value, value));
				});
				control.set_value(selected_value);
			},
		};
		portal.controls[field.fieldname] = control;
		control.set_value(value);
		return control;
	}

	proto.make_control = function ($slot, field, value) {
		const key = this._power_form_data?.key;
		if (key === "dg_campuses" && field.fieldname === "dg_location") {
			return make_location_select(this, $slot, field, value);
		}
		return previous_make_control.call(this, $slot, field, value);
	};

	proto.vmnp_load_dg_campus_location_options = async function (selected_value = "") {
		const control = this.controls?.dg_location;
		if (!control?.set_options) return;
		const rows = await frappe.db.get_list("DG Location At Campus VMN", {
			fields: ["name", "dg_location_name"],
			order_by: "dg_location_name asc",
			limit: 500,
		});
		control.set_options(rows || [], selected_value);
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (data.key === "dg_campuses") {
			void this.vmnp_load_dg_campus_location_options(data.values?.dg_location || "");
		}
	};
})();

/**
 * Distance / Total DG Unit — asli farq dikhao, negative bhi.
 *
 * Base me Math.max(0, end - start) hai, is liye End Reading kam hone par
 * chup-chaap 0 dikhta tha. Ab minus value bhi dikhti hai, aur dono readings
 * bhare hone par hi calculate hota hai (warna keystroke par -200 flicker aata).
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_calculate = proto.calculate_power_app_fields;

	const reading_map = {
		vehicle_logs: { start: "start_reading", end: "end_reading", target: "ld_distance" },
		dg_operations: { start: "dg_start_reading", end: "dg_end_reading", target: "dg_total_dg_unit" },
	};

	proto.calculate_power_app_fields = function (key) {
		previous_calculate.call(this, key);

		const map = reading_map[key];
		if (!map) return;

		const raw_start = String(this.control_value(map.start) ?? "").trim();
		const raw_end = String(this.control_value(map.end) ?? "").trim();
		if (!raw_start || !raw_end) {
			this.set_control_value(map.target, 0);
			this._last_negative_reading = null;
			return;
		}

		// Negative farq bhi waise hi dikhta hai. Koi warning message nahi —
		// user ko value khud dikh jaati hai.
		const difference = this.number_value(map.end) - this.number_value(map.start);
		this.set_control_value(map.target, difference);
	};
})();

/**
 * Sabhi dropdowns searchable.
 *
 * Native <select> hi source of truth rehta hai — uska value, change event aur
 * get_value/set_value sab waise hi kaam karte hain. Uske upar ek combo box
 * lagta hai: text input + filtered list. Is liye baaki koi code badalna nahi pada.
 *
 * 8 se kam options wale selects ko chhod dete hain — unme search ka fayda nahi.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	// 2 = placeholder + kam se kam ek asli option. Pehle 8 tha, is liye chhote
	// dropdowns (Vehicle Number, Select Campus, To Location) searchable hi nahi bante the.
	const MIN_OPTIONS = 2;

	proto.make_select_searchable = function (select) {
		const $select = $(select);
		if ($select.data("vmnp-combo")) return;
		if ($select.find("option").length < MIN_OPTIONS) return;

		const $combo = $(`
			<div class="vmnp-combo">
				<input class="vmnp-input vmnp-combo-input" type="text" autocomplete="off"
					placeholder="${__("Search…")}" aria-label="${__("Search options")}">
				<ul class="vmnp-combo-list" role="listbox" hidden></ul>
			</div>
		`);

		$select.addClass("vmnp-combo-native").after($combo);
		$select.data("vmnp-combo", true);

		const $input = $combo.find(".vmnp-combo-input");
		const $list = $combo.find(".vmnp-combo-list");

		// const selected_text = () => {
		// 	const option = $select.find("option:selected")[0];
		// 	return option ? option.textContent.trim() : "";
		// };

		const selected_text = () => {
			const option = $select.find("option:selected")[0];

			// Koi value select nahi hai to search/input blank rakho
			if (!option || !option.value) {
				return "";
			}

			return option.textContent.trim();
		};

		const sync_input = () => {
			$input.val(selected_text());
		};

		const close = () => {
			$list.attr("hidden", true).empty();
			sync_input();
		};

		const render = (query) => {
			const needle = String(query || "").trim().toLowerCase();
			const items = $select
				.find("option")
				.toArray()
				.filter((option) => option.value !== "" || !needle)
				.filter((option) => !needle || option.textContent.toLowerCase().includes(needle));

			$list.empty();
			if (!items.length) {
				$list.append(`<li class="vmnp-combo-empty">${__("No match")}</li>`);
			} else {
				items.forEach((option) => {
					$("<li>")
						.attr({ role: "option", "data-value": option.value })
						.toggleClass("is-selected", option.selected)
						.text(option.textContent.trim())
						.appendTo($list);
				});
			}
			$list.removeAttr("hidden");
			position_list();
		};

		/**
		 * List ko fixed coords par rakho.
		 *
		 * Form card par `overflow: hidden` hai, is liye absolute list uske
		 * andar hi kat jaati thi. Fixed hone se koi bhi parent use clip nahi
		 * kar sakta. Jagah kam ho to list input ke upar khul jaati hai.
		 */
		function position_list() {
			const input = $input[0];
			if (!input) return;
			const rect = input.getBoundingClientRect();
			const list_height = Math.min($list[0].scrollHeight || 0, 260);
			const space_below = window.innerHeight - rect.bottom;
			const open_upward = space_below < list_height + 12 && rect.top > list_height + 12;

			$list.css({
				position: "fixed",
				top: open_upward ? Math.max(8, rect.top - list_height - 4) : rect.bottom + 4,
				left: rect.left,
				width: rect.width,
				"max-height": "260px",
				"overflow-y": "auto",
				"z-index": 2000,
			});
		}

		$input.on("focus click", () => render($input.val() === selected_text() ? "" : $input.val()));
		$input.on("input", () => render($input.val()));

		$input.on("keydown", (event) => {
			if (event.key === "Escape") close();
			if (event.key === "Enter") {
				event.preventDefault();
				const $first = $list.find("li[data-value]").first();
				if ($first.length) $first.trigger("mousedown");
			}
		});

		$list.on("mousedown", "li[data-value]", (event) => {
			event.preventDefault();
			$select.val($(event.currentTarget).attr("data-value")).trigger("change");
			close();
		});

		// Page scroll hone par list input se alag ho jaati hai, is liye band kar do.
		$(window).on("scroll.vmnpcombo resize.vmnpcombo", () => {
			if (!$list.attr("hidden")) close();
		});

		$(document).on("mousedown.vmnpcombo", (event) => {
			if (event.target !== $select[0] && !$combo[0].contains(event.target)) close();
		});

		$select.on("change", sync_input);
		sync_input();
	};

	/** Page par jo bhi select hai (aur options load ho chuke hain) usme search lagao. */
	proto.enhance_selects = function () {
		this.$view.find("select.vmnp-select").each((index, element) => {
			this.make_select_searchable(element);
		});
		this.$wrapper.find(".vmnp-control-slot select").each((index, element) => {
			$(element).addClass("vmnp-select");
			this.make_select_searchable(element);
		});
	};
})();

/**
 * enhance_selects ko render ke baad chalao. Options async aate hain, is liye
 * thoda ruk kar bhi ek baar aur — warna khaali select par search lag jaata hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_render_filter_row = proto.render_filter_row;

	const run = (portal) => {
		portal.enhance_selects();
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		run(this);
	};

	if (typeof previous_render_filter_row === "function") {
		proto.render_filter_row = function (key) {
			previous_render_filter_row.call(this, key);
			run(this);
		};
	}
})();

/**
 * Searchable dropdowns — hardened.
 *
 * Pehle enhance_selects ek hi .each() loop me sab selects par chalta tha; kisi
 * ek par exception aaya to baaki sab bina search ke reh jaate the. Ab:
 *
 *  1. har select apne try/catch me — ek fail ho to doosre chalte rahen
 *  2. jo select baad me bane (async options), unhe focus/click par turant
 *     searchable bana dete hain
 *  3. options async aane ke baad combo ka input text dobara sync ho jaata hai
 */
(() => {
	const proto = VehicleManagementPortal.prototype;

	const selector = [
		".vmnp-control-slot select",
		".vmnp-filter-row select",
		".vmnp-list-toolbar select",
		"select.vmnp-select",
	].join(", ");

	/** Combo ka input text native select ki selected option se milao. */
	const sync_combo_text = ($select) => {
		const $combo = $select.next(".vmnp-combo");
		if (!$combo.length) return;
		const option = $select.find("option:selected")[0];
		$combo.find(".vmnp-combo-input").val(option ? option.textContent.trim() : "");
	};

	proto.enhance_selects = function () {
		VehicleManagementPortal._instance = this;

		const targets = [];
		this.$wrapper.find(selector).each((index, element) => targets.push(element));
		this.$view.find("select").each((index, element) => targets.push(element));

		targets.forEach((element) => {
			const $select = $(element);
			try {
				if ($select.data("vmnp-combo")) {
					// Pehle se searchable — bas text refresh kar do.
					sync_combo_text($select);
					return;
				}
				$select.addClass("vmnp-select");
				this.make_select_searchable(element);
				sync_combo_text($select);
			} catch (error) {
				// Ek select fail ho to baaki par asar na pade.
			}
		});
	};

	// Baad me bane selects: focus/click par turant searchable.
	$(document).on("focusin.vmnpsearchable mousedown.vmnpsearchable", ".vmnp-root select", (event) => {
		const portal = VehicleManagementPortal._instance;
		const $select = $(event.currentTarget);
		if (!portal || $select.data("vmnp-combo")) return;
		// Native dropdown khulne se roko — warna combo ke saath dono dikhte hain.
		if (event.type === "mousedown") event.preventDefault();
		try {
			$select.addClass("vmnp-select");
			portal.make_select_searchable(event.currentTarget);
			sync_combo_text($select);
			$select.next(".vmnp-combo").find(".vmnp-combo-input").trigger("focus");
		} catch (error) {
			// Native select hi chalta rahega.
		}
	});
})();

/**
 * Previous Fuel Fill up Reading — usi gaadi ki pichhli entry se apne-aap.
 *
 * Ye field Average ke calculation me use hoti hai:
 *   Average = dd_fuel_fill_up_reading - dd_previous_fuel_fill_up_reading
 * Par ise koi bharta hi nahi tha, is liye Average galat aata tha.
 *
 * Ab vehicle number chunte hi us gaadi ki aakhri Fuel entry ka
 * dd_fuel_fill_up_reading yahan aa jaata hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_power_control_changed = proto.power_control_changed;

	const FUEL_KEY = "fuel_diesel";
	const NUMBER_FIELD = "dd_vehicle_number";
	const PREVIOUS_FIELD = "dd_previous_fuel_fill_up_reading";
	const CURRENT_FIELD = "dd_fuel_fill_up_reading";

	proto.load_previous_fuel_reading = async function (current_name = null) {
		const vehicle = this.control_value(NUMBER_FIELD);
		if (!vehicle) return;

		const request_id = `fuel:${vehicle}:${Date.now()}`;
		this._previous_fuel_request_id = request_id;

		try {
			const rows = await frappe.db.get_list("Diesel Details VMN", {
				filters: { [NUMBER_FIELD]: vehicle },
				fields: ["name", CURRENT_FIELD],
				order_by: "dd_date desc, creation desc",
				limit: 5,
			});
			if (this._previous_fuel_request_id !== request_id) return;

			// Edit karte waqt khud ka record chhod do, warna apni hi reading aa jayegi.
			const previous = (rows || []).find(
				(row) => row.name !== current_name && row[CURRENT_FIELD] != null && row[CURRENT_FIELD] !== ""
			);
			if (!previous) return;

			this.set_control_value(PREVIOUS_FIELD, previous[CURRENT_FIELD]);
			this.calculate_power_app_fields(FUEL_KEY);
		} catch (error) {
			// Na mile to user khud bhar lega.
		}
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (data.key !== FUEL_KEY) return;
		// Naye record par, aur edit par bhi jab field khaali ho.
		const existing = String(data.values?.[PREVIOUS_FIELD] ?? "").trim();
		if (data.is_new || !existing || Number(existing) === 0) {
			void this.load_previous_fuel_reading(data.is_new ? null : data.name);
		}
	};

	proto.power_control_changed = function (key, fieldname) {
		previous_power_control_changed.call(this, key, fieldname);
		if (key === FUEL_KEY && fieldname === NUMBER_FIELD) {
			void this.load_previous_fuel_reading(this._power_form_data?.name || null);
		}
	};
})();

/**
 * Teen chhote fixes:
 *
 * 1. Orphan select arrows — combo banne par native select 1px ho jaata hai, par
 *    Frappe ke Select control ke up/down arrows (.select-icon) reh jaate the aur
 *    do columns ke beech tairte dikhte the. Unhe chhupa dete hain.
 * 2. Start Reading read-only — value pichhli entry ke End Reading se aati hai.
 * 3. End < Start ka toast hata diya — value (minus me) waise hi dikhti rahegi.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_enhance_selects = proto.enhance_selects;
	proto.enhance_selects = function () {
		previous_enhance_selects.call(this);
		// Combo wale slots me native select ke arrows chhupao.
		this.$wrapper.find(".vmnp-combo").each((index, element) => {
			$(element)
				.closest(".vmnp-control-slot, .control-input, .select-input")
				.find(".select-icon, .select-arrow")
				.hide();
		});
	};
})();

/**
 * Campus form ka Supervisor Name field.
 *
 * Server ise bhejta hai (verify kiya: hidden=0, permlevel=0), par client par
 * render nahi ho raha tha. Is liye wahi native-select pattern de rahe hain jo
 * Campus aur Location dropdowns me chal raha hai — options
 * "Supervisor for Campus VMN" master se aate hain aur searchable bhi ban jaate
 * hain.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_make_control = proto.make_control;
	const previous_render_form = proto.render_form;

	const SUPERVISOR_FIELD = "supervisor_name";
	const SUPERVISOR_DOCTYPE = "Supervisor for Campus VMN";

	proto.make_control = function ($slot, field, value) {
		if (field.fieldname !== SUPERVISOR_FIELD || field.fieldtype !== "Link") {
			return previous_make_control.call(this, $slot, field, value);
		}

		const label = frappe.utils.escape_html(field.label || field.fieldname);
		$slot.html(`
			<label class="vmnp-field-label">
				${label}${field.reqd ? '<b class="vmnp-required">*</b>' : ""}
			</label>
			<select class="vmnp-select vmnp-supervisor-select" aria-label="${label}"
				${field.reqd ? "required" : ""} ${field.read_only ? "disabled" : ""}>
				<option value="">${__("Loading supervisors…")}</option>
			</select>
		`);

		const $select = $slot.find(".vmnp-supervisor-select");
		this.controls[field.fieldname] = {
			$input: $select,
			get_value: () => $select.val() || "",
			set_value: (next) => {
				const next_value = String(next == null ? "" : next);
				if (
					next_value &&
					!$select.find("option").toArray().some((option) => option.value === next_value)
				) {
					$select.append(new Option(next_value, next_value));
				}
				$select.val(next_value);
			},
			set_supervisor_options: (rows, selected = "") => {
				$select.empty().append(new Option(__("Select supervisor"), ""));
				const seen = new Set();
				(rows || []).forEach((row) => {
					const option_value = String(row.name || "").trim();
					if (!option_value || seen.has(option_value)) return;
					seen.add(option_value);
					const text = String(row.supervisor_name || option_value).trim();
					$select.append(new Option(text, option_value));
				});
				$select.val(String(selected || ""));
				$select.prop("disabled", Boolean(field.read_only));
			},
			set_loading: (message) => {
				$select.empty().append(new Option(message, "")).prop("disabled", true);
			},
		};
		this.controls[field.fieldname].set_value(value);
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);

		const has_field = (data.sections || [])
			.flatMap((section) => section.fields || [])
			.some((field) => field.fieldname === SUPERVISOR_FIELD);
		if (!has_field) return;

		void this.load_supervisor_options(data.values?.[SUPERVISOR_FIELD] || "");
	};

	proto.load_supervisor_options = async function (selected = "") {
		const control = this.controls[SUPERVISOR_FIELD];
		if (!control || typeof control.set_supervisor_options !== "function") return;

		try {
			const rows = await this.cached_master_list(SUPERVISOR_DOCTYPE, {
				fields: ["name", "supervisor_name"],
				order_by: "supervisor_name asc",
				limit: 500,
			});

			// supervisor_name ab Link -> User hai, to usme user id (email) hoti hai.
			// Dropdown me email ki jagah username dikhana hai.
			const users = await this.cached_master_list("User", {
				fields: ["name", "full_name"],
				limit: 1000,
			});
			const full_names = {};
			(users || []).forEach((user) => {
				if (user.full_name) full_names[user.name] = user.full_name;
			});
			const labelled = (rows || []).map((row) => ({
				...row,
				supervisor_name: full_names[row.supervisor_name] || row.supervisor_name || row.name,
			}));

			control.set_supervisor_options(labelled, selected);
			this.enhance_selects();
		} catch (error) {
			control.set_loading(__("Unable to load supervisors"));
		}
	};
})();

/**
 * Campus ab Vehicle Location ke hisaab se filter hota hai.
 *
 * Chain: Vehicle Number  →  Vehicle Name + Location (auto)  →  Campus
 *
 * Campus master ka cd_location us vehicle ke location se match karna chahiye.
 * Location abhi khaali ho to saare campus dikhte hain (warna pehli baar me
 * dropdown khaali lagta hai).
 *
 * Vehicle badalte hi campus list dobara bhar jaati hai; agar pehle chuna hua
 * campus nayi location me nahi hai to wo clear ho jaata hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_load_campus_options = proto.load_campus_options;
	const previous_power_control_changed = proto.power_control_changed;

	const campus_chain = {
		vehicle_logs: { number: "vehicle_number", location: "ld_vehicle_location", campus: "ld_select_campus" },
		fuel_diesel: { number: "dd_vehicle_number", location: "dd_vehicle_location", campus: "dd_select_campus" },
		maintenance: { number: "md_vehicle_number", location: "md_vehicle_location", campus: "md_select_campus" },
		rto_compliance: { number: "rto_vehicle_number", location: "rto_vehicle_location", campus: "rto_select_campus" },
	};

	const norm = (value) => String(value == null ? "" : value).trim().toLowerCase();

	proto.load_campus_options = async function (fieldname, selected_value = "") {
		const control = this.controls[fieldname];
		if (!control || typeof control.set_campus_options !== "function") {
			return previous_load_campus_options.call(this, fieldname, selected_value);
		}

		const key = this._power_form_data?.key;
		const chain = campus_chain[key];
		const location = chain ? norm(this.control_value(chain.location)) : "";

		control.set_loading(__("Loading campuses…"));
		try {
			const rows = await this.cached_master_list("Campus Details VMN", {
				fields: ["name", "cd_campus_name", "cd_location"],
				order_by: "cd_campus_name asc",
				limit: 500,
			});

			const wanted_early = String(selected_value || "");

			// Location khaali ho to koi campus na dikhao — pehle vehicle chuno.
			// Edit me agar campus saved hai to sirf wahi dikhta hai, taaki value mite nahi.
			if (!location) {
				if (wanted_early) {
					const saved_only = (rows || []).filter((row) => String(row.name) === wanted_early);
					control.set_campus_options(saved_only, wanted_early);
				} else {
					control.set_loading(__("Select vehicle first"));
				}
				this.enhance_selects();
				return;
			}

			const filtered = (rows || []).filter((row) => norm(row.cd_location) === location);

			// Edit me pehle se saved campus hamesha list me rahe — chahe uski
			// location vehicle ki location se match na kare. Warna purana record
			// kholte hi campus khaali dikhta hai aur save karne par mit jaata.
			const wanted = String(selected_value || "");
			if (wanted && !filtered.some((row) => String(row.name) === wanted)) {
				const saved = (rows || []).find((row) => String(row.name) === wanted);
				if (saved) filtered.unshift(saved);
			}

			control.set_campus_options(filtered, wanted);
			this.enhance_selects();
		} catch (error) {
			control.set_loading(__("Unable to load campuses"));
		}
	};

	proto.power_control_changed = function (key, fieldname) {
		previous_power_control_changed.call(this, key, fieldname);

		const chain = campus_chain[key];
		if (!chain) return;

		// Vehicle ya location badla → campus list dobara bharo.
		if (fieldname === chain.number || fieldname === chain.location) {
			window.setTimeout(() => {
				void this.load_campus_options(chain.campus, this.control_value(chain.campus) || "");
			}, 0);
		}
	};
})();

/**
 * Previous Fuel Fill up Reading — us gaadi ki pichhli entry se.
 *
 * Naye record me vehicle chunte hi bhar jaata hai. Edit me saved value hi
 * dikhti hai (history nahi badalti); sirf tab bhara jaata hai jab saved value
 * khaali ya 0 ho. Apna hi record calculation me nahi ginte.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_power_control_changed = proto.power_control_changed;

	const FIELDS = {
		key: "fuel_diesel",
		doctype: "Diesel Details VMN",
		number: "dd_vehicle_number",
		date: "dd_date",
		current: "dd_fuel_fill_up_reading",
		previous: "dd_previous_fuel_fill_up_reading",
	};

	proto.load_previous_fuel_reading = async function (exclude_name = null, force = false) {
		const control = this.controls[FIELDS.previous];
		if (!control) return;

		const vehicle = String(this.control_value(FIELDS.number) || "").trim();
		if (!vehicle) return;

		// Edit me saved value ko chhedo mat — sirf khaali/0 ho to bharo.
		if (!force) {
			const existing = String(this.control_value(FIELDS.previous) ?? "").trim();
			if (existing && Number(existing) !== 0) return;
		}

		const request_id = `${vehicle}:${Date.now()}`;
		this._previous_fuel_request_id = request_id;

		try {
			const filters = { [FIELDS.number]: vehicle };
			if (exclude_name) filters.name = ["!=", exclude_name];

			const rows = await frappe.db.get_list(FIELDS.doctype, {
				fields: [FIELDS.current, FIELDS.date],
				filters,
				order_by: `${FIELDS.date} desc, creation desc`,
				limit: 1,
			});
			if (this._previous_fuel_request_id !== request_id) return;

			const value = rows && rows.length ? rows[0][FIELDS.current] : null;
			if (value == null || value === "") return;

			this.set_control_value(FIELDS.previous, value);
			this.calculate_power_app_fields(FIELDS.key);
		} catch (error) {
			// Na mile to jo value hai wahi rahegi.
		}
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (data.key !== FIELDS.key) return;
		// Naye record par force, edit par sirf khaali hone pe.
		void this.load_previous_fuel_reading(data.is_new ? null : data.name, Boolean(data.is_new));
	};

	proto.power_control_changed = function (key, fieldname) {
		previous_power_control_changed.call(this, key, fieldname);
		if (key === FIELDS.key && fieldname === FIELDS.number) {
			const view = this.current_view || {};
			void this.load_previous_fuel_reading(view.name || null, true);
		}
	};
})();

/**
 * Save-time validations + Fuel average gating + list me Link ka naam.
 *
 * Validation save par chalti hai, har keystroke par nahi — warna type karte
 * waqt hi baar-baar popup aata rehta.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_save_form = proto.save_form;
	const previous_calculate = proto.calculate_power_app_fields;
	const previous_bind_list_events = proto.bind_list_events;

	/** Har module ke rules. Khaali array = sab theek. */
	const validators = {
		vehicle_logs: (v) => {
			const errors = [];
			const start = v("start_reading");
			const end = v("end_reading");
			if (end < start) {
				errors.push(__("Distance cannot be negative — End Reading ({0}) is less than Start Reading ({1}).", [end, start]));
			}
			return errors;
		},
		dg_operations: (v) => {
			const errors = [];
			const start = v("dg_start_reading");
			const end = v("dg_end_reading");
			if (end < start) {
				errors.push(__("Distance cannot be negative — End Reading ({0}) is less than Start Reading ({1}).", [end, start]));
			}
			return errors;
		},
		fuel_diesel: (v) => {
			const errors = [];
			const average = v("dd_average");
			if (average < 0) errors.push(__("Average cannot be negative."));
			return errors;
		},
		rto_compliance: (v, raw) => {
			const errors = [];
			const issued = raw("issued_date");
			const expired = raw("expired_date");
			if (issued && expired && String(expired) < String(issued)) {
				errors.push(__("Expiry Date cannot be earlier than Issue Date."));
			}
			return errors;
		},
	};

	proto.save_form = function (data, submit) {
		const validate = validators[data.key];
		if (validate) {
			const num = (fieldname) => this.number_value(fieldname);
			const raw = (fieldname) => this.control_value(fieldname);
			const errors = validate(num, raw);
			if (errors.length) {
				frappe.msgprint({
					title: __("Check form"),
					message: errors.map((line) => `• ${line}`).join("<br>"),
					indicator: "red",
				});
				return;
			}
		}
		return previous_save_form.call(this, data, submit);
	};

	proto.calculate_power_app_fields = function (key) {
		previous_calculate.call(this, key);
		if (key !== "fuel_diesel") return;

		// Average sirf tab dikhe jab Fuel Fill up Reading bhari ho.
		const fill_up = String(this.control_value("dd_fuel_fill_up_reading") ?? "").trim();
		if (!fill_up) {
			this.set_control_value("dd_average", "");
			return;
		}
		if (this.number_value("dd_average") < 0) this.set_control_value("dd_average", "");
	};

	proto.bind_list_events = function (state, data) {
		previous_bind_list_events.call(this, state, data);
		void this.resolve_list_link_titles(data);
	};

	/** List ke Link columns me docname ki jagah asli naam. */
	proto.resolve_list_link_titles = async function (data) {
		const link_columns = (data.columns || []).filter(
			(column) => column.fieldtype === "Link" && column.options
		);
		if (!link_columns.length) return;

		const jobs = [];
		link_columns.forEach((column) => {
			this.$view.find(`td[data-fieldname="${column.fieldname}"]`).each((index, element) => {
				const $cell = $(element);
				const value = $cell.text().trim();
				if (!value || value === "—") return;
				jobs.push(
					this.fetch_link_title(column.options, value).then((title) => {
						if (title && title !== value) $cell.text(title);
					})
				);
			});
		});
		await Promise.all(jobs);
	};
})();

/**
 * DG Operations: Diesel Rate field form me dikhao.
 *
 * dg_diesel_rateltr doctype me pehle se hai par layout me nahi tha, is liye
 * hamesha khaali rehta tha aur Total Amount 0 aata tha.
 *
 * Ab wo Diesel Consumption ke baad dikhta hai, naye record par default 91.4,
 * aur Total Amount = Consumption x Rate. Har entry apna rate yaad rakhti hai,
 * is liye rate badalne par purane records ka amount nahi badalta.
 */
// (() => {
// 	const proto = VehicleManagementPortal.prototype;
// 	const previous_power_app_sections = proto.power_app_sections;
// 	const previous_render_form = proto.render_form;
// 	const previous_calculate = proto.calculate_power_app_fields;

// 	const RATE_FIELD = "dg_diesel_rateltr";
// 	const DEFAULT_RATE = 91.4;

// 	// proto.power_app_sections = function (data) {
// 	// 	const sections = previous_power_app_sections.call(this, data) || [];
// 	// 	if (data.key !== "dg_operations") return sections;

// 	// 	const already = sections.some((section) =>
// 	// 		(section.fields || []).some((field) => field.fieldname === RATE_FIELD)
// 	// 	);
// 	// 	if (already) return sections;

// 	// 	// Server saare fields bhejta hai; layout filter ne ise chhod diya tha.
// 	// 	const rate_field = (data.sections || [])
// 	// 		.flatMap((section) => section.fields || [])
// 	// 		.find((field) => field.fieldname === RATE_FIELD);
// 	// 	if (!rate_field) return sections;

// 	// 	const target = sections.find((section) =>
// 	// 		(section.fields || []).some((field) => field.fieldname === "dg_diesel_consumption")
// 	// 	);
// 	// 	if (!target) return sections;

// 	// 	const at = target.fields.findIndex((field) => field.fieldname === "dg_diesel_consumption");
// 	// 	target.fields.splice(at + 1, 0, { ...rate_field, label: __("Diesel Rate (₹/Ltr)") });
// 	// 	return sections;
// 	// };

	

// 	proto.render_form = function (data) {
// 		previous_render_form.call(this, data);
// 		if (data.key !== "dg_operations") return;

// 		const current = String(this.control_value(RATE_FIELD) ?? "").trim();
// 		if (!current || Number(current) === 0) {
// 			this.set_control_value(RATE_FIELD, DEFAULT_RATE);
// 		}
// 		this.calculate_power_app_fields("dg_operations");
// 	};

// 	proto.calculate_power_app_fields = function (key) {
// 		previous_calculate.call(this, key);
// 		if (key !== "dg_operations") return;

// 		// Purana code sirf tab set karta tha jab dono non-zero hon, is liye
// 		// consumption khaali karne par stale amount pada rehta tha.
// 		const consumption = this.number_value("dg_diesel_consumption");
// 		const rate = this.number_value(RATE_FIELD);
// 		this.set_control_value("dg_total_amount", consumption && rate ? consumption * rate : 0);
// 	};
// })();


(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_calculate = proto.calculate_power_app_fields;

	const RATE_FIELD = "dg_diesel_rateltr";
	const DEFAULT_RATE = 91.4;

	proto.render_form = function (data) {
		previous_render_form.call(this, data);

		if (data.key !== "dg_operations") return;

		// Saved rate हो तो वही लें, अन्यथा default ₹91.40
		const saved_rate = Number(data.values?.[RATE_FIELD]);

		this._dg_diesel_rate =
			Number.isFinite(saved_rate) && saved_rate > 0
				? saved_rate
				: DEFAULT_RATE;

		/*
		 * Diesel Rate screen पर दिखाई नहीं देगा,
		 * लेकिन Save करते समय backend में value जाएगी।
		 */
		this.controls[RATE_FIELD] = {
			get_value: () => this._dg_diesel_rate,

			set_value: (value) => {
				const rate = Number(value);

				this._dg_diesel_rate =
					Number.isFinite(rate) && rate > 0
						? rate
						: DEFAULT_RATE;
			},
		};

		this.calculate_power_app_fields("dg_operations");
	};

	proto.calculate_power_app_fields = function (key) {
		previous_calculate.call(this, key);

		if (key !== "dg_operations") return;

		const consumption = this.number_value(
			"dg_diesel_consumption"
		);

		const rate =
			Number(this._dg_diesel_rate) || DEFAULT_RATE;

		const total_amount =
			Math.round(consumption * rate * 100) / 100;

		this.set_control_value(
			"dg_total_amount",
			total_amount
		);
	};
})();

/**
 * Live validation + flicker fix.
 *
 * Flicker ki wajah: derived fields (Distance, Average, Total DG Unit) har
 * keystroke par recalculate hote the, to "1 -> 14 -> 140" type karte waqt
 * beech ki adhuri values flash karti thi. Ab calculation `change` par chalti
 * hai (field chhodne par), `input` par nahi.
 *
 * Validation bhi wahin chalti hai — save se pehle hi popup aa jaata hai. Ek hi
 * message baar-baar na aaye, is liye de-dup key rakhi hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;

	const CALC_FIELDS = /reading|time|quantity|rate|consumption/i;

	/** Live rules — save wale validators ke saath consistent. */
	const live_rules = {
		vehicle_logs: (num, raw) => {
			const messages = [];
			if (String(raw("end_reading") ?? "").trim()) {
				const start = num("start_reading");
				const end = num("end_reading");
				if (end < start) {
					messages.push(
						__("Distance cannot be negative — End Reading ({0}) is less than Start Reading ({1}).", [end, start])
					);
				}
			}
			return messages;
		},
		dg_operations: (num, raw) => {
			const messages = [];
			if (String(raw("dg_end_reading") ?? "").trim()) {
				const start = num("dg_start_reading");
				const end = num("dg_end_reading");
				if (end < start) {
					messages.push(
						__("Distance cannot be negative — End Reading ({0}) is less than Start Reading ({1}).", [end, start])
					);
				}
			}
			return messages;
		},
		fuel_diesel: (num, raw) => {
			const messages = [];
			const fill_up_raw = String(raw("dd_fuel_fill_up_reading") ?? "").trim();
			if (fill_up_raw) {
				const fill_up = num("dd_fuel_fill_up_reading");
				const previous = num("dd_previous_fuel_fill_up_reading");
				if (previous && fill_up <= previous) {
					messages.push(
						__("Fuel Fill up Reading ({0}) must be greater than Previous Fuel Fill up Reading ({1}).", [
							fill_up,
							previous,
						])
					);
				}
			}
			return messages;
		},
		rto_compliance: (num, raw) => {
			const messages = [];
			const issued = raw("issued_date");
			const expired = raw("expired_date");
			if (issued && expired && String(expired) < String(issued)) {
				messages.push(__("Expiry Date cannot be earlier than Issue Date."));
			}
			return messages;
		},
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);

		const $form = this.$view.find("[data-record-form]");
		// Purane input+change handlers hatao — flicker unhi se aata tha.
		$form.off(".vmnpcalc");
		this._live_warning_key = null;

		const run = () => {
			if (this._power_initialising) return;
			this.calculate_power_app_fields(data.key);
			this.run_live_validation(data.key);
		};

		$form.on("change.vmnpcalc", ".vmnp-control-slot input, .vmnp-control-slot select", (event) => {
			const fieldname =
				$(event.currentTarget).closest("[data-control-field]").attr("data-control-field") || "";
			if (!CALC_FIELDS.test(fieldname) && !/date/i.test(fieldname)) return;
			run();
		});
	};

	proto.run_live_validation = function (key) {
		const rule = live_rules[key];
		if (!rule) return;

		const num = (fieldname) => this.number_value(fieldname);
		const raw = (fieldname) => this.control_value(fieldname);
		const messages = rule(num, raw);

		if (!messages.length) {
			this._live_warning_key = null;
			return;
		}

		// Wahi message dobara na dikhe jab tak value badal na jaye.
		const signature = messages.join("|");
		if (this._live_warning_key === signature) return;
		this._live_warning_key = signature;

		frappe.msgprint({
			title: __("Check form"),
			message: messages.map((line) => `• ${line}`).join("<br>"),
			indicator: "red",
		});
	};
})();

/**
 * 1. Bacha hua flicker: base form `input.powerform` par power_control_changed
 *    chalata tha, matlab har keystroke par recalc. Sirf us `input` handler ko
 *    hata dete hain; `change.powerform` bana rehta hai, is liye selects aur
 *    blur-based updates waise hi kaam karte hain.
 *
 * 2. Fuel Station aur Trust Name ab native select hain (baaki dropdowns jaise),
 *    Frappe ke Link + awesomplete ki jagah. Wo slow tha aur design bhi alag.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_make_control = proto.make_control;
	const previous_render_form = proto.render_form;

	const MASTER_SELECTS = {
		dd_fuel_station_name: { doctype: "Fuel Station VMN", label_field: "fuel_station_name" },
		trust_name: { doctype: "Trust Name VMN", label_field: "tn_trust_name" },
	};

	proto.make_control = function ($slot, field, value) {
		const config = MASTER_SELECTS[field.fieldname];
		if (!config) return previous_make_control.call(this, $slot, field, value);

		const label = frappe.utils.escape_html(field.label || field.fieldname);
		$slot.html(`
			<label class="vmnp-field-label">
				${label}${field.reqd ? '<b class="vmnp-required">*</b>' : ""}
			</label>
			<select class="vmnp-select vmnp-master-select" aria-label="${label}"
				${field.reqd ? "required" : ""} ${field.read_only ? "disabled" : ""}>
				<option value="">${__("Loading…")}</option>
			</select>
		`);

		const $select = $slot.find(".vmnp-master-select");
		this.controls[field.fieldname] = {
			$input: $select,
			get_value: () => $select.val() || "",
			set_value: (next) => {
				const next_value = String(next == null ? "" : next);
				if (
					next_value &&
					!$select.find("option").toArray().some((option) => option.value === next_value)
				) {
					$select.append(new Option(next_value, next_value));
				}
				$select.val(next_value);
			},
			set_master_options: (rows, selected = "") => {
				$select.empty().append(new Option(__("Select {0}", [field.label || ""]).trim(), ""));
				const seen = new Set();
				(rows || []).forEach((row) => {
					const option_value = String(row.name || "").trim();
					if (!option_value || seen.has(option_value)) return;
					seen.add(option_value);
					const text = String(row[config.label_field] || option_value).trim();
					$select.append(new Option(text, option_value));
				});
				$select.val(String(selected || ""));
				$select.prop("disabled", Boolean(field.read_only));
			},
			set_loading: (message) => {
				$select.empty().append(new Option(message, "")).prop("disabled", true);
			},
		};
		this.controls[field.fieldname].set_value(value);
	};

	proto.load_master_select_options = async function (data) {
		const present = (data.sections || [])
			.flatMap((section) => section.fields || [])
			.map((field) => field.fieldname)
			.filter((fieldname) => MASTER_SELECTS[fieldname]);
		if (!present.length) return;

		await Promise.all(
			present.map(async (fieldname) => {
				const config = MASTER_SELECTS[fieldname];
				const control = this.controls[fieldname];
				if (!control?.set_master_options) return;
				try {
					const rows = await this.cached_master_list(config.doctype, {
						fields: ["name", config.label_field],
						order_by: `${config.label_field} asc`,
						limit: 500,
					});
					control.set_master_options(rows, data.values?.[fieldname] || "");
				} catch (error) {
					control.set_loading(__("Unable to load options"));
				}
			})
		);
		this.enhance_selects();
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		// Keystroke-driven recalc band — yahi flicker ki jad thi.
		this.$view.off("input.powerform");
		void this.load_master_select_options(data);
	};
})();

/**
 * Previous Fuel Fill up Reading edit me khaali reh jaata tha.
 *
 * Wajah: render_form turant loader chalata hai, par us waqt vehicle select ke
 * options async load ho rahe hote hain — to control_value(dd_vehicle_number)
 * khaali hoti hai aur loader `if (!vehicle) return` par nikal jaata hai.
 *
 * Fix: vehicle value aa jane tak thoda-thoda retry (max ~2 second).
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;

	const KEY = "fuel_diesel";
	const NUMBER_FIELD = "dd_vehicle_number";
	const MAX_ATTEMPTS = 10;
	const GAP_MS = 200;

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (data.key !== KEY) return;

		const token = {};
		this._fuel_retry_token = token;

		const attempt = (count) => {
			// Beech me doosra form khul gaya to ruk jao.
			if (this._fuel_retry_token !== token) return;
			if (count > MAX_ATTEMPTS) return;

			const vehicle = String(this.control_value(NUMBER_FIELD) || "").trim();
			if (!vehicle) {
				window.setTimeout(() => attempt(count + 1), GAP_MS);
				return;
			}
			void this.load_previous_fuel_reading(data.is_new ? null : data.name, Boolean(data.is_new));
		};

		attempt(0);
	};
})();

/**
 * 1. Vehicles form ka Location — free text ki jagah dropdown, data Locations
 *    master se. Field doctype me Data hai, aur us master ka docname hi
 *    location_name hai, is liye value text hi rehti hai — campus matching
 *    (jo case-insensitive hai) waise hi chalti rahegi. Koi migrate nahi.
 *
 * 2. Maintenance ka Vendor Name — Frappe Link + awesomplete ki jagah wahi
 *    native select jaisa baaki dropdowns hain.
 *
 * 3. Total Repairing Amount se read-only hataya.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_make_control = proto.make_control;
	const previous_render_form = proto.render_form;

	const LOOKUPS = {
		vd_location: { doctype: "Location Details VMN", label_field: "location_name" },
		md_vendor_name: { doctype: "Vendor Details VMN", label_field: "vendor_name" },
	};

	const EDITABLE = ["md_total_repairingamount"];

	proto.make_control = function ($slot, field, value) {
		const config = LOOKUPS[field.fieldname];
		if (!config) return previous_make_control.call(this, $slot, field, value);

		const label = frappe.utils.escape_html(field.label || field.fieldname);
		$slot.html(`
			<label class="vmnp-field-label">
				${label}${field.reqd ? '<b class="vmnp-required">*</b>' : ""}
			</label>
			<select class="vmnp-select vmnp-lookup-select" aria-label="${label}"
				${field.reqd ? "required" : ""} ${field.read_only ? "disabled" : ""}>
				<option value="">${__("Loading…")}</option>
			</select>
		`);

		const $select = $slot.find(".vmnp-lookup-select");
		this.controls[field.fieldname] = {
			$input: $select,
			get_value: () => $select.val() || "",
			set_value: (next) => {
				const next_value = String(next == null ? "" : next);
				if (
					next_value &&
					!$select.find("option").toArray().some((option) => option.value === next_value)
				) {
					// Purani value master me na ho to bhi dikhe — warna edit me mit jaati.
					$select.append(new Option(next_value, next_value));
				}
				$select.val(next_value);
			},
			set_lookup_options: (rows, selected = "") => {
				$select.empty().append(new Option(__("Select {0}", [field.label || ""]).trim(), ""));
				const seen = new Set();
				(rows || []).forEach((row) => {
					const text = String(row[config.label_field] || row.name || "").trim();
					if (!text || seen.has(text)) return;
					seen.add(text);
					$select.append(new Option(text, text));
				});
				const wanted = String(selected || "");
				if (wanted && !seen.has(wanted)) $select.append(new Option(wanted, wanted));
				$select.val(wanted);
				$select.prop("disabled", Boolean(field.read_only));
			},
			set_loading: (message) => {
				$select.empty().append(new Option(message, "")).prop("disabled", true);
			},
		};
		this.controls[field.fieldname].set_value(value);
	};

	proto.load_lookup_select_options = async function (data) {
		const present = (data.sections || [])
			.flatMap((section) => section.fields || [])
			.map((field) => field.fieldname)
			.filter((fieldname) => LOOKUPS[fieldname]);
		if (!present.length) return;

		await Promise.all(
			present.map(async (fieldname) => {
				const config = LOOKUPS[fieldname];
				const control = this.controls[fieldname];
				if (!control?.set_lookup_options) return;
				try {
					const rows = await this.cached_master_list(config.doctype, {
						fields: ["name", config.label_field],
						order_by: `${config.label_field} asc`,
						limit: 500,
					});
					control.set_lookup_options(rows, data.values?.[fieldname] || "");
				} catch (error) {
					control.set_loading(__("Unable to load options"));
				}
			})
		);
		this.enhance_selects();
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		void this.load_lookup_select_options(data);

		// Amount user khud bhar sake.
		EDITABLE.forEach((fieldname) => {
			this.$view
				.find(`[data-control-field="${fieldname}"]`)
				.find("input")
				.prop("readonly", false)
				.prop("disabled", false)
				.removeAttr("tabindex");
		});
	};
})();

/**
 * Total Repairing Amount doctype me read_only: 1 hai, is liye wo control hi
 * read-only banta tha (input hi nahi bharta). Control banne se pehle flag hata
 * dete hain — doctype waise ka waisa rehta hai, koi migrate nahi.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_make_control = proto.make_control;

	const FORCE_EDITABLE = new Set(["md_total_repairingamount"]);

	proto.make_control = function ($slot, field, value) {
		if (FORCE_EDITABLE.has(field.fieldname) && field.read_only) {
			field = { ...field, read_only: 0 };
		}
		return previous_make_control.call(this, $slot, field, value);
	};
})();

/**
 * supervisor_name do alag jagah aata hai:
 *
 *   Campus form      -> Link to "Supervisor for Campus VMN"  (supervisor chuno)
 *   Supervisor form  -> Link to "User"                       (user chuno)
 *
 * Ek hi loader dono ko chala raha tha, is liye Supervisor form me bhi supervisor
 * records dikhte the. Ab form ke hisaab se sahi master se options aate hain.
 * Label dono jagah user ka full name rehta hai, value user id.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_load_supervisor_options = proto.load_supervisor_options;

	proto.load_supervisor_options = async function (selected = "") {
		if (this._power_form_data?.key !== "supervisors") {
			return previous_load_supervisor_options.call(this, selected);
		}

		const control = this.controls.supervisor_name;
		if (!control || typeof control.set_supervisor_options !== "function") return;

		try {
			const users = await this.cached_master_list("User", {
				fields: ["name", "full_name"],
				filters: { enabled: 1 },
				order_by: "full_name asc",
				limit: 1000,
			});
			// Control jis shape ki ummeed karta hai usi me daal do.
			const rows = (users || []).map((user) => ({
				name: user.name,
				supervisor_name: user.full_name || user.name,
			}));
			control.set_supervisor_options(rows, selected);
			this.enhance_selects();
		} catch (error) {
			control.set_loading(__("Unable to load users"));
		}
	};
})();

/**
 * Edit kholte hi saved values na badlein.
 *
 * render_form ke andar calculate_power_app_fields chalta tha, aur kuch async
 * loaders (previous reading, vehicle options) baad me dobara chalate the. Is se
 * purane record ka Total DG Unit / Distance / Amount overwrite ho jaata tha —
 * jaise 0 ho jaana — bina user ke kuch kiye.
 *
 * Ab edit me calculation tab tak rukti hai jab tak user kisi field par focus
 * na kare. Naye record par pehle jaisa hi turant chalti hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_calculate = proto.calculate_power_app_fields;

	// Jo fields khud calculate hote hain — edit me inhe waise ka waisa rakhna hai.
	const DERIVED = {
		vehicle_logs: ["ld_distance", "ld_total_hours"],
		dg_operations: ["dg_total_dg_unit", "dg_total_hours", "dg_total_amount"],
		fuel_diesel: ["dd_amount", "dd_average"],
	};

	proto.calculate_power_app_fields = function (key) {
		if (this._hold_calculation) return;
		return previous_calculate.call(this, key);
	};

	proto.render_form = function (data) {
		this._hold_calculation = !data.is_new;
		previous_render_form.call(this, data);

		if (data.is_new) {
			this._hold_calculation = false;
			return;
		}

		// Saved values wapas laga do — beech me kisi ne badal diya ho to bhi.
		const restore = () => {
			(DERIVED[data.key] || []).forEach((fieldname) => {
				const saved = data.values?.[fieldname];
				if (saved !== undefined && saved !== null) this.set_control_value(fieldname, saved);
			});
		};
		restore();
		// Async loaders thoda baad me settle hote hain, ek baar aur laga do.
		// window.setTimeout(restore, 400);
		// window.setTimeout(restore, 1200);

		// User ne form chhua — ab calculation normal.
		const $form = this.$view.find("[data-record-form]");
		$form.off(".vmnphold");
		$form.on("focusin.vmnphold", "input, select, textarea", () => {
			this._hold_calculation = false;
		});
	};
})();


/* VMNP early input-event flicker guard 2026-08-06 */
(() => {
	if (typeof VehicleManagementPortal === "undefined") return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_load_previous_reading = proto.load_previous_reading;

	const BLOCK_INPUT_FIELDS = new Set([
		"dd_quantity",
		"dd_fuel_fill_up_reading",
		"dd_previous_fuel_fill_up_reading",
		"dg_start_reading",
		"dg_end_reading",
	]);
	const DG_EDIT_RESTORE_FIELDS = ["dg_start_reading", "dg_end_reading", "dg_total_dg_unit", "dg_diesel_consumption"];

	function fieldname_from_event(event) {
		return $(event.target).closest("[data-control-field]").attr("data-control-field") || "";
	}

	function raw(portal, fieldname) {
		return String(portal.control_value(fieldname) ?? "").trim();
	}

	function set_silent(portal, fieldname, value) {
		if (typeof portal.vmnp_set_calculated_field_silent === "function") {
			portal.vmnp_set_calculated_field_silent(fieldname, value);
		} else {
			portal.set_control_value(fieldname, value);
		}
	}

	function recalc_exact(portal, key) {
		if (key === "fuel_diesel") {
			const quantity = portal.number_value("dd_quantity");
			const rate = portal.number_value("dd_rate");
			portal.set_control_value("dd_amount", Math.round(quantity * rate * 100) / 100);
			if (!raw(portal, "dd_quantity") || !raw(portal, "dd_fuel_fill_up_reading") || !quantity) {
				set_silent(portal, "dd_average", "");
				return;
			}
			const travelled = portal.number_value("dd_fuel_fill_up_reading") - portal.number_value("dd_previous_fuel_fill_up_reading");
			set_silent(portal, "dd_average", Math.round((travelled / quantity) * 100) / 100);
		}
		if (key === "dg_operations") {
			if (!raw(portal, "dg_start_reading") || !raw(portal, "dg_end_reading")) {
				set_silent(portal, "dg_total_dg_unit", "");
			} else {
				set_silent(portal, "dg_total_dg_unit", portal.number_value("dg_end_reading") - portal.number_value("dg_start_reading"));
			}
		}
	}

	// Previous-reading autofill sirf NEW form ke liye. Edit form me saved reading ko kabhi overwrite na kare.
	proto.load_previous_reading = async function (key) {
		if (key === "dg_operations" && this._power_form_data && !this._power_form_data.is_new) return;
		return previous_load_previous_reading.call(this, key);
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (!["fuel_diesel", "dg_operations"].includes(data.key)) return;

		const form = this.$view.find("[data-record-form]")[0];
		if (!form) return;

		if (this._vmnp_input_capture_guard) {
			try { this._vmnp_input_capture_form?.removeEventListener("input", this._vmnp_input_capture_guard, true); } catch (error) {}
		}

		this._vmnp_input_capture_form = form;
		this._vmnp_input_capture_guard = (event) => {
			const fieldname = fieldname_from_event(event);
			if (!BLOCK_INPUT_FIELDS.has(fieldname)) return;
			// Capture phase me rok do: koi old input-based calculator fire nahi hoga.
			event.stopImmediatePropagation();
		};
		form.addEventListener("input", this._vmnp_input_capture_guard, true);

		const $form = $(form);
		$form.off(".vmnpFinalBlurCalc");
		$form.on("change.vmnpFinalBlurCalc blur.vmnpFinalBlurCalc", ".vmnp-control-slot input", (event) => {
			const fieldname = fieldname_from_event(event);
			if (!BLOCK_INPUT_FIELDS.has(fieldname)) return;
			recalc_exact(this, data.key);
		});

		if (data.key === "dg_operations" && !data.is_new) {
			const restore_saved = () => {
				DG_EDIT_RESTORE_FIELDS.forEach((fieldname) => {
					const saved = data.values?.[fieldname];
					if (saved !== undefined && saved !== null) set_silent(this, fieldname, saved);
				});
			};
			restore_saved();
			window.setTimeout(restore_saved, 300);
			window.setTimeout(restore_saved, 900);
		}
	};
})();

/**
 * Average par aakhri faisla — ye block sabse baad me hai, is liye iske baad
 * koi aur calculation Average ko chhoo nahi sakti.
 *
 * Rule: Fuel Fill up Reading khaali (ya 0) ho to Average blank. Quantity type
 * karne se pehle Average kabhi nahi dikhega.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_calculate = proto.calculate_power_app_fields;

	proto.calculate_power_app_fields = function (key) {
		previous_calculate.call(this, key);
		if (key !== "fuel_diesel" || this._hold_calculation) return;

		const fill_up_raw = String(this.control_value("dd_fuel_fill_up_reading") ?? "").trim();
		const fill_up = this.number_value("dd_fuel_fill_up_reading");

		// Fill up reading nahi hai -> Average dikhana hi nahi hai.
		if (!fill_up_raw || !fill_up) {
			this.set_control_value("dd_average", "");
			return;
		}

		const quantity = this.number_value("dd_quantity");
		if (!quantity) {
			this.set_control_value("dd_average", "");
			return;
		}

		const travelled = fill_up - this.number_value("dd_previous_fuel_fill_up_reading");
		const average = Math.round((travelled / quantity) * 100) / 100;
		this.set_control_value("dd_average", average > 0 ? average : "");
	};
})();

/**
 * Average watchdog.
 *
 * calculate_power_app_fields ke kai overrides hain aur kuch jagah base calc
 * seedha bhi chal jaata hai, is liye chain me guard lagane se value bach nikalti
 * thi (Fuel Fill up khaali hone par bhi -300 dikh raha tha).
 *
 * Ye watchdog form ke har input/change ke baad — sab handlers ke baad — Average
 * ko dobara check karta hai. Rule ek hi: Fuel Fill up Reading nahi to Average
 * blank.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;

	const enforce = function () {
		const fill_up_raw = String(this.control_value("dd_fuel_fill_up_reading") ?? "").trim();
		const fill_up = this.number_value("dd_fuel_fill_up_reading");
		const quantity = this.number_value("dd_quantity");

		if (!fill_up_raw || !fill_up || !quantity) {
			if (String(this.control_value("dd_average") ?? "").trim() !== "") {
				this.set_control_value("dd_average", "");
			}
			return;
		}

		const travelled = fill_up - this.number_value("dd_previous_fuel_fill_up_reading");
		const average = Math.round((travelled / quantity) * 100) / 100;
		const wanted = average > 0 ? String(average) : "";
		if (String(this.control_value("dd_average") ?? "").trim() !== wanted) {
			this.set_control_value("dd_average", average > 0 ? average : "");
		}
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (data.key !== "fuel_diesel") return;

		const $form = this.$view.find("[data-record-form]");
		$form.off(".vmnpavg");
		$form.on("input.vmnpavg change.vmnpavg blur.vmnpavg", "input, select", () => {
			// setTimeout 0 — baaki sab handlers ke baad chale.
			window.setTimeout(() => {
				if (this._hold_calculation) return;
				enforce.call(this);
			}, 0);
		});

		if (!data.is_new) return;
		window.setTimeout(() => enforce.call(this), 300);
	};
})();

/**
 * Average par aakhri, bypass-proof guard.
 *
 * calculate_power_app_fields ke 7+ overrides hain aur kuch code captured
 * references se purana calc seedha chala deta hai — is liye chain me guard
 * lagane se value bach nikal rahi thi (Fuel Fill up khaali hone par bhi -30).
 *
 * Ab guard control ke set_value par hai. Koi bhi writer ho, value yahin se
 * guzarti hai, to rule tootne ka raasta nahi bachta.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (data.key !== "fuel_diesel") return;

		const attach = () => {
			const control = this.controls?.dd_average;
			if (!control || control._vmnp_guarded) return false;

			const original_set_value = control.set_value.bind(control);
			control.set_value = (value) => {
				const fill_up_raw = String(this.control_value("dd_fuel_fill_up_reading") ?? "").trim();
				const fill_up = this.number_value("dd_fuel_fill_up_reading");
				const quantity = this.number_value("dd_quantity");

				// Fill up ya quantity nahi -> Average dikhana hi nahi.
				if (!fill_up_raw || !fill_up || !quantity) return original_set_value("");

				const number = Number(value);
				if (!Number.isFinite(number) || number <= 0) return original_set_value("");
				return original_set_value(value);
			};
			control._vmnp_guarded = true;
			return true;
		};

		// Control async ban sakta hai, is liye thodi der retry.
		if (!attach()) {
			let tries = 0;
			const timer = window.setInterval(() => {
				if (attach() || ++tries > 12) window.clearInterval(timer);
			}, 200);
		}
	};
})();

/**
 * Dashboard par RTO expiry alert — 15 din pehle se.
 *
 * Sab kuch client se hota hai (frappe.db.get_list), is liye koi naya backend
 * function nahi aur koi restart nahi. Permissions Frappe core khud lagata hai.
 *
 * Scope: agar logged-in user kisi campus ka supervisor hai to sirf uske campus
 * ke documents; warna jo bhi us user ko dikh sakte hain.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_show_dashboard = proto.show_dashboard;

	const DAYS = 15;

	proto.show_dashboard = async function (show_loader = true) {
		const result = await previous_show_dashboard.call(this, show_loader);
		void this.render_rto_expiry_alert();
		return result;
	};

	/** Logged-in user ke campus — supervisor chain se. Na mile to null. */
	proto.user_campus_names = async function () {
		try {
			const supervisors = await frappe.db.get_list("Supervisor for Campus VMN", {
				filters: { supervisor_name: frappe.session.user },
				fields: ["name"],
				limit: 50,
			});
			if (!supervisors || !supervisors.length) return null;

			const campuses = await frappe.db.get_list("Campus Details VMN", {
				filters: { supervisor_name: ["in", supervisors.map((row) => row.name)] },
				fields: ["name"],
				limit: 200,
			});
			return campuses && campuses.length ? campuses.map((row) => row.name) : null;
		} catch (error) {
			return null;
		}
	};

	proto.render_rto_expiry_alert = async function () {
		// Dashboard ka wrapper .vmnp-dashboard hai (.vmnp-page detail/list ka hai).
		const $host = this.$view.find(".vmnp-dashboard, .vmnp-page").first();
		if (!$host.length) return;
		if (this.$view.find(".vmnp-expiry-alert").length) return;

		const today = frappe.datetime.get_today();
		const until = frappe.datetime.add_days(today, DAYS);

		try {
			const campuses = await this.user_campus_names();
			const filters = { expired_date: ["between", [today, until]] };
			if (campuses) filters.rto_select_campus = ["in", campuses];

			const rows = await frappe.db.get_list("RTO Details VMN", {
				filters,
				fields: [
					"name",
					"rto_vehicle_number",
					"rto_vehicle_name",
					"document_type",
					"expired_date",
					"rto_select_campus",
				],
				order_by: "expired_date asc",
				limit: 50,
			});
			if (!rows || !rows.length) return;

			// Campus ke naam resolve karo (docname ki jagah).
			const titles = {};
			await Promise.all(
				[...new Set(rows.map((row) => row.rto_select_campus).filter(Boolean))].map(async (campus) => {
					titles[campus] = await this.fetch_link_title("Campus Details VMN", campus);
				})
			);

			const items = rows
				.map((row) => {
					const left = frappe.datetime.get_day_diff(row.expired_date, today);
					const urgency = left <= 3 ? "critical" : "";
					return `
						<button class="vmnp-expiry-row ${urgency}" type="button"
							data-expiry-open="${frappe.utils.escape_html(row.name)}">
							<span class="vmnp-expiry-main">
								<strong>${frappe.utils.escape_html(row.rto_vehicle_number || row.name)}</strong>
								<small>${frappe.utils.escape_html(
									[titles[row.rto_select_campus] || row.rto_select_campus, row.document_type]
										.filter(Boolean)
										.join(" · ")
								)}</small>
							</span>
							<span class="vmnp-expiry-date">${this.format_date(row.expired_date, "")}</span>
							<span class="vmnp-expiry-left">${
								left <= 0 ? __("expired") : __("{0} day(s) left", [left])
							}</span>
						</button>
					`;
				})
				.join("");

			const $card = $(`
				<section class="vmnp-panel vmnp-expiry-alert">
					<div class="vmnp-panel-header">
						<span>!</span>
						<h3>${__("{0} RTO document(s) expiring soon", [rows.length])}</h3>
						<small>${__("next {0} days", [DAYS])}</small>
					</div>
					<div class="vmnp-expiry-list">${items}</div>
				</section>
			`);

			const $hero = $host.find(".vmnp-hero").first();
			if ($hero.length) $hero.after($card);
			else $host.prepend($card);

			this.$view.off("click.expiry");
			this.$view.on("click.expiry", "[data-expiry-open]", (event) => {
				this.show_detail("rto_compliance", $(event.currentTarget).attr("data-expiry-open"));
			});
		} catch (error) {
			// Alert na bane to dashboard normal chalta rahe.
		}
	};
})();

/**
 * Sidebar ke nav groups collapsible — heading par click karo, group khul/band.
 * Kaunsa group band hai wo localStorage me yaad rehta hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_bind_shell_events = proto.bind_shell_events;

	const STORE_KEY = "vmnp-collapsed-groups";

	const read_state = () => {
		try {
			return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || "[]"));
		} catch (error) {
			return new Set();
		}
	};

	const write_state = (set) => {
		try {
			localStorage.setItem(STORE_KEY, JSON.stringify([...set]));
		} catch (error) {
			// Storage band ho to bas yaad nahi rahega, kaam chalta rahega.
		}
	};

	proto.bind_shell_events = function () {
		previous_bind_shell_events.call(this);

		this.$root.on("click", ".vmnp-nav-group-title", (event) => {
			const $group = $(event.currentTarget).closest(".vmnp-nav-group");
			const label = $(event.currentTarget).text().trim();
			const collapsed = read_state();

			$group.toggleClass("is-collapsed");
			if ($group.hasClass("is-collapsed")) collapsed.add(label);
			else collapsed.delete(label);
			write_state(collapsed);
		});
	};

	/** Menu render ke baad yaad kiya hua collapsed state wapas lagao. */
	proto.restore_collapsed_groups = function () {
		const collapsed = read_state();
		if (!collapsed.size) return;
		this.$root.find(".vmnp-nav-group").each((index, element) => {
			const $group = $(element);
			const label = $group.find(".vmnp-nav-group-title").text().trim();
			$group.toggleClass("is-collapsed", collapsed.has(label));
		});
	};
})();

/**
 * Edit / Delete buttons ab Frappe ke role permissions se chalte hain.
 *
 * ERPNext ke Role Permission Manager me us doctype par jis role ko Write /
 * Delete diya hoga, usi ko button dikhega. Permission hataate hi button apne
 * aap gayab. Ye check client-side hai (frappe.model.can_write / can_delete),
 * is liye koi backend change ya restart nahi chahiye.
 *
 * Server side par bhi rok hai — delete_document me _check_permission chalta
 * hai — to button chhupana sirf UI ka hissa hai, security ka nahi.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_detail = proto.render_detail;
	const previous_bind_list_events = proto.bind_list_events;

	proto.apply_permission_visibility = async function (doctype) {
		if (!doctype) return;

		try {
			if (frappe.model?.with_doctype) {
				await new Promise((resolve) => frappe.model.with_doctype(doctype, resolve));
			}
		} catch (error) {
			// Meta na mile to neeche default par chale jayenge.
		}

		// frappe.model.can_write par bharosa nahi kar sakte — Frappe khud
		// can_create ko can_write me jod deta hai (utils/user.py: can_write +=
		// can_create), is liye sirf Create wale user ko bhi edit dikh jaata tha.
		// Seedha DocPerm ka write/delete flag padhte hain.
		let can_write = false;
		let can_delete = false;
		try {
			const perms = frappe.perm?.get_perm ? frappe.perm.get_perm(doctype) : null;
			const level0 = perms && perms[0] ? perms[0] : null;
			if (level0) {
				can_write = !!level0.write;
				can_delete = !!level0.delete;
			} else if (typeof frappe.model?.can_write === "function") {
				can_write = !!frappe.model.can_write(doctype);
				can_delete = !!frappe.model.can_delete(doctype);
			}
		} catch (error) {
			// Pata na chale to dono chhupa do — server par rok waise bhi hai.
			can_write = false;
			can_delete = false;
		}

		this.$view.find("[data-edit-record], [data-row-edit]").toggle(can_write);
		this.$view.find("[data-delete-record], [data-row-delete]").toggle(can_delete);
	};

	proto.render_detail = function (data) {
		previous_render_detail.call(this, data);
		void this.apply_permission_visibility(data.doctype);
	};

	proto.bind_list_events = function (state, data) {
		previous_bind_list_events.call(this, state, data);
		void this.apply_permission_visibility(data.doctype);
	};
})();

/**
 * Supervisor ki jagah email nahi, user ka poora naam dikhao.
 *
 * Supervisor for Campus VMN ka supervisor_name ab Link -> User hai, aur uska
 * autoname usi field se banta hai — is liye docname bhi email hi hota hai.
 * Nateeja: Campus list, RTO form, detail view — sab jagah email dikh raha tha.
 *
 * Yahan do jagah theek karte hain:
 *   1. fetch_link_title  -> Supervisor doctype ke liye User ka full_name
 *   2. RTO form/detail ka rto_supervisor_name (plain Data field)
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_fetch_link_title = proto.fetch_link_title;
	const previous_render_form = proto.render_form;
	const previous_render_detail = proto.render_detail;

	const SUPERVISOR_DOCTYPE = "Supervisor for Campus VMN";

	/** User id -> full_name, cache ke saath. */
	proto.user_full_name = async function (user_id) {
		if (!user_id) return user_id;
		this._full_name_cache = this._full_name_cache || {};
		if (this._full_name_cache[user_id] !== undefined) return this._full_name_cache[user_id];

		let name = user_id;
		try {
			const value = await frappe.db.get_value("User", user_id, "full_name");
			if (value?.message?.full_name) name = value.message.full_name;
		} catch (error) {
			// Na mile to user id hi rehne do.
		}
		this._full_name_cache[user_id] = name;
		return name;
	};

	proto.fetch_link_title = async function (doctype, name) {
		if (doctype !== SUPERVISOR_DOCTYPE) {
			return previous_fetch_link_title.call(this, doctype, name);
		}
		// Supervisor ka title khud user id hota hai — usse aage full_name tak jao.
		try {
			const row = await frappe.db.get_value(SUPERVISOR_DOCTYPE, name, "supervisor_name");
			const user_id = row?.message?.supervisor_name || name;
			return await this.user_full_name(user_id);
		} catch (error) {
			return name;
		}
	};

	/** RTO ka supervisor field plain Data hai — usme bhi naam dikhao. */
	proto.show_supervisor_full_name = async function () {
		const control = this.controls?.rto_supervisor_name;
		const current = String(this.control_value?.("rto_supervisor_name") ?? "").trim();
		if (!control || !current || !current.includes("@")) return;
		const full_name = await this.user_full_name(current);
		if (full_name && full_name !== current) control.set_value(full_name);
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (data.key !== "rto_compliance") return;
		void this.show_supervisor_full_name();
		window.setTimeout(() => this.show_supervisor_full_name(), 600);
	};

	proto.render_detail = function (data) {
		previous_render_detail.call(this, data);
		const value = data.values?.rto_supervisor_name;
		if (!value || !String(value).includes("@")) return;
		void this.user_full_name(value).then((full_name) => {
			if (!full_name || full_name === value) return;
			this.$view.find('.vmnp-detail-field[data-fieldname="rto_supervisor_name"] strong').text(full_name);
		});
	};
})();

/**
 * Vendors ko menu me wapas laao.
 *
 * MENU_GROUPS (Python) me se "vendors" nikal gaya tha, is liye wo sidebar aur
 * dashboard ke Modules me dikhna band ho gaya — jabki uska DOCUMENT_CONFIG
 * maujood hai, matlab list/form sab kaam karta hai.
 *
 * Python badalne par restart lagta, is liye item client side par inject karte
 * hain. Columns aur filter fields server se hi aate hain (get_document_list),
 * to behaviour baaki modules jaisa hi rehta hai.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_load_portal = proto.load_portal;

	const KEY = "vendors";
	const DOCTYPE = "Vendor Details VMN";

	proto.load_portal = async function () {
		const result = await previous_load_portal.call(this);

		try {
			const menu = this.bootstrap?.menu;
			if (!menu || this.menu_items?.[KEY]) return result;

			// Permission na ho to menu me bhi mat dikhao.
			let allowed = true;
			if (frappe.model?.with_doctype) {
				await new Promise((resolve) => frappe.model.with_doctype(DOCTYPE, resolve));
			}
			if (frappe.perm?.get_perm) {
				const level0 = frappe.perm.get_perm(DOCTYPE)?.[0];
				allowed = !!(level0 && level0.read);
			}
			if (!allowed) return result;

			const columns = [
				{ fieldname: "name", label: __("ID"), fieldtype: "Data", options: "", reqd: 0, read_only: 1 },
				{ fieldname: "vendor_name", label: __("Vendor Name"), fieldtype: "Data", options: "" },
			];
			const item = {
				key: KEY,
				label: __("Vendors"),
				icon: "users",
				description: __("Maintenance and service vendor master."),
				doctype: DOCTYPE,
				can_create: true,
				columns,
				filter_fields: [columns[1]],
				date_field: null,
			};

			const settings = menu.find((group) => /setting/i.test(group.label || "")) || menu[menu.length - 1];
			if (!settings) return result;
			if (!(settings.items || []).some((entry) => entry.key === KEY)) {
				settings.items.push(item);
				this.menu_items[KEY] = item;
				this.render_navigation();
				if (this.current_view?.type === "dashboard") this.show_dashboard(false);
			}
		} catch (error) {
			// Inject na ho to baaki menu waise hi chalta rahe.
		}

		return result;
	};
})();

/**
 * DG Detail ke Campus/Location aur Vendor ka naam — ab native searchable select,
 * baaki dropdowns jaise. Pehle ye Frappe ke Link + awesomplete the, is liye
 * dikhne aur chalne me alag lagte the.
 *
 * Value hamesha docname jaati hai (Link field ki zaroorat), aur label me asli
 * naam dikhta hai — Vendor ke case me user ka full_name, email nahi.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_make_control = proto.make_control;
	const previous_render_form = proto.render_form;

	// Note: doctype ke field labels fieldnames se ulte hain — "diesel_generator_location"
	// ka label "Diesel Generator Campus" hai, aur "diesel_generator_campus" ka label
	// "Diesel Generator Location" hai. Yahan doctype/label_field label ke hisaab se hai.
	const LINK_SELECTS = {
		diesel_generator_location: { doctype: "Campus Details VMN", label_field: "cd_campus_name" },
		diesel_generator_campus: { doctype: "Location Details VMN", label_field: "location_name" },
		vendor_name: { doctype: "User", label_field: "full_name", filters: { enabled: 1 } },
	};

	proto.make_control = function ($slot, field, value) {
		const config = LINK_SELECTS[field.fieldname];
		if (!config) return previous_make_control.call(this, $slot, field, value);

		const label = frappe.utils.escape_html(field.label || field.fieldname);
		$slot.html(`
			<label class="vmnp-field-label">
				${label}${field.reqd ? '<b class="vmnp-required">*</b>' : ""}
			</label>
			<select class="vmnp-select vmnp-link-select" aria-label="${label}"
				${field.reqd ? "required" : ""} ${field.read_only ? "disabled" : ""}>
				<option value="">${__("Loading…")}</option>
			</select>
		`);

		const $select = $slot.find(".vmnp-link-select");
		this.controls[field.fieldname] = {
			$input: $select,
			get_value: () => $select.val() || "",
			set_value: (next) => {
				const next_value = String(next == null ? "" : next);
				if (
					next_value &&
					!$select.find("option").toArray().some((option) => option.value === next_value)
				) {
					// Purani value master me na ho to bhi dikhe, warna edit me mit jaati.
					$select.append(new Option(next_value, next_value));
				}
				$select.val(next_value);
			},
			set_link_options: (rows, selected = "") => {
				$select.empty().append(new Option(__("Select {0}", [field.label || ""]).trim(), ""));
				const seen = new Set();
				(rows || []).forEach((row) => {
					const option_value = String(row.name || "").trim();
					if (!option_value || seen.has(option_value)) return;
					seen.add(option_value);
					const text = String(row[config.label_field] || option_value).trim();
					$select.append(new Option(text, option_value));
				});
				const wanted = String(selected || "");
				if (wanted && !seen.has(wanted)) $select.append(new Option(wanted, wanted));
				$select.val(wanted);
				$select.prop("disabled", Boolean(field.read_only));
			},
			set_loading: (message) => {
				$select.empty().append(new Option(message, "")).prop("disabled", true);
			},
		};
		this.controls[field.fieldname].set_value(value);
	};

	proto.load_link_select_options = async function (data) {
		const present = (data.sections || [])
			.flatMap((section) => section.fields || [])
			.map((field) => field.fieldname)
			.filter((fieldname) => LINK_SELECTS[fieldname]);
		if (!present.length) return;

		await Promise.all(
			present.map(async (fieldname) => {
				const config = LINK_SELECTS[fieldname];
				const control = this.controls[fieldname];
				if (!control?.set_link_options) return;
				try {
					const options = {
						fields: ["name", config.label_field],
						order_by: `${config.label_field} asc`,
						limit: 1000,
					};
					if (config.filters) options.filters = config.filters;
					const rows = await this.cached_master_list(config.doctype, options);
					control.set_link_options(rows, data.values?.[fieldname] || "");
				} catch (error) {
					control.set_loading(__("Unable to load options"));
				}
			})
		);
		this.enhance_selects();
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		void this.load_link_select_options(data);
	};
})();

/**
 * Vendor ke naam ki jagah email dikhna band karo.
 *
 * Vendor Details VMN ka vendor_name ab Link -> User hai aur autoname bhi usi
 * field se banta hai — matlab docname aur title dono email hote hain. Is liye
 * Vendors list, detail view, aur Maintenance ka Vendor dropdown — teeno jagah
 * email dikh raha tha.
 *
 * Yahan har jagah user id ko full_name me badal dete hain.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_fetch_link_title = proto.fetch_link_title;
	const previous_load_lookup_select_options = proto.load_lookup_select_options;

	const VENDOR_DOCTYPE = "Vendor Details VMN";

	proto.fetch_link_title = async function (doctype, name) {
		if (doctype !== VENDOR_DOCTYPE) {
			return previous_fetch_link_title.call(this, doctype, name);
		}
		try {
			const row = await frappe.db.get_value(VENDOR_DOCTYPE, name, "vendor_name");
			const value = row?.message?.vendor_name || name;
			// Purane vendor records me plain naam hai, unme "@" nahi hota.
			return String(value).includes("@") ? await this.user_full_name(value) : value;
		} catch (error) {
			return name;
		}
	};

	proto.load_lookup_select_options = async function (data) {
		await previous_load_lookup_select_options.call(this, data);

		const control = this.controls?.md_vendor_name;
		const $select = control?.$input;
		if (!$select || !$select.length) return;

		// Dropdown ke labels me email ki jagah full name.
		const options = $select.find("option").toArray().filter((option) => option.value);
		await Promise.all(
			options.map(async (option) => {
				const text = String(option.textContent || "").trim();
				if (!text.includes("@")) return;
				const full_name = await this.user_full_name(text);
				if (full_name && full_name !== text) option.textContent = full_name;
			})
		);
		this.enhance_selects();
	};
})();

/**
 * Frappe desk navbar sirf is page par hide.
 *
 * Body class page dikhne par lagti hai aur page chhodte hi hat jaati hai, is
 * liye baaki desk pages par navbar normal rehta hai. Layout ka kaam CSS me hai
 * (app shell) — yahan sirf class toggle.
 */
frappe.pages["vehicle-management"].on_page_show = ((previous) =>
	function (wrapper) {
		$("body").addClass("vmnp-portal-active");
		if (typeof previous === "function") previous.call(this, wrapper);
	})(frappe.pages["vehicle-management"].on_page_show);

frappe.pages["vehicle-management"].on_page_hide = function () {
	$("body").removeClass("vmnp-portal-active");
};

$(window).on("hashchange.vmnpshell", () => {
	const route = frappe.get_route ? frappe.get_route() : [];
	$("body").toggleClass("vmnp-portal-active", route[0] === "vehicle-management");
});

/**
 * Module badalte hi search aur filters apne aap saaf.
 *
 * Pehle purani search/filter values yaad reh jaati thi, aur user ko haath se
 * hataani padti thi. Ab jab bhi doosra module kholo, list saaf shuru hoti hai.
 * Usi module ke andar page badalne (pagination/sort) par values bani rehti hain.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_show_list = proto.show_list;

	proto.show_list = async function (key, options = {}) {
		const switched = this._last_list_key !== key;
		this._last_list_key = key;

		if (switched) {
			this._vmnp_filters = {};
			this._vmnp_filters_key = key;
			return previous_show_list.call(this, key, {
				...options,
				start: 0,
				search: "",
				filter_field: "",
				filter_value: "",
				filters: {},
			});
		}

		return previous_show_list.call(this, key, options);
	};
})();

/**
 * Searchable dropdown: focus par purana text select ho jaye.
 *
 * Pehle chuni hui value input me padi rehti thi, to dobara dhoondhne ke liye
 * user ko pehle wo mitani padti thi. Ab focus/click par text select ho jaata
 * hai — type karte hi replace, kuch mitana nahi padta.
 *
 * Bina kuch chune bahar click karo to combo ka apna close() purani value wapas
 * laga deta hai, is liye value kabhi khoti nahi.
 */
$(document).on("focus.vmnpcombosel click.vmnpcombosel", ".vmnp-combo-input", (event) => {
	const input = event.currentTarget;
	// setTimeout 0 — browser ke apne cursor placement ke baad chale.
	window.setTimeout(() => {
		try {
			if (document.activeElement === input) input.select();
		} catch (error) {
			// Select na ho to normal typing chalti rahegi.
		}
	}, 0);
});

/**
 * Searchable dropdown ka naya roop.
 *
 * Pehle field khud search input ban jaata tha. Ab reference jaisa hai:
 * band halat me select jaisa box (chuni hui value + chevron), aur kholne par
 * ek panel jisme upar apna "Search…" box aur neeche options.
 *
 * Panel fixed position par hai, is liye form card ke overflow: hidden se
 * katega nahi.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;

	const close_all = (except) => {
		$(".vmnp-combo.is-open").each((index, element) => {
			if (element === except) return;
			$(element).removeClass("is-open").find(".vmnp-combo-panel").attr("hidden", true);
		});
	};

	proto.make_select_searchable = function (select) {
		const $select = $(select);
		if ($select.data("vmnp-combo")) return;
		if ($select.find("option").length < 2) return;
		if (!$select.find('option[value=""]').length) {
			$select.prepend('<option value=""></option>');
		}
			const $combo = $(`
			<div class="vmnp-combo">
				<button class="vmnp-combo-display" type="button">
					<span class="vmnp-combo-text"></span>
					<i class="vmnp-combo-caret" aria-hidden="true"></i>
				</button>
				<div class="vmnp-combo-panel" hidden>
					<input class="vmnp-combo-search" type="text" autocomplete="off"
						placeholder="${__("Search…")}" aria-label="${__("Search options")}">
					<ul class="vmnp-combo-list" role="listbox"></ul>
				</div>
			</div>
		`);

		$select.addClass("vmnp-combo-native").after($combo);
		$select.data("vmnp-combo", true);

		const $display = $combo.find(".vmnp-combo-display");
		const $text = $combo.find(".vmnp-combo-text");
		const $panel = $combo.find(".vmnp-combo-panel");
		const $search = $combo.find(".vmnp-combo-search");
		const $list = $combo.find(".vmnp-combo-list");

		const selected_option = () => $select.find("option:selected")[0];

		const sync_display = () => {
			const option = selected_option();
			const label = option ? option.textContent.trim() : "";
			const is_placeholder = !option || !option.value;
			$text.text(label || __("Select"));
			$text.toggleClass("is-placeholder", is_placeholder);
		};

		const place_panel = () => {
			const rect = $display[0].getBoundingClientRect();
			const height = Math.min($panel[0].scrollHeight || 0, 300);
			const below = window.innerHeight - rect.bottom;
			const upward = below < height + 12 && rect.top > height + 12;
			$panel.css({
				position: "fixed",
				top: upward ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
				left: rect.left,
				width: rect.width,
			});
		};

		const render = (query) => {
			const needle = String(query || "").trim().toLowerCase();
			const items = $select
				.find("option")
				.toArray()
				.filter((option) => option.value)
				.filter((option) => !needle || option.textContent.toLowerCase().includes(needle));

			$list.empty();
			// Har dropdown me ek true blank row: user select kare to value clear ho jaye.
			$("<li>")
				.attr({ role: "option", "data-value": "" })
				.toggleClass("is-selected", !$select.val())
				.html("&nbsp;")
				.appendTo($list);
			if (!items.length) {
				$list.append(`<li class="vmnp-combo-empty">${__("No match")}</li>`);
			} else {
				items.forEach((option) => {
					$("<li>")
						.attr({ role: "option", "data-value": option.value })
						.toggleClass("is-selected", option.selected)
						.text(option.textContent.trim())
						.appendTo($list);
				});
			}
			place_panel();
		};

		const open = () => {
			close_all($combo[0]);
			$combo.addClass("is-open");
			$panel.removeAttr("hidden");
			$search.val("");
			render("");
			window.setTimeout(() => $search.trigger("focus"), 0);
		};

		const close = () => {
			$combo.removeClass("is-open");
			$panel.attr("hidden", true);
			sync_display();
		};

		$display.on("click", (event) => {
			event.preventDefault();
			if ($combo.hasClass("is-open")) close();
			else open();
		});

		$search.on("input", () => render($search.val()));

		$search.on("keydown", (event) => {
			if (event.key === "Escape") return close();
			if (event.key === "Enter") {
				event.preventDefault();
				$list.find("li[data-value]").first().trigger("mousedown");
			}
		});

		$list.on("mousedown", "li[data-value]", (event) => {
			event.preventDefault();
			$select.val($(event.currentTarget).attr("data-value")).trigger("change");
			close();
		});

		$(document).on("mousedown.vmnpcombo", (event) => {
			if (!$combo[0].contains(event.target)) close();
		});

		$(window).on("scroll.vmnpcombo resize.vmnpcombo", () => {
			if ($combo.hasClass("is-open")) close();
		});

		// Native select ki value bahar se badle to display bhi update ho.
		$select.on("change.vmnpcombo", sync_display);
		sync_display();
	};
})();

/**
 * Do chhote sudhaar:
 *  1. Toast (jaise "Record deleted") jaldi chala jaye — ERPNext jaisa.
 *  2. Dashboard par sirf Operations ke KPI cards, Settings ke nahi.
 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_show_dashboard = proto.show_dashboard;

	const OPERATION_KEYS = new Set([
		"vehicle_logs",
		"fuel_diesel",
		"maintenance",
		"rto_compliance",
		"dg_operations",
	]);

	// 1. Portal ke apne alerts 3 second me hat jayen (default 7 tha).
	const original_show_alert = frappe.show_alert;
	frappe.show_alert = function (options, seconds) {
		return original_show_alert.call(this, options, seconds || 3);
	};

	// 2. Settings/master modules ke KPI cards hata do.
	proto.show_dashboard = async function (show_loader = true) {
		const result = await previous_show_dashboard.call(this, show_loader);
		this.$view.find(".vmnp-kpi-card[data-kpi-key]").each((index, element) => {
			const key = $(element).attr("data-kpi-key");
			if (!OPERATION_KEYS.has(key)) $(element).remove();
		});
		return result;
	};
})();


/* VMNP vehicle change cleanup + non-negative distance 2026-08-10 */
(() => {
	if (typeof VehicleManagementPortal === "undefined") return;
	const proto = VehicleManagementPortal.prototype;
	const previous_power_control_changed = proto.power_control_changed;
	const previous_calculate = proto.calculate_power_app_fields;
	const previous_render_form = proto.render_form;

	const VEHICLE_MAP = {
		vehicle_logs: {
			type: "ld_type_of_vehicle",
			number: "vehicle_number",
			name: "ld_vehicle_name",
			location: "ld_vehicle_location",
			campus: "ld_select_campus",
			clear: ["ld_vehicle_name", "ld_vehicle_location", "ld_select_campus"],
		},
		fuel_diesel: {
			type: "dd_type_of_vehicle",
			number: "dd_vehicle_number",
			name: "dd_vehicle_name",
			location: "dd_vehicle_location",
			campus: "dd_select_campus",
			clear: ["dd_vehicle_name", "dd_vehicle_location", "dd_select_campus", "dd_previous_fuel_fill_up_reading", "dd_average"],
		},
		maintenance: {
			type: "md_type_of_vehicle",
			number: "md_vehicle_number",
			name: "md_vehicle_name",
			location: "md_vehicle_location",
			campus: "md_select_campus",
			clear: ["md_vehicle_name", "md_vehicle_location", "md_select_campus"],
		},
		rto_compliance: {
			type: "rto_type_of_vehicle",
			number: "rto_vehicle_number",
			name: "rto_vehicle_name",
			location: "rto_vehicle_location",
			campus: "rto_select_campus",
			clear: ["rto_vehicle_name", "rto_vehicle_location", "rto_select_campus"],
		},
	};

	function set_value(portal, fieldname, value) {
		if (!portal.controls?.[fieldname]) return;
		portal.set_control_value(fieldname, value);
	}

	function set_silent(portal, fieldname, value) {
		if (typeof portal.vmnp_set_calculated_field_silent === "function") {
			portal.vmnp_set_calculated_field_silent(fieldname, value);
		} else {
			set_value(portal, fieldname, value);
		}
	}

	function non_negative_distance(portal) {
		const start_raw = String(portal.control_value("start_reading") ?? "").trim();
		const end_raw = String(portal.control_value("end_reading") ?? "").trim();
		if (!start_raw || !end_raw) {
			set_silent(portal, "ld_distance", "");
			return;
		}
		const distance = portal.number_value("end_reading") - portal.number_value("start_reading");
		if (distance < 0) {
			set_silent(portal, "ld_distance", "");
			return;
		}
		set_silent(portal, "ld_distance", distance);
	}

	function fuel_average_allow_zero(portal) {
		const fill_raw = String(portal.control_value("dd_fuel_fill_up_reading") ?? "").trim();
		const quantity = portal.number_value("dd_quantity");
		if (!fill_raw || !quantity) {
			set_silent(portal, "dd_average", "");
			return;
		}
		const travelled = portal.number_value("dd_fuel_fill_up_reading") - portal.number_value("dd_previous_fuel_fill_up_reading");
		const average = Math.round((travelled / quantity) * 100) / 100;
		set_silent(portal, "dd_average", average < 0 ? "" : average);
	}

	async function fetch_vehicle(portal, key, mapping, vehicle_number, request_id) {
		try {
			const details = await portal.api("get_vehicle_details", { vehicle_number });
			if (portal._vmnp_vehicle_change_request !== request_id || !details) return;
			set_value(portal, mapping.type, details.vd_type_of_vehicle || portal.control_value(mapping.type) || "");
			set_value(portal, mapping.name, details.vd_vehicle_name || "");
			set_value(portal, mapping.location, details.vd_location || "");
			if (mapping.campus && typeof portal.load_campus_options === "function") {
				set_value(portal, mapping.campus, "");
				void portal.load_campus_options(mapping.campus, "");
			}
			if (key === "fuel_diesel" && typeof portal.load_previous_fuel_reading === "function") {
				void portal.load_previous_fuel_reading(portal._power_form_data?.is_new ? null : portal._power_form_data?.name, Boolean(portal._power_form_data?.is_new));
			}
		} catch (error) {
			portal.notify_error?.(error);
		}
	}

	proto.power_control_changed = function (key, fieldname) {
		const mapping = VEHICLE_MAP[key];
		if (mapping && fieldname === mapping.number) {
			const vehicle_number = String(this.control_value(mapping.number) || "").trim();
			(mapping.clear || []).forEach((field) => set_value(this, field, ""));
			this._vmnp_vehicle_change_request = `${key}:${vehicle_number}:${Date.now()}`;
			if (vehicle_number) {
				void fetch_vehicle(this, key, mapping, vehicle_number, this._vmnp_vehicle_change_request);
			}
		}
		previous_power_control_changed.call(this, key, fieldname);
	};

	proto.calculate_power_app_fields = function (key) {
		if (key === "vehicle_logs") {
			set_value(this, "ld_total_hours", this.duration_hours("start_time", "end_time"));
			non_negative_distance(this);
			return;
		}
		previous_calculate.call(this, key);
		if (key === "fuel_diesel") fuel_average_allow_zero(this);
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (data.key === "vehicle_logs") {
			const form = this.$view.find("[data-record-form]")[0];
			if (form && this._vmnp_vehicle_log_input_guard) {
				try { this._vmnp_vehicle_log_input_form?.removeEventListener("input", this._vmnp_vehicle_log_input_guard, true); } catch (error) {}
			}
			if (form) {
				this._vmnp_vehicle_log_input_form = form;
				this._vmnp_vehicle_log_input_guard = (event) => {
					const field = $(event.target).closest("[data-control-field]").attr("data-control-field") || "";
					if (["start_reading", "end_reading"].includes(field)) event.stopImmediatePropagation();
				};
				form.addEventListener("input", this._vmnp_vehicle_log_input_guard, true);
				$(form).off(".vmnpDistanceFinal");
				$(form).on("change.vmnpDistanceFinal blur.vmnpDistanceFinal", ".vmnp-control-slot input", (event) => {
					const field = $(event.currentTarget).closest("[data-control-field]").attr("data-control-field") || "";
					if (["start_reading", "end_reading"].includes(field)) non_negative_distance(this);
				});
			}
			if (data.is_new) non_negative_distance(this);
		}
		if (data.key === "fuel_diesel") {
			fuel_average_allow_zero(this);
		}
	};
})();


/* VMNP vehicle change clear all dependent fields 2026-08-10 */
(() => {
	if (typeof VehicleManagementPortal === "undefined") return;
	const proto = VehicleManagementPortal.prototype;
	const previous_power_control_changed = proto.power_control_changed;
	const previous_render_form = proto.render_form;

	const VEHICLE_MAP = {
		vehicle_logs: {
			type: "ld_type_of_vehicle",
			number: "vehicle_number",
			name: "ld_vehicle_name",
			location: "ld_vehicle_location",
			campus: "ld_select_campus",
		},
		fuel_diesel: {
			type: "dd_type_of_vehicle",
			number: "dd_vehicle_number",
			name: "dd_vehicle_name",
			location: "dd_vehicle_location",
			campus: "dd_select_campus",
		},
		maintenance: {
			type: "md_type_of_vehicle",
			number: "md_vehicle_number",
			name: "md_vehicle_name",
			location: "md_vehicle_location",
			campus: "md_select_campus",
		},
		rto_compliance: {
			type: "rto_type_of_vehicle",
			number: "rto_vehicle_number",
			name: "rto_vehicle_name",
			location: "rto_vehicle_location",
			campus: "rto_select_campus",
		},
	};

	function set_field(portal, fieldname, value) {
		const control = portal.controls?.[fieldname];
		if (!control) return;
		try {
			if (typeof portal.vmnp_set_calculated_field_silent === "function") {
				portal.vmnp_set_calculated_field_silent(fieldname, value);
			} else {
				portal.set_control_value(fieldname, value);
			}
		} catch (error) {
			try { portal.set_control_value(fieldname, value); } catch (inner) {}
		}
	}

	function clear_dependent_fields(portal, key, mapping) {
		const keep = new Set([
			mapping.type,
			mapping.number,
			// Date fields remain as user selected/current date.
			"date",
			"dd_date",
			"md_date",
			"rto_date",
		]);
		Object.keys(portal._power_form_fields || portal.controls || {}).forEach((fieldname) => {
			if (keep.has(fieldname)) return;
			set_field(portal, fieldname, "");
		});
	}

	async function refill_vehicle_details(portal, key, mapping, vehicle_number, token) {
		if (!vehicle_number) return;
		try {
			const details = await portal.api("get_vehicle_details", { vehicle_number });
			if (portal._vmnp_clear_vehicle_token !== token || !details) return;
			set_field(portal, mapping.type, details.vd_type_of_vehicle || portal.control_value(mapping.type) || "");
			set_field(portal, mapping.name, details.vd_vehicle_name || "");
			set_field(portal, mapping.location, details.vd_location || "");
			if (mapping.campus && typeof portal.load_campus_options === "function") {
				void portal.load_campus_options(mapping.campus, "");
			}
		} catch (error) {
			portal.notify_error?.(error);
		}
	}

	function remember_vehicle_number(portal, key, mapping) {
		portal._vmnp_vehicle_number_value_by_key = portal._vmnp_vehicle_number_value_by_key || {};
		portal._vmnp_vehicle_number_value_by_key[key] = String(portal.control_value(mapping.number) || "").trim();
	}

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		const mapping = VEHICLE_MAP[data?.key];
		if (mapping) remember_vehicle_number(this, data.key, mapping);
	};

	proto.power_control_changed = function (key, fieldname) {
		const mapping = VEHICLE_MAP[key];
		if (mapping && fieldname === mapping.number) {
			const vehicle_number = String(this.control_value(mapping.number) || "").trim();
			this._vmnp_vehicle_number_value_by_key = this._vmnp_vehicle_number_value_by_key || {};
			const previous_vehicle_number = String(this._vmnp_vehicle_number_value_by_key[key] || "").trim();
			if (vehicle_number === previous_vehicle_number) return;
			this._vmnp_vehicle_number_value_by_key[key] = vehicle_number;
			const token = `${key}:${vehicle_number}:${Date.now()}`;
			this._vmnp_clear_vehicle_token = token;
			clear_dependent_fields(this, key, mapping);
			void refill_vehicle_details(this, key, mapping, vehicle_number, token);
			return;
		}
		return previous_power_control_changed.call(this, key, fieldname);
	};
})();


/* VMNP maintenance work details modal 2026-08-10 */
(() => {
	if (typeof VehicleManagementPortal === "undefined") return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const WORK_FIELD = "md_work_details";
	const TOTAL_FIELD = "md_total_repairingamount";

	function esc(value) {
		return frappe.utils.escape_html(value == null ? "" : String(value));
	}

	function parse_rows(raw) {
		if (!raw) return [];
		try {
			const parsed = JSON.parse(String(raw));
			return Array.isArray(parsed)
				? parsed.map((row) => ({ work: String(row.work || row.name_of_repair_work || ""), amount: Number(row.amount || 0) || 0 }))
				: [];
		} catch (error) {
			return [];
		}
	}

	function rows_json(rows) {
		return JSON.stringify((rows || []).filter((row) => row.work || row.amount).map((row) => ({
			work: String(row.work || "").trim(),
			amount: Number(row.amount || 0) || 0,
		})));
	}

	function read_rows(portal) {
		if (portal._vmnp_maintenance_work_rows) return portal._vmnp_maintenance_work_rows;
		const control_value = portal.controls?.[WORK_FIELD]?.get_value?.() || portal._vmnp_maintenance_work_json || "";
		portal._vmnp_maintenance_work_rows = parse_rows(control_value);
		return portal._vmnp_maintenance_work_rows;
	}

	function ensure_work_control(portal, data) {
		const initial = data?.values?.[WORK_FIELD] || portal.controls?.[WORK_FIELD]?.get_value?.() || "";
		portal._vmnp_maintenance_work_rows = parse_rows(initial);
		portal._vmnp_maintenance_work_json = rows_json(portal._vmnp_maintenance_work_rows);
		const existing = portal.controls?.[WORK_FIELD];
		if (existing?.set_value) existing.set_value(portal._vmnp_maintenance_work_json);
		portal.controls = portal.controls || {};
		portal.controls[WORK_FIELD] = {
			get_value: () => portal._vmnp_maintenance_work_json || rows_json(portal._vmnp_maintenance_work_rows || []),
			set_value: (value) => {
				portal._vmnp_maintenance_work_json = value || "";
				portal._vmnp_maintenance_work_rows = parse_rows(value);
				if (existing?.set_value) existing.set_value(value || "");
			},
		};
		portal.$view.find(`[data-control-field="${WORK_FIELD}"]`).hide();
	}

	function set_rows(portal, rows) {
		portal._vmnp_maintenance_work_rows = rows || [];
		portal._vmnp_maintenance_work_json = rows_json(portal._vmnp_maintenance_work_rows);
		if (portal.controls?.[WORK_FIELD]?.set_value) portal.controls[WORK_FIELD].set_value(portal._vmnp_maintenance_work_json);
		const total = portal._vmnp_maintenance_work_rows.reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
		if (portal.controls?.[TOTAL_FIELD]?.set_value) portal.controls[TOTAL_FIELD].set_value(total || "");
		render_summary(portal);
	}

	function render_summary(portal) {
		const rows = read_rows(portal);
		const total = rows.reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
		const $summary = portal.$view.find("[data-md-work-summary]");
		if (!$summary.length) return;
		if (!rows.length) {
			$summary.html(`<span class="text-muted">${__("No work details added")}</span>`);
			return;
		}
		$summary.html(`
			<div class="vmnp-work-summary-table">
				<table class="table table-bordered">
					<thead><tr><th>${__("Name of Repair Work")}</th><th class="text-right">${__("Amount")}</th></tr></thead>
					<tbody>${rows.map((row) => `<tr><td>${esc(row.work)}</td><td class="text-right">${frappe.format(row.amount || 0, { fieldtype: "Currency" })}</td></tr>`).join("")}</tbody>
					<tfoot><tr><th>${__("Total")}</th><th class="text-right">${frappe.format(total, { fieldtype: "Currency" })}</th></tr></tfoot>
				</table>
			</div>
		`);
	}

	function render_dialog_rows($wrap, rows) {
		$wrap.html(`
			<div class="vmnp-work-dialog-actions" style="display:flex; gap:12px; margin-bottom:12px;">
				<button class="vmnp-primary-button vmnp-work-add-final" type="button" data-work-add style="background:#5c4de6 !important;color:#fff !important;border:0 !important;border-radius:10px !important;padding:10px 18px !important;font-weight:700 !important;min-width:132px !important;">+ ${__("Add Work")}</button>
			</div>
			<table class="table table-bordered" data-work-table>
				<thead><tr><th>${__("Name of Repair Work")}</th><th>${__("Amount")}</th><th style="width:90px;">${__("Action")}</th></tr></thead>
				<tbody>
					${rows.map((row, index) => `
						<tr data-index="${index}">
							<td><input class="form-control" data-work-name value="${esc(row.work)}"></td>
							<td><input class="form-control" type="number" data-work-amount value="${esc(row.amount || "")}"></td>
							<td><button class="btn btn-xs btn-danger" type="button" data-work-delete>${__("Delete")}</button></td>
						</tr>
					`).join("")}
				</tbody>
			</table>
		`);
	}

	function collect_dialog_rows($wrap) {
		const rows = [];
		$wrap.find("tbody tr").each((index, row) => {
			const $row = $(row);
			rows.push({
				work: String($row.find("[data-work-name]").val() || "").trim(),
				amount: Number($row.find("[data-work-amount]").val() || 0) || 0,
			});
		});
		return rows;
	}

	function open_work_dialog(portal) {
		const rows = read_rows(portal).map((row) => ({ ...row }));
		const dialog = new frappe.ui.Dialog({
			title: __("Add Work Details"),
			size: "large",
			fields: [{ fieldname: "work_html", fieldtype: "HTML" }],
			primary_action_label: __("Save"),
			async primary_action() {
				set_rows(portal, collect_dialog_rows($wrap));
				const payload = {
					json: portal._vmnp_maintenance_work_json || rows_json(portal._vmnp_maintenance_work_rows || []),
					total: (portal._vmnp_maintenance_work_rows || []).reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0),
				};
				const record_name = portal.current_view && portal.current_view.type === "form" ? portal.current_view.name : "";
				if (record_name) {
					await frappe.call({
						method: "frappe.client.set_value",
						args: {
							doctype: "Maintenance Details VMN",
							name: record_name,
							fieldname: {
								md_work_details: payload.json,
								md_total_repairingamount: payload.total,
							},
						},
					});
					frappe.show_alert({ message: __("Work details updated. Click main Save to save other fields."), indicator: "green" });
				}
				dialog.hide();
			},
		});
		dialog.show();
		dialog.get_primary_btn().css({
			background: "#5c4de6",
			border: "0",
			color: "#fff",
			borderRadius: "10px",
			fontWeight: "700",
		});
		const $wrap = $(dialog.fields_dict.work_html.wrapper);
		render_dialog_rows($wrap, rows);
		$wrap.on("click", "[data-work-add]", () => {
			rows.splice(0, rows.length, ...collect_dialog_rows($wrap));
			rows.push({ work: "", amount: 0 });
			render_dialog_rows($wrap, rows);
		});
		$wrap.on("click", "[data-work-delete]", (event) => {
			rows.splice(0, rows.length, ...collect_dialog_rows($wrap));
			const index = Number($(event.currentTarget).closest("tr").attr("data-index"));
			rows.splice(index, 1);
			render_dialog_rows($wrap, rows);
		});
	}

	function inject_work_panel(portal, data) {
		if (data.key !== "maintenance") return;
		ensure_work_control(portal, data);
		if (!portal.$view.find("[data-md-work-panel]").length) {
			portal.$view.find(".vmnp-form-actions").before(`
				<section class="vmnp-panel vmnp-form-section" data-md-work-panel>
					<div class="vmnp-form-section-head">
						<span>02</span><h2>${__("Work Details")}</h2>
					</div>
					<div style="padding:18px 24px; display:flex; justify-content:space-between; gap:16px; align-items:flex-start;">
						<div data-md-work-summary style="flex:1;"></div>
						<button class="vmnp-primary-button" type="button" data-md-work-open>+ ${__("Add Work Details")}</button>
					</div>
				</section>
			`);
		}
		portal.$view.off("click.vmnpWorkDetails").on("click.vmnpWorkDetails", "[data-md-work-open]", () => open_work_dialog(portal));
		render_summary(portal);
	}

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		inject_work_panel(this, data);
	};
})();

/* VMNP final dropdown click and end reading guard 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_power_control_changed = proto.power_control_changed;
	const previous_calculate_power_app_fields = proto.calculate_power_app_fields;
	const vehicle_maps = {
		vehicle_logs: {
			number: "ld_vehicle_number",
			name: "ld_vehicle_name",
			location: "ld_vehicle_location",
			campus: "ld_select_campus",
		},
		fuel: {
			number: "dd_vehicle_number",
			name: "dd_vehicle_name",
			location: "dd_vehicle_location",
			campus: "dd_select_campus",
		},
		maintenance: {
			number: "md_vehicle_number",
			name: "md_vehicle_name",
			location: "md_vehicle_location",
			campus: "md_campus_name",
		},
		rto: {
			number: "rto_vehicle_number",
			name: "rto_vehicle_name",
			location: "rto_location_name",
			campus: "rto_campus_name",
		},
	};

	function clean(value) {
		return String(value ?? "").trim();
	}

	function control_value(portal, fieldname) {
		return clean(portal.control_value(fieldname));
	}

	function set_silent(portal, fieldname, value) {
		if (!fieldname) return;
		if (typeof portal.vmnp_set_calculated_field_silent === "function") {
			portal.vmnp_set_calculated_field_silent(fieldname, value);
			return;
		}
		portal.set_control_value(fieldname, value);
	}

	function remember_vehicle_number(portal, key, values) {
		const mapping = vehicle_maps[key];
		if (!mapping) return;
		portal._vmnp_vehicle_number_value_by_key = portal._vmnp_vehicle_number_value_by_key || {};
		const loaded_value = control_value(portal, mapping.number) || clean(values && values[mapping.number]);
		if (loaded_value) {
			portal._vmnp_vehicle_number_value_by_key[key] = loaded_value;
		}
	}

	function update_vehicle_log_distance(portal, clear_invalid_end) {
		const start_raw = control_value(portal, "start_reading");
		const end_raw = control_value(portal, "end_reading");
		if (!start_raw || !end_raw) {
			set_silent(portal, "ld_distance", "");
			return;
		}
		const distance = portal.number_value("end_reading") - portal.number_value("start_reading");
		if (distance < 0) {
			set_silent(portal, "ld_distance", "");
			return;
		}
		set_silent(portal, "ld_distance", distance);
	}

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		remember_vehicle_number(this, data && data.key, data && data.values);

		if (data && data.key === "vehicle_logs") {
			const $form = this.$view.find("[data-record-form]");
			$form.off(".vmnpFinalEndReadingGuard");
			$form.on(
				"input.vmnpFinalEndReadingGuard",
				'[data-control-field="start_reading"] input, [data-control-field="end_reading"] input',
				() => update_vehicle_log_distance(this, false)
			);
			$form.on(
				"blur.vmnpFinalEndReadingGuard change.vmnpFinalEndReadingGuard",
				'[data-control-field="end_reading"] input',
				() => update_vehicle_log_distance(this, true)
			);
		}
	};

	proto.calculate_power_app_fields = function (key) {
		if (key === "vehicle_logs") {
			if (typeof this.duration_hours === "function") {
				set_silent(this, "ld_total_hours", this.duration_hours("start_time", "end_time"));
			}
			update_vehicle_log_distance(this, false);
			return;
		}
		return previous_calculate_power_app_fields.call(this, key);
	};

	proto.power_control_changed = function (key, fieldname) {
		const mapping = vehicle_maps[key];
		if (mapping && fieldname === mapping.number) {
			this._vmnp_vehicle_number_value_by_key = this._vmnp_vehicle_number_value_by_key || {};
			const previous_vehicle_number = clean(this._vmnp_vehicle_number_value_by_key[key]);
			const current_vehicle_number = control_value(this, mapping.number);

			if (!current_vehicle_number && previous_vehicle_number) {
				set_silent(this, mapping.number, previous_vehicle_number);
				return;
			}

			if (current_vehicle_number === previous_vehicle_number) {
				return;
			}

			const result = previous_power_control_changed.call(this, key, fieldname);
			this._vmnp_vehicle_number_value_by_key[key] = current_vehicle_number;
			return result;
		}

		return previous_power_control_changed.call(this, key, fieldname);
	};
})();

/* VMNP final interaction stabilization 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_power_control_changed = proto.power_control_changed;
	const previous_calculate_power_app_fields = proto.calculate_power_app_fields;
	const vehicle_maps = {
		vehicle_logs: {
			type: "ld_type_of_vehicle",
			number: "vehicle_number",
			name: "ld_vehicle_name",
			location: "ld_vehicle_location",
			campus: "ld_select_campus",
		},
		fuel_diesel: {
			type: "dd_type_of_vehicle",
			number: "dd_vehicle_number",
			name: "dd_vehicle_name",
			location: "dd_vehicle_location",
			campus: "dd_select_campus",
		},
		maintenance: {
			type: "md_type_of_vehicle",
			number: "md_vehicle_number",
			name: "md_vehicle_name",
			location: "md_vehicle_location",
			campus: "md_select_campus",
		},
		rto_compliance: {
			type: "rto_type_of_vehicle",
			number: "rto_vehicle_number",
			name: "rto_vehicle_name",
			location: "rto_vehicle_location",
			campus: "rto_select_campus",
		},
	};

	function clean(value) {
		return String(value ?? "").trim();
	}

	function control_value(portal, fieldname) {
		return clean(portal.control_value(fieldname));
	}

	function set_field(portal, fieldname, value) {
		if (!fieldname || !portal.controls?.[fieldname]) return;
		try {
			if (typeof portal.vmnp_set_calculated_field_silent === "function") {
				portal.vmnp_set_calculated_field_silent(fieldname, value);
			} else {
				portal.set_control_value(fieldname, value);
			}
		} catch (error) {
			try { portal.set_control_value(fieldname, value); } catch (inner) {}
		}
	}

	function ensure_dialog_styles() {
		if (document.getElementById("vmnp-work-dialog-style")) return;
		$("<style>")
			.attr("id", "vmnp-work-dialog-style")
			.text(`
				.modal-dialog [data-work-add].vmnp-primary-button,
				.modal-dialog [data-md-work-open].vmnp-primary-button {
					background: #5c4de6 !important;
					color: #fff !important;
					border: 0 !important;
					border-radius: 10px !important;
					padding: 10px 18px !important;
					font-weight: 700 !important;
					box-shadow: 0 10px 24px rgba(91, 77, 244, 0.22) !important;
				}
				.modal-dialog .modal-footer .btn-primary,
				.modal-dialog .modal-footer .btn-modal-primary {
					background: #5c4de6 !important;
					border-color: transparent !important;
					color: #fff !important;
				}
			`)
			.appendTo(document.head);
	}

	function remember_vehicle_number(portal, key, values) {
		const mapping = vehicle_maps[key];
		if (!mapping) return;
		portal._vmnp_vehicle_number_value_by_key = portal._vmnp_vehicle_number_value_by_key || {};
		const loaded_value = control_value(portal, mapping.number) || clean(values && values[mapping.number]);
		portal._vmnp_vehicle_number_value_by_key[key] = loaded_value;
	}

	function remember_select_values(portal) {
		portal._vmnp_select_value_guard = portal._vmnp_select_value_guard || {};
		portal.$view.find(".vmnp-control-slot select").each((index, select) => {
			const fieldname = $(select).closest("[data-control-field]").attr("data-control-field") || "";
			if (!fieldname) return;
			const value = clean($(select).val());
			if (value || !(fieldname in portal._vmnp_select_value_guard)) {
				portal._vmnp_select_value_guard[fieldname] = value;
			}
		});
	}

	function restore_blank_select_click(portal, fieldname) {
		if (!fieldname || !portal.$view.find(`[data-control-field="${fieldname}"] select`).length) return false;
		portal._vmnp_select_value_guard = portal._vmnp_select_value_guard || {};
		const current_value = control_value(portal, fieldname);
		const previous_value = clean(portal._vmnp_select_value_guard[fieldname]);
		if (!current_value && previous_value) {
			set_field(portal, fieldname, previous_value);
			return true;
		}
		portal._vmnp_select_value_guard[fieldname] = current_value;
		return false;
	}

	function clear_dependent_fields(portal, key, mapping) {
		const keep = new Set([mapping.type, mapping.number, "date", "dd_date", "md_date", "rto_date"]);
		portal._vmnp_select_value_guard = portal._vmnp_select_value_guard || {};
		Object.keys(portal.controls || {}).forEach((fieldname) => {
			if (keep.has(fieldname)) return;
			set_field(portal, fieldname, "");
			portal._vmnp_select_value_guard[fieldname] = "";
		});
	}

	async function refill_vehicle_details(portal, key, mapping, vehicle_number, token) {
		if (!vehicle_number) return;
		try {
			const details = await portal.api("get_vehicle_details", { vehicle_number });
			if (portal._vmnp_clear_vehicle_token !== token || !details) return;
			set_field(portal, mapping.type, details.vd_type_of_vehicle || portal.control_value(mapping.type) || "");
			set_field(portal, mapping.name, details.vd_vehicle_name || "");
			set_field(portal, mapping.location, details.vd_location || "");
			if (mapping.campus && typeof portal.load_campus_options === "function") {
				void portal.load_campus_options(mapping.campus, "");
			}
		} catch (error) {
			portal.notify_error?.(error);
		}
	}

	function update_vehicle_log_distance(portal, clear_invalid_end) {
		const start_raw = control_value(portal, "start_reading");
		const end_raw = control_value(portal, "end_reading");
		if (!start_raw || !end_raw) {
			set_field(portal, "ld_distance", "");
			return;
		}
		const distance = portal.number_value("end_reading") - portal.number_value("start_reading");
		if (distance < 0) {
			set_field(portal, "ld_distance", "");
			return;
		}
		set_field(portal, "ld_distance", distance);
	}

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		ensure_dialog_styles();
		remember_vehicle_number(this, data && data.key, data && data.values);
		remember_select_values(this);

		if (this._vmnp_vehicle_log_input_form && this._vmnp_vehicle_log_input_guard) {
			try { this._vmnp_vehicle_log_input_form.removeEventListener("input", this._vmnp_vehicle_log_input_guard, true); } catch (error) {}
			this._vmnp_vehicle_log_input_form = null;
			this._vmnp_vehicle_log_input_guard = null;
		}

		if (data && data.key === "vehicle_logs") {
			const $form = this.$view.find("[data-record-form]");
			$form.off(".vmnpStableEndReading");
			$form.on(
				"input.vmnpStableEndReading",
				'[data-control-field="start_reading"] input, [data-control-field="end_reading"] input',
				() => update_vehicle_log_distance(this, false)
			);
			$form.on(
				"blur.vmnpStableEndReading change.vmnpStableEndReading",
				'[data-control-field="end_reading"] input',
				() => update_vehicle_log_distance(this, true)
			);
		}
	};

	proto.calculate_power_app_fields = function (key) {
		if (key === "vehicle_logs") {
			if (typeof this.duration_hours === "function") {
				set_field(this, "ld_total_hours", this.duration_hours("start_time", "end_time"));
			}
			update_vehicle_log_distance(this, false);
			return;
		}
		return previous_calculate_power_app_fields.call(this, key);
	};

	proto.power_control_changed = function (key, fieldname) {
		if (key === "vehicle_logs" && ["start_reading", "end_reading"].includes(fieldname)) {
			update_vehicle_log_distance(this, false);
			return;
		}

		const mapping = vehicle_maps[key];
		if (mapping && fieldname === mapping.number) {
			this._vmnp_vehicle_number_value_by_key = this._vmnp_vehicle_number_value_by_key || {};
			const previous_vehicle_number = clean(this._vmnp_vehicle_number_value_by_key[key]);
			const current_vehicle_number = control_value(this, mapping.number);
			if (!current_vehicle_number && previous_vehicle_number) {
				set_field(this, mapping.number, previous_vehicle_number);
				return;
			}
			if (current_vehicle_number === previous_vehicle_number) return;
			this._vmnp_vehicle_number_value_by_key[key] = current_vehicle_number;
			const token = `${key}:${current_vehicle_number}:${Date.now()}`;
			this._vmnp_clear_vehicle_token = token;
			clear_dependent_fields(this, key, mapping);
			void refill_vehicle_details(this, key, mapping, current_vehicle_number, token);
			return;
		}

		if (restore_blank_select_click(this, fieldname)) return;
		return previous_power_control_changed.call(this, key, fieldname);
	};
})();

/* VMNP interaction and maintenance detail corrections 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;

	const previous_show_detail = VehicleManagementPortal.prototype.show_detail;
	const primary_option_event = window.PointerEvent ? "pointerdown" : "mousedown";
	let last_option_target = null;
	let last_option_time = 0;

	if (window._vmnp_single_option_handler) {
		["pointerdown", "mousedown", "click"].forEach((event_name) => {
			document.removeEventListener(event_name, window._vmnp_single_option_handler, true);
		});
	}

	window._vmnp_single_option_handler = (event) => {
		const option = event.target.closest?.(".vmnp-combo-list li[data-value]");
		if (!option) return;

		const now = Date.now();
		if (
			event.type !== primary_option_event &&
			option === last_option_target &&
			now - last_option_time < 750
		) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		if (event.type !== primary_option_event) return;

		event.preventDefault();
		event.stopImmediatePropagation();
		last_option_target = option;
		last_option_time = now;

		const $option = $(option);
		const $combo = $option.closest(".vmnp-combo");
		const $select = $combo.prev("select");
		if (!$select.length || $select.prop("disabled")) return;

		const value = String($option.attr("data-value") ?? "");
		$select.val(value).trigger("change");
		const selected = $select.find("option:selected")[0];
		const label = selected ? selected.textContent.trim() : "";
		$combo.find(".vmnp-combo-text")
			.text(label || __("Select"))
			.toggleClass("is-placeholder", !value);
		$combo.removeClass("is-open");
		$combo.find(".vmnp-combo-panel").attr("hidden", true);
		$combo.find(".vmnp-combo-search").val("");
	};

	["pointerdown", "mousedown", "click"].forEach((event_name) => {
		document.addEventListener(event_name, window._vmnp_single_option_handler, true);
	});

	function parse_work_rows(raw) {
		if (!raw) return [];
		let source = raw;
		if (!Array.isArray(source)) {
			try {
				source = JSON.parse(String(source));
			} catch (error) {
				return [];
			}
		}
		if (!Array.isArray(source)) return [];
		return source
			.map((row) => ({
				work: String(row?.work || row?.name_of_repair_work || row?.repair_work || "").trim(),
				amount: Number(row?.amount || row?.repair_amount || 0) || 0,
			}))
			.filter((row) => row.work || row.amount);
	}

	function render_saved_work_details(portal, rows) {
		const escape = (value) => frappe.utils.escape_html(value == null ? "" : String(value));
		const money = (value) =>
			new Intl.NumberFormat("en-IN", {
				style: "currency",
				currency: "INR",
				maximumFractionDigits: 2,
			}).format(Number(value || 0) || 0);
		const total = rows.reduce((sum, row) => sum + row.amount, 0);
		const body = rows.length
			? `<table class="table table-bordered vmnp-work-summary-table">
				<thead><tr><th>${__("Name of Repair Work")}</th><th class="text-right">${__("Amount")}</th></tr></thead>
				<tbody>${rows
					.map((row) => `<tr><td>${escape(row.work)}</td><td class="text-right">${money(row.amount)}</td></tr>`)
					.join("")}</tbody>
				<tfoot><tr><th>${__("Total")}</th><th class="text-right">${money(total)}</th></tr></tfoot>
			</table>`
			: `<div class="vmnp-state"><strong>${__("No work details added")}</strong></div>`;

		portal.$view
			.find(".vmnp-maintenance-work-section, [data-md-work-detail-view], [data-vmnp-maintenance-detail-fixed]")
			.remove();
		const $sections = portal.$view.find(".vmnp-detail-sections");
		if (!$sections.length) return;
		$sections.append(`
			<section class="vmnp-panel vmnp-detail-section" data-vmnp-maintenance-detail-fixed>
				${portal.panel_header(3, __("Work Details"), __("Maintenance Work"))}
				<div class="vmnp-maintenance-work-display">${body}</div>
			</section>
		`);
		portal.$view
			.find('[data-fieldname="md_total_repairingamount"] strong')
			.text(new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(total));
	}
	window._vmnp_parse_saved_work_rows = parse_work_rows;
	window._vmnp_render_saved_work_details = render_saved_work_details;

	VehicleManagementPortal.prototype.show_detail = async function (key, name) {
		const result = await previous_show_detail.call(this, key, name);
		if (key !== "maintenance") return result;
		try {
			const data = await this.api("get_document", { key, name });
			if (
				this.current_view?.type === "detail" &&
				this.current_view?.key === key &&
				this.current_view?.name === name
			) {
				render_saved_work_details(this, parse_work_rows(data?.values?.md_work_details));
			}
		} catch (error) {
			this.notify_error?.(error);
		}
		return result;
	};
})();

/* VMNP maintenance work detail view 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_detail = proto.render_detail;
	const previous_format_value = proto.format_value;

	function esc(value) {
		return frappe.utils.escape_html(value == null ? "" : String(value));
	}

	function parse_rows(raw) {
		if (!raw) return [];
		try {
			const parsed = JSON.parse(String(raw));
			return Array.isArray(parsed)
				? parsed.map((row) => ({ work: String(row.work || row.name_of_repair_work || ""), amount: Number(row.amount || 0) || 0 })).filter((row) => row.work || row.amount)
				: [];
		} catch (error) {
			return [];
		}
	}

	function rows_total(rows) {
		return (rows || []).reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
	}

	function money(value) {
		const number = Number(value || 0) || 0;
		return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(number);
	}

	proto.format_value = function (value, field) {
		if (field && field.fieldname === "md_total_repairingamount") {
			const form_total = Number(value || 0) || 0;
			const rows = parse_rows(this._vmnp_current_detail_values?.md_work_details);
			const derived_total = rows_total(rows);
			return esc(new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(form_total || derived_total || 0));
		}
		return previous_format_value.call(this, value, field);
	};

	proto.render_detail = function (data) {
		this._vmnp_current_detail_values = data && data.values ? data.values : {};
		previous_render_detail.call(this, data);
		this._vmnp_current_detail_values = null;

		if (!data || data.key !== "maintenance") return;
		const rows = parse_rows(data.values && data.values.md_work_details);
		if (!rows.length) return;
		const total = rows_total(rows);
		const html = `
			<section class="vmnp-panel vmnp-detail-section" data-md-work-detail-view>
				${this.panel_header(3, __("Work Details"), __("Maintenance Work"))}
				<div style="padding:0 24px 20px; overflow:auto;">
					<table class="table table-bordered vmnp-work-summary-table">
						<thead><tr><th>${__("Name of Repair Work")}</th><th class="text-right">${__("Amount")}</th></tr></thead>
						<tbody>${rows.map((row) => `<tr><td>${esc(row.work)}</td><td class="text-right">${money(row.amount)}</td></tr>`).join("")}</tbody>
						<tfoot><tr><th>${__("Total")}</th><th class="text-right">${money(total)}</th></tr></tfoot>
					</table>
				</div>
			</section>
		`;
		this.$view.find(".vmnp-detail-sections").append(html);
		const $total = this.$view.find('.vmnp-detail-field[data-fieldname="md_total_repairingamount"] strong');
		if ($total.length && (!Number(data.values.md_total_repairingamount || 0) || Number(data.values.md_total_repairingamount || 0) !== total)) {
			$total.text(new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(total));
		}
	};
})();

/* VMNP maintenance work post-save guard 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_save_form = proto.save_form;

	function parse_rows(raw) {
		if (!raw) return [];
		try {
			const parsed = JSON.parse(String(raw));
			return Array.isArray(parsed) ? parsed : [];
		} catch (error) {
			return [];
		}
	}

	function work_payload(portal) {
		const rows = portal._vmnp_maintenance_work_rows || parse_rows(portal._vmnp_maintenance_work_json || portal.controls?.md_work_details?.get_value?.());
		const clean_rows = rows
			.map((row) => ({ work: String(row.work || row.name_of_repair_work || "").trim(), amount: Number(row.amount || 0) || 0 }))
			.filter((row) => row.work || row.amount);
		const total = clean_rows.reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
		return { json: JSON.stringify(clean_rows), total };
	}

	async function persist_work_details(portal, name) {
		if (!name) return;
		const payload = work_payload(portal);
		if (!payload.json || payload.json === "[]") return;
		await frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "Maintenance Details VMN",
				name,
				fieldname: {
					md_work_details: payload.json,
					md_total_repairingamount: payload.total,
				},
			},
		});
	}

	proto.save_form = async function (data, submit) {
		if (!data || data.key !== "maintenance") {
			return previous_save_form.call(this, data, submit);
		}

		const values = {};
		try {
			Object.entries(this.controls).forEach(([fieldname, control]) => {
				values[fieldname] = control.get_value();
			});
		} catch (error) {
			frappe.msgprint({ title: __("Check form"), message: error.message || String(error), indicator: "orange" });
			return;
		}

		const payload = work_payload(this);
		values.md_work_details = payload.json;
		values.md_total_repairingamount = payload.total;
		if (this.controls?.md_total_repairingamount?.set_value) this.controls.md_total_repairingamount.set_value(payload.total || "");
		if (this.controls?.md_work_details?.set_value) this.controls.md_work_details.set_value(payload.json);

		const $buttons = this.$view.find("[data-save-form], [data-submit-form]");
		$buttons.prop("disabled", true).addClass("is-loading");
		try {
			const result = await this.api(
				"save_document",
				{
					key: data.key,
					name: data.name,
					values: JSON.stringify(values),
					submit: submit ? 1 : 0,
				},
				true
			);
			await persist_work_details(this, result.name || data.name);
			frappe.show_alert({ message: result.message || __("Saved successfully"), indicator: "green" });
			await this.show_list(data.key);
		} catch (error) {
			this.notify_error(error);
			$buttons.prop("disabled", false).removeClass("is-loading");
		}
	};
})();

/* VMNP maintenance detail child table fetch fallback 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_detail = proto.render_detail;

	function esc(value) {
		return frappe.utils.escape_html(value == null ? "" : String(value));
	}

	function parse_rows(raw) {
		if (!raw) return [];
		try {
			const parsed = JSON.parse(String(raw));
			return Array.isArray(parsed)
				? parsed.map((row) => ({ work: String(row.work || row.name_of_repair_work || ""), amount: Number(row.amount || 0) || 0 })).filter((row) => row.work || row.amount)
				: [];
		} catch (error) {
			return [];
		}
	}

	function total(rows) {
		return (rows || []).reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
	}

	function money(value) {
		return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0) || 0);
	}

	function render_work_table(portal, rows) {
		portal.$view.find('[data-md-work-detail-view]').remove();
		if (!rows.length) return;
		const sum = total(rows);
		const html = `
			<section class="vmnp-panel vmnp-detail-section" data-md-work-detail-view>
				${portal.panel_header(3, __("Work Details"), __("Maintenance Work"))}
				<div style="padding:0 24px 20px; overflow:auto;">
					<table class="table table-bordered vmnp-work-summary-table">
						<thead><tr><th>${__("Name of Repair Work")}</th><th class="text-right">${__("Amount")}</th></tr></thead>
						<tbody>${rows.map((row) => `<tr><td>${esc(row.work)}</td><td class="text-right">${money(row.amount)}</td></tr>`).join("")}</tbody>
						<tfoot><tr><th>${__("Total")}</th><th class="text-right">${money(sum)}</th></tr></tfoot>
					</table>
				</div>
			</section>
		`;
		portal.$view.find(".vmnp-detail-sections").append(html);
		const $total = portal.$view.find('.vmnp-detail-field[data-fieldname="md_total_repairingamount"] strong');
		if ($total.length) $total.text(new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(sum));
	}

	async function fetch_and_render(portal, name) {
		if (!name) return;
		try {
			const response = await frappe.call({
				method: "frappe.client.get_value",
				args: {
					doctype: "Maintenance Details VMN",
					filters: { name },
					fieldname: ["md_work_details", "md_total_repairingamount"],
				},
			});
			const message = response && response.message ? response.message : {};
			render_work_table(portal, parse_rows(message.md_work_details));
		} catch (error) {
			// Detail page ko block nahi karna; sirf child table skip rahega.
		}
	}

	proto.render_detail = function (data) {
		previous_render_detail.call(this, data);
		if (!data || data.key !== "maintenance") return;
		const local_rows = parse_rows(data.values && data.values.md_work_details);
		if (local_rows.length) {
			render_work_table(this, local_rows);
			return;
		}
		void fetch_and_render(this, data.name);
	};
})();

/* VMNP maintenance strong save/detail fallback 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_save_form = proto.save_form;
	const previous_render_detail = proto.render_detail;

	function esc(value) {
		return frappe.utils.escape_html(value == null ? "" : String(value));
	}

	function parse_rows(raw) {
		if (!raw) return [];
		try {
			const parsed = JSON.parse(String(raw));
			return Array.isArray(parsed)
				? parsed.map((row) => ({ work: String(row.work || row.name_of_repair_work || ""), amount: Number(row.amount || 0) || 0 })).filter((row) => row.work || row.amount)
				: [];
		} catch (error) {
			return [];
		}
	}

	function rows_total(rows) {
		return (rows || []).reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
	}

	function money(value) {
		return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0) || 0);
	}

	function current_work_payload(portal) {
		const rows = parse_rows(portal._vmnp_maintenance_work_json || portal.controls?.md_work_details?.get_value?.());
		const fallback_rows = portal._vmnp_maintenance_work_rows || [];
		const final_rows = rows.length ? rows : fallback_rows;
		const clean_rows = final_rows
			.map((row) => ({ work: String(row.work || row.name_of_repair_work || "").trim(), amount: Number(row.amount || 0) || 0 }))
			.filter((row) => row.work || row.amount);
		return { rows: clean_rows, json: JSON.stringify(clean_rows), total: rows_total(clean_rows) };
	}

	async function save_work_fields(name, payload) {
		if (!name) return;
		await frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "Maintenance Details VMN",
				name,
				fieldname: "md_work_details",
				value: payload.json,
			},
		});
		await frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "Maintenance Details VMN",
				name,
				fieldname: "md_total_repairingamount",
				value: payload.total,
			},
		});
	}

	function render_work_detail_table(portal, rows) {
		portal.$view.find('[data-md-work-detail-view]').remove();
		if (!rows.length) return;
		const sum = rows_total(rows);
		const html = `
			<section class="vmnp-panel vmnp-detail-section" data-md-work-detail-view>
				${portal.panel_header(3, __("Work Details"), __("Maintenance Work"))}
				<div style="padding:0 24px 20px; overflow:auto;">
					<table class="table table-bordered vmnp-work-summary-table">
						<thead><tr><th>${__("Name of Repair Work")}</th><th class="text-right">${__("Amount")}</th></tr></thead>
						<tbody>${rows.map((row) => `<tr><td>${esc(row.work)}</td><td class="text-right">${money(row.amount)}</td></tr>`).join("")}</tbody>
						<tfoot><tr><th>${__("Total")}</th><th class="text-right">${money(sum)}</th></tr></tfoot>
					</table>
				</div>
			</section>
		`;
		portal.$view.find(".vmnp-detail-sections").append(html);
		const $total = portal.$view.find('.vmnp-detail-field[data-fieldname="md_total_repairingamount"] strong');
		if ($total.length) $total.text(new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(sum));
	}

	async function fetch_full_doc_and_render(portal, name) {
		if (!name) return;
		try {
			const response = await frappe.call({
				method: "frappe.client.get",
				args: { doctype: "Maintenance Details VMN", name },
			});
			const doc = response && response.message ? response.message : {};
			render_work_detail_table(portal, parse_rows(doc.md_work_details));
		} catch (error) {
			frappe.show_alert({ message: __("Work Details load nahi ho paya."), indicator: "orange" });
		}
	}

	proto.save_form = async function (data, submit) {
		if (!data || data.key !== "maintenance") {
			return previous_save_form.call(this, data, submit);
		}

		const values = {};
		try {
			Object.entries(this.controls || {}).forEach(([fieldname, control]) => {
				values[fieldname] = control.get_value();
			});
		} catch (error) {
			frappe.msgprint({ title: __("Check form"), message: error.message || String(error), indicator: "orange" });
			return;
		}

		const payload = current_work_payload(this);
		values.md_work_details = payload.json;
		values.md_total_repairingamount = payload.total;
		if (this.controls?.md_work_details?.set_value) this.controls.md_work_details.set_value(payload.json);
		if (this.controls?.md_total_repairingamount?.set_value) this.controls.md_total_repairingamount.set_value(payload.total || "");

		const $buttons = this.$view.find("[data-save-form], [data-submit-form]");
		$buttons.prop("disabled", true).addClass("is-loading");
		try {
			const result = await this.api(
				"save_document",
				{
					key: data.key,
					name: data.name,
					values: JSON.stringify(values),
					submit: submit ? 1 : 0,
				},
				true
			);
			await save_work_fields(result.name || data.name, payload);
			frappe.show_alert({ message: result.message || __("Saved successfully"), indicator: "green" });
			await this.show_list(data.key);
		} catch (error) {
			this.notify_error(error);
			$buttons.prop("disabled", false).removeClass("is-loading");
		}
	};

	proto.render_detail = function (data) {
		previous_render_detail.call(this, data);
		if (!data || data.key !== "maintenance") return;
		const local_rows = parse_rows(data.values && data.values.md_work_details);
		if (local_rows.length) {
			render_work_detail_table(this, local_rows);
			return;
		}
		void fetch_full_doc_and_render(this, data.name);
	};
})();

/* VMNP maintenance visible detail injector 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_detail = proto.render_detail;

	function esc(value) {
		return frappe.utils.escape_html(value == null ? "" : String(value));
	}

	function parse_rows(raw) {
		if (!raw) return [];
		try {
			const parsed = JSON.parse(String(raw));
			return Array.isArray(parsed)
				? parsed.map((row) => ({ work: String(row.work || row.name_of_repair_work || ""), amount: Number(row.amount || 0) || 0 })).filter((row) => row.work || row.amount)
				: [];
		} catch (error) {
			return [];
		}
	}

	function total(rows) {
		return rows.reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
	}

	function money(value) {
		return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0) || 0);
	}

	function ensure_section(portal) {
		let $section = portal.$view.find('[data-md-work-detail-view="visible"]');
		if ($section.length) return $section;
		$section = $(`
			<section class="vmnp-panel vmnp-detail-section" data-md-work-detail-view="visible">
				${portal.panel_header(3, __("Work Details"), __("Maintenance Work"))}
				<div data-md-work-detail-body style="padding:0 24px 20px; overflow:auto;">
					<div class="vmnp-state" style="min-height:80px;"><strong>${__("Loading work details…")}</strong></div>
				</div>
			</section>
		`);
		const $sections = portal.$view.find(".vmnp-detail-sections");
		const $attachments = $sections.find(".vmnp-detail-section").eq(1);
		if ($attachments.length) $section.insertBefore($attachments);
		else $sections.append($section);
		return $section;
	}

	function render_rows(portal, rows) {
		const $section = ensure_section(portal);
		const $body = $section.find('[data-md-work-detail-body]');
		if (!rows.length) {
			$body.html(`<div class="vmnp-state" style="min-height:80px;"><strong>${__("No work details added")}</strong></div>`);
			return;
		}
		const sum = total(rows);
		$body.html(`
			<table class="table table-bordered vmnp-work-summary-table">
				<thead><tr><th>${__("Name of Repair Work")}</th><th class="text-right">${__("Amount")}</th></tr></thead>
				<tbody>${rows.map((row) => `<tr><td>${esc(row.work)}</td><td class="text-right">${money(row.amount)}</td></tr>`).join("")}</tbody>
				<tfoot><tr><th>${__("Total")}</th><th class="text-right">${money(sum)}</th></tr></tfoot>
			</table>
		`);
		const $total = portal.$view.find('.vmnp-detail-field[data-fieldname="md_total_repairingamount"] strong');
		if ($total.length) $total.text(new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(sum));
	}

	async function load_rows(portal, name) {
		try {
			const data = await portal.api("get_document_form", { key: "maintenance", name });
			render_rows(portal, parse_rows(data?.values?.md_work_details));
		} catch (error) {
			const $section = ensure_section(portal);
			$section.find('[data-md-work-detail-body]').html(`<div class="vmnp-state" style="min-height:80px;"><strong>${__("Work details load failed")}</strong></div>`);
		}
	}

	proto.render_detail = function (data) {
		previous_render_detail.call(this, data);
		if (!data || data.key !== "maintenance") return;
		const local_rows = parse_rows(data.values && data.values.md_work_details);
		if (local_rows.length) render_rows(this, local_rows);
		else {
			ensure_section(this);
			void load_rows(this, data.name);
		}
	};
})();



/* VMNP maintenance final child table detail/save sync 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_detail = proto.render_detail;
	const previous_show_detail = proto.show_detail;

	function esc(value) {
		return frappe.utils.escape_html(value == null ? "" : String(value));
	}

	function normalize_row(row) {
		row = row || {};
		return {
			work: String(row.work || row.name_of_repair_work || row.repair_work || "").trim(),
			amount: Number(row.amount || row.repair_amount || 0) || 0,
		};
	}

	function parse_rows(raw) {
		if (!raw) return [];
		if (Array.isArray(raw)) return raw.map(normalize_row).filter((row) => row.work || row.amount);
		try {
			const parsed = JSON.parse(String(raw));
			return Array.isArray(parsed) ? parsed.map(normalize_row).filter((row) => row.work || row.amount) : [];
		} catch (error) {
			return [];
		}
	}

	function rows_total(rows) {
		return (rows || []).reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
	}

	function money(value) {
		return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0) || 0);
	}

	function work_html(rows) {
		const total = rows_total(rows);
		if (!rows.length) {
			return `<div class="vmnp-state" style="min-height:72px;"><strong>${__("No work details added")}</strong></div>`;
		}
		return `
			<table class="table table-bordered vmnp-work-summary-table">
				<thead><tr><th>${__("Name of Repair Work")}</th><th class="text-right">${__("Amount")}</th></tr></thead>
				<tbody>${rows.map((row) => `<tr><td>${esc(row.work)}</td><td class="text-right">${money(row.amount)}</td></tr>`).join("")}</tbody>
				<tfoot><tr><th>${__("Total")}</th><th class="text-right">${money(total)}</th></tr></tfoot>
			</table>`;
	}

	function ensure_work_section(portal) {
		if (!portal || !portal.$view || !portal.$view.length) return $();
		portal.$view.find('[data-md-work-detail-view]:not([data-md-work-detail-view="final"])').remove();
		let $section = portal.$view.find('[data-md-work-detail-view="final"]');
		if ($section.length) return $section;
		const header = portal.panel_header
			? portal.panel_header(3, __("Work Details"), __("Maintenance Work"))
			: `<div class="vmnp-panel-head"><strong>${__("Work Details")}</strong></div>`;
		$section = $(`
			<section class="vmnp-panel vmnp-detail-section" data-md-work-detail-view="final">
				${header}
				<div data-md-work-detail-body style="padding:0 24px 20px; overflow:auto;">
					<div class="vmnp-state" style="min-height:72px;"><strong>${__("Loading work details…")}</strong></div>
				</div>
			</section>
		`);
		const $sections = portal.$view.find(".vmnp-detail-sections");
		if ($sections.length) {
			const $attachment = $sections.find(".vmnp-detail-section").filter((i, el) => /Attachment/i.test($(el).text())).first();
			if ($attachment.length) $section.insertBefore($attachment);
			else $sections.append($section);
		} else {
			portal.$view.append($section);
		}
		return $section;
	}

	function apply_rows(portal, rows) {
		const $section = ensure_work_section(portal);
		if (!$section.length) return;
		$section.find("[data-md-work-detail-body]").html(work_html(rows));
		const total = rows_total(rows);
		portal.$view.find(".vmnp-detail-field").each(function () {
			const $field = $(this);
			const label = ($field.find("label,.vmnp-detail-label").first().text() || "").trim().toLowerCase();
			if (label.includes("total repairing amount")) {
				$field.find("strong,.vmnp-detail-value").last().text(new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(total));
			}
		});
	}

	async function fetch_rows(portal, name) {
		if (!name) return [];
		try {
			const data = await portal.api("get_document_form", { key: "maintenance", name });
			return parse_rows(data && data.values && data.values.md_work_details);
		} catch (error) {
			try {
				const response = await frappe.call({ method: "frappe.client.get", args: { doctype: "Maintenance Details VMN", name } });
				return parse_rows(response && response.message && response.message.md_work_details);
			} catch (inner_error) {
				return [];
			}
		}
	}

	async function render_maintenance_work_details(portal, data) {
		if (!data || data.key !== "maintenance") return;
		let rows = parse_rows(data.values && data.values.md_work_details);
		ensure_work_section(portal);
		if (!rows.length) rows = await fetch_rows(portal, data.name);
		apply_rows(portal, rows);
	}

	proto.render_detail = function (data) {
		previous_render_detail.call(this, data);
		void render_maintenance_work_details(this, data);
	};

	proto.show_detail = async function (key, name) {
		const result = await previous_show_detail.call(this, key, name);
		if (key === "maintenance") void render_maintenance_work_details(this, { key, name, values: {} });
		return result;
	};
})();


/* VMNP maintenance work details final UI/save/display fix 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_save_form = proto.save_form;
	const previous_render_detail = proto.render_detail;
	const previous_show_detail = proto.show_detail;
	const WORK_FIELD = "md_work_details";
	const TOTAL_FIELD = "md_total_repairingamount";

	function esc(value) {
		return frappe.utils.escape_html(value == null ? "" : String(value));
	}

	function normalize_row(row) {
		row = row || {};
		return {
			work: String(row.work || row.name_of_repair_work || row.repair_work || "").trim(),
			amount: Number(row.amount || row.repair_amount || 0) || 0,
		};
	}

	function parse_rows(raw) {
		if (!raw) return [];
		if (Array.isArray(raw)) return raw.map(normalize_row).filter((row) => row.work || row.amount);
		try {
			const parsed = JSON.parse(String(raw));
			return Array.isArray(parsed) ? parsed.map(normalize_row).filter((row) => row.work || row.amount) : [];
		} catch (error) {
			return [];
		}
	}

	function rows_total(rows) {
		return (rows || []).reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
	}

	function rows_json(rows) {
		return JSON.stringify(parse_rows(rows));
	}

	function money(value) {
		return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0) || 0);
	}

	function ensure_style() {
		if (document.getElementById("vmnp-maintenance-work-final-style")) return;
		$("<style>")
			.attr("id", "vmnp-maintenance-work-final-style")
			.text(`
				.vmnp-work-add-final,
				.modal-dialog .vmnp-work-add-final,
				.modal-dialog .modal-footer .btn-primary {
					background: #5c4de6 !important;
					border: 0 !important;
					color: #ffffff !important;
					border-radius: 10px !important;
					font-weight: 700 !important;
					box-shadow: 0 10px 24px rgba(91,77,244,.24) !important;
				}
				.vmnp-work-add-final {
					display: inline-flex !important;
					align-items: center !important;
					justify-content: center !important;
					min-width: 132px !important;
					min-height: 40px !important;
					padding: 10px 18px !important;
				}
				.vmnp-work-add-final::before {
					content: "+ Add Work";
					color: #fff;
				}
				.vmnp-maintenance-work-display {
					padding: 0 24px 20px;
					overflow: auto;
				}
			`)
			.appendTo(document.head);
	}

	function sync_work_state(portal, rows) {
		const clean_rows = parse_rows(rows);
		const json = rows_json(clean_rows);
		const total = rows_total(clean_rows);
		portal._vmnp_maintenance_work_rows = clean_rows;
		portal._vmnp_maintenance_work_json = json;
		portal.controls = portal.controls || {};
		const existing_work = portal.controls[WORK_FIELD];
		const final_control = {
			_vmnp_final_work_control: true,
			get_value: () => portal._vmnp_maintenance_work_json || "[]",
			set_value: (value) => {
				portal._vmnp_maintenance_work_json = value || "[]";
				portal._vmnp_maintenance_work_rows = parse_rows(value);
			},
		};
		portal.controls[WORK_FIELD] = final_control;
		if (existing_work && !existing_work._vmnp_final_work_control && existing_work.set_value) {
			try { existing_work.set_value(json); } catch (error) {}
		}
		if (portal.controls[TOTAL_FIELD]?.set_value) {
			try { portal.controls[TOTAL_FIELD].set_value(total || ""); } catch (error) {}
		}
		portal.$view.find(`[data-control-field="${WORK_FIELD}"]`).hide();
		portal.$view.find(`[data-control-field="${TOTAL_FIELD}"] input, [data-control-field="${TOTAL_FIELD}"] textarea`).val(total || "");
		return { rows: clean_rows, json, total };
	}

	function collect_dialog_rows($wrap) {
		const rows = [];
		$wrap.find("tbody tr").each((index, row) => {
			const $row = $(row);
			rows.push({
				work: String($row.find("[data-work-name]").val() || "").trim(),
				amount: Number($row.find("[data-work-amount]").val() || 0) || 0,
			});
		});
		return parse_rows(rows);
	}

	function render_form_summary(portal) {
		const rows = parse_rows(portal._vmnp_maintenance_work_rows || portal._vmnp_maintenance_work_json);
		const $summary = portal.$view.find("[data-md-work-summary]");
		if (!$summary.length) return;
		if (!rows.length) {
			$summary.html(`<span class="text-muted">${__("No work details added")}</span>`);
			return;
		}
		const total = rows_total(rows);
		$summary.html(`
			<table class="table table-bordered vmnp-work-summary-table">
				<thead><tr><th>${__("Name of Repair Work")}</th><th class="text-right">${__("Amount")}</th></tr></thead>
				<tbody>${rows.map((row) => `<tr><td>${esc(row.work)}</td><td class="text-right">${money(row.amount)}</td></tr>`).join("")}</tbody>
				<tfoot><tr><th>${__("Total")}</th><th class="text-right">${money(total)}</th></tr></tfoot>
			</table>
		`);
	}

	function patch_work_dialog(portal) {
		portal.$view.off("click.vmnpWorkFinal").on("click.vmnpWorkFinal", "[data-md-work-open]", () => {
			setTimeout(() => {
				const $dialog = $(".modal-dialog:visible").last();
				if (!$dialog.length) return;
				const $body = $dialog.find(".modal-body");
				const $footer = $dialog.find(".modal-footer");
				$dialog.find("[data-work-add]").addClass("vmnp-work-add-final").text("");
				$footer.find(".btn-primary").addClass("vmnp-work-save-final").css({
					background: "#5c4de6",
					border: "0",
					color: "#fff",
					borderRadius: "10px",
					fontWeight: "700",
				});
				$footer.off("click.vmnpWorkSyncFinal").on("click.vmnpWorkSyncFinal", ".btn-primary", () => {
					const rows = collect_dialog_rows($body);
					sync_work_state(portal, rows);
					render_form_summary(portal);
				});
			}, 0);
		});
	}

	function ensure_form_work(portal, data) {
		if (!data || data.key !== "maintenance") return;
		ensure_style();
		const rows = parse_rows(data.values?.[WORK_FIELD] || portal._vmnp_maintenance_work_json || portal.controls?.[WORK_FIELD]?.get_value?.());
		sync_work_state(portal, rows);
		patch_work_dialog(portal);
		render_form_summary(portal);
	}

	async function persist_after_save(portal, name) {
		if (!name) return;
		const payload = sync_work_state(portal, portal._vmnp_maintenance_work_rows || []);
		await frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "Maintenance Details VMN",
				name,
				fieldname: {
					[WORK_FIELD]: payload.json,
					[TOTAL_FIELD]: payload.total,
				},
			},
		});
	}

	function detail_section_html(portal, rows) {
		return `
			<section class="vmnp-panel vmnp-detail-section" data-md-work-detail-view="final-hard">
				${portal.panel_header ? portal.panel_header(3, __("Work Details"), __("Maintenance Work")) : `<div class="vmnp-panel-head"><strong>${__("Work Details")}</strong></div>`}
				<div class="vmnp-maintenance-work-display">
					${rows.length ? `
						<table class="table table-bordered vmnp-work-summary-table">
							<thead><tr><th>${__("Name of Repair Work")}</th><th class="text-right">${__("Amount")}</th></tr></thead>
							<tbody>${rows.map((row) => `<tr><td>${esc(row.work)}</td><td class="text-right">${money(row.amount)}</td></tr>`).join("")}</tbody>
							<tfoot><tr><th>${__("Total")}</th><th class="text-right">${money(rows_total(rows))}</th></tr></tfoot>
						</table>
					` : `<div class="vmnp-state" style="min-height:72px;"><strong>${__("No work details added")}</strong></div>`}
				</div>
			</section>
		`;
	}

	function render_detail_rows(portal, rows) {
		ensure_style();
		portal.$view.find('[data-md-work-detail-view]').remove();
		const $sections = portal.$view.find(".vmnp-detail-sections");
		const html = detail_section_html(portal, rows);
		if ($sections.length) {
			const $attachment = $sections.find(".vmnp-detail-section").filter((i, el) => /Attachment/i.test($(el).text())).first();
			if ($attachment.length) $(html).insertBefore($attachment);
			else $sections.append(html);
		} else {
			portal.$view.append(html);
		}
		const total = rows_total(rows);
		portal.$view.find(".vmnp-detail-field").each(function () {
			const $field = $(this);
			const text = $field.text().toLowerCase();
			if (text.includes("total repairing amount")) {
				$field.find("strong,.vmnp-detail-value").last().text(new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(total));
			}
		});
	}

	async function fetch_detail_rows(name) {
		if (!name) return [];
		try {
			const response = await frappe.call({
				method: "frappe.client.get_value",
				args: {
					doctype: "Maintenance Details VMN",
					filters: { name },
					fieldname: [WORK_FIELD, TOTAL_FIELD],
				},
			});
			return parse_rows(response?.message?.[WORK_FIELD]);
		} catch (error) {
			return [];
		}
	}

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		ensure_form_work(this, data);
	};

	proto.save_form = async function (data, submit) {
		if (!data || data.key !== "maintenance") return previous_save_form.call(this, data, submit);
		const before = sync_work_state(this, this._vmnp_maintenance_work_rows || []);
		if (this.controls?.[WORK_FIELD]?.set_value) this.controls[WORK_FIELD].set_value(before.json);
		if (this.controls?.[TOTAL_FIELD]?.set_value) this.controls[TOTAL_FIELD].set_value(before.total || "");
		const result = await previous_save_form.call(this, data, submit);
		const saved_name = (result && result.name) || data.name;
		await persist_after_save(this, saved_name);
		return result;
	};

	proto.render_detail = function (data) {
		previous_render_detail.call(this, data);
		if (!data || data.key !== "maintenance") return;
		const local_rows = parse_rows(data.values?.[WORK_FIELD]);
		if (local_rows.length) render_detail_rows(this, local_rows);
		else fetch_detail_rows(data.name).then((rows) => render_detail_rows(this, rows));
	};

	proto.show_detail = async function (key, name) {
		const result = await previous_show_detail.call(this, key, name);
		if (key === "maintenance") {
			const rows = await fetch_detail_rows(name);
			render_detail_rows(this, rows);
		}
		return result;
	};
})();

/* VMNP maintenance direct modal fix 2026-08-10 */

/* VMNP maintenance base detail render 2026-08-10 */


/* VMNP end reading typing final guard 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_power_control_changed = proto.power_control_changed;
	const previous_calculate_power_app_fields = proto.calculate_power_app_fields;

	function raw(portal, fieldname) {
		const control = portal.controls && portal.controls[fieldname];
		const $input = control && control.$input ? control.$input : portal.$view.find(`[data-control-field="${fieldname}"] input`);
		return String($input && $input.length ? $input.val() : portal.control_value(fieldname) || "").trim();
	}

	function number(value) {
		const parsed = Number(String(value || "").replace(/,/g, ""));
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function set_input(portal, fieldname, value) {
		const next = value == null ? "" : String(value);
		const control = portal.controls && portal.controls[fieldname];
		if (control && control.$input && control.$input.length) control.$input.val(next);
		else portal.$view.find(`[data-control-field="${fieldname}"] input`).val(next);
		if (control && Object.prototype.hasOwnProperty.call(control, "value")) control.value = next;
	}

	function set_distance(portal, value) {
		set_input(portal, "ld_distance", value);
	}

	function calculate_on_blur(portal, clear_invalid_end) {
		const start = raw(portal, "start_reading");
		const end = raw(portal, "end_reading");
		if (!start || !end) {
			set_distance(portal, "");
			return;
		}
		const distance = number(end) - number(start);
		if (distance < 0) {
			set_distance(portal, "");
			return;
		}
		set_distance(portal, distance);
	}

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (!data || data.key !== "vehicle_logs") return;
		const form = this.$view.find("[data-record-form]")[0];
		if (!form) return;
		if (this._vmnp_end_reading_final_form && this._vmnp_end_reading_final_input) {
			try {
				this._vmnp_end_reading_final_form.removeEventListener("input", this._vmnp_end_reading_final_input, true);
			} catch (error) {}
		}
		this._vmnp_end_reading_final_form = form;
		this._vmnp_end_reading_final_input = (event) => {
			const field = $(event.target).closest("[data-control-field]").attr("data-control-field") || "";
			if (field === "end_reading" || field === "start_reading") {
				event.stopImmediatePropagation();
			}
		};
		form.addEventListener("input", this._vmnp_end_reading_final_input, true);
		$(form).off(".vmnpEndReadingTypingFinal");
		$(form).on(
			"blur.vmnpEndReadingTypingFinal change.vmnpEndReadingTypingFinal",
			'[data-control-field="end_reading"] input',
			() => calculate_on_blur(this, true)
		);
		$(form).on(
			"blur.vmnpEndReadingTypingFinal change.vmnpEndReadingTypingFinal",
			'[data-control-field="start_reading"] input',
			() => calculate_on_blur(this, false)
		);
	};

	proto.power_control_changed = function (key, fieldname) {
		if (key === "vehicle_logs" && (fieldname === "end_reading" || fieldname === "start_reading")) {
			return;
		}
		return previous_power_control_changed.call(this, key, fieldname);
	};

	proto.calculate_power_app_fields = function (key) {
		if (key === "vehicle_logs") {
			if (typeof this.duration_hours === "function") {
				const value = this.duration_hours("start_time", "end_time");
				set_input(this, "ld_total_hours", value);
			}
			calculate_on_blur(this, false);
			return;
		}
		return previous_calculate_power_app_fields.call(this, key);
	};
})();


/* VMNP final dropdown/readings interaction guard 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_power_control_changed = proto.power_control_changed;
	const previous_calculate_power_app_fields = proto.calculate_power_app_fields;
	const previous_load_previous_reading = proto.load_previous_reading;

	const vehicle_maps = {
		vehicle_logs: {
			number: "vehicle_number",
			keep: new Set(["date", "ld_type_of_vehicle", "vehicle_number"]),
			clear: [
				"ld_vehicle_name",
				"ld_vehicle_location",
				"ld_select_campus",
				"start_reading",
				"end_reading",
				"ld_distance",
				"from_location",
				"to_location",
			],
		},
		fuel_diesel: {
			number: "dd_vehicle_number",
			keep: new Set(["dd_date", "dd_type_of_vehicle", "dd_vehicle_number"]),
			clear: [
				"dd_vehicle_name",
				"dd_vehicle_location",
				"dd_select_campus",
				"dd_previous_fuel_fill_up_reading",
				"dd_average",
			],
		},
		maintenance: {
			number: "md_vehicle_number",
			keep: new Set(["md_date", "md_type_of_vehicle", "md_vehicle_number"]),
			clear: ["md_vehicle_name", "md_vehicle_location", "md_select_campus"],
		},
		rto_compliance: {
			number: "rto_vehicle_number",
			keep: new Set(["rto_date", "rto_type_of_vehicle", "rto_vehicle_number"]),
			clear: [
				"rto_vehicle_name",
				"rto_vehicle_location",
				"rto_select_campus",
				"rto_supervisor_name",
			],
		},
	};

	function field_from_event(event) {
		return $(event.target).closest("[data-control-field]").attr("data-control-field") || "";
	}

	function raw(portal, fieldname) {
		const control = portal.controls && portal.controls[fieldname];
		const $input = control && control.$input ? control.$input : portal.$view.find(`[data-control-field="${fieldname}"] input, [data-control-field="${fieldname}"] select, [data-control-field="${fieldname}"] textarea`);
		return String($input && $input.length ? $input.val() : portal.control_value(fieldname) || "").trim();
	}

	function number_value(value) {
		const parsed = Number(String(value || "").replace(/,/g, ""));
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function set_direct(portal, fieldname, value) {
		const next = value == null ? "" : String(value);
		const control = portal.controls && portal.controls[fieldname];
		if (control && control.$input && control.$input.length) {
			control.$input.val(next);
		} else {
			portal.$view.find(`[data-control-field="${fieldname}"] input, [data-control-field="${fieldname}"] select, [data-control-field="${fieldname}"] textarea`).val(next);
		}
		if (control && Object.prototype.hasOwnProperty.call(control, "value")) control.value = next;
	}

	function set_normal(portal, fieldname, value) {
		if (!fieldname || !portal.controls || !portal.controls[fieldname]) return;
		try {
			portal.set_control_value(fieldname, value == null ? "" : value);
		} catch (error) {
			set_direct(portal, fieldname, value);
		}
	}

	function show_invalid_reading_message() {
		const message = __("End Reading cannot be less than Start Reading.");
		if (frappe && frappe.msgprint) {
			frappe.msgprint({ title: __("Invalid Reading"), message, indicator: "orange" });
		} else if (frappe && frappe.show_alert) {
			frappe.show_alert({ message, indicator: "orange" });
		}
	}

	function validate_log_reading(portal, show_popup) {
		const start_raw = raw(portal, "start_reading");
		const end_raw = raw(portal, "end_reading");
		if (!start_raw || !end_raw) {
			set_direct(portal, "ld_distance", "");
			return;
		}
		const distance = number_value(end_raw) - number_value(start_raw);
		if (distance < 0) {
			if (show_popup) show_invalid_reading_message();
			set_direct(portal, "ld_distance", "");
			return;
		}
		set_direct(portal, "ld_distance", distance);
	}

	function calculate_dg_unit(portal) {
		const start_raw = raw(portal, "dg_start_reading");
		const end_raw = raw(portal, "dg_end_reading");
		if (!start_raw || !end_raw) {
			set_direct(portal, "dg_total_dg_unit", "");
			return;
		}
		const units = number_value(end_raw) - number_value(start_raw);
		set_direct(portal, "dg_total_dg_unit", units);
		set_direct(portal, "dg_diesel_consumption", units);
	}

	function install_style() {
		if (document.getElementById("vmnp-final-dropdown-reading-style")) return;
		$("<style>")
			.attr("id", "vmnp-final-dropdown-reading-style")
			.text(`
				.vmnp-page .vmnp-control-slot select.vmnp-select,
				.vmnp-page .vmnp-control-slot .vmnp-select {
					width: 100% !important;
					min-width: 100% !important;
					max-width: 100% !important;
				}
				.vmnp-page [data-control-field="rto_document_type"] .vmnp-select,
				.vmnp-page [data-control-field="document_type"] .vmnp-select {
					width: 100% !important;
					min-width: 260px !important;
				}
			`)
			.appendTo(document.head);
	}

	function clear_vehicle_dependents(portal, key) {
		const mapping = vehicle_maps[key];
		if (!mapping) return;
		(mapping.clear || []).forEach((fieldname) => set_normal(portal, fieldname, ""));
		portal._vmnp_select_value_guard = portal._vmnp_select_value_guard || {};
		(mapping.clear || []).forEach((fieldname) => {
			portal._vmnp_select_value_guard[fieldname] = "";
		});
	}

	function force_single_click_selects(portal) {
		const $view = portal.$view || $(document);
		$view.off(".vmnpSingleClickSelect");
		$view.on("pointerdown.vmnpSingleClickSelect mousedown.vmnpSingleClickSelect", ".vmnp-control-slot select, .vmnp-filter-row select", function () {
			if (!this.disabled) {
				this.focus({ preventScroll: true });
			}
		});
		$view.on("click.vmnpSingleClickSelect", ".vmnp-control-slot select, .vmnp-filter-row select", function () {
			if (!this.disabled) {
				this.focus({ preventScroll: true });
			}
		});
	}

	function block_old_reading_handlers(portal, data) {
		const form = portal.$view.find("[data-record-form]")[0];
		if (!form) return;
		if (portal._vmnp_final_reading_guard_form && portal._vmnp_final_reading_guard_input) {
			try { portal._vmnp_final_reading_guard_form.removeEventListener("input", portal._vmnp_final_reading_guard_input, true); } catch (error) {}
			try { portal._vmnp_final_reading_guard_form.removeEventListener("change", portal._vmnp_final_reading_guard_input, true); } catch (error) {}
		}
		const blocked = new Set();
		if (data.key === "vehicle_logs") {
			blocked.add("start_reading");
			blocked.add("end_reading");
		}
		if (data.key === "dg_operations") {
			blocked.add("dg_start_reading");
			blocked.add("dg_end_reading");
		}
		if (!blocked.size) return;
		portal._vmnp_final_reading_guard_form = form;
		portal._vmnp_final_reading_guard_input = (event) => {
			if (blocked.has(field_from_event(event))) event.stopImmediatePropagation();
		};
		form.addEventListener("input", portal._vmnp_final_reading_guard_input, true);
		form.addEventListener("change", portal._vmnp_final_reading_guard_input, true);

		const $form = $(form);
		$form.off(".vmnpFinalReadingBlurOnly");
		if (data.key === "vehicle_logs") {
			$form.on("focusout.vmnpFinalReadingBlurOnly", '[data-control-field="end_reading"] input', () => validate_log_reading(portal, true));
			$form.on("focusout.vmnpFinalReadingBlurOnly", '[data-control-field="start_reading"] input', () => validate_log_reading(portal, false));
		}
		if (data.key === "dg_operations") {
			$form.on("focusout.vmnpFinalReadingBlurOnly", '[data-control-field="dg_start_reading"] input, [data-control-field="dg_end_reading"] input', () => calculate_dg_unit(portal));
		}
	}

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		install_style();
		force_single_click_selects(this);
		block_old_reading_handlers(this, data || {});
	};

	proto.power_control_changed = function (key, fieldname) {
		if (key === "vehicle_logs" && (fieldname === "start_reading" || fieldname === "end_reading")) return;
		if (key === "dg_operations" && (fieldname === "dg_start_reading" || fieldname === "dg_end_reading")) return;
		const mapping = vehicle_maps[key];
		if (mapping && fieldname === mapping.number) {
			clear_vehicle_dependents(this, key);
		}
		return previous_power_control_changed.call(this, key, fieldname);
	};

	proto.calculate_power_app_fields = function (key) {
		if (key === "vehicle_logs") {
			if (typeof this.duration_hours === "function") {
				set_direct(this, "ld_total_hours", this.duration_hours("start_time", "end_time"));
			}
			return;
		}
		if (key === "dg_operations") {
			return;
		}
		return previous_calculate_power_app_fields.call(this, key);
	};

	proto.load_previous_reading = async function (key) {
		if (key === "dg_operations" && this._power_form_data && !this._power_form_data.is_new) return;
		return previous_load_previous_reading.call(this, key);
	};
})();


/* VMNP final numeric readings and list dropdown guard 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const previous_show_list = proto.show_list;
	const previous_calculate_power_app_fields = proto.calculate_power_app_fields;
	const previous_power_control_changed = proto.power_control_changed;

	const reading_fields = new Set([
		"start_reading",
		"end_reading",
		"dg_start_reading",
		"dg_end_reading",
	]);

	function field_from_event(event) {
		return $(event.target).closest("[data-control-field]").attr("data-control-field") || "";
	}

	function get_control_input(portal, fieldname) {
		const control = portal.controls && portal.controls[fieldname];
		if (control && control.$input && control.$input.length) return control.$input;
		return portal.$view.find(`[data-control-field="${fieldname}"] input`);
	}

	function raw(portal, fieldname) {
		const $input = get_control_input(portal, fieldname);
		return String($input && $input.length ? $input.val() : portal.control_value(fieldname) || "").trim();
	}

	function to_number(value) {
		const parsed = Number(String(value || "").replace(/,/g, ""));
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function set_input(portal, fieldname, value) {
		const next = value == null ? "" : String(value);
		const $input = get_control_input(portal, fieldname);
		if ($input && $input.length) $input.val(next);
		const control = portal.controls && portal.controls[fieldname];
		if (control && Object.prototype.hasOwnProperty.call(control, "value")) control.value = next;
	}

	function numeric_text_only(event) {
		const fieldname = field_from_event(event);
		if (!reading_fields.has(fieldname)) return;
		const input = event.target;
		const old_value = String(input.value || "");
		const cleaned = old_value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
		if (old_value !== cleaned) input.value = cleaned;
	}

	function invalid_log_reading(portal) {
		const start = raw(portal, "start_reading");
		const end = raw(portal, "end_reading");
		return Boolean(start && end && to_number(end) < to_number(start));
	}

	function validate_log_after_typing(portal) {
		const start = raw(portal, "start_reading");
		const end = raw(portal, "end_reading");
		if (!start || !end) {
			set_input(portal, "ld_distance", "");
			return;
		}
		const distance = to_number(end) - to_number(start);
		if (distance < 0) {
			if (frappe && frappe.msgprint) {
				frappe.msgprint({
					title: __("Invalid Reading"),
					message: __("End Reading cannot be less than Start Reading."),
					indicator: "orange",
				});
			}
			set_input(portal, "ld_distance", "");
			return;
		}
		set_input(portal, "ld_distance", distance);
	}

	function validate_dg_after_typing(portal) {
		const start = raw(portal, "dg_start_reading");
		const end = raw(portal, "dg_end_reading");
		if (!start || !end) {
			set_input(portal, "dg_total_dg_unit", "");
			set_input(portal, "dg_diesel_consumption", "");
			return;
		}
		const unit = to_number(end) - to_number(start);
		set_input(portal, "dg_total_dg_unit", unit);
		set_input(portal, "dg_diesel_consumption", unit);
	}

	function install_dropdown_single_click(scope) {
		const $scope = scope && scope.length ? scope : $(document);
		$scope.off(".vmnpFinalSingleDropdown");
		$scope.on(
			"pointerdown.vmnpFinalSingleDropdown mousedown.vmnpFinalSingleDropdown click.vmnpFinalSingleDropdown",
			".vmnp-control-slot select, .vmnp-filter-row select, .vmnp-list-toolbar select, select.vmnp-multi-filter",
			function () {
				if (!this.disabled) {
					try { this.focus({ preventScroll: true }); } catch (error) { this.focus(); }
				}
			}
		);
	}

	function install_reading_guards(portal, key) {
		const form = portal.$view.find("[data-record-form]")[0];
		if (!form) return;
		if (portal._vmnp_numeric_reading_form && portal._vmnp_numeric_reading_handler) {
			try { portal._vmnp_numeric_reading_form.removeEventListener("input", portal._vmnp_numeric_reading_handler, true); } catch (error) {}
		}
		portal._vmnp_numeric_reading_form = form;
		portal._vmnp_numeric_reading_handler = (event) => {
			const fieldname = field_from_event(event);
			if (!reading_fields.has(fieldname)) return;
			numeric_text_only(event);
			// Purane input/change calculators ko typing ke beech me clear karne se roko.
			event.stopImmediatePropagation();
		};
		form.addEventListener("input", portal._vmnp_numeric_reading_handler, true);

		const $form = $(form);
		$form.off(".vmnpFinalNumericBlur");
		$form.find('[data-control-field="start_reading"] input, [data-control-field="end_reading"] input, [data-control-field="dg_start_reading"] input, [data-control-field="dg_end_reading"] input')
			.attr("type", "text")
			.attr("inputmode", "decimal");

		if (key === "vehicle_logs") {
			$form.on("focusin.vmnpFinalNumericBlur", '[data-control-field="end_reading"] input', () => {
				portal._vmnp_user_typing_end_reading = true;
			});
			$form.on("focusout.vmnpFinalNumericBlur", '[data-control-field="end_reading"] input', () => {
				portal._vmnp_user_typing_end_reading = false;
				validate_log_after_typing(portal);
			});
			$form.on("focusout.vmnpFinalNumericBlur", '[data-control-field="start_reading"] input', () => {
				if (!portal._vmnp_user_typing_end_reading) validate_log_after_typing(portal);
			});
		}
		if (key === "dg_operations") {
			$form.on("focusout.vmnpFinalNumericBlur", '[data-control-field="dg_start_reading"] input, [data-control-field="dg_end_reading"] input', () => {
				validate_dg_after_typing(portal);
			});
		}
	}

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		install_dropdown_single_click(this.$view);
		if (data && ["vehicle_logs", "dg_operations"].includes(data.key)) {
			install_reading_guards(this, data.key);
		}
	};

	proto.show_list = async function (key, options = {}) {
		const result = await previous_show_list.call(this, key, options);
		install_dropdown_single_click(this.$view);
		return result;
	};

	proto.power_control_changed = function (key, fieldname) {
		if (key === "vehicle_logs" && (fieldname === "start_reading" || fieldname === "end_reading")) {
			if (!this._vmnp_user_typing_end_reading && !invalid_log_reading(this)) validate_log_after_typing(this);
			return;
		}
		if (key === "dg_operations" && (fieldname === "dg_start_reading" || fieldname === "dg_end_reading")) {
			return;
		}
		return previous_power_control_changed.call(this, key, fieldname);
	};

	proto.calculate_power_app_fields = function (key) {
		if (key === "vehicle_logs") {
			if (this._vmnp_user_typing_end_reading || invalid_log_reading(this)) return;
			if (typeof this.duration_hours === "function") {
				set_input(this, "ld_total_hours", this.duration_hours("start_time", "end_time"));
			}
			validate_log_after_typing(this);
			return;
		}
		if (key === "dg_operations") {
			return;
		}
		return previous_calculate_power_app_fields.call(this, key);
	};
})();


/* VMNP approval states 2026-08-10 */
(() => {
	const proto = VehicleManagementPortal.prototype;
	const previous_render_detail = proto.render_detail;
	const previous_render_form = proto.render_form;
	const previous_format_value = proto.format_value;
	const approval_keys = new Set(["vehicle_logs", "fuel_diesel", "maintenance", "rto_compliance", "dg_operations"]);

	proto.approval_state = function (data = {}) {
		return data.approval_state || data.values?.workflow_state || (data.docstatus === 1 ? "Approved" : "Draft");
	};

	proto.approval_badge = function (data = {}) {
		const state = this.approval_state(data);
		const css_class = state === "Approved" ? "submitted" : state === "Pending" ? "draft" : "draft";
		return `<span class="vmnp-status ${css_class}" data-approval-status><i></i>${frappe.utils.escape_html(__(state))}</span>`;
	};

	proto.bind_approval_actions = function (data) {
		this.$view.off(".approval");
		this.$view.on("click.approval", "[data-request-approval-record]", async () => {
			const $button = this.$view.find("[data-request-approval-record]");
			$button.prop("disabled", true).addClass("is-loading");
			try {
				const result = await this.api("request_approval_document", { key: data.key, name: data.name }, true);
				frappe.show_alert({ message: result.message || __("Sent for approval"), indicator: "green" });
				await this.show_detail(data.key, data.name);
			} catch (error) {
				this.notify_error(error);
				$button.prop("disabled", false).removeClass("is-loading");
			}
		});
		this.$view.on("click.approval", "[data-approve-record]", () => {
			frappe.confirm(__("Approve {0}?", [frappe.utils.escape_html(data.name)]), async () => {
				const $button = this.$view.find("[data-approve-record]");
				$button.prop("disabled", true).addClass("is-loading");
				try {
					const result = await this.api("approve_document", { key: data.key, name: data.name }, true);
					frappe.show_alert({ message: result.message || __("Approved"), indicator: "green" });
					await this.show_detail(data.key, data.name);
				} catch (error) {
					this.notify_error(error);
					$button.prop("disabled", false).removeClass("is-loading");
				}
			});
		});
	};

	proto.render_detail = function (data) {
		previous_render_detail.call(this, data);
		if (!approval_keys.has(data.key)) return;
		const $actions = this.$view.find(".vmnp-heading-actions");
		if (!$actions.length) return;
		$actions.find("[data-approval-status]").remove();
		$actions.prepend(this.approval_badge(data));
		if (data.can_request_approval && !this.$view.find("[data-request-approval-record]").length) {
			$actions.append(`
				<button class="vmnp-secondary-button" type="button" data-request-approval-record>
					${this.icon("arrow-right")}<span>${__("Send for Approval")}</span>
				</button>
			`);
		}
		if (data.can_approve && !this.$view.find("[data-approve-record]").length) {
			$actions.append(`
				<button class="vmnp-primary-button" type="button" data-approve-record>
					${this.icon("check")}<span>${__("Approve")}</span>
				</button>
			`);
		}
		this.bind_approval_actions(data);
	};

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		if (!approval_keys.has(data.key)) return;
		const $heading = this.$view.find(".vmnp-page-heading").first();
		if (!$heading.length) return;
		let $actions = $heading.find(".vmnp-heading-actions");
		if (!$actions.length) {
			$heading.append('<div class="vmnp-heading-actions"></div>');
			$actions = $heading.find(".vmnp-heading-actions");
		}
		$actions.find("[data-approval-status]").remove();
		$actions.prepend(this.approval_badge(data));
	};

	proto.format_value = function (value, field) {
		if (field?.fieldname === "workflow_state") {
			return this.approval_badge({ approval_state: value });
		}
		return previous_format_value.call(this, value, field);
	};
})();


/* VMNP maintenance add form work details guard 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_form = proto.render_form;
	const WORK_FIELD = "md_work_details";
	const TOTAL_FIELD = "md_total_repairingamount";

	function esc(value) {
		return frappe.utils.escape_html(value == null ? "" : String(value));
	}

	function normalize(row) {
		row = row || {};
		return {
			work: String(row.work || row.name_of_repair_work || row.repair_work || "").trim(),
			amount: Number(row.amount || row.repair_amount || 0) || 0,
		};
	}

	function parse_rows(raw) {
		if (!raw) return [];
		if (Array.isArray(raw)) return raw.map(normalize).filter((row) => row.work || row.amount);
		try {
			const parsed = JSON.parse(String(raw));
			return Array.isArray(parsed) ? parsed.map(normalize).filter((row) => row.work || row.amount) : [];
		} catch (error) {
			return [];
		}
	}

	function rows_total(rows) {
		return (rows || []).reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
	}

	function rows_json(rows) {
		return JSON.stringify(parse_rows(rows));
	}

	function money(value) {
		return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0) || 0);
	}

	function sync(portal, rows) {
		const clean_rows = parse_rows(rows);
		const json = rows_json(clean_rows);
		const total = rows_total(clean_rows);
		portal._vmnp_maintenance_work_rows = clean_rows;
		portal._vmnp_maintenance_work_json = json;
		portal.controls = portal.controls || {};
		portal.controls[WORK_FIELD] = {
			_vmnp_add_work_guard_control: true,
			get_value: () => portal._vmnp_maintenance_work_json || "[]",
			set_value: (value) => {
				portal._vmnp_maintenance_work_json = value || "[]";
				portal._vmnp_maintenance_work_rows = parse_rows(value);
			},
		};
		if (portal.controls[TOTAL_FIELD]?.set_value) {
			try {
				portal.controls[TOTAL_FIELD].set_value(total || "");
			} catch (error) {}
		}
		portal.$view.find(`[data-control-field="${WORK_FIELD}"]`).hide();
		portal.$view.find(`[data-control-field="${TOTAL_FIELD}"] input, [data-control-field="${TOTAL_FIELD}"] textarea`).val(total || "");
		return { rows: clean_rows, json, total };
	}

	function render_summary(portal) {
		const rows = parse_rows(portal._vmnp_maintenance_work_rows || portal._vmnp_maintenance_work_json);
		const $summary = portal.$view.find("[data-md-work-summary]");
		if (!$summary.length) return;
		if (!rows.length) {
			$summary.html(`<span class="text-muted">${__("No work details added")}</span>`);
			return;
		}
		const total = rows_total(rows);
		$summary.html(`
			<table class="table table-bordered vmnp-work-summary-table">
				<thead><tr><th>${__("Name of Repair Work")}</th><th class="text-right">${__("Amount")}</th></tr></thead>
				<tbody>${rows.map((row) => `<tr><td>${esc(row.work)}</td><td class="text-right">${money(row.amount)}</td></tr>`).join("")}</tbody>
				<tfoot><tr><th>${__("Total")}</th><th class="text-right">${money(total)}</th></tr></tfoot>
			</table>
		`);
	}

	function dialog_table(rows) {
		return `
			<div style="display:flex; gap:12px; margin-bottom:12px;">
				<button class="vmnp-primary-button" type="button" data-work-add>+ ${__("Add Work")}</button>
			</div>
			<table class="table table-bordered" data-work-table>
				<thead><tr><th>${__("Name of Repair Work")}</th><th>${__("Amount")}</th><th style="width:90px;">${__("Action")}</th></tr></thead>
				<tbody>
					${rows.map((row, index) => `
						<tr data-index="${index}">
							<td><input class="form-control" data-work-name value="${esc(row.work)}"></td>
							<td><input class="form-control" type="number" data-work-amount value="${esc(row.amount || "")}"></td>
							<td><button class="btn btn-xs btn-danger" type="button" data-work-delete>${__("Delete")}</button></td>
						</tr>
					`).join("")}
				</tbody>
			</table>
		`;
	}

	function collect_rows($wrap) {
		const rows = [];
		$wrap.find("tbody tr").each((index, row) => {
			const $row = $(row);
			rows.push({
				work: String($row.find("[data-work-name]").val() || "").trim(),
				amount: Number($row.find("[data-work-amount]").val() || 0) || 0,
			});
		});
		return parse_rows(rows);
	}

	function open_dialog(portal) {
		const rows = parse_rows(portal._vmnp_maintenance_work_rows || portal._vmnp_maintenance_work_json);
		const dialog = new frappe.ui.Dialog({
			title: __("Add Work Details"),
			size: "large",
			fields: [{ fieldname: "work_html", fieldtype: "HTML" }],
			primary_action_label: __("Save"),
			primary_action() {
				sync(portal, collect_rows($wrap));
				render_summary(portal);
				dialog.hide();
			},
		});
		dialog.show();
		const $wrap = $(dialog.fields_dict.work_html.wrapper);
		const draw = () => $wrap.html(dialog_table(rows));
		draw();
		$wrap.on("click", "[data-work-add]", () => {
			rows.splice(0, rows.length, ...collect_rows($wrap));
			rows.push({ work: "", amount: 0 });
			draw();
		});
		$wrap.on("click", "[data-work-delete]", (event) => {
			rows.splice(0, rows.length, ...collect_rows($wrap));
			const index = Number($(event.currentTarget).closest("tr").attr("data-index"));
			rows.splice(index, 1);
			draw();
		});
	}

	function ensure_panel(portal, data) {
		if (!data || data.key !== "maintenance") return;
		const initial = data.is_new || !data.name
			? parse_rows(data.values?.[WORK_FIELD])
			: parse_rows(data.values?.[WORK_FIELD] || portal.controls?.[WORK_FIELD]?.get_value?.());
		sync(portal, initial);

		let $panel = portal.$view.find("[data-md-work-panel]");
		if (!$panel.length) {
			portal.$view.find(".vmnp-form-actions").before(`
				<section class="vmnp-panel vmnp-form-section" data-md-work-panel>
					<div class="vmnp-form-section-head">
						<span>02</span><h2>${__("Work Details")}</h2>
					</div>
					<div style="padding:18px 24px; display:flex; justify-content:space-between; gap:16px; align-items:flex-start;">
						<div data-md-work-summary style="flex:1;"></div>
						<button class="vmnp-primary-button" type="button" data-md-work-open-add>+ ${__("Add Work Details")}</button>
					</div>
				</section>
			`);
		} else {
			$panel.find("[data-md-work-open]").attr("data-md-work-open-add", "1").removeAttr("data-md-work-open");
			if (!$panel.find("[data-md-work-open-add]").length) {
				$panel.find("[data-md-work-summary]").after(`<button class="vmnp-primary-button" type="button" data-md-work-open-add>+ ${__("Add Work Details")}</button>`);
			}
		}
		portal.$view.off("click.vmnpMaintenanceAddWorkGuard");
		portal.$view.on("click.vmnpMaintenanceAddWorkGuard", "[data-md-work-open-add]", () => open_dialog(portal));
		render_summary(portal);
	}

	proto.render_form = function (data) {
		previous_render_form.call(this, data);
		ensure_panel(this, data);
	};
})();

/* VMNP final maintenance detail display 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_show_detail = proto.show_detail;
	const previous_save_form = proto.save_form;
	const WORK_FIELD = "md_work_details";
	const TOTAL_FIELD = "md_total_repairingamount";

	function maintenance_rows(portal) {
		const parse = window._vmnp_parse_saved_work_rows || (() => []);
		const candidates = [
			portal._vmnp_maintenance_work_rows,
			portal._vmnp_maintenance_work_json,
			portal.controls?.[WORK_FIELD]?.get_value?.(),
		];
		for (const candidate of candidates) {
			const rows = parse(candidate);
			if (rows.length) return rows;
		}

		const rows = [];
		portal.$view.find("[data-md-work-summary] tbody tr").each((index, element) => {
			const $cells = $(element).find("td");
			const work = String($cells.eq(0).text() || "").trim();
			const amount = Number(String($cells.eq(1).text() || "").replace(/[^\d.-]/g, "")) || 0;
			if (work || amount) rows.push({ work, amount });
		});
		return rows;
	}

	proto.save_form = async function (data, submit) {
		if (!data || data.key !== "maintenance") {
			return previous_save_form.call(this, data, submit);
		}

		const missing = [];
		Object.values(this._power_form_fields || {}).forEach((field) => {
			if (!field.reqd) return;
			const value = this.control_value(field.fieldname);
			if (value === null || value === undefined || String(value).trim() === "") missing.push(field.label);
		});
		if (missing.length) {
			frappe.msgprint({
				title: __("Required fields"),
				message: __("Please fill: {0}", [frappe.utils.escape_html(missing.join(", "))]),
				indicator: "orange",
			});
			return;
		}

		const values = {};
		try {
			Object.entries(this.controls || {}).forEach(([fieldname, control]) => {
				values[fieldname] = control.get_value();
			});
		} catch (error) {
			frappe.msgprint({
				title: __("Check form"),
				message: error.message || String(error),
				indicator: "orange",
			});
			return;
		}

		const rows = maintenance_rows(this);
		const total = rows.reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);
		values[WORK_FIELD] = JSON.stringify(rows);
		values[TOTAL_FIELD] = total;

		const $buttons = this.$view.find("[data-save-form], [data-submit-form]");
		$buttons.prop("disabled", true).addClass("is-loading");
		try {
			const result = await this.api(
				"save_document",
				{
					key: data.key,
					name: data.name,
					values: JSON.stringify(values),
					submit: submit ? 1 : 0,
				},
				true
			);
			frappe.show_alert({ message: result.message || __("Saved successfully"), indicator: "green" });
			await this.show_list(data.key);
			return result;
		} catch (error) {
			this.notify_error(error);
			$buttons.prop("disabled", false).removeClass("is-loading");
		}
	};

	proto.show_detail = async function (key, name) {
		const result = await previous_show_detail.call(this, key, name);
		if (key !== "maintenance") return result;
		try {
			const data = await this.api("get_document", { key, name });
			if (
				this.current_view?.type === "detail" &&
				this.current_view?.key === key &&
				this.current_view?.name === name
			) {
				window._vmnp_render_saved_work_details?.(
					this,
					window._vmnp_parse_saved_work_rows?.(data?.values?.md_work_details) || []
				);
			}
		} catch (error) {
			this.notify_error?.(error);
		}
		return result;
	};
})();

/* VMNP final standard Workflow binding 2026-08-10 */
(() => {
	if (!window.VehicleManagementPortal) return;
	const proto = VehicleManagementPortal.prototype;
	const previous_render_detail = proto.render_detail;
	const previous_show_list = proto.show_list;

	proto.render_detail = function (data) {
		previous_render_detail.call(this, data);
		void window._vmnp_render_frappe_workflow_actions?.(this, data);
	};

	proto.show_list = async function (key, options = {}) {
		const result = await previous_show_list.call(this, key, options);
		await window._vmnp_refresh_frappe_workflow_list?.(this, key);
		return result;
	};
})();
