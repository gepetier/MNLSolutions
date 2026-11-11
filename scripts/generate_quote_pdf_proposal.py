"""Generate fictional MNL quotation previews; no Odoo or customer data."""
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas

OUT = Path(__file__).resolve().parents[1] / "output" / "pdf"
W, H = A4
L, R = 42, W - 42
NAVY, INK, MUTED = "#102D37", "#18343C", "#48616A"
TEAL, MINT, PALE, RULE = "#006D65", "#B9F1DE", "#E9F6F2", "#D9E5E6"
REG, BOLD = "Helvetica", "Helvetica-Bold"
fonts = Path("C:/Windows/Fonts")
if all((fonts / file).exists() for file in ("arial.ttf", "arialbd.ttf")):
    pdfmetrics.registerFont(TTFont("MNLText", str(fonts / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("MNLTextBold", str(fonts / "arialbd.ttf")))
    REG, BOLD = "MNLText", "MNLTextBold"


def money(number):
    return Decimal(str(number)).quantize(Decimal(".01"), rounding=ROUND_HALF_UP)


def number(value, digits=2):
    return f"{Decimal(str(value)):,.{digits}f}".translate(str.maketrans(",.", ".,"))


def euro(value):
    return number(value) + " €"


def item(code, name, detail, uom, price, *sizes):
    rows = []
    price = money(price)
    for units, length, width in sizes:
        q = Decimal(units)
        if length is not None:
            q *= Decimal(str(length))
        if width is not None:
            q *= Decimal(str(width))
        q = money(q)
        rows.append((units, length, width, q, uom, price, money(q * price)))
    return code, name, detail, rows


def special(code, name, detail, amount):
    return code, name, detail, [(None, None, None, None, "", None, money(amount))]


def groups(es):
    cover = ("01", "Cubierta" if es else "Coberta", [
        item("01.01", "Panel de cubierta HI-CT PIR · 40 mm" if es else "Panell de coberta HI-CT PIR · 40 mm",
             "Chapa 0,50 / 0,50 mm · acabado exterior HDX" if es else "Xapa 0,50 / 0,50 mm · acabat exterior HDX",
             "m²", 24.80, (12, "5.250", "1.150"), (6, "3.750", "1.150"))])
    trims = ("02" if not es else "03", "Remates" if es else "Remats", [
        item("03.01" if es else "02.01", "Remate lateral plegado" if es else "Remat lateral plegat",
             "Desarrollo 250 mm · color RAL 7016" if es else "Desenvolupament 250 mm · color RAL 7016",
             "ml", 8.70, (8, "3.125", None))])
    screws = ("03" if not es else "04", "Fijaciones" if es else "Fixacions", [
        item("04.01" if es else "03.01", "Tornillo autotaladrante con arandela" if es else "Cargol autoperforant amb volandera",
             "6,3 × 100 mm · junta EPDM", "ud." if es else "u.", .62, (180, None, None))])
    if not es:
        return [[cover, trims, screws, ("04", "Portes", [special("04.01", "Portes", "", 180)])]]
    cover[2].extend([
        item("01.02", "Panel de cubierta HI-CT PIR · 60 mm", "Chapa 0,60 / 0,50 mm · acabado exterior HDX",
             "m²", 28.60, (18, "6.480", "1.150"), (8, "4.925", "1.150"), (6, "3.220", "1.150"))])
    facade = ("02", "Fachada", [
        item("02.01", "Panel de fachada HI-F PIR · 50 mm", "Acabado microperfilado · color RAL 9002",
             "m²", 23.90, (21, "4.875", "1.000"), (14, "3.520", "1.000")),
        item("02.02", "Panel de fachada HI-F PIR · 80 mm", "Acabado liso · color RAL 7016",
             "m²", 29.75, (10, "4.125", "1.000"), (8, "3.275", "1.000"))])
    trims[2].append(item("03.02", "Remate de coronación", "Desarrollo 350 mm · color RAL 7016", "ml", 11.40,
                         (9, "3.000", None), (4, "2.250", None)))
    return [[cover, facade], [trims, screws, ("05", "Portes", [special("05.01", "Portes", "", 320)]),
                              ("06", "Descuentos", [special("06.01", "Descuento comercial", "Importe aplicado sobre la base imponible", -150)])]]


class Quote:
    def __init__(self, filename, es=False):
        self.es = es
        self.ref = "MNL-26·0002-A" if es else "MNL-26·0001-A"
        self.pages = groups(es)
        self.c = Canvas(str(OUT / filename), pagesize=A4, pageCompression=1)
        self.c.setTitle(("Vista previa de presupuesto" if es else "Previsualització de pressupost") + " | MNL Solutions")
        self.c.setAuthor("MNL Solutions")

    def label(self, x, y, content, size=9, color=INK, bold=False, align="left"):
        f = BOLD if bold else REG
        self.c.setFont(f, size)
        self.c.setFillColor(HexColor(color))
        draw = self.c.drawRightString if align == "right" else self.c.drawString
        draw(x, H-y, content)

    def box(self, x, y, w, h, color, radius=0):
        self.c.setFillColor(HexColor(color))
        if radius:
            self.c.roundRect(x, H-y-h, w, h, radius, fill=1, stroke=0)
        else:
            self.c.rect(x, H-y-h, w, h, fill=1, stroke=0)

    def rule(self, y, x=L, end=R, color=RULE):
        self.c.setStrokeColor(HexColor(color))
        self.c.setLineWidth(.55)
        self.c.line(x, H-y, end, H-y)

    def header(self, page):
        es = self.es
        self.box(0, 0, W, 6, TEAL)
        self.label(L, 40, "MNL", 23, NAVY, True)
        self.label(L+55, 39, "SOLUTIONS", 11, TEAL, True)
        self.label(R, 31, "MUESTRA · DATOS FICTICIOS" if es else "MOSTRA · DADES FICTÍCIES", 8, TEAL, True, "right")
        self.label(R, 46, self.ref, 11, NAVY, True, "right")
        if page > 1:
            self.rule(61)
            self.label(L, 83, "Detalle de partidas · continuación", 14, NAVY, True)
            return 98
        self.label(L, 74, "Presupuesto" if es else "Pressupost", 29, NAVY, True)
        self.label(L, 95, "Paneles y remates para nave industrial" if es else "Panells i remats per a nau industrial", 11, MUTED)
        self.box(L, 108, R-L, 34, PALE, 4)
        for x, title, value in [(L+10, "REFERENCIA" if es else "REFERÈNCIA", "NAVE-DEMO-02" if es else "NAU-DEMO-01"),
                                (L+183, "FECHA" if es else "DATA", "11/11/2026"),
                                (L+345, "VÁLIDO HASTA" if es else "VÀLID FINS AL", "11/12/2026")]:
            self.label(x, 120, title, 7, TEAL, True)
            self.label(x, 133, value, 9.5, NAVY, True)
        self.label(L, 162, "EMISOR" if es else "EMISSOR", 7.5, TEAL, True)
        self.label(L, 178, "MNL Solutions", 12, NAVY, True)
        self.label(L, 192, "Distribuidor Oficial · Induspanel", 9, MUTED)
        self.label(L, 205, "www.induspanel.es", 9, MUTED)
        x = L+260
        self.label(x, 162, "CLIENTE" if es else "CLIENT", 7.5, TEAL, True)
        self.label(x, 178, "Construcciones Demo, S.L." if es else "Muntatges Exemple, SL", 12, NAVY, True)
        self.label(x, 192, "C/ de la Muestra, 1 · 00000 Villa de Muestra" if es else "C/ de la Mostra, 1 · 00000 Vila de Mostra", 8.5)
        self.label(x, 205, "NIF:    " + ("" if es else "DEMO-0001"), 8.5)
        self.label(x+110, 205, "Tel.:    " + ("" if es else "000 000 000"), 8.5)
        self.label(x, 218, ("Correo: " if es else "Correu: ") + "ofertes@example.invalid", 8.5)
        self.label(x, 231, ("Contacto: " if es else "Contacte: ") + ("" if es else "Equip de compres"), 8.5)
        self.rule(243)
        self.label(L, 261, "Detalle de partidas" if es else "Detall de partides", 14, NAVY, True)
        self.label(R, 261, "Importes de línea sin IVA" if es else "Imports de línia sense IVA", 8, MUTED, align="right")
        return 272

    def columns(self, y):
        self.box(L, y, R-L, 20, NAVY, 3)
        self.label(L+9, y+13, "ARTÍCULO" if self.es else "ARTICLE", 7.4, "#FFFFFF", True)
        titles = ["UDS", "LONG. m", "ANCHO m" if self.es else "AMPLE m", "CANT." if self.es else "QUANT.", "UD.", "PRECIO €" if self.es else "PREU €", "IMPORTE €" if self.es else "IMPORT €"]
        for x, title in zip(self.positions, titles):
            self.label(x, y+13, title, 7.3, "#FFFFFF", True, "right")
        return y+24

    positions = [238, 285, 332, 381, 408, 467, R-9]

    def family(self, y, group):
        code, title, items = group
        self.box(L, y, R-L, 16, PALE, 2)
        self.label(L+8, y+11, code + "  /  " + title.upper(), 8, TEAL, True)
        y += 17
        family_sum = Decimal(0)
        for code, name, detail, rows in items:
            value = sum(row[-1] for row in rows)
            family_sum += value
            self.label(L+8, y+12, code, 8, TEAL, True)
            self.label(L+43, y+12, name, 9.3, NAVY, True)
            if detail:
                self.label(L+43, y+23, detail, 7.6, MUTED)
            y += 27 if detail else 15
            for units, length, width, q, uom, price, subtotal in rows:
                self.rule(y+14)
                if units is not None:
                    self.label(L+43, y+10, "Medida" if self.es else "Mida", 7.5, MUTED)
                    vals = [str(units), number(length, 3) if length is not None else "-", number(width, 3) if width is not None else "-", number(q), uom, number(price), number(subtotal)]
                else:
                    vals = ["", "", "", "", "", "", number(subtotal)]
                for x, val in zip(self.positions, vals):
                    self.label(x, y+10, val, 8, INK, x == self.positions[-1], "right")
                y += 14
            if len(rows) > 1:
                self.label(L+43, y+10, "Total variante" if self.es else "Total variant", 7.7, MUTED, True)
                self.label(self.positions[3], y+10, number(sum(row[3] for row in rows)), 8, TEAL, True, "right")
                self.label(self.positions[4], y+10, rows[0][4], 8, TEAL, True, "right")
                self.label(R-9, y+10, number(value), 8, TEAL, True, "right")
                y += 14
        self.label(L+8, y+10, ("Subtotal · " + title), 8, MUTED, True)
        self.label(R-9, y+10, euro(family_sum), 8.5, NAVY, True, "right")
        return y+15

    def closing(self, y):
        es = self.es
        base = sum(row[-1] for page in self.pages for _, _, items in page for _, _, _, rows in items for row in rows)
        vat = money(base * Decimal(".21"))
        y += 10
        x = R-193
        self.box(x, y, 193, 78, PALE, 5)
        self.label(x+10, y+16, "Base imponible" if es else "Base imposable", 9)
        self.label(R-10, y+16, euro(base), 9, INK, True, "right")
        self.label(x+10, y+32, "IVA (21 %)", 9)
        self.label(R-10, y+32, euro(vat), 9, INK, True, "right")
        self.box(x, y+43, 193, 35, NAVY, 4)
        self.label(x+10, y+64, "TOTAL", 9, MINT, True)
        self.label(R-10, y+66, euro(base+vat), 15, "#FFFFFF", True, "right")
        self.label(L, y+12, "FORMA DE PAGO" if es else "FORMA DE PAGAMENT", 7.5, TEAL, True)
        self.label(L, y+28, "Recibo bancario a 30 días" if es else "Transferència bancària", 10, NAVY, True)
        if not es:
            self.label(L, y+42, "IBAN: només es mostrarà al document real", 8, MUTED)
        self.label(L, y+59, "Validez: 30 días" if es else "Validesa: 30 dies", 8.5, MUTED)
        y += 85
        self.rule(y)
        self.label(L, y+14, "ACEPTACIÓN" if es else "ACCEPTACIÓ", 7.5, TEAL, True)
        self.label(L, y+28, "Nombre, fecha y firma del cliente:" if es else "Nom, data i signatura del client:", 8.5)
        self.rule(y+47, L, L+235, MUTED)
        assert y+47 < H-43, f"Closing overflow: {y}"

    def render(self):
        for page, group_list in enumerate(self.pages, 1):
            y = self.columns(self.header(page))
            for group in group_list:
                y = self.family(y, group)
            if page == len(self.pages):
                self.closing(y)
            else:
                self.label(L, y+22, "El presupuesto continúa en la página siguiente.", 8.5, MUTED)
                assert y+22 < H-43
            self.rule(H-33)
            self.label(L, H-20, self.ref + "  /  " + ("Vista previa" if self.es else "Previsualització"), 7.5, MUTED)
            self.label(R, H-20, f"{page:02} / {len(self.pages):02}", 8, TEAL, True, "right")
            self.c.showPage()
        self.c.save()


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    Quote("MNL-pressupost-preview-CA.pdf").render()
    Quote("MNL-presupuesto-preview-ES.pdf", es=True).render()
