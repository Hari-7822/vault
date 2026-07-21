describe("Auth API", () => {
  it("should register a new user", () => {
    cy.registerUser().then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body).to.have.property("token");
    });
  });

  it("should login user", () => {
    const email = `user_${Date.now()}@test.com`;

    cy.registerUser({ email });

    cy.loginUser({ email }).then((token) => {
      expect(token).to.exist;
    });
  });
});