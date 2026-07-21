describe('Subscriptions API', () => {
  let vegId;

  before(() => {
    cy.task('getTestIds').then((ids) => { vegId = ids.vegetableId; });
  });

  it('POST /subscriptions/create — creates subscription', () => {
    cy.api('POST', '/subscriptions/create', {
      plan: 'weekly',
      paymentMethod: 'COD',
      deliveryFee: 10,
      initialBasket: [{ vegetable: vegId, quantity: 1 }],
    }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.subscription.isActive).to.be.true;
    });
  });

  it('GET /subscriptions/current — returns subscription details', () => {
    cy.api('GET', '/subscriptions/current').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
      expect(res.body).to.have.property('basketTotal');
      expect(res.body).to.have.property('grandTotal');
    });
  });

  it('PUT /subscriptions/basket — updates basket items', () => {
    cy.api('PUT', '/subscriptions/basket', {
      items: [{ vegetable: vegId, quantity: 2 }],
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.subscription.recurringBasket).to.have.length.greaterThan(0);
    });
  });

  it('PUT /subscriptions/preferences — updates payment method', () => {
    cy.api('PUT', '/subscriptions/preferences', { paymentMethod: 'online' }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
    });
  });

  it('PUT /subscriptions/pause — pauses subscription', () => {
    cy.api('PUT', '/subscriptions/pause', { pauseUntil: '2026-06-01' }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.subscription.pauseUntil).to.not.be.null;
    });
  });

  it('PUT /subscriptions/pause — rejects past date', () => {
    cy.api('PUT', '/subscriptions/pause', { pauseUntil: '2020-01-01' }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('PUT /subscriptions/pause — rejects missing date', () => {
    cy.api('PUT', '/subscriptions/pause', {}).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('PUT /subscriptions/resume — resumes subscription', () => {
    cy.api('PUT', '/subscriptions/resume').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
    });
  });

  it('GET /subscriptions/delivery-dates — returns upcoming dates', () => {
    cy.api('GET', '/subscriptions/delivery-dates').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.deliveryDates).to.be.an('array');
    });
  });

  it('[Admin] GET /subscriptions/admin/all — returns active subscriptions', () => {
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