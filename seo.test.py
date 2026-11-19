"""Offline marketing SEO checks. Run: python3 site/seo.test.py"""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

HERE = Path(__file__).resolve().parent
PAGES = {"index.html": "", "byo-relay.html": "byo-relay", "analytics.html": "analytics", "privacy.html": "privacy"}


class Tags(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class MarketingSEO(unittest.TestCase):
    def test_page_basics_and_tracking(self):
        for filename, slug in PAGES.items():
            with self.subTest(page=filename):
                text = (HERE / filename).read_text()
                tags = Tags(text).tags
                canonicals = [a["href"] for t, a in tags if t == "link" and a.get("rel") == "canonical"]
                self.assertEqual(canonicals, ["https://ctrlall.app/" + slug])
                descriptions = [a.get("content") for t, a in tags if t == "meta" and a.get("name") == "description"]
                self.assertEqual(len(descriptions), 1)
                self.assertTrue(descriptions[0])
                self.assertEqual(text.count("gtag('config', 'G-JXNFMTE7CQ')"), 1)

    def test_home_images_reserve_space(self):
        for tag, attrs in Tags((HERE / "index.html").read_text()).tags:
            if tag == "img":
                self.assertIn("alt", attrs)
                self.assertGreater(int(attrs.get("width", 0)), 0, attrs.get("src"))
                self.assertGreater(int(attrs.get("height", 0)), 0, attrs.get("src"))

    def test_demo_heading_style_moves_with_heading(self):
        self.assertIn('<h3>Add CSV export to the reports page</h3>', (HERE / "index.html").read_text())
        self.assertIn('.goal-run h3{', (HERE / "demo.css").read_text())

    def test_generator_keeps_all_public_pages(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            for filename in [*PAGES, "build-md.py"]:
                shutil.copyfile(HERE / filename, folder / filename)
            subprocess.run(["python3", str(folder / "build-md.py")], check=True, capture_output=True)
            ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            tree = ET.fromstring((folder / "sitemap.xml").read_text())
            urls = [node.text for node in tree.findall("s:url/s:loc", ns)]
            self.assertEqual(set(urls), {"https://ctrlall.app/" + slug for slug in PAGES.values()})
            for slug in ("byo-relay", "analytics", "privacy"):
                self.assertIn("https://ctrlall.app/" + slug, (folder / "llms.txt").read_text())
                self.assertIn("<!-- source: https://ctrlall.app/" + slug + " -->", (folder / "llms-full.txt").read_text())
            self.assertIn('rel="canonical"', (folder / "_headers").read_text())
            self.assertIn('X-Robots-Tag: noindex, follow', (folder / "_headers").read_text())


if __name__ == "__main__":
    unittest.main()
