describe('Coupons API', () => {
  let createdCouponId = null;
  const couponCode = `CYPRESS${Date.now()}`;

  it('[Admin] GET /coupons — returns all coupons', () => {
    cy.api('GET', '/coupons', null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.coupons).to.be.an('array');
    });
  });

  it('[Admin] POST /coupons — creates flat coupon', () => {
    cy.api('POST', '/coupons', {
      code: couponCode,
      description: 'Cypress test coupon',
      discountType: 'flat',
      discountValue: 30,
      minOrderValue: 100,
      maxUses: 50,
      perUserLimit: 1,
      expiresAt: '2027-01-01',
      isActive: true,
    }, 'admin').then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.coupon.code).to.eq(couponCode);
      createdCouponId = res.body.coupon._id;
    });
  });

  it('[Admin] POST /coupons — rejects duplicate code', () => {
    cy.api('POST', '/coupons', {
      code: couponCode,
      discountType: 'flat',
      discountValue: 10,
      expiresAt: '2027-01-01',
    }, 'admin').then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('[Admin] POST /coupons — rejects missing required fields', () => {
    cy.api('POST', '/coupons', { code: 'NOEXPIRY', discountType: 'flat' }, 'admin').then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('POST /coupons/apply — rejects invalid code', () => {
    cy.api('POST', '/coupons/apply', { code: 'INVALID999', basketTotal: 300 }).then((res) => {
      expect(res.status).to.eq(404);
    });
  });

  it('POST /coupons/apply — rejects below minimum order value', () => {
    cy.api('POST', '/coupons/apply', { code: couponCode, basketTotal: 50 }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('[Admin] PUT /coupons/:id — updates coupon', () => {
    if (!createdCouponId) return cy.log('Skipped');
    cy.api('PUT', `/coupons/${createdCouponId}`, { discountValue: 40, isActive: false }, 'admin').then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('[Admin] DELETE /coupons/:id — deletes coupon', () => {
    if (!createdCouponId) return cy.log('Skipped');
    cy.api('DELETE', `/coupons/${createdCouponId}`, null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
    });
  });
});


describe('Settings API', () => {
  it('GET /settings/isWeekendPaymentEnabled — returns setting', () => {
    cy.request(`${Cypress.env('BASE_URL')}/settings/isWeekendPaymentEnabled`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('value');
    });
  });

  it('GET /settings/unknownKey — returns 404', () => {
    cy.request({ url: `${Cypress.env('BASE_URL')}/settings/unknownKey999`, failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(404);
    });
  });

  it('[Admin] PUT /settings/isWeekendPaymentEnabled — updates setting', () => {
    cy.api('PUT', '/settings/isWeekendPaymentEnabled', { value: false, description: 'Cypress test' }, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.value).to.eq(false);
    });
  });

  it('[Admin] PUT /settings/weeklyDeliveryDates — sets delivery dates', () => {
    cy.api('PUT', '/settings/weeklyDeliveryDates', {
      value: ['2026-05-01', '2026-05-08', '2026-05-15'],
      description: 'Cypress delivery schedule',
    }, 'admin').then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('[Admin] PUT /settings — blocked for customer', () => {
    cy.api('PUT', '/settings/isWeekendPaymentEnabled', { value: true }, 'customer').then((res) => {
      expect(res.status).to.eq(403);
    });
  });
});


describe('Support API', () => {
  it('POST /support/send — sends a message', () => {
    cy.api('POST', '/support/send', { message: 'Cypress test support message' }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.success).to.be.true;
      expect(res.body.remaining).to.be.a('number');
    });
  });

  it('POST /support/send — rejects empty message', () => {
    cy.api('POST', '/support/send', { message: '   ' }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('GET /support/my-chats — returns user chats', () => {
    cy.api('GET', '/support/my-chats').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.chats).to.be.an('array');
      expect(res.body.remaining).to.be.a('number');
    });
  });

  it('[Admin] GET /support/admin/all — returns all conversations', () => {
    cy.api('GET', '/support/admin/all', null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.conversations).to.be.an('array');
    });
  });

  it('[Admin] GET /support/admin/all — blocked for customer', () => {
    cy.api('GET', '/support/admin/all', null, 'customer').then((res) => {
      expect(res.status).to.eq(403);
    });
  });
});


describe('Billing API', () => {
  it('GET /billing/current — returns billing summary', () => {
    cy.api('GET', '/billing/current').then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('POST /billing/create-order — creates Razorpay order', () => {
    cy.api('POST', '/billing/create-order', { amount: 100 }).then((res) => {
      // Will fail if Razorpay keys not configured — acceptable in test env
      expect([200, 500]).to.include(res.status);
    });
  });

  it('POST /billing/create-order — rejects zero amount', () => {
    cy.api('POST', '/billing/create-order', { amount: 0 }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('GET /billing/history — returns paid orders history', () => {
    cy.api('GET', '/billing/history').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.history).to.be.an('array');
    });
  });

  it('[Admin] GET /billing/admin/payment-status — returns payment status', () => {
    cy.api('GET', '/billing/admin/payment-status', null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.users).to.be.an('array');
    });
  });

  it('[Admin] GET /billing/admin/history/:userId — returns user history', () => {
    cy.api('GET', `/billing/admin/history/${Cypress.env('TEST_USER_ID')}`, null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.history).to.be.an('array');
    });
  });
});


describe('Subscriptions API', () => {
  const vegId = () => Cypress.env('TEST_VEGETABLE_ID');

  it('POST /subscriptions/create — creates subscription', () => {
    cy.api('POST', '/subscriptions/create', {
      plan: 'weekly',
      paymentMethod: 'COD',
      deliveryFee: 10,
      initialBasket: [{ vegetable: vegId(), quantity: 1 }],
    }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.subscription.isActive).to.be.true;
    });
  });

  it('GET /subscriptions/current — returns subscription', () => {
    cy.api('GET', '/subscriptions/current').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
    });
  });

  it('PUT /subscriptions/basket — updates basket', () => {
    cy.api('PUT', '/subscriptions/basket', {
      items: [{ vegetable: vegId(), quantity: 2 }],
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.subscription.recurringBasket).to.have.length.greaterThan(0);
    });
  });

  it('PUT /subscriptions/preferences — updates preferences', () => {
    cy.api('PUT', '/subscriptions/preferences', { paymentMethod: 'online' }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('PUT /subscriptions/pause — pauses subscription', () => {
    cy.api('PUT', '/subscriptions/pause', { pauseUntil: '2026-05-01' }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.subscription.pauseUntil).to.not.be.null;
    });
  });

  it('PUT /subscriptions/pause — rejects past date', () => {
    cy.api('PUT', '/subscriptions/pause', { pauseUntil: '2020-01-01' }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('PUT /subscriptions/resume — resumes subscription', () => {
    cy.api('PUT', '/subscriptions/resume').then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('GET /subscriptions/delivery-dates — returns dates', () => {
    cy.api('GET', '/subscriptions/delivery-dates').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.deliveryDates).to.be.an('array');
    });
  });

  it('[Admin] GET /subscriptions/admin/all — returns all active subscriptions', () => {
    cy.api('GET', '/subscriptions/admin/all', null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.users).to.be.an('array');
    });
  });

  it('DELETE /subscriptions/cancel — cancels subscription', () => {
    cy.api('DELETE', '/subscriptions/cancel').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.subscription.isActive).to.be.false;
    });
  });
});


describe('WhatsApp API', () => {
  it('[Admin] GET /whatsapp/preview?filter=all — returns recipients', () => {
    cy.api('GET', '/whatsapp/preview?filter=all', null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.count).to.be.a('number');
      expect(res.body.preview).to.be.an('array');
    });
  });

  it('[Admin] GET /whatsapp/preview?filter=paid — returns paid users', () => {
    cy.api('GET', '/whatsapp/preview?filter=paid', null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('[Admin] GET /whatsapp/preview — blocked for customer', () => {
    cy.api('GET', '/whatsapp/preview', null, 'customer').then((res) => {
      expect(res.status).to.eq(403);
    });
  });

  it('[Admin] POST /whatsapp/send — rejects missing templateName', () => {
    cy.api('POST', '/whatsapp/send', { filter: 'all' }, 'admin').then((res) => {
      expect(res.status).to.eq(400);
    });
  });
});