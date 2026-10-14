from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "quote-template-previews"
W, H = 980, 1280


def font(size, bold=False, italic=False):
    name = "arial"
    if bold and italic:
        name = "arialbi"
    elif bold:
        name = "arialbd"
    elif italic:
        name = "ariali"
    path = Path("C:/Windows/Fonts") / f"{name}.ttf"
    if path.exists():
        return ImageFont.truetype(str(path), size)
    fallback = "DejaVuSans"
    if bold and italic:
        fallback += "-BoldOblique"
    elif bold:
        fallback += "-Bold"
    elif italic:
        fallback += "-Oblique"
    try:
        return ImageFont.truetype(fallback + ".ttf", size)
    except OSError:
        return ImageFont.load_default(size=size)


F = {
    "xs": font(11),
    "s": font(13),
    "m": font(15),
    "mb": font(15, True),
    "b": font(18, True),
    "h": font(34, True),
    "xl": font(46, True),
}


def text(draw, xy, value, fill="#111111", f=None, anchor=None, align="left"):
    draw.text(xy, value, fill=fill, font=f or F["m"], anchor=anchor, align=align)


def wrap(draw, value, width, f):
    words = value.split()
    lines = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip()
        if draw.textbbox((0, 0), test, font=f)[2] <= width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def money(value):
    return f"{value} EUR"


def label(draw, xy, value, bg, fg="#111111"):
    x, y = xy
    draw.rounded_rectangle([x, y, x + 96, y + 28], radius=6, fill=bg)
    text(draw, (x + 48, y + 14), value, fg, F["xs"], anchor="mm")


def row(draw, y, cols, widths, fills=None, line="#dfe7e4", f=None):
    x = 44
    fills = fills or [None] * len(cols)
    for value, width, fill in zip(cols, widths, fills):
        if fill:
            draw.rectangle([x, y, x + width, y + 42], fill=fill)
        if value:
            text(draw, (x + width - 8, y + 13), value, f=f or F["s"], anchor="ra")
        x += width
    draw.line([44, y + 42, W - 44, y + 42], fill=line)


def style_a():
    img = Image.new("RGB", (W, H), "#f7faf8")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 310], fill="#11181b")
    d.polygon([(0, 0), (430, 0), (0, 260)], fill="#17332f")
    text(d, (44, 50), "MNL", "#edf8f5", F["xl"])
    text(d, (44, 154), "Pressupost industrial premium", "#edf8f5", F["h"])
    text(d, (44, 204), "Panells, remateria i solucions constructives a mida", "#8da49e", F["m"])
    d.rounded_rectangle([626, 44, 936, 266], radius=8, outline="#405153", fill="#1c2528")
    label(d, (646, 66), "Proposta A", "#3ef1c6", "#05130f")
    text(d, (646, 126), "Pressupost", "#a9bfba", F["s"])
    text(d, (646, 152), "SO-TEST-001", "#ffffff", F["b"])
    text(d, (646, 210), "Total proposta", "#a9bfba", F["s"])
    text(d, (646, 236), money("8.246,72"), "#ffffff", F["b"])
    metas = [("Client", "Client Industrial Demo"), ("Data", "08/07/2026"), ("Validesa", "30 dies")]
    for i, (k, v) in enumerate(metas):
        x = 44 + i * 294
        d.rectangle([x, 350, x + 3, 392], fill="#00a889")
        text(d, (x + 14, 350), k, "#66757a", F["s"])
        text(d, (x + 14, 374), v, "#172022", F["mb"])
    d.rectangle([44, 430, W - 44, 468], fill="#1f2a2e")
    headers = ["Article", "Uds", "Llarg", "Ample", "m2", "Preu", "Import"]
    xs = [54, 500, 590, 675, 760, 840, 930]
    for h, x in zip(headers, xs):
        text(d, (x, 441), h, "#ffffff", F["s"], anchor="ra" if h != "Article" else None)
    items = [
        ("Panell HI-CT 60 PIR\nChapa 0,5/0,5 - Blanc Pirineo - Class. 1.01", "22", "6,00", "1,15", "151,80", "24,35", "3.696,33"),
        ("Remat lateral lacat\nDesenvolupament 500 mm - color a definir", "48", "-", "-", "48 ml", "18,40", "883,20"),
        ("Transport i manipulacio\nEntrega en obra, descarrega no inclosa", "1", "-", "-", "1", "365,00", "365,00"),
    ]
    y = 486
    for item in items:
        d.line([44, y + 56, W - 44, y + 56], fill="#dfe7e4")
        first, *rest = item
        main, sub = first.split("\n")
        text(d, (54, y), main, "#172022", F["mb"])
        text(d, (54, y + 24), sub, "#66757a", F["s"])
        for val, x in zip(rest, xs[1:]):
            text(d, (x, y + 10), val, "#172022", F["s"], anchor="ra")
        y += 74
    total_x, total_y = 626, 770
    for i, (k, v) in enumerate([("Base imposable", "6.815,47"), ("IVA 21%", "1.431,25")]):
        text(d, (total_x, total_y + i * 28), k, "#172022", F["m"])
        text(d, (936, total_y + i * 28), v, "#172022", F["mb"], anchor="ra")
    d.line([626, 838, 936, 838], fill="#172022", width=2)
    text(d, (626, 854), "Total", "#172022", F["b"])
    text(d, (936, 854), "8.246,72", "#172022", F["b"], anchor="ra")
    d.line([44, 1040, W - 44, 1040], fill="#dfe7e4")
    text(d, (44, 1064), "Condicions", "#172022", F["mb"])
    text(d, (44, 1088), "Preus subjectes a validacio tecnica i disponibilitat de material.", "#66757a", F["s"])
    return img


def style_b():
    img = Image.new("RGB", (W, H), "#ffffff")
    d = ImageDraw.Draw(img)
    for x in range(0, W, 32):
        d.line([x, 0, x, H], fill="#e9eef2")
    for y in range(0, H, 32):
        d.line([0, y, W, y], fill="#e9eef2")
    d.rectangle([42, 42, W - 42, H - 42], fill="#ffffff", outline="#18232d", width=2)
    d.line([42, 150, W - 42, 150], fill="#18232d", width=2)
    d.line([718, 42, 718, 150], fill="#18232d", width=2)
    text(d, (70, 72), "MNL SOLUTIONS", "#111111", F["h"])
    text(d, (70, 118), "Departament tecnic i pressupostos", "#5d6873", F["m"])
    label(d, (746, 62), "Proposta B", "#18232d", "#ffffff")
    text(d, (746, 112), "SO-TEST-001", "#18232d", F["b"])
    y = 150
    labels = [("Client", "Client Industrial Demo"), ("Projecte", "Coberta panell"), ("Data", "08/07/2026"), ("Comercial", "MNL")]
    for i, (k, v) in enumerate(labels):
        x1 = 42 + i * 224
        d.rectangle([x1, y, x1 + 224, y + 76], outline="#18232d", width=2)
        text(d, (x1 + 12, y + 14), k, "#5d6873", F["s"])
        text(d, (x1 + 12, y + 40), v, "#111111", F["mb"])
    d.rectangle([42, 226, W - 42, 278], outline="#18232d", width=2)
    text(d, (66, 244), "Desglossament tecnic", "#111111", F["b"])
    label(d, (730, 238), "Enginyeria", "#18232d", "#ffffff")
    d.rectangle([42, 278, W - 42, 318], fill="#f4f7f9", outline="#18232d", width=2)
    headers = ["Class.", "Descripcio", "Uds", "Long", "Ancho", "Total", "P. unit.", "Import"]
    xs = [64, 134, 510, 590, 680, 760, 850, 930]
    for h, x in zip(headers, xs):
        text(d, (x, 290), h, "#18232d", F["s"], anchor="ra" if h != "Descripcio" and h != "Class." else None)
    items = [
        ("1.01", "HI-CT 60 PIR\nChapa 56, recobriment poliester", "22", "6,00", "1,15", "151,80", "24,35", "3.696,33"),
        ("2.01", "Remat lateral lacat\nPerfil segons detall constructiu", "48", "-", "-", "48 ml", "18,40", "883,20"),
    ]
    y = 334
    for item in items:
        d.line([42, y + 66, W - 42, y + 66], fill="#c8d0d8")
        text(d, (64, y), item[0], "#111111", F["s"])
        main, sub = item[1].split("\n")
        text(d, (134, y), main, "#111111", F["mb"])
        text(d, (134, y + 24), sub, "#5d6873", F["s"])
        for val, x in zip(item[2:], xs[2:]):
            text(d, (x, y + 8), val, "#111111", F["s"], anchor="ra")
        y += 82
    text(d, (626, 610), "Subtotal", "#111111", F["m"])
    text(d, (936, 610), "6.815,47", "#111111", F["mb"], anchor="ra")
    text(d, (626, 640), "IVA 21%", "#111111", F["m"])
    text(d, (936, 640), "1.431,25", "#111111", F["mb"], anchor="ra")
    d.line([626, 690, 936, 690], fill="#111111", width=2)
    text(d, (626, 708), "Total", "#111111", F["b"])
    text(d, (936, 708), "8.246,72", "#111111", F["b"], anchor="ra")
    note = "Notes tecniques: amidaments calculats segons dades facilitades. La fabricacio queda subjecta a revisio de plannols i confirmacio final del client."
    for i, line in enumerate(wrap(d, note, 840, F["s"])):
        text(d, (66, 940 + i * 20), line, "#5d6873", F["s"])
    return img


def style_c():
    img = Image.new("RGB", (W, H), "#fffdf8")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 230, H], fill="#173d3a")
    text(d, (24, 42), "MNL", "#ffffff", F["xl"])
    label(d, (24, 122), "Proposta C", "#ffe37a", "#173d3a")
    info = [("Pressupost", "SO-TEST-001"), ("Data", "08/07/2026"), ("Validesa", "30 dies"), ("Total", "8.246,72 EUR")]
    y = 210
    for k, v in info:
        text(d, (24, y), k.upper(), "#b9d3cf", F["xs"])
        text(d, (24, y + 22), v, "#ffffff", F["mb"])
        y += 86
    text(d, (274, 58), "Proposta comercial", "#173d3a", F["xl"])
    d.line([274, 158, W - 44, 158], fill="#ded5c6")
    d.line([274, 292, W - 44, 292], fill="#ded5c6")
    text(d, (274, 182), "Preparat per", "#776f63", F["s"])
    text(d, (274, 210), "Client Industrial Demo", "#26231f", F["b"])
    text(d, (274, 244), "Carrer Exemple, 12\n08000 Barcelona", "#26231f", F["s"])
    text(d, (586, 182), "Projecte", "#776f63", F["s"])
    text(d, (586, 210), "Coberta i remateria", "#26231f", F["b"])
    text(d, (586, 244), "Solucio amb panell sandwich,\nperfileria i transport.", "#26231f", F["s"])
    d.line([274, 360, W - 44, 360], fill="#173d3a", width=2)
    headers = ["Concepte", "Quantitat", "Preu", "Import"]
    xs = [274, 672, 800, 936]
    for h, x in zip(headers, xs):
        text(d, (x, 334), h, "#173d3a", F["s"], anchor="ra" if h != "Concepte" else None)
    items = [
        ("Panell HI-CT 60 PIR", "22 panells x 6,00 x 1,15 = 151,80 m2", "151,80 m2", "24,35", "3.696,33"),
        ("Remat lateral lacat", "Acabat lacat, color segons carta", "48 ml", "18,40", "883,20"),
        ("Transport i manipulacio", "Entrega en obra", "1", "365,00", "365,00"),
    ]
    y = 386
    for name, desc, qty, price, total in items:
        text(d, (274, y), name, "#26231f", F["mb"])
        text(d, (274, y + 24), desc, "#776f63", F["s"])
        text(d, (672, y + 8), qty, "#26231f", F["s"], anchor="ra")
        text(d, (800, y + 8), price, "#26231f", F["s"], anchor="ra")
        text(d, (936, y + 8), total, "#26231f", F["s"], anchor="ra")
        d.line([274, y + 66, W - 44, y + 66], fill="#e4dac8")
        y += 84
    d.rectangle([626, 710, 936, 850], fill="#f5efe2")
    text(d, (646, 734), "Base", "#26231f", F["m"])
    text(d, (916, 734), "6.815,47", "#26231f", F["mb"], anchor="ra")
    text(d, (646, 764), "IVA", "#26231f", F["m"])
    text(d, (916, 764), "1.431,25", "#26231f", F["mb"], anchor="ra")
    d.line([646, 810, 916, 810], fill="#26231f", width=2)
    text(d, (646, 824), "Total", "#26231f", F["b"])
    text(d, (916, 824), "8.246,72", "#26231f", F["b"], anchor="ra")
    d.rectangle([274, 920, 936, 1038], outline="#ded5c6")
    text(d, (296, 944), "Per que aquesta proposta?", "#26231f", F["mb"])
    text(d, (296, 972), "Format mes comercial i llegible per client final. Redueix soroll tecnic,\ndestaca el valor global i deixa els amidaments com a suport.", "#776f63", F["s"])
    return img


def style_d():
    img = Image.new("RGB", (W, H), "#ffffff")
    d = ImageDraw.Draw(img)
    d.rectangle([752, 0, 786, 1080], fill="#d9eef3")
    d.rectangle([50, 72, 140, 142], outline="#111111", width=8)
    text(d, (95, 112), "MNL", "#111111", font(28, True), anchor="mm")
    text(d, (50, 186), "MNL TECHNICAL CONSULTANT SL", "#111111", F["s"])
    d.line([50, 204, 236, 204], fill="#111111")
    text(d, (50, 228), "C/ Exemple Industrial, 211\n08470 - Sant Celoni (Barcelona)\nN.I.F.: B-00000000", "#333333", F["s"])
    text(d, (340, 70), "Distribuidor Oficial", "#164d91", F["s"], anchor="mm")
    text(d, (340, 116), "HUURRE", "#164d91", F["h"], anchor="mm")
    text(d, (572, 116), "Induspanel", "#666666", F["h"], anchor="mm")
    text(d, (572, 152), "www.induspanel.example", "#0000cc", F["m"], anchor="mm")
    d.rectangle([752, 45, 960, 160], fill="#e7f5f8")
    text(d, (855, 58), "P R E S U P U E S T O", "#111111", F["b"], anchor="ma")
    d.line([760, 88, 952, 88], fill="#111111", width=3)
    text(d, (790, 106), "REFERENCIA:", "#333333", F["xs"])
    text(d, (870, 106), "CUBIERTA", "#333333", F["xs"])
    text(d, (790, 130), "N. DOCUMENTO:", "#333333", F["xs"])
    text(d, (890, 130), "SO-TEST-001", "#333333", F["xs"])
    text(d, (790, 154), "FECHA:", "#333333", F["xs"])
    text(d, (870, 154), "08/07/2026", "#333333", F["xs"])
    d.rectangle([296, 174, 960, 294], outline="#111111", width=2)
    d.line([628, 174, 628, 294], fill="#111111", width=2)
    d.line([296, 200, 960, 200], fill="#111111", width=2)
    text(d, (462, 180), "E N V I O", "#111111", F["b"], anchor="ma")
    text(d, (794, 180), "C L I E N T E", "#111111", F["b"], anchor="ma")
    text(d, (340, 215), "CLIENTE DEMO, S.L.\nC/ Industria, 44\n08000 - Barcelona", "#111111", F["s"])
    text(d, (660, 215), "CLIENTE DEMO, S.L.\nC/ Industria, 44\nNIF: B 00000000\nTlf: 600 000 000", "#111111", F["s"])
    d.rectangle([48, 316, 960, 325], fill="#d7e8ec")
    d.line([48, 325, 960, 325], fill="#111111", width=2)
    headers = ["ARTICULO", "UDS", "LONG.", "ANCHO", "CANTIDAD", "TOTAL", "", "PRECIO EUR", "IMPORTE EUR"]
    xs = [174, 390, 492, 575, 660, 742, 772, 854, 952]
    for h, x in zip(headers, xs):
        text(d, (x, 344), h, "#111111", F["s"], anchor="mm" if h == "ARTICULO" else "ra")
    d.line([48, 370, 960, 370], fill="#111111", width=2)
    items = [
        ("1.01.-Perfil grecado TZ-40/0,5 Prelacado\nColor Blanco Pirineo 1006", "1", "", "1,000", "700,00", "700,00", "M2", "8,76", "6.132,00"),
        ("1.02.-Omega galvanizada de 40 / 0,8 mm de altura", "1", "", "", "1.400,00", "1.400,00", "ML", "3,51", "4.914,00"),
        ("1.03.-Aislamiento termico de lana de vidrio\nIBR 80 mm desnudo.", "1", "", "", "700,00", "700,00", "M2", "4,14", "2.898,00"),
        ("PORTES:", "", "", "", "Transporte combinado", "", "PU", "330,00", "330,00"),
    ]
    y = 382
    for item in items:
        main = item[0].split("\n")
        text(d, (50, y), main[0], "#111111", F["s"])
        if len(main) > 1:
            text(d, (50, y + 28), main[1], "#111111", F["s"])
        for val, x in zip(item[1:], xs[1:]):
            if val:
                if x == 772:
                    d.rectangle([752, y - 4, 786, y + 58], fill="#d9eef3")
                    text(d, (769, y + 18), val, "#111111", F["mb"], anchor="mm")
                elif val == "Transporte combinado":
                    text(d, (520, y), val, "#111111", F["mb"], anchor="ma")
                else:
                    text(d, (x, y), val, "#111111", F["s"], anchor="ra")
        y += 84
    d.line([48, 760, 786, 760], fill="#111111", width=4)
    d.line([48, 766, 786, 766], fill="#111111", width=2)
    d.line([786, 792, 960, 792], fill="#111111", width=4)
    text(d, (50, 814), "FORMA DE PAGO:", "#111111", F["mb"])
    text(d, (190, 814), "Transferencia bancaria a la confirmacion del pedido", "#111111", F["mb"])
    text(d, (50, 844), "CAIXA BANK: ES00 0000 0000 0000 0000 0000", "#111111", F["mb"])
    text(d, (632, 786), "RESUMEN", "#111111", F["b"])
    summary = [("Base Imponible", "14.274,00 EUR"), ("21% IVA", "2.997,54 EUR"), ("TOTAL", "17.271,54 EUR")]
    y = 830
    for k, v in summary:
        d.rectangle([836, y - 4, 960, y + 22], fill="#ffffff")
        text(d, (632, y), k, "#111111", F["m"])
        d.line([736, y + 18, 830, y + 18], fill="#111111", width=1)
        text(d, (952, y), v, "#111111", F["mb"], anchor="ra")
        y += 30
    d.line([840, 914, 960, 914], fill="#111111", width=4)
    text(d, (692, 932), "Esta oferta tiene una validez de 10 dias", "#111111", font(15, True, True))
    text(d, (300, 1228), "MNL TECHNICAL CONSULTANT, S.L. C/ Exemple Industrial, 211. Sant Celoni (BCN).", "#111111", F["s"])
    d.rectangle([850, 1208, 960, 1236], fill="#d9d9d9")
    text(d, (905, 1222), "Pag.1", "#111111", F["s"], anchor="mm")
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    previews = [
        ("proposta-a-industrial-premium.png", style_a()),
        ("proposta-b-tecnica-grid.png", style_b()),
        ("proposta-c-comercial-editorial.png", style_c()),
        ("proposta-d-classica-pdf.png", style_d()),
    ]
    for name, img in previews:
        img.save(OUT / name)
        print(OUT / name)


if __name__ == "__main__":
    main()
