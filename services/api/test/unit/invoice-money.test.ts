import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invoiceAmounts } from '../../src/modules/invoices/money.js';
test('approved invoice formula vectors and integers beyond Number precision', () => {
  for (const [l,m,r,f,c,q] of [['100000','50000','50000','10000','100000','1333'],['100000','50000','150000','10000','0','0'],['0','50000','0','0','50000','0'],['0','0','0','0','0','0'],['90071992547409930','0','0','9007199254740993','90071992547409930','1801439850948198']]) {
    const a=invoiceAmounts(l,m,r); assert.equal(a.fee,f); assert.equal(a.cash_due,c); assert.equal(a.reward,q);
  }
  assert.throws(()=>invoiceAmounts('1','0','2')); assert.throws(()=>invoiceAmounts('-1','0'));
});
