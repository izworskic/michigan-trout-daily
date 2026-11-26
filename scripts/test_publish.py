import os
import unittest
from unittest.mock import patch, Mock
from datetime import datetime
from zoneinfo import ZoneInfo
import publish as p

class PublisherTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 26, 8, tzinfo=ZoneInfo("America/Detroit"))
        self.river = p.RIVERS[0]
        self.usgs = {"flow_cfs": 123.0, "flow_cfs_observed_at": "2026-11-26T07:45:00-05:00"}
        self.valid = p.deterministic_report(self.river, self.usgs, [], self.now)

    def test_source_report_is_substantive(self):
        self.assertGreaterEqual(p.validate(self.valid), 500)
        self.assertIn("123.00 cubic feet per second", self.valid)
        self.assertIn("not a confirmed hatch report", self.valid)
        self.assertNotIn("gauge height: 0", self.valid.lower())
        with self.assertRaises(RuntimeError):
            p.deterministic_report(self.river, {}, [], self.now)

    def test_fall_credential_preferred_and_auth_retry_only(self):
        good = Mock(status_code=200)
        good.json.return_value = {"content": [{"type":"text","text":self.valid}]}
        bad = Mock(status_code=401)
        with patch.dict(os.environ, {"FALL_ANTHROPIC_API_KEY":"fall-fixture","ANTHROPIC_API_KEY":"legacy-fixture"}, clear=True):
            with patch.object(p.requests,"post",side_effect=[bad, good]) as req:
                self.assertEqual(p.claude_generate("system","user"),self.valid)
                self.assertEqual([c.kwargs["headers"]["x-api-key"] for c in req.call_args_list],["fall-fixture","legacy-fixture"])
            with patch.object(p.requests,"post",return_value=Mock(status_code=503)) as req:
                with self.assertRaises(p.GenerationUnavailable):
                    p.claude_generate("system","user")
                self.assertEqual(req.call_count,1)
        with patch.dict(os.environ,{},clear=True):
            with patch.object(p.requests,"post") as req:
                with self.assertRaises(p.GenerationUnavailable):
                    p.claude_generate("system","user")
                req.assert_not_called()

    def test_daily_failure_still_builds_valid_report(self):
        with patch.object(p,"pick_river",return_value=self.river), patch.object(p,"fetch_usgs",return_value=self.usgs), patch.object(p,"fetch_nws",return_value=[]), patch.object(p,"claude_generate",side_effect=p.GenerationUnavailable("401")):
            post=p.build_post(today=self.now)
            self.assertIn("data-based conditions brief",post["body"])
            self.assertIn("AuSable",post["title"])
            sunday=p.build_post(today=self.now.replace(day=29))
            self.assertIn("AuSable",sunday["title"])
