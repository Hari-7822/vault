describe('Vegetables API', () => {
  let vegId;
  let createdVegId = null;

  before(() => {
    cy.task('getTestIds').then((ids) => { vegId = ids.vegetableId; });
  });

  it('GET /vegetables — returns list with price and stock', () => {
    cy.publicRequest('GET', '/vegetables').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');
      expect(res.body.count).to.be.greaterThan(0);
      expect(res.body.data[0]).to.have.property('price');
      expect(res.body.data[0]).to.have.property('stock');
    });
  });

  it('GET /vegetables?category=Gourds — filters by category', () => {
    cy.publicRequest('GET', '/vegetables?category=Gourds').then((res) => {
      expect(res.status).to.eq(200);
      res.body.data.forEach((v) => expect(v.category).to.eq('Gourds'));
    });
  });

  it('GET /vegetables?search=tomato — searches by name', () => {
    cy.publicRequest('GET', '/vegetables?search=tomato').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data.length).to.be.greaterThan(0);
    });
  });

  it('GET /vegetables?isActive=true — returns only active', () => {
    cy.publicRequest('GET', '/vegetables?isActive=true').then((res) => {
      expect(res.status).to.eq(200);
      res.body.data.forEach((v) => expect(v.isActive).to.be.true);
    });
  });

  it('GET /vegetables?page=1&limit=5 — paginates correctly', () => {
    cy.publicRequest('GET', '/vegetables?page=1&limit=5').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data.length).to.be.at.most(5);
    });
  });

  it('GET /vegetables/:id — returns single vegetable', () => {
    cy.publicRequest('GET', `/vegetables/${vegId}`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data._id).to.eq(vegId);
      expect(res.body.data).to.have.property('price');
      expect(res.body.data).to.have.property('stock');
    });
  });

  it('GET /vegetables/:id — returns 400 for invalid ID format', () => {
    cy.publicRequest('GET', '/vegetables/notanid').then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('GET /vegetables/:id — returns 404 for unknown ID', () => {
    cy.publicRequest('GET', '/vegetables/000000000000000000000000').then((res) => {
      expect(res.status).to.eq(404);
    });
  });

  it('[Admin] POST /vegetables — creates vegetable', () => {
    cy.api('POST', '/vegetables', {
      name: `CypressVeg_${Date.now()}`,
      category: 'Others',
      unit: 'kg',
      isActive: true,
      price: 25,
      marketPrice: 40,
      stockQuantity: 30,
    }, 'admin').then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.success).to.be.true;
      createdVegId = res.body.data._id;
    });
  });

  it('[Admin] PUT /vegetables/:id — updates vegetable', () => {
    cy.api('PUT', `/vegetables/${vegId}`, { price: 20, stockQuantity: 150 }, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
    });
  });

  it('[Admin] PUT /vegetables/:id — blocked for customer', () => {
    cy.api('PUT', `/vegetables/${vegId}`, { price: 999 }).then((res) => {
      expect(res.status).to.eq(403);
    });
  });

  it('[Admin] DELETE /vegetables/:id — deletes created vegetable', () => {
    if (!createdVegId) return cy.log('Skipped — no created vegetable');
    cy.api('DELETE', `/vegetables/${createdVegId}`, null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
    });
  });
});