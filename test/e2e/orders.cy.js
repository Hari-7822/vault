describe("Orders API", () => {
  let token;

  before(() => {
    const email = `order_${Date.now()}@test.com`;

    cy.registerUser({ email });
    cy.loginUser({ email }).then((t) => {
      token = t;
    });
  });

  it("should create order", () => {
    cy.request({
      method: "POST",
      url: "/orders",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        productId: "123",
        quantity: 2,
      },
    }).then((res) => {
      expect(res.status).to.eq(201);
    });
  });
});