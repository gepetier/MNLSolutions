import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());

const PROVIDER_MODEL = "x_mnl_transport_provider";
const PROVIDER_MODEL_NAME = "Proveïdor de transport MNL";
const PROVIDER_ACTION_NAME = "Proveïdors de transport MNL";
const PROVIDER_MENU_NAME = "Proveïdors de transport";
const PROVIDER_LIST_VIEW = "mnl.transport.provider.list";
const PROVIDER_FORM_VIEW = "mnl.transport.provider.form";
const ORDER_VIEW = "MNL - configuració de Portes";
const DISCOUNT_VIEW = "MNL - descompte per línies seleccionades";
const APPLY_TRANSPORT_ACTION = "MNL - Aplicar Portes";
const REMOVE_TRANSPORT_ACTION = "MNL - Treure Portes";
const APPLY_LINE_DISCOUNT_ACTION = "MNL - Aplicar descompte a línies seleccionades";
const TRANSPORT_PRODUCT_CODE = "MNL-PORTES";

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function getModel(model) {
  const [record] = await client.searchRead("ir.model", [["model", "=", model]], ["id", "name", "model", "state"], {
    limit: 1,
  });
  return record || null;
}

async function ensureCustomModel() {
  const existing = await getModel(PROVIDER_MODEL);
  if (existing) return existing;
  const id = await client.create("ir.model", {
    name: PROVIDER_MODEL_NAME,
    model: PROVIDER_MODEL,
    state: "manual",
  });
  return getModel(PROVIDER_MODEL) || { id, name: PROVIDER_MODEL_NAME, model: PROVIDER_MODEL };
}

async function upsertField(modelId, values) {
  const [existing] = await client.searchRead(
    "ir.model.fields",
    [["model_id", "=", modelId], ["name", "=", values.name]],
    ["id", "name", "field_description", "ttype", "relation"],
    { limit: 1 },
  );
  if (existing) {
    const updates = { field_description: values.field_description };
    if (values.selection) updates.selection = values.selection;
    await client.write("ir.model.fields", [existing.id], updates);
    return existing.id;
  }
  return client.create("ir.model.fields", {
    model_id: modelId,
    state: "manual",
    store: true,
    ...values,
  });
}

async function ensureProviderFields(modelId) {
  const definitions = [
    { name: "x_name", field_description: "Nom", ttype: "char", required: true },
    { name: "x_active", field_description: "Actiu", ttype: "boolean" },
    { name: "x_partner_id", field_description: "Contacte proveïdor", ttype: "many2one", relation: "res.partner" },
    {
      name: "x_pricing_mode",
      field_description: "Tipus de cost",
      ttype: "selection",
      selection: "[('fixed', 'Preu fix'), ('hourly', 'Preu per hora')]",
    },
    { name: "x_fixed_cost", field_description: "Cost fix", ttype: "float" },
    { name: "x_hourly_rate", field_description: "Preu base per hora", ttype: "float" },
    { name: "x_min_hours", field_description: "Mínim d'hores", ttype: "float" },
    { name: "x_combined_surcharge", field_description: "Increment combinat / hora", ttype: "float" },
    { name: "x_crane_surcharge", field_description: "Increment grua / hora", ttype: "float" },
    { name: "x_trailer_surcharge", field_description: "Increment tràiler / hora", ttype: "float" },
    { name: "x_rigid_surcharge", field_description: "Increment rígid / hora", ttype: "float" },
    { name: "x_van_surcharge", field_description: "Increment furgó / hora", ttype: "float" },
    { name: "x_zone_catalonia_surcharge", field_description: "Increment zona Catalunya", ttype: "float" },
    { name: "x_zone_spain_surcharge", field_description: "Increment zona Espanya", ttype: "float" },
    { name: "x_zone_other_surcharge", field_description: "Increment altres zones", ttype: "float" },
    {
      name: "x_customer_pricing_mode",
      field_description: "Càlcul del preu a client",
      ttype: "selection",
      selection: "[('fixed', 'Preu fix'), ('markup', 'Cost + percentatge')]",
    },
    { name: "x_customer_fixed_price", field_description: "Preu fix a client", ttype: "float" },
    { name: "x_customer_markup_pct", field_description: "Increment a client (%)", ttype: "float" },
  ];
  const ids = {};
  for (const definition of definitions) {
    ids[definition.name] = await upsertField(modelId, definition);
  }
  return ids;
}

async function ensureOrderFields(orderModelId, providerModel) {
  const definitions = [
    { name: "x_mnl_portes", field_description: "Portes", ttype: "boolean" },
    {
      name: "x_mnl_transport_provider_id",
      field_description: "Proveïdor de transport",
      ttype: "many2one",
      relation: providerModel,
    },
    { name: "x_mnl_portes_combined", field_description: "Combinat", ttype: "boolean" },
    { name: "x_mnl_portes_crane", field_description: "Grua", ttype: "boolean" },
    { name: "x_mnl_portes_hours", field_description: "Hores", ttype: "float" },
    {
      name: "x_mnl_portes_vehicle",
      field_description: "Tipus de vehicle",
      ttype: "selection",
      selection: "[('trailer', 'Tràiler'), ('rigid', 'Camió rígid'), ('van', 'Furgó')]",
    },
    {
      name: "x_mnl_portes_zone",
      field_description: "Zona d'entrega",
      ttype: "selection",
      selection: "[('catalonia', 'Catalunya'), ('spain', 'Espanya'), ('other', 'Altres')]",
    },
    {
      name: "x_mnl_portes_tax_ids",
      field_description: "Impostos de Portes",
      ttype: "many2many",
      relation: "account.tax",
    },
    { name: "x_mnl_portes_supplier_cost", field_description: "Cost del proveïdor", ttype: "float" },
    { name: "x_mnl_portes_customer_price", field_description: "Preu a client", ttype: "float" },
    { name: "x_mnl_portes_margin_pct", field_description: "Marge de Portes (%)", ttype: "float" },
  ];
  const ids = {};
  for (const definition of definitions) {
    ids[definition.name] = await upsertField(orderModelId, definition);
  }
  return ids;
}

async function ensureLineFields(lineModelId, providerModel) {
  const definitions = [
    { name: "x_mnl_is_portes", field_description: "És una línia de Portes", ttype: "boolean" },
    {
      name: "x_mnl_transport_provider_id",
      field_description: "Proveïdor de transport",
      ttype: "many2one",
      relation: providerModel,
    },
    { name: "x_mnl_portes_supplier_cost", field_description: "Cost de Portes", ttype: "float" },
    { name: "x_mnl_portes_margin_pct", field_description: "Marge de Portes (%)", ttype: "float" },
  ];
  const ids = {};
  for (const definition of definitions) {
    ids[definition.name] = await upsertField(lineModelId, definition);
  }
  return ids;
}

async function ensureDiscountWizardField(discountModelId) {
  return upsertField(discountModelId, {
    name: "x_mnl_line_ids",
    field_description: "Línies amb descompte",
    ttype: "many2many",
    relation: "sale.order.line",
  });
}

async function upsertServerAction(name, modelId, code) {
  const [existing] = await client.searchRead(
    "ir.actions.server",
    [["name", "=", name], ["model_id", "=", modelId]],
    ["id"],
    { limit: 1 },
  );
  const values = { name, model_id: modelId, state: "code", code };
  if (existing) {
    await client.write("ir.actions.server", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.actions.server", values);
}

async function upsertView({ name, model, type, arch_db, inherit_id = false, priority = 16 }) {
  const [existing] = await client.searchRead("ir.ui.view", [["name", "=", name], ["model", "=", model]], ["id"], {
    limit: 1,
  });
  const values = { name, model, type, arch_db, priority };
  if (inherit_id) {
    values.inherit_id = inherit_id;
    values.mode = "extension";
  }
  if (existing) {
    await client.write("ir.ui.view", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.ui.view", values);
}

async function ensureAccess(modelId) {
  const [groupData] = await client.searchRead(
    "ir.model.data",
    [["module", "=", "base"], ["name", "=", "group_user"], ["model", "=", "res.groups"]],
    ["res_id"],
    { limit: 1 },
  );
  if (!groupData) throw new Error("No trobo el grup intern d'Odoo.");
  const name = "mnl_transport_provider_user";
  const [existing] = await client.searchRead("ir.model.access", [["name", "=", name]], ["id"], { limit: 1 });
  const values = {
    name,
    model_id: modelId,
    group_id: groupData.res_id,
    perm_read: true,
    perm_write: true,
    perm_create: true,
    perm_unlink: true,
  };
  if (existing) {
    await client.write("ir.model.access", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.model.access", values);
}

async function upsertWindowAction() {
  const [existing] = await client.searchRead(
    "ir.actions.act_window",
    [["name", "=", PROVIDER_ACTION_NAME], ["res_model", "=", PROVIDER_MODEL]],
    ["id"],
    { limit: 1 },
  );
  const values = {
    name: PROVIDER_ACTION_NAME,
    res_model: PROVIDER_MODEL,
    view_mode: "list,form",
    target: "current",
  };
  if (existing) {
    await client.write("ir.actions.act_window", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.actions.act_window", values);
}

async function upsertMenu(actionId) {
  const [salesConfiguration] = await client.searchRead(
    "ir.ui.menu",
    [["name", "=", "Configuration"], ["parent_id.name", "=", "Sales"]],
    ["id"],
    { limit: 1 },
  );
  if (!salesConfiguration) throw new Error("No trobo el menú Sales / Configuration.");
  const [existing] = await client.searchRead(
    "ir.ui.menu",
    [["name", "=", PROVIDER_MENU_NAME], ["parent_id", "=", salesConfiguration.id]],
    ["id"],
    { limit: 1 },
  );
  const values = {
    name: PROVIDER_MENU_NAME,
    parent_id: salesConfiguration.id,
    action: `ir.actions.act_window,${actionId}`,
    sequence: 85,
  };
  if (existing) {
    await client.write("ir.ui.menu", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.ui.menu", values);
}

async function ensureTransportProduct() {
  const [existing] = await client.searchRead(
    "product.product",
    [["default_code", "=", TRANSPORT_PRODUCT_CODE]],
    ["id", "product_tmpl_id", "name", "taxes_id"],
    { limit: 1 },
  );
  if (existing) return existing;

  const [salesTax] = await client.searchRead(
    "account.tax",
    [["name", "=", "21% S"], ["type_tax_use", "=", "sale"], ["active", "=", true]],
    ["id"],
    { limit: 1 },
  );
  const fields = await client.fieldsGet("product.template", []);
  const values = {
    name: "Portes",
    default_code: TRANSPORT_PRODUCT_CODE,
    sale_ok: true,
    purchase_ok: false,
    list_price: 0,
  };
  if (fields.type) values.type = "service";
  if (fields.detailed_type) values.detailed_type = "service";
  if (fields.taxes_id && salesTax) values.taxes_id = [[6, 0, [salesTax.id]]];
  const templateId = await client.create("product.template", values);
  const [product] = await client.searchRead(
    "product.product",
    [["product_tmpl_id", "=", templateId]],
    ["id", "product_tmpl_id", "name", "taxes_id"],
    { limit: 1 },
  );
  if (!product) throw new Error("Odoo ha creat la plantilla Portes però no la variant.");
  return product;
}

const APPLY_TRANSPORT_CODE = `
for record in records:
    if not record.x_mnl_portes:
        raise UserError("Activa primer la casella Portes.")
    provider = record.x_mnl_transport_provider_id
    if not provider:
        raise UserError("Selecciona un proveïdor de transport.")

    zone_surcharge = 0.0
    if record.x_mnl_portes_zone == 'spain':
        zone_surcharge = provider.x_zone_spain_surcharge or 0.0
    elif record.x_mnl_portes_zone == 'other':
        zone_surcharge = provider.x_zone_other_surcharge or 0.0
    else:
        zone_surcharge = provider.x_zone_catalonia_surcharge or 0.0

    if provider.x_pricing_mode == 'fixed':
        supplier_cost = (provider.x_fixed_cost or 0.0) + zone_surcharge
    else:
        hours = record.x_mnl_portes_hours or 0.0
        minimum = provider.x_min_hours or 0.0
        if hours < minimum:
            hours = minimum
        if hours <= 0:
            raise UserError("Indica les hores del transport.")
        hourly_rate = provider.x_hourly_rate or 0.0
        if record.x_mnl_portes_combined:
            hourly_rate += provider.x_combined_surcharge or 0.0
        if record.x_mnl_portes_crane:
            hourly_rate += provider.x_crane_surcharge or 0.0
        if record.x_mnl_portes_vehicle == 'trailer':
            hourly_rate += provider.x_trailer_surcharge or 0.0
        elif record.x_mnl_portes_vehicle == 'rigid':
            hourly_rate += provider.x_rigid_surcharge or 0.0
        elif record.x_mnl_portes_vehicle == 'van':
            hourly_rate += provider.x_van_surcharge or 0.0
        supplier_cost = (hours * hourly_rate) + zone_surcharge

    if provider.x_customer_pricing_mode == 'fixed':
        customer_price = provider.x_customer_fixed_price or 0.0
    else:
        customer_price = supplier_cost * (1.0 + (provider.x_customer_markup_pct or 0.0) / 100.0)

    supplier_cost = round(supplier_cost, 2)
    customer_price = round(customer_price, 2)
    margin_pct = round(((customer_price - supplier_cost) / customer_price * 100.0), 2) if customer_price else 0.0
    product = env['product.product'].search([('default_code', '=', '${TRANSPORT_PRODUCT_CODE}')], limit=1)
    if not product:
        raise UserError("No trobo el producte intern Portes.")

    tax_ids = []
    selected_taxes = record.x_mnl_portes_tax_ids or product.taxes_id
    for tax in selected_taxes:
        if not tax.company_id or tax.company_id == record.company_id:
            tax_ids.append(tax.id)

    line = env['sale.order.line'].search([
        ('order_id', '=', record.id),
        ('x_mnl_is_portes', '=', True),
    ], limit=1)
    values = {
        'product_id': product.id,
        'name': 'Portes',
        'product_uom_qty': 1.0,
        'price_unit': customer_price,
        'tax_ids': [(6, 0, tax_ids)],
        'x_mnl_is_portes': True,
        'x_mnl_transport_provider_id': provider.id,
        'x_mnl_portes_supplier_cost': supplier_cost,
        'x_mnl_portes_margin_pct': margin_pct,
    }
    if line:
        line.write(values)
    else:
        values['order_id'] = record.id
        line = env['sale.order.line'].create(values)
        line.write({
            'name': 'Portes',
            'price_unit': customer_price,
            'tax_ids': [(6, 0, tax_ids)],
            'x_mnl_portes_supplier_cost': supplier_cost,
            'x_mnl_portes_margin_pct': margin_pct,
        })
    record.write({
        'x_mnl_portes_supplier_cost': supplier_cost,
        'x_mnl_portes_customer_price': customer_price,
        'x_mnl_portes_margin_pct': margin_pct,
    })

action = {
    'type': 'ir.actions.act_window',
    'res_model': 'sale.order',
    'res_id': record.id,
    'view_mode': 'form',
    'target': 'current',
}
`;

const REMOVE_TRANSPORT_CODE = `
for record in records:
    lines = env['sale.order.line'].search([
        ('order_id', '=', record.id),
        ('x_mnl_is_portes', '=', True),
    ])
    if lines:
        lines.unlink()
    record.write({
        'x_mnl_portes': False,
        'x_mnl_portes_supplier_cost': 0.0,
        'x_mnl_portes_customer_price': 0.0,
        'x_mnl_portes_margin_pct': 0.0,
    })

action = {
    'type': 'ir.actions.act_window',
    'res_model': 'sale.order',
    'res_id': record.id,
    'view_mode': 'form',
    'target': 'current',
}
`;

const APPLY_LINE_DISCOUNT_CODE = `
for wizard in records:
    lines = wizard.x_mnl_line_ids
    if not lines:
        raise UserError("Selecciona com a mínim una línia.")
    percentage = (wizard.discount_percentage or 0.0) * 100.0
    if percentage < 0.0 or percentage > 100.0:
        raise UserError("El descompte ha d'estar entre 0 i 100%.")
    valid_lines = env['sale.order.line']
    for line in lines:
        if line.order_id == wizard.sale_order_id and not line.display_type:
            valid_lines |= line
    if not valid_lines:
        raise UserError("No hi ha cap línia vàlida seleccionada.")
    valid_lines.write({'discount': percentage})
action = {'type': 'ir.actions.act_window_close'}
`;

const INITIALIZER_CODE = `
for record in records:
    values = {}
    partner = record.partner_id
    mnl_document = (record.name or '').startswith('MNL-') or record.x_studio_referencia or record.x_studio_revisio
    if partner:
        if not record.x_studio_contacte_pressupost_id and partner.x_studio_contacte_principal_id:
            values['x_studio_contacte_pressupost_id'] = partner.x_studio_contacte_principal_id.id
        if not record.x_studio_adreca_obra_id and record.partner_shipping_id and record.partner_shipping_id != partner:
            values['x_studio_adreca_obra_id'] = record.partner_shipping_id.id
        if not record.x_studio_idioma_document:
            values['x_studio_idioma_document'] = partner.lang if partner.lang in ['es_ES', 'ca_ES', 'en_US'] else 'es_ES'
        if mnl_document and not record.x_studio_referencia and record.name:
            source = (record.name or '').strip()
            parts = source.rsplit('-', 1)
            tail = parts[1].strip() if len(parts) == 2 else ''
            is_revision = len(tail) == 1 and tail.upper() in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            values['x_studio_referencia'] = parts[0].strip() if is_revision else source
    if mnl_document and not record.x_studio_revisio:
        source = (record.name or '').strip()
        parts = source.rsplit('-', 1)
        tail = parts[1].strip() if len(parts) == 2 else ''
        is_revision = len(tail) == 1 and tail.upper() in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        values['x_studio_revisio'] = tail.upper() if is_revision else 'A'
    if not record.x_studio_condicions_acceptacio:
        language = values.get('x_studio_idioma_document') or record.x_studio_idioma_document or 'es_ES'
        days = False
        if record.validity_date and record.date_order:
            days = (record.validity_date - record.date_order.date()).days
        if days is not False:
            conditions = {
                'ca_ES': 'Acceptació del pressupost mitjançant signatura i retorn. Oferta vàlida durant %s dies.' % days,
                'en_US': 'Quotation accepted by signature and return. Offer valid for %s days.' % days,
                'es_ES': 'Aceptación del presupuesto mediante firma y devolución. Oferta válida durante %s días.' % days,
            }
        else:
            conditions = {
                'ca_ES': 'Acceptació del pressupost mitjançant signatura i retorn.',
                'en_US': 'Quotation accepted by signature and return.',
                'es_ES': 'Aceptación del presupuesto mediante firma y devolución.',
            }
        values['x_studio_condicions_acceptacio'] = conditions.get(language, conditions['es_ES'])
    if record.quotation_document_ids:
        values['quotation_document_ids'] = [(5, 0, 0)]
    if values:
        record.write(values)
`;

function providerListArch() {
  return `<list string="Proveïdors de transport" default_order="x_name">
  <field name="x_active"/>
  <field name="x_name"/>
  <field name="x_partner_id"/>
  <field name="x_pricing_mode"/>
  <field name="x_fixed_cost"/>
  <field name="x_hourly_rate"/>
  <field name="x_min_hours"/>
  <field name="x_customer_pricing_mode"/>
  <field name="x_customer_fixed_price"/>
  <field name="x_customer_markup_pct"/>
</list>`;
}

function providerFormArch() {
  return `<form string="Proveïdor de transport">
  <sheet>
    <group>
      <group string="Proveïdor">
        <field name="x_active"/>
        <field name="x_name"/>
        <field name="x_partner_id" options="{'no_create': False}"/>
        <field name="x_pricing_mode"/>
      </group>
      <group string="Venda al client">
        <field name="x_customer_pricing_mode"/>
        <field name="x_customer_fixed_price" invisible="x_customer_pricing_mode != 'fixed'"/>
        <field name="x_customer_markup_pct" invisible="x_customer_pricing_mode != 'markup'"/>
      </group>
    </group>
    <group string="Cost fix" invisible="x_pricing_mode != 'fixed'">
      <field name="x_fixed_cost"/>
    </group>
    <group string="Cost variable per hora" invisible="x_pricing_mode != 'hourly'" col="4">
      <field name="x_hourly_rate"/>
      <field name="x_min_hours"/>
      <field name="x_combined_surcharge"/>
      <field name="x_crane_surcharge"/>
      <field name="x_trailer_surcharge"/>
      <field name="x_rigid_surcharge"/>
      <field name="x_van_surcharge"/>
    </group>
    <group string="Increment per zona" col="3">
      <field name="x_zone_catalonia_surcharge"/>
      <field name="x_zone_spain_surcharge"/>
      <field name="x_zone_other_surcharge"/>
    </group>
  </sheet>
</form>`;
}

function orderViewArch(applyActionId, removeActionId) {
  return `<data>
  <xpath expr="//div[@name='so_button_below_order_lines']" position="inside">
    <span class="ms-3">
      <field name="x_mnl_portes" class="me-1"/>
      <label for="x_mnl_portes" string="Portes"/>
    </span>
  </xpath>
  <xpath expr="//div[@name='so_button_below_order_lines']" position="after">
    <group name="mnl_transport_configuration" string="Configuració de Portes" invisible="not x_mnl_portes" col="4">
      <field name="x_mnl_transport_provider_id" string="Proveïdor" options="{'no_create': True}" required="x_mnl_portes"/>
      <field name="x_mnl_portes_zone" string="Zona d'entrega" required="x_mnl_portes"/>
      <field name="x_mnl_portes_combined" string="Combinat"/>
      <field name="x_mnl_portes_crane" string="Grua"/>
      <field name="x_mnl_portes_hours" string="Hores"/>
      <field name="x_mnl_portes_vehicle" string="Vehicle"/>
      <field name="x_mnl_portes_tax_ids" string="Impostos" widget="many2many_tags" domain="[('type_tax_use', '=', 'sale'), ('company_id', '=', company_id)]"/>
      <separator string="Resultat" colspan="4"/>
      <field name="x_mnl_portes_supplier_cost" string="Cost proveïdor" readonly="1"/>
      <field name="x_mnl_portes_customer_price" string="Preu a client" readonly="1"/>
      <field name="x_mnl_portes_margin_pct" string="Marge (%)" readonly="1"/>
      <button name="${applyActionId}" type="action" string="Aplicar / actualitzar Portes" class="btn-primary" icon="fa-truck"/>
      <button name="${removeActionId}" type="action" string="Treure Portes" class="btn-secondary" icon="fa-times" confirm="S'eliminarà la línia Portes del pressupost."/>
      <div class="text-muted" colspan="4">Els proveïdors de preu fix ignoren hores, combinat, grua i vehicle. La zona s'aplica sempre al cost del proveïdor.</div>
    </group>
  </xpath>
  <xpath expr="//page[@name='mnl_conditions']//field[@name='x_studio_validesa_dies']" position="attributes">
    <attribute name="invisible">1</attribute>
  </xpath>
  <xpath expr="//page[@name='mnl_conditions']//field[@name='validity_date']" position="attributes">
    <attribute name="readonly">0</attribute>
    <attribute name="string">Vàlid fins a</attribute>
  </xpath>
</data>`;
}

function discountViewArch(actionId) {
  return `<data>
  <xpath expr="//field[@name='discount_type']" position="after">
    <group string="Línies concretes">
      <field name="x_mnl_line_ids" widget="many2many_tags" domain="[('order_id', '=', sale_order_id), ('display_type', '=', False)]" options="{'no_create': True}"/>
      <div class="text-muted">Per aplicar un percentatge només a aquestes línies, informa el percentatge i utilitza el botó específic.</div>
    </group>
  </xpath>
  <xpath expr="//footer/button[@name='action_apply_discount']" position="before">
    <button type="action" name="${actionId}" string="Aplicar a línies seleccionades" class="btn btn-primary" invisible="not x_mnl_line_ids"/>
  </xpath>
</data>`;
}

async function upsertProvider(values) {
  const [existing] = await client.searchRead(PROVIDER_MODEL, [["x_name", "=", values.x_name]], ["id"], { limit: 1 });
  if (existing) {
    await client.write(PROVIDER_MODEL, [existing.id], values);
    return existing.id;
  }
  return client.create(PROVIDER_MODEL, values);
}

async function ensureSampleProviders() {
  const huurreId = await upsertProvider({
    x_name: "Huurre · Combinat",
    x_active: true,
    x_pricing_mode: "fixed",
    x_fixed_cost: 250,
    x_hourly_rate: 0,
    x_min_hours: 0,
    x_combined_surcharge: 0,
    x_crane_surcharge: 0,
    x_trailer_surcharge: 0,
    x_rigid_surcharge: 0,
    x_van_surcharge: 0,
    x_zone_catalonia_surcharge: 0,
    x_zone_spain_surcharge: 150,
    x_zone_other_surcharge: 300,
    x_customer_pricing_mode: "fixed",
    x_customer_fixed_price: 420,
    x_customer_markup_pct: 0,
  });
  const borrellId = await upsertProvider({
    x_name: "Transports Borrell",
    x_active: true,
    x_pricing_mode: "hourly",
    x_fixed_cost: 0,
    x_hourly_rate: 40,
    x_min_hours: 4,
    x_combined_surcharge: 20,
    x_crane_surcharge: 30,
    x_trailer_surcharge: 20,
    x_rigid_surcharge: 12,
    x_van_surcharge: 5,
    x_zone_catalonia_surcharge: 0,
    x_zone_spain_surcharge: 120,
    x_zone_other_surcharge: 250,
    x_customer_pricing_mode: "markup",
    x_customer_fixed_price: 0,
    x_customer_markup_pct: 20,
  });
  return { huurreId, borrellId };
}

async function backup() {
  const modelNames = ["sale.order", "sale.order.line", "sale.order.discount", PROVIDER_MODEL];
  const models = await client.searchRead("ir.model", [["model", "in", modelNames]], ["id", "name", "model", "state"], {
    limit: 20,
  });
  const modelIds = models.map((model) => model.id);
  const fields = modelIds.length
    ? await client.searchRead(
        "ir.model.fields",
        [["model_id", "in", modelIds], ["name", "ilike", "mnl"]],
        ["id", "model", "name", "field_description", "ttype", "relation", "selection"],
        { limit: 300, order: "model,name" },
      )
    : [];
  const actions = await client.searchRead(
    "ir.actions.server",
    [["name", "in", [APPLY_TRANSPORT_ACTION, REMOVE_TRANSPORT_ACTION, APPLY_LINE_DISCOUNT_ACTION, "MNL · Inicialitzar pressupost"]]],
    ["id", "name", "model_id", "code"],
    { limit: 20 },
  );
  const views = await client.searchRead(
    "ir.ui.view",
    [["name", "in", [PROVIDER_LIST_VIEW, PROVIDER_FORM_VIEW, ORDER_VIEW, DISCOUNT_VIEW]]],
    ["id", "name", "model", "inherit_id", "priority", "arch_db"],
    { limit: 20 },
  );
  const automations = await client.searchRead(
    "base.automation",
    [["name", "in", ["MNL - Recalcular venciment per validesa", "MNL - UI recalcular venciment per validesa"]]],
    ["id", "name", "active", "action_server_ids"],
    { limit: 10, context: { active_test: false } },
  );
  mkdirSync("logs", { recursive: true });
  const file = join("logs", `odoo-transport-backup-${client.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify({ database: client.database, backedUpAt: new Date().toISOString(), models, fields, actions, views, automations }, null, 2));
  return file;
}

async function configureNativeValidity() {
  const [initializer] = await client.searchRead(
    "ir.actions.server",
    [["name", "=", "MNL · Inicialitzar pressupost"], ["model_name", "=", "sale.order"]],
    ["id"],
    { limit: 1 },
  );
  if (!initializer) throw new Error("No trobo l'acció d'inicialització del pressupost.");
  await client.write("ir.actions.server", [initializer.id], { code: INITIALIZER_CODE });

  const automations = await client.searchRead(
    "base.automation",
    [["name", "in", ["MNL - Recalcular venciment per validesa", "MNL - UI recalcular venciment per validesa"]]],
    ["id", "name", "active"],
    { limit: 10, context: { active_test: false } },
  );
  for (const automation of automations) {
    if (automation.active) await client.write("base.automation", [automation.id], { active: false });
  }
  return { initializerActionId: initializer.id, disabledAutomationIds: automations.map((automation) => automation.id) };
}

async function inspect() {
  const models = await client.searchRead(
    "ir.model",
    [["model", "in", [PROVIDER_MODEL, "sale.order", "sale.order.line", "sale.order.discount"]]],
    ["id", "name", "model", "state"],
    { limit: 20 },
  );
  const transportFields = await client.searchRead(
    "ir.model.fields",
    [["name", "ilike", "mnl_portes"]],
    ["id", "model", "name", "field_description", "ttype", "relation"],
    { limit: 100, order: "model,name" },
  );
  const providers = (await getModel(PROVIDER_MODEL))
    ? await client.searchRead(PROVIDER_MODEL, [], ["id", "x_name", "x_pricing_mode", "x_customer_pricing_mode"], {
        limit: 50,
        order: "x_name",
      })
    : [];
  const views = await client.searchRead(
    "ir.ui.view",
    [["name", "in", [PROVIDER_LIST_VIEW, PROVIDER_FORM_VIEW, ORDER_VIEW, DISCOUNT_VIEW]]],
    ["id", "name", "model", "active", "inherit_id"],
    { limit: 20 },
  );
  const actions = await client.searchRead(
    "ir.actions.server",
    [["name", "in", [APPLY_TRANSPORT_ACTION, REMOVE_TRANSPORT_ACTION, APPLY_LINE_DISCOUNT_ACTION]]],
    ["id", "name", "model_name"],
    { limit: 20 },
  );
  const automations = await client.searchRead(
    "base.automation",
    [["name", "in", ["MNL - Recalcular venciment per validesa", "MNL - UI recalcular venciment per validesa"]]],
    ["id", "name", "active"],
    { limit: 10, context: { active_test: false } },
  );
  const transportProduct = await client.searchRead(
    "product.product",
    [["default_code", "=", TRANSPORT_PRODUCT_CODE]],
    ["id", "name", "default_code", "taxes_id"],
    { limit: 2 },
  );
  const menus = await client.searchRead(
    "ir.ui.menu",
    [["name", "=", PROVIDER_MENU_NAME], ["parent_id.name", "=", "Configuration"]],
    ["id", "name", "parent_id", "action"],
    { limit: 10 },
  );
  const testOrders = await client.searchRead(
    "sale.order",
    [["client_order_ref", "ilike", "TEST-PORTES-"]],
    ["id", "name", "client_order_ref", "state"],
    { limit: 20 },
  );
  return {
    database: client.database,
    models,
    transportFields,
    providers,
    views,
    actions,
    automations,
    transportProduct,
    menus,
    testOrders,
  };
}

async function install() {
  const backupFile = await backup();
  const providerModel = await ensureCustomModel();
  const saleOrderModel = await getModel("sale.order");
  const saleOrderLineModel = await getModel("sale.order.line");
  const discountWizardModel = await getModel("sale.order.discount");
  if (!saleOrderModel || !saleOrderLineModel || !discountWizardModel) {
    throw new Error("Falta algun model estàndard de vendes o descomptes.");
  }

  const providerFields = await ensureProviderFields(providerModel.id);
  const orderFields = await ensureOrderFields(saleOrderModel.id, PROVIDER_MODEL);
  const lineFields = await ensureLineFields(saleOrderLineModel.id, PROVIDER_MODEL);
  const discountFieldId = await ensureDiscountWizardField(discountWizardModel.id);
  const accessId = await ensureAccess(providerModel.id);
  const transportProduct = await ensureTransportProduct();

  const applyTransportActionId = await upsertServerAction(APPLY_TRANSPORT_ACTION, saleOrderModel.id, APPLY_TRANSPORT_CODE);
  const removeTransportActionId = await upsertServerAction(REMOVE_TRANSPORT_ACTION, saleOrderModel.id, REMOVE_TRANSPORT_CODE);
  const applyLineDiscountActionId = await upsertServerAction(
    APPLY_LINE_DISCOUNT_ACTION,
    discountWizardModel.id,
    APPLY_LINE_DISCOUNT_CODE,
  );

  const providerListViewId = await upsertView({
    name: PROVIDER_LIST_VIEW,
    model: PROVIDER_MODEL,
    type: "list",
    arch_db: providerListArch(),
    priority: 16,
  });
  const providerFormViewId = await upsertView({
    name: PROVIDER_FORM_VIEW,
    model: PROVIDER_MODEL,
    type: "form",
    arch_db: providerFormArch(),
    priority: 16,
  });
  const orderViewId = await upsertView({
    name: ORDER_VIEW,
    model: "sale.order",
    type: "form",
    inherit_id: 2023,
    priority: 98,
    arch_db: orderViewArch(applyTransportActionId, removeTransportActionId),
  });
  const discountViewId = await upsertView({
    name: DISCOUNT_VIEW,
    model: "sale.order.discount",
    type: "form",
    inherit_id: 2010,
    priority: 98,
    arch_db: discountViewArch(applyLineDiscountActionId),
  });

  const windowActionId = await upsertWindowAction();
  const menuId = await upsertMenu(windowActionId);
  const sampleProviders = process.argv.includes("--production") ? [] : await ensureSampleProviders();
  const validity = await configureNativeValidity();

  const result = {
    database: client.database,
    backupFile,
    providerModelId: providerModel.id,
    fields: { providerFields, orderFields, lineFields, discountFieldId },
    accessId,
    transportProduct,
    actions: { applyTransportActionId, removeTransportActionId, applyLineDiscountActionId, windowActionId },
    views: { providerListViewId, providerFormViewId, orderViewId, discountViewId },
    menuId,
    sampleProviders,
    validity,
  };
  mkdirSync("logs", { recursive: true });
  const logFile = join("logs", `odoo-transport-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify(result, null, 2));
  return { ...result, logFile };
}

async function runServerAction(actionId, model, recordId) {
  return client.call("ir.actions.server", "run", [[actionId]], {
    context: { active_model: model, active_id: recordId, active_ids: [recordId] },
  });
}

async function validateInstalledConfiguration() {
  const [partner] = await client.searchRead("res.partner", [["name", "=", "MNL TEST AUTOMATION - DO NOT USE"]], ["id"], {
    limit: 1,
  });
  let partnerId = partner?.id;
  let createdPartner = false;
  if (!partnerId) {
    partnerId = await client.create("res.partner", { name: "MNL TEST AUTOMATION - DO NOT USE" });
    createdPartner = true;
  }

  let orderId;
  try {
    const inspection = await inspect();
    const actions = Object.fromEntries(inspection.actions.map((action) => [action.name, action.id]));
    const providers = await client.searchRead(
      PROVIDER_MODEL,
      [["x_name", "in", ["Huurre · Combinat", "Transports Borrell"]]],
      ["id", "x_name"],
      { limit: 2 },
    );
    const providerByName = Object.fromEntries(providers.map((provider) => [provider.x_name, provider.id]));
    const [product] = await client.searchRead(
      "product.product",
      [["default_code", "=", TRANSPORT_PRODUCT_CODE]],
      ["id", "taxes_id"],
      { limit: 1 },
    );
    orderId = await client.create("sale.order", {
      partner_id: partnerId,
      client_order_ref: `TEST-PORTES-${new Date().toISOString()}`,
    });

    await client.write("sale.order", [orderId], {
      x_mnl_portes: true,
      x_mnl_transport_provider_id: providerByName["Huurre · Combinat"],
      x_mnl_portes_zone: "catalonia",
      x_mnl_portes_combined: true,
      x_mnl_portes_tax_ids: [[6, 0, product.taxes_id]],
    });
    await runServerAction(actions[APPLY_TRANSPORT_ACTION], "sale.order", orderId);
    const [huurreOrder] = await client.searchRead(
      "sale.order",
      [["id", "=", orderId]],
      ["x_mnl_portes_supplier_cost", "x_mnl_portes_customer_price", "x_mnl_portes_margin_pct", "validity_date", "x_studio_validesa_dies"],
      { limit: 1 },
    );
    const [huurreLine] = await client.searchRead(
      "sale.order.line",
      [["order_id", "=", orderId], ["x_mnl_is_portes", "=", true]],
      ["id", "name", "price_unit", "tax_ids", "x_mnl_portes_supplier_cost", "x_mnl_portes_margin_pct"],
      { limit: 1 },
    );

    await client.write("sale.order", [orderId], {
      x_mnl_transport_provider_id: providerByName["Transports Borrell"],
      x_mnl_portes_zone: "catalonia",
      x_mnl_portes_combined: true,
      x_mnl_portes_crane: false,
      x_mnl_portes_hours: 8,
      x_mnl_portes_vehicle: "trailer",
    });
    await runServerAction(actions[APPLY_TRANSPORT_ACTION], "sale.order", orderId);
    const [borrellOrder] = await client.searchRead(
      "sale.order",
      [["id", "=", orderId]],
      ["x_mnl_portes_supplier_cost", "x_mnl_portes_customer_price", "x_mnl_portes_margin_pct"],
      { limit: 1 },
    );
    const [borrellLine] = await client.searchRead(
      "sale.order.line",
      [["order_id", "=", orderId], ["x_mnl_is_portes", "=", true]],
      ["id", "name", "price_unit", "tax_ids", "x_mnl_portes_supplier_cost", "x_mnl_portes_margin_pct"],
      { limit: 1 },
    );

    const secondLineId = await client.create("sale.order.line", {
      order_id: orderId,
      product_id: product.id,
      name: "Línia de control sense descompte",
      product_uom_qty: 1,
      price_unit: 100,
    });
    const wizardId = await client.create("sale.order.discount", {
      sale_order_id: orderId,
      discount_type: "sol_discount",
      discount_percentage: 0.15,
      x_mnl_line_ids: [[6, 0, [borrellLine.id]]],
    });
    await runServerAction(actions[APPLY_LINE_DISCOUNT_ACTION], "sale.order.discount", wizardId);
    const discountLines = await client.searchRead(
      "sale.order.line",
      [["id", "in", [borrellLine.id, secondLineId]]],
      ["id", "name", "discount"],
      { limit: 2, order: "id" },
    );

    await runServerAction(actions[REMOVE_TRANSPORT_ACTION], "sale.order", orderId);
    const remainingTransportLines = await client.call("sale.order.line", "search_count", [
      [["order_id", "=", orderId], ["x_mnl_is_portes", "=", true]],
    ]);

    const checks = {
      huurre: huurreOrder.x_mnl_portes_supplier_cost === 250 && huurreOrder.x_mnl_portes_customer_price === 420,
      borrell: borrellOrder.x_mnl_portes_supplier_cost === 640 && borrellOrder.x_mnl_portes_customer_price === 768,
      lineName: huurreLine.name === "Portes" && borrellLine.name === "Portes",
      taxesFromOdoo: huurreLine.tax_ids.length > 0 && borrellLine.tax_ids.length > 0,
      selectiveDiscount:
        discountLines.find((line) => line.id === borrellLine.id)?.discount === 15 &&
        discountLines.find((line) => line.id === secondLineId)?.discount === 0,
      removeTransport: remainingTransportLines === 0,
      nativeValidityFromOdoo: Boolean(huurreOrder.validity_date) && !huurreOrder.x_studio_validesa_dies,
    };
    if (Object.values(checks).some((value) => !value)) {
      throw new Error(`Ha fallat la validació: ${JSON.stringify({ checks, huurreOrder, borrellOrder, huurreLine, borrellLine, discountLines })}`);
    }
    return { checks, huurreOrder, borrellOrder, huurreLine, borrellLine, discountLines };
  } finally {
    if (orderId) {
      try {
        await client.unlink("sale.order", [orderId]);
      } catch {
        // La prova informa abans qualsevol error funcional; la neteja és best-effort.
      }
    }
    if (createdPartner) {
      try {
        await client.unlink("res.partner", [partnerId]);
      } catch {
        // La neteja del contacte temporal és best-effort.
      }
    }
  }
}

async function main() {
  await client.authenticate();
  if (process.argv.includes("--inspect")) {
    console.log(JSON.stringify(await inspect(), null, 2));
    return;
  }
  if (!process.argv.includes("--apply")) {
    throw new Error("Operació d'escriptura: torna a executar amb --apply i ODOO_ENV_FILE=112.env.");
  }
  const productionApply = process.argv.includes("--production") && client.database === "mnl-technical-consultant";
  const testApply = process.argv.includes("--test") && /^provesmnl\d+$/.test(client.database);
  if (!productionApply && !testApply) {
    throw new Error(`Indica --test per a una base provesmnl o --production per a mnl-technical-consultant; base actual: ${client.database}.`);
  }
  const installation = await install();
  const validation = process.argv.includes("--test") ? await validateInstalledConfiguration() : null;
  console.log(JSON.stringify({ installation, validation }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
