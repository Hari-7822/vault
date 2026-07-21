describe('Support API', () => {
  it('POST /support/send — sends a message', () => {
    cy.api('POST', '/support/send', {
      message: 'Cypress automated test message — please ignore',
    }).then((res) => {
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

  it('POST /support/send — rejects unauthenticated', () => {
    cy.publicRequest('POST', '/support/send', { message: 'Hello' }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });

  it('GET /support/my-chats — returns user chats with remaining count', () => {
    cy.api('GET', '/support/my-chats').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.chats).to.be.an('array');
      expect(res.body.remaining).to.be.a('number');
    });
  });

  it('[Admin] GET /support/admin/all — returns all conversations grouped', () => {
    cy.api('GET', '/support/admin/all', null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.conversations).to.be.an('array');
    });
  });

  it('[Admin] GET /support/admin/all — blocked for customer', () => {
    cy.api('GET', '/support/admin/all').then((res) => {
      expect(res.status).to.eq(403);
    });
  });
});