describe("Inventory API", () => {
  let token;

  before(() => {
    const email = `inv_${Date.now()}@test.com`;

    cy.registerUser({ email });
    cy.loginUser({ email }).then((t) => {
      token = t;
    });
  });

  it("should create inventory item", () => {
    cy.request({
      method: "POST",
      url: "/inventory",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: "Test Product",
        quantity: 10,
      },
    }).then((res) => {
      expect(res.status).to.eq(201);
    });
  });
});