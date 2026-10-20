"""Pure regression tests: no credentials, network or Odoo writes."""
import datetime
import runpy
import unittest
from pathlib import Path
from types import SimpleNamespace

helpers = runpy.run_path(str(Path(__file__).parent / 'assets/quotation_validity.py'),
                        init_globals={'datetime': datetime, 'UserError': ValueError})
sync = helpers['mnl_validity_values']


class ValidityTests(unittest.TestCase):
    def order(self, **changes):
        values = dict(validity_date=datetime.date(2026, 11, 19),
                      date_order=datetime.datetime(2026, 10, 20),
                      x_studio_condicions_acceptacio='Text manual. Oferta vàlida fins al 19/11/2026.',
                      x_studio_idioma_document='ca_ES', x_studio_validesa_dies=30)
        return SimpleNamespace(**(values | changes))

    def test_date_updates_text_preserving_manual_content(self):
        result = sync(self.order(validity_date=datetime.date(2026, 12, 4)), 'date')
        self.assertEqual(result['x_studio_condicions_acceptacio'],
                         'Text manual. Oferta vàlida fins al 04/12/2026.')
        self.assertEqual(result['x_studio_validesa_dies'], 45)

    def test_text_updates_date(self):
        result = sync(self.order(x_studio_condicions_acceptacio='Oferta vàlida fins al 10/12/2026.'), 'text')
        self.assertEqual(result['validity_date'], datetime.date(2026, 12, 10))

    def test_days(self):
        result = sync(self.order(x_studio_condicions_acceptacio='Offer valid for 45 days.'), 'text')
        self.assertEqual(result['validity_date'], datetime.date(2026, 12, 4))

    def test_iso_spanish(self):
        result = sync(self.order(x_studio_condicions_acceptacio='Oferta válida hasta 2026-12-04.'), 'text')
        self.assertEqual(result['validity_date'], datetime.date(2026, 12, 4))

    def test_clear_date_keeps_other_text(self):
        result = sync(self.order(validity_date=False), 'date')
        self.assertEqual(result['x_studio_condicions_acceptacio'], 'Text manual.')

    def test_remove_clause_clears_date(self):
        result = sync(self.order(x_studio_condicions_acceptacio='Text manual.'), 'text',
                      previous_text='Text manual. Oferta vàlida fins al 19/11/2026.')
        self.assertFalse(result['validity_date'])

    def test_conflicting_dates_rejected(self):
        with self.assertRaises(ValueError):
            sync(self.order(x_studio_condicions_acceptacio=
                 'Oferta vàlida fins al 19/11/2026. Offer valid until 2026-12-04.'), 'text')

    def test_invalid_calendar_date_rejected(self):
        with self.assertRaises(ValueError):
            sync(self.order(x_studio_condicions_acceptacio='Oferta vàlida fins al 31/02/2026.'), 'text')


if __name__ == '__main__':
    unittest.main()
