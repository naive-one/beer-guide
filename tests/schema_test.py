"""Run with a Python environment containing jsonschema; fixtures stay in memory."""
import json
from pathlib import Path
import subprocess
import unittest

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]


class DatasetSchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        schema = json.loads((ROOT / 'data/schema.json').read_text())
        Draft202012Validator.check_schema(schema)
        cls.validator = Draft202012Validator(schema, format_checker=FormatChecker())

    def test_source_and_deployment_datasets(self):
        for name in ('data/beers.json', 'dist/data/beers.json'):
            with self.subTest(dataset=name):
                self.validator.validate(json.loads((ROOT / name).read_text()))

    def test_frozen_scope_shape(self):
        data = json.loads((ROOT / 'data/beers.json').read_text())
        for ids in (['paulaner', 'paulaner'], [], [3]):
            with self.subTest(ids=ids):
                data['catalogScope']['activeIds'] = ids
                self.assertFalse(self.validator.is_valid(data))

    def test_import_zero_written_comments_with_unknown_volume(self):
        result = subprocess.run(
            ['node', '--input-type=module', '-e', r'''
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {integrate} from './scripts/import-research.mjs';
import C from './core.js';
const input = JSON.parse(fs.readFileSync('data/beers.json', 'utf8'));
const id = input.beers[0].id;
input.beers[0].volumeMl = null;
const selected = {
  url:'https://www.jiuhuar.com/craftbeer/schema-regression.html',
  title:'Schema regression', platform:'酒花儿', scale:5, value:3.7,
  count:0, countType:'reviews', checkedAt:'2026-09-27',
  evidenceFile:'in-memory-schema-regression.json'
};
const price = {
  id, status:'verified', url:'https://item.taobao.com/item.htm?id=123',
  selectedSku:'同款6瓶', total:60, quantity:6, volumeMl:null,
  currency:'CNY', checkedAt:'2026-09-27', largestSameBeerPack:true
};
const data = integrate(input, [{id,status:'matched',selected}], [price],
  [{...selected,outcome:'read'}]);
const beer = data.beers[0];
assert.equal(beer.rating.count, 0);
assert.equal(beer.rating.countType, 'reviews');
assert.equal(C.cost(beer.quote, 'unit'), 10);
assert.equal(C.cost(beer.quote, 'order'), 60);
assert.equal(C.cost(beer.quote, '500ml'), null);
const single = {...data,beers:[beer]};
assert.equal(C.analyze(single,C.defaults()).eligible.length, 1);
assert.equal(C.analyze(single,{...C.defaults(),minRatings:1}).eligible.length, 0);
assert.equal(C.analyze(single,{...C.defaults(),unit:'500ml'}).eligible.length, 0);
console.log(JSON.stringify(data));
'''], cwd=ROOT, check=True, capture_output=True, text=True)
        data = json.loads(result.stdout)
        self.validator.validate(data)
        for invalid_count in (-1, 0.5):
            with self.subTest(invalid_count=invalid_count):
                data['beers'][0]['rating']['count'] = invalid_count
                self.assertFalse(self.validator.is_valid(data))


if __name__ == '__main__':
    unittest.main()
