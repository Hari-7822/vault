describe('WhatsApp API', () => {
  it('[Admin] GET /whatsapp/preview?filter=all — returns recipient preview', () => {
    cy.api('GET', '/whatsapp/preview?filter=all', null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.count).to.be.a('number');
      expect(res.body.preview).to.be.an('array');
      expect(res.body.noPhoneCount).to.be.a('number');
    });
  });

  it('[Admin] GET /whatsapp/preview?filter=paid — filters paid users', () => {
    cy.api('GET', '/whatsapp/preview?filter=paid', null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.count).to.be.a('number');
    });
  });

  it('[Admin] GET /whatsapp/preview?filter=unpaid — filters unpaid users', () => {
    cy.api('GET', '/whatsapp/preview?filter=unpaid', null, 'admin').then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('[Admin] GET /whatsapp/preview — blocked for customer', () => {
    cy.api('GET', '/whatsapp/preview').then((res) => {
      expect(res.status).to.eq(403);
    });
  });

  it('[Admin] POST /whatsapp/send — rejects missing templateName', () => {
    cy.api('POST', '/whatsapp/send', { filter: 'all' }, 'admin').then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.be.false;
    });
  });
});