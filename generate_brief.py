#!/usr/bin/env python3
"""Generate EAT THIS Product Strategy Brief PDF."""

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
import os

# Colors
BG = HexColor('#0A0A0A')
WHITE = HexColor('#FFFFFF')
RED = HexColor('#FF2D2D')
GRAY = HexColor('#888888')
CARD1 = HexColor('#141414')
CARD2 = HexColor('#1A1A1A')
CARD_BORDER = HexColor('#2A2A2A')
DARK_RED = HexColor('#CC0000')

# Page dimensions (A4 landscape)
PAGE_W, PAGE_H = landscape(A4)  # ~841.9 x 595.3 pt
MARGIN = 36

OUTPUT_PATH = '/Users/ersane/Downloads/Projekte/Eat This/EatThis-ProductBrief.pdf'


def hex_color(h):
    return HexColor(h)


class EatThisPDF:
    def __init__(self):
        self.c = canvas.Canvas(OUTPUT_PATH, pagesize=landscape(A4))
        self.c.setTitle("EAT THIS — Product Strategy Brief")
        self.c.setAuthor("EAT THIS")
        self.page_num = 0
        self.total_pages = 9

    def save(self):
        self.c.save()
        print(f"PDF saved to {OUTPUT_PATH}")

    def new_page(self):
        if self.page_num > 0:
            self.c.showPage()
        self.page_num += 1
        # Background
        self.c.setFillColor(BG)
        self.c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    def draw_page_chrome(self, show_branding=True):
        """Draw EAT THIS branding and page number."""
        if show_branding:
            # Top-left brand mark
            self.c.setFillColor(RED)
            self.c.setFont("Helvetica-Bold", 9)
            self.c.drawString(MARGIN, PAGE_H - MARGIN + 6, "EAT THIS")

            # Top line accent
            self.c.setStrokeColor(RED)
            self.c.setLineWidth(1.5)
            self.c.line(MARGIN, PAGE_H - MARGIN - 2, PAGE_W - MARGIN, PAGE_H - MARGIN - 2)

            # Page number bottom right
            self.c.setFillColor(GRAY)
            self.c.setFont("Helvetica", 8)
            pg_text = f"{self.page_num} / {self.total_pages}"
            self.c.drawRightString(PAGE_W - MARGIN, MARGIN - 14, pg_text)

    def draw_rect(self, x, y, w, h, fill_color=CARD1, stroke_color=CARD_BORDER, radius=6):
        self.c.setFillColor(fill_color)
        self.c.setStrokeColor(stroke_color)
        self.c.setLineWidth(0.5)
        self.c.roundRect(x, y, w, h, radius, fill=1, stroke=1)

    def text(self, x, y, txt, font="Helvetica", size=12, color=WHITE, align="left"):
        self.c.setFillColor(color)
        self.c.setFont(font, size)
        if align == "center":
            self.c.drawCentredString(x, y, txt)
        elif align == "right":
            self.c.drawRightString(x, y, txt)
        else:
            self.c.drawString(x, y, txt)

    def multiline_text(self, x, y, txt, font="Helvetica", size=11, color=WHITE,
                        max_width=300, line_height=16):
        """Draw wrapped text, returns final y position."""
        self.c.setFillColor(color)
        self.c.setFont(font, size)
        words = txt.split(' ')
        lines = []
        current = []
        for word in words:
            test = ' '.join(current + [word])
            if self.c.stringWidth(test, font, size) <= max_width:
                current.append(word)
            else:
                if current:
                    lines.append(' '.join(current))
                current = [word]
        if current:
            lines.append(' '.join(current))
        cy = y
        for line in lines:
            self.c.drawString(x, cy, line)
            cy -= line_height
        return cy

    def red_label(self, x, y, txt, size=8):
        """Draw a red pill/label."""
        w = self.c.stringWidth(txt, "Helvetica-Bold", size) + 12
        self.c.setFillColor(RED)
        self.c.roundRect(x, y - 3, w, size + 6, 3, fill=1, stroke=0)
        self.c.setFillColor(WHITE)
        self.c.setFont("Helvetica-Bold", size)
        self.c.drawString(x + 6, y + 1, txt)
        return w

    # ─── PAGE 1: COVER ───────────────────────────────────────────────────────

    def page_cover(self):
        self.new_page()

        # Red accent block - left stripe
        self.c.setFillColor(RED)
        self.c.rect(0, 0, 8, PAGE_H, fill=1, stroke=0)

        # Large background text (decorative)
        self.c.setFillColor(HexColor('#111111'))
        self.c.setFont("Helvetica-Bold", 180)
        self.c.drawString(20, PAGE_H * 0.05, "EAT")

        # Main title
        self.c.setFillColor(WHITE)
        self.c.setFont("Helvetica-Bold", 96)
        self.c.drawString(MARGIN + 20, PAGE_H * 0.54, "EAT THIS")

        # Red underline
        title_w = self.c.stringWidth("EAT THIS", "Helvetica-Bold", 96)
        self.c.setStrokeColor(RED)
        self.c.setLineWidth(4)
        self.c.line(MARGIN + 20, PAGE_H * 0.54 - 8, MARGIN + 20 + title_w, PAGE_H * 0.54 - 8)

        # Subtitle
        self.c.setFillColor(GRAY)
        self.c.setFont("Helvetica", 18)
        self.c.drawString(MARGIN + 20, PAGE_H * 0.42, "Product Strategy Brief")

        # Tagline
        self.c.setFillColor(RED)
        self.c.setFont("Helvetica-Bold", 22)
        self.c.drawString(MARGIN + 20, PAGE_H * 0.32, '"We tell you what to eat."')

        # Date
        self.c.setFillColor(GRAY)
        self.c.setFont("Helvetica", 12)
        self.c.drawString(MARGIN + 20, MARGIN + 10, "April 2026")

        # Right side decoration - dots
        for i in range(5):
            for j in range(8):
                alpha = 0.15 + (i * j) * 0.01
                col = HexColor('#%02x%02x%02x' % (int(255 * min(alpha, 0.4)),
                                                    int(0),
                                                    int(0)))
                self.c.setFillColor(col)
                self.c.circle(PAGE_W - MARGIN - 40 - i * 40,
                               MARGIN + 40 + j * 40, 4, fill=1, stroke=0)

        # Confidential stamp area
        self.c.setFillColor(CARD2)
        self.c.roundRect(PAGE_W - MARGIN - 160, MARGIN, 160, 28, 4, fill=1, stroke=0)
        self.c.setFillColor(GRAY)
        self.c.setFont("Helvetica", 9)
        self.c.drawCentredString(PAGE_W - MARGIN - 80, MARGIN + 9, "CONFIDENTIAL · INTERNAL USE ONLY")

    # ─── PAGE 2: VISION & PROBLEM ────────────────────────────────────────────

    def page_vision(self):
        self.new_page()
        self.draw_page_chrome()

        content_top = PAGE_H - MARGIN - 28

        # Section title
        self.text(MARGIN, content_top, "PRODUCT VISION", "Helvetica-Bold", 11, GRAY)
        self.text(MARGIN, content_top - 22, "& PROBLEM SPACE", "Helvetica-Bold", 28, WHITE)
        self.c.setFillColor(RED)
        self.c.rect(MARGIN, content_top - 26, 48, 3, fill=1, stroke=0)

        # Vision box
        vision_y = content_top - 60
        self.draw_rect(MARGIN, vision_y - 72, PAGE_W - 2 * MARGIN, 80, CARD2)

        self.c.setFillColor(RED)
        self.c.setFont("Helvetica-Bold", 8)
        self.c.drawString(MARGIN + 14, vision_y - 16, "VISION")

        vision_text = (
            "EAT THIS ist der opinionierte Berlin Food Guide — aufgebaut als Collectible Card Game. "
            "Jede Karte ist eine echte Must-Eat Empfehlung: ein Gericht, ein Restaurant, eine klare Meinung. "
            "Kein Sponsored Content. Selbst gegessen. Teilbar mit Freunden."
        )
        self.multiline_text(MARGIN + 14, vision_y - 34, vision_text,
                             "Helvetica", 11, WHITE,
                             max_width=PAGE_W - 2 * MARGIN - 28, line_height=17)

        # Three problem cards
        prob_top = vision_y - 100
        card_w = (PAGE_W - 2 * MARGIN - 24) / 3
        card_h = 148

        problems = [
            {
                "num": "01",
                "title": "INFORMATION OVERLOAD",
                "body": (
                    "Mit Vergnügen, TripAdvisor, Berlin Foodstories "
                    "zeigen Top-10-Listen ohne klare Empfehlung. "
                    "User kämpft sich durch YouTube, Blogs, Google Maps."
                ),
            },
            {
                "num": "02",
                "title": 'KEIN "WAS SOLL ICH\nBESTELLEN?"',
                "body": (
                    "Kein Guide sagt dir präzise: dieses Gericht, "
                    "in diesem Restaurant."
                ),
            },
            {
                "num": "03",
                "title": "DIE FREMDE STADT",
                "body": (
                    "Du kommst aus dem Hotel in Istanbul. "
                    "30 Minuten Recherche. Frustriert. "
                    "Gehst irgendwo rein."
                ),
            },
        ]

        for i, prob in enumerate(problems):
            cx = MARGIN + i * (card_w + 12)
            cy = prob_top - card_h
            self.draw_rect(cx, cy, card_w, card_h, CARD1)

            # Big number
            self.c.setFillColor(RED)
            self.c.setFont("Helvetica-Bold", 36)
            self.c.drawString(cx + 14, cy + card_h - 44, prob["num"])

            # Title
            title_lines = prob["title"].split('\n')
            ty = cy + card_h - 72
            for line in title_lines:
                self.c.setFillColor(WHITE)
                self.c.setFont("Helvetica-Bold", 10)
                self.c.drawString(cx + 14, ty, line)
                ty -= 14

            # Body
            self.multiline_text(cx + 14, ty - 4, prob["body"],
                                 "Helvetica", 9.5, GRAY,
                                 max_width=card_w - 28, line_height=14)

    # ─── PAGE 3: TARGET USER ──────────────────────────────────────────────────

    def page_target(self):
        self.new_page()
        self.draw_page_chrome()

        content_top = PAGE_H - MARGIN - 28

        self.text(MARGIN, content_top, "AUDIENCE", "Helvetica-Bold", 11, GRAY)
        self.text(MARGIN, content_top - 22, "TARGET USER", "Helvetica-Bold", 28, WHITE)
        self.c.setFillColor(RED)
        self.c.rect(MARGIN, content_top - 26, 40, 3, fill=1, stroke=0)

        # Primary user card - large
        primary_y = content_top - 65
        primary_h = 200
        half_w = (PAGE_W - 2 * MARGIN - 20) / 2

        self.draw_rect(MARGIN, primary_y - primary_h, half_w, primary_h, CARD1)

        # Primary badge
        self.c.setFillColor(RED)
        self.c.roundRect(MARGIN + 14, primary_y - 22, 68, 16, 3, fill=1, stroke=0)
        self.c.setFillColor(WHITE)
        self.c.setFont("Helvetica-Bold", 8)
        self.c.drawString(MARGIN + 20, primary_y - 16, "PRIMARY USER")

        self.c.setFillColor(WHITE)
        self.c.setFont("Helvetica-Bold", 18)
        self.c.drawString(MARGIN + 14, primary_y - 48, "Der opinionierte")
        self.c.drawString(MARGIN + 14, primary_y - 68, "Foodie")

        traits_primary = [
            "Liebt gutes Essen, achtet auf Qualität und Handwerk",
            "Hasst Touristenfallen und generische Empfehlungen",
            "Teilt gerne Entdeckungen mit Freunden",
            "Ästhetik und Humor sind ihm wichtig",
        ]
        ty = primary_y - 96
        for trait in traits_primary:
            # Bullet
            self.c.setFillColor(RED)
            self.c.circle(MARGIN + 20, ty + 4, 3, fill=1, stroke=0)
            self.c.setFillColor(WHITE)
            self.c.setFont("Helvetica", 10)
            self.c.drawString(MARGIN + 30, ty, trait)
            ty -= 18

        # Secondary user card
        sec_x = MARGIN + half_w + 20
        sec_h = 160
        sec_y = primary_y

        self.draw_rect(sec_x, sec_y - sec_h, half_w, sec_h, CARD2)

        self.c.setFillColor(GRAY)
        self.c.roundRect(sec_x + 14, sec_y - 22, 74, 16, 3, fill=1, stroke=0)
        self.c.setFillColor(WHITE)
        self.c.setFont("Helvetica-Bold", 8)
        self.c.drawString(sec_x + 20, sec_y - 16, "SECONDARY USER")

        self.c.setFillColor(WHITE)
        self.c.setFont("Helvetica-Bold", 18)
        self.c.drawString(sec_x + 14, sec_y - 48, "Der Reisende")
        self.c.drawString(sec_x + 14, sec_y - 68, "Entdecker")

        traits_sec = [
            "In einer fremden Stadt, braucht schnelle zuverlässige Antwort",
            "Will direkt navigieren können",
        ]
        ty = sec_y - 96
        for trait in traits_sec:
            self.c.setFillColor(GRAY)
            self.c.circle(sec_x + 20, ty + 4, 3, fill=1, stroke=0)
            self.c.setFillColor(GRAY)
            self.c.setFont("Helvetica", 10)
            self.c.drawString(sec_x + 30, ty, trait)
            ty -= 18

        # Key insight box
        insight_y = primary_y - primary_h - 20
        insight_h = 56
        self.draw_rect(MARGIN, insight_y - insight_h, PAGE_W - 2 * MARGIN, insight_h, CARD2)
        self.c.setFillColor(RED)
        self.c.setFont("Helvetica-Bold", 9)
        self.c.drawString(MARGIN + 14, insight_y - 18, "KEY INSIGHT")
        self.c.setFillColor(WHITE)
        self.c.setFont("Helvetica-Bold", 13)
        self.c.drawString(MARGIN + 14, insight_y - 36,
                           "User wollen keine Optionen — sie wollen eine Antwort.")

    # ─── PAGE 4: COMPETITIVE LANDSCAPE ───────────────────────────────────────

    def page_competitive(self):
        self.new_page()
        self.draw_page_chrome()

        content_top = PAGE_H - MARGIN - 28

        self.text(MARGIN, content_top, "MARKET ANALYSIS", "Helvetica-Bold", 11, GRAY)
        self.text(MARGIN, content_top - 22, "COMPETITIVE LANDSCAPE", "Helvetica-Bold", 28, WHITE)
        self.c.setFillColor(RED)
        self.c.rect(MARGIN, content_top - 26, 60, 3, fill=1, stroke=0)

        # Table
        table_top = content_top - 58
        cols = ["PRODUCT", "CURATION", "OPINION", "BEAUTIFUL UI", "GAME", "NO ADS"]
        col_widths = [160, 88, 88, 106, 88, 88]
        row_h = 42

        competitors = [
            ("MIT VERGNÜGEN",     "✗", "✗", "~", "✗", "~"),
            ("BERLIN FOODSTORIES","~", "~", "✗", "✗", "~"),
            ("TRIPADVISOR",       "✗", "✗", "✗", "✗", "✗"),
            ("INFATUATION",       "✓", "✓", "✓", "✗", "~"),
            ("EAT THIS",          "✓", "✓", "✓", "✓", "✓"),
        ]

        # Draw header
        hx = MARGIN
        self.c.setFillColor(HexColor('#111111'))
        self.c.rect(MARGIN, table_top - 24, PAGE_W - 2 * MARGIN, 24, fill=1, stroke=0)

        for i, (col, cw) in enumerate(zip(cols, col_widths)):
            align = "left" if i == 0 else "center"
            x = hx + (cw / 2 if align == "center" else 14)
            self.c.setFillColor(GRAY)
            self.c.setFont("Helvetica-Bold", 8)
            if align == "center":
                self.c.drawCentredString(x, table_top - 15, col)
            else:
                self.c.drawString(x, table_top - 15, col)
            hx += cw

        # Draw rows
        for ri, (name, *scores) in enumerate(competitors):
            is_eat_this = name == "EAT THIS"
            row_y = table_top - 24 - (ri + 1) * row_h
            bg = HexColor('#1E0A0A') if is_eat_this else (CARD1 if ri % 2 == 0 else CARD2)

            self.c.setFillColor(bg)
            self.c.rect(MARGIN, row_y, PAGE_W - 2 * MARGIN, row_h, fill=1, stroke=0)

            if is_eat_this:
                self.c.setStrokeColor(RED)
                self.c.setLineWidth(1.5)
                self.c.rect(MARGIN, row_y, PAGE_W - 2 * MARGIN, row_h, fill=0, stroke=1)

            # Name column
            if is_eat_this:
                self.c.setFillColor(RED)
            else:
                self.c.setFillColor(WHITE)
            self.c.setFont("Helvetica-Bold" if is_eat_this else "Helvetica", 11)
            self.c.drawString(MARGIN + 14, row_y + row_h / 2 - 5, name)

            # Score columns
            cx = MARGIN + col_widths[0]
            for score, cw in zip(scores, col_widths[1:]):
                if score == "✓":
                    color = HexColor('#22C55E')  # green
                elif score == "✗":
                    color = HexColor('#EF4444')  # red
                else:
                    color = GRAY

                self.c.setFillColor(color)
                self.c.setFont("Helvetica-Bold", 16)
                self.c.drawCentredString(cx + cw / 2, row_y + row_h / 2 - 7, score)
                cx += cw

            # Divider
            self.c.setStrokeColor(HexColor('#222222'))
            self.c.setLineWidth(0.5)
            self.c.line(MARGIN, row_y, MARGIN + PAGE_W - 2 * MARGIN, row_y)

        # Whitespace label
        ws_y = table_top - 24 - len(competitors) * row_h - 20
        ws_h = 40
        self.draw_rect(MARGIN, ws_y - ws_h, PAGE_W - 2 * MARGIN, ws_h, HexColor('#1A0505'))
        self.c.setFillColor(RED)
        self.c.setFont("Helvetica-Bold", 9)
        self.c.drawString(MARGIN + 14, ws_y - 14, "WHITESPACE")
        self.c.setFillColor(WHITE)
        self.c.setFont("Helvetica-Bold", 13)
        self.c.drawString(MARGIN + 90, ws_y - 14,
                           "Opinioniert + Kuratiert + Kollektierbar + Sozial")
        self.c.setFillColor(GRAY)
        self.c.setFont("Helvetica", 9)
        self.c.drawString(MARGIN + 90, ws_y - 30, "Kein einziger Konkurrent deckt diese Kombination ab.")

    # ─── PAGE 5: PRODUCT CONCEPT ──────────────────────────────────────────────

    def page_concept(self):
        self.new_page()
        self.draw_page_chrome()

        content_top = PAGE_H - MARGIN - 28

        self.text(MARGIN, content_top, "PRODUCT CONCEPT", "Helvetica-Bold", 11, GRAY)
        self.text(MARGIN, content_top - 22, "THE CARD & VIRAL LOOP", "Helvetica-Bold", 28, WHITE)
        self.c.setFillColor(RED)
        self.c.rect(MARGIN, content_top - 26, 52, 3, fill=1, stroke=0)

        # Left: The Card
        left_w = (PAGE_W - 2 * MARGIN - 20) * 0.35
        card_y = content_top - 58
        card_h = 196

        self.draw_rect(MARGIN, card_y - card_h, left_w, card_h, CARD1)

        self.c.setFillColor(RED)
        self.c.setFont("Helvetica-Bold", 10)
        self.c.drawString(MARGIN + 14, card_y - 22, "THE CARD")

        card_items = [
            "Name des Gerichts",
            "Restaurant Name",
            "Kurze appetitmachende Beschreibung",
            "(mit Humor & Stimme)",
            "Map Button → direkt zu Google Maps",
            "Sammelbar & Shareable",
        ]
        ty = card_y - 46
        for item in card_items:
            is_meta = item.startswith("(")
            if not is_meta:
                self.c.setFillColor(RED)
                self.c.setFont("Helvetica", 9)
                self.c.drawString(MARGIN + 16, ty, "•")
                self.c.setFillColor(WHITE)
                self.c.setFont("Helvetica", 10)
                self.c.drawString(MARGIN + 26, ty, item)
            else:
                self.c.setFillColor(GRAY)
                self.c.setFont("Helvetica", 9)
                self.c.drawString(MARGIN + 26, ty, item)
            ty -= 17

        # Middle: Collection mechanic
        mid_x = MARGIN + left_w + 12
        mid_w = (PAGE_W - 2 * MARGIN - 20) * 0.32

        self.draw_rect(mid_x, card_y - card_h, mid_w, card_h, CARD2)

        self.c.setFillColor(RED)
        self.c.setFont("Helvetica-Bold", 10)
        self.c.drawString(mid_x + 14, card_y - 22, "COLLECTION MECHANIC")

        mechanic_items = [
            ("3 Karten gratis", "(kein Login)"),
            ("Registrierung →", "1 Gratis Pack"),
            ("Weitere Karten", "nur durch Packs"),
            ("Ziel:", "100+ Karten"),
        ]
        ty = card_y - 46
        for main, sub in mechanic_items:
            self.c.setFillColor(WHITE)
            self.c.setFont("Helvetica-Bold", 11)
            self.c.drawString(mid_x + 14, ty, main)
            self.c.setFillColor(GRAY)
            self.c.setFont("Helvetica", 10)
            self.c.drawString(mid_x + 14, ty - 14, sub)
            ty -= 38

        # Right: Stats/numbers
        right_x = mid_x + mid_w + 12
        right_w = PAGE_W - MARGIN - right_x
        self.draw_rect(right_x, card_y - card_h, right_w, card_h, HexColor('#100505'))

        self.c.setFillColor(RED)
        self.c.setFont("Helvetica-Bold", 10)
        self.c.drawString(right_x + 14, card_y - 22, "THE NUMBERS")

        numbers = [("3", "Gratis-Karten"), ("1", "Gratis Pack"), ("100+", "Karten Ziel")]
        ny = card_y - 54
        for num, label in numbers:
            self.c.setFillColor(RED)
            self.c.setFont("Helvetica-Bold", 34)
            self.c.drawString(right_x + 14, ny, num)
            self.c.setFillColor(GRAY)
            self.c.setFont("Helvetica", 10)
            self.c.drawString(right_x + 14, ny - 16, label)
            ny -= 58

        # Viral Loop - bottom section
        loop_y = card_y - card_h - 20
        loop_h = 88
        self.draw_rect(MARGIN, loop_y - loop_h, PAGE_W - 2 * MARGIN, loop_h, CARD2)

        self.c.setFillColor(RED)
        self.c.setFont("Helvetica-Bold", 9)
        self.c.drawString(MARGIN + 14, loop_y - 16, "VIRAL LOOP")

        steps = [
            "Neuer User",
            "3 Gratis-Karten",
            "Registrierung",
            "Pack öffnen",
            "Gericht entdecken",
            "Karte teilen",
            "Freund sieht Karte",
            "Freund registriert",
            "Loop",
        ]

        step_count = len(steps)
        available_w = PAGE_W - 2 * MARGIN - 28
        step_w = available_w / step_count
        base_y = loop_y - loop_h + 14

        for i, step in enumerate(steps):
            sx = MARGIN + 14 + i * step_w
            cx = sx + step_w / 2

            # Box
            box_color = RED if step == "Loop" else CARD1
            self.c.setFillColor(box_color)
            self.c.roundRect(sx + 2, base_y, step_w - 6, 36, 4, fill=1, stroke=0)

            # Text
            is_loop = step == "Loop"
            self.c.setFillColor(WHITE)
            self.c.setFont("Helvetica-Bold" if is_loop else "Helvetica", 8)
            self.c.drawCentredString(cx, base_y + 14, step)

            # Arrow
            if i < step_count - 1:
                ax = sx + step_w - 4
                ay = base_y + 18
                self.c.setFillColor(RED)
                self.c.setStrokeColor(RED)
                self.c.setLineWidth(1)
                self.c.line(ax, ay, ax + 4, ay)
                # Arrowhead
                self.c.setFillColor(RED)
                p = self.c.beginPath()
                p.moveTo(ax + 7, ay)
                p.lineTo(ax + 3, ay + 4)
                p.lineTo(ax + 3, ay - 4)
                p.close()
                self.c.drawPath(p, fill=1, stroke=0)

    # ─── PAGE 6: MVP ROADMAP ──────────────────────────────────────────────────

    def page_roadmap(self):
        self.new_page()
        self.draw_page_chrome()

        content_top = PAGE_H - MARGIN - 28

        self.text(MARGIN, content_top, "EXECUTION", "Helvetica-Bold", 11, GRAY)
        self.text(MARGIN, content_top - 22, "MVP ROADMAP", "Helvetica-Bold", 28, WHITE)
        self.c.setFillColor(RED)
        self.c.rect(MARGIN, content_top - 26, 40, 3, fill=1, stroke=0)

        # Timeline bar
        tl_y = content_top - 52
        tl_h = 8
        tl_w = PAGE_W - 2 * MARGIN

        phases = [
            {"label": "PHASE 1", "color": RED, "frac": 0.33},
            {"label": "PHASE 2", "color": HexColor('#FF6B2D'), "frac": 0.33},
            {"label": "PHASE 3", "color": HexColor('#FF9B2D'), "frac": 0.34},
        ]

        px = MARGIN
        for ph in phases:
            pw = tl_w * ph["frac"]
            self.c.setFillColor(ph["color"])
            self.c.rect(px, tl_y, pw - 2, tl_h, fill=1, stroke=0)
            px += pw

        # Phase cards
        card_top = tl_y - 16
        card_h = 210
        col_w = (PAGE_W - 2 * MARGIN - 24) / 3

        phase_data = [
            {
                "phase": "PHASE 1",
                "title": "LAUNCH MVP",
                "color": RED,
                "status": "active",
                "items": [
                    ("✓", "30 Must-Eat Cards"),
                    ("✓", "Restaurant Map Berlin"),
                    ("✓", "3 Gratis-Karten (kein Login)"),
                    ("✓", "Registration → Gratis Pack"),
                    ("✓", "Shareable Card Pages"),
                    ("✓", "Basic Collection"),
                ],
            },
            {
                "phase": "PHASE 2",
                "title": "GAME MECHANIC",
                "color": HexColor('#FF6B2D'),
                "status": "planned",
                "items": [
                    ("○", "Daily/Weekly Mini-Game"),
                    ("○", "Coin Economy"),
                    ("○", "Pack Purchase Flow"),
                    ("○", "Collection Overview"),
                ],
            },
            {
                "phase": "PHASE 3",
                "title": "EXPANSION",
                "color": HexColor('#FF9B2D'),
                "status": "future",
                "items": [
                    ("○", "Trusted Foodie Features"),
                    ("○", "Weitere Städte"),
                    ("○", "Community Features"),
                ],
            },
        ]

        for i, ph in enumerate(phase_data):
            cx = MARGIN + i * (col_w + 12)
            cy = card_top - card_h

            # Card
            self.draw_rect(cx, cy, col_w, card_h, CARD1)

            # Top color bar
            self.c.setFillColor(ph["color"])
            self.c.roundRect(cx, cy + card_h - 6, col_w, 6, 3, fill=1, stroke=0)

            # Phase label
            self.c.setFillColor(ph["color"])
            self.c.setFont("Helvetica-Bold", 8)
            self.c.drawString(cx + 14, cy + card_h - 24, ph["phase"])

            # Title
            self.c.setFillColor(WHITE)
            self.c.setFont("Helvetica-Bold", 16)
            self.c.drawString(cx + 14, cy + card_h - 46, ph["title"])

            # Divider
            self.c.setStrokeColor(HexColor('#2A2A2A'))
            self.c.setLineWidth(0.5)
            self.c.line(cx + 14, cy + card_h - 56, cx + col_w - 14, cy + card_h - 56)

            # Items
            iy = cy + card_h - 74
            for check, label in ph["items"]:
                is_done = check == "✓"
                self.c.setFillColor(ph["color"] if is_done else GRAY)
                self.c.setFont("Helvetica-Bold", 11)
                self.c.drawString(cx + 14, iy, check)
                self.c.setFillColor(WHITE if is_done else GRAY)
                self.c.setFont("Helvetica", 10)
                # Wrap long labels
                label_w = self.c.stringWidth(label, "Helvetica", 10)
                if label_w > col_w - 42:
                    words = label.split(' ')
                    line1 = ' '.join(words[:3])
                    line2 = ' '.join(words[3:])
                    self.c.drawString(cx + 30, iy, line1)
                    if line2:
                        self.c.setFillColor(GRAY)
                        self.c.drawString(cx + 30, iy - 12, line2)
                        iy -= 12
                else:
                    self.c.drawString(cx + 30, iy, label)
                iy -= 22

    # ─── PAGE 7: GROWTH & MONETIZATION ───────────────────────────────────────

    def page_growth(self):
        self.new_page()
        self.draw_page_chrome()

        content_top = PAGE_H - MARGIN - 28

        self.text(MARGIN, content_top, "BUSINESS MODEL", "Helvetica-Bold", 11, GRAY)
        self.text(MARGIN, content_top - 22, "GROWTH & MONETIZATION", "Helvetica-Bold", 28, WHITE)
        self.c.setFillColor(RED)
        self.c.rect(MARGIN, content_top - 26, 56, 3, fill=1, stroke=0)

        # Three columns
        col_top = content_top - 56
        col_h = 200
        col_w = (PAGE_W - 2 * MARGIN - 24) / 3

        sections = [
            {
                "icon": "↗",
                "title": "ACQUISITION",
                "color": RED,
                "items": [
                    "Geteilte Karten = viraler Kanal (zero cost)",
                    "Instagram Content",
                    "Trusted Foodie Features",
                    "SEO (Restaurant + Gericht Pages)",
                ],
            },
            {
                "icon": "↻",
                "title": "RETENTION",
                "color": HexColor('#22C55E'),
                "items": [
                    "Gamification & neue Packs",
                    "Collection Completion",
                    "Social Sharing",
                ],
            },
            {
                "icon": "€",
                "title": "MONETIZATION",
                "color": HexColor('#F59E0B'),
                "items": [
                    "Freemium: Gratis Pack bei Registration",
                    "Paid: Zusätzliche Packs",
                    "KEINE Sponsored Content (Brand-Moat)",
                ],
            },
        ]

        for i, sec in enumerate(sections):
            cx = MARGIN + i * (col_w + 12)
            cy = col_top - col_h

            self.draw_rect(cx, cy, col_w, col_h, CARD1)

            # Icon circle
            self.c.setFillColor(sec["color"])
            self.c.circle(cx + 30, cy + col_h - 28, 18, fill=1, stroke=0)
            self.c.setFillColor(WHITE)
            self.c.setFont("Helvetica-Bold", 16)
            self.c.drawCentredString(cx + 30, cy + col_h - 34, sec["icon"])

            # Title
            self.c.setFillColor(WHITE)
            self.c.setFont("Helvetica-Bold", 14)
            self.c.drawString(cx + 54, cy + col_h - 26, sec["title"])

            # Divider
            self.c.setStrokeColor(HexColor('#2A2A2A'))
            self.c.setLineWidth(0.5)
            self.c.line(cx + 14, cy + col_h - 52, cx + col_w - 14, cy + col_h - 52)

            iy = cy + col_h - 70
            for item in sec["items"]:
                is_no = item.startswith("KEINE")
                self.c.setFillColor(sec["color"])
                self.c.circle(cx + 20, iy + 4, 3, fill=1, stroke=0)
                self.c.setFillColor(RED if is_no else WHITE)
                self.c.setFont("Helvetica-Bold" if is_no else "Helvetica", 9.5)
                self.multiline_text(cx + 30, iy, item, "Helvetica-Bold" if is_no else "Helvetica",
                                     9.5, RED if is_no else WHITE,
                                     max_width=col_w - 50, line_height=13)
                iy -= 36

        # Key principle box
        kp_y = col_top - col_h - 20
        kp_h = 50
        self.draw_rect(MARGIN, kp_y - kp_h, PAGE_W - 2 * MARGIN, kp_h, HexColor('#0D1A0D'))
        self.c.setFillColor(HexColor('#22C55E'))
        self.c.setFont("Helvetica-Bold", 9)
        self.c.drawString(MARGIN + 14, kp_y - 16, "BRAND MOAT")
        self.c.setFillColor(WHITE)
        self.c.setFont("Helvetica-Bold", 13)
        self.c.drawString(MARGIN + 100, kp_y - 16,
                           "Kein Sponsored Content. Niemals.")
        self.c.setFillColor(GRAY)
        self.c.setFont("Helvetica", 10)
        self.c.drawString(MARGIN + 100, kp_y - 32,
                           "Vertrauen ist unser Produkt — und unser einziger dauerhafter Wettbewerbsvorteil.")

    # ─── PAGE 8: RISKS & METRICS ──────────────────────────────────────────────

    def page_risks(self):
        self.new_page()
        self.draw_page_chrome()

        content_top = PAGE_H - MARGIN - 28

        self.text(MARGIN, content_top, "STRATEGY", "Helvetica-Bold", 11, GRAY)
        self.text(MARGIN, content_top - 22, "RISKS & SUCCESS METRICS", "Helvetica-Bold", 28, WHITE)
        self.c.setFillColor(RED)
        self.c.rect(MARGIN, content_top - 26, 60, 3, fill=1, stroke=0)

        half_w = (PAGE_W - 2 * MARGIN - 20) / 2

        # RISKS - left
        risks_top = content_top - 58
        risks_h = 200

        self.draw_rect(MARGIN, risks_top - risks_h, half_w, risks_h, CARD1)

        self.c.setFillColor(RED)
        self.c.setFont("Helvetica-Bold", 10)
        self.c.drawString(MARGIN + 14, risks_top - 22, "RISKS & MITIGATIONS")

        risks = [
            ("Content Speed", "15 Jahre Berlin-Erfahrung"),
            ("Registration Conversion", "A/B Test Teaser"),
            ("Sharing Friction", "Frictionless Share Page"),
            ("Curator Consistency", "Editorial Guidelines"),
        ]

        ry = risks_top - 48
        for i, (risk, mit) in enumerate(risks):
            # Risk number
            self.c.setFillColor(RED)
            self.c.setFont("Helvetica-Bold", 11)
            self.c.drawString(MARGIN + 14, ry, f"{i+1:02d}")

            self.c.setFillColor(WHITE)
            self.c.setFont("Helvetica-Bold", 10)
            self.c.drawString(MARGIN + 38, ry, risk)

            self.c.setFillColor(GRAY)
            self.c.setFont("Helvetica", 9)
            self.c.drawString(MARGIN + 38, ry - 14, f"→ {mit}")

            ry -= 42

        # METRICS - right
        met_x = MARGIN + half_w + 20
        met_h = risks_h
        self.draw_rect(met_x, risks_top - met_h, half_w, met_h, CARD2)

        self.c.setFillColor(RED)
        self.c.setFont("Helvetica-Bold", 10)
        self.c.drawString(met_x + 14, risks_top - 22, "SUCCESS METRICS")

        # North Star
        ns_y = risks_top - 50
        self.c.setFillColor(HexColor('#1F1A00'))
        self.c.roundRect(met_x + 14, ns_y - 36, half_w - 28, 40, 4, fill=1, stroke=0)
        self.c.setStrokeColor(HexColor('#F59E0B'))
        self.c.setLineWidth(1)
        self.c.roundRect(met_x + 14, ns_y - 36, half_w - 28, 40, 4, fill=0, stroke=1)
        self.c.setFillColor(HexColor('#F59E0B'))
        self.c.setFont("Helvetica-Bold", 8)
        self.c.drawString(met_x + 22, ns_y - 14, "★  NORTH STAR METRIC")
        self.c.setFillColor(WHITE)
        self.c.setFont("Helvetica-Bold", 12)
        self.c.drawString(met_x + 22, ns_y - 30, "Geteilte Karten pro Woche")

        # Leading/Lagging
        ml_y = ns_y - 54
        self.c.setFillColor(GRAY)
        self.c.setFont("Helvetica-Bold", 8)
        self.c.drawString(met_x + 14, ml_y, "LEADING INDICATORS")

        leading = ["Registrierungsrate", "Pack-Opening Rate", "Share Rate", "Returning Users"]
        ly = ml_y - 16
        for m in leading:
            self.c.setFillColor(HexColor('#22C55E'))
            self.c.circle(met_x + 20, ly + 4, 3, fill=1, stroke=0)
            self.c.setFillColor(WHITE)
            self.c.setFont("Helvetica", 10)
            self.c.drawString(met_x + 30, ly, m)
            ly -= 16

        ll_y = ly - 10
        self.c.setFillColor(GRAY)
        self.c.setFont("Helvetica-Bold", 8)
        self.c.drawString(met_x + 14, ll_y, "LAGGING INDICATORS")

        lagging = ["Monthly Active Collectors", "Paid Conversion", "Städte-Expansion"]
        ly = ll_y - 16
        for m in lagging:
            self.c.setFillColor(GRAY)
            self.c.circle(met_x + 20, ly + 4, 3, fill=1, stroke=0)
            self.c.setFillColor(GRAY)
            self.c.setFont("Helvetica", 10)
            self.c.drawString(met_x + 30, ly, m)
            ly -= 16

    # ─── PAGE 9: NEXT STEPS ───────────────────────────────────────────────────

    def page_next_steps(self):
        self.new_page()
        self.draw_page_chrome()

        content_top = PAGE_H - MARGIN - 28

        self.text(MARGIN, content_top, "ACTION PLAN", "Helvetica-Bold", 11, GRAY)
        self.text(MARGIN, content_top - 22, "NEXT STEPS", "Helvetica-Bold", 28, WHITE)
        self.c.setFillColor(RED)
        self.c.rect(MARGIN, content_top - 26, 36, 3, fill=1, stroke=0)

        steps = [
            {
                "num": "1",
                "timing": "SOFORT",
                "timing_color": RED,
                "action": "30 Must-Eat Cards Content-Sprint",
                "desc": "Alle Must-Eat Cards recherchieren, schreiben und finalisieren",
            },
            {
                "num": "2",
                "timing": "DIESE WOCHE",
                "timing_color": HexColor('#FF6B2D'),
                "action": "Shareable Card Page",
                "desc": "Individuelle Karten-Seiten mit OG-Tags für virales Sharing",
            },
            {
                "num": "3",
                "timing": "DIESE WOCHE",
                "timing_color": HexColor('#FF6B2D'),
                "action": "Registration + Gratis Pack Flow",
                "desc": "Sign-up Flow mit automatischer Pack-Vergabe implementieren",
            },
            {
                "num": "4",
                "timing": "PARALLEL",
                "timing_color": HexColor('#F59E0B'),
                "action": "About-Text neu schreiben",
                "desc": "Brand Voice, Mission und Manifesto klar kommunizieren",
            },
            {
                "num": "5",
                "timing": "NACH MVP",
                "timing_color": GRAY,
                "action": "Markt & Wettbewerb",
                "desc": "Detaillierte Wettbewerbsanalyse und Positionierung",
            },
            {
                "num": "6",
                "timing": "NACH MVP",
                "timing_color": GRAY,
                "action": "Monetarisierung finalisieren",
                "desc": "Pack-Pricing, Payment Flow und Revenue Model festlegen",
            },
        ]

        step_h = 56
        step_top = content_top - 56
        avail_w = PAGE_W - 2 * MARGIN

        for i, step in enumerate(steps):
            sy = step_top - i * (step_h + 8)

            # Background
            bg = CARD1 if i % 2 == 0 else CARD2
            is_immediate = step["timing"] == "SOFORT"
            if is_immediate:
                bg = HexColor('#1A0505')
            self.c.setFillColor(bg)
            self.c.roundRect(MARGIN, sy - step_h, avail_w, step_h, 4, fill=1, stroke=0)

            if is_immediate:
                self.c.setStrokeColor(RED)
                self.c.setLineWidth(1)
                self.c.roundRect(MARGIN, sy - step_h, avail_w, step_h, 4, fill=0, stroke=1)

            # Number
            self.c.setFillColor(step["timing_color"])
            self.c.setFont("Helvetica-Bold", 28)
            self.c.drawString(MARGIN + 16, sy - step_h + 14, step["num"])

            # Timing badge
            badge_w = self.c.stringWidth(step["timing"], "Helvetica-Bold", 8) + 12
            self.c.setFillColor(step["timing_color"])
            self.c.roundRect(MARGIN + 52, sy - 22, badge_w, 16, 3, fill=1, stroke=0)
            self.c.setFillColor(WHITE)
            self.c.setFont("Helvetica-Bold", 8)
            self.c.drawString(MARGIN + 58, sy - 16, step["timing"])

            # Action
            self.c.setFillColor(WHITE)
            self.c.setFont("Helvetica-Bold", 13)
            self.c.drawString(MARGIN + 52, sy - 36, step["action"])

            # Description
            self.c.setFillColor(GRAY)
            self.c.setFont("Helvetica", 10)
            self.c.drawString(MARGIN + 52, sy - 50, step["desc"])

        # Bottom CTA
        cta_y = step_top - len(steps) * (step_h + 8) - 16
        self.c.setFillColor(RED)
        self.c.roundRect(MARGIN, cta_y - 32, avail_w, 32, 4, fill=1, stroke=0)
        self.c.setFillColor(WHITE)
        self.c.setFont("Helvetica-Bold", 14)
        self.c.drawCentredString(PAGE_W / 2, cta_y - 20, "Let's ship it.")

    def generate(self):
        self.page_cover()
        self.page_vision()
        self.page_target()
        self.page_competitive()
        self.page_concept()
        self.page_roadmap()
        self.page_growth()
        self.page_risks()
        self.page_next_steps()
        self.save()


if __name__ == "__main__":
    pdf = EatThisPDF()
    pdf.generate()
